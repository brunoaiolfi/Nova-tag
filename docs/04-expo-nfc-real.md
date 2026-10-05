# Expo com NFC físico

## Decisão e fronteiras

Mesmo repositório, worktree `C:\src\Nova-tag-expo` e branch `codex/expo-nfc-real`,
sem merge na main. Expo 57 e React Native 0.86.3 usam a nova arquitetura.
`react-native-nfc-manager@4.0.0-beta.10` fica fixado no lockfile: o
[mantenedor](https://github.com/revtel/react-native-nfc-manager) documenta v3 para
arquitetura antiga e v4 para a nova. A versão beta precisa de build e ensaio físico.

`appplication/traceability/workflow.ts` é TypeScript puro com porta HTTP específica.
Não importa React, Expo ou NFC. `infra/nfc/reader.ts` concentra sessões e NDEF.
`infra/traceability` compõe o fluxo com sessão autenticada e identifica a instalação
por UUID aleatório guardado em SecureStore. Os serviços de sucesso fictício foram
removidos. Identificador da instalação não prova identidade: autoria vem da API.

## Fluxos

1. Informar pedido existente/modelo e ler a tag sem escrever.
2. Consultar código exato normalizado, com paginação. Não criar pedido silenciosamente.
3. Registrar vínculo ou retomar exatamente o pendente. Após perda de resposta,
   recuperar somente o vínculo do mesmo pedido/estratégia. Reutilização incompatível
   exige encerramento explícito pela API.
4. NDEF: ação explícita de gravação substitui conteúdo atual. Conferir UID, gravar
   URI opaca do servidor e reler. Nunca gravar código do pedido como referência.
5. UID: usar leitura inicial. NDEF: exigir referência correspondente na releitura.
6. Confirmar externamente configuração/bloqueio e ativar idempotentemente. Falha
   física preserva REGISTRADA. Não chamar `makeReadOnly` nem alterar chaves sem
   identificar modelo/procedimento da issue #1. Não inventar bloqueio.

Referência NFC Trace consulta o vínculo pelo UUID do NDEF, mesmo com UID diferente.
Referência malformada não tenta UID. Sem referência NFC Trace, cadastro pelo UID
identifica o vínculo e servidor aplica sua estratégia, podendo rejeitar o NDEF.
Armazenamento e autorização são apresentados separadamente.

UUID/horário são criados na leitura física. Retry mantém corpo exato e operador
original na tela. Não há fila offline, persistência de captura pendente ou retomada
após reinício; isso não encerra a issue de sincronização offline.

## iOS/EAS

Bundle `com.joaoaugustopf.novatag.nfc`, esquema `novatag`, entitlement `TAG`,
permissão NFC e AID NDEF `D2760000850101`. Plugin foi verificado por introspecção.
Schema Codegen passou com React Native instalado. Windows não gera/compila o
projeto iOS local; EAS executará prebuild. Swift/linkediOS ainda não foram validados.
Diretórios nativos gerados ficam ignorados.

`NSAllowsArbitraryLoads` permite HTTP do laboratório. Só há perfil EAS de
desenvolvimento; produção precisará HTTPS e remover essa permissão ampla.

Projeto: https://expo.dev/accounts/joaoaugustopfpf/projects/nova-tag-nfc
ID: 73b4f68c-39fb-4a91-84de-f01ac5280de1.
Registro do dispositivo, certificados e perfil Apple exigem o titular, assinatura
Apple Developer Program ativa e segundo fator no terminal. Credenciais não entram
no Git. Nenhum build foi iniciado automaticamente. Procedimento no README.

## Aceite pendente no iPhone

- Instalar build assinado e conectar Metro/API pelo Wi-Fi do laboratório.
- Conferir UID/NDEF pelo botão de diagnóstico, sem alterar a tag.
- Registrar vínculo, gravar referência e validar releitura física.
- Verificar configuração/bloqueio conforme modelo, ativar e exercitar os eventos.
- Validar cancelamento, fora de alcance, capacidade, escrita protegida e retomada
  de vínculo pendente.

Jest usa mock nativo; fixtures HTTP usam dados sintéticos e não acessam hardware.
Essas verificações não encerram automaticamente as issues #1/#2. Expo Doctor
mantém aviso da Directory para a biblioteca; não foi suprimido. Avisos anteriores
de dependências do ferramental também permanecem, sem atualização incompatível
com SDK para ocultá-los.
