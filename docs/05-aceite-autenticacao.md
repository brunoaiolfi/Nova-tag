# Aceite local da autenticação — 5 de outubro de 2026

Validação da implementação Expo da issue #3, sem publicação, alteração da main,
GitHub Actions ou nova compilação EAS. As alterações desta revisão permanecem no
diretório de trabalho, sobre a branch `codex/nfc-onboarding`.

## Bases e ambiente

- Mobile: base `b237ef3`, contendo a main remota `e085cbc` por meio do merge
  `c78fe15`. API: branch `feat/issue-3-authentication`, base `b745331`, contendo
  a main remota `2c4d14b`. Fetch e verificação de ancestralidade realizados.
- Node 24.18.0, Expo 57.0.26, React Native 0.86.3, SecureStore 57.0.4.
- Build Android local: JDK 17, Gradle 9.3.1, APK debug x86_64, emulador Android 16
  / API 36. Autolinking inclui `expo.modules.securestore.SecureStoreModule`.
- PostgreSQL 18 real. A suíte da API usa `nfc_trace_test`; o aceite do cliente e do
  emulador usa `nfc_trace_login_acceptance_test`, API separada na porta 3110 e
  contas temporárias dos três perfis. Não foram usados dados ou contas do laboratório.

## Resultados

| Verificação | Resultado |
| --- | --- |
| API: 66 testes em 6 suítes, com PostgreSQL real | Passou |
| API: lint, 8 fronteiras arquiteturais, tipos, formatação e build | Passou |
| Mobile: 67 testes em 13 suítes, tipos e lint | Passou |
| Cliente SessionManager/HttpTransport real contra API, três perfis, 403, revogação e logout | Passou |
| APK Android com SecureStore e módulos nativos | Build local concluído |
| Credenciais incorretas no emulador | Mensagem correta, sem área protegida |
| Login nativo como administrador | Ações operacionais e administrativas disponíveis |
| Encerrar processo e reabrir | Sessão restaurada do SecureStore e verificada na API |
| Armazenamento privado do app | Entrada da sessão presente; token e senha ausentes em texto puro |
| Indisponibilidade da API ao retornar do background | Camada opaca, ações bloqueadas e conteúdo protegido fora da árvore de acessibilidade |
| Recuperar conexão e tentar novamente | Sessão recuperada sem informar a senha outra vez |
| Logout e novo reinício | Sessão removida do SecureStore; permanece na tela de login |
| Login nativo como operador | Registrar disponível; provisionamento ausente |
| Login nativo como consulta | Rastreio disponível; ações de escrita ausentes |
| Revogar a conta Consulta pela API | Novo login exigido; sessão removida do SecureStore |
| Consulta final das sessões das contas de aceite | Nenhuma sessão ativa |

A árvore de acessibilidade foi conferida com `uiautomator dump --compressed`;
o dump completo inclui views não importantes para acessibilidade e, por isso,
não representa sozinho o conteúdo disponível a um leitor de tela.

## Repetir

Seguir [login e sessão](02-autenticacao.md) para preparar uma API e contas isoladas,
executar `npm run test:auth:api`, gerar/instalar o APK e iniciar o Metro. No emulador,
`adb reverse tcp:8082 tcp:8082` e `adb reverse tcp:3110 tcp:3110` conectam os serviços.

1. Informar a API de teste e tentar uma senha incorreta; conferir erro e campo de
   senha limpo. Entrar com a senha correta.
2. Conferir as ações do administrador; encerrar o processo com `adb shell am
   force-stop com.joaoaugustopf.novatag.nfc`, abrir novamente e conferir restauração.
3. Colocar o app em background, remover somente o reverse da API de teste e
   retornar. Conferir bloqueio e opção de recuperação. Restabelecer o reverse e
   tentar novamente; não deve pedir outra senha.
4. Sair, reabrir e conferir que continua no login. Repetir com Operador e Consulta
   e conferir que a interface respeita os perfis.
5. Revogar a conta de teste pelo endpoint administrativo, retornar ao app e
   conferir novo login. Confirmar revogação no banco/API e ausência da sessão local.

Credenciais, tokens, dumps e arquivos do emulador ficam fora do Git. A API do
laboratório e o Metro/ngrok utilizados pelo iPhone são serviços separados do
aceite. O emulador e a API de aceite podem ser encerrados após a verificação.

## Encerramento da issue

As pendências técnicas de login, compilação Android e vínculo do armazenamento
seguro foram verificadas na versão Expo. O mantenedor aprovou a publicação e o
encerramento da entrega de software #3 em 6 de outubro de 2026. Os PRs consolidados
substituem a revisão antiga Keychain; integração na main e aceite da versão final
continuam separados na #9. Não se afirma revisão independente do colega. Veja
[estado atual](10-estado-do-projeto.md).

Este aceite usa um emulador Android; não é teste de NFC físico nem substitui os
ensaios com etiquetas das issues #1/#2 ou a implementação SDM #5.
