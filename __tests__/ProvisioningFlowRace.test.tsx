import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {createTestServices, withServices} from '../test-support/app-services';
import {useProvisioningFlow} from '../src/views/Provisionar/Etapas/use-provisioning-flow';
import {provisioning} from '../tests/support/administration';

test('duplicate taps submit once and a late registration cannot populate a different selected order', async () => {
  let complete!: (value: typeof provisioning) => void;
  const register = jest.fn(
    () =>
      new Promise<typeof provisioning>(resolve => {
        complete = resolve;
      }),
  );
  const services = createTestServices({traceability: {register}});
  let flow!: ReturnType<typeof useProvisioningFlow>;
  function Probe() {
    flow = useProvisioningFlow('UID');
    return null;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(withServices(<Probe />, services));
  });
  const order = {
    id: provisioning.pedidoId,
    codigo: 'FIRST',
    descricao: null,
    estado: 'CADASTRADO',
  };
  await act(async () => flow.selectOrder(order));
  await act(async () =>
    flow.capturedReading({uid: provisioning.uid}, '2026-10-23T10:00:00Z'),
  );
  let firstRequest!: Promise<void>;
  await act(async () => {
    firstRequest = flow.register();
    void flow.register();
  });
  expect(register).toHaveBeenCalledTimes(1);
  await act(async () =>
    flow.selectOrder({...order, id: 'second-order', codigo: 'SECOND'}),
  );
  await act(async () => {
    complete(provisioning);
    await firstRequest;
  });
  expect(flow.order?.codigo).toBe('SECOND');
  expect(flow.provisioning).toBeUndefined();
  expect(flow.reading).toBeUndefined();
  expect(flow.confirmed).toBe(false);
  expect(flow.busy).toBe(false);
  await act(async () => tree.unmount());
});
