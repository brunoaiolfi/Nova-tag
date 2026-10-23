import React from 'react';
import {Text} from 'react-native-paper';
import type {Decision} from '../../domain/traceability/decision';
import {Details} from '.';

export function SdmEvidence({sdm}: {sdm?: Decision['decisao']['sdm']}) {
  if (!sdm) return null;
  return (
    <Details title="Validação NFC">
      <Text>
        {sdm.autenticada
          ? 'Evidência autenticada pelo servidor'
          : 'Autenticidade não confirmada'}
      </Text>
      <Text>
        {sdm.previamenteUtilizada
          ? 'Evidência já utilizada'
          : sdm.temporalidade === 'TARDIA'
          ? 'Leitura recebida fora de ordem · sem movimentação automática'
          : sdm.autenticada
          ? 'Primeiro recebimento desta evidência'
          : 'Contador não avaliado'}
      </Text>
      <Text>
        Política:{' '}
        {sdm.politica === 'ESTRITA' ? 'ordem estrita' : 'registro tardio'} ·
        Época {sdm.epoca}
      </Text>
      {sdm.contador !== null && (
        <Text>
          Contador da leitura: {sdm.contador} · Maior anterior:{' '}
          {sdm.maiorContadorAnterior ?? 'nenhum'}
        </Text>
      )}
    </Details>
  );
}
