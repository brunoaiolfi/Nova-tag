import {TraceabilityWorkflow} from '../traceability/workflow';
import type {Api} from '../traceability/workflow';
import type {
  Provisioning,
  Strategy,
  Reading,
} from '../../domain/traceability/types';
import {
  AdministrationError,
  AdminContext,
  AdminOperation,
  AdminReply,
  AdminRfSession,
  AdminStore,
  Material,
  assertOperation,
  assertReply,
  commandBytes,
  errorCode,
  sameOwner,
} from '../../domain/administration/types';

export interface AdministrativeRf {
  id: string;
  checkpoint(): void;
  transceive(bytes: number[]): Promise<number[]>;
}
export interface AdministrativeNfc {
  run<T>(
    operation: AdminOperation,
    work: (rf: AdministrativeRf) => Promise<T>,
  ): Promise<T>;
  cancel(): Promise<void>;
  read(operation: AdminOperation): Promise<Reading>;
}
export interface AdministrationProgress {
  stage: string;
  sequence: number;
  outcome: string;
}
const root = '/administracao-nfc';
const retryable = (e: unknown) =>
  ['API_INDISPONIVEL', 'RESPOSTA_INVALIDA'].includes(errorCode(e)) ||
  (e && typeof e === 'object' && 'status' in e && Number(e.status) >= 500);

export class AdministrationCoordinator {
  private running = false;
  constructor(
    private readonly api: Api,
    private readonly store: AdminStore,
    private readonly nfc: AdministrativeNfc,
    private readonly context: () => Promise<AdminContext>,
    private readonly ids: () => string,
    private readonly now: () => number = Date.now,
  ) {}
  private async guard(expected: AdminContext): Promise<void> {
    const actual = await this.context();
    if (
      !sameOwner(expected, actual) ||
      expected.sessionMarker !== actual.sessionMarker
    )
      throw new AdministrationError(
        'ADMIN_SESSAO_ALTERADA',
        'A conta, a API ou o login mudou. Reconecte-se e retome a operação com outra sessão NFC.',
      );
  }
  private async request<T>(
    context: AdminContext,
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.guard(context);
    return this.api.request<T>(root + path, {
      expectedUserId: context.userId,
      expectedBaseUrl: context.baseUrl,
      ...(body !== undefined ? {method: 'POST', body} : {}),
    });
  }
  async register(
    orderId: string,
    uid: string,
    strategy: Strategy,
    policy: 'ESTRITA' | 'REGISTRO_TARDIO',
  ): Promise<Provisioning> {
    const c = await this.context();
    await this.guard(c);
    const query = () =>
      this.api.request<Provisioning>(`/etiquetas/${uid}`, {
        expectedBaseUrl: c.baseUrl,
        expectedUserId: c.userId,
      });
    const matches = (p: Provisioning) =>
      p.pedidoId === orderId &&
      p.uid === uid &&
      p.estrategia === strategy &&
      p.modelo?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === 'NTAG424DNA' &&
      p.status !== 'DESPROVISIONADA' &&
      (strategy !== 'SDM' || p.sdm?.politica === policy);
    try {
      const previous = await query();
      if (previous.status !== 'DESPROVISIONADA') {
        if (!matches(previous))
          throw new AdministrationError(
            'ADMIN_VINCULO_DIVERGENTE',
            'A etiqueta já possui outro vínculo/tratamento. Consulte Gerenciar etiqueta antes de reutilizar.',
          );
        return previous;
      }
    } catch (e) {
      if (errorCode(e) !== 'ETIQUETA_NAO_ENCONTRADA') throw e;
    }
    try {
      return await this.api.request<Provisioning>('/etiquetas', {
        method: 'POST',
        expectedUserId: c.userId,
        expectedBaseUrl: c.baseUrl,
        body: {
          pedidoId: orderId,
          uid,
          modelo: 'NTAG424DNA',
          estrategia: strategy,
          ...(strategy === 'SDM' ? {politicaSdm: policy} : {}),
        },
      });
    } catch (e) {
      if (retryable(e)) {
        await this.guard(c);
        try {
          const p = await query();
          if (matches(p)) return p;
        } catch {
          /* Preserve the original uncertain response. */
        }
      }
      throw e;
    }
  }
  async prepare(provisioning: Provisioning): Promise<AdminOperation> {
    const c = await this.context();
    let operation: AdminOperation;
    try {
      operation = await this.request(
        c,
        `/provisionamentos/${provisioning.id}/personalizacao`,
      );
    } catch (e) {
      if (errorCode(e) !== 'NFC_PERSONALIZACAO_INEXISTENTE') throw e;
      let draft = await this.store.draft(provisioning.id, c);
      if (!draft) {
        draft = {
          id: this.ids(),
          owner: {baseUrl: c.baseUrl, userId: c.userId},
          station: c.station,
          provisioningId: provisioning.id,
        };
        await this.store.saveDraft(draft);
      }
      operation = await this.request(c, '/personalizacoes', {
        id: draft.id,
        provisionamentoId: provisioning.id,
        estacao: draft.station,
      });
    }
    assertOperation(operation, c);
    if (
      operation.plano.provisionamentoId !== provisioning.id ||
      operation.plano.uid !== provisioning.uid ||
      operation.plano.estrategia !== provisioning.estrategia
    )
      throw new AdministrationError(
        'ADMIN_PLANO_DIVERGENTE',
        'O plano não corresponde ao vínculo selecionado.',
      );
    await this.store.saveOperation(operation, c);
    return this.restore(operation);
  }
  async refresh(id: string): Promise<AdminOperation> {
    const c = await this.context(),
      op = await this.request<AdminOperation>(c, `/operacoes/${id}`);
    assertOperation(op, c);
    await this.store.saveOperation(op, c);
    return op;
  }
  /** HTTP-only restoration. Old RF frames can never be transported from this path. */
  async restore(operation: AdminOperation): Promise<AdminOperation> {
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'Aguarde o encerramento da sessão NFC.',
      );
    const c = await this.context();
    assertOperation(operation, c);
    for (const session of await this.store.sessions(operation.id, c)) {
      if (session.ended) continue;
      const commands = await this.store.commands(session.id, c);
      const pending = commands.find(x => x.state === 'RESPONSE');
      if (pending && session.sessionMarker === c.sessionMarker) {
        const reply = await this.submit(
          c,
          session,
          pending.frame,
          pending.responseHex!,
        );
        await this.store.acknowledge(session, pending.frame, reply);
        session.reply = reply;
      }
      if (session.reply?.status !== 'CONCLUIDA')
        await this.interrupt(c, session);
      await this.store.endSession(session.id, c);
    }
    // Server lookup also finds a RF session after loss of local SQLite/identity login.
    const op = await this.refresh(operation.id);
    if (op.sessaoAtivaId) {
      // Session RF id is intentionally not guessed: local journal must identify it to interrupt early.
      throw new AdministrationError(
        'ADMIN_RF_EM_USO',
        'A operação ainda possui uma sessão NFC de outra instalação. Feche-a na estação de origem ou aguarde o prazo da API e atualize.',
      );
    }
    return op;
  }
  async suggestions(operation: AdminOperation): Promise<(Material | null)[]> {
    const c = await this.context();
    assertOperation(operation, c);
    const sessions = await this.store.sessions(operation.id, c),
      last = sessions.at(-1);
    if (!last)
      return operation.alteracaoEmitida
        ? [null, null, null, null, null]
        : Array<Material>(5).fill('ATUAL');
    const choices: (Material | null)[] = [...last.materials];
    for (const command of await this.store.commands(last.id, c)) {
      const key = /^TROCAR_CHAVE_([0-4])$/.exec(command.frame.etapa);
      if (!key || command.state === 'READY') continue;
      choices[Number(key[1])] =
        command.state === 'ACKNOWLEDGED' && command.receipt?.codigo === null
          ? 'ALVO'
          : null;
    }
    return choices;
  }
  private async submit(
    c: AdminContext,
    s: AdminRfSession,
    frame: {id: string},
    hex: string,
  ): Promise<AdminReply> {
    const reply = await this.request<AdminReply>(
      c,
      `/operacoes/${s.operationId}/sessoes/${s.id}/respostas`,
      {
        comandoId: frame.id,
        sessaoRfId: s.rfId,
        estacao: s.station,
        respostaHex: hex,
      },
    );
    assertReply(reply, s.id);
    return reply;
  }
  private async interrupt(c: AdminContext, s: AdminRfSession): Promise<void> {
    try {
      await this.request(
        c,
        `/operacoes/${s.operationId}/sessoes/${s.id}/interrupcao`,
        {sessaoRfId: s.rfId, estacao: s.station},
      );
    } catch (e) {
      if (errorCode(e) !== 'NFC_SESSAO_INEXISTENTE') throw e;
    }
  }
  async execute(
    operation: AdminOperation,
    materials: Material[],
    progress: (p: AdministrationProgress) => void,
  ): Promise<AdminOperation> {
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'A sessão NFC já está em andamento.',
      );
    const c = await this.context();
    assertOperation(operation, c);
    const recovery = operation.status === 'INTERROMPIDA';
    if (
      !['PREPARADA', 'INTERROMPIDA'].includes(operation.status) ||
      materials.length !== 5 ||
      materials.some(x => !['ATUAL', 'ALVO'].includes(x))
    )
      throw new AdministrationError(
        'ADMIN_MATERIAIS_INVALIDOS',
        'Confira o plano e selecione o material dos cinco slots para recuperar.',
      );
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'A sessão NFC já está em andamento.',
      );
    this.running = true;
    let session: AdminRfSession | undefined;
    let replied = false;
    try {
      await this.nfc.run(operation, async rf => {
        await this.guard(c);
        rf.checkpoint();
        session = {
          id: this.ids(),
          operationId: operation.id,
          owner: {baseUrl: c.baseUrl, userId: c.userId},
          rfId: rf.id,
          sessionMarker: c.sessionMarker,
          station: operation.estacao,
          recovery,
          materials: [...materials],
          reply: null,
          ended: false,
        };
        await this.store.saveSession(session);
        const body = {
          id: session.id,
          sessaoRfId: session.rfId,
          estacao: session.station,
          recuperar: recovery,
          materiais: materials,
        };
        let reply: AdminReply;
        try {
          reply = await this.request(
            c,
            `/operacoes/${operation.id}/sessoes`,
            body,
          );
        } catch (e) {
          if (!retryable(e)) throw e;
          rf.checkpoint();
          reply = await this.request(
            c,
            `/operacoes/${operation.id}/sessoes`,
            body,
          );
        }
        assertReply(reply, session.id);
        await this.store.saveReply(session, reply);
        session.reply = reply;
        let count = 0;
        while (reply.status === 'EM_ANDAMENTO') {
          if (++count > 120 || Date.parse(reply.expiraEm) <= this.now())
            throw new AdministrationError(
              'ADMIN_RF_EXPIRADA',
              'O prazo desta sessão terminou. Afaste a tag e recupere com nova sessão NFC.',
            );
          const frame = reply.comando!,
            bytes = commandBytes(frame);
          await this.guard(c);
          rf.checkpoint();
          progress({
            stage: frame.etapa,
            sequence: frame.sequencia,
            outcome: reply.alteracaoFisica,
          });
          // Commit intent before the physical call. A previous ATTEMPTED frame is never resent.
          await this.store.attempt(session, frame);
          await this.guard(c);
          rf.checkpoint();
          const raw = await rf.transceive(bytes);
          if (
            raw.length < 2 ||
            raw.length > 258 ||
            raw.some(x => !Number.isInteger(x) || x < 0 || x > 255)
          )
            throw new AdministrationError(
              'ADMIN_RESPOSTA_NFC_INVALIDA',
              'A tag retornou uma resposta incompleta. Confira a etapa antes de recuperar.',
            );
          const responseHex = raw
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
          // Save a late NFC response even if cancellation/identity change occurred during transceive.
          await this.store.response(session, frame, responseHex);
          rf.checkpoint();
          try {
            reply = await this.submit(c, session, frame, responseHex);
          } catch (e) {
            if (!retryable(e)) throw e;
            rf.checkpoint();
            reply = await this.submit(c, session, frame, responseHex);
          }
          await this.store.acknowledge(session, frame, reply);
          session.reply = reply;
        }
        replied = reply.status === 'CONCLUIDA';
        if (!replied)
          throw new AdministrationError(
            reply.codigo ?? 'ADMIN_INTERROMPIDA',
            'A API interrompeu a personalização. Confira o diário e selecione os materiais antes de recuperar.',
          );
        if (
          reply.resultado?.uid !== operation.plano.uid ||
          JSON.stringify(reply.resultado.versoesChaves) !==
            JSON.stringify(operation.plano.personalizacao.versoesAlvo) ||
          reply.resultado.configuracaoNdefHex !==
            operation.plano.personalizacao.configuracaoNdefFinalHex
        )
          throw new AdministrationError(
            'ADMIN_RESULTADO_DIVERGENTE',
            'A conferência não corresponde ao alvo do plano. Consulte a operação na API.',
          );
      });
    } finally {
      try {
        if (session) {
          if (!replied) await this.interrupt(c, session);
          await this.store.endSession(session.id, c);
        }
      } finally {
        this.running = false;
      }
    }
    return this.refresh(operation.id);
  }
  cancel(): Promise<void> {
    return this.nfc.cancel();
  }
  async activationPending(operation: AdminOperation): Promise<boolean> {
    const c = await this.context();
    assertOperation(operation, c);
    const saved = await this.store.activation(operation.id, c);
    return !!saved && !saved.receipt;
  }
  async localJournal(operation: AdminOperation) {
    const c = await this.context();
    assertOperation(operation, c);
    const entries = [];
    for (const session of await this.store.sessions(operation.id, c))
      for (const command of await this.store.commands(session.id, c))
        entries.push({
          sessionId: session.id,
          sequence: command.frame.sequencia,
          stage: command.frame.etapa,
          state: command.state,
          mutates: command.frame.alteraTag,
          hasResponse: command.responseHex !== null,
          code: command.receipt?.codigo ?? null,
        });
    return entries;
  }
  async activate(
    operation: AdminOperation,
    provisioning: Provisioning,
    confirmed: boolean,
  ): Promise<Provisioning> {
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'Aguarde o encerramento da configuração NFC.',
      );
    const c = await this.context();
    assertOperation(operation, c);
    if (
      !confirmed ||
      operation.alteracaoFisica !== 'CONFERIDA' ||
      operation.plano.provisionamentoId !== provisioning.id
    )
      throw new AdministrationError(
        'ADMIN_ATIVACAO_PENDENTE',
        'Conclua a conferência da personalização antes de ativar.',
      );
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'Aguarde o encerramento da configuração NFC.',
      );
    this.running = true;
    try {
      let saved = await this.store.activation(operation.id, c);
      if (saved?.receipt) return saved.receipt;
      if (!saved) {
        await this.guard(c);
        const reading = await this.nfc.read(operation);
        await this.guard(c);
        new TraceabilityWorkflow(this.api).validateActivation(
          provisioning,
          reading,
          true,
        );
        saved = {
          operationId: operation.id,
          owner: {baseUrl: c.baseUrl, userId: c.userId},
          reading,
          capturedAt: new Date(this.now()).toISOString(),
          receipt: null,
        };
        await this.store.saveActivation(saved);
      }
      const api: Api = {
        request: async <T>(
          path: string,
          options?: Parameters<Api['request']>[1],
        ) => {
          await this.guard(c);
          return this.api.request<T>(path, {
            ...options,
            expectedUserId: c.userId,
            expectedBaseUrl: c.baseUrl,
          });
        },
      };
      let result: Provisioning;
      try {
        result = await new TraceabilityWorkflow(api).activate(
          provisioning,
          saved.reading,
          true,
        );
      } catch (e) {
        if (errorCode(e) === 'SDM_ATIVACAO_INVALIDA') {
          await this.store.rejectActivation(operation.id, c, errorCode(e));
          throw e;
        }
        if (!retryable(e)) throw e;
        try {
          const persisted = await api.request<Provisioning>(
            `/provisionamentos/${provisioning.id}`,
          );
          if (persisted.status !== 'ATIVA') throw e;
          result = persisted;
        } catch {
          throw e;
        }
      }
      if (
        result.id !== provisioning.id ||
        result.uid !== provisioning.uid ||
        result.estrategia !== provisioning.estrategia ||
        result.status !== 'ATIVA'
      )
        throw new AdministrationError(
          'ADMIN_ATIVACAO_DIVERGENTE',
          'A API não confirmou a ativação deste vínculo. A leitura foi preservada.',
        );
      await this.store.completeActivation(operation.id, c, result);
      return result;
    } finally {
      this.running = false;
    }
  }
  async end(operation: AdminOperation): Promise<AdminOperation> {
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'Cancele a sessão NFC e aguarde o encerramento.',
      );
    const c = await this.context();
    assertOperation(operation, c);
    const op = await this.request<AdminOperation>(
      c,
      `/operacoes/${operation.id}/encerramento`,
      {estacao: operation.estacao},
    );
    assertOperation(op, c);
    await this.store.saveOperation(op, c);
    return op;
  }
}
