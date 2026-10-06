import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ScrollView, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import {SessionManager} from '../../src/appplication/auth/session-manager';
import {HttpTransport} from '../../src/infra/auth/http-transport';
import {SecureSessionStorage} from '../../src/infra/auth/secure-session-storage';
import {TraceabilityWorkflow} from '../../src/appplication/traceability/workflow';
import {OfflineCoordinator} from '../../src/appplication/offline/coordinator';
import {SqliteCaptureStore} from '../../src/infra/offline/sqlite-store';
import {openCaptureDatabase} from '../../src/infra/offline/database';
import {
  OfflineProvider,
  useOffline,
} from '../../src/components/Offline/OfflineProvider';
import type {CaptureContext} from '../../src/domain/offline/types';
import type {Reading} from '../../src/domain/traceability/types';

type Fixture = {
  baseUrl: string;
  synthetic: true;
  users: {id: string; login: string; password: string; role: string}[];
  tags: {uid: string; reference: string | null}[];
};
const fixture = Constants.expoConfig?.extra?.offlineAcceptance as Fixture;
let loseNextResponse = false;
let lostResponses = 0;
const session = new SessionManager(
  new SecureSessionStorage(),
  new HttpTransport(async (...args) => {
    const response = await fetch(...args);
    if (
      loseNextResponse &&
      String(args[0]).endsWith('/eventos/lote') &&
      response.ok
    ) {
      loseNextResponse = false;
      lostResponses++;
      throw new Error('Synthetic interruption after server commit');
    }
    return response;
  }),
  true,
);
const workflow = new TraceabilityWorkflow(session);
const store = new SqliteCaptureStore(openCaptureDatabase);
const context = (): CaptureContext | null => {
  const state = session.getSnapshot();
  const current = state.session;
  if (!current || !['authenticated', 'offline'].includes(state.status))
    return null;
  return {
    baseUrl: current.baseUrl,
    userId: current.user.id,
    canCapture: current.user.perfil !== 'CONSULTA',
    canSend:
      state.status === 'authenticated' && current.user.perfil !== 'CONSULTA',
  };
};
const queue = new OfflineCoordinator(
  store,
  context,
  session,
  reading => workflow.resolveProvisioning(reading),
  () => Crypto.randomUUID(),
);
function Content() {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const offline = useOffline();
  const [message, setMessage] = useState('');
  useEffect(() => {
    void session.restore();
  }, []);
  const reading = (index: number): Reading => {
    const value: Reading = {
      uid: fixture.tags[index].uid,
      bytesBase64: '0QEDVQBh',
      tecnologias: ['IsoDep', 'NfcA'],
    };
    const reference = fixture.tags[index].reference;
    if (typeof reference === 'string') value.ndef = reference;
    return value;
  };
  async function action(work: () => Promise<unknown>) {
    setMessage('');
    try {
      await work();
      await queue.refresh();
      setMessage('OK');
    } catch (error) {
      setMessage((error as Error).stack ?? (error as Error).message);
    }
  }
  async function login(role: string) {
    const user = fixture.users.find(item => item.role === role)!;
    await session.login(fixture.baseUrl, user.login, user.password);
  }
  const buttons: [string, () => Promise<unknown>][] = [
    ['Verificar SQLite', () => store.initialize()],
    ['Entrar A', () => login('ADMINISTRADOR')],
    ['Entrar B', () => login('OPERADOR')],
    ['Disponibilizar UID', () => queue.remember(reading(0))],
    ['Disponibilizar NDEF', () => queue.remember(reading(1))],
    [
      'Capturar UID',
      () =>
        queue.capture(
          reading(0),
          'COLETA',
          Crypto.randomUUID(),
          new Date().toISOString(),
          'android-native-fixture',
        ),
    ],
    [
      'Capturar NDEF',
      () =>
        queue.capture(
          reading(1),
          'COLETA',
          Crypto.randomUUID(),
          new Date().toISOString(),
          'android-native-fixture',
        ),
    ],
    [
      'Capturar recebimento UID',
      () =>
        queue.capture(
          reading(0),
          'RECEBIMENTO',
          Crypto.randomUUID(),
          new Date().toISOString(),
          'android-native-fixture',
        ),
    ],
    [
      'Perder resposta',
      async () => {
        loseNextResponse = true;
        return queue.synchronize(true);
      },
    ],
    ['Sincronizar', () => queue.synchronize(true)],
    [
      'Sincronizar duas vezes',
      () => Promise.all([queue.synchronize(true), queue.synchronize(true)]),
    ],
    ['Restaurar sessão', () => session.restore()],
    ['Sair', () => session.logout()],
  ];
  return (
    <ScrollView style={styles.root}>
      <Text style={styles.heading}>ACEITE OFFLINE · ENTRADAS SINTÉTICAS</Text>
      <Text accessibilityLabel="native-status" style={styles.status}>
        {JSON.stringify({
          auth: state.status,
          login: state.session?.user.login,
          count: offline.items.length,
          states: offline.items.map(item => item.state),
          attempts: offline.items.map(item => item.attempts),
          errors: offline.items.map(item => ({
            code: item.errorCode,
            message: item.message,
          })),
          lostResponses,
          business: offline.items.map(item => item.businessState),
          types: offline.items.map(item => item.payload.tipo),
          uids: offline.items.map(item => item.payload.leituraBruta.uid),
          epochs: offline.items.map(item => item.metadata.provisioning.epoca),
          bytes: offline.items.map(
            item => item.payload.leituraBruta.bytesBase64,
          ),
          ids: offline.items.map(item => item.id),
          error: offline.error,
          message,
        })}
      </Text>
      {buttons.map(([label, work]) => (
        <TouchableOpacity
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={styles.button}
          onPress={() => {
            void action(work);
          }}>
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
export default function Harness() {
  return (
    <OfflineProvider manager={queue} session={session}>
      <Content />
    </OfflineProvider>
  );
}
const styles = StyleSheet.create({
  root: {padding: 20, backgroundColor: 'white'},
  heading: {fontSize: 17, fontWeight: '700', marginBottom: 12},
  status: {height: 200, fontSize: 10, lineHeight: 14},
  button: {
    minHeight: 48,
    padding: 12,
    marginVertical: 4,
    backgroundColor: '#3154d8',
    borderRadius: 8,
  },
  label: {color: 'white', fontSize: 17},
});
