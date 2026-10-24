# React Native: padrões de código limpo, fontes e validação

Pesquisa realizada e ampliada em **23/10/2026**. A base histórica é o Nova-tag Expo no commit `89ce3b8`; a seção 8 distingue essa base da implementação desta revisão. A seção 9 acrescenta seis padrões encontrados na documentação oficial. Referências consultadas diretamente nas documentações dos mantenedores de React, React Native, Expo, TypeScript, typescript-eslint e React Native Testing Library. O guia do Google é identificado como convenção editorial, com contexto próprio.

Este documento complementa a [análise arquitetural comparativa](18-analise-arquitetural-comparativa.md) e a [política executável atual](architecture-checks.md). Registra fundamentos, critérios de aceite e situação de adoção. As evidências da base nas seções 1–2 são históricas; não representam defeitos ainda presentes quando a seção 8 registra a correção. RN18–23 são propostas adicionais de pesquisa, sem adoção automática.

O referencial de arquitetura continua sendo *Fundamentals of Software Architecture, 2nd Edition*, usado na análise anterior para discutir responsabilidades, acoplamento, características arquiteturais e consequências das decisões. As APIs e recomendações específicas de React Native abaixo vêm das respectivas documentações, não de uma atribuição dessas regras ao livro.

## 1. Compatibilidade e evidência da base histórica

O `package.json` declara React **19.2.3**, React Native **0.86.3** e Expo **57.0.27**. No ambiente instalado, `eslint-plugin-react-hooks` é **7.1.1** e `@typescript-eslint/eslint-plugin` é **8.71.1**. A documentação web de React consultada já apresenta versão 19.3; portanto, qualquer API nova exige conferir a versão realmente instalada. As referências versionadas de React Native neste documento usam **0.86**.

Na base `89ce3b8`, foram conferidos os arquivos locais, as opções resolvidas do TypeScript e a configuração efetiva de ESLint para `OfflineProvider.tsx`:

| Evidência | Resultado na base `89ce3b8` | Consequência identificada |
| --- | --- | --- |
| TypeScript resolvido | `strict: true`; `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` desativados | Há verificações úteis além de `strict` a avaliar |
| ESLint efetivo | Sem `no-floating-promises`, `no-misused-promises`, `no-unsafe-type-assertion` e `switch-exhaustiveness-check`; sem projeto de tipos configurado | Essas proteções ainda não existem neste projeto |
| Testes | 22 arquivos de `__tests__` importam diretamente `react-test-renderer`; sem dependência direta de RNTL | A migração do estilo de testes tem aplicação concreta |
| Compiler | Sem configuração explícita `experiments.reactCompiler` e sem dependência direta do plugin | Sua adoção deve ser um experimento verificável |
| Effect Events | `useEffectEvent` existe no React instalado; sem uso em `src` | Disponibilidade não implica necessidade de adoção |
| Arquitetura | Inventário de exceções vazio; fronteiras e regras de hooks existentes | Preservar as garantias atuais ao acrescentar padrões |

Esses resultados descrevem a base histórica, antes das alterações da seção 8. Não equivalem a uma nova aprovação de testes ou de hardware.

## 2. Padrões a adotar e quando aplicá-los

### RN01 — Promises precisam de um responsável pelo resultado e pelo erro

**Fundamento:** `no-floating-promises` detecta promises deixadas sem tratamento. A própria documentação ressalta que `void` apenas descarta o valor; uma rejeição continua podendo ficar sem tratamento. `no-misused-promises` complementa a proteção em condições e callbacks que esperam retorno síncrono. Fontes: [promises sem tratamento](https://typescript-eslint.io/rules/no-floating-promises/) e [uso indevido de promises](https://typescript-eslint.io/rules/no-misused-promises/).

**Aplicação proposta:** handlers, timers e assinaturas devem aguardar a operação ou iniciar uma cadeia com tratamento explícito. Definir quem apresenta o erro, quem registra uma falha operacional e quem preserva a tentativa para recuperação. Um `.catch(() => {})` só deve permanecer quando o contrato torna o descarte intencional e a falha já está representada no lugar correto.

**Evidência na base histórica:** [OfflineProvider.tsx na base inspecionada](https://github.com/brunoaiolfi/Nova-tag/blob/89ce3b886d9d782bd0acffcb0ff0db8690714847/src/components/Offline/OfflineProvider.tsx#L25) contém cadeias de sincronização, chamadas com `void` e catches vazios. Isso pede revisão dos contratos de rejeição, não prova que toda chamada ali esteja incorreta.

**Aceite:** testes de rejeição em retomada, conectividade e timer; nenhuma rejeição sem responsável; nenhuma perda do estado recuperável. Avaliar `ignoreVoid: false` para a regra, com probes que rejeitem uma promise apenas prefixada por `void`.

### RN02 — Acrescentar lint que entende os tipos

**Fundamento:** regras que precisam distinguir uma promise de um objeto comum exigem informação de tipos. A documentação de typescript-eslint descreve `projectService` e o custo adicional desse processamento. Fonte: [lint com informação de tipos](https://typescript-eslint.io/getting-started/typed-linting/).

**Aplicação:** override para TS/TSX de produção, compatível com o ESLint 8 e a configuração legada atuais. Configurar o serviço de projeto e `tsconfigRootDir`; verificar cobertura dos arquivos antes de ativar as regras. Scripts CommonJS não devem receber requisitos de projeto TS inadvertidamente. A execução local está registrada na seção 8.

**Aceite:** registrar o custo do lint; provar que arquivos novos entram no projeto; testar violações com a configuração real. Uma migração para flat config deve preservar todas as regras existentes e os probes arquiteturais.

### RN03 — Decoder deve produzir uma prova compreensível do contrato

**Fundamento:** o TypeScript estreita tipos por verificações e type guards; uma asserção não valida o dado em execução. A regra `no-unsafe-type-assertion` detecta estreitamentos feitos por asserção. Fontes: [narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) e [asserções inseguras](https://typescript-eslint.io/rules/no-unsafe-type-assertion/).

**Aplicação proposta:** receber `unknown`, validar as variantes e construir o objeto de saída com campos comprovados. Quando um guard for mais adequado, sua implementação precisa validar integralmente aquilo que o predicado promete. Separar validade estrutural de autorização, propriedade e estado da operação.

**Evidência na base histórica:** havia `as unknown as` em `operation-decoder.ts`, `reply-decoder.ts` e `catalog.ts`. Já existiam validações; o objetivo foi melhorar sua ligação com o tipo retornado e facilitar futuras alterações do contrato. A seção 8 registra a substituição dos casts por construção validada.

**Aceite:** adicionar campo obrigatório ao modelo deve exigir mudança no decoder; variante inválida deve falhar em teste; política contextual continua separada. Uma biblioteca de schemas é uma alternativa a avaliar pelo custo e benefício, sem instalação obrigatória.

### RN04 — Usar uniões discriminadas e tratar cada variante explicitamente

**Fundamento:** o TypeScript permite verificar exaustividade com `never`; typescript-eslint oferece uma regra específica para switches sobre uniões. Fontes: [exaustividade de uniões](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking) e [switch-exhaustiveness-check](https://typescript-eslint.io/rules/switch-exhaustiveness-check/).

**Aplicação proposta:** eventos e estados relacionados devem carregar os dados exigidos pela própria variante. Para um switch sobre eventos já validados, considerar `considerDefaultExhaustiveForUnions: false`, preservando a detecção de variantes novas. Na entrada externa, um valor desconhecido ainda exige rejeição em execução.

**Aceite:** um probe acrescenta uma variante e omite seu tratamento; lint/compilação devem falhar. A revisão verifica também o significado da transição, que a exaustividade sozinha não comprova.

### RN05 — Distinguir propriedade ausente, `undefined` e acesso por índice

**Fundamento:** `noUncheckedIndexedAccess` acrescenta a possibilidade de ausência em acessos sem garantia; `exactOptionalPropertyTypes` distingue omitir uma propriedade de atribuir `undefined`. Fontes: [acesso por índice](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) e [propriedades opcionais](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html).

**Aplicação proposta:** testar as flags separadamente, corrigindo arrays de bytes, resultados SQLite, mapas e payloads opcionais. Preservar a diferença de contrato entre omitir um campo e enviar `null`. Um `!` inserido em massa apenas remove o benefício da verificação.

**Aceite:** typecheck e verify completos, casos de array vazio/curto e payload ausente. Fazer migrações distintas para tornar as mudanças revisáveis. As duas flags estavam desativadas na base histórica e estão habilitadas no checkout em validação.

### RN06 — Props públicas devem corresponder ao comportamento suportado

**Fundamento:** props são o contrato entre componentes; a documentação de React recomenda cuidado ao repassá-las indiscriminadamente. A definição da superfície pública do componente é uma decisão local de projeto. Fonte: [contratos por props](https://react.dev/learn/passing-props-to-a-component).

**Evidência na base histórica:** `ActionButton.tsx` aceitava quase todas as props de `PaperButton`, mas renderizava `TouchableRipple`, `Icon` e `Text`, repassando uma seleção de propriedades. O contrato foi restringido conforme RN06 e seção 8.

**Aplicação proposta:** declarar `ActionButtonProps` explícito ou selecionar com `Pick` as propriedades realmente suportadas. Tipar callbacks e acessibilidade com clareza. Rever consumidores antes de restringir a API.

**Aceite:** teste de compilação rejeita uma prop não suportada; teste de interação cobre as props aceitas. Evitar uma prop booleana nova para cada variação visual quando uma variante nomeada expressar melhor a intenção.

### RN07 — Modelar estado a partir das transições e do seu proprietário

**Fundamento:** React recomenda agrupar valores que mudam juntos e evitar contradições, duplicação e estado derivável. Fonte: [estrutura do estado](https://react.dev/learn/choosing-the-state-structure).

**Aplicação proposta:** `useState` para estado local independente; reducer para transições relacionadas; cálculo direto para dados derivados; store externo quando já existe um proprietário fora de React. Escolher o menor escopo que preserve a consistência.

Exemplo ilustrativo de contrato de apresentação:

```ts
type OrderSearchStatus =
  | {status: 'idle'}
  | {status: 'loading'; searchTerm: string}
  | {status: 'loaded'; orderIds: readonly string[]}
  | {status: 'failed'; message: string};
```

**Aceite:** estados impossíveis não podem ser construídos pelos consumidores; mudança de usuário/rota limpa somente o estado pertencente ao escopo anterior. Os reducers existentes já seguem parte dessa direção. Quantidade de hooks não é métrica de correção.

### RN08 — Efeitos sincronizam sistemas externos; comandos têm handlers

**Fundamento:** React recomenda calcular dados de renderização diretamente e tratar ações do usuário no evento correspondente, evitando cadeias artificiais de efeitos. Fonte: [quando um efeito é desnecessário](https://react.dev/learn/you-might-not-need-an-effect).

**Aplicação proposta:** iniciar leitura NFC, confirmação e escrita em handlers que chamam casos de uso. Efeitos ficam com assinaturas, foco, timers e sincronização necessária. Um efeito de busca por um termo pode ser legítimo; já copiar uma mensagem derivada para outro estado cria manutenção desnecessária.

**Aceite:** renderização ou remontagem não repete uma escrita física. Dependências permanecem completas, com descarte do recurso. Não usar promise, timer ou hook intermediário apenas para esconder um setter que o lint rejeita.

### RN09 — Hooks devem revelar o caso de uso

**Fundamento:** React recomenda hooks com propósito concreto e desaconselha wrappers de ciclo de vida como `useMount`, `useEffectOnce` e `useUpdateEffect`, que escondem dependências. Fonte: [reutilização de lógica com hooks](https://react.dev/learn/reusing-logic-with-custom-hooks).

**Aplicação proposta:** preferir nomes como `useOrderSearch` e `useNfcReader`. O hook coordena apresentação e ciclo de vida; políticas e transições puras ficam em módulos testáveis sem React. Extrair por responsabilidade, evitando criar arquivos que apenas repassam argumentos sem acrescentar clareza.

**Aceite:** é possível descrever o propósito do hook e testar suas políticas sem montar uma tela. Extrair um bloco para outro arquivo só ajuda se reduzir o conhecimento necessário para entender cada responsabilidade.

### RN10 — Foco, sessão e descarte pertencem ao contrato assíncrono

**Fundamento:** React Navigation orienta cancelar trabalho assíncrono no cleanup ou ignorar atualizações obsoletas quando o cancelamento não existe. AppState distingue estados do aplicativo e particularidades de plataforma. Fontes: [useFocusEffect](https://reactnavigation.org/docs/use-focus-effect/) e [AppState 0.86](https://reactnative.dev/docs/0.86/appstate).

**Aplicação proposta:** cada operação identifica o escopo que pode receber seu resultado: usuário/API, rota, pesquisa e geração da requisição, conforme o caso. Cancelamento de rede economiza trabalho; a proteção contra resultado obsoleto continua necessária.

**Evidência:** [use-order-search.ts](../src/components/Nfc/use-order-search.ts) já usa geração e snapshot de sessão. Ampliar a cobertura dessas garantias tem mais valor que substituir o hook por uma biblioteca sem reproduzir os casos.

**Aceite:** resolver requisições fora de ordem, trocar sessão e sair da tela não reinstala dados antigos. Para NFC, preservar a arbitragem e a recuperação durável: abortar uma espera em JS não comprova que uma escrita física deixou de ocorrer. Essa última exigência é específica do Nova-tag.

### RN11 — Assinaturas externas precisam de snapshots estáveis

**Fundamento:** `useSyncExternalStore` requer que `getSnapshot` devolva o mesmo valor enquanto o store não mudou e que a assinatura permita unsubscribe. Fonte: [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).

**Aplicação proposta:** manter snapshots imutáveis e cacheados no proprietário do store. Evitar construir um objeto novo a cada leitura ou duplicar todo o store em estado React. Os providers atuais de sessão e fila já adotam essa API; preservar o contrato ao adicionar campos.

**Aceite:** leituras sem mudança retornam valores iguais por `Object.is`; mutação relevante emite atualização; unsubscribe remove o listener. A chave privada de escopo de sessão não deve aparecer em logs ou UI, conforme o contrato local.

### RN12 — `useEffectEvent` só quando existe lógica não reativa dentro do efeito

**Fundamento:** a API lê valores atuais sem torná-los gatilhos de ressincronização. Seu uso é restrito à lógica de efeitos; não deve mascarar dependências nem ser passado como callback de UI ou de outro hook. Fonte: [useEffectEvent](https://react.dev/reference/react/useEffectEvent).

**Aplicação proposta:** avaliar assinaturas em que uma notificação precisa consultar um valor recente, mas a mudança desse valor não deve recriar a assinatura. A API existe no React instalado; ainda é necessário validar o lint efetivo antes de qualquer adoção.

**Aceite:** documentar quais valores reiniciam a assinatura e quais apenas são consultados. Quando usuário, API, dispositivo ou pedido devem invalidar a operação, permanecem parte explícita da sincronização. Não migrar handlers NFC para Effect Events.

### RN13 — Avaliar React Compiler com medição e adoção gradual

**Fundamento:** React Compiler automatiza parte da memoização; Expo documenta configuração e adoção por arquivos. Fontes: [React Compiler](https://react.dev/learn/react-compiler/introduction) e [integração Expo](https://docs.expo.dev/guides/react-compiler/).

**Aplicação proposta:** escolher uma lista/tela com custo medido, verificar compatibilidade com o SDK e experimentar compilação restrita. O projeto usa `@react-native` como base de lint; as instruções do Expo para `eslint-config-expo` não substituem automaticamente nossa política.

**Aceite:** confirmar que o arquivo foi compilado, comparar perfil antes/depois e repetir as regressões de identidade/foco. Não remover todos os `useMemo`/`useCallback` por busca textual. Compiler não implementa autorização, exclusão mútua ou validação de contratos.

### RN14 — Virtualização e desempenho precisam respeitar o conteúdo real

**Fundamento:** a configuração de FlatList envolve trocas entre memória, preenchimento e resposta ao toque. `getItemLayout` pressupõe dimensões conhecidas; clipping pode causar conteúdo ausente em alguns casos. A avaliação de desempenho deve ocorrer em build release. Fontes: [FlatList 0.86](https://reactnative.dev/docs/0.86/optimizing-flatlist-configuration) e [desempenho 0.86](https://reactnative.dev/docs/0.86/performance).

**Aplicação proposta:** manter IDs estáveis, linhas simples e paginação; medir antes de ajustar janelas, batches ou memoização. Não declarar altura fixa para uma linha que cresce com texto ou tamanho de fonte.

**Aceite:** massa representativa, rolagem rápida, fonte ampliada, memória e tempo de resposta registrados no mesmo aparelho. O teste atual com muitos pedidos é uma proteção de estrutura; o perfil em aparelho resolve a parte de desempenho.

### RN15 — Acessibilidade e layout adaptável são comportamento da interface

**Fundamento:** React Native fornece papel, nome e estado acessíveis. `useWindowDimensions` acompanha tamanho da janela e escala de fonte; `Text` oferece suporte à escala de fonte; KeyboardAvoidingView tem diferenças de plataforma. Fontes: [acessibilidade 0.86](https://reactnative.dev/docs/0.86/accessibility), [dimensões da janela](https://reactnative.dev/docs/0.86/usewindowdimensions), [Text](https://reactnative.dev/docs/0.86/text) e [teclado](https://reactnative.dev/docs/0.86/keyboardavoidingview).

**Aplicação proposta:** botões com nome e estado coerentes; seleções com checked/selected; erros anunciáveis; conteúdo compreensível além da cor. Preservar fonte ampliada e testar formulários com teclado. A base já trata papel de botão, estado ocupado e offset do cabeçalho; ampliar a cobertura por fluxo.

**Aceite:** VoiceOver/TalkBack percorrem o fluxo; foco e ordem fazem sentido; fonte grande não oculta confirmações; teclado permite alcançar o último campo e o envio. Testes JS cobrem semântica; aparelhos verificam a experiência nativa.

### RN16 — Testar a interação observável e reduzir dependência do renderer legado

**Fundamento:** o React descontinuou `react-test-renderer` e recomenda migrar para Testing Library. React Native orienta testar a perspectiva do usuário e explica o limite dos testes JS. Fontes: [descontinuação](https://react.dev/warnings/react-test-renderer) e [testes em React Native](https://reactnative.dev/docs/testing-overview).

**Aplicação proposta:** migrar primeiro um fluxo representativo. Consultar por papel e nome acessível; usar `userEvent` com `await` quando suportado; verificar saída visível após sucesso, falha e mudança de sessão. Fontes dos mantenedores: [queries](https://oss.callstack.com/react-native-testing-library/docs/api/queries) e [interações](https://oss.callstack.com/react-native-testing-library/docs/api/events/user-event).

**Compatibilidade:** a documentação consultada apresenta RNTL 14.x, com peer `test-renderer`, diferente do pacote legado `react-test-renderer`. Conferir dependências, `await render(...)` e configuração da versão selecionada. O guia também oferece documentação distribuída no pacote para agentes. Fonte: [instalação e documentação por versão](https://oss.callstack.com/react-native-testing-library/docs/start/quick-start).

**Aceite:** manter os cenários existentes de concorrência, sessão, foco e recuperação; teste falha se o usuário não consegue realizar a ação. Asserções específicas de props continuam possíveis quando o próprio contrato de integração é o objeto do teste. NFC real exige validação nativa/ensaio físico.

### RN17 — Nomes devem expor conceito, papel e unidade

**Fundamento:** o guia TypeScript do Google recomenda nomes descritivos e contexto suficiente. Ele próprio limita a aplicabilidade das convenções ao ambiente; adotamos o princípio de clareza como convenção local. Fonte: [guia de nomes](https://google.github.io/styleguide/tsguide.html#naming).

**Aplicação proposta:** `requestGeneration`, `selectedOrder`, `timeoutMilliseconds`, `responseByte`, `operationOwner`. Usar `is`/`has`/`can` quando ajudam a reconhecer um predicado; reservar `decode`, `validate` e `execute` para comportamentos compatíveis com esses verbos. Preservar nomes de campos externos e siglas consolidadas, como NFC e APDU.

**Aceite:** o leitor identifica o significado sem procurar a atribuição em outro arquivo. `id-length` só detecta um caso estreito; não compreende semântica. Contadores locais e parâmetros de tipo podem ser curtos. Evitar substituir um nome impreciso por outro apenas mais longo.

## 3. Usar tabelas tipadas para correspondências finitas

Para uma correspondência estática, como rótulos por estado, uma tabela pode deixar a cobertura mais clara que condições repetidas. `satisfies` verifica o contrato preservando a inferência da expressão. Fonte: [TypeScript: satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator).

```ts
type DeliveryStatus = 'pending' | 'sent' | 'failed';

const deliveryStatusLabels = {
  pending: 'Pendente',
  sent: 'Enviado',
  failed: 'Falhou',
} satisfies Record<DeliveryStatus, string>;
```

A escolha da tabela é uma decisão de legibilidade local. Quando a condição expressa prioridade, invariantes ou intervalos de protocolo, guard clauses e switches podem ser mais claros. O domínio continua sendo um lugar legítimo para decisões de negócio. Não estabelecer uma regra que proíba `if`/`else`, ternário ou `switch` apenas pela sintaxe.

## 4. Proteções propostas e limite de cada uma

A tabela descreve o objetivo e o limite dos mecanismos. A seção 8 informa os mecanismos já configurados no checkout; uma configuração existente só é aprovada depois da verificação completa.

| Proteção | Detecta | Verificação adicional necessária |
| --- | --- | --- |
| `no-floating-promises`, avaliando `ignoreVoid: false` | Promise descartada sem tratamento reconhecido | Dono do erro e recuperabilidade da operação |
| `no-misused-promises` | Promise usada em lugar incompatível | Resultado do callback e comportamento da UI |
| `switch-exhaustiveness-check` | Variante de união omitida | Correção da transição e entrada externa desconhecida |
| `no-unsafe-type-assertion` | Estreitamento por cast | Completude do guard/decoder e casos negativos |
| `noUncheckedIndexedAccess` | Acesso sem garantia de presença | Limites e formato de bytes/registros |
| `exactOptionalPropertyTypes` | Omissão confundida com `undefined` | Semântica de PATCH, `null` e serialização |
| Queries por papel/nome e interações de usuário | Contrato observável ausente ou quebrado | Voz, teclado, layout e integração em aparelho |
| Proteções arquiteturais atuais | Dependências proibidas e ciclos | Coesão semântica e direção das responsabilidades |

Regras novas que exigem tipos dependem de RN02. Acrescentá-las isoladamente pode quebrar a execução do ESLint por falta de informação de projeto. Cada regra deve receber probes positivos e negativos com a configuração efetiva, mantendo as proteções anteriores.

## 5. Ordem recomendada para executar

1. **Preparar lint com tipos e tratamento de promises (RN01–02).** Revisar providers e callbacks; provar rejeição controlada e escopo preservado. Registrar custo do lint.
2. **Fortalecer contratos e exaustividade (RN03–04 e seção 3).** Começar pelos três decoders com casts duplos. Preservar validação estrutural, autorização e recuperação separadas.
3. **Ajustar contratos de UI e testar um fluxo com RNTL (RN06 e RN16).** Primeiro `ActionButton` e um formulário; selecionar versões compatíveis. Expandir a migração mantendo os cenários existentes.
4. **Migrar as flags de TypeScript separadamente (RN05).** Corrigir primeiro ausência, índices e contratos opcionais; não espalhar asserções para obter compilação verde.
5. **Ampliar verificação nativa (RN10 e RN14–15).** Cobrir foco, retorno do background, fonte grande, teclado e desempenho em release. Preservar o tratamento específico de `inactive` no iOS.
6. **Experimentar Compiler e Effect Events somente com um caso concreto (RN12–13).** Medição e teste de regressão definem se a adoção vale a pena. Não são pré-requisitos das etapas anteriores.

RN07–11 e RN17 orientam a revisão contínua; vários desses princípios já aparecem na refatoração publicada. O próximo ganho está em preencher lacunas identificadas, mantendo o comportamento comprovado.

## 6. Critérios para revisão de mudanças por pessoas ou IA

- O PR explica o problema observável e a responsabilidade de cada módulo alterado.
- Estado novo tem proprietário, motivo para persistir e transições identificáveis.
- Efeito novo declara o sistema sincronizado, gatilhos e cleanup; ação física mantém identidade e recuperação.
- Operação assíncrona define destino do resultado e do erro, inclusive após troca de sessão ou saída da tela.
- Decoder mantém dados externos como `unknown` até comprovar o contrato.
- Props aceitas têm comportamento implementado e verificável.
- Nomes expõem conceitos e unidades; comentários explicam decisões e invariantes.
- O teste exercita uma falha plausível ou garantia relevante, sem apenas repetir a implementação.
- `npm run verify` passa após mudança de código/configuração, com as regras atuais preservadas.
- Afirmações sobre desempenho ou funcionamento nativo incluem o método de medição/ensaio apropriado.

Esses critérios orientam a revisão sem estabelecer metas artificiais de quantidade de arquivos, hooks, interfaces ou linhas. A automação deve bloquear propriedades que consegue verificar; significado, responsabilidade e experiência em aparelho continuam exigindo evidência adicional.

## 7. Resultado e método da pesquisa

A pesquisa reúne **23 diretrizes**, mais tabelas tipadas, com fontes primárias e critérios verificáveis. As primeiras 17 motivaram as alterações da seção 8. As seis adicionais da seção 9 respondem à solicitação de novos padrões e devem entrar no plano conforme risco e aplicabilidade.

Fontes web foram abertas diretamente; a documentação distribuída no pacote RNTL foi usada para a versão instalada. A página web de React já apresenta 19.3: APIs e detalhes novos precisam ser confrontados com as dependências do projeto. Não houve leitura integral da edição paga de *Fundamentals*. A ligação com modularidade e governança usa o sumário/trecho público do [capítulo 6 da segunda edição](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html), que identifica governança e fitness functions. Os gates deste repositório são uma aplicação local dessa ideia, não código prescrito pelo livro.

## 8. Implementação no checkout Expo e comparação de versões

Esta seção descreve a implementação posterior à base `89ce3b8`. Os gates locais foram aprovados; a seção 11 registra o método e os limites de validação. Aprovação de código e aceite físico são evidências distintas.

| Padrão | Alteração concreta | Evidência/limite |
| --- | --- | --- |
| RN01–02 | `projectService` e regras de promises em produção e testes; `ignoreVoid: false`; provider offline com falha observável e escopo de sessão | Probes positivos/negativos usam ESLint real; falhas de rede, retomada e timer têm testes |
| RN03–04 | HTTP retorna `unknown`; decoders de pedidos, provisionamento, decisões, administração e experimentação validam e constroem contratos; switches exaustivos | Testes negativos de resposta e lotes; recibos preservam campos adicionais e evidências originais |
| RN05 | As duas flags habilitadas; leitura explícita de bytes ausentes e validação de arrays esparsos | Probes de compilação, bytes curtos e payload opcional; apresentação aceita `undefined` somente quando significa omitir/resetar |
| RN06 | `ActionButtonProps` seleciona apenas propriedades implementadas; loading impede ativação e expõe busy/disabled | Probe rejeita prop não suportada; teste de interação cobre loading |
| RN07–10 | Reducers e hooks por fluxo preservados; comandos explícitos e descarte por foco/sessão; erros de background têm proprietário | Testes de corrida cobrem respostas atrasadas, logout, dupla ativação e desmontagem |
| RN11 | Snapshots de sessão e fila cacheados; projeções públicas imutáveis | `Object.is`, congelamento e isolamento do proprietário precisam permanecer em regressão |
| RN12 | `useEffectEvent` no provider offline consulta a identidade atual na notificação sem refazer assinaturas | Não autoriza ignorar dependências nem usar Effect Event como handler de botão |
| RN13 | Compiler limitado à UI genérica e `OrderSelect`; plugin 1.0.0; `compiler:check` compara o componente real com/sem transformação | Mede trabalho JS sintético e atualização de props/callback; não mede FPS nativo |
| RN14–15 | Lista mantém virtualização; campos têm labels; botão expõe estado; teclado tem comportamento por plataforma; abas se distribuem em linhas com fonte ampliada e retorno compacto preserva nome acessível | Testes JS e smoke Android com fonte 200%/teclado; release, leitor de tela e bancada são verificações distintas |
| RN16 | Os 22 arquivos de apresentação migrados para RNTL 14.1; lint de operações assíncronas, `act`, queries e import legado | `test-renderer` 1.2.0 é compatível com React 19.2; `jest-expo` ainda traz renderer legado transitivamente |
| RN17 e mapas | Nome de material do slot explícito; nomes de conceitos preservados; mapa de resultado usa `satisfies` | Lint de tamanho não comprova clareza semântica; revisão continua necessária |

O original declara **React 19.0.0 / RN 0.79.2 / TS 5.8.3**; o Expo declara **React 19.2.3 / RN 0.86.3 / TS 6.0.3**. `useEffectEvent` não deve ser copiado para o original sem atualização compatível. Regras de dependência, nomes, contratos, testes observáveis e estado derivado se aplicam aos dois. Configuração Expo, versões do renderer e detalhes do SDK devem ser verificados separadamente. O original conserva oito exceções arquiteturais históricas; o Expo permanece sem exceções.

Não há recomendação de instalar Redux, Zustand, TanStack Query ou uma biblioteca de formulários apenas pela contagem de hooks. Uma adoção deve demonstrar redução de duplicação, preservação dos escopos e melhoria de cenários concretos. A revisão final deve registrar a execução de `npm run verify` depois da última mudança de código/configuração.

## 9. Novos padrões encontrados na documentação oficial

### RN18 — Render puro e identidade estável de componentes e itens

**Fonte:** React exige render idempotente e sem efeitos externos; componentes declarados dentro de outros podem perder identidade. Listas precisam de chaves estáveis. Referências: [pureza](https://react.dev/reference/rules/components-and-hooks-must-be-pure), [identidade de estado](https://react.dev/learn/preserving-and-resetting-state) e [keys](https://react.dev/learn/rendering-lists).

**Padrão local proposto:** definir componentes no escopo do módulo; passar dados por props. Usar o identificador persistido no `keyExtractor`, sem índice, UUID ou `Math.random()` calculado no render. Criar UUID/horário de uma tentativa no comando proprietário e preservá-los nos retries. Uma função `renderItem` que retorna um elemento não é, por si só, uma definição de componente instável.

**Verificar:** manter `static-components`, `purity`, `refs` e `immutability`; teste reordena/remove itens e confirma que seleção e edição acompanham o mesmo ID. A análise estática não identifica toda chave inadequada. `OrderSelect` já usa `order.id`; investigar ocorrências adicionais antes de apontar defeito.

### RN19 — Resetar estado pela identidade correta sem destruir trabalho durável

**Fonte:** React associa estado à posição/tipo/key na árvore e permite reset explícito por identidade. [Preservar e resetar estado](https://react.dev/learn/preserving-and-resetting-state).

**Padrão local proposto:** formulários descartáveis podem usar `key={orderId}` quando a troca de pedido deve iniciar outro formulário. Evitar vários efeitos que limpam campos independentemente. Dados de sessão, fila e intenção de escrita pertencem aos respectivos proprietários, fora do ciclo de vida do formulário.

**Verificar:** trocar pedido limpa o rascunho esperado; revalidação da mesma sessão preserva leitura já capturada; logout não expõe dados antigos. Uma key baseada em `busy`, foco ou status de verificação pode desmontar indevidamente o leitor. Usar key exige esse cenário de regressão; não substitui o controle de geração/cancelamento de RN10.

### RN20 — Parâmetros de rota identificam o recurso e não viram outro banco

**Fonte:** React Navigation recomenda parâmetros mínimos e serializáveis, geralmente IDs, filtros e paginação. Objetos completos podem duplicar dados e ficar obsoletos. [O que colocar nos parâmetros](https://reactnavigation.org/docs/params/#what-should-be-in-params).

**Padrão local proposto:** preferir `provisioningId` e `orderId` a passar serviços, callbacks ou um cadastro mutável completo. Resolver o dado por caso de uso/store do proprietário. Permissão e validade são verificadas na execução, além da tipagem da rota.

**Verificar:** testes de restauração/deep link e troca de conta não reutilizam recurso de outro escopo. `Gerenciar` já recebe `provisioningId`. O snapshot de leitura transportado para histórico exige análise específica: ele pode representar evidência imutável, e removê-lo sem substituto perderia contexto. Não aplicar a regra mecanicamente nem colocar tokens/chaves em params.

### RN21 — Separar erro operacional de erro ao renderizar

**Fonte:** Error Boundaries tratam falhas de renderização de descendentes; `try/catch` em volta de JSX não faz isso. Elas não capturam automaticamente handlers e promises independentes. Referências: [Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) e [regra de lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/error-boundaries).

**Padrão local proposto:** avaliar uma fronteira na composição de telas com fallback acessível e recuperação explícita. Falha esperada de validação/rede segue como estado da operação, com seu responsável. Fallback não deve reenviar escrita física nem apagar journal.

**Verificar:** componente filho lança durante render e aparece uma ação compreensível; uma rejeição de HTTP continua no handler correto; recuperação não duplica APDU. A disponibilidade de `react-hooks/error-boundaries` no plugin não significa que a regra esteja habilitada neste checkout. Adotar fronteiras requer esse teste e definição do escopo de reset.

### RN22 — Configuração pública e credenciais têm contratos diferentes

**Fonte:** variáveis `EXPO_PUBLIC_*` são incorporadas ao bundle. AsyncStorage é armazenamento sem criptografia; SecureStore tem limites de persistência e recuperação por plataforma. Referências: [variáveis Expo](https://docs.expo.dev/guides/environment-variables/), [segurança RN 0.86](https://reactnative.dev/docs/0.86/security) e [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

**Padrão local proposto:** URL de API pode ser configuração pública; token e chave criptográfica não podem ser tratados como segredo de ambiente dentro do bundle. Persistência de sessão fica no adaptador seguro; logs e relatórios recebem uma projeção sem credenciais. Links externos são entrada não confiável e não concedem autorização.

**Verificar:** logout remove sessão persistida; corrupção/falha de leitura exige recuperação segura; relatório não contém token. O Expo já utiliza SecureStore. A revisão deve preservar essa implementação e a política de chaves administrativas existente; não inventar armazenamento móvel de chaves para atender um exemplo genérico. Configuração de rede de laboratório não prova configuração de distribuição.

### RN23 — Distinguir prioridade de render, debounce e correção assíncrona

**Fonte:** `useDeferredValue` pode adiar uma parte da UI; não impede uma requisição por digitação. Uma Transition não controla diretamente o valor de um input e não garante a ordem de todas as operações assíncronas. Referências: [useDeferredValue](https://react.dev/reference/react/useDeferredValue) e [useTransition](https://react.dev/reference/react/useTransition).

**Padrão local proposto:** input controlado atualiza imediatamente. Debounce limita consultas quando necessário; cancelamento/geração continuam impedindo resposta antiga. Só adotar defer/transition para cálculo/render caro identificado em perfil. Expor conteúdo desatualizado quando uma lista adiada permanece visível, impedindo confirmação ambígua.

**Verificar:** digitação responsiva, pesquisa final correta, resposta fora de ordem rejeitada e seleção coerente. Comparar no mesmo aparelho/build release. Não trocar exclusão síncrona, persistência ou controle de sessão por `isPending`; essas garantias protegem operações, não prioridade visual.

## 10. Como incorporar os novos padrões ao plano

| Prioridade | Trabalho revisável | Bloqueio automático possível | Evidência complementar |
| --- | --- | --- | --- |
| 1 | Preservar os gates de RN01–17 | `verify`, probes válidos/inválidos, lista de exceções vazia | Regressões de RF, sessão e recuperação preservadas |
| 2 | Auditar identidade/keys e parâmetros de rota (RN18–20) por fluxo | Regras de hooks e contratos de rotas; teste de reordenação/reset | Avaliação da vida útil de evidência e rascunho |
| 3 | Definir fronteira de falha de renderização (RN21) | Teste de fallback e lint após avaliação do plugin | Recuperação sem repetição física nem perda do journal |
| 3 | Preservar/redigir projeções de dados sensíveis (RN22) | Teste de serialização/logout e restrição de imports | Contrato de armazenamento/backup e build de distribuição |
| 4 | Avaliar RN23 somente após perfil com gargalo | Regressão de pesquisa/ordem/seleção | Medição release antes/depois no mesmo aparelho |

Para cada item, registrar fonte e versão, problema reproduzível, mudança de responsabilidade, consequência negativa e critério de revisão. Evitar regras como “nenhum `useState`”, “nenhum `if`”, “uma função por arquivo” ou “memo em tudo”: elas não demonstram coesão nem correção. Nenhum lint garante que uma IA nunca erre; os gates bloqueiam violações específicas e os cenários de regressão comprovam comportamentos definidos.

## 11. Validação e limites da execução

`npm run verify` passou após a última mudança de código/configuração: **88 testes
das proteções arquiteturais**, **44 suítes / 397 testes Jest**, typecheck, lint sem
warnings e verificação do Compiler. A política verificou 173 arquivos de produção,
com **zero exceções**. A última execução não apresentou os avisos anteriores de
keys duplicadas, Surface com overflow, timer excedido ou atualização fora de act.
Os fixtures receberam IDs distintos, o diálogo preserva a sombra e o agendamento
de expiração funciona em etapas limitadas, com regressão de uma sessão de 30 dias.

No Node **24.18.0**, o export com Compiler passou para Android, iOS e web.
Os bundles Hermes finais de Android e iOS foram gerados em
`.tmp/standards-export-final`; o APK debug compilou com Gradle localmente.
O build nativo e o smoke são evidências Android; os outros exports validam
empacotamento, sem aprovação de hardware iOS ou medição de desempenho.

O smoke Android foi executado em AVD Pixel Android 16, x86_64, com o development
build compilado localmente. O aplicativo real usou HTTP por loopback/ADB reverse
contra o [fixture Postman versionado](../postman/README.md), derivado do OpenAPI
local da API. Nenhuma credencial de produção nem operação física foi utilizada.

Foram observados login, restauração da sessão após recriação da Activity, consulta
com total de 500 pedidos e páginas de dez, cadastro de `NATIVE-UI-2026` e sua
presença na consulta seguinte. Os eventos de login 201, listagem 200, cadastro 201
e nova listagem 200 constam dos logs locais da simulação. O smoke HTTP separado
cobre também entrada inválida 400, conflito 409, ID inexistente 404, rota não
modelada 501 e logout 401 na consulta seguinte; esses erros não são alegados como
cenários percorridos pela UI nesta execução.

Com `font_scale=2.0`, a barra original dividia palavras entre linhas. A versão
adaptável foi observada com as cinco abas legíveis em duas linhas, mantendo a
fonte ampliada. No formulário, o teclado permaneceu aberto; rolagem alcançou a
descrição e a confirmação acima do teclado enviou o cadastro. O retorno compacto
do cabeçalho tem regressão JS para fonte grande e área mínima de toque; não foi
repetido o smoke nativo após essa última alteração de cabeçalho.

O emulador foi usado com overlay descartável (`-read-only`), sem snapshots, e
encerrado ao final. Logs/imagens ficam em `.tmp`, fora do Git. Essa execução não
mede FPS/memória em release nem comprova TalkBack/VoiceOver completos ou NFC real.
O export de JavaScript/Hermes também não equivale a build/execução nativa de iOS.

A auditoria de títulos encontrou 276 cenários nomeados na base e manteve seu
escopo. O único título substituído foi o teste do operador no cadastro: passou de
chamada direta de handler para interação com o controle público desabilitado.
Os cenários de corrida, foco, sessão e recuperação foram mantidos; não foram
introduzidos testes ignorados nem exceções arquiteturais.

O custo observado de lint com tipos e probes inclui compilação TS e é superior
ao lint apenas sintático. As execuções locais ocorreram também sob pressão de
memória, com emulador/Metro concorrentes, portanto seus tempos não formam um
benchmark comparável. O gate de aprovação é funcional; orçamento de tempo/RSS
deve ser medido em ambiente controlado antes de fixar um limite de CI.
