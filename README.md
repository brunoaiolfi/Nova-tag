# Nova-tag — prévia Expo Go

Prévia do mesmo aplicativo para testar no iPhone via Expo Go. Desenvolvida na branch
`feat/expo-go-iphone`, em um worktree separado do mesmo repositório. O checkout nativo
permanece disponível em `C:\src\Nova-tag`.

## Iniciar

```sh
npm ci
npm start -- --lan --port 8082
```

Atualize o Expo Go na App Store. Com iPhone e computador no mesmo Wi-Fi, escaneie o QR
do Expo com a câmera do iPhone e abra no Expo Go. Esta branch usa Expo SDK 57,
React Native 0.86 e React 19.2; o SDK exige iOS 16.4 ou posterior.

A API deve estar iniciada separadamente. O endereço sugerido usa o host LAN do Metro,
na porta 3000, ou `EXPO_PUBLIC_API_URL` em `.env`. Não use localhost no iPhone.
Faça login com uma conta do laboratório. Nunca coloque senhas/tokens em variáveis
`EXPO_PUBLIC_*`, que ficam visíveis no bundle.

## O que pode ser testado

- Login, sessão, expiração e logout contra a API real.
- Navegação e permissões por perfil.
- Telas de provisionamento e eventos usando UID/NDEF fictícios.
- Fluxos de sucesso e falha de captura simulada.

O Expo Go não lê, grava nem bloqueia etiquetas NFC. Os serviços de provisionamento e
eventos continuam simulados e não persistem essas operações na API. O aplicativo
identifica essa condição na tela e nas mensagens. A integração operacional real é
uma entrega separada; o objetivo desta branch é testar interface e autenticação.

No iPhone, o token usa Expo SecureStore, sem persistir senha. A prévia web guarda
sessão somente em memória; recarregar a página exige novo login.

## Verificar localmente

```sh
npm run check
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform all
```

GitHub Actions continua somente manual; esta prévia não usa EAS Build, certificados
Apple ou builds remotos. Veja [detalhes da migração](docs/03-expo-go.md).
