import React from 'react';
import { Text } from 'react-native-paper';

import Tela from '../../../../components/Base/Tela';
import VStack from '../../../../components/Base/VStack';
import Input from '../../../../components/Base/Input';
import Botao from '../../../../components/Base/Botao';
import { useAppTheme } from '../../../../theme';

interface IIdentificarPedido {
  onIdentificarPedido: (codigoPedido: string) => void;
  codigoPedidoInicial?: string;
}

const IdentificarPedido = ({ onIdentificarPedido, codigoPedidoInicial }: IIdentificarPedido) => {
  const theme = useAppTheme();
  const [codigoPedido, setCodigoPedido] = React.useState(codigoPedidoInicial ?? '');

  const codigoInformado = codigoPedido.trim();

  return (
    <Tela>
      <VStack flex={1} gap={24}>
        <VStack gap={4}>
          <Text variant="titleLarge">Identificar o pedido</Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}>
            Informe o código do pedido que será vinculado à etiqueta.
          </Text>
        </VStack>

        <Input
          label="Código do pedido"
          value={codigoPedido}
          onChangeText={setCodigoPedido}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() =>
            codigoInformado && onIdentificarPedido(codigoInformado)
          }
        />

        <Botao
          onPress={() => onIdentificarPedido(codigoInformado)}
          disabled={!codigoInformado}>
          Continuar
        </Botao>
      </VStack>
    </Tela>
  );
};

export default IdentificarPedido;
