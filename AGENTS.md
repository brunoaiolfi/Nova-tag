# Nova-Tag: regras para alterações de código

- Antes de alterar responsabilidades, leia `docs/architecture-checks.md` e a política em `scripts/architecture/check.cjs`.
- Depois de alterar código/configuração, execute `npm run verify` e corrija as falhas antes de concluir. Não declare aprovação de hardware com base em Jest.
- Domínio depende de domínio. Aplicação depende de domínio e portas de aplicação. Rede, SQLite, armazenamento seguro e SDK NFC ficam em adaptadores de infraestrutura; composição conecta os objetos.
- Não introduza dependências novas de telas/componentes para adaptadores concretos, imports de telas em UI compartilhada ou ciclos de execução. Imports apenas de tipos continuam sujeitos às fronteiras.
- Não acrescente/regenere exceções para fazer checks passarem. As exceções atuais descrevem dívida anterior; ao remover a dependência, remova sua entrada. Mudança da política exige justificativa arquitetural explícita, consequências e cobertura dos casos válidos/inválidos.
- Não desative os checks críticos, não use `any` explícito, `@ts-ignore`, `@ts-nocheck` ou `@ts-expect-error` em produção para esconder falhas. Corrija o contrato ou valide dados externos como `unknown`.
- Preserve UUID/evidência/escopo e recibo original nos retries; intenção administrativa precede APDU, resposta persistida precede envio HTTP. Não implemente retry genérico de escrita física.
- Preserve alterações locais de outras tarefas. Não misture reorganização ampla com a mudança funcional solicitada.
- No Nova-tag Expo, as 31 exceções iniciais foram eliminadas. Mantenha `scripts/architecture/exceptions.json` vazio; corrija a dependência em vez de cadastrar uma nova exceção.
- Arquivos `types.ts`/`*.types.ts` são declarativos. Mantenha modelos, portas, decoders, políticas e adaptadores nos módulos responsáveis; não reintroduza barrels genéricos para esconder essa separação.
- Prefira nomes que revelem o conceito e a unidade: `operationContext`, `rfSession`, `requestGeneration`, `timeoutMilliseconds`. Não use nomes opacos de uma letra para dados de negócio, nem nomes genéricos como `choice`/`changes` para estados sem contexto. Preserve nomes definidos por contratos externos. Contadores de índice e parâmetros de tipo seguem as exceções explícitas do lint.
- Agrupe transições relacionadas em reducers puros, derive valores redundantes e mantenha comandos de usuário nos handlers. Efeitos de foco/AppState/assinaturas devem ter descarte; não esconda setters em timers/promessas para contornar regras de hooks.
