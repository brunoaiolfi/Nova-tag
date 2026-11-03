import {decodeProvisioning} from '../traceability/contracts/provisioning-decoder';
import {record} from '../../domain/validation/values';
import {TraceabilityWorkflow} from '../traceability/workflow';
import type {Api} from '../auth/ports/authenticated-api';
import type {Provisioning} from '../../domain/traceability/provisioning';
import type {Strategy, Reading} from '../../domain/traceability/reading';
import {AdministrationError} from '../../domain/administration/error';
import {AdminContext} from './operation-context.types';
import {AdminOperation, Material} from '../../domain/administration/operation';
import {AdminReply} from './contracts/admin-reply.types';
import {AdminRfSession} from './recovery.types';
import {AdminStore} from './ports/admin-store';
import {assertOperation} from './operation-owner-policy';
import {assertSessionReply} from './rf-session-policy';
import {commandBytes} from '../../domain/nfc/administrative-command';
import {errorCode} from './failure';
import {sameOwner} from '../../domain/administration/owner';

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
const retryable = (error: unknown) =>
  ['API_INDISPONIVEL', 'RESPOSTA_INVALIDA'].includes(errorCode(error)) ||
  (error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) >= 500);

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
  private async request(
    context: AdminContext,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    await this.guard(context);
    return this.api.request(root + path, {
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
    const operationContext = await this.context();
    await this.guard(operationContext);
    const query = async () =>
      decodeProvisioning(
        await this.api.request(`/etiquetas/${uid}`, {
          expectedBaseUrl: operationContext.baseUrl,
          expectedUserId: operationContext.userId,
        }),
      );
    const matches = (administrationProgress: Provisioning) =>
      administrationProgress.pedidoId === orderId &&
      administrationProgress.uid === uid &&
      administrationProgress.estrategia === strategy &&
      administrationProgress.modelo
        ?.replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase() === 'NTAG424DNA' &&
      administrationProgress.status !== 'DESPROVISIONADA' &&
      (strategy !== 'SDM' || administrationProgress.sdm?.politica === policy);
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
    } catch (error) {
      if (errorCode(error) !== 'ETIQUETA_NAO_ENCONTRADA') throw error;
    }
    try {
      return decodeProvisioning(
        await this.api.request('/etiquetas', {
          method: 'POST',
          expectedUserId: operationContext.userId,
          expectedBaseUrl: operationContext.baseUrl,
          body: {
            pedidoId: orderId,
            uid,
            modelo: 'NTAG424DNA',
            estrategia: strategy,
            ...(strategy === 'SDM' ? {politicaSdm: policy} : {}),
          },
        }),
      );
    } catch (error) {
      if (retryable(error)) {
        await this.guard(operationContext);
        try {
          const administrationProgress = await query();
          if (matches(administrationProgress)) return administrationProgress;
        } catch {
          /* Preserve the original uncertain response. */
        }
      }
      throw error;
    }
  }
  async prepare(provisioning: Provisioning): Promise<AdminOperation> {
    const operationContext = await this.context();
    let operation: unknown;
    try {
      operation = await this.request(
        operationContext,
        `/provisionamentos/${provisioning.id}/personalizacao`,
      );
    } catch (error) {
      if (errorCode(error) !== 'NFC_PERSONALIZACAO_INEXISTENTE') throw error;
      let draft = await this.store.draft(provisioning.id, operationContext);
      if (!draft) {
        draft = {
          id: this.ids(),
          owner: {
            baseUrl: operationContext.baseUrl,
            userId: operationContext.userId,
          },
          station: operationContext.station,
          provisioningId: provisioning.id,
        };
        await this.store.saveDraft(draft);
      }
      operation = await this.request(operationContext, '/personalizacoes', {
        id: draft.id,
        provisionamentoId: provisioning.id,
        estacao: draft.station,
      });
    }
    assertOperation(operation, operationContext);
    if (
      operation.plano.provisionamentoId !== provisioning.id ||
      operation.plano.uid !== provisioning.uid ||
      operation.plano.estrategia !== provisioning.estrategia
    )
      throw new AdministrationError(
        'ADMIN_PLANO_DIVERGENTE',
        'O plano não corresponde ao vínculo selecionado.',
      );
    await this.store.saveOperation(operation, operationContext);
    return this.restore(operation);
  }
  async refresh(id: string): Promise<AdminOperation> {
    const operationContext = await this.context(),
      operationSnapshot = await this.request(
        operationContext,
        `/operacoes/${id}`,
      );
    assertOperation(operationSnapshot, operationContext);
    await this.store.saveOperation(operationSnapshot, operationContext);
    return operationSnapshot;
  }
  async pending(uid: string): Promise<AdminOperation> {
    const operationContext = await this.context();
    const normalized = uid.replace(/[:\s-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{14}$/.test(normalized))
      throw new AdministrationError(
        'ADMIN_UID_INVALIDO',
        'Leia novamente a etiqueta para identificar seu número.',
      );
    const operationSnapshot = await this.request(
      operationContext,
      '/etiquetas/' + normalized + '/operacao-pendente',
    );
    if (
      record(operationSnapshot) &&
      typeof operationSnapshot.administradorId === 'string' &&
      operationSnapshot.administradorId !== operationContext.userId
    )
      throw new AdministrationError(
        'ADMIN_OPERACAO_OUTRA_CONTA',
        'A configuração anterior pertence a outro administrador. Peça que ele a encerre ou recupere pela própria conta.',
      );
    assertOperation(operationSnapshot, operationContext);
    if (operationSnapshot.plano.uid !== normalized)
      throw new AdministrationError(
        'ADMIN_PLANO_DIVERGENTE',
        'A configuração encontrada não pertence à etiqueta lida.',
      );
    await this.store.saveOperation(operationSnapshot, operationContext);
    return operationSnapshot;
  }
  /** HTTP-only restoration. Old RF frames can never be transported from this path. */
  async restore(operation: AdminOperation): Promise<AdminOperation> {
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'Aguarde o encerramento da sessão NFC.',
      );
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
    for (const session of await this.store.sessions(
      operation.id,
      operationContext,
    )) {
      if (session.ended) continue;
      const commands = await this.store.commands(session.id, operationContext);
      const pending = commands.find(
        localCommand => localCommand.state === 'RESPONSE',
      );
      if (pending && session.sessionMarker === operationContext.sessionMarker) {
        const reply = await this.submit(
          operationContext,
          session,
          pending.frame,
          pending.responseHex!,
        );
        await this.store.acknowledge(session, pending.frame, reply);
        session.reply = reply;
      }
      if (session.reply?.status !== 'CONCLUIDA')
        await this.interrupt(operationContext, session);
      await this.store.endSession(session.id, operationContext);
    }
    // Server lookup also finds a RF session after loss of local SQLite/identity login.
    const operationSnapshot = await this.refresh(operation.id);
    if (operationSnapshot.sessaoAtivaId) {
      // Session RF id is intentionally not guessed: local journal must identify it to interrupt early.
      throw new AdministrationError(
        'ADMIN_RF_EM_USO',
        'A operação ainda possui uma sessão NFC de outra instalação. Feche-a na estação de origem ou aguarde o prazo da API e atualize.',
      );
    }
    return operationSnapshot;
  }
  async suggestions(operation: AdminOperation): Promise<(Material | null)[]> {
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
    const sessions = await this.store.sessions(operation.id, operationContext),
      last = sessions.at(-1);
    if (!last)
      return operation.alteracaoEmitida
        ? [null, null, null, null, null]
        : Array<Material>(5).fill('ATUAL');
    const choices: (Material | null)[] = [...last.materials];
    for (const command of await this.store.commands(
      last.id,
      operationContext,
    )) {
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
    operationContext: AdminContext,
    rfSession: AdminRfSession,
    frame: {id: string},
    hex: string,
  ): Promise<AdminReply> {
    const reply = await this.request(
      operationContext,
      `/operacoes/${rfSession.operationId}/sessoes/${rfSession.id}/respostas`,
      {
        comandoId: frame.id,
        sessaoRfId: rfSession.rfId,
        estacao: rfSession.station,
        respostaHex: hex,
      },
    );
    assertSessionReply(reply, rfSession.id);
    return reply;
  }
  private async interrupt(
    operationContext: AdminContext,
    rfSession: AdminRfSession,
  ): Promise<void> {
    try {
      await this.request(
        operationContext,
        `/operacoes/${rfSession.operationId}/sessoes/${rfSession.id}/interrupcao`,
        {sessaoRfId: rfSession.rfId, estacao: rfSession.station},
      );
    } catch (error) {
      if (errorCode(error) !== 'NFC_SESSAO_INEXISTENTE') throw error;
    }
  }
  async execute(
    operation: AdminOperation,
    materials: Material[],
    progress: (administrationProgress: AdministrationProgress) => void,
  ): Promise<AdminOperation> {
    if (this.running)
      throw new AdministrationError(
        'ADMIN_EM_ANDAMENTO',
        'A sessão NFC já está em andamento.',
      );
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
    const recovery = operation.status === 'INTERROMPIDA';
    if (
      !['PREPARADA', 'INTERROMPIDA'].includes(operation.status) ||
      materials.length !== 5 ||
      materials.some(material => !['ATUAL', 'ALVO'].includes(material))
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
        await this.guard(operationContext);
        rf.checkpoint();
        session = {
          id: this.ids(),
          operationId: operation.id,
          owner: {
            baseUrl: operationContext.baseUrl,
            userId: operationContext.userId,
          },
          rfId: rf.id,
          sessionMarker: operationContext.sessionMarker,
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
        let initialReply: unknown;
        try {
          initialReply = await this.request(
            operationContext,
            `/operacoes/${operation.id}/sessoes`,
            body,
          );
        } catch (error) {
          if (!retryable(error)) throw error;
          rf.checkpoint();
          initialReply = await this.request(
            operationContext,
            `/operacoes/${operation.id}/sessoes`,
            body,
          );
        }
        assertSessionReply(initialReply, session.id);
        let reply: AdminReply = initialReply;
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
          await this.guard(operationContext);
          rf.checkpoint();
          progress({
            stage: frame.etapa,
            sequence: frame.sequencia,
            outcome: reply.alteracaoFisica,
          });
          // Commit intent before the physical call. A previous ATTEMPTED frame is never resent.
          await this.store.attempt(session, frame);
          await this.guard(operationContext);
          rf.checkpoint();
          const raw = await rf.transceive(bytes);
          if (
            raw.length < 2 ||
            raw.length > 258 ||
            raw.some(
              responseByte =>
                !Number.isInteger(responseByte) ||
                responseByte < 0 ||
                responseByte > 255,
            )
          )
            throw new AdministrationError(
              'ADMIN_RESPOSTA_NFC_INVALIDA',
              'A tag retornou uma resposta incompleta. Confira a etapa antes de recuperar.',
            );
          const responseHex = raw
            .map(responseByte => responseByte.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
          // Save a late NFC response even if cancellation/identity change occurred during transceive.
          await this.store.response(session, frame, responseHex);
          rf.checkpoint();
          try {
            reply = await this.submit(
              operationContext,
              session,
              frame,
              responseHex,
            );
          } catch (error) {
            if (!retryable(error)) throw error;
            rf.checkpoint();
            reply = await this.submit(
              operationContext,
              session,
              frame,
              responseHex,
            );
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
          if (!replied) await this.interrupt(operationContext, session);
          await this.store.endSession(session.id, operationContext);
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
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
    const saved = await this.store.activation(operation.id, operationContext);
    return !!saved && !saved.receipt;
  }
  async localJournal(operation: AdminOperation) {
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
    const entries = [];
    for (const session of await this.store.sessions(
      operation.id,
      operationContext,
    ))
      for (const command of await this.store.commands(
        session.id,
        operationContext,
      ))
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
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
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
      let saved = await this.store.activation(operation.id, operationContext);
      if (saved?.receipt) return saved.receipt;
      if (!saved) {
        await this.guard(operationContext);
        const reading = await this.nfc.read(operation);
        await this.guard(operationContext);
        new TraceabilityWorkflow(this.api).validateActivation(
          provisioning,
          reading,
          true,
        );
        saved = {
          operationId: operation.id,
          owner: {
            baseUrl: operationContext.baseUrl,
            userId: operationContext.userId,
          },
          reading,
          capturedAt: new Date(this.now()).toISOString(),
          receipt: null,
        };
        await this.store.saveActivation(saved);
      }
      const api: Api = {
        request: async (
          path: string,
          options?: Parameters<Api['request']>[1],
        ) => {
          await this.guard(operationContext);
          return this.api.request(path, {
            ...options,
            expectedUserId: operationContext.userId,
            expectedBaseUrl: operationContext.baseUrl,
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
      } catch (error) {
        if (errorCode(error) === 'SDM_ATIVACAO_INVALIDA') {
          await this.store.rejectActivation(
            operation.id,
            operationContext,
            errorCode(error),
          );
          throw error;
        }
        if (!retryable(error)) throw error;
        try {
          const persisted = decodeProvisioning(
            await api.request(`/provisionamentos/${provisioning.id}`),
          );
          if (persisted.status !== 'ATIVA') throw error;
          result = persisted;
        } catch {
          throw error;
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
      await this.store.completeActivation(
        operation.id,
        operationContext,
        result,
      );
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
    const operationContext = await this.context();
    assertOperation(operation, operationContext);
    const operationSnapshot = await this.request(
      operationContext,
      `/operacoes/${operation.id}/encerramento`,
      {estacao: operation.estacao},
    );
    assertOperation(operationSnapshot, operationContext);
    await this.store.saveOperation(operationSnapshot, operationContext);
    return operationSnapshot;
  }
}
