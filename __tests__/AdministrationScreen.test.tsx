import {renderedText} from '../test-support/rendered-text';
import {createTestServices, withServices} from '../test-support/app-services';

import React from 'react';
import {
  render as renderProbe,
  act,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import Administracao from '../src/views/Provisionar/Administracao';

import {identifyAdministrativeTag} from '../src/infra/nfc/administration';

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

let tree: RenderResult;
const button = (label: string) => screen.queryByRole('button', {name: label});
const text = () => renderedText(tree).replace(/\s+/g, ' ');
async function mount() {
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <Administracao />
      </PaperProvider>,
      services,
    ),
  );
}
beforeEach(() => {
  mockParams = {provisioningId: 'selected'};
  jest.mocked(services.traceability.listOrders).mockResolvedValue({
    itens: [
      {id: 'order', codigo: 'TCC-NEW', descricao: null, estado: 'CADASTRADO'},
    ],
    total: 1,
  });
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

test('opening an existing link waits for its order without mounting a nested order picker', async () => {
  let resolveProvisioning!: (value: typeof provisioning) => void;
  jest.mocked(services.traceability.provisioning).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveProvisioning = resolve;
      }),
  );
  await mount();
  expect(text()).toContain('Consultando o plano');
  expect(screen.queryByTestId('order-search-results')).not.toBeOnTheScreen();
  expect(services.traceability.listOrders).not.toHaveBeenCalled();
  await act(async () => {
    resolveProvisioning(provisioning);
  });
  expect(text()).toContain('TCC-001');
  expect(screen.queryByTestId('order-search-results')).not.toBeOnTheScreen();
  expect(services.traceability.listOrders).not.toHaveBeenCalled();
});

test('new configuration guides order, identification and explicit treatment before creating a plan', async () => {
  mockParams = undefined;
  await mount();
  expect(button('Continuar')).toBeDisabled();
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
  await selectOrder();
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}));
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
  await fireEvent.press(
    screen.getByRole('button', {name: 'Identificar NTAG 424 DNA'}),
  );
  expect(text()).toContain('Etiqueta identificada');
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}));
  expect(button('Preparar plano')).toBeDisabled();
  expect(screen.queryAllByRole('radio', {checked: true})).toHaveLength(0);
  await fireEvent.press(
    screen.getByRole('radio', {name: 'Leitura autenticada · SDM'}),
  );
  jest.mocked(administration.register).mockResolvedValueOnce(provisioning);
  await fireEvent.press(screen.getByRole('button', {name: 'Preparar plano'}));
  expect(administration.register).toHaveBeenCalledWith(
    'order',
    provisioning.uid,
    'SDM',
    'ESTRITA',
  );
  expect(administration.execute).not.toHaveBeenCalled();
  expect(button('Configurar etiqueta')).toBeDisabled();
});

test('a native NFC failure shows its stable code without discarding the operation', async () => {
  await mount();
  await fireEvent.press(screen.getByRole('checkbox'));
  jest.mocked(administration.execute).mockRejectedValueOnce(
    Object.assign(new Error('Troca NFC interrompida.'), {
      code: 'NFC_TAG_RESPONSE_ERROR',
    }),
  );
  await fireEvent.press(
    screen.getByRole('button', {name: 'Configurar etiqueta'}),
  );
  expect(text()).toContain(
    'Troca NFC interrompida. Código: NFC_TAG_RESPONSE_ERROR.',
  );
  expect(text()).toContain('TCC-001');
  expect(administration.refresh).toHaveBeenCalledWith(operation.id);
  expect(administration.activate).not.toHaveBeenCalled();
  expect(screen.getByTestId('blocking-failure-dialog')).toBeVisible();
  await fireEvent.press(screen.getByRole('button', {name: 'Entendi'}));
  expect(screen.queryByTestId('blocking-failure-dialog')).not.toBeOnTheScreen();
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
  expect(screen.getByTestId('blocking-failure-dialog')).toBeVisible();
  expect(button('Consultar plano')).toBeNull();
  expect(button('Resolver pendência')).toBeDefined();
  expect(administration.end).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', {name: 'Voltar à tela'}));
  expect(screen.queryByTestId('blocking-failure-dialog')).not.toBeOnTheScreen();
  expect(button('Resolver pendência')).toBeDefined();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Resolver pendência'}),
  );
  await fireEvent.press(
    screen.getByRole('button', {name: 'Encerrar e continuar'}),
  );
  expect(administration.end).toHaveBeenCalledWith(previous);
  expect(administration.prepare).toHaveBeenCalledTimes(2);
  expect(administration.execute).not.toHaveBeenCalled();
  expect(administration.activate).not.toHaveBeenCalled();
  expect(button('Configurar etiqueta')).toBeDisabled();
  expect(
    screen.queryByRole('button', {name: /^Abrir erro:/}),
  ).not.toBeOnTheScreen();
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
  expect(button('Encerrar e continuar')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Abrir configuração anterior'}),
  );
  expect(mockNavigation.navigate).toHaveBeenCalledWith('Administracao', {
    provisioningId: 'previous-link',
  });
  expect(administration.end).not.toHaveBeenCalled();
  expect(administration.execute).not.toHaveBeenCalled();
});
afterEach(async () => {
  jest.clearAllMocks();
});
test('plan remains visible, requires confirmation and activates only after separate configuration', async () => {
  await mount();
  expect(text()).toContain('TCC-001');
  expect(text()).not.toContain('Versões atuais');
  await fireEvent.press(
    screen.getByRole('button', {name: 'Detalhes técnicos'}),
  );
  await fireEvent.press(
    screen.getByRole('button', {name: 'Versões das chaves'}),
  );
  expect(text()).toContain('Versões atuais');
  expect(button('Configurar etiqueta')).toBeDisabled();
  await fireEvent.press(screen.getByRole('checkbox'));
  jest
    .mocked(administration.execute)
    .mockImplementation(async (_op, _materials, progress) => {
      progress({stage: frame.etapa, sequence: 1, outcome: 'NAO_ALTERADA'});
      return verified;
    });
  await fireEvent.press(
    screen.getByRole('button', {name: 'Configurar etiqueta'}),
  );
  expect(text()).toContain('Configuração conferida');
  expect(text()).toContain('Falta ativar o vínculo');
  expect(administration.activate).not.toHaveBeenCalled();
  expect(button('Ler e ativar')).toBeDisabled();
  await fireEvent.press(screen.getByRole('checkbox'));
  jest
    .mocked(administration.activate)
    .mockResolvedValue({...provisioning, status: 'ATIVA'});
  await fireEvent.press(screen.getByRole('button', {name: 'Ler e ativar'}));
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
  await fireEvent.press(screen.getByRole('checkbox'));
  expect(button('Recuperar configuração')).toBeDisabled();
  expect(text()).toContain('Escolha Atual ou Alvo na chave pendente.');
  await fireEvent.press(screen.getByRole('radio', {name: 'Chave 0: Alvo'}));
  expect(button('Recuperar configuração')).toBeEnabled();
  jest
    .mocked(administration.execute)
    .mockRejectedValue(new Error('Conexão interrompida'));
  await fireEvent.press(
    screen.getByRole('button', {name: 'Recuperar configuração'}),
  );
  expect(text()).toContain('Conexão interrompida');
  expect(text()).toContain('TCC-001');
  expect(text()).toContain('Configuração interrompida');
});
test('pending activation offers HTTP retry and no new configuration', async () => {
  jest.mocked(administration.prepare).mockResolvedValue(verified);
  jest.mocked(administration.activationPending).mockResolvedValue(true);
  await mount();
  expect(button('Reenviar ativação')).toBeDefined();
  expect(button('Configurar etiqueta')).toBeNull();
  expect(text()).toContain('mesma evidência');
});

test('an unfinished server session explains why configuration is blocked', async () => {
  jest
    .mocked(administration.prepare)
    .mockResolvedValueOnce({...operation, status: 'PERSONALIZANDO'});
  await mount();
  await fireEvent.press(screen.getByRole('checkbox'));
  expect(button('Configurar etiqueta')).toBeDisabled();
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
  expect(button('Cancelar leitura')).toBeNull();
  await act(async () => resolvePlan(verified));
  jest.mocked(administration.refresh).mockResolvedValue(verified);
  jest.mocked(administration.activationPending).mockResolvedValue(true);
  await fireEvent.press(screen.getByRole('button', {name: 'Atualizar plano'}));
  let resolveActivation!: (value: typeof provisioning) => void;
  jest
    .mocked(administration.activate)
    .mockImplementationOnce(
      () => new Promise(resolve => (resolveActivation = resolve)),
    );
  await fireEvent.press(screen.getByRole('checkbox'));
  await fireEvent.press(
    screen.getByRole('button', {name: 'Reenviar ativação'}),
  );
  expect(text()).toContain('Confirmando leitura salva');
  expect(text()).not.toContain('Mantenha a etiqueta próxima');
  expect(button('Cancelar leitura')).toBeNull();
  await act(async () => resolveActivation({...provisioning, status: 'ATIVA'}));
});

test('configuration offers proximity guidance and cancellation until the NFC job drains', async () => {
  await mount();
  await fireEvent.press(screen.getByRole('checkbox'));
  let finish!: (value: typeof operation) => void;
  jest
    .mocked(administration.execute)
    .mockImplementationOnce(() => new Promise(resolve => (finish = resolve)));
  await fireEvent.press(
    screen.getByRole('button', {name: 'Configurar etiqueta'}),
  );
  expect(text()).toContain('Mantenha a etiqueta próxima');
  await fireEvent.press(screen.getByRole('button', {name: 'Cancelar leitura'}));
  expect(administration.cancel).toHaveBeenCalledTimes(1);
  expect(button('Configurar etiqueta')).toBeNull();
  await act(async () => finish(verified));
  expect(button('Cancelar leitura')).toBeNull();
  expect(text()).toContain('Configuração conferida');
});

test('ending an unconfigured plan explains the registered link and requires explicit confirmation', async () => {
  await mount();
  await fireEvent.press(screen.getByRole('button', {name: 'Encerrar plano'}));
  expect(administration.end).not.toHaveBeenCalled();
  expect(text()).toContain('vínculo continuará registrado');
  expect(text()).toContain('crie uma nova época');
  await fireEvent.press(screen.getByRole('button', {name: 'Voltar ao plano'}));
  expect(administration.end).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', {name: 'Confirmar encerramento'}),
  ).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', {name: 'Encerrar plano'}));
  jest
    .mocked(administration.end)
    .mockResolvedValue({...operation, status: 'ENCERRADA'});
  await fireEvent.press(
    screen.getByRole('button', {name: 'Confirmar encerramento'}),
  );
  expect(administration.end).toHaveBeenCalledTimes(1);
  expect(administration.execute).not.toHaveBeenCalled();
  expect(text()).toContain('Operação encerrada');
  expect(text()).toContain('Plano encerrado sem configurar');
  expect(button('Configurar etiqueta')).toBeNull();
});

test('ending a verified plan preserves a separate activation action', async () => {
  jest.mocked(administration.prepare).mockResolvedValue(verified);
  await mount();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Finalizar configuração'}),
  );
  expect(text()).toContain('configuração conferida será preservada');
  jest
    .mocked(administration.end)
    .mockResolvedValue({...verified, status: 'ENCERRADA'});
  await fireEvent.press(
    screen.getByRole('button', {name: 'Confirmar encerramento'}),
  );
  expect(text()).toContain('Operação encerrada');
  expect(text()).toContain('Falta ativar o vínculo');
  expect(button('Ler e ativar')).toBeDefined();
  expect(administration.activate).not.toHaveBeenCalled();
});

test('another login clears the old plan and fences a late response before loading its current context', async () => {
  await mount();
  await fireEvent.press(screen.getByRole('checkbox'));
  let finish!: (value: typeof operation) => void;
  jest
    .mocked(administration.execute)
    .mockImplementationOnce(() => new Promise(resolve => (finish = resolve)));
  await fireEvent.press(
    screen.getByRole('button', {name: 'Configurar etiqueta'}),
  );
  mockLogin = 'new-login';
  jest
    .mocked(administration.prepare)
    .mockRejectedValue(new Error('Plano pertence à sessão anterior'));
  await tree.rerender(
    withServices(
      <PaperProvider>
        <Administracao />
      </PaperProvider>,
      services,
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
  expect(button('Ler e ativar')).toBeNull();
});

test('a failed lookup for another route never leaves the previous administrative plan actionable', async () => {
  await mount();
  expect(text()).toContain('TCC-001');
  mockParams = {provisioningId: 'another-provisioning'};
  jest
    .mocked(services.traceability.provisioning)
    .mockRejectedValueOnce(new Error('Novo vínculo indisponível'));
  await tree.rerender(
    withServices(
      <PaperProvider>
        <Administracao />
      </PaperProvider>,
      services,
    ),
  );
  expect(text()).not.toContain('TCC-001');
  expect(text()).toContain('Novo vínculo indisponível');
  expect(screen.queryByTestId('order-search-results')).not.toBeOnTheScreen();
  expect(services.traceability.listOrders).not.toHaveBeenCalled();
  expect(button('Configurar etiqueta')).toBeNull();
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

async function selectOrder() {
  await fireEvent.press(await screen.findByRole('button', {name: /TCC-NEW/}));
}
