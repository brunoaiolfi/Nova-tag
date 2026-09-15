import React from 'react';

import Tela from '../../../../components/Base/Tela';
import VStack from '../../../../components/Base/VStack';
import Input from '../../../../components/Base/Input';
import Botao from '../../../../components/Base/Botao';

interface IIdentificarPedido {
  onIdentificarPedido: (codigoPedido: string) => void;
  codigoTag: string;
}

const IdentificarPedido = ({
  onIdentificarPedido,
  codigoTag,
}: IIdentificarPedido) => {
  const [codigoPedido, setCodigoPedido] = React.useState('');

  return (
    <Tela>
      <VStack gap={16}>
        <Input label="UID da etiqueta" value={codigoTag} disabled />

        <Input
          label="Código do pedido"
          value={codigoPedido}
          onChangeText={setCodigoPedido}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Botao
          onPress={() => onIdentificarPedido(codigoPedido)}
          disabled={!codigoPedido}>
          Continuar
        </Botao>
      </VStack>
    </Tela>
  );
};

export default IdentificarPedido;
