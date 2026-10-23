import {createTestServices, withServices} from '../test-support/app-services';
import {Confirmation, RecoverySlots} from '../src/components/Nfc/SetupControls';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, Text, Dialog, TouchableRipple} from 'react-native-paper';
import Administracao from '../src/views/Provisionar/Administracao';
import BlockingFailure from '../src/components/Nfc/BlockingFailure';
import OrderSelect from '../src/components/Nfc/OrderSelect';
import {Choice} from '../src/components/Nfc/SetupControls';
import {identifyAdministrativeTag} from '../src/infra/nfc/administration';

import {ActionButton} from '../src/components/Tracking';
import {
  operation,
  verified,
  provisioning,
  frame,
} from '../tests/support/administration';
let mockRole = 'ADMINISTRADOR',
  mockStatus = 'authenticated',
  mockLogin = 'first-login';
let mockParams: {provisioningId?: string} | undefined = {
  provisioningId: 'selected',
};
const mockNavigation = {navigate: jest.fn()};
jest.mock('@react-navigation/native', () => ({
  NavigationContext: jest.requireActual('@react-navigation/native')
    .NavigationContext,
  useRoute: () => ({params: mockParams}),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({
    state: {
      status: mockStatus,
      session: {
        baseUrl: 'http://127.0.0.1:3000/api/v1',
        token: mockLogin,
        user: {perfil: mockRole, id: 'admin'},
      },
    },
  }),
}));
jest.mock('../src/infra/nfc/reader', () => ({physicalNfcAvailable: true}));
jest.mock('../src/infra/nfc/administration', () => ({
  identifyAdministrativeTag: jest.fn(),
}));

const services = createTestServices({
  traceability: {
    listOrders: jest.fn(async () => ({itens: [], total: 0})),
    provisioning: jest.fn(
      async () => require('../tests/support/administration').provisioning,
    ),
    order: jest.fn(async () => ({
      id: 'order',
      codigo: 'TCC-001',
      descricao: 'Caixa',
      estado: 'CADASTRADO',
      expedido: false,
    })),
  },
  administration: {
    prepare: jest.fn(),
    pending: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    restore: jest.fn(),
    suggestions: jest.fn(),
    activationPending: jest.fn(),
    localJournal: jest.fn(),
    execute: jest.fn(),
    activate: jest.fn(),
    cancel: jest.fn(async () => {}),
    end: jest.fn(),
  },
});
const {administration} = services;

let tree: TestRenderer.ReactTestRenderer;
const button = (label: string) =>
  tree.root.findAllByType(ActionButton).find(x => x.props.children === label)!;
const text = () =>
  tree.root
    .findAllByType(Text)
    .flatMap(x => x.props.children)
    .join(' ')
    .replace(/\s+/g, ' ');
async function mount() {
  await act(async () => {
    tree = TestRenderer.create(
      withServices(
        <PaperProvider>
          <Administracao />
        </PaperProvider>,
        services,
      ),
    );
  });
}
beforeEach(() => {
  mockParams = {provisioningId: 'selected'};
  mockRole = 'ADMINISTRADOR';
  mockStatus = 'authenticated';
  mockLogin = 'first-login';
  jest.mocked(administration.prepare).mockResolvedValue(operation);
  jest.mocked(administration.refresh).mockResolvedValue(operation);
  jest
    .mocked(administration.suggestions)
    .mockResolvedValue(['ATUAL', 'ATUAL', 'ATUAL', 'ATUAL', 'ATUAL']);
  jest.mocked(administration.localJournal).mockResolvedValue([]);
  jest.mocked(administration.activationPending).mockResolvedValue(false);
  jest.mocked(administration.restore).mockImplementation(async op => op);
});

test('new configuration guides order, identification and explicit treatment before creating a plan', async () => {
  mockParams = undefined;
  await mount();
  expect(button('Continuar').props.disabled).toBe(true);
  expect(tree.root.findAllByType(Choice)).toHaveLength(0);
  await act(async () =>
    tree.root
      .findByType(OrderSelect)
      .props.onSelect({id: 'order', codigo: 'TCC-NEW', estado: 'CADASTRADO'}),
  );
  await act(async () => button('Continuar').props.onPress());
  expect(text()).toContain('Aproxime a NTAG 424');
  jest.mocked(identifyAdministrativeTag).mockResolvedValueOnce({
    uid: provisioning.uid,
    version: {
      compatibleNtag424: true,
      hardwareHex: '',
      softwareHex: '',
      productionHex: '',
      productionUid: provisioning.uid,
      uidHidden: false,
    },
  });
  await act(async () => button('Identificar NTAG 424 DNA').props.onPress());
  expect(text()).toContain('Etiqueta identificada');
  await act(async () => button('Continuar').props.onPress());
  expect(button('Preparar plano').props.disabled).toBe(true);
  expect(tree.root.findAllByType(Choice).every(x => !x.props.selected)).toBe(
    true,
  );
  await act(async () =>
    tree.root
      .findAllByType(Choice)
      .find(x => x.props.title === 'Leitura autenticada · SDM')!
      .props.onPress(),
  );
  jest.mocked(administration.register).mockResolvedValueOnce(provisioning);
  await act(async () => button('Preparar plano').props.onPress());
  expect(administration.register).toHaveBeenCalledWith(
    'order',
    provisioning.uid,
    'SDM',
    'ESTRITA',
  );
  expect(administration.execute).not.toHaveBeenCalled();
  expect(button('Configurar etiqueta').props.disabled).toBe(true);
});

test('a native NFC failure shows its stable code without discarding the operation', async () => {
  await mount();
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  jest.mocked(administration.execute).mockRejectedValueOnce(
    Object.assign(new Error('Troca NFC interrompida.'), {
      code: 'NFC_TAG_RESPONSE_ERROR',
    }),
  );
  await act(async () => button('Configurar etiqueta').props.onPress());
  expect(text()).toContain(
    'Troca NFC interrompida. Código: NFC_TAG_RESPONSE_ERROR.',
  );
  expect(text()).toContain('TCC-001');
  expect(administration.refresh).toHaveBeenCalledWith(operation.id);
  expect(administration.activate).not.toHaveBeenCalled();
  expect(tree.root.findByType(BlockingFailure).props.visible).toBe(true);
  await act(async () => button('Entendi').props.onPress());
  expect(tree.root.findByType(BlockingFailure).props.visible).toBe(false);
  expect(text()).toContain('Não foi possível continuar');
});

test('an in-use tag shows a blocking dialog and ends the previous plan only after explicit confirmation', async () => {
  const previous = {
    ...operation,
    id: 'previous-operation',
    plano: {...operation.plano, epoca: 1, provisionamentoId: 'previous-link'},
  };
  jest.mocked(administration.prepare).mockRejectedValueOnce(
    Object.assign(new Error('Encerre a inspeção anterior desta etiqueta.'), {
      code: 'NFC_ETIQUETA_EM_USO',
    }),
  );
  jest.mocked(administration.pending).mockResolvedValueOnce(previous);
  jest
    .mocked(administration.end)
    .mockResolvedValueOnce({...previous, status: 'ENCERRADA'});
  await mount();
  expect(administration.pending).toHaveBeenCalledWith(provisioning.uid);
  expect(tree.root.findByType(BlockingFailure).props.visible).toBe(true);
  expect(button('Consultar plano')).toBeUndefined();
  expect(button('Resolver pendência')).toBeDefined();
  expect(administration.end).not.toHaveBeenCalled();
  await act(async () => button('Voltar à tela').props.onPress());
  expect(tree.root.findByType(BlockingFailure).props.visible).toBe(false);
  expect(button('Resolver pendência')).toBeDefined();
  await act(async () => button('Resolver pendência').props.onPress());
  await act(async () => button('Encerrar e continuar').props.onPress());
  expect(administration.end).toHaveBeenCalledWith(previous);
  expect(administration.prepare).toHaveBeenCalledTimes(2);
  expect(administration.execute).not.toHaveBeenCalled();
  expect(administration.activate).not.toHaveBeenCalled();
  expect(button('Configurar etiqueta').props.disabled).toBe(true);
  expect(tree.root.findAllByType(BlockingFailure)).toHaveLength(0);
});

test('a previous plan that emitted a physical change offers recovery and never automatic closure', async () => {
  const previous = {
    ...operation,
    id: 'previous-operation',
    alteracaoEmitida: true,
    plano: {...operation.plano, provisionamentoId: 'previous-link'},
  };
  jest.mocked(administration.prepare).mockRejectedValueOnce(
    Object.assign(new Error('Encerre a inspeção anterior desta etiqueta.'), {
      code: 'NFC_ETIQUETA_EM_USO',
    }),
  );
  jest.mocked(administration.pending).mockResolvedValueOnce(previous);
  await mount();
  expect(button('Encerrar e continuar')).toBeUndefined();
  await act(async () => button('Abrir configuração anterior').props.onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('Administracao', {
    provisioningId: 'previous-link',
  });
  expect(administration.end).not.toHaveBeenCalled();
  expect(administration.execute).not.toHaveBeenCalled();
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
});
test('plan remains visible, requires confirmation and activates only after separate configuration', async () => {
  await mount();
  expect(text()).toContain('TCC-001');
  expect(text()).not.toContain('Versões atuais');
  await act(async () =>
    tree.root
      .findAllByType(TouchableRipple)
      .find(item => item.props.accessibilityLabel === 'Detalhes técnicos')!
      .props.onPress(),
  );
  await act(async () =>
    tree.root
      .findAllByType(TouchableRipple)
      .find(item => item.props.accessibilityLabel === 'Versões das chaves')!
      .props.onPress(),
  );
  expect(text()).toContain('Versões atuais');
  expect(button('Configurar etiqueta').props.disabled).toBe(true);
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  jest
    .mocked(administration.execute)
    .mockImplementation(async (_op, _materials, progress) => {
      progress({stage: frame.etapa, sequence: 1, outcome: 'NAO_ALTERADA'});
      return verified;
    });
  await act(async () => button('Configurar etiqueta').props.onPress());
  expect(text()).toContain('Configuração conferida');
  expect(text()).toContain('Falta ativar o vínculo');
  expect(administration.activate).not.toHaveBeenCalled();
  expect(button('Ler e ativar').props.disabled).toBe(true);
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  jest
    .mocked(administration.activate)
    .mockResolvedValue({...provisioning, status: 'ATIVA'});
  await act(async () => button('Ler e ativar').props.onPress());
  expect(text()).toContain('Vínculo ativo');
});
test('unknown slots require explicit recovery selections and failures preserve the current plan', async () => {
  const interrupted = {
    ...operation,
    status: 'INTERROMPIDA' as const,
    alteracaoEmitida: true,
    alteracaoFisica: 'NAO_CONFIRMADA' as const,
  };
  jest.mocked(administration.prepare).mockResolvedValue(interrupted);
  jest.mocked(administration.refresh).mockResolvedValue(interrupted);
  jest
    .mocked(administration.suggestions)
    .mockResolvedValue([null, 'ATUAL', 'ATUAL', 'ATUAL', 'ATUAL']);
  await mount();
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  expect(button('Recuperar configuração').props.disabled).toBe(true);
  expect(text()).toContain('Escolha Atual ou Alvo na chave pendente.');
  await act(async () =>
    tree.root.findByType(RecoverySlots).props.onChange(0, 'ALVO'),
  );
  expect(button('Recuperar configuração').props.disabled).toBe(false);
  jest
    .mocked(administration.execute)
    .mockRejectedValue(new Error('Conexão interrompida'));
  await act(async () => button('Recuperar configuração').props.onPress());
  expect(text()).toContain('Conexão interrompida');
  expect(text()).toContain('TCC-001');
  expect(text()).toContain('Configuração interrompida');
});
test('pending activation offers HTTP retry and no new configuration', async () => {
  jest.mocked(administration.prepare).mockResolvedValue(verified);
  jest.mocked(administration.activationPending).mockResolvedValue(true);
  await mount();
  expect(button('Reenviar ativação')).toBeDefined();
  expect(button('Configurar etiqueta')).toBeUndefined();
  expect(text()).toContain('mesma evidência');
});

test('an unfinished server session explains why configuration is blocked', async () => {
  jest
    .mocked(administration.prepare)
    .mockResolvedValueOnce({...operation, status: 'PERSONALIZANDO'});
  await mount();
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  expect(button('Configurar etiqueta').props.disabled).toBe(true);
  expect(text()).toContain(
    'Atualize o plano para consultar a sessão em andamento.',
  );
  expect(administration.execute).not.toHaveBeenCalled();
});

test('HTTP lookup and saved-activation retry never ask for a NFC session', async () => {
  let resolvePlan!: (value: typeof operation) => void;
  jest
    .mocked(administration.prepare)
    .mockImplementationOnce(
      () => new Promise(resolve => (resolvePlan = resolve)),
    );
  await mount();
  expect(text()).toContain('Consultando o plano');
  expect(text()).not.toContain('Mantenha a etiqueta próxima');
  expect(button('Cancelar leitura')).toBeUndefined();
  await act(async () => resolvePlan(verified));
  jest.mocked(administration.refresh).mockResolvedValue(verified);
  jest.mocked(administration.activationPending).mockResolvedValue(true);
  await act(async () => button('Atualizar plano').props.onPress());
  let resolveActivation!: (value: typeof provisioning) => void;
  jest
    .mocked(administration.activate)
    .mockImplementationOnce(
      () => new Promise(resolve => (resolveActivation = resolve)),
    );
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  await act(async () => button('Reenviar ativação').props.onPress());
  expect(text()).toContain('Confirmando leitura salva');
  expect(text()).not.toContain('Mantenha a etiqueta próxima');
  expect(button('Cancelar leitura')).toBeUndefined();
  await act(async () => resolveActivation({...provisioning, status: 'ATIVA'}));
});

test('configuration offers proximity guidance and cancellation until the NFC job drains', async () => {
  await mount();
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  let finish!: (value: typeof operation) => void;
  jest
    .mocked(administration.execute)
    .mockImplementationOnce(() => new Promise(resolve => (finish = resolve)));
  await act(async () => button('Configurar etiqueta').props.onPress());
  expect(text()).toContain('Mantenha a etiqueta próxima');
  await act(async () => button('Cancelar leitura').props.onPress());
  expect(administration.cancel).toHaveBeenCalledTimes(1);
  expect(button('Configurar etiqueta')).toBeUndefined();
  await act(async () => finish(verified));
  expect(button('Cancelar leitura')).toBeUndefined();
  expect(text()).toContain('Configuração conferida');
});

test('ending an unconfigured plan explains the registered link and requires explicit confirmation', async () => {
  await mount();
  await act(async () => button('Encerrar plano').props.onPress());
  expect(administration.end).not.toHaveBeenCalled();
  expect(text()).toContain('vínculo continuará registrado');
  expect(text()).toContain('crie uma nova época');
  await act(async () => button('Voltar ao plano').props.onPress());
  expect(administration.end).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Dialog)).toHaveLength(0);
  await act(async () => button('Encerrar plano').props.onPress());
  jest
    .mocked(administration.end)
    .mockResolvedValue({...operation, status: 'ENCERRADA'});
  await act(async () => button('Confirmar encerramento').props.onPress());
  expect(administration.end).toHaveBeenCalledTimes(1);
  expect(administration.execute).not.toHaveBeenCalled();
  expect(text()).toContain('Operação encerrada');
  expect(text()).toContain('Plano encerrado sem configurar');
  expect(button('Configurar etiqueta')).toBeUndefined();
});

test('ending a verified plan preserves a separate activation action', async () => {
  jest.mocked(administration.prepare).mockResolvedValue(verified);
  await mount();
  await act(async () => button('Finalizar configuração').props.onPress());
  expect(text()).toContain('configuração conferida será preservada');
  jest
    .mocked(administration.end)
    .mockResolvedValue({...verified, status: 'ENCERRADA'});
  await act(async () => button('Confirmar encerramento').props.onPress());
  expect(text()).toContain('Operação encerrada');
  expect(text()).toContain('Falta ativar o vínculo');
  expect(button('Ler e ativar')).toBeDefined();
  expect(administration.activate).not.toHaveBeenCalled();
});

test('another login clears the old plan and fences a late response before loading its current context', async () => {
  await mount();
  await act(async () => tree.root.findByType(Confirmation).props.onPress());
  let finish!: (value: typeof operation) => void;
  jest
    .mocked(administration.execute)
    .mockImplementationOnce(() => new Promise(resolve => (finish = resolve)));
  await act(async () => button('Configurar etiqueta').props.onPress());
  mockLogin = 'new-login';
  jest
    .mocked(administration.prepare)
    .mockRejectedValue(new Error('Plano pertence à sessão anterior'));
  await act(async () =>
    tree.update(
      withServices(
        <PaperProvider>
          <Administracao />
        </PaperProvider>,
        services,
      ),
    ),
  );
  expect(text()).not.toContain('Versões atuais');
  expect(text()).not.toContain('TCC-001');
  expect(administration.cancel).toHaveBeenCalledTimes(1);
  expect(text()).toContain('Aguardando o encerramento da operação anterior');
  await act(async () => finish(verified));
  expect(text()).not.toContain('Configuração conferida');
  expect(administration.prepare).toHaveBeenCalledTimes(2);
  expect(text()).toContain('Plano pertence à sessão anterior');
  expect(button('Ler e ativar')).toBeUndefined();
});

test('a failed lookup for another route never leaves the previous administrative plan actionable', async () => {
  await mount();
  expect(text()).toContain('TCC-001');
  mockParams = {provisioningId: 'another-provisioning'};
  jest
    .mocked(services.traceability.provisioning)
    .mockRejectedValueOnce(new Error('Novo vínculo indisponível'));
  await act(async () =>
    tree.update(
      withServices(
        <PaperProvider>
          <Administracao />
        </PaperProvider>,
        services,
      ),
    ),
  );
  expect(text()).not.toContain('TCC-001');
  expect(text()).toContain('Novo vínculo indisponível');
  expect(button('Configurar etiqueta')).toBeUndefined();
});
test.each([
  ['OPERADOR', 'authenticated'],
  ['ADMINISTRADOR', 'offline'],
])('role %s / %s cannot prepare or execute', async (role, status) => {
  mockRole = role;
  mockStatus = status;
  await mount();
  expect(administration.prepare).not.toHaveBeenCalled();
  expect(text()).toContain('Entre como Administrador');
});
