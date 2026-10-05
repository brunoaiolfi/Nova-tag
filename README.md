# Nova-tag NFC — Expo Development Build

Aplicativo Expo com NFC físico e API NFC Trace. Branch `codex/expo-nfc-real`, no
worktree `C:\src\Nova-tag-expo`, dentro do mesmo repositório. O checkout original
em `C:\src\Nova-tag` permanece separado. Não foi feito merge na main.

## Instalar no iPhone usando Windows

É necessário instalar um **development build próprio**. Expo Go não contém o
módulo NFC. EAS compila na nuvem sem Mac local, mas a instalação no iPhone exige
assinatura ativa do **Apple Developer Program** e dispositivo registrado. Ter
apenas o aplicativo Apple Developer instalado não substitui a assinatura.

O projeto [joaoaugustopfpf/nova-tag-nfc](https://expo.dev/accounts/joaoaugustopfpf/projects/nova-tag-nfc)
está configurado. Nenhum build remoto é iniciado pelos scripts de desenvolvimento
ou pelo push. Execute a compilação quando quiser consumir um build EAS; ela segue
a cota/cobrança da conta Expo, independentemente do GitHub Actions.

```powershell
cd C:\src\Nova-tag-expo
npm ci
npx --yes eas-cli@24.10.0 device:create
npx --yes eas-cli@24.10.0 build --platform ios --profile development
```

Faça login Apple e responda ao segundo fator **no terminal**. Abra no iPhone o
link de registro gerado pelo primeiro comando. Selecione esse dispositivo durante
o build. Quando terminar, abra o link/QR de instalação no Safari. Ative o Modo de
Desenvolvedor quando solicitado. Veja o
[procedimento oficial](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

## Rodar no laboratório

```powershell
npm start -- --lan --port 8082 --scheme novatag
```

Abra o QR do Metro no **Nova-tag NFC instalado**, com iPhone e computador no mesmo
Wi-Fi. Esse QR abre o projeto; não instala o aplicativo. Use iOS 16.4 ou posterior
(Expo SDK 57). Inicie a API separadamente. Configure `.env` conforme `.env.example`,
usando o IP do computador e `/api/v1`, nunca localhost no iPhone. Permita rede
local no iPhone. Não coloque credenciais em variáveis `EXPO_PUBLIC_*`.

Após login, use **Testar leitura NFC sem alterar a etiqueta** na tela inicial para
conferir UID, NDEF e tecnologias, sem gravar ou cadastrar vínculo.

## Operações reais

- Login, sessão, expiração e logout com API e Expo SecureStore.
- Provisionamento de pedido existente por UID ou NDEF; modelo declarado.
- Registro antes da escrita; NDEF usa a URI opaca emitida pela API.
- Conferência do UID antes de escrever e releitura após a escrita.
- Ativação somente após confirmação explícita da configuração física.
- Capturas físicas e decisões logísticas da API, inclusive rejeições armazenadas.
- NDEF copiado identifica o vínculo pela referência; UID divergente é avaliado
  pelo servidor sem validação conjunta inventada pelo mobile.
- Reenvio na mesma tela mantém UUID, horário, leitura e operador originais.

Esta branch não simula operações. Expo Go e web informam que NFC está indisponível.
A prévia simulada permanece na branch anterior `feat/expo-go-iphone`.

## Limites

Esta versão **não altera chaves, configura SDM nem bloqueia a escrita**. A API
exige `bloqueioConfirmado`; a tela permite declarar isso somente após conferir
externamente a configuração e o bloqueio necessários ao ensaio. Não declare
bloqueio apenas porque a leitura/gravação funcionou. Sem confirmação, o vínculo
fica pendente. O modelo da tag e seu procedimento físico ainda precisam ser
validados. MIFARE Classic não é compatível com iPhone; tags protegidas ou sem NDEF
podem não permitir essas operações.

Capturas pendentes ficam em memória enquanto a tela estiver aberta; não há fila
offline persistente. Fechar/reiniciar perde a captura ainda não confirmada.
Offline, SDM e reconciliação continuam nas respectivas issues.

## Verificação local

```powershell
npm run check
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform all
```

32 testes cobrem autenticação, NFC com adaptador nativo substituído por mock,
decodificação URI/texto, gravação/releitura, divergência, retomada, reenvio e rejeição.
O contrato UID/NDEF também foi exercitado contra API/PostgreSQL locais com fixtures
sintéticas. Plugin e schema Codegen foram verificados. Isso **não confirma build
iOS nem leitura física**.

`react-native-nfc-manager@4.0.0-beta.10` suporta a nova arquitetura segundo o
mantenedor, mas é beta. Expo Doctor mantém aviso de metadados da React Native
Directory (20/21 verificações). Não foi ocultado esse aviso.

GitHub Actions continua manual e desabilitado remotamente. Veja
[decisões e aceite físico](docs/04-expo-nfc-real.md).
