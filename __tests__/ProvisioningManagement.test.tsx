import {createTestServices, withServices} from '../test-support/app-services';
import {Confirmation} from '../src/components/Nfc/SetupControls';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, Text} from 'react-native-paper';
import Gerenciar from '../src/views/Provisionar/Gerenciar';
import {ActionButton} from '../src/components/Tracking';
import Leitor from '../src/components/Nfc/Leitor';

import type {Provisioning} from '../src/domain/traceability/provisioning';

let mockParams: {provisioningId?: string} | undefined;
let mockRole = 'ADMINISTRADOR';
const mockNavigation = {push: jest.fn()};
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
      status: 'authenticated',
      session: {user: {id: 'admin', perfil: mockRole}},
    },
  }),
}));

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
const services = createTestServices({
  traceability: {
    provisioning: jest.fn(),
    tag: jest.fn(),
    order: jest.fn(),
    closeProvisioning: jest.fn(),
  },
});
const {traceability} = services;

const order = {
  id: 'order',
  codigo: 'TCC-001',
  descricao: 'Caixa',
  estado: 'COLETADO',
  expedido: false,
};
const link: Provisioning = {
  id: 'selected-id',
  pedidoId: order.id,
  uid: '53721F76950001',
  estrategia: 'UID',
  status: 'ATIVA',
  referenciaNdef: null,
  epoca: 1,
  modelo: 'FEIJU_MODELO_DESCONHECIDO',
};
let tree: TestRenderer.ReactTestRenderer;
const button = (label: string) =>
  tree.root
    .findAllByType(ActionButton)
    .find(item => item.props.children === label)!;
const text = () =>
  tree.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ')
    .replace(/\s+/g, ' ');
async function mount() {
  await act(async () => {
    tree = TestRenderer.create(
      withServices(
        <PaperProvider>
          <Gerenciar />
        </PaperProvider>,
        services,
      ),
    );
  });
}
async function confirm() {
  await act(async () => {
    button('Encerrar vínculo').props.onPress();
  });
  await act(async () => {
    tree.root.findByType(Confirmation).props.onPress();
  });
}
beforeEach(() => {
  mockParams = {provisioningId: link.id};
  mockRole = 'ADMINISTRADOR';
  jest.mocked(traceability.provisioning).mockResolvedValue(link);
  jest.mocked(traceability.order).mockResolvedValue(order);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
});

test('closure requires confirmation, submits once and reuse rereads the same UID', async () => {
  jest
    .mocked(traceability.closeProvisioning)
    .mockResolvedValue({...link, status: 'DESPROVISIONADA'});
  await mount();
  expect(text()).toContain('Vínculo ativo');
  expect(traceability.closeProvisioning).not.toHaveBeenCalled();
  await act(async () => {
    button('Encerrar vínculo').props.onPress();
  });
  expect(button('Confirmar encerramento').props.disabled).toBe(true);
  await act(async () => {
    button('Confirmar encerramento').props.onPress();
  });
  expect(traceability.closeProvisioning).not.toHaveBeenCalled();
  await act(async () => {
    tree.root.findByType(Confirmation).props.onPress();
  });
  const submit = button('Confirmar encerramento').props.onPress;
  await act(async () => {
    submit();
    submit();
  });
  expect(traceability.closeProvisioning).toHaveBeenCalledTimes(1);
  expect(traceability.closeProvisioning).toHaveBeenCalledWith(link, 'admin');
  expect(text()).toContain('Vínculo encerrado');
  expect(text()).toContain('Coletado');
  expect(button('Encerrar vínculo')).toBeUndefined();
  await act(async () => {
    button('Novo vínculo').props.onPress();
  });
  expect(mockNavigation.push).toHaveBeenCalledWith('EtapasProvisionamento', {
    estrategia: 2,
    expectedUid: link.uid,
    registeredModel: link.modelo,
  });
});

test('failed closure remains active and retries the same provisioning', async () => {
  jest
    .mocked(traceability.closeProvisioning)
    .mockRejectedValueOnce(new Error('Encerramento não confirmado'))
    .mockResolvedValueOnce({...link, status: 'DESPROVISIONADA'});
  await mount();
  await confirm();
  await act(async () => {
    button('Confirmar encerramento').props.onPress();
  });
  expect(text()).toContain('Encerramento não confirmado');
  expect(button('Confirmar encerramento')).toBeDefined();
  expect(traceability.closeProvisioning).toHaveBeenCalledWith(link, 'admin');
  expect(button('Novo vínculo')).toBeUndefined();
  await act(async () => {
    button('Confirmar encerramento').props.onPress();
  });
  expect(traceability.closeProvisioning).toHaveBeenNthCalledWith(
    2,
    link,
    'admin',
  );
});

test('a copied NDEF does not select another tag for an administrative closure', async () => {
  mockParams = undefined;
  jest.mocked(traceability.tag).mockResolvedValue(null);
  await mount();
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  await act(async () => {
    tree.root.findByType(Leitor).props.onLeituraRealizada({
      uid: '04FFFFFFFFFFFF',
      ndef: 'urn:nfc-trace:provisioning:original-id',
    });
  });
  expect(traceability.tag).toHaveBeenCalledWith('04FFFFFFFFFFFF');
  expect(traceability.provisioning).not.toHaveBeenCalled();
  expect(text()).toContain('Esta etiqueta ainda não possui vínculo');
  expect(traceability.closeProvisioning).not.toHaveBeenCalled();
});

test('a pending NTAG prioritizes resuming configuration over closing the link', async () => {
  jest.mocked(traceability.provisioning).mockResolvedValueOnce({
    ...link,
    modelo: 'NTAG424DNA',
    status: 'REGISTRADA',
  });
  await mount();
  expect(button('Retomar configuração').props.mode).toBe('contained');
  expect(button('Encerrar vínculo').props.mode).not.toBe('contained');
  await act(async () => button('Retomar configuração').props.onPress());
  expect(mockNavigation.push).toHaveBeenCalledWith('Administracao', {
    provisioningId: link.id,
  });
  expect(traceability.closeProvisioning).not.toHaveBeenCalled();
});

test('a closed SDM link opens fresh administration without reusing the closed plan', async () => {
  jest.mocked(traceability.provisioning).mockResolvedValueOnce({
    ...link,
    estrategia: 'SDM',
    status: 'DESPROVISIONADA',
    modelo: 'NTAG424DNA',
  });
  await mount();
  await act(async () => button('Novo vínculo').props.onPress());
  expect(mockNavigation.push).toHaveBeenCalledWith('Administracao');
  expect(traceability.closeProvisioning).not.toHaveBeenCalled();
});

test('operator cannot load or close an administrative link through a direct route', async () => {
  mockRole = 'OPERADOR';
  await mount();
  expect(text()).toContain('Somente um Administrador');
  expect(traceability.provisioning).not.toHaveBeenCalled();
  expect(traceability.closeProvisioning).not.toHaveBeenCalled();
});

test('a late lookup cannot replace a newer selected provisioning', async () => {
  let complete!: (value: Provisioning) => void;
  const next = {
    ...link,
    id: 'next-id',
    epoca: 2,
    status: 'DESPROVISIONADA' as const,
  };
  jest
    .mocked(traceability.provisioning)
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          complete = resolve;
        }),
    )
    .mockResolvedValueOnce(next);
  await mount();
  mockParams = {provisioningId: next.id};
  await act(async () => {
    tree.update(
      withServices(
        <PaperProvider>
          <Gerenciar />
        </PaperProvider>,
        services,
      ),
    );
  });
  expect(text()).toContain('Época 2');
  await act(async () => {
    complete(link);
  });
  expect(text()).toContain('Época 2');
  expect(text()).not.toContain('Vínculo ativo');
});
