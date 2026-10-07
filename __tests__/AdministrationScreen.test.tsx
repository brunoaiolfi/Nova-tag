import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, Text, Checkbox, RadioButton} from 'react-native-paper';
import Administracao from '../src/views/Provisionar/Administracao';
import {administration} from '../src/infra/administration/runtime';
import {ActionButton} from '../src/components/Tracking';
import {
  operation,
  verified,
  provisioning,
  frame,
} from '../tests/support/administration';
let mockRole = 'ADMINISTRADOR',
  mockStatus = 'authenticated';
const mockNavigation = {navigate: jest.fn()};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: {provisioningId: 'selected'}}),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({
    state: {status: mockStatus, session: {user: {perfil: mockRole}}},
  }),
}));
jest.mock('../src/infra/nfc/reader', () => ({physicalNfcAvailable: true}));
jest.mock('../src/infra/nfc/administration', () => ({
  identifyAdministrativeTag: jest.fn(),
}));
jest.mock('../src/infra/traceability/runtime', () => ({
  traceability: {
    provisioning: jest.fn(
      async () => require('../tests/support/administration').provisioning,
    ),
    order: jest.fn(async () => ({
      id: 'order',
      codigo: 'TCC-001',
      descricao: 'Caixa',
      estado: 'CADASTRADO',
    })),
  },
}));
jest.mock('../src/infra/administration/runtime', () => ({
  administration: {
    prepare: jest.fn(),
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
}));
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
      <PaperProvider>
        <Administracao />
      </PaperProvider>,
    );
  });
}
beforeEach(() => {
  mockRole = 'ADMINISTRADOR';
  mockStatus = 'authenticated';
  jest.mocked(administration.prepare).mockResolvedValue(operation);
  jest.mocked(administration.refresh).mockResolvedValue(operation);
  jest
    .mocked(administration.suggestions)
    .mockResolvedValue(['ATUAL', 'ATUAL', 'ATUAL', 'ATUAL', 'ATUAL']);
  jest.mocked(administration.localJournal).mockResolvedValue([]);
  jest.mocked(administration.activationPending).mockResolvedValue(false);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
});
test('plan remains visible, requires confirmation and activates only after separate configuration', async () => {
  await mount();
  expect(text()).toContain('TCC-001');
  expect(text()).toContain('Versões atuais');
  expect(button('Aproximar e configurar').props.disabled).toBe(true);
  await act(async () => tree.root.findByType(Checkbox.Item).props.onPress());
  jest
    .mocked(administration.execute)
    .mockImplementation(async (_op, _materials, progress) => {
      progress({stage: frame.etapa, sequence: 1, outcome: 'NAO_ALTERADA'});
      return verified;
    });
  await act(async () => button('Aproximar e configurar').props.onPress());
  expect(text()).toContain('Configuração conferida');
  expect(text()).toContain('Falta ativar o vínculo');
  expect(administration.activate).not.toHaveBeenCalled();
  expect(button('Ler novamente e ativar').props.disabled).toBe(true);
  await act(async () => tree.root.findByType(Checkbox.Item).props.onPress());
  jest
    .mocked(administration.activate)
    .mockResolvedValue({...provisioning, status: 'ATIVA'});
  await act(async () => button('Ler novamente e ativar').props.onPress());
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
  await act(async () => tree.root.findByType(Checkbox.Item).props.onPress());
  expect(button('Recuperar com nova sessão NFC').props.disabled).toBe(true);
  await act(async () =>
    tree.root.findAllByType(RadioButton.Group)[0].props.onValueChange('ALVO'),
  );
  expect(button('Recuperar com nova sessão NFC').props.disabled).toBe(false);
  jest
    .mocked(administration.execute)
    .mockRejectedValue(new Error('Conexão interrompida'));
  await act(async () =>
    button('Recuperar com nova sessão NFC').props.onPress(),
  );
  expect(text()).toContain('Conexão interrompida');
  expect(text()).toContain('TCC-001');
  expect(text()).toContain('Configuração interrompida');
});
test('pending activation offers HTTP retry and no new configuration', async () => {
  jest.mocked(administration.prepare).mockResolvedValue(verified);
  jest.mocked(administration.activationPending).mockResolvedValue(true);
  await mount();
  expect(button('Reenviar leitura de ativação')).toBeDefined();
  expect(button('Aproximar e configurar')).toBeUndefined();
  expect(text()).toContain('mesma evidência');
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
