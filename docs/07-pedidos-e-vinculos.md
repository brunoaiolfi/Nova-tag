# Pedidos e ciclo de vínculos — preparação da issue #2

**Registro histórico de implementação.** O mantenedor aprovou o software #1/#2/#3 para publicação. Personalização administrativa, proteção, recuperação e aceite físico pendentes estão na [issue #12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12); integração na main permanece nos PRs. Estados de issue/branch desta etapa são históricos. Veja [situação atual](10-estado-do-projeto.md).

Implementação local em `codex/issue-2-order-provisioning-management`, no worktree
Expo do Nova-tag e na API. Sem push, merge, GitHub Actions ou build EAS. As branches
contêm as referências de main consultadas em 6 de outubro de 2026; nenhuma main foi
alterada. As dependências de #2 continuam abertas: #1 hardware e #3 revisão/integração
da autenticação. Este trabalho de software não conclui a issue nem libera #4.

## Usar no aplicativo

Somente o perfil Administrador cadastra pedidos e encerra vínculos. Operador e
Consulta continuam consultando pedidos/históricos conforme suas permissões.

1. **Vincular → Escolher pedido → Novo pedido**: informar código único e descrição
   opcional. O código é normalizado para maiúsculas; UUID e estado vêm da API.
2. **Cadastrar pedido → Usar este pedido**: o resultado permanece visível antes
   da seleção. Depois, ler e conferir a etiqueta para salvar/ativar o vínculo.
3. **Rastreio → escolher pedido → Sobre a etiqueta deste pedido → Gerenciar este
   vínculo**: abrir o vínculo vigente (`REGISTRADA` ou `ATIVA`) retornado pela API.
   Alternativamente, **Vincular → Gerenciar etiqueta** consulta pelo UID físico.
4. **Encerrar vínculo**: conferir pedido, UID, época e situação. Marcar a confirmação
   e usar **Confirmar encerramento**. Falha de rede mantém o resultado em aberto,
   permitindo nova consulta ou tentativa; a tela só informa encerramento confirmado.
5. **Vincular a outro pedido**: uma nova etapa preserva modelo/UID da etiqueta e
   exige uma nova leitura. Selecionar um pedido Cadastrado; a API gera UUID/época.
   O pedido anterior conserva seu estado e suas capturas. Na ativação, **Concluir
   reutilização** retorna ao início do fluxo sem reaproveitar a seleção anterior.

O encerramento não conclui entrega, apaga histórico ou remove fisicamente NDEF.
NDEF estático exige regravar e reler a referência da nova época. Para uso por UID,
uma referência antiga `urn:nfc-trace:provisioning:...` precisa ser removida com a
ferramenta externa de configuração e a etiqueta relida antes de ativar. O aplicativo
não altera chaves, bloqueia escrita nem configura SDM.

O diagnóstico identifica a tecnologia/modelo quando possível; não assumir que uma
Feiju é NTAG 424 DNA. Procedimento e limites em [hardware NFC](06-hardware-nfc.md).

## Contratos e recuperação

- Busca por código **ou descrição**, sem distinção de caixa, literal e paginada.
- `GET /pedidos/{id}` inclui `provisionamentoVigente`, ou `null` após encerramento.
  O cliente aceita ausência desse campo em versões anteriores; o acesso administrativo
  pela leitura continua disponível. A consulta por tag preserva sua época exata,
  mesmo que o pedido apresente um vínculo mais recente.
- Perda de resposta do cadastro: consultar código exato e descrição normalizada.
  A mensagem explica que o pedido foi localizado, sem alegar autoria de cadastro.
  Conflitos `409` não são convertidos em sucesso; os dados digitados são preservados.
- Encerramento: postar e recuperar pelo UUID **exato** do provisionamento. Consultar
  o último vínculo pelo UID para recuperar esse comando poderia atingir uma nova época.
- Bloqueios de perfil são verificados tanto na tela quanto pela API. Comandos de
  cadastro/encerramento ficam vinculados ao usuário da sessão iniciadora.
- Nenhum dado de leitura é gerado pelo produto. Capturas e diagnósticos usam o
  módulo NFC nativo do development build; web e Expo Go não simulam o hardware.

## Validação local

```powershell
cd C:\src\Nova-tag-expo
npm test -- --runInBand
npm run typecheck
npm run lint

cd C:\src\nfc-trace-api
npm run test:all
npm run lint
npm run typecheck
npm run build
npm run openapi
```

O aceite de contrato usa o **cliente real**, sessão HTTP e PostgreSQL de uma API
isolada na porta 3110. Criar três contas de teste (Administrador, Operador, Consulta)
conforme o procedimento de bootstrap da API e salvá-las em arquivo ignorado:

```json
{
  "baseUrl": "http://127.0.0.1:3110/api/v1",
  "users": [
    {"id": "UUID", "login": "LOGIN", "password": "SENHA", "role": "ADMINISTRADOR"},
    {"id": "UUID", "login": "LOGIN", "password": "SENHA", "role": "OPERADOR"},
    {"id": "UUID", "login": "LOGIN", "password": "SENHA", "role": "CONSULTA"}
  ]
}
```

```powershell
cd C:\src\Nova-tag-expo
$env:AUTH_ACCEPTANCE_FILE='C:\caminho\ignorado\contas-de-teste.json'
npm run test:orders:api
```

O script recusa a API de laboratório na porta 3000 e endereços remotos. A API 3110
deve usar um banco **exclusivo de testes**: o script cria pedidos/etiquetas/capturas.
As contas nunca devem ser versionadas. Leituras e confirmação de configuração são
fixtures explícitas `FIXTURE_SEM_HARDWARE`; não contam como aceite físico. A perda
de resposta é injetada depois do commit HTTP real, somente no harness de teste.

Cobertura: cadastro e normalização, duplicidade, busca literal/paginação, seleção
explícita na tela, resposta perdida, ativação repetida, encerramento sem alteração
logística, nova época UID/NDEF, retry do vínculo antigo sem afetar o novo, rejeição
de captura antiga preservada, permissões, confirmação de encerramento, ausência
de dupla submissão, descarte de consultas antigas e releitura do UID esperado.

Resultado local em 6 de outubro de 2026: 123 testes mobile em 19 suítes e 68 testes
da API em 6 suítes, incluindo PostgreSQL/Supertest; lint, tipos e build/contrato
OpenAPI passaram. O cliente de contrato confirmou as operações com HTTP/PostgreSQL
reais e perda de resposta após commit. As telas foram exercitadas em 390×844 e
320×568, com login/cadastro/encerramento reais no banco isolado, sem erros JS ou
overflow horizontal. O bundle iOS foi exportado localmente; nenhum build EAS foi
iniciado. Esses testes não equivalem a leitura de uma tag física.

Continuam pendentes o aceite físico completo Android/iPhone com etiquetas reais,
validação física dos bytes operacionais Type 4, proteção e SDM da #1, revisão do colega
e integração das branches. Offline/reconciliação não fazem parte desta entrega.
