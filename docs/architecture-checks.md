# Verificações automáticas de arquitetura

Esta política transforma fronteiras do diagnóstico em checks executáveis. O objetivo é impedir regressões estruturais e preservar garantias específicas; uma suíte verde não prova ausência de bugs nem torna toda decisão arquitetural automaticamente correta.

O referencial é a avaliação de componentes, granularidade, trade-offs e governança do [*Fundamentals of Software Architecture*, 2ª edição, capítulos 3, 6 e 8](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/). A direção escolhida para o núcleo é a de [Ports and Adapters](https://alistair.cockburn.us/hexagonal-architecture). As regras concretas são decisões locais do Nova-Tag, não uma árvore de pastas imposta pelos livros.

## Comandos

```sh
npm run architecture:check
npm run test:architecture
npm run lint
npm run typecheck
npm test -- --runInBand
npm run verify
```

- `architecture:check`: inspeciona todos os arquivos JS/TS em `src`, incluindo arquivos novos e variantes de plataforma. Usa a AST e resolução de módulos do TypeScript, não regex de linhas de import.
- `test:architecture`: testa o próprio verificador com código inválido e válido, exercita a configuração real do ESLint e verifica a árvore atual.
- `lint`: executa as fronteiras e ESLint, com zero warnings e erro para diretivas de supressão não utilizadas.
- `test`: executa lint (incluindo fronteiras e inventário Git) e testes de arquitetura antes do Jest; uma falha interrompe o comando.
- `verify`: executa lint, tipos e testes em sequência. É o comando de conclusão de uma mudança de código.

`architecture:check` cuida da estrutura; as restrições de globals/`any` pertencem ao ESLint. Por isso, executar somente o primeiro não substitui `lint`/`verify`.

## Fronteiras verificadas

| Código | Política |
| --- | --- |
| ARCH001 | `domain` importa somente domínio; React, SDKs e contratos externos não entram nem como tipos |
| ARCH002 | `appplication`/`application` importam domínio e aplicação; tecnologias concretas ficam em adaptadores |
| ARCH003 | Infraestrutura não importa componentes, telas, navegação, tema ou composição |
| ARCH004 | `components/Base`, `components/ui` e tema não dependem de implementações de funcionalidades |
| ARCH005 | Componentes não importam telas ou helpers alojados nelas |
| ARCH006 | Telas/componentes/navegação não importam adaptadores concretos nem composição |
| ARCH007 | Apresentação usa uma lista explícita de bibliotecas visuais; SDKs de NFC, rede e storage ficam fora |
| ARCH008 | `import()`/`require()` devem ser transparentes e literais; aliases de loader e `module.require` são rejeitados |
| ARCH009 | Import local precisa resolver e permanecer nas fronteiras de `src`; scripts externos não podem servir de atalho |
| ARCH010 | Novo diretório/camada de produção precisa de classificação explícita na política |
| ARCH011 | Supressões dos checks críticos e `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` em produção falham |
| ARCH012 | Dependências de execução, incluindo carregamentos lazy, não podem formar ciclos |
| ARCH013 | Tela não importa implementação de outra funcionalidade; compartilhe contrato ou formatter |
| ARCH014 | O inventário de exceções não pode crescer em relação à base Git |
| ARCH015 | `types.ts`/`*.types.ts` são declarativos; sem execução, classes, enums de runtime ou reexports de valores |

Os checks incluem `import`, `import type`, reexport, `export *`, `import = require`, `typeof import`, carregamento dinâmico e aliases declarados no `tsconfig`. Dependências de tipo também obedecem às fronteiras, mas não geram falsos ciclos de execução: o grafo é obtido após a remoção de tipos pelo TypeScript. Ciclo em um grafo lazy é uma dependência potencial de execução, não prova de falha durante inicialização; esta política opta por proibi-lo explicitamente.

A composição pode conectar camadas em `src/bootstrap` e na entrada `src/App.tsx`. `SessionGate.tsx` é classificado como composição por selecionar a tela de login. Um nome `runtime` em qualquer outra pasta não cria uma exceção automática. Não basta mover código de negócio para bootstrap para considerá-lo bem desenhado: a responsabilidade semântica continua exigindo revisão.

Assets estáticos em `assets` são permitidos na apresentação. Caminhos externos de código, imports não resolvidos, arquivos em camadas desconhecidas e symlinks em `src` são rejeitados. Aliases definidos só no Babel/Metro, sem correspondência no TypeScript, não são um mecanismo suportado para contornar as fronteiras.

No ESLint, domínio, aplicação e apresentação não podem acessar diretamente `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage` ou `indexedDB`, inclusive via `globalThis`/`window`/`self`/`global`. Referências a esses objetos globais também são restringidas para impedir aliases que escondam I/O. O check não rejeita uma porta injetada por ter métodos de rede; o que importa é evitar o global concreto. `any` explícito é erro em todo o TypeScript de produção. Dados externos devem começar como `unknown`, com validação e conversão adequadas. Eval e construção dinâmica de funções são proibidos fora dos adaptadores/composição pela política adicional de ESLint.

## Inventário e eliminação das dívidas

O projeto já possuía dependências que não atendem à matriz proposta. Para adicionar proteção sem misturar uma refatoração funcional com as mudanças locais em andamento, elas foram registradas em `scripts/architecture/exceptions.json`:

- Checkout Expo: **31 declarações no inventário inicial → zero atualmente**. As dependências foram corrigidas por composição explícita, portas de NFC/conectividade e extração dos componentes/formatters compartilhados; `exceptions.json` permanece vazio.
- Checkout original: **8 declarações** existentes, incluindo contratos/construção de serviços em infraestrutura e NFC no componente visual.

O inventário é específico de cada branch. O original não foi refatorado nesta etapa. No Expo, novos testes exigem que a lista continue vazia, inclusive durante a introdução inicial da política na base Git.

A composição atual está em `src/bootstrap/create-app-services.ts`. Ela cria uma sessão por grafo e conecta à mesma sessão rastreabilidade, captura, ensaio e administração. `App` mantém esse grafo durante sua montagem. `AppServicesProvider` exige serviços explícitos; não contém fallback global, registro mutável ou import de infraestrutura. Os providers de sessão/fila recebem suas dependências por props. As quatro antigas árvores singleton de `infra/*/runtime.ts` foram removidas.

NFC e conectividade têm contratos em `appplication/ports/app-services.ts`. O SDK de rede fica em `infra/network/connectivity.ts`; leitura, diagnóstico e administração continuam compartilhando a exclusividade física existente do adaptador NFC. A política de capacidades e o escopo administrativo ficam em `appplication/auth/operation-context.ts`, com relógio/identidade injetados. O commit da captura e do estágio experimental continua no mesmo store/transação.

O botão genérico está em `components/ui/ActionButton.tsx`, sem dependência de rastreabilidade. Labels e status da captura ficam em módulos de apresentação de `components/Tracking`; telas não fornecem mais esses helpers. Tipos, apresentação e serviço de toast foram reunidos em `components/Base/Toast`, pois representam um recurso visual. O contrato/serialização do relatório físico está na aplicação, enquanto o adaptador apenas consulta o hardware e monta a evidência.

Cada entrada contém código da regra, origem, destino, declaração normalizada pela AST e justificativa. Não há wildcard nem comando de atualização automática. Uma entrada cobre **uma única ocorrência**; adicionar símbolo à declaração, transferi-la de arquivo ou duplicá-la falha. Reformatar espaços/comentários sem alterar a AST não gera falsa regressão. Remover um import deixa uma exceção obsoleta, que também falha até sua remoção do inventário. Exceções vazias/duplicadas e exceções para ocultação de loader, supressão ou ciclo não são aceitas.

Além da comparação com os imports atuais, `check-exceptions.cjs` compara as entradas com `HEAD` localmente e com `ARCHITECTURE_BASE` na CI. Uma entrada nova ou expandida falha mesmo com justificativa. Na introdução inicial, a base ainda não possui inventário: o comando informa explicitamente essa condição e o inventário precisa ser revisado no primeiro PR. Depois de integrado, a lista só pode encolher. O workflow usa o SHA da base do PR, e não o HEAD alterado pelo agente.

Uma decisão futura pode mudar a política, mas precisa explicar requisito, alternativas, consequência negativa e testes atualizados. Acrescentar uma exceção apenas para obter resultado verde não é correção arquitetural. Arquivos de política e testes também precisam de revisão: nenhum mecanismo dentro do repositório impede alguém com permissão de editar o próprio mecanismo.

## Testes de comportamento continuam necessários

Os testes existentes de sessão, fila SQLite e administração continuam fazendo parte de `verify`. Eles protegem garantias que um grafo de imports não detecta: captura antes do envio, UUID estável, identidade/API original, recibo preservado, retomada de lease e intenção/resposta administrativa duráveis.

Após a separação de contratos e apresentação, o ESLint também exige as regras de refs, pureza, imutabilidade, setters em efeitos/renderização e componentes estáticos. Supressões de regras de hooks ou de `id-length` falham no analisador. Identificadores locais exigem pelo menos dois caracteres, com exceções `i`, `j`, `T`, `E` e `_`; propriedades externas não são renomeadas por essa regra. Essas proteções não proíbem regras condicionais no domínio ou estados locais legítimos.

Esses testes não validam RF real nem comprovam criptografia/configuração física da etiqueta. Os checks também não provam coesão semântica de todo módulo, correção de toda consulta ou toda condição de concorrência. Não existe limite arbitrário de linhas ou número mínimo de interfaces para “aprovar arquitetura”.

## Integração contínua e limite do bloqueio

`.github/workflows/quality.yml` configura o job `architecture-and-quality` para PRs, pushes em `main` e execução manual. Ele roda `npm ci` e `npm run verify`, sem EAS, build nativo, escrita de etiqueta ou credenciais de laboratório. O workflow manual anterior permanece separado.

O arquivo foi preparado localmente. Ele só executará após publicação e se GitHub Actions estiver habilitado. Para impedir merge pelo GitHub, o job deve ser exigido no ruleset/proteção da branch; essa configuração remota não foi alterada por esta implementação. Localmente, os comandos retornam exit code diferente de zero diante de falha. Uma pessoa ainda pode deixar de executá-los, por isso a validação obrigatória no servidor é a última camada de proteção.

`AGENTS.md` orienta agentes a executar `verify`, corrigir o código em vez de suprimir checks e preservar as garantias de recuperação. Essa orientação complementa a fiscalização executável.

## Validação inicial dos checks — 23/10/2026

Lint sem warnings e typecheck passaram nos dois checkouts. As suítes completas existentes passaram: 308 testes/31 suítes no Expo e 16 testes/3 suítes no original. Os 47 testes do verificador passaram em cada checkout e foram repetidos após os últimos ajustes de configuração.

Também foram inseridas temporariamente duas violações em um arquivo novo de domínio de cada checkout: import de React e chamada direta de `fetch`. O comando real `npm run lint` rejeitou as duas com exit code 1 e os diagnósticos esperados. Os probes foram removidos ao final. Isso verifica o bloqueio efetivo, além de testar a lógica isolada do verificador.

Não houve build EAS/nativo, execução de Actions remoto ou ensaio físico nessa validação. A remoção posterior das 31 exceções do Expo é a refatoração descrita acima; o comportamento histórico do original permanece separado.

## Validação da remoção das 31 exceções — 23/10/2026

O `npm run verify` terminou com exit code 0 após a refatoração: lint sem warnings, TypeScript sem erros, **47 testes do verificador de arquitetura** e **317 testes Jest em 34 suítes** aprovados. O analisador verificou 102 arquivos de produção, com zero dependências legadas e nenhuma nova violação. `exceptions.json` contém apenas `[]`, e um teste exige que continue vazio.

A comparação SHA-256 com o início desta refatoração confirmou que `check.cjs`, `check.test.cjs`, `check-exceptions.cjs`, `eslint-policy.cjs` e `.eslintrc.js` permaneceram idênticos. As dependências foram corrigidas no código; nenhuma regra foi afrouxada. `git diff --check` passou.

O comando `node node_modules/expo/bin/cli export --platform ios --max-workers 2 --output-dir .tmp/refactor31-export` também terminou com exit code 0, gerando o bundle iOS com 1.251 módulos. Essa exportação verifica o empacotamento JavaScript/Hermes; não equivale a build nativo nem a aprovação de hardware. Não houve ensaio físico ou execução remota de Actions nesta etapa.

## Validação da separação de contratos e hooks — 23/10/2026

`npm run verify` aprovado: **369 testes Jest/42 suítes**, **70 testes das proteções**, lint sem warnings, tipos sem erros e **162 arquivos de produção** sem exceções ou violações. Há probes negativos para as regras adicionais e teste de compilação de variantes administrativas inválidas, além de regressões de concorrência, identidade, foco e virtualização. O detalhamento está na [seção 19 do relatório](C:/src/Nova-tag-expo/docs/18-analise-arquitetural-comparativa.md).

A exportação local iOS também terminou com exit code 0 (1.248 módulos). Compilação/carregamento dos módulos dos clientes CLI passaram; não houve execução de API real, build nativo, aceite em aparelho ou publicação de CI nesta etapa.
