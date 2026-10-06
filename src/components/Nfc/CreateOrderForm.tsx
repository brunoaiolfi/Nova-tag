import React, {useEffect, useRef, useState} from 'react';
import {HelperText, Text, TextInput} from 'react-native-paper';
import Tela from '../Base/Tela';
import VStack from '../Base/VStack';
import {ActionButton, PageHero, StatusPanel} from '../Tracking';
import {useSession} from '../Auth/SessionProvider';
import {traceability} from '../../infra/traceability/runtime';
import type {OrderSummary} from '../../appplication/traceability/workflow';

export default function CreateOrderForm({
  onCreated,
  onCancel,
}: {
  onCreated(order: OrderSummary): void;
  onCancel(): void;
}) {
  const {state} = useSession();
  const canCreate =
    state.status === 'authenticated' &&
    state.session.user.perfil === 'ADMINISTRADOR';
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    order: OrderSummary;
    recovered: boolean;
  }>();
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit() {
    if (running.current || !canCreate || !state.session) {
      return;
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await traceability.createOrder(
        {codigo: code, descricao: description},
        state.session.user.id,
      );
      if (mounted.current) {
        setResult(saved);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(
          (failure as {code?: string})?.code === 'CODIGO_PEDIDO_DUPLICADO'
            ? 'Esse código já existe. Volte à lista para selecionar o pedido ou informe outro código.'
            : failure instanceof Error
            ? failure.message
            : 'Não foi possível cadastrar o pedido. Confira a conexão e tente novamente.',
        );
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  return (
    <Tela
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          icon="package-variant-closed-plus"
          eyebrow="NOVO PEDIDO"
          title={
            result ? 'Pedido pronto para vincular.' : 'Comece pelo pedido.'
          }
          description="Cadastre o volume que você vai rastrear. Depois, escolha e leia sua etiqueta."
        />
      }
      footer={
        result ? (
          <ActionButton
            mode="contained"
            disabled={!canCreate}
            onPress={() => onCreated(result.order)}>
            Usar este pedido
          </ActionButton>
        ) : (
          <ActionButton
            mode="contained"
            disabled={busy || !canCreate || !code.trim()}
            loading={busy}
            onPress={() => {
              void submit();
            }}>
            Cadastrar pedido
          </ActionButton>
        )
      }>
      <VStack gap={16}>
        {!canCreate && (
          <Text variant="bodyMedium" accessibilityRole="alert">
            Somente um Administrador pode cadastrar pedidos.
          </Text>
        )}
        {result ? (
          <StatusPanel tone="success">
            <Text variant="titleLarge">{result.order.codigo}</Text>
            {!!result.order.descricao && (
              <Text variant="bodyMedium">{result.order.descricao}</Text>
            )}
            <Text variant="bodyMedium">
              {result.recovered
                ? 'A resposta do cadastro não chegou, mas encontramos esse código e descrição no servidor. O pedido está disponível para seleção.'
                : 'Pedido cadastrado no servidor. A etiqueta será vinculada na próxima etapa.'}
            </Text>
          </StatusPanel>
        ) : (
          <>
            <TextInput
              mode="outlined"
              label="Código do pedido"
              placeholder="Ex.: TCC-001"
              value={code}
              onChangeText={setCode}
              maxLength={64}
              autoCapitalize="characters"
              autoCorrect={false}
              disabled={busy || !canCreate}
            />
            <HelperText type="info">
              Use um código único com letras sem acentos, números, ponto, traço
              ou sublinhado.
            </HelperText>
            <TextInput
              mode="outlined"
              label="Descrição (opcional)"
              placeholder="Ex.: Caixa de materiais do laboratório"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              disabled={busy || !canCreate}
            />
            <Text variant="bodySmall">
              {description.length}/500 caracteres. Um pedido representa um
              volume.
            </Text>
          </>
        )}
        {!!error && (
          <StatusPanel tone="warning">
            <Text variant="bodyMedium" accessibilityRole="alert">
              {error}
            </Text>
          </StatusPanel>
        )}
        <ActionButton mode="outlined" disabled={busy} onPress={onCancel}>
          {result ? 'Voltar à lista' : 'Cancelar cadastro'}
        </ActionButton>
      </VStack>
    </Tela>
  );
}
