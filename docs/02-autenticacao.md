# Login e sessão do Nova-tag

Situação atual: software aprovado pelo mantenedor e publicado pela #3; integração
na main fica no PR. Personalização/aceite NFC é #12. Veja
[entregas e pendências](10-estado-do-projeto.md).

Implementação da [issue #3](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/3)
na versão Expo com NFC físico. O cliente usa a API autenticada e Expo SecureStore.
O guia anterior de React Native/Keychain pertence à branch histórica
`feat/issue-3-authentication`; os comandos de compilação daquela versão não se
aplicam ao aplicativo Expo atual. Pedidos, provisionamentos e histórico já usam
HTTP real nesta branch. NFC, proteção da etiqueta e SDM têm aceites separados.

## Executar

1. Na API, aplicar migrations e criar o primeiro administrador explicitamente,
   conforme [autenticação da API](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/feat/issue-3-authentication/docs/authentication.md).
   Não existe conta padrão nem cadastro público.
2. Copiar `.env.example` para `.env` e definir `EXPO_PUBLIC_API_URL`, terminando em
   `/api/v1`. Use o IP do computador no laboratório ou o HTTPS público do túnel.
   Essa variável é pública: nunca incluir login, senha ou token.
3. Instalar dependências com `npm ci` e iniciar `npm start -- --lan --port 8082 --scheme novatag`.
   Abrir pelo development build instalado, conforme o README.
4. Informar login e senha. O endereço vem do ambiente e pode ser editado em
   **Configuração de conexão**. Endereço ausente ou inválido abre esse campo;
   uma URL inválida não recebe credenciais.

Um token está associado ao servidor em que foi emitido. Mudar o endereço do Metro
ou a variável de ambiente não transfere uma sessão para outro servidor. Se o
servidor anterior estiver indisponível, usar **Sair desta sessão** e autenticar no
endereço atual. HTTP só é aceito pelo cliente em desenvolvimento; fora dele,
HTTPS é obrigatório.

## Armazenamento e recuperação

O token opaco, validade, endereço da API e identidade pública são guardados com
`expo-secure-store`. A senha permanece somente na tela durante a tentativa e é
apagada ao terminar. Não há senha ou token em AsyncStorage, variáveis públicas,
logs ou configurações versionadas. A prévia web mantém a sessão apenas em memória.

No Android, SecureStore usa dados cifrados com Android Keystore; no iOS, usa
Keychain. O plugin exclui seus dados dos backups Android. Reinstalar no iPhone
pode preservar os dados do Keychain: o token precisa de validação na API para
qualquer chamada HTTP. A #4 permite captura local com identidade previamente
verificada e ainda válida quando a API está inacessível. Essas propriedades seguem a
[documentação do SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

- Ao iniciar ou retornar de background, conferir a sessão na API. Falha de rede
  preserva os dados. Identidade previamente verificada e ainda válida libera
  coleta local com os vínculos em cache, mas bloqueia HTTP. Sem verificação anterior
  ou validade, exigir login. Veja [fila offline](11-captura-offline.md).
- A janela NFC do iOS alterna brevemente entre active/inactive. Isso não inicia
  outra sessão nem descarta a leitura. Verificar somente a expiração local.
- Durante a verificação de uma sessão já autenticada, preservar o trabalho sob
  uma camada opaca, sem toque nem acesso por acessibilidade.
- Expiração ou 401 exige novo login; 403 informa falta de permissão e mantém a
  sessão. O status continua sendo respeitado se um intermediário retornar HTML.
- Logout limpa apenas o armazenamento da sessão e tenta revogar o token na API.
  Sem conexão, informar que a revogação remota não foi confirmada.
- Se a remoção nativa falhar, informar o erro e impedir restauração automática
  durante essa execução do app. Não afirmar remoção persistente quando o sistema
  operacional não a confirmou. Um novo login explícito substitui a sessão salva.

## Perfis e isolamento

Administrador: pedidos, vínculos, operações e consultas. Operador: operações e
consultas. Consulta: somente consultas. Ocultar ações na interface ajuda o usuário;
a API continua sendo a autoridade de permissão.

`SessionManager` é uma classe TypeScript sem dependências de React, Expo ou NFC.
`src/infra/auth/runtime.ts` injeta HTTP e armazenamento seguro. Serviços usam:

```ts
const result = await sessionManager.request('/eventos', {
  method: 'POST',
  body: payloadOriginal,
  expectedUserId: operadorNoMomentoDaCaptura,
});
```

Trocar de operador impede o envio da captura anterior. Respostas atrasadas de
uma sessão antiga não encerram uma sessão nova nem apresentam dados de outro
operador. Comandos não têm retry automático. UUID, evidência e conteúdo original
devem permanecer iguais no reenvio. A fila offline (#4) usa SQLite separado;
autenticação não a apaga nem reatribui capturas. Uma nova sessão na mesma API
e com o operador original pode retomar o envio, preservando a entrada original.

## Verificação local

```powershell
npm run typecheck
npm run lint
npm test -- --runInBand
```

Os testes exercitam login, falha de credenciais, endereço inválido, restauração,
rede indisponível, expiração/revogação, troca de operador, resposta atrasada,
logout com falha de armazenamento e retorno da janela NFC. Os adaptadores nativos
são substituídos nos testes unitários; isso não comprova a integração nativa.

Para testar o cliente TypeScript contra uma API real, criar contas exclusivas de
teste dos três perfis e guardar um arquivo JSON fora do Git:

```json
{
  "baseUrl": "http://127.0.0.1:3110/api/v1",
  "users": [
    {"id": "UUID-ADMIN", "login": "aceite.admin", "password": "SENHA-DE-TESTE", "role": "ADMINISTRADOR"},
    {"id": "UUID-OPERADOR", "login": "aceite.operador", "password": "SENHA-DE-TESTE", "role": "OPERADOR"},
    {"id": "UUID-CONSULTA", "login": "aceite.consulta", "password": "SENHA-DE-TESTE", "role": "CONSULTA"}
  ]
}
```

Usar API e banco isolados dos dados do laboratório. O script só admite endereço
local e revoga as sessões das contas fornecidas. Não usar contas de trabalho.

```powershell
$env:AUTH_ACCEPTANCE_FILE = '.tmp/login-acceptance.json'
npm run test:auth:api
```

O script compila as classes reais do cliente e confere login, restauração, leitura,
403 sem logout, revogação 401 e logout remoto, sem substituir HTTP por mocks. O
armazenamento desse teste é em memória; o ensaio nativo abaixo verifica SecureStore.

Para compilar o Android atual no Windows, instalar JDK 17 e Android SDK, definir
`JAVA_HOME` e `ANDROID_HOME`, depois executar:

```powershell
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 -PreactNativeDevServerPort=8082
```

`x86_64` é para emulador; aparelhos usuais usam `arm64-v8a`. Os diretórios nativos
são gerados e ignorados pelo Git. Instalar o APK, abrir pelo Metro, entrar na API
real, encerrar/reabrir o processo e verificar restauração e logout. Conferir
também revogação no servidor e restrição dos três perfis. Um emulador valida login
e SecureStore, mas não comprova NFC físico.

GitHub Actions continua manual e desabilitado. Esta validação não depende de
execução remota nem inicia build EAS. Revisão e integração dos PRs são etapas
distintas da validação local; não fechar a issue enquanto faltarem seus critérios.

Resultado da verificação realizada: [aceite local de autenticação](05-aceite-autenticacao.md).
