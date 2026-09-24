# Sessão autenticada do Nova-tag

Entrega da [issue #3](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/3).
O login usa a API 1.1 da mesma entrega. A integração das telas operacionais NFC continua
na #2; os serviços de pedido/etiqueta existentes ainda são simulados.

## Usar

- Instalar as dependências com `npm ci`, compilar/reinstalar o Android após adicionar
  react-native-keychain (`npm run android`).
- Iniciar a API com migrations e administrador explícito conforme
  [autenticação da API](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/feat/issue-3-authentication/docs/authentication.md).
- Conectar o aparelho por USB e usar `adb reverse tcp:3000 tcp:3000`.
- Na tela de login, informar `http://127.0.0.1:3000/api/v1`, login e senha.
  No emulador sem reverse, usar `http://10.0.2.2:3000/api/v1`.
- HTTP é permitido somente no desenvolvimento. Para APK de distribuição usar HTTPS.
  A política Android de debug já permite cleartext; a configuração principal mantém
  o padrão seguro. Não colocar senha/token em configurações versionadas.

## Comportamento

A senha fica apenas no estado da tela durante o envio e é apagada depois da tentativa.
Token, validade, servidor e identidade pública ficam no Keychain/Keystore, com backup do
app desabilitado. O token nunca usa AsyncStorage. Logout limpa somente o serviço de
sessão. Ao restaurar, a identidade é conferida no servidor; falta de rede permite tentar
novamente sem apagar a sessão salva. Expiração/revogação pede novo login.

O administrador vê provisionamento e operações; operador vê operações; consulta não
vê ações de escrita. Essas opções são ergonomia: a autoridade de permissão é a API.

No logout offline, a tela informa que a remoção foi local e a revogação remota não foi
confirmada. O administrador pode revogar as sessões no servidor; a validade é absoluta,
sem refresh automático. Reautenticação não deve reatribuir capturas a outro operador.

## Integração com outros serviços

`src/infra/auth/runtime.ts` compõe o SessionManager. Serviços autenticados usam:

```ts
const result = await sessionManager.request('/eventos', {
  method: 'POST',
  body: payloadOriginal,
  expectedUserId: operadorNoMomentoDaCaptura,
});
```

A API não é chamada se o usuário atual for diferente. UUID e payload devem permanecer
iguais no retry. 401 invalida apenas a sessão que gerou aquela requisição; uma resposta
atrasada de sessão antiga não derruba um login novo. 403 mantém a sessão. Não há retry
automático de comandos. Nenhum módulo de autenticação recebe acesso à futura fila.

O domínio define tipos/portas; SessionManager é uma classe TypeScript sem React;
adaptadores implementam HTTP e Keychain; componentes exibem os estados da sessão.

## Validação

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- CI também compila APK Android de debug com o módulo nativo Keychain.

Os testes de UI verificam entrada, erro de credenciais, proteção da área autenticada e
saída. Os testes de sessão cobrem restauração, indisponibilidade, expiração, revogação,
falha de armazenamento, troca de operador e respostas concorrentes. Keychain é simulado
no Jest; seu vínculo nativo é verificado pela compilação Android. Verificação física de
NFC é a entrega #1/#2, não um resultado destes testes.
