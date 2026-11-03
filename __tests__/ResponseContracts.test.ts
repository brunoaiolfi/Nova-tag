import {
  decodeOrderPage,
  decodeOrderDetails,
} from '../src/appplication/traceability/contracts/order-decoder';
import {decodeProvisioning} from '../src/appplication/traceability/contracts/provisioning-decoder';
import {decodeDecision} from '../src/appplication/traceability/contracts/decision-decoder';
import {decodeHistoryItems} from '../src/appplication/traceability/contracts/history-decoder';
import {decodeExperimentRecord} from '../src/appplication/experimentation/record-decoder';
import {decodeBatch} from '../src/appplication/offline/batch-decoder';
import {versions} from '../src/domain/administration/contract-values';
import {bytesBase64, utf8} from '../src/domain/nfc/ndef';
import {ndefFileSettings} from '../src/domain/nfc/file-settings';
import {response} from '../src/domain/nfc/type4';

const order = {
  id: 'order',
  codigo: 'TCC-001',
  descricao: null,
  estado: 'CADASTRADO',
};
const receipt = {
  armazenada: true,
  originalReceiptId: 'retained-id',
  decisao: {
    autorizada: false,
    motivo: 'AGUARDANDO_ANTECEDENTE',
    classificacao: 'REGULAR',
    avisos: [],
    status: 'PENDENTE',
    revisao: 1,
    serverEvidence: {original: true},
  },
  historicoDecisoes: [
    {
      autorizada: false,
      motivo: 'AGUARDANDO_ANTECEDENTE',
      classificacao: 'REGULAR',
      avisos: [],
      revisao: 1,
    },
  ],
};

test('receipt decoding preserves original evidence and revisions while proving consumed fields', () => {
  expect(decodeDecision(receipt)).toEqual(receipt);
  expect(
    decodeBatch({
      itens: [
        {
          indice: 0,
          id: 'capture',
          mensagem: 'Salva',
          sucesso: true,
          status: 200,
          codigo: null,
          dados: receipt,
        },
      ],
    }).itens[0]?.dados,
  ).toEqual(receipt);
});

test('optional link metadata remains omitted and nullable NDEF references remain null', () => {
  const link = decodeProvisioning({
    id: 'link',
    pedidoId: 'order',
    uid: '04AABBCCDDEE01',
    estrategia: 'UID',
    status: 'ATIVA',
    referenciaNdef: null,
  });
  expect(link.referenciaNdef).toBeNull();
  expect(link).not.toHaveProperty('epoca');
  expect(link).not.toHaveProperty('sdm');
  expect(decodeOrderDetails({...order, expedido: false})).not.toHaveProperty(
    'provisionamentoVigente',
  );
});

test.each([
  {itens: [order], total: -1},
  {itens: [{...order, descricao: undefined}], total: 1},
  {itens: [{...order, id: 42}], total: 1},
  {itens: new Array(1), total: 1},
])(
  'malformed order pages cannot become typed application models: %j',
  input => {
    expect(() => decodeOrderPage(input)).toThrow();
  },
);
test.each([
  {...receipt, armazenada: 'true'},
  {...receipt, decisao: {...receipt.decisao, revisao: 0}},
  {...receipt, decisao: {...receipt.decisao, avisos: [null]}},
  {...receipt, historicoDecisoes: [{}]},
  {...receipt, decisao: {...receipt.decisao, dependencias: [{tipo: 'COLETA'}]}},
  {...receipt, decisao: {...receipt.decisao, sdm: {autenticada: true}}},
])('malformed decision evidence is rejected: %j', input => {
  expect(() => decodeDecision(input)).toThrow();
});
test('a failed batch item cannot carry a success receipt or a missing error code', () => {
  const failed = {
    indice: 0,
    id: 'capture',
    mensagem: 'Falhou',
    sucesso: false,
    status: 500,
    codigo: 'INDISPONIVEL',
    dados: null,
  };
  expect(decodeBatch({itens: [failed]}).itens).toEqual([failed]);
  expect(() => decodeBatch({itens: [{...failed, dados: receipt}]})).toThrow();
  expect(() => decodeBatch({itens: [{...failed, codigo: null}]})).toThrow();
});
test('history and persisted experiment records reject incomplete nested contracts', () => {
  expect(() =>
    decodeHistoryItems({
      itens: [{id: 'capture', decisao: receipt.decisao}],
      total: 1,
    }),
  ).toThrow();
  expect(() =>
    decodeExperimentRecord({id: 'record', stage: 'UNRECOGNIZED'}),
  ).toThrow();
});
test('sparse arrays never stand in for received bytes, key versions or decoded records', () => {
  expect(versions(new Array(5))).toBe(false);
  expect(() => utf8(new Array(2))).toThrow();
  expect(() => bytesBase64(new Array(3))).toThrow();
  expect(() => response([0x90, ...new Array(1)])).toThrow();
  const settings = [0, 0, 0xe0, 0xe0, 0, 1, 0];
  delete settings[5];
  expect(() => ndefFileSettings(settings)).toThrow();
});
