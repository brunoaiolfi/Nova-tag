# Nova-Tag — análise arquitetural comparativa e plano de melhoria

**Data:** 23 de outubro de 2026.<br>
**Escopo:** código local do Nova-tag original e do Nova-tag Expo, incluindo as alterações ainda não commitadas no checkout Expo.<br>
**Natureza:** diagnóstico inicial e plano de refatoração, seguidos dos registros de execução nas seções 15, 16 e 19. As contagens e achados iniciais são históricos; a seção 19 descreve a implementação atual no Expo.

**Revisão de fundamentação:** o referencial principal é *Fundamentals of Software Architecture, 2nd Edition*, de Mark Richards e Neal Ford (O'Reilly, 2025). As recomendações abaixo distinguem evidência local, interpretação arquitetural e decisão proposta. O livro não é utilizado como justificativa para uma árvore de pastas obrigatória.

## 0. Referencial e método de avaliação

### 0.1. Fontes efetivamente consultadas

Foram consultados o sumário e os trechos públicos oficiais da segunda edição na O'Reilly, além dos textos primários complementares citados ao longo do relatório. Não houve acesso integral à edição paga. Por isso, as referências identificam capítulos e seções verificáveis, sem inventar páginas, transcrições ou afirmar leitura integral. A edição foi conferida na [página oficial da obra](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/).

As fontes têm papéis diferentes:

| Referencial | Uso nesta análise | Limite da atribuição |
| --- | --- | --- |
| [FSA, cap. 3 — Modularity](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch03.html) | Avaliar a organização e as relações entre módulos | Tamanho e quantidade de arquivos não são notas de qualidade |
| [FSA, cap. 5 — Identifying Architectural Characteristics](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch05.html) | Derivar prioridades das necessidades do produto | Prioridades inferidas precisam ser confrontadas com os requisitos do projeto |
| [FSA, cap. 6 — Measuring and Governing Architecture Characteristics](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html) | Definir verificações e critérios observáveis | “Manutenível” sem cenário e medida é insuficiente |
| [FSA, cap. 8 — Component-Based Thinking](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch08.html) | Analisar componentes lógicos, coesão, acoplamento e granularidade | Um arquivo/classe não corresponde necessariamente a um componente arquitetural |
| [FSA, cap. 10 — Layered Architecture Style](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch10.html) e [cap. 11 — Modular Monolith](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch11.html) | Comparar particionamento técnico e por domínio | Camadas e módulos por capacidade são alternativas; o capítulo de monólito não prescreve a estrutura de um app React Native |
| [FSA, cap. 21 — Architectural Decisions](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch21.html) | Explicitar contexto e justificativa das decisões | As propostas deste documento não são decisões já aceitas pela equipe |
| [FSA, cap. 22 — Analyzing Architecture Risk](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch22.html) | Separar impacto, probabilidade e comprovação | Não há probabilidade de falha medida para os cenários apenas inspecionados |
| [FSA, cap. 27 — The Laws of Software Architecture, Revisited](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch27.html) | Examinar benefício, custo e contexto das escolhas | Não existe solução universalmente superior fora do contexto |

O capítulo 27 destaca trade-offs, a importância da justificativa e decisões em um espectro de alternativas. A aplicação aqui é exigir consequência negativa e condição de revisão para uma mudança arquitetural. Isso não significa que todas as alternativas atendam igualmente aos requisitos. [Fonte: trecho oficial do capítulo 27](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch27.html).

Para regras específicas de dependência, este relatório usa explicitamente [Ports and Adapters, de Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture), e [The Clean Architecture, de Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Elas são opções de desenho para isolar políticas de tecnologias, não regras atribuídas a todo estilo apresentado em *Fundamentals*.

### 0.2. O que conta como evidência

- **Fato:** import, função, contrato, comportamento de teste ou configuração observado diretamente.
- **Interpretação:** relação entre o fato e uma característica arquitetural, com justificativa identificada.
- **Risco:** cenário possível ainda não reproduzido, com impacto descrito e probabilidade desconhecida quando não medida.
- **Proposta:** alternativa escolhida para o contexto, acompanhada de custo e critério de aceite; não uma determinação do livro.

LOC e número de imports são indicadores de triagem. Não foram calculadas métricas de coesão de classes, instabilidade, complexidade ciclomática ou distância da sequência principal. Não há nota numérica global de arquitetura. Também não se demonstrou, só pela contagem estática, ciclo em execução ou frequência de mudanças conjuntas.

### 0.3. Características prioritárias inferidas do código e dos fluxos

Esta é uma aplicação do processo de identificação de características ao Nova-Tag, não uma lista imposta pelo livro. A fonte recomenda considerar domínio e necessidades dos envolvidos. [Fonte: FSA, capítulo 5](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch05.html).

| Característica | Necessidade observada no projeto | Cenário de avaliação proposto |
| --- | --- | --- |
| Integridade dos dados | Evidência de leitura e recibos não podem mudar durante retry | Reenviar captura após resposta perdida e comparar UUID, bytes, época, autoria e recibo |
| Recuperabilidade | App/rede podem interromper fila ou administração | Fechar/reabrir banco entre etapas e retomar sem duplicar efeito físico |
| Segurança e isolamento | Operador, API e sessão definem o escopo da operação | Trocar identidade entre consulta e escrita e verificar interrupção |
| Disponibilidade offline limitada | Captura pode continuar nas condições do cache e da sessão | Sem API, salvar somente captura elegível e preservar envio pendente |
| Testabilidade | SDK e renderização não devem ser necessários para todo teste de política | Exercitar caso de uso com portas em memória e testar SQLite/SDK em escopos separados |
| Modificabilidade | Mudar apresentação ou endpoint não deveria exigir alterar o protocolo RF | Comparar módulos envolvidos em uma alteração de cada tipo |
| Desempenho | Fila e histórico precisam funcionar no volume esperado | Definir massa e orçamento com o projeto antes de estabelecer meta de tempo/memória |

Disponibilidade offline e segurança têm limites conjuntos: ampliar coleta offline pode aceitar contexto menos recente; exigir verificação online constante impediria a coleta pretendida. A refatoração deve preservar a política existente até haver uma decisão explícita para alterá-la.

### 0.4. Unidade de análise: componentes lógicos

O capítulo 8 trata a arquitetura no nível de componentes e suas relações, com atenção à granularidade e à coesão. Aqui isso significa avaliar autenticação, vínculo, captura, sincronização, administração RF e ensaio como capacidades, sem assumir que cada classe deva virar um componente separado. [Fonte: FSA, capítulo 8](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch08.html).

| Componente lógico observado | Contrato/responsabilidade desejada | Acoplamento que merece atenção |
| --- | --- | --- |
| Sessão e identidade | Informar identidade válida e escopo de uso | UI injetada usando sessão diferente do singleton importado |
| Pedidos e vínculos | Consultar, registrar, ativar e encerrar vínculo | Tipos/HTTP/política de ativação centralizados em um workflow |
| Captura e sincronização | Commit local, lote, retry e projeção de decisão | UI, ensaio e transporte conhecendo detalhes além do necessário |
| Administração NFC | Coordenar efeitos físicos recuperáveis | Sequência crítica distribuída entre tela, coordinator, API e diário |
| Ensaio | Medir tentativas e controlar comunicação conforme protocolo | Necessidade real de atomicidade misturada com dependências acidentais de módulos |
| Adaptação nativa e persistência | Traduzir tecnologia preservando contratos | Conexão técnica compartilhada subordinada à pasta offline |
| Apresentação | Estado visual e intenções do usuário | Componentes genéricos dependendo de arquivos de telas |

O acoplamento entre intenção, comando RF e diário é necessário para a garantia de recuperação. O objetivo é explicitar e testar essa sequência, preservando sua coesão; reduzi-la artificialmente por contagem de imports pode piorar a arquitetura.

**Leitura histórica:** as dimensões e os achados abaixo descrevem o snapshot inicial. A eliminação posterior das 31 exceções do Expo está registrada na seção 16.

## 1. Diagnóstico principal

O projeto tem uma separação parcial de responsabilidades, mas os nomes das pastas prometem uma organização mais uniforme do que o código entrega. Existem dois problemas diferentes:

1. **No original**, há bases sem comportamento, serviços de negócio simulados e estilos diferentes de composição. A aplicação depende de infraestrutura no fluxo de etiqueta; isso impede o isolamento pretendido por Ports and Adapters, embora essa direção de chamada possa existir em uma arquitetura em camadas tradicional.
2. **No Expo**, a separação interna melhorou e há lógica real de recuperação, persistência e NFC. Porém, a evolução concentrou responsabilidades em workflows e telas extensos, deixou composição espalhada em singletons e manteve resíduos da geração anterior. Alguns componentes chamados de compartilhados dependem de telas específicas.

O diagnóstico sustentado pelos fatos é uma combinação de **fronteiras inconsistentes, coordenação de efeitos misturada com apresentação e abstrações sem responsabilidade identificada**. O núcleo Expo já possui partes isoladas e testadas. Não foi demonstrado que toda divisão existente seja excessiva ou que qualquer arquivo grande deva ser quebrado.

**Proposta contextual:** usar a versão Expo como base de evolução, pois já contém as integrações e garantias de recuperação examinadas. Manter o original como referência histórica ou alvo adicional se houver requisito para isso. O custo dessa escolha é concentrar dependência operacional no Expo e manter compatibilidade nativa; se a equipe precisar sustentar React Native CLI, a decisão deve ser revista. Os dois diretórios são worktrees do mesmo repositório Git. A escolha de base é uma decisão de produto/engenharia proposta, não uma conclusão prescrita pelo livro.

## 2. Escopo, evidência e limitações

### 2.1. Fontes examinadas

| Item | Nova-tag original | Nova-tag Expo |
| --- | --- | --- |
| Diretório | `C:\src\Nova-tag` | `C:\src\Nova-tag-expo` |
| Branch local | `feat/issue-3-authentication` | `codex/issue-12-secure-messaging` |
| HEAD | `c78fe15f93bd3ec5dadbc8e3eb51a70111ce2d8b` | `8ada36d9444967153aad34d7ca6e8f43db0742ee` |
| Pacote | NovaTag 0.0.1 | NovaTag 0.4.0 |
| Plataforma declarada | React Native CLI | Expo development build |
| Estado inicial | Sem alterações listadas por `git status --short` | 33 arquivos rastreados modificados e 3 arquivos novos |

O ancestral comum calculado é o próprio HEAD do original, `c78fe15`. A comparação reflete uma evolução entre branches, além de uma troca de plataforma; não é uma comparação controlada de duas implementações equivalentes.

Foram mapeados os arquivos TypeScript de `src`, imports relativos, pontos de composição, configuração de lint/tipos/testes e documentação. A leitura aprofundada concentrou-se em autenticação, provisionamento, captura de eventos, fila offline, histórico, administração NFC, persistência e componentes compartilhados. Foram executados os comandos de validação da seção 11.

Não houve auditoria linha a linha dos projetos nativos Android/iOS, execução em aparelho, escrita de etiquetas, acesso à API remota ou consulta do estado atual de PRs no GitHub. Referências a entregas nos documentos locais foram tratadas como documentação histórica, não como comprovação externa.

Os tamanhos incluem comentários e linhas vazias. O levantamento de imports inclui dependências apenas de tipos; números de dependências não devem ser interpretados como número de chamadas em execução.

As contagens de dependentes neste documento são imports entre arquivos, não as métricas formais de acoplamento aferente/eferente por classe. Um import apenas de tipo pode aumentar conhecimento compartilhado sem produzir uma dependência em execução. Para discutir ciclos operacionais, seria necessário separar essas categorias e verificar o código emitido.

### 2.2. Retrato quantitativo

| Métrica local | Original | Expo |
| --- | ---: | ---: |
| Arquivos `.ts`/`.tsx` em `src` | 52 | 97 |
| Linhas nesses arquivos | 2.512 | 14.031 |
| Arquivos em `appplication` | 5 | 10 |
| Linhas em `appplication` | 392 | 2.628 |
| Linhas em `domain` | 154 | 1.397 |
| Linhas em `infra` | 267 | 2.060 |
| Linhas em `components` | 567 | 3.408 |
| Linhas em `views` | 709 | 3.885 |
| Arquivos de produção com mais de 300 linhas | 0 | 16 |
| Arquivos `*.test.ts`/`*.test.tsx` em `__tests__` | 3 | 31 |

O Expo tem aproximadamente 5,6 vezes o volume de código do original, com aproximadamente 1,9 vez o número de arquivos. Isso contraria uma explicação baseada apenas em “arquivos demais”: **há fragmentação artificial em alguns lugares e concentração excessiva em outros**. O crescimento também inclui funcionalidades ausentes no original.

### 2.3. Maiores pontos de concentração no Expo

| Arquivo relativo ao checkout Expo | Linhas | Responsabilidades a revisar |
| --- | ---: | --- |
| `src/views/Provisionar/Administracao/index.tsx` | 950 | Estado do fluxo, efeitos, sessão, recuperação, ações e renderização |
| `src/components/Tracking/index.tsx` | 675 | Componentes genéricos, identidade visual e jornada logística |
| `src/appplication/administration/coordinator.ts` | 591 | Registro, plano, execução RF, restauração, ativação e encerramento |
| `src/infra/administration/sqlite-store.ts` | 524 | Schema, persistência e invariantes do diário |
| `src/appplication/offline/coordinator.ts` | 511 | Captura, cache, lote, reenvio, snapshot e atualização de decisões |
| `src/views/Provisionar/Gerenciar/index.tsx` | 429 | Consulta, encerramento, reutilização e UI |
| `src/appplication/traceability/workflow.ts` | 418 | Tipos, porta HTTP, pedidos, vínculos, histórico, ativação e eventos |
| `src/components/Nfc/SetupControls.tsx` | 408 | Controles genéricos e seleção específica de recuperação |

Tamanho é um indicador de inspeção, não uma prova isolada de erro. O corte de 300 linhas é somente uma consulta descritiva desta revisão; não é um limite de qualidade definido pelo livro. Um protocolo recuperável pode legitimamente precisar de mais código que um formulário.

## 3. Arquitetura que existe hoje

### 3.1. Original

O caminho de negócio predominante é:

```text
Tela de provisionamento/evento
  -> singleton PedidoEtiquetaApplication
     -> validações e modelos
     -> PedidoEtiquetaService
        -> espera artificial e resposta de sucesso

Componente Leitor
  -> SDK NFC diretamente

SessionProvider
  -> SessionManager
     -> SessionStorage / Transport
        -> Keychain / HTTP
```

Há dois estilos no mesmo projeto. Autenticação recebe dependências no construtor e possui armazenamento/transporte substituíveis. O fluxo de etiqueta importa sua implementação de infraestrutura dentro da própria camada de aplicação. Ter `domain`, `appplication` e `infra` não uniformiza esses caminhos.

### 3.2. Expo

```text
Telas e componentes de fluxo
  -> runtimes globais em infra
     -> SessionManager / TraceabilityWorkflow / OfflineCoordinator
        -> portas de armazenamento, NFC e request
           -> SecureStore / fetch / SQLite / SDK NFC

Componentes de fluxo
  -> funções nativas de NFC e diário experimental diretamente

Administração
  -> coordinator + diário SQLite + sessão RF exclusiva + API
```

O Expo já removeu o caminho de negócio simulado do original. O domínio e a aplicação não apresentaram imports relativos de `infra`, `views` ou `components` no mapeamento local. As regras de lint também restringem várias dessas dependências.

A dificuldade principal está nas bordas: a UI conhece implementações globais; a construção dos objetos fica em diferentes módulos; parte das políticas fica nos runtimes; tipos e interfaces estão agrupados por conveniência histórica; as telas coordenam tarefas longas.

## 4. O que está bem resolvido e deve ser preservado

Estas partes são ativos do projeto e precisam sobreviver à reorganização:

| Decisão existente | Valor concreto | Evidência |
| --- | --- | --- |
| Sessão com geração e escrita serializada | Evita publicar resultados de operações antigas após troca de sessão | [SessionManager Expo](C:/src/Nova-tag-expo/src/appplication/auth/session-manager.ts:34) |
| Sessão NFC exclusiva com timeout e cancelamento | Preserva exclusividade até terminar a operação nativa e sua limpeza | [ExclusiveNfcSession](C:/src/Nova-tag-expo/src/appplication/nfc/exclusive-session.ts:23) |
| Captura preservada antes do envio | Mantém identificador, autoria declarada e evidência em reenvios | [Captura offline](C:/src/Nova-tag-expo/src/appplication/offline/coordinator.ts:203) |
| SQLite com transações, versões e triggers | Protege payload, recibos e diários de alterações indevidas | [Store de capturas](C:/src/Nova-tag-expo/src/infra/offline/sqlite-store.ts:55) |
| Separação de transporte e resultado logístico | Não confunde “salvo/enviado” com “operação autorizada” | [Tipos offline](C:/src/Nova-tag-expo/src/domain/offline/capture.ts:1) |
| Recibo original e decisão atual separados | Permite reconciliação sem reescrever o resultado original | [Atualização de decisões](C:/src/Nova-tag-expo/src/appplication/offline/coordinator.ts:483) |
| Administração com intenção antes do APDU e resposta antes do HTTP | Impede que recuperação de rede repita cegamente uma alteração física | [Execução administrativa](C:/src/Nova-tag-expo/src/appplication/administration/coordinator.ts:378) |
| Validação administrativa de comandos e respostas | Restringe o que o transporte físico pode executar | [Validação de comandos](C:/src/Nova-tag-expo/src/domain/nfc/administrative-command.ts:1) |
| SDM tratado estruturalmente no mobile | Mantém autenticação criptográfica e decisão logística na API | [Validação estrutural SDM](C:/src/Nova-tag-expo/src/domain/traceability/sdm-reading.ts:16) |
| Testes de recuperação e SQLite real | Verificam cenários que testes apenas visuais não detectam | [Fila offline](C:/src/Nova-tag-expo/__tests__/OfflineQueue.test.ts:151), [administração](C:/src/Nova-tag-expo/__tests__/AdministrationCoordinator.test.ts:129) |

Não recomendo substituir esses controles por um serviço genérico de CRUD, por um único hook gigante ou por um cliente HTTP com reenvio automático de todas as operações. HTTP e comandos físicos têm regras de repetição diferentes.

## 5. Achados e melhorias necessárias

Prioridades propostas: **P1** = examinar/corrigir garantia funcional crítica antes de ampliar o fluxo afetado; **P2** = reduzir acoplamento e custo de mudança em incrementos; **P3** = melhoria de convenção ou otimização dependente de demanda. São prioridades de trabalho, sem alegar probabilidade medida. Riscos e dependências de implementação são diferenciados na seção 13.

### A01 — O original depende de infraestrutura dentro da aplicação

**Prioridade:** P2 para isolamento arquitetural; A02 trata o risco operacional do original. **Import e construção concretos confirmados.**

Em [PedidoEtiquetaApplication](C:/src/Nova-tag/src/appplication/pedidoEtiqueta/index.ts:5), a aplicação importa a interface do serviço de dentro de `infra` e importa a classe concreta. No final do módulo, instancia `new PedidoEtiquetaService()`. A [BaseApplication](C:/src/Nova-tag/src/appplication/base/index.ts:1) também busca seu contrato na infraestrutura.

O construtor recebe uma interface, mas a construção concreta no próprio módulo elimina boa parte do benefício dessa inversão. Mudar o adaptador exige mexer na aplicação; importar o módulo já seleciona sua implementação.

**Fundamento e trade-off:** a incompatibilidade é com o objetivo de testar o núcleo isolado e com a direção de dependências escolhida em Ports and Adapters/Clean. Camadas tradicionais não tornam todo `application -> infra` um erro universal. A inversão acrescenta contrato/composição; vale aqui pela substituição de transporte e persistência já utilizada nos testes. [Cockburn](https://alistair.cockburn.us/hexagonal-architecture), [Martin — Dependency Rule](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).

**Melhoria:** definir o contrato no módulo consumidor, em aplicação, e construir a implementação em uma raiz de composição. No original, esse ajuste só faz sentido se ele for mantido. Caso contrário, registrar o desenho como legado e concentrar a melhoria no Expo.

**Critério de aceite:** aplicação sem import de infraestrutura; teste do caso de uso usando uma implementação em memória; implementação real escolhida somente na composição.

### A02 — O original anuncia sucesso de operações que são stubs

**Prioridade:** P1 se usado para operações reais. **Constatação confirmada.**

[PedidoEtiquetaService](C:/src/Nova-tag/src/infra/services/pedidoEtiqueta/index.ts:10) aguarda 1,5 segundo e retorna sucesso tanto no provisionamento quanto no registro de evento. Os parâmetros não são utilizados para persistência ou HTTP. A UI de provisionamento também passa o código do pedido para gravação NDEF, enquanto a versão integrada utiliza a referência emitida pela API.

Isso não equivale ao contrato de negócio implementado no Expo. Os 16 testes do original concentram-se em sessão e renderização; o sucesso dessas verificações não comprova provisionamento real.

**Fundamento e trade-off:** a prioridade decorre do requisito local de integridade, identificado por cenário. Manter demonstração simulada pode ajudar desenvolvimento; utilizá-la como confirmação operacional quebra a expectativa observada no produto. Trata-se de adequação funcional, não de preferência de estilo. [FSA, capítulo 5](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch05.html).

**Melhoria:** retirar o original do caminho operacional se o Expo for a base oficial. Se uma demonstração simulada ainda for necessária, isolá-la em um ambiente explicitamente de demonstração. Se o original precisar continuar ativo, integrar o mesmo contrato real antes de tratá-lo como equivalente.

**Critério de aceite:** nenhum fluxo operacional informa sucesso apenas por esperar um timer; a documentação distingue claramente demonstração, integração HTTP e validação física.

### A03 — Abstrações vazias e código sem consumidores mantêm uma arquitetura aparente

**Prioridade:** P2. **Constatação confirmada para as bases; candidatos a remoção identificados por busca estática.**

No Expo, [BaseApplication](C:/src/Nova-tag-expo/src/appplication/base/index.ts:1), [interfaces base](C:/src/Nova-tag-expo/src/appplication/base/interface/index.ts:1) e [BaseService](C:/src/Nova-tag-expo/src/infra/services/base/index.ts:1) não oferecem comportamento compartilhado. No original, a herança do serviço também não acrescenta funcionalidade.

No Expo, a busca em `src` não encontrou consumidores atuais de `ResponsePadrao`, do antigo formulário `IdentificarPedido` ou dos tipos antigos de etapas. `TraceabilityWorkflow.prepare/send` tem uso nos testes examinados, mas não foi encontrado no fluxo atual de produção; a captura real utiliza a fila offline.

**Fundamento e trade-off:** abstrações especulativas também custam compreensão e manutenção. Remover reduz esse custo, mas pode exigir reintrodução se surgir uma necessidade real. Uma interface vazia não é defeito apenas por ser vazia; nestes casos não foi identificado contrato ou comportamento útil. [Fowler — YAGNI](https://martinfowler.com/bliki/Yagni.html).

**Melhoria:** remover bases vazias e confirmar a remoção dos candidatos por referências em todo o repositório. Escolher um único caminho de captura de produção. Se `prepare/send` tiver uma finalidade externa real, documentá-la; caso contrário, remover a API alternativa e adaptar os testes para o caminho utilizado.

**Critério de aceite:** cada abstração possui uma responsabilidade concreta e um consumidor; exemplos e testes exercitam o fluxo oficial. Remover código não pode eliminar comportamento coberto apenas porque não aparece na tela atual.

### A04 — A composição está espalhada em singletons importados pela UI

**Prioridade:** P2; é uma etapa habilitadora da reorganização. **Construção global e caminhos de acesso confirmados.**

No snapshot inicial, os módulos `infra/auth/runtime.ts`, `infra/traceability/runtime.ts`, `infra/offline/runtime.ts` e `infra/administration/runtime.ts` construíam dependências globais, importadas pela apresentação. Esses módulos foram removidos na correção das 31 exceções; a composição atual está em [createAppServices](C:/src/Nova-tag-expo/src/bootstrap/create-app-services.ts:1).

Os providers permitem substituir alguns managers, mas isso não substitui automaticamente todos os singletons. Por exemplo, a [tela de evento](C:/src/Nova-tag-expo/src/views/Eventos/Etapas/index.tsx:26) usa o provider offline e também lê diretamente `sessionManager` e `installationId`. Um teste que injeta apenas o provider pode montar dependências de sessões diferentes.

Além disso, `captureContext()` decide permissão de captura a partir de perfil e validade de sessão dentro de `infra`. A construção de dependências e a política de aplicação ficam no mesmo lugar.

**Fundamento e trade-off:** instância global única pode ser adequada, inclusive para arbitrar NFC. O problema concreto é haver caminhos diferentes para obter dependências relacionadas. Composição explícita melhora substituição em testes e visibilidade, com custo de passagem de contratos. Não se exige criar várias instâncias em produção. [Cockburn — isolamento por portas](https://alistair.cockburn.us/hexagonal-architecture).

**Melhoria:** criar uma fábrica `createAppServices()` em `bootstrap`, instanciada uma vez na entrada do app. Entregar serviços por um provider sem default global silencioso. Mover a decisão de permissão para uma política pura de aplicação. Manter um único árbitro de sessão NFC para leitura, diagnóstico e administração.

**Critério de aceite:** duas instâncias de teste podem coexistir sem compartilhar sessão, fila ou timers por acidente; telas não importam `infra/*/runtime`; a composição é o único lugar que escolhe adaptadores concretos.

### A05 — O workflow de rastreabilidade virou um ponto central com funções diferentes

**Prioridade:** P2. **Constatação confirmada.**

[TraceabilityWorkflow](C:/src/Nova-tag-expo/src/appplication/traceability/workflow.ts:19) reúne tipos de pedidos e histórico, validação de entrada, porta genérica `Api`, construção de rotas HTTP, recuperação de respostas perdidas, registro/ativação/encerramento de vínculo e preparação/envio de eventos. O arquivo recebe 18 dependências de importação no levantamento, incluindo imports de tipos.

A interface `Api`, definida no workflow de rastreabilidade, é utilizada também por offline, administração e experimentação. Esses módulos precisam conhecer um arquivo funcional de rastreabilidade para obter um contrato genérico de comunicação.

**Fundamento e trade-off:** a avaliação é de coesão por responsabilidade. Extrair o contrato compartilhado reduz conhecimento acidental entre capacidades; dividir cada operação em classe separada aumentaria navegação e coordenação. Não foi calculada uma métrica formal de coesão para este arquivo. [FSA, capítulo 8](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch08.html).

**Melhoria:** separar por responsabilidade: consultas de pedidos/histórico, operações de vínculo e políticas puras de ativação. Mover a porta genérica de requisição autenticada para um módulo neutro de aplicação. Para os endpoints de negócio, introduzir gateways pequenos por capacidade e mover paths/DTOs para adaptadores HTTP conforme o fluxo for migrado.

Não é necessário criar uma classe e uma interface para cada método. Um módulo coeso de operações de vínculo e outro de consultas podem ser suficientes. Um gateway deve esconder contrato externo ou permitir substituição útil, e não apenas repetir assinaturas.

**Critério de aceite:** administração não instancia `new TraceabilityWorkflow(...)` apenas para validar ou ativar; políticas puras podem ser usadas diretamente; trocar uma rota HTTP não exige alterar a regra de ativação.

### A06 — Telas coordenam operações e mantêm estados combináveis demais

**Prioridade:** P2 para extração de apresentação; preservação das garantias críticas é condição da mudança. **Responsabilidades e estados locais confirmados.**

A [tela administrativa](C:/src/Nova-tag-expo/src/views/Provisionar/Administracao/index.tsx:80) tem 950 linhas. Além do JSX, mantém conta/API/token, geração de requisição, exclusão de execução, plano, progresso, diário, leitura física, recuperação, ativação e encerramento. A [tela de provisionamento](C:/src/Nova-tag-expo/src/views/Provisionar/Etapas/index.tsx:29) combina `mode`, pedido, leitura, vínculo, `verified`, `confirmed` e `busy`. A tela de histórico coordena consulta, paginação, filtro e descarte de respostas antigas.

São decisões de fluxo importantes escondidas entre estados locais e renderização. Cada nova ação precisa lembrar quais estados limpar e quais resultados antigos ignorar.

**Fundamento e trade-off:** Presentation Model separa comportamento de apresentação dos controles visuais e facilita seu teste. Acrescenta sincronização e um contrato entre tela/modelo. A justificativa aqui são os efeitos e estados observados; 950 linhas não são um limite de violação. Um hook que só recebe o código inteiro não resolve a responsabilidade. [Fowler — Presentation Model](https://martinfowler.com/eaaDev/PresentationModel.html).

**Melhoria:** extrair um controller/hook por fluxo, com estado discriminado e transições nomeadas. A tela deve renderizar o estado e disparar intenções. Regras críticas de identidade, persistência e repetição continuam na aplicação, mesmo que a UI também desabilite botões.

Exemplo de estado para provisionamento, a ajustar ao comportamento real:

```ts
type ProvisioningState =
  | {step: 'select-order'}
  | {step: 'read-tag'; order: OrderSummary}
  | {step: 'review'; order: OrderSummary; reading: Reading}
  | {step: 'configure'; provisioning: Provisioning; reading: Reading}
  | {step: 'active'; provisioning: Provisioning};
```

Esse modelo reduz combinações sem significado. Atividades transitórias e erro precisam ter escopo explícito, sem recolocar todos os campos opcionais em um objeto gigante.

**Critério de aceite:** é possível testar troca de conta, cancelamento e retomada sem renderizar toda a tela; a UI não decide que um comando físico pode ser repetido; o estado determina quais ações existem.

### A07 — Componentes compartilhados dependem de telas e de um módulo chamado Tracking

**Prioridade:** P2. **Constatação confirmada.**

[Tracking/index.tsx](C:/src/Nova-tag-expo/src/components/Tracking/index.tsx:11) importa labels de `views` e exporta botão, cabeçalho, detalhes expansíveis, etapas, painéis e jornada do pedido. Recebe 31 dependências de importação no levantamento. [Base/Botao](C:/src/Nova-tag-expo/src/components/Base/Botao/index.tsx:3) depende desse módulo para obter um botão genérico.

[HistoryTimeline](C:/src/Nova-tag-expo/src/components/Tracking/HistoryTimeline.tsx:4) e [DecisionDetails](C:/src/Nova-tag-expo/src/components/Tracking/DecisionDetails.tsx:6) também importam labels de telas. A tela de evento importa `captureStatus` diretamente de `views/Envios`. Isso inverte a ideia de reutilização: o compartilhado passa a depender dos seus consumidores.

O `SessionGate` importar a tela de login também aparece no levantamento, mas é outro caso: ele compõe a entrada autenticada. Deve ser classificado como composição do app, sem ser tratado como um componente genérico de design.

**Fundamento e trade-off:** um componente lógico precisa ter escopo coerente com seus consumidores. Separar UI genérica de rastreio reduz dependência acidental, mas criar um design system público completo acrescentaria governança sem demanda demonstrada. Um módulo local com exportações claras é suficiente como primeiro passo. [FSA, capítulo 8](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch08.html).

**Melhoria:** mover controles de design para `components/ui`; manter jornada, evidência SDM e detalhes de decisão como componentes da funcionalidade de rastreio; colocar labels e formatação em um módulo de apresentação da funcionalidade. Mover `captureStatus` para esse módulo, fora da tela. Usar um único botão público com contrato próprio.

**Critério de aceite:** componentes genéricos não importam `views`, domínio logístico ou runtime; telas não exportam funções consumidas por outras telas; o nome do módulo corresponde à sua finalidade.

### A08 — O fluxo administrativo extrai um código de erro de uma mensagem formatada

**Prioridade:** P1. **Constatação confirmada; defeito de contrato, sem incidente reproduzido.**

Em [BlockingFailure.describeFailure](C:/src/Nova-tag-expo/src/components/Nfc/BlockingFailure.tsx:8), uma expressão regular extrai `Código: ALGUM_CODIGO.` do final da mensagem. A [tela administrativa](C:/src/Nova-tag-expo/src/views/Provisionar/Administracao/index.tsx:369) usa o resultado para decidir se apresenta a ação específica de resolver pendência.

Uma mudança de redação, pontuação ou tradução pode alterar uma decisão de fluxo. O código técnico é transformado em texto e depois reconstruído para ser usado como dado.

**Fundamento e trade-off:** a dependência de uma convenção textual compartilhada é observável. A proposta reduz a superfície de mudanças simultâneas necessárias, ao custo de carregar um campo estruturado adicional. Este é um diagnóstico aplicado de acoplamento, não uma afirmação de que o livro discute este componente ou esta regex. [FSA, capítulo 3](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch03.html).

**Melhoria:** manter erro estruturado, por exemplo `{code, message, recoverable, cause}`, no estado da apresentação. Passar `code` diretamente ao diálogo e aos seletores de ações. Formatar o texto somente na renderização.

**Critério de aceite:** trocar a mensagem exibida não altera as ações de recuperação; erro desconhecido mantém uma saída genérica segura; não há regex de mensagem determinando transições.

### A09 — Tipos de domínio, portas e DTOs estão misturados

**Prioridade:** P2. **Constatação confirmada.**

[domain/auth/types](C:/src/Nova-tag-expo/src/appplication/auth/session-decoder.ts:1) contém sessão, armazenamento, transporte HTTP, erro e política de URL. `domain/offline/types` agrega entidades, estados, leases e uma porta de persistência ampla. `domain/administration/types` inclui plano, transporte, store, verificações do contrato e validação de APDU. Tipos de pedidos e histórico ficam no workflow de aplicação.

Isso não invalida o núcleo, e uma porta em domínio não é automaticamente uma violação. O problema é a falta de um critério consistente: procurar “o contrato do pedido” ou “a dependência da captura” exige conhecer a história de cada arquivo.

**Fundamento e trade-off:** a direção entre política e detalhe deve ser explícita no desenho adotado. Separar modelo interno e formato externo é útil quando suas necessidades divergem; duplicar cada tipo por camada sem conversão ou independência real cria repasse. Os nomes exatos das pastas são convenção local. [Martin — fronteiras e dados](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).

**Melhoria:** definir uma convenção única: conceitos e invariantes em domínio; portas de casos de uso em aplicação; formatos de rede e conversão nos adaptadores; estado e texto de tela na apresentação. Manter tipos pequenos juntos quando mudam pela mesma razão.

O domínio do mobile não precisa reproduzir os agregados do backend. A API continua responsável por autorização final, validação criptográfica SDM e transições logísticas. No mobile fazem sentido evidência de leitura, estado da captura, compatibilidade do perfil e invariantes de recuperação.

**Critério de aceite:** localizar um conceito não depende de abrir um workflow gigante; contratos HTTP não vazam para componentes genéricos; não se criam entidades/classes apenas para atender ao nome de uma camada.

### A10 — A tipagem de respostas HTTP não valida os dados recebidos

**Prioridade:** P1 para fronteiras de decisão; P2 para consultas comuns. **Constatação confirmada.**

[HttpTransport.send](C:/src/Nova-tag-expo/src/infra/auth/http-transport.ts:33) verifica o envelope, mas retorna `envelope.dados as T`. O parâmetro genérico não valida a forma de `dados` em execução. Existem validações locais mais fortes em administração e no processamento de lote offline, o que é positivo, mas a proteção não é uniforme.

Também há `JSON.parse` de payloads persistidos sem decoder específico em todas as leituras. O schema relacional protege parte das invariantes; não valida toda a estrutura dos documentos JSON nem garante compatibilidade com uma futura versão do app.

**Fundamento e trade-off:** a documentação do TypeScript confirma que assertions não inserem verificações em execução. Decoders acrescentam código/custo de validação; priorizar as fronteiras de efeitos e confirmação concentra esse custo onde uma resposta malformada teria maior consequência. Não há evidência de corrupção efetiva nesta análise. [TypeScript Handbook — Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions).

**Melhoria:** tratar dados externos como `unknown`, decodificar no adaptador de cada operação e produzir tipos internos válidos. Reaproveitar as validações administrativas existentes. Para JSON persistido, usar formato versionado quando houver evolução e erro controlado que preserve o registro original.

Começar por ativação, vínculo, decisões e lote. Pode ser feito com funções pequenas; não depende de instalar uma biblioteca de schema.

**Critério de aceite:** resposta com campos ausentes ou estados desconhecidos produz erro de contrato antes de mudar a UI, confirmar envio ou executar NFC; dado incompatível permanece disponível para diagnóstico/recuperação.

### A11 — Identidade e concorrência são protegidas com padrões diferentes em cada fluxo

**Prioridade:** P1. **Assimetria confirmada; cenários adicionais propostos para teste.**

O SessionManager verifica a geração de cada request. Offline prende o envio a usuário e API. Administração faz verificações de contexto ao longo da operação. Em contrapartida, métodos de vínculo do TraceabilityWorkflow fazem várias requisições sequenciais e nem todos recebem um escopo esperado de usuário/API.

Por exemplo, `register()` consulta pedido, consulta UID e cria vínculo sem um objeto de escopo único passado a todas as chamadas. `activate()` também não recebe esse escopo. A garantia por request não expressa, por si só, que todas as etapas de uma intenção pertencem à mesma conta/API entre um `await` e outro.

**Melhoria:** criar um escopo de operação imutável para casos de uso que atravessam várias chamadas, com validação antes de efeitos relevantes. Usar o mesmo padrão conceitual para captura, vínculo e administração, respeitando suas necessidades diferentes. Cancelamento de tela e invalidação de identidade devem ser mecanismos explícitos.

Não foi reproduzida gravação sob outra conta nesta análise. O achado é a ausência de uma garantia uniforme visível no contrato de alguns fluxos.

**Fundamento e trade-off:** o impacto de atribuição incorreta justifica teste direcionado; a probabilidade permanece desconhecida. Escopo explícito pode rejeitar uma operação após mudança de sessão e exigir retomada. Esse custo é preferível à continuidade ambígua, desde que a recuperação preserve efeitos já ocorridos. [FSA, capítulo 22](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch22.html).

**Critério de aceite:** testes trocando usuário/API entre consulta e escrita mostram interrupção da intenção; resultados tardios não atualizam uma tela de outro contexto; dados já persistidos não são descartados.

### A12 — Instrumentação experimental atravessa leitura, fila, UI e schema

**Prioridade:** P2. **Acoplamento confirmado; parte dele é intencional.**

[Leitor](C:/src/Nova-tag-expo/src/components/Nfc/Leitor/index.tsx:73) abre/finaliza tentativas e administra timeout do ensaio. O OfflineCoordinator conhece o ExperimentJournal concreto por tipo, registra estágios e consulta se a comunicação está liberada. O store de capturas importa schema e inserção experimental; o journal SQLite importa o tipo de conexão do store de capturas.

Há dependências recíprocas de tipos entre offline e experimentação e entre os adaptadores SQLite. Isso aumenta o acoplamento conceitual; não demonstra, sozinho, um ciclo problemático em execução.

**Fundamento e trade-off:** granularidade menor não garante modularidade melhor. Separar registro e captura sem a transação exigida pioraria a integridade. A interface proposta só é útil se remover conhecimento acidental preservando a unidade de commit; mantê-los juntos é alternativa válida. [FSA, capítulo 3](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch03.html).

**Melhoria:** definir uma porta pequena e explícita de instrumentação de captura, separando política do ensaio, relógio e armazenamento. Um caso de uso de leitura pode cuidar dos estágios; o componente visual apenas apresenta o resultado.

**Preservação obrigatória:** a associação atômica entre captura e registro experimental, a durabilidade das tentativas e a liberação controlada de comunicação não podem ser substituídas por eventos em memória sem garantia. Operação comum e ensaio devem ter política explícita para falha de instrumentação; não presumir que ela sempre pode ser ignorada.

**Critério de aceite:** a aplicação de captura depende de um contrato reduzido; testes do ensaio continuam provando atomicidade e recuperação; um componente de leitura não precisa montar toda a fila para funcionar.

### A13 — SQLite compartilhado fica escondido dentro da funcionalidade offline

**Prioridade:** P2. **Constatação confirmada.**

A interface `SqlConnection` é definida no store offline. O [banco administrativo](C:/src/Nova-tag-expo/src/infra/administration/database.ts:1) importa tanto essa interface quanto `sqliteConnection` de `infra/offline/database`. O [adaptador de conexão](C:/src/Nova-tag-expo/src/infra/offline/database.ts:3) possui fila de transações em escopo de módulo, compartilhada por conexões criadas por ele.

Há dois bancos distintos, e versões/migrations já existem: capturas em versão 2 e administração em versão 1. O problema não é ausência de migrations; é a propriedade inadequada de uma capacidade técnica compartilhada e o crescimento do schema junto com os repositórios.

**Fundamento e trade-off:** o contrato de conexão tem consumidores além da capacidade offline. Dar-lhe um módulo técnico pequeno explicita essa relação. Unificar todos os bancos reduziria algumas peças, mas mudaria isolamento e migração sem benefício medido; não é recomendado por esta evidência. [FSA, capítulo 8](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch08.html).

**Melhoria:** mover interface/adaptador de conexão para `infra/sqlite` e declarar migrations por banco. Tornar explícito se a serialização é por banco ou global; medir antes de mudar essa garantia. Manter os bancos separados enquanto suas políticas e ciclos de vida forem diferentes.

**Critério de aceite:** administração não importa detalhes do store offline; banco versão anterior abre sem perda; downgrade incompatível falha de forma controlada; gatilhos de imutabilidade e ordem dos commits continuam preservados.

### A14 — Lint protege parte das camadas, mas não o desenho completo

**Prioridade:** P2. **Constatação confirmada.**

O [lint original](C:/src/Nova-tag/.eslintrc.js:1) não tem regra de fronteiras. O [lint Expo](C:/src/Nova-tag-expo/.eslintrc.js:4) proíbe várias dependências de UI/infra dentro de domínio e aplicação. Essa proteção é real e passou na execução local.

Entretanto, a regra não define domínio versus aplicação, não impede React puro por nome, não controla imports de runtimes nas telas nem diferencia componentes genéricos de componentes de funcionalidade. A presença de `require()` para módulos nativos também exige regras que considerem mais que `import` estático. O lint atual não impede os problemas A04 e A07.

**Fundamento e trade-off:** governança verifica características escolhidas. Um check de dependência pode ser uma fitness function quando protege uma decisão arquitetural explícita; proibir imports só por convenção cria falsos positivos e custo de exceções. Aplicar primeiro aos limites acordados. [FSA, capítulo 6](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html), [Ford et al. — Fitness Functions](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/ch02.html).

**Melhoria:** formalizar uma matriz pequena de dependências e aplicar verificações compatíveis com imports, reexports e carregamentos dinâmicos relevantes. Separar dependência de tipo de execução ao analisar ciclos. A composição pode depender de adaptadores e aplicação; isso é uma exceção estrutural legítima e deve estar explícita.

**Critério de aceite:** um import inválido introduzido de propósito falha no check; casos permitidos de composição e adaptadores continuam válidos; não se proíbe toda dependência `infra -> application`, pois adaptadores implementam portas da aplicação.

### A15 — Nomes e representações duplicadas aumentam a tradução mental

**Prioridade:** P2 para tipos de estado; P3 para nomenclatura. **Constatação confirmada.**

A pasta é `appplication`, com três letras `p`, nas duas versões. Há convenções mistas de idioma, caixa e nome, como `PedidoEtiqueta`, `traceability`, `Provisionar`, `types` e vários `index.ts`.

A estratégia aparece como [enum numérico de UI](C:/src/Nova-tag-expo/src/domain/enums/estrategiasNFC.ts:1), com UID/NDEF, e como união textual `Strategy`, com UID/NDEF/SDM. O evento e o estado de pedido também usam `string` em contratos onde existem conjuntos conhecidos. Algumas diferenças são necessárias porque a tela oferece só um subconjunto; hoje isso aparece como conversão espalhada.

**Fundamento e trade-off:** o ganho procurado é consistência dos contratos. Rename e idioma são convenções; não há base para declará-los defeitos arquiteturais por si só. Renomear agora gera churn em imports e branches; pode ser adiado sem comprometer integridade. [FSA, capítulo 21 — decisão justificada](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch21.html).

**Melhoria:** adotar um vocabulário consistente para o código novo e renomear `appplication` em mudança mecânica isolada. Representar subconjuntos de estratégia explicitamente, com mapeamento único. Tipar os estados conhecidos nas fronteiras já validadas, mantendo tratamento deliberado de valores futuros onde necessário.

Usar nomes como `provisioning.ts`, `history.ts` e `ports.ts` para implementações centrais. Reservar `index.ts` principalmente para a entrada pública de uma pasta. Não é necessário traduzir todo o projeto de uma vez.

**Critério de aceite:** não há conversões numéricas implícitas para estratégia; os nomes facilitam localizar implementações; o rename não altera comportamento nem inclui refatorações funcionais no mesmo diff.

### A16 — Listagens e consultas têm custos que precisam de limites explícitos

**Prioridade:** P2 se o volume crescer; P3 no uso pequeno de bancada. **Estrutura confirmada; impacto de desempenho não medido.**

[Envios](C:/src/Nova-tag-expo/src/views/Envios/index.tsx:177) renderiza todos os itens carregados com `.map`; o histórico acumula páginas e também usa `.map` dentro da tela com ScrollView. O workflow percorre páginas de pedidos para localizar um código e pode percorrer várias páginas de eventos para achar registros de um vínculo específico.

**Fundamento e trade-off:** desempenho precisa de definição e medição. Paginação/virtualização mudam navegação, acessibilidade e cache; antecipá-las sem volume esperado pode aumentar complexidade sem ganho. Primeiro medir, depois escolher intervenção. [FSA, capítulo 6](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html).

**Melhoria:** estabelecer o volume esperado, paginar a consulta local da fila, virtualizar listagens extensas e separar contadores de carregamento integral. Avaliar filtro por vínculo e busca exata por código no backend quando a medição justificar. Definir retenção/exportação sem apagar registros pendentes ou comprovantes necessários ao ensaio.

**Critério de aceite:** medir uma massa representativa e verificar memória/resposta de navegação; manter ordenação por pedido e semântica de histórico. Não há evidência suficiente nesta revisão para afirmar que o app já esteja lento por esse motivo.

### A17 — Documentação e automação não formam uma fonte única do estado atual

**Prioridade:** P2. **Divergências locais confirmadas.**

O [README original](C:/src/Nova-tag/README.md:1) ainda é essencialmente o template do React Native. O [README Expo](C:/src/Nova-tag-expo/README.md:1) começa com a branch de secure messaging, mas também mantém um trecho dizendo que a branch atual é a de reproducibilidade e uma seção geral dizendo que o app não altera chaves, apesar da administração candidata descrita no início. O [status local](C:/src/Nova-tag-expo/docs/10-estado-do-projeto.md:1) reúne resultados de várias etapas, com números históricos diferentes dos testes atuais.

Guias históricos são úteis, mas precisam ser identificados como históricos. Uma limitação de um fluxo manual não deve parecer uma limitação de todos os fluxos do app.

Os workflows locais das duas versões usam somente `workflow_dispatch`. Portanto, o arquivo atual não configura execução automática por PR/push. O estado de habilitação remota não foi consultado.

**Fundamento e trade-off:** decisões registradas devem preservar motivação e consequências. ADRs curtos ajudam a equipe a revisitar escolhas; documentação adicional tem custo de atualização. Este relatório é diagnóstico, e não substitui o histórico de decisões aceitas. CI automática é uma política proposta, com custo de execução e falsos positivos a controlar. [Nygard — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

**Melhoria:** definir um documento curto de arquitetura atual, um de operação/limitações por fluxo e um status datado. Manter histórico em seções claramente separadas. Quando autorizado operacionalmente, habilitar checks automáticos baratos por PR, sem build remoto pago ou execução física automática. Organizar testes puros, SQLite, UI e contratos de API pelos requisitos de execução.

**Critério de aceite:** um novo colaborador identifica em poucos minutos qual branch/fluxo deve usar e como testar; README não afirma capacidades incompatíveis entre si; uma futura PR pode verificar as fronteiras sem depender de build nativo.

## 6. Alternativas arquiteturais e proposta para o contexto

### 6.1. Particionamento técnico versus por capacidade

O capítulo 10 descreve organização horizontal por responsabilidade técnica; o capítulo 11 apresenta organização por domínio em uma unidade de implantação. Nenhum deles implica que nomes `domain/application/infra` comprovem um estilo ou que uma reorganização física resolva suas fronteiras. [FSA, capítulo 10](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch10.html), [capítulo 11](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch11.html).

A transposição abaixo é uma proposta para o cliente mobile. O sistema completo inclui API, banco e aparelho; chamar o app isolado de “monólito modular” não descreve a arquitetura de todo o sistema.

| Alternativa | Benefício neste código | Custo/risco neste código | Quando escolher |
| --- | --- | --- | --- |
| Manter camadas globais, com contratos explícitos | Menor movimentação; aproveita separação pura existente | Uma mudança de funcionalidade continua atravessando pastas técnicas | Se a organização atual permitir entender e alterar fluxos com poucos pontos de contato |
| Agrupar por capacidade, com detalhes internos quando necessários | Aproxima tela, estado e operações que mudam juntos | Migração de imports; risco de duplicar portas/UI e esconder dependências em exportações | Se o piloto mostrar que a distância entre arquivos técnicos dificulta mudanças reais |
| Criar muitas interfaces/classes e uma camada por papel em toda função | Pode uniformizar contratos | Mais repasse e navegação; não foi demonstrada demanda para essa granularidade | Não justificado pelo estado observado |

**Decisão proposta, sujeita à validação:** manter um cliente mobile com módulos lógicos explícitos; começar pelo fluxo de vínculo, separar seu estado de apresentação e suas fronteiras externas, e medir o impacto da extração. Não realizar uma migração geral de pastas antes desse piloto. A hipótese é reduzir conhecimento acidental sem enfraquecer captura, sessão ou RF.

**Condição de revisão:** se alterações no mesmo fluxo continuarem exigindo conhecimento de muitos módulos técnicos ou contratos cruzados, preferir agrupamento por capacidade. Se a extração apenas acrescentar repasses, consolidar os módulos. A preferência inicial por preservar diretórios é uma estratégia de migração, não uma arquitetura superior provada.

### 6.2. Uma opção transitória de organização

A árvore a seguir mostra onde cada responsabilidade poderia ficar mantendo o particionamento técnico atual. Ela é ilustrativa e não uma prescrição de *Fundamentals*.

```text
src/
  bootstrap/
    create-app-services.ts
    AppServicesProvider.tsx
    AppLifecycle.tsx

  application/                  # rename de appplication
    auth/                      # sessão e política de capacidades
    traceability/
      queries.ts               # pedidos e histórico
      provisioning.ts          # registrar, ativar e encerrar vínculo
      ports.ts                 # contratos realmente usados pelos casos de uso
    offline/                   # captura e sincronização recuperável
    administration/            # execução e recuperação administrativa
    experimentation/           # regras do ensaio e seus estágios
    nfc/                       # coordenação independente do SDK
    ports/                     # somente capacidades realmente transversais

  domain/
    auth/
    traceability/              # evidência, vínculo e políticas puras locais
    offline/                   # estados e invariantes da captura
    administration/            # invariantes de operação/comando
    experimentation/
    nfc/                       # formatos e decodificadores puros

  infra/
    http/                      # fetch, gateways, DTOs e decoders
    auth/                      # armazenamento seguro
    sqlite/                    # conexão e execução de migrations
    offline/                   # persistência de capturas/cache
    administration/            # persistência do diário administrativo
    experimentation/
    nfc/                       # adaptação do SDK nativo

  views/                       # apresentação dos fluxos
    Provisionar/               # tela + controller/hook + partes locais coesas
    Eventos/
    Historico/
    Envios/
    Login/

  components/
    ui/                        # Button, Screen, Stack, Details, StatusPanel
    traceability/              # componentes compartilhados desta funcionalidade

  navigation/                  # composição de rotas; tipos em módulo sem telas
  theme/                       # tokens e tema
```

Esta árvore é um destino de responsabilidades, não uma exigência de criar todas as pastas e arquivos agora. Módulos pequenos podem ficar em um arquivo. Uma pasta `ports` só se justifica onde existirem contratos reais.

Uma alternativa após o piloto seria agrupar a capacidade, por exemplo `modules/provisioning/{presentation,application,domain,adapters}`, preservando o mesmo contrato externo. Não se deve criar as quatro subpastas quando um único módulo coeso for suficiente. A escolha deve seguir as razões de mudança, os consumidores e as garantias, e não simetria visual da árvore.

### 6.3. Matriz de dependências proposta para o núcleo isolável

Esta matriz aplica a decisão de isolar o núcleo por portas. É uma política proposta para este projeto. Em uma arquitetura em camadas tradicional, as permissões poderiam ser diferentes. A regra de dependência para dentro é atribuída a [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), não apresentada como lei de todos os estilos do livro.

| Origem | Dependências permitidas | Evitar |
| --- | --- | --- |
| Domínio | Domínio e primitivas puras | React, navegação, aplicação, HTTP concreto, SQLite, Expo |
| Aplicação | Domínio e portas de aplicação | Adaptadores concretos, telas e SDKs nativos |
| Adaptadores | Domínio, portas/tipos de aplicação e SDK necessário | Telas e construção global do app |
| Componentes genéricos de UI | React Native, biblioteca visual e tema | Runtime, sessão, API e conceitos logísticos |
| Apresentação de funcionalidade | Contratos/casos de uso e componentes visuais | Construção de serviços e acesso direto ao SDK |
| Bootstrap | Aplicação, infraestrutura e composição React | Regras de negócio escondidas em factories |
| Navegação | Tipos de rota e telas | Tornar telas fornecedoras de contratos para o núcleo |

O fluxo de execução pode chegar à infraestrutura, mas o caso de uso recebe uma porta. Não é necessário um container de injeção de dependências; composição manual tipada atende ao tamanho atual.

### 6.4. Exemplo de fronteira de vínculo

```text
ProvisioningScreen
  -> controller do fluxo
     -> operações de vínculo
        -> política pura de ativação
        -> ProvisioningGateway
           -> adaptador HTTP + decoder de resposta

bootstrap cria e conecta os objetos
```

Uma operação longa recebe contexto explícito. O adaptador sabe qual endpoint chamar; a política sabe se a leitura corresponde ao vínculo; o controller sabe o que a tela apresenta a seguir.

### 6.5. Granularidade: quando uma extração se justifica

Usar os seguintes critérios de revisão no piloto:

1. **Razão de mudança:** texto/layout, contrato HTTP e protocolo RF mudam por motivos diferentes no código examinado.
2. **Conhecimento:** o consumidor precisa saber a forma do transporte ou só o resultado da operação?
3. **Garantia:** a divisão preserva transação, identidade e ordem dos efeitos?
4. **Utilidade:** o módulo extraído permite teste ou alteração independente que hoje é difícil?
5. **Custo:** quantos contratos, conversões e saltos adicionais foram criados?

São critérios operacionais desta revisão para avaliar o desenho, não uma lista reproduzida do livro. Por eles, extrair erro estruturado tem benefício concreto; transformar cada setter da tela em serviço não tem justificativa demonstrada. A manutenção de abstrações sem necessidade atual também deve considerar seu custo. [Fowler — YAGNI](https://martinfowler.com/bliki/Yagni.html).

## 7. O que juntar, dividir, mover e remover

| Elemento atual | Ação recomendada | Motivo |
| --- | --- | --- |
| Bases vazias e interfaces marcadoras | Remover | Não representam comportamento nem capacidade |
| Modelos/DTOs/validações quase idênticos no fluxo legado | Consolidar o que for mantido | Reduzir camadas de repasse sem tradução real |
| `VStack`, `HStack` e `Stack` | Manter, possivelmente próximos no mesmo módulo | API visual pequena, usada e com finalidade clara |
| Funções puras de NDEF, Type 4 e file settings | Manter separadas por protocolo/responsabilidade | Possuem lógica real e testes próprios |
| Runtimes que constroem serviços | Mover para composição única | Tornar o grafo de dependências visível |
| Permissões decididas nos runtimes | Mover para política de aplicação | Facilitar reuso e teste sem Expo |
| `Tracking/index.tsx` | Dividir em UI genérica e rastreio | Hoje reúne abstrações que mudam por motivos distintos |
| `SetupControls` | Separar controles genéricos da recuperação administrativa | Evitar que checkbox/radio dependa do assunto NFC |
| Tela administrativa | Extrair controller e seções coesas | Separar coordenação e renderização |
| TraceabilityWorkflow | Separar consultas, vínculo e políticas | Evitar dependência central de tipos/HTTP/regras |
| OfflineCoordinator | Manter fachada e extrair política de retry/lote/captura quando útil | Simplificar sem perder uma autoridade de sincronização |
| AdministrationCoordinator | Manter autoridade de execução; extrair partes com contrato claro | Preservar a ordem dos efeitos físicos |
| Conexão SQL dentro de offline | Mover para adaptador SQLite compartilhado | Administração e experimento já a utilizam |
| `prepare/send` de captura online | Confirmar necessidade e remover se obsoleto | Evitar um caminho futuro que contorne a fila |

O objetivo não é maximizar nem minimizar o número de arquivos. Uma divisão é útil quando permite entender, testar ou alterar uma responsabilidade sem carregar as demais.

## 8. Plano incremental de execução

**Atualização após a correção das 31 exceções:** composição e fronteiras do Expo já foram corrigidas nos limites da seção 16. Isso não encerra a qualidade da apresentação. A seção 17 amplia esta fase com uma auditoria de estado, efeitos, concorrência e padrões de React Native nos dois checkouts. Para o próximo trabalho, executar a sequência da seção 17.5; ela detalha e reordena a Fase 3 e o item de listagens da Fase 4. Os demais itens abaixo continuam como backlog, com conclusão limitada às evidências registradas.

**Complemento sobre contratos e domínio:** a seção 18 detalha a mistura encontrada nos arquivos `types.ts`. Sua separação por responsabilidade integra a Fase 2 e deve acompanhar as funcionalidades da Fase 3. Não criar reducers ou hooks novos dependendo novamente desses arquivos agregadores. A separação estrutural não autoriza remover validações existentes nem proibir regras condicionais legítimas no domínio.

### Fase 0 — Fixar a base e as garantias

1. Formalizar Expo como linha de evolução e explicar o papel do worktree original.
2. Registrar o estado das alterações locais do Expo antes de iniciar refatoração; não misturar mudanças em andamento com uma reorganização grande.
3. Preservar uma referência reproduzível de testes, fonte e contrato da API.
4. Transformar os invariantes da seção 9 em critérios de revisão.

**Saída:** base identificada, responsabilidade de cada worktree documentada e cenários de regressão definidos.

### Fase 1 — Remover ambiguidade com baixo risco

1. Remover as bases vazias e resíduos confirmados sem consumidor.
2. Agendar o rename de `appplication` como tarefa mecânica opcional, incluindo scripts, testes e lint; não bloquear a correção de contratos por nomenclatura.
3. Extrair labels, `captureStatus` e tipos de rota dos arquivos que também montam telas.
4. Corrigir README e criar a matriz mínima de dependências.
5. Substituir a interpretação de código dentro de mensagem por erro estruturado.

**Saída:** estrutura com menos ruído e fluxo administrativo independente da redação de erros.

### Fase 2 — Tornar dependências e fronteiras explícitas

1. Criar uma composição explícita dos serviços do fluxo piloto, preservando uma instância de produção onde necessário.
2. Migrar uma funcionalidade por vez para receber os serviços, começando por consultas de histórico, depois vínculo e captura.
3. Extrair porta de requisição autenticada do workflow e políticas puras de ativação/permissão.
4. Introduzir decoders nos endpoints migrados e contexto imutável nas operações de várias etapas.
5. Separar modelos, portas, contratos externos, decoders, erros e políticas hoje reunidos em `types.ts`, seguindo a matriz e os aceites da seção 18. Migrar consumidores reais por funcionalidade; não apenas trocar um arquivo grande por um barrel que reexporta tudo.

**Saída:** testes conseguem montar todo o fluxo com dependências consistentes, e a UI deixa de escolher runtimes.

### Fase 3 — Reduzir coordenação nas telas

1. Corrigir primeiro respostas assíncronas obsoletas, dependências omitidas e separação de escopo no painel experimental, conforme RN01/RN02.
2. Extrair estado e transições de provisionamento como piloto de reducer puro e união discriminada; preservar estado local simples onde ele é adequado.
3. Migrar histórico/paginação e captura de evento, distinguindo estado remoto, estado de interação e evidência durável.
4. Refatorar administração em passos pequenos, mantendo o coordinator como autoridade de efeitos e checkpoints; não duplicar sua máquina de operação na UI.
5. Revisar foco, background, descarte e integração dos efeitos com sistemas externos; preservar os efeitos necessários de sessão, conectividade e NFC.
6. Consolidar componentes de UI e adotar listas virtualizadas onde os itens se acumulam, sem aninhar listas verticais em um ScrollView vertical.
7. Ampliar os checks de hooks com testes positivos/negativos e executar os cenários de aceitação da seção 17 antes de considerar esta fase concluída.

**Saída:** telas descrevem a interface; controllers descrevem interação; aplicação descreve os efeitos permitidos.

### Fase 4 — Organizar durabilidade e instrumentação

1. Mover conexão SQLite e organizar migrations por banco, sem alterar semântica no mesmo passo.
2. Delimitar a porta de instrumentação, mantendo as transações necessárias.
3. Revisar serialização/versionamento de JSON e recuperação de dados incompatíveis.
4. Medir listagens com massa representativa e só então otimizar paginação/virtualização.
5. Adicionar verificação automática das fronteiras na política de CI escolhida pelo projeto.

**Saída:** persistência e ensaio continuam recuperáveis e deixam de depender da disposição histórica das pastas.

### Backlog sugerido

Tamanhos relativos: **P** = mudança localizada; **M** = envolve alguns módulos; **G** = atravessa fluxo/persistência e exige várias verificações. Não são estimativas de prazo.

| Ordem | Trabalho | Prioridade | Tamanho | Dependência | Aceite principal |
| --- | --- | --- | --- | --- | --- |
| 1 | Oficializar base Expo e distinguir capacidades por fluxo | P1 | P | Nenhuma | README sem ambiguidade operacional |
| 2 | Erro administrativo estruturado | P1 | P | Nenhuma | Mensagem não determina ação |
| 3 | Bases vazias e resíduos | P2 | P | Base definida | Sem API de produção abandonada |
| 4 | Rename mecânico e convenção | P3 | M | Estado local estabilizado | Tipos/lint/testes passam |
| 5 | Labels, tipos de rota e UI compartilhada | P2 | M | Nenhuma | Compartilhado sem import de telas |
| 6 | Composição explícita e política de capacidades | P2 | M | Base definida | Dependências consistentes nas telas migradas |
| 7 | Contexto de operação e decoders de vínculo/decisão | P1 | M | Composição | Troca de conta interrompe intenção |
| 8 | Separar consultas/vínculo do workflow | P2 | M | Portas definidas | Alteração HTTP isolada do domínio |
| 9 | Controllers/estados de provisionamento, evento e histórico | P2 | M | Serviços injetáveis | Cenários sem renderizar tela inteira |
| 10 | Controller e seções administrativas | P2 | G | Erros/contexto definidos | Nenhuma regressão de efeitos RF |
| 11 | Adaptador SQLite e migrations | P2 | M | Baseline de durabilidade | Upgrade preserva fila e diário |
| 12 | Porta de instrumentação | P2 | G | Contratos de captura claros | Atomicidade e liberação preservadas |
| 13 | Fronteiras verificáveis e checks por PR | P2 | M | Matriz definida | Import inválido falha no check |
| 14 | Limites de fila/listagens e busca | P2/P3 | M | Medição de volume | Comportamento aceitável com massa realista |

## 9. Invariantes que a refatoração não pode quebrar

1. **Confirmação local significa commit durável.** Uma tela não pode dizer que salvou antes da persistência da captura.
2. **Reenvio preserva a captura.** UUID, horário, bytes, referência, operador, API e época não mudam durante retry.
3. **Troca de conta/API não reatribui registros.** Uma captura só é enviada no escopo original autorizado.
4. **Recibo original não é a projeção atual.** Reconciliação atualiza decisão corrente, preservando a resposta original.
5. **Sucesso de transporte não é autorização logística.** Captura armazenada pode estar pendente, rejeitada ou tardia.
6. **Referência inválida não vira UID silenciosamente.** O fallback não pode aceitar outra interpretação de evidência SDM/NDEF inválida.
7. **Só existe uma sessão NFC ativa.** Exclusividade inclui limpeza e encerramento nativo.
8. **Operação física não tem retry genérico.** Intenção vem antes do comando; resposta persistida vem antes da submissão HTTP; tentativa física incerta exige recuperação própria.
9. **Ativação administrativa exige conferência e leitura no fluxo previsto.** Resposta perdida pode reutilizar evidência salva conforme o protocolo; não inventar uma nova captura para aparentar recuperação.
10. **Instrumentação preserva fronteiras temporais e atomicidade.** Refatorar componentes não pode deslocar medidas ou transformar ausência de medida em sucesso.
11. **Atualização do app preserva registros existentes.** Migrations não apagam fila/diário para facilitar compatibilidade.
12. **A API continua autoridade final.** O mobile não passa a autenticar criptograficamente SDM ou autorizar movimentação apenas por ter validado o formato.

## 10. Estratégia de testes para as melhorias

O Expo já possui testes relevantes. A prioridade é reaproveitá-los e cobrir fronteiras alteradas, evitando criar testes que só repetem a implementação.

| Tipo | O que verificar | Exemplos existentes a preservar |
| --- | --- | --- |
| Políticas puras | Compatibilidade de leitura/vínculo, decisões, capacidades e retry | SDM, NDEF, Type 4 e estados de decisão |
| Aplicação | Troca de conta entre etapas, recuperação, cancelamento e ordenação de efeitos | SessionManager, OfflineQueue, AdministrationCoordinator |
| SQLite real | Reabrir banco, migrations, leases, recibos e triggers | OfflineQueue, AdministrationStore, ExperimentJournal |
| Contrato HTTP | Envelope e dados inválidos, estados novos, erros e respostas perdidas | Estender os testes atuais do transporte e workflows |
| Controller de apresentação | Transições possíveis, resultados tardios e reset por contexto | Extrair de testes de telas sem perder cenários |
| UI | Ação correta, acessibilidade, loading, erro e confirmação | Onboarding, navegação e recuperação administrativa |
| Integração API/mobile | UUID estável, lote, idempotência e reconciliação com servidor real | Roteiros já documentados; não executados nesta revisão |
| Aparelho/etiqueta | SDK nativo, ciclo de vida, RF, leitura e escrita física | Aceite físico separado dos testes Jest |

Casos adicionais prioritários:

- Trocar API/usuário entre busca de pedido e criação do vínculo.
- Receber sucesso HTTP com `dados` incompletos e comprovar que não houve confirmação indevida.
- Alterar a mensagem de um erro mantendo seu código e obter a mesma ação de recuperação.
- Montar dois apps de teste com serviços diferentes e comprovar isolamento.
- Abrir bancos de versões anteriores sem perder captura, recibo nem tentativa administrativa.
- Cancelar/desmontar tela durante resultado tardio, preservando a resposta física que já ocorreu.

Não é necessário instalar biblioteca de estado, gerenciador de dependências ou framework adicional de arquitetura para executar esse plano.

## 11. Verificações executadas nesta análise

Ambiente observado: Node.js `v24.18.0`, npm `11.16.0`, Windows/PowerShell.

Os resultados abaixo foram obtidos na etapa de inspeção do código, antes desta revisão de fundamentação. A revisão alterou somente este relatório e validou suas referências/estrutura; as suítes não foram repetidas por uma alteração documental.

| Checkout | Comando | Resultado |
| --- | --- | --- |
| Original | `npm run typecheck` | Passou |
| Original | `npm run lint` | Passou |
| Original | `npm test -- --runInBand` | 2 suítes passaram e 1 falhou; 15 testes passaram e 1 excedeu timeout de 5 segundos |
| Original | `npm test -- --runInBand __tests__/Login.test.tsx` | Reexecução isolada: 2 testes passaram |
| Expo | `npm run typecheck` | Passou |
| Expo | `npm run lint` | Passou |
| Expo | `npm test -- --runInBand` | 31 suítes e 308 testes passaram |

As suítes dos dois checkouts foram iniciadas em paralelo na primeira execução. A falha do original ocorreu no primeiro teste de login; a reexecução isolada passou. Isso indica sensibilidade a tempo/ambiente, mas não demonstra sua causa. A suíte completa do original não foi repetida, portanto não é correto registrá-la como integralmente verde nesta revisão.

No Expo houve warnings de `Surface` do React Native Paper sobre sombra com `overflow: hidden`. Eles não fizeram a suíte falhar. Vale revisar os componentes que os produzem quando forem alterados; não há evidência aqui de erro funcional decorrente deles.

Não foram executados `expo export`, build nativo, EAS, testes contra API/PostgreSQL nem ensaio físico. Os resultados Jest não validam criptografia, configuração real da etiqueta ou comportamento nativo no aparelho.

## 12. Critério de conclusão da reorganização

A reorganização pode ser considerada bem-sucedida quando as decisões propostas forem aceitas e seus cenários verificados:

- O Expo é a referência clara de evolução e o papel do original está documentado.
- Domínio/aplicação permanecem independentes de UI e adaptadores concretos.
- A construção das dependências pode ser entendida em um ponto de composição.
- Telas não importam runtimes concretos e não coordenam diretamente protocolos de recuperação.
- Componentes genéricos não dependem de telas, sessão ou rastreabilidade.
- Erros, estratégias e estados são dados explícitos, sem decisões baseadas em texto formatado.
- Respostas de rede são validadas antes de produzir estados internos confiáveis.
- Não restam bases vazias ou fluxos alternativos de produção sem finalidade conhecida.
- Migrations e testes preservam captura, recibo, diário e ordem dos efeitos físicos.
- As regras de dependência podem falhar automaticamente quando alguém as viola.

O resultado esperado é conseguir seguir uma alteração de ponta a ponta com poucas decisões de navegação: encontrar a tela, seu controller, a operação de aplicação e o adaptador envolvido. Isso exige dar propriedade às responsabilidades existentes e preservar as garantias de recuperação que o Expo já implementa.

## 13. Riscos, medidas e decisões verificáveis

### 13.1. Prioridade de trabalho não equivale a risco medido

O capítulo 22 apresenta avaliação de risco por impacto e probabilidade. Aplicar uma fórmula sem evidência para uma das dimensões apenas daria precisão aparente à opinião. Nesta revisão, os cenários não reproduzidos mantêm probabilidade desconhecida. [FSA, capítulo 22](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch22.html).

| Situação | Fato disponível | Consequência possível | Exposição/probabilidade conhecida | Próximo passo |
| --- | --- | --- | --- | --- |
| A02 — sucesso simulado | O método retorna sucesso após timer | Operador acreditar em registro inexistente | Determinístico ao executar esse stub; uso operacional do original não foi verificado | Identificar o alvo oficial e isolar demonstração |
| A08 — código reconstruído de mensagem | Regex participa da escolha de ação | Mudança editorial remover ação de recuperação | Dependência confirmada; frequência de mudança desse texto desconhecida | Passar código separado e testar alteração de redação |
| A10 — cast genérico de resposta | Envelope validado, conteúdo tratado como `T` | Estado interno confiar em resposta incompatível | Payload incompatível não foi observado | Injetar respostas inválidas nas fronteiras críticas |
| A11 — escopo entre várias chamadas | Garantias diferentes por fluxo | Etapas de uma intenção cruzarem mudança de contexto | Cenário não reproduzido | Trocar conta/API entre awaits em teste |
| A12 — extração de instrumentação | Captura e estágio têm compromisso atômico | Refatoração perder associação ou ordem temporal | Não há perda demonstrada; há garantia existente a preservar | Testes de interrupção antes/depois de cada commit |
| A16 — listagens crescentes | Renderização integral e busca por páginas | Degradação com massa maior | Volume e impacto não medidos | Definir cenário e medir antes de otimizar |

A01/A04/A05/A06/A07/A09/A13/A14 são principalmente problemas ou oportunidades estruturais; o impacto operacional precisa ser demonstrado por cenário. A15 inclui convenções. Uma tela extensa não recebe prioridade crítica só por suas linhas.

### 13.2. Fitness functions propostas

O uso aqui é proteger características com verificações recorrentes, conforme a governança discutida no capítulo 6. A definição de avaliação objetiva de uma característica é verificada também no texto dos autores de *Building Evolutionary Architectures*. Os checks abaixo são propostas para o Nova-Tag, ainda não implementadas nesta revisão. [FSA, capítulo 6](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html), [Ford, Parsons e Kua — Fitness Functions](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/ch02.html).

| ID | Característica protegida | Verificação | Critério proposto | Limitação |
| --- | --- | --- | --- | --- |
| FF01 | Independência do núcleo | Análise de imports/reexports/requires nas fronteiras acordadas | Zero dependências proibidas após aceitar a matriz | Não detecta semântica escondida em DTOs |
| FF02 | Integridade da captura | Commit, resposta perdida, retry e reabertura de SQLite | Mesmos identificadores/evidência e recibo original preservado | Não comprova fidelidade do SDK nativo |
| FF03 | Isolamento de identidade | Mudança de usuário/API durante caso de uso | Nenhuma nova etapa emitida pelo cliente após detectar escopo divergente; efeitos já emitidos são reconciliados | Precisa injetar mudança em cada fronteira relevante; cancelar a UI não desfaz commit do servidor |
| FF04 | Recuperabilidade RF | Interromper após intenção, após resposta e após ACK | Comando físico incerto não é repetido cegamente | Hardware e servidor precisam de aceites próprios |
| FF05 | Contrato e apresentação | Resposta inválida e erro com mensagem modificada | Confirmação bloqueada por contrato; ação depende de código | Não substitui teste de experiência no aparelho |
| FF06 | Compatibilidade de dados | Abrir bancos anteriores suportados | Contagem, payloads e invariantes preservados | Conjunto de versões suportadas precisa ser declarado |
| FF07 | Modificabilidade | Revisar uma alteração real de layout, HTTP e política | Mudança fica na responsabilidade prevista ou explicita exceção | Não é razoável impor um número universal de arquivos |
| FF08 | Desempenho | Medir fila/histórico com massa acordada | Orçamento de tempo/memória definido após baseline | Meta ainda não estabelecida, sem alegar aprovação |

Os testes existentes da seção 11 são evidência de comportamento; não demonstram que todo esse catálogo já esteja atendido. Antes de automatizar FF01, testar o próprio check com um import proibido intencional e um caso de composição permitido.

### 13.3. Registro de decisão proposto para o piloto

O capítulo 21 relaciona decisões com informação, justificativa, registro e comunicação. Para registrar uma decisão concreta, o formato abaixo adapta o ADR de Nygard. [FSA, capítulo 21](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch21.html), [Nygard — ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

**ADR-P01 — Isolamento do fluxo de vínculo**

- **Status:** proposto; não equivale a aprovação da refatoração.
- **Contexto:** consultas, registro, ativação e recuperação hoje dividem um workflow, e parte da coordenação fica na tela. O núcleo Expo já admite dependências substituíveis em outros fluxos.
- **Decisão proposta:** extrair estado de apresentação do vínculo, contrato externo mínimo e política pura de ativação; construir o conjunto em um ponto explícito. Preservar as demais pastas durante o piloto.
- **Alternativas:** manter o desenho com documentação; agrupar imediatamente todo o app por capacidade; criar uma camada/interface para cada operação.
- **Consequência positiva esperada:** testar transições e mudança de contexto sem montar a UI completa; alterar transporte sem tocar na política.
- **Consequência negativa:** mais um contrato, adaptação dos testes e risco de duplicação temporária na migração.
- **Validação:** FF01, FF03 e FF05, mais regressões atuais de vínculo/ativação. Registrar se a mudança acrescentou repasses sem melhorar isolamento.
- **Revisão:** consolidar a extração se não houver ganho; considerar agrupamento por capacidade se o piloto mostrar que a dispersão técnica continua dificultando alterações.

O próximo trabalho deve executar e avaliar esse piloto. Criar toda a árvore ilustrada sem testar a hipótese não é um critério de sucesso arquitetural.

## 14. Referências bibliográficas e técnicas

Todas as fontes web abaixo foram consultadas em 23/10/2026. São fontes do editor, dos autores ou da documentação oficial. A análise de código, os cenários e as escolhas específicas do Nova-Tag são interpretações aplicadas deste relatório.

1. RICHARDS, Mark; FORD, Neal. *Fundamentals of Software Architecture*. 2. ed. O'Reilly Media, 2025. [Registro oficial e sumário](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/). Capítulos consultados por trechos públicos: [3 — Modularity](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch03.html), [5 — Identifying Architectural Characteristics](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch05.html), [6 — Measuring and Governing Architecture Characteristics](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html), [8 — Component-Based Thinking](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch08.html), [10 — Layered Architecture Style](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch10.html), [11 — Modular Monolith](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch11.html), [21 — Architectural Decisions](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch21.html), [22 — Analyzing Architecture Risk](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch22.html), [27 — The Laws of Software Architecture, Revisited](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch27.html).
2. COCKBURN, Alistair. *Hexagonal Architecture: the original 2005 article*. 2005. [Texto do autor](https://alistair.cockburn.us/hexagonal-architecture). Fundamenta isolamento da aplicação em relação a dispositivos, UI e armazenamento por portas/adaptadores.
3. MARTIN, Robert C. *The Clean Architecture*. 2012. [Texto do autor](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Referência específica para direção de dependências e dados atravessando fronteiras.
4. FOWLER, Martin. *Presentation Model*. 2004. [Texto do autor](https://martinfowler.com/eaaDev/PresentationModel.html). Fundamenta a alternativa de separar estado/comportamento de apresentação e seu custo de sincronização; a adaptação a hooks é proposta local.
5. FOWLER, Martin. *YAGNI*. 2015. [Texto do autor](https://martinfowler.com/bliki/Yagni.html). Fundamenta a cautela com capacidade/abstração antecipada sem necessidade atual.
6. NYGARD, Michael. *Documenting Architecture Decisions*. 2011. [Texto do autor](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions). Referência para contexto, decisão, status e consequências do ADR proposto.
7. FORD, Neal; PARSONS, Rebecca; KUA, Patrick. *Building Evolutionary Architectures*. O'Reilly Media, 2017. Capítulo 2, [Fitness Functions — trecho oficial](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/ch02.html). Apoio à formulação dos checks propostos.
8. TYPESCRIPT. *Handbook: Everyday Types — Type Assertions*. [Documentação oficial](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions). Sustenta o fato técnico de que `as T` não adiciona validação de execução.

## 15. Implementação das proteções contra regressão

Por solicitação posterior, foram adicionados checks de fronteira AST, ciclos de execução, I/O concreto, supressões críticas e tipo `any`, testes de violações intencionais e verificação de não crescimento das exceções contra a base Git. `npm run lint` e `npm test` passaram a executar proteções; `npm run verify` reúne lint, tipos e testes. O job de qualidade por PR foi preparado sem build nativo/EAS.

Na implantação inicial, o inventário explícito preservava 31 declarações legadas no Expo e 8 no original. Isso permitiu bloquear novas regressões antes da refatoração de A01/A04/A07/A12. As 31 do Expo foram posteriormente corrigidas, como registrado na seção 16; as 8 do original permanecem. Imports removidos exigem remover sua exceção; ampliar a declaração não é coberto pela entrada anterior. A primeira introdução do inventário exige revisão, pois a base anterior não contém a política.

O detalhamento executável e as limitações estão em [verificações de arquitetura](C:/src/Nova-tag-expo/docs/architecture-checks.md). Os resultados da seção 11 são o diagnóstico inicial; a validação da implementação dos checks é registrada na entrega correspondente. A proteção de merge no GitHub depende de Actions habilitado e job obrigatório na branch; não foi configurada remotamente.

## 16. Correção das 31 exceções do Expo

As 31 dependências registradas foram eliminadas, com `exceptions.json` vazio. As regras de lint, o analisador arquitetural e os seus testes de violações permaneceram intactos. Esta etapa corrige essas fronteiras; não declara encerradas todas as propostas do relatório, como reduzir a coordenação da tela administrativa ou reorganizar o workflow de rastreabilidade.

| Grupo corrigido | Responsabilidade atual | Evidência |
| --- | --- | --- |
| Construção e escolha de serviços antes feitas por imports de runtime | Uma fábrica por instância do app; providers sem fallback global | [Composição](C:/src/Nova-tag-expo/src/bootstrap/create-app-services.ts:1), [contrato](C:/src/Nova-tag-expo/src/appplication/ports/app-services.ts:1), [provider](C:/src/Nova-tag-expo/src/components/Services/AppServicesProvider.tsx:1) |
| SDK de NFC, rede, UUID e configuração acessados pelas telas | Portas injetadas; SDKs nos adaptadores e selecionados no bootstrap | [Adaptador de rede](C:/src/Nova-tag-expo/src/infra/network/connectivity.ts:1), [políticas de contexto](C:/src/Nova-tag-expo/src/appplication/auth/operation-context.ts:1) |
| Botão genérico dentro de Tracking | UI independente de conceitos logísticos | [ActionButton](C:/src/Nova-tag-expo/src/components/ui/ActionButton.tsx:1) |
| Labels em views e status exportado por Envios | Formatação de apresentação compartilhada fora das telas | [Labels](C:/src/Nova-tag-expo/src/components/Tracking/labels.ts:1), [status](C:/src/Nova-tag-expo/src/components/Tracking/capture-status.ts:1) |
| Tipo visual de toast em infra | API e implementação visual pertencem ao módulo de UI | [Toast](C:/src/Nova-tag-expo/src/components/Base/Toast/types.ts:1) |

Os testes de interface passaram a receber o grafo explicitamente, preservando seus cenários e assertions. Novos testes cobrem isolamento de sessão/transporte/armazenamento, resolução pelo provider, retomada e descarte da conectividade, política de captura e bloqueio administrativo quando a sessão muda. A ordem dos commits de captura/APDU e a exclusividade física continuam nos componentes existentes responsáveis por essas garantias.

A lista vazia também é protegida por teste, evitando reintrodução de dívida durante a primeira publicação da política. O procedimento de verificação e o registro de resultados estão em [architecture-checks.md](C:/src/Nova-tag-expo/docs/architecture-checks.md).

Validação final desta etapa: `npm run verify` aprovado, incluindo lint, tipos, 47 testes do verificador e 317 testes Jest em 34 suítes. O analisador verificou 102 arquivos sem exceções ou novas violações. Os hashes dos cinco arquivos de política/testes permaneceram iguais aos do início da refatoração. A exportação local do bundle iOS também passou; não houve build nativo ou ensaio físico.

## 17. Ampliação do plano: estado, efeitos e padrões de React Native

**Diagnóstico de 23/10/2026, posterior à seção 16. A execução posterior no Expo está registrada na seção 19; os achados abaixo preservam o retrato usado para planejar a mudança.** Escopo comparativo mantido: original e Expo, com prioridade de execução no Expo. Nenhuma conclusão abaixo depende de impor um número máximo de hooks. Resolver fronteiras de importação não resolve automaticamente estado inconsistente, respostas obsoletas, comportamento de teclado ou custo de renderização.

### 17.1. Critério técnico e inventário

O referencial arquitetural permanece *Fundamentals of Software Architecture*, 2ª edição, nos limites de acesso declarados na seção 0. Coesão, acoplamento e governança orientam a separação de responsabilidades; as recomendações específicas de hooks e componentes nativos abaixo vêm da documentação oficial de React, React Native e React Navigation. A escolha do reducer e a ordem das tarefas são propostas aplicadas ao código observado, não prescrições atribuídas ao livro. [FSA — modularidade](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch03.html), [FSA — governança](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/ch06.html).

Inventário de chamadas sintáticas em `src/**/*.ts` e `src/**/*.tsx`, obtido por AST TypeScript, incluindo `React.useState` e chamadas diretas, excluindo testes e dependências. A contagem não resolve aliases arbitrários e não mede quantos hooks executam em uma renderização.

| Indicador | Original | Expo |
| --- | ---: | ---: |
| Arquivos TS/TSX examinados | 52 | 102 |
| Chamadas `useState` | 12 | 99 |
| Chamadas `useEffect` | 3 | 13 |
| Chamadas `useLayoutEffect` | 0 | 1 |
| Chamadas `useFocusEffect` | 0 | 3 |
| Chamadas `useSyncExternalStore` | 2 | 4 |
| Chamadas `useReducer` | 0 | 0 |

No Expo, Administração concentra 19 chamadas de estado; Provisionar/Etapas, 10; Histórico e ExperimentPanel, 9 cada; OrderSelect, Gerenciar e Login, 7 cada. Esses números servem para localizar revisão, não para ranquear qualidade. O original tem menos funcionalidades, portanto a quantidade menor não comprova desenho melhor. Login pode ter campos independentes legítimos; a mesma quantidade em um protocolo com transições acopladas exige outro julgamento.

Diretriz: calcular valores derivados durante renderização; manter comandos ligados à interação em handlers; usar efeitos para sincronização externa com descarte adequado. Não mover comandos de escrita para efeitos para reduzir handlers. [React — efeitos desnecessários](https://react.dev/learn/you-might-not-need-an-effect).

### 17.2. Achados concretos e correção proposta

**RN01 — P1: ExperimentPanel mistura consulta remota, espelho local e ações sem invalidação uniforme.** Em [ExperimentPanel](C:/src/Nova-tag-expo/src/components/Offline/ExperimentPanel.tsx:38), `refresh()` publica `journal.state()` sem conferir se a conta ou seleção ainda é a mesma. O efeito protege `installationId()` com `active`, mas chama `refresh()` sem essa proteção. `loadRuns`, `loadPlans` e `action` também publicam resultados após `await` sem token de geração. O pedido autenticado recebe usuário/API esperados, o que é uma proteção existente; isso não invalida automaticamente um resultado já retornado enquanto a interface muda de escopo. Há uma janela potencial para dados/mensagens antigos substituírem a seleção atual; não foi reproduzida em aparelho nesta revisão.

Correção proposta: mover consultas e comandos experimentais para uma API de aplicação tipada, deixando de construir caminhos HTTP no componente. Criar um hook de apresentação com identidade de consulta explícita, geração por escopo/seleção e publicação condicionada ao escopo atual. Se o journal passar a oferecer assinatura, avaliar leitura por snapshot estável; não inventar uma assinatura fictícia para usar outro hook. **Aceite:** resposta da conta A não altera a tela da conta B; seleção mais recente vence; desmontagem/falta de foco descarta publicação; nenhum comando liberador é repetido por um efeito.

**RN02 — P1: dependências do efeito foram silenciadas no painel experimental.** A [linha de dependências](C:/src/Nova-tag-expo/src/components/Offline/ExperimentPanel.tsx:61) contém `eslint-disable-line react-hooks/exhaustive-deps`; o efeito usa `installationId` e `refresh` sem declará-los. A configuração efetiva já trata `exhaustive-deps` como erro, mas a diretiva permite ignorar esse diagnóstico. Correção: reorganizar a sincronização, declarar dependências reais e remover a supressão, junto com RN01. Não acrescentar callbacks instáveis à lista sem revisar a responsabilidade, pois isso pode recriar a sincronização a cada render. **Aceite:** serviços substituídos em teste são respeitados, sem ciclos de carregamento ou diretivas que ocultem o problema. [React — lint de hooks](https://react.dev/reference/eslint-plugin-react-hooks).

**RN03 — P1: estado de interação administrativa fragmentado e espelhos por ref.** Em [Administração](C:/src/Nova-tag-expo/src/views/Provisionar/Administracao/index.tsx:94), operação, materiais, confirmações, progresso, dialogs e erros têm setters independentes. A troca de escopo exige uma extensa sequência de resets no foco, a partir da linha 215. `tagRef` e `opRef` espelham estado e são escritos durante renderização. Existem cercas de geração, exclusão de operação e cancelamento; devem ser preservadas e revisadas, não descartadas como código inútil. O `finally` de `run` também merece teste de conclusão tardia, pois publica `setActivity(null)` fora da verificação de geração.

Correção: separar estado de formulário, consulta e interação operacional; modelar transições relacionadas em reducer puro com união discriminada. Manter checkpoint/APDU e reconciliação no coordinator. Não transportar cada setter para um hook gigante nem criar uma segunda autoridade para o estado durável. **Aceite:** uma única transição trata mudança de escopo; confirmação pertence à operação atual; retorno tardio não remove atividade de outra geração; nenhum estado visual autoriza comando que a aplicação rejeitaria. Reducers organizam atualizações e precisam ser puros; não executam NFC/HTTP. [React — useReducer](https://react.dev/reference/react/useReducer).

**RN04 — P2: provisionamento combina etapas e dados que deveriam transicionar juntos.** [Etapas Expo](C:/src/Nova-tag-expo/src/views/Provisionar/Etapas/index.tsx:35) mantém leitura, instante, vínculo, verificação, confirmação e modo separadamente. `register` calcula e armazena `verified`; mudanças posteriores de leitura/pedido exigem conferir todos os resets. O valor pode representar uma verificação associada a uma evidência anterior: não removê-lo como “derivado” sem definir essa associação. No [provisionamento original](C:/src/Nova-tag/src/views/Provisionar/Etapas/index.tsx:14) e no [evento original](C:/src/Nova-tag/src/views/Eventos/Etapas/index.tsx:22), etapa e dados opcionais também permitem representar fases sem os dados exigidos.

Correção: iniciar o piloto com eventos explícitos de seleção, leitura concluída, registro concluído e mudança de alvo. Agrupar leitura e instante no mesmo valor; ligar evidência verificada ao vínculo/leitura que a originou; derivar o que não tem significado independente. **Aceite:** trocar pedido/UID invalida confirmação e verificação anteriores; estados que exigem dados os carregam no tipo; renderização não inicia escrita física. Evitar estado contraditório ou duplicado é o critério, não substituir todo `useState`. [React — estrutura do estado](https://react.dev/learn/choosing-the-state-structure).

**RN05 — P2: consultas, paginação e navegação têm controle manual espalhado.** [OrderSelect](C:/src/Nova-tag-expo/src/components/Nfc/OrderSelect.tsx:82) já usa debounce e geração para descartar respostas antigas; essas proteções são corretas. Porém busca, paginação, erro, carregamento e repetição são coordenados no componente. [Histórico](C:/src/Nova-tag-expo/src/views/Historico/index.tsx:47) combina nove estados, parâmetros de rota e carregamento por foco; [Gerenciar](C:/src/Nova-tag-expo/src/views/Provisionar/Gerenciar/index.tsx:53) copia `provisioningId` para seleção via efeito. Histórico usa clones de seleção para provocar nova consulta. Esses mecanismos funcionam como protocolo implícito de recarga e precisam de um contrato de apresentação mais claro.

Correção: hooks por funcionalidade com parâmetros e comandos de `reload`/`loadMore`; estados de consulta que distingam primeiro carregamento, página adicional e falha. Definir a precedência entre alvo de rota e seleção local, evitando duas fontes sem regra. Usar foco quando a consulta depende da visibilidade; cancelar ou ignorar resultados após cleanup. Uma biblioteca de cache pode ser avaliada por custo/benefício, sem introdução obrigatória nesta tarefa. Se adotada, chave e descarte precisam considerar identidade/API, sem expor token em logs ou chaves persistidas. [React Navigation — foco e limpeza assíncrona](https://reactnavigation.org/docs/use-focus-effect/).

**RN06 — P2: listas acumulativas são renderizadas integralmente dentro de tela rolável.** [Histórico](C:/src/Nova-tag-expo/src/views/Historico/index.tsx:1) faz `entries.map` e concatena páginas; [OrderSelect](C:/src/Nova-tag-expo/src/components/Nfc/OrderSelect.tsx:132) acumula pedidos; [Envios](C:/src/Nova-tag-expo/src/views/Envios/index.tsx:157) faz `queue.items.map`. [Tela](C:/src/Nova-tag-expo/src/components/Base/Tela/index.tsx:55) usa ScrollView quando `scroll` é verdadeiro. Há risco estrutural de custo crescente, mas não há medição nesta etapa que permita declarar queda de FPS ou consumo específico.

Correção: nas telas de volume crescente, usar FlatList/SectionList como proprietária da rolagem, com cabeçalho/rodapé e chaves estáveis. OrderSelect precisa de uma composição de seleção paginada que não introduza uma lista vertical dentro do ScrollView vertical existente. Definir limite/consulta paginada da fila, caso o snapshot integral também se torne o gargalo. Manter ScrollView para formulários curtos e listas limitadas, como modelos de etiqueta. Medir em release antes de ajustar janelas ou adicionar memoização; usar `getItemLayout` apenas se as dimensões forem previsíveis. **Aceite:** paginação sem repetição/perda, foco e posição coerentes, layout com texto ampliado, perfil antes/depois com massa declarada. [React Native — listas](https://reactnative.dev/docs/flatlist), [configuração e custos](https://reactnative.dev/docs/optimizing-flatlist-configuration), [medição de desempenho](https://reactnative.dev/docs/performance).

**RN07 — P1 no original, P2 de consolidação no Expo: sessão NFC exige ciclo de vida próprio.** O [Leitor original](C:/src/Nova-tag/src/components/Nfc/Leitor/index.tsx:22) inicia o SDK na avaliação do módulo e inicia leitura/escrita no efeito. O timeout é limpo no cleanup, mas não no caminho de sucesso; callbacks após cancelamento e timeout concorrendo com conclusão precisam de teste. Uma nova execução do efeito pode provocar nova tentativa física. No [Leitor Expo](C:/src/Nova-tag-expo/src/components/Nfc/Leitor/index.tsx:54), a leitura já nasce de comando explícito e o efeito faz descarte, com proteções de montagem/cancelamento. É uma evolução que deve ser preservada.

Correção: no original, retirar inicialização física do import e encapsular aquisição, cancelamento e término em adaptador/controlador com resultado terminal único. Avaliar montagem, foco e background separadamente no Expo: uma tela pode continuar montada ao perder foco. Extrair coordenação experimental da apresentação quando houver um contrato que preserve os limites temporais atuais. **Aceite:** montagem/renderização não escreve etiqueta; um comando gera no máximo um término visível; blur/unmount/background não publicam resultado obsoleto; `inactive` do sheet iOS não é tratado como background real. Remontagem/cleanup podem ser exercitados em testes e em desenvolvimento com StrictMode, sem alegar validação RF. [React — StrictMode](https://react.dev/reference/react/StrictMode).

**RN08 — P2: semântica de controles, teclado e layout precisam entrar no aceite nativo.** [OrderOption](C:/src/Nova-tag-expo/src/components/Nfc/OrderSelect.tsx:31) declara papel de rádio e `checked: false`, mas o toque seleciona e troca a apresentação. Definir se é ação de selecionar/abrir (botão) ou parte de grupo de rádio com estado selecionado real. [ModelSelect](C:/src/Nova-tag-expo/src/components/Nfc/ModelSelect.tsx:26) guarda `custom` localmente enquanto recebe `value` controlado: uma alteração externa do valor pode deixar o modo visual antigo; definir o contrato de edição personalizada. [Login](C:/src/Nova-tag-expo/src/views/Login/index.tsx:52) usa `KeyboardAvoidingView` com `behavior="height"` nos dois sistemas; isso é uma escolha válida a validar, não uma falha comprovada. Outros formulários usam Tela sem política explícita de teclado.

Correção: testar teclado aberto nos campos finais/CTA, orientação e fonte ampliada; ajustar behavior/offset conforme evidência por plataforma e navigator. Revisar retorno Android, dialogs, anúncios de erro/progresso e foco acessível. Preservar o uso de safe-area-context e a integração já existente com altura da tab bar; não acrescentar insets em duplicidade. **Aceite:** usuário consegue alcançar campo e ação com teclado, VoiceOver/TalkBack recebem papel/estado corretos e o retorno fecha a etapa prevista. [React Native — teclado](https://reactnative.dev/docs/keyboardavoidingview), [acessibilidade](https://reactnative.dev/docs/accessibility).

### 17.3. O que manter e como decidir entre as alternativas

| Necessidade | Abordagem de partida | Aplicação ao Nova-Tag |
| --- | --- | --- |
| Campo de formulário, expansão ou senha visível | Estado local simples | Login, Details e opções; não criar store global para isso |
| Valor calculável com dados atuais | Cálculo durante renderização | `pending`/`logistics` de Envios já são derivados; não criar estados sincronizados para contagens |
| Etapas que mudam vários dados juntos | Reducer puro e união discriminada | Piloto de provisionamento, seguido de administração |
| Estado pertencente a serviço externo ao React | Assinatura/snapshot existente | Sessão e fila já usam `useSyncExternalStore`; conservar snapshots estáveis e unsubscribe |
| Consulta remota | Hook de consulta com chave e descarte por escopo | Pedidos, histórico e experimentos; cache apenas com requisito claro |
| Comando de usuário | Handler chama aplicação e publica resultado atual | Registrar, ativar, encerrar vínculo e liberar ensaio |
| Recurso nativo, listener ou timer | Efeito com setup/cleanup simétricos | AppState, conectividade, expiração e cancelamento NFC |
| Valor imperativo que não participa da UI | Ref com responsabilidade delimitada | Token de geração ou trava síncrona; não esconder estado visual em ref |

`useSyncExternalStore` é apropriado para assinatura de stores externos; não é substituto universal para estado de formulário. [React — store externo](https://react.dev/reference/react/useSyncExternalStore). Hooks de apresentação podem compartilhar coordenação, mas cada extração precisa de um contrato coeso e testes do comportamento que encapsula. Eles não pertencem a domínio/aplicação, que permanecem sem React. [React — custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks).

Manter, com revisão de idempotência/erros, os efeitos de [SessionProvider](C:/src/Nova-tag-expo/src/components/Auth/SessionProvider.tsx:17) e [OfflineProvider](C:/src/Nova-tag-expo/src/components/Offline/OfflineProvider.tsx:25): integram restore, expiração, assinatura, foreground e sincronização. Não desligar recuperação só para reduzir contagem de efeitos. O `useLayoutEffect` de [TabBar](C:/src/Nova-tag-expo/src/navigation/TabBar.tsx:22) informa altura zero quando a barra é escondida; sua necessidade é de layout e deve ser avaliada pelos testes de navegação.

O `useState` inicializador de [App](C:/src/Nova-tag-expo/src/App.tsx:30) mantém o grafo durante a montagem. Não substituir por `useMemo` como garantia de ciclo de vida; verificar que construir e descartar um grafo extra em desenvolvimento não realiza I/O nem deixa recursos ativos. A propriedade `services` tem semântica atual de valor inicial; se houver requisito de troca, criar um limite de montagem explícito e testado. Memoização generalizada, adoção de Zustand/Redux/XState/TanStack Query e React Compiler não são pré-requisitos para esta fase.

### 17.4. Proteção automática: lacunas verificadas e ampliação proposta

Configuração efetiva examinada com ESLint para ExperimentPanel: `react-hooks/rules-of-hooks` e `react-hooks/exhaustive-deps` já são erros. O plugin instalado no Expo é `eslint-plugin-react-hooks` 7.1.1 e disponibiliza `set-state-in-effect`, `refs`, `purity` e `immutability`, mas essas quatro regras não estão habilitadas na configuração atual. Não foi alterado lint nesta revisão documental. [React — regras disponíveis](https://react.dev/reference/eslint-plugin-react-hooks).

Plano de adoção:

1. Remover a supressão identificada em RN02 corrigindo a sincronização. Ampliar a proteção contra supressões de hooks no código de produção, com casos de teste que rejeitem a diretiva que hoje passa.
2. Executar diagnósticos das regras adicionais disponíveis, classificar os achados e corrigir por funcionalidade. Habilitar erros de maneira explícita com exemplos válidos/inválidos. Não usar as regras como justificativa para deslocar setters para microtasks, timers ou promessas artificiais.
3. Ao extrair wrappers de efeitos, verificar o suporte de `additionalEffectHooks` e configurar os nomes reais necessários; testar uma dependência omitida intencionalmente. Não assumir que renomear o efeito mantém a cobertura.
4. Preservar `verify` como gate de lint, tipos e comportamento; manter o inventário arquitetural vazio. As regras de imports não precisam ser relaxadas para permitir hooks dentro da camada de apresentação já classificada. Nova raiz em `src` exige decisão e classificação explícita.
5. Acrescentar testes de corrida e de transição abaixo; lint não demonstra isolamento temporal, ausência de duplicação física ou qualidade de layout nativo.

Não criar regra de “máximo de N useState/useEffect”, proibição geral de setter em handler ou requisito de `useCallback` em toda função. Essas métricas podem incentivar abstrações artificiais e não verificam o problema observado. Memoização entra após um caso de identidade necessário ou medição que a justifique.

### 17.5. Sequência revisada de execução e critérios de conclusão

| Ordem | Trabalho | Prioridade/tamanho | Dependência | Aceite verificável |
| --- | --- | --- | --- | --- |
| R1 | RN01/RN02: isolamento do painel experimental, API de aplicação e dependências corretas | P1/M | Composição existente | Resposta antiga não publica após troca de conta/alvo; supressão removida |
| R2 | RN04: piloto de transições de provisionamento | P2/M | R1 não é bloqueio técnico | Estados tipados, leitura/instante unidos, confirmação invalidada ao mudar evidência |
| R3 | RN03: reduzir coordenação administrativa por partes | P1/G | Contrato de transições de R2 avaliado | Mesma ordem de efeitos/checkpoints, escopo invalida UI, conclusão tardia não afeta outra operação |
| R4 | RN05: consultas de histórico e pedidos | P2/M | Padrão de consulta validado em R1 | Busca e paginação fora de ordem testadas, reload explícito, foco sem duplicações |
| R5 | RN06: rolagem/listas e limites de volume | P2/M | Contratos de R4; dados de referência | Lista de volume crescente virtualizada; comparação em release documentada |
| R6 | RN08: semântica, teclado, retorno e layout acessível | P2/M | Pode ocorrer com R2–R5 | Matriz Android/iOS, fonte ampliada e teclado; contrato de seleção coerente |
| R7 | RN07: ciclo de vida NFC do original e consolidação do Expo | P1/M no original | Decidir manutenção/migração do original | Sem I/O no import, sem escrita por montagem, término único e cancelamento testado |
| R8 | Regras adicionais de hooks e bloqueio das supressões | P1/M | Acompanha R1–R7 | Casos inválidos falham e casos legítimos passam, sem exceções novas |

Prioridade expressa o risco do achado; ordem expressa o percurso sugerido no Expo. Se o original continuar em uso operacional, antecipar R7. Se for apenas referência histórica, registrar isso e concentrar as correções na linha mantida. Não portar automaticamente toda abstração Expo para o original, nem considerar um fluxo original corrigido porque seu equivalente Expo mudou.

Testes necessários por comportamento, aproveitando as suítes existentes:

- Resolver consulta B antes de A e comprovar que A não substitui B; repetir para troca de usuário/API e seleção de experimento.
- Sair de foco/desmontar durante `await`; voltar com nova operação; a conclusão anterior não altera dados, erro ou atividade atuais.
- Exercitar transições válidas e recusadas do reducer, incluindo pedido/UID alterado, confirmação antiga e recuperação de resposta perdida.
- Disparar dois comandos na mesma janela de interação; preservar trava e idempotência da aplicação. Uma união discriminada não substitui exclusão de operações assíncronas.
- Setup → cleanup → setup de listeners/timers e ciclo de foco; nenhum recurso residual, nenhuma escrita administrativa originada por renderização. Usar recursos de teste compatíveis com o renderer instalado, sem assumir que um teste existente simula StrictMode integralmente.
- Paginar, falhar e repetir; manter identificadores estáveis, evitar duplicatas e distinguir falha inicial da falha da página adicional.
- Testar invariantes de apresentação sem replicar todos os setters; preservar os testes existentes de commit, UUID, recibo, owner e exclusividade física.

Para cada mudança de código: executar `npm run verify`; exportar bundle quando entrada/composição ou carregamento de módulos mudar. Testes JS e bundle não aprovam teclado, leitor de tela, desempenho em release ou RF. Registrar separadamente os resultados em aparelho; nenhum desses ensaios foi realizado nesta atualização.

**Conclusão desta revisão documental:** o plano passa a tratar a qualidade da apresentação como trabalho explícito, com oito grupos de correção, responsáveis por estado, efeitos, consultas e integração nativa. A base continua sendo o comportamento e a responsabilidade de cada módulo, e não a quantidade de hooks removidos. O baseline da seção 16 permanece histórico; os novos cenários e checks desta seção estão planejados.

## 18. Ampliação do plano: contratos, regras e responsabilidade dos arquivos de tipos

**Diagnóstico de 23/10/2026. Os arquivos citados nas tabelas foram posteriormente separados no Expo; links apontam para os sucessores e as contagens preservam o snapshot anterior. A execução está na seção 19.** A inspeção confirma a concentração de responsabilidades, sobretudo em administração e autenticação. A correção deve organizar por conceito e motivo de mudança; criar uma pasta genérica `types`, outra `validators` e outra `utils` para todo o projeto apenas deslocaria a dispersão.

### 18.1. O problema comprovado e o critério de avaliação

| Arquivo | Conteúdo observado | Evidência quantitativa por AST |
| --- | --- | --- |
| [Administração Expo](C:/src/Nova-tag-expo/src/appplication/administration/contracts/operation-decoder.ts:1) | Operação/plano, protocolo remoto, sessão RF local, persistência, erros, identidade, validação de resposta e allowlist APDU | 306 linhas, 11 interfaces, 2 aliases, 6 declarações de função e 1 classe; 28 instruções `if` |
| [Autenticação Expo](C:/src/Nova-tag-expo/src/appplication/auth/session-decoder.ts:1) | Usuário/sessão, transporte genérico, armazenamento, erro com status, política de URL e validação de sessão | 79 linhas, 4 interfaces, 1 alias, 2 funções e 1 classe |
| [Autenticação original](C:/src/Nova-tag/src/domain/auth/types.ts:1) | Mistura equivalente à do Expo, com diferenças no contrato de sessão | 75 linhas, 4 interfaces, 1 alias, 2 funções e 1 classe |
| [Fila Expo](C:/src/Nova-tag-expo/src/domain/offline/capture.ts:1) | Estados de transporte/negócio, captura, metadados experimentais, settlement, porta de persistência e erro | 97 linhas, 6 interfaces, 2 aliases e 1 classe; sem instruções `if` |
| [Experimento Expo](C:/src/Nova-tag-expo/src/domain/experimentation/plan.ts:1) | Plano, registro, tentativa, porta de armazenamento e relógio | 89 linhas, 6 interfaces; sem instruções `if` |
| [Rastreabilidade Expo](C:/src/Nova-tag-expo/src/domain/traceability/decision.ts:1) | Leitura, vínculo, observação e envelope de decisão com subcontratos aninhados | 68 linhas, 4 interfaces e 1 alias; sem instruções `if` |

Contagem restrita a declarações de nível superior e instruções `IfStatement` nos arquivos citados; não equivale a complexidade ciclomática. Os demais arquivos não possuem todos o mesmo problema: rastreabilidade contém apenas declarações, enquanto administração contém execução de protocolo. Tamanho e número de condicionais localizam revisão; não definem um limite universal de qualidade.

**O que será corrigido:** arquivos chamados `types.ts` não devem esconder execução, políticas e contratos de diferentes fronteiras. Isso é uma convenção proposta para este projeto, não uma exigência do compilador TypeScript. Módulos TypeScript podem conter valores executáveis e declarações de tipo. [TypeScript — módulos](https://www.typescriptlang.org/docs/handbook/2/modules.html).

**O que não é defeito por si só:** regras de domínio precisam expressar decisões e invariantes. `if`, guard clauses e `switch` podem ser a representação mais clara. Retirar todo comportamento do domínio para deixá-lo só com interfaces também não é objetivo arquitetural. Fowler discute os problemas de um modelo que se apresenta como domínio, mas não contém comportamento; isso não obriga converter estas funções puras em classes. [Fowler — Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html).

### 18.2. Divisão proposta por responsabilidade

A tabela define destinos por responsabilidade. Os nomes são uma proposta a validar com os consumidores; não são uma solicitação para gerar todos os arquivos antecipadamente. Preservar as raízes já classificadas pelo verificador.

| Conteúdo atual | Destino proposto | Critério |
| --- | --- | --- |
| `Role`, `User`, `Session` | `domain/auth/user.ts`, `domain/auth/session.ts`, ou um único módulo coeso se a separação não trouxer benefício | Modelo da identidade/sessão, sem transporte ou persistência |
| `SessionStorage`, `Transport` | `appplication/auth/ports/session-storage.ts`, `transport.ts` | Contratos requeridos pelo caso de uso; os SDKs continuam em infra |
| `normalizeApiUrl` | `appplication/auth/api-url-policy.ts` | Política de endpoint/configuração do cliente, incluindo `/api/v1` e modo de desenvolvimento |
| `isSession` | Decoder de sessão na fronteira de entrada usada por auth; distinto do decoder da resposta de login | Validar o formato persistido/recebido e produzir sessão válida; JSON/SDK ficam no adaptador |
| `SessionError` e erro com HTTP status | Erro de aplicação em auth; tradução de falhas HTTP no adaptador ou contrato de aplicação correspondente | Não fazer modelo de usuário depender de semântica HTTP |
| `AdminOperation`, `Personalization`, resultados físicos | Módulos coesos de operação/plano em `domain/administration` | Conceitos e invariantes administrativos; separar wire DTO se contrato externo exigir |
| `AdminContext` e marcador de sessão/estação | `appplication/administration/operation-context.ts` ou contrato de contexto já existente | Dados da execução autenticada, distintos da operação de negócio |
| `AdminReply`, `AdminCommand` como formato de comunicação | `appplication/administration/contracts/...` | Contrato do protocolo de aplicação; não presumir que toda resposta remota é entidade |
| Formato `unknown` → operação/resposta válida | Decoders coesos junto aos contratos de administração, consumidos na entrada remota e na reidratação local | Uma política de validação compartilhada, sem confiança antecipada em `request<T>` |
| `commandBytes` | Módulo explícito de protocolo NFC, por exemplo `domain/nfc/administrative-command.ts`, com contrato mínimo de entrada | Parser/allowlist puros, sem HTTP, SQLite ou SDK; testar comandos permitidos e rejeitados |
| `AdminRfSession`, `LocalCommand`, `AdminDraft`, `AdminActivation` | Contratos de diário/recuperação de aplicação separados por conjunto coeso | Checkpoint local não é o mesmo contrato que a operação retornada pela API |
| `AdminStore`, `CaptureStore`, `ExperimentStorage`, `MonotonicClock` | Portas junto às respectivas funcionalidades de aplicação | Contratos por consumidor; não transformar `ports/app-services.ts` em novo arquivo agregador |
| `sameOwner` | Política pura de identidade com nome e dono explícitos | Compartilhar apenas se a equivalência for a mesma em todos os fluxos; não juntar tipos só porque têm dois campos iguais |
| `errorCode` e erros de captura/administração | Contratos de falha e classificação junto à aplicação consumidora | Diferenciar erro externo, erro de contrato e recusa de regra; evitar um `errors.ts` global |
| Estados/captura/settlement da fila | Separar modelo da captura e contratos de entrega/checkpoint conforme o papel real | Estado do transporte e decisão logística não são a mesma dimensão |
| Plano/registro/tentativa experimental | Módulos por conceito em experimento; persistência e relógio nas portas | Preservar a transação conjunta de captura e registro quando exigida |

Portas de persistência no domínio podem ser uma escolha legítima quando expressam uma necessidade do próprio modelo. A proposta de movê-las à aplicação aqui decorre do conteúdo observado: lease, claim, retries, inicialização e checkpoints são coordenados pelos casos de uso. A direção de dependência e os contratos dos consumidores orientam a escolha; não basta aplicar o mesmo nome de pasta a tudo. [Martin — direção das dependências e dados nas fronteiras](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).

Um parser NFC puro pode permanecer como núcleo técnico isolável em `domain/nfc`, conforme o modelo atual do projeto. Ele não precisa ir para infraestrutura só por operar bytes. O SDK e a aquisição RF são adaptadores. Uma mudança futura da classificação desse núcleo requer decisão explícita, sem mistura com esta extração.

### 18.3. Revisão específica das decisões e validações

**TY01 — P1: separar decodificação, autorização e formato APDU em administração.** [assertOperation](C:/src/Nova-tag-expo/src/appplication/administration/contracts/operation-decoder.ts:1) valida formato, versão, personalização, status e correspondência de administrador em uma só condição extensa. [assertReply](C:/src/Nova-tag-expo/src/appplication/administration/contracts/operation-decoder.ts:1) combina formato de resposta, sessão esperada, transições de status e validação do comando. A função recebe um valor já declarado como tipo válido, apesar de atuar como defesa de dados externos.

Plano: decoders recebem `unknown`, validam os objetos aninhados e devolvem contratos válidos; a conferência de owner/sessão ocorre como política explícita do caso de uso. Não confiar em cast, genérico HTTP ou união discriminada como validação de runtime. Preservar versões, tamanhos, códigos de erro e ordem de rejeição onde forem relevantes aos consumidores. Testar também a reidratação SQLite, que hoje chama as mesmas validações. [Consumidor de aplicação](C:/src/Nova-tag-expo/src/appplication/administration/coordinator.ts:164), [reidratação](C:/src/Nova-tag-expo/src/infra/administration/sqlite-store.ts:170).

**TY02 — P1: preservar a allowlist enquanto se melhora sua organização.** A cadeia de [commandBytes](C:/src/Nova-tag-expo/src/appplication/administration/contracts/operation-decoder.ts:1) verifica envelope, instrução, tamanho, slots, offset, limite do arquivo e coerência de `alteraTag`. Esses ramos são defesas reais, não resíduos a apagar. Primeiro extrair sem mudar comportamento. Depois comparar manutenção por `switch` exaustivo ou tabela explícita de instruções e validadores nomeados. Escolher pela clareza dos invariantes; não criar uma classe por opcode nem um registro extensível que aceite instruções desconhecidas. **Aceite:** instrução desconhecida continua rejeitada, nunca recebe fallback permissivo; nenhum comando inválido alcança `transceive`; validação é independente do SDK.

**TY03 — P2: modelar combinações válidas, sem multiplicar DTOs idênticos.** `AdminReply` permite representar `EM_ANDAMENTO` com comando nulo, porque o status e os campos não estão relacionados no tipo. Avaliar união discriminada para representar as variantes realmente aceitas, preservando o envelope externo por decoder/mapeamento. Não inventar restrições para `INTERROMPIDA` antes de confirmar o contrato suportado. `LocalCommand` e `Settlement` também merecem revisão de estados que exigem resposta/recibo, com base nas transições e nas migrations existentes. [TypeScript — narrowing, uniões discriminadas e exaustividade](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).

**TY04 — P2: separar regra, compatibilidade e redação de apresentação.** [decisionStatus](C:/src/Nova-tag-expo/src/domain/traceability/decision-status.ts:3) usa prioridade de campos e fallback de compatibilidade; `businessOutcome` traduz o resultado para um estado de entrega/negócio. Definir se o fallback pertence ao decoder de versões anteriores ou à política de negócio; testar casos com status presente, legado e dados contraditórios antes de mover. No NFC, [accessDescription e writeAccessSummary](C:/src/Nova-tag-expo/src/components/Nfc/file-access-labels.ts:1) devolvem textos de interface em português. Manter classificação técnica pura no núcleo e mover sua redação para apresentação. Não trocar os `if` por ternários aninhados e considerar isso refatoração.

**TY05 — P2: separar os contratos restantes com base em mudanças reais.** Rastreabilidade, fila e experimento não estão “cheios de if” nos respectivos `types.ts`; o problema é a reunião de conceitos/portas e a exposição de subestruturas aninhadas a muitos consumidores. Extrair contrato quando tiver significado e uso próprio, como decisão ou evidência SDM. Evitar um arquivo para cada propriedade ou um modelo duplicado entre camadas sem diferença semântica. No original já existem [validações de provisionamento](C:/src/Nova-tag/src/domain/PedidoEtiqueta/validations/ProvisionarEtiquetaValidation.ts:4) e [evento](C:/src/Nova-tag/src/domain/PedidoEtiqueta/validations/AnexarEventoValidation.ts:5) separadas; avaliar suas regras e contratos, sem tratá-las como problema apenas por usarem condicionais.

### 18.4. Sequência, fiscalização e aceites

1. **Extrair autenticação nos dois checkouts, sem mudar semântica:** modelo, portas, erro, política de URL e decoder. Testar sessão persistida válida/inválida e política HTTPS/desenvolvimento. Não padronizar os modelos apagando diferenças de capacidade entre versões.
2. **Extrair administração no Expo por responsabilidade:** primeiro separar funções e contratos preservando comportamento; depois fortalecer decoders e variantes. Manter os mesmos identificadores, bytes e critérios de rejeição. Reaproveitar e ampliar [AdministrationStore.test.ts](C:/src/Nova-tag-expo/__tests__/AdministrationStore.test.ts:187) e as suítes de coordinator/recuperação.
3. **Reorganizar captura e experimento junto dos consumidores:** preservar a atomicidade de captura/ensaio, lease, retry, recibo e owner. Separação de interfaces não exige separar transações nem bancos.
4. **Revisar dependências após cada extração:** imports direcionados ao módulo responsável, sem ciclos e sem novas exceções. Não deixar um barrel antigo reexportando todos os símbolos como destino permanente; compatibilidade temporária precisa de remoção dentro da etapa acordada.
5. **Adicionar a proteção de arquivos declarativos:** se o nome `types.ts`/`*.types.ts` permanecer, o check AST deve aceitar apenas interfaces, aliases e imports/exports de tipos. Rejeitar funções, classes, enums de runtime, inicializadores executáveis, getters e reexports de valores. Módulos de comportamento recebem nomes de conceito/política/parser. Testar essas formas explicitamente, inclusive tentativas de esconder execução por exportação indireta.
6. **Testar regras e fronteiras:** comando desconhecido, APDU truncada, tamanho/offset/slot inválido, `alteraTag` divergente, resposta de outra sessão, owner diferente, variantes de reply inválidas e documento persistido corrompido. Acrescentar verificação de tipos para combinações impossíveis quando as uniões forem adotadas. Manter testes positivos para regras puras com condicionais no domínio.
7. **Concluir com `npm run verify` por mudança de código:** nenhuma queda de cobertura de comportamento para fazer a extração passar. As contagens anteriores de testes são baseline histórico; esta atualização documental não executou nem acrescentou testes de produção.

O check declarativo é uma convenção fiscalizável; coesão semântica continua exigindo revisão. Não adicionar limites arbitrários de linhas, exports ou `if`, nem um banimento de funções no domínio. O resultado esperado é localizar uma regra de negócio, um contrato externo e uma política de persistência em módulos com responsabilidades claras, com proteção equivalente ou melhor à anterior.

**Integração ao plano anterior:** extrair os contratos da funcionalidade antes ou junto de seus hooks/reducers na seção 17. Para administração, TY01/TY02 acompanham R3; para autenticação, a extração independe da refatoração visual. O trabalho completo de decoders continua ligado a A09/A10 e à Fase 2. Esta seção não declara que essas correções já foram implementadas.

## 19. Execução no Expo: contratos, apresentação e código legível

**Estado desta entrega:** refatoração de software das seções 17 e 18 executada no worktree Expo, com as validações automatizadas abaixo. O original permanece separado. Isso não encerra o restante do backlog arquitetural das seções iniciais, a publicação da CI ou o aceite físico do produto.

A implementação foi precedida por consulta à documentação oficial de [estrutura de estado](https://react.dev/learn/choosing-the-state-structure), [efeitos](https://react.dev/learn/you-might-not-need-an-effect), [narrowing e uniões](https://www.typescriptlang.org/docs/handbook/2/narrowing.html), [foco de navegação](https://reactnavigation.org/docs/use-focus-effect/) e [listas nativas](https://reactnative.dev/docs/flatlist). As decisões locais continuam identificadas como decisões do projeto: nenhuma fonte recomenda eliminar todos os condicionais ou todos os estados locais.

### 19.1. Contratos e responsabilidades implementados

| Grupo | Resultado atual | Fonte de implementação |
| --- | --- | --- |
| Autenticação | Usuário/sessão no domínio; transporte e armazenamento como portas da aplicação; erro, política de URL e decoder com responsabilidades próprias | [Sessão](C:/src/Nova-tag-expo/src/domain/auth/session.ts:1), [portas](C:/src/Nova-tag-expo/src/appplication/auth/ports/session-storage.ts:1), [decoder](C:/src/Nova-tag-expo/src/appplication/auth/session-decoder.ts:1) |
| Administração | Operação/plano separados do contrato remoto, diário/recuperação e porta de persistência | [Operação](C:/src/Nova-tag-expo/src/domain/administration/operation.ts:1), [reply](C:/src/Nova-tag-expo/src/appplication/administration/contracts/admin-reply.types.ts:1), [recuperação](C:/src/Nova-tag-expo/src/appplication/administration/recovery.types.ts:1), [store](C:/src/Nova-tag-expo/src/appplication/administration/ports/admin-store.ts:1) |
| Entrada externa e autorização | Decoders recebem `unknown`; conferência de owner e sessão RF tem políticas explícitas. Operação persistida também é validada ao ser reaberta | [Decoder de operação](C:/src/Nova-tag-expo/src/appplication/administration/contracts/operation-decoder.ts:1), [owner](C:/src/Nova-tag-expo/src/appplication/administration/operation-owner-policy.ts:1), [sessão RF](C:/src/Nova-tag-expo/src/appplication/administration/rf-session-policy.ts:1) |
| APDU | Parser/allowlist puro em módulo de protocolo, com seleção explícita por instrução e validação de envelope/faixa. Instrução desconhecida continua rejeitada | [Comando administrativo](C:/src/Nova-tag-expo/src/domain/nfc/administrative-command.ts:1) |
| Captura e ensaio | Captura/owner e plano/registro/tentativa separados; portas de persistência/relógio e settlement na aplicação | [Captura](C:/src/Nova-tag-expo/src/domain/offline/capture.ts:1), [captura store](C:/src/Nova-tag-expo/src/appplication/offline/ports/capture-store.ts:1), [ensaio store](C:/src/Nova-tag-expo/src/appplication/experimentation/ports/experiment-storage.ts:1) |
| Consultas de rastreabilidade | Contratos de pedidos e histórico, política de entrada e porta autenticada fora da implementação do workflow; consumidores usam imports diretos | [Pedidos](C:/src/Nova-tag-expo/src/appplication/traceability/contracts/order.types.ts:1), [histórico](C:/src/Nova-tag-expo/src/appplication/traceability/contracts/history.types.ts:1), [porta](C:/src/Nova-tag-expo/src/appplication/auth/ports/authenticated-api.ts:1) |
| Classificação e redação | Permissões de arquivo classificadas por política pura; textos pertencem à apresentação. Decisões antigas mantêm precedência explícita de compatibilidade | [Acesso NFC](C:/src/Nova-tag-expo/src/domain/nfc/access-policy.ts:1), [labels](C:/src/Nova-tag-expo/src/components/Nfc/file-access-labels.ts:1), [decisões](C:/src/Nova-tag-expo/src/domain/traceability/decision-status.ts:1) |

Os cinco antigos `domain/*/types.ts` foram removidos; nenhum barrel de compatibilidade os substitui. Os campos persistidos, o formato dos recibos e os limites transacionais continuam preservados. A nova união de `AdminReply` impede, por exemplo, representar `EM_ANDAMENTO` sem comando. Há teste que compila uma variante válida e exige erro TypeScript na combinação inválida; isso complementa os decoders de execução.

### 19.2. Estado e integração nativa implementados

| Itens do plano | Resultado |
| --- | --- |
| RN01/RN02, R1 | Catálogo experimental tipado na aplicação; componente sem URLs HTTP. Hook com descarte por identidade, geração e foco, e exclusão síncrona de comandos. Supressão de dependências removida |
| RN04, R2 | Provisionamento com estados tipados e transições puras; leitura/instante pertencem à mesma evidência. Verificação é derivada da evidência/vínculo atuais; seleção invalida confirmação anterior |
| RN03, R3 | Administração separada em transições, coordenação assíncrona, labels e UI. Instalação da projeção ocorre como evento único. Conclusão antiga não encerra atividade nova; mudança de login ou de vínculo remove o plano anterior |
| RN05, R4 | Busca de pedidos, histórico e gerenciamento de vínculo em hooks por funcionalidade. Recarga explícita substitui clonar objetos para disparar efeitos; rota e escopo têm transições definidas |
| Captura de evento | Intento de captura contém UUID, owner, leitura, instante e tentativa. Falha local retorna ao estado de revisão preservando essa evidência; leitura e instante não são lidos de ref durante renderização |
| RN06, R5 | Pedidos, histórico e envios usam `FlatList` como proprietária da rolagem. Na seleção, a lista ocupa a tela; o resumo selecionado continua embutido no formulário. Sem lista vertical crescente dentro de ScrollView vertical |
| RN07 no Expo | Coordenação de leitura/diário/timeout na aplicação; hook cuida do estado visual e dos listeners. Blur, background e desmontagem cancelam a tentativa; o sheet iOS `inactive` permanece permitido |
| RN08, R6 | Opção de pedido tem semântica de botão; modo de modelo personalizado acompanha o valor controlado. Formulários e busca recebem tratamento de teclado com offset do cabeçalho nativo |

Fontes principais: [estado do provisionamento](C:/src/Nova-tag-expo/src/views/Provisionar/Etapas/provisioning-state.ts:1), [administração](C:/src/Nova-tag-expo/src/views/Provisionar/Administracao/use-administration-flow.ts:1), [histórico](C:/src/Nova-tag-expo/src/views/Historico/use-history.ts:1), [captura](C:/src/Nova-tag-expo/src/views/Eventos/Etapas/use-event-capture.ts:1), [painel experimental](C:/src/Nova-tag-expo/src/components/Offline/use-experiment-panel.ts:1), [leitura física](C:/src/Nova-tag-expo/src/appplication/nfc/physical-reading.ts:1).

O grafo de serviços por app, `useSyncExternalStore` de sessão/fila e efeitos necessários de restore, expiração e conectividade foram preservados. Comandos físicos continuam nas ações explícitas; reducers não executam I/O. A ordem de início/resultado experimental e a autoridade do coordinator sobre APDU/checkpoints continuam protegidas pelos testes existentes.

Foi declarada diretamente `@react-navigation/elements@2.9.40`, a mesma versão que já era usada pelos navigators, para compartilhar o contexto de altura do cabeçalho. Não foram adicionados gerenciadores globais de estado ou bibliotecas de cache.

### 19.3. Código legível e fiscalização

Variáveis de negócio foram renomeadas semanticamente, incluindo `operationContext`, `rfSession`, `provisioning`, `attempt`, `selectionState`, `requestGeneration`, `commandRow` e `responseByte`. Os eventos do painel indicam consulta de roteiros, consulta de tentativas ou comando; não há um patch genérico chamado `changes` para atualizar qualquer campo. Nomes definidos pelo contrato externo, como `changes` do resultado SQLite e nomes de pacotes Expo, permanecem com sua semântica original.

As proteções foram ampliadas:

- `ARCH015`: arquivos `types.ts`/`*.types.ts` aceitam declarações e imports/exports de tipos; execução, classes, enums de runtime e reexports de valores falham.
- Erros para `react-hooks/refs`, `purity`, `immutability`, `set-state-in-effect`, `set-state-in-render` e `static-components`, além das regras de hooks já existentes.
- Supressões de hooks e da regra de nomes são rejeitadas pelo analisador; não há nova exceção arquitetural.
- `id-length` exige pelo menos dois caracteres nos identificadores locais de produção, com exceções explícitas para índices e parâmetros de tipo. Campos de contratos externos são preservados. Essa regra mecânica não prova clareza semântica; os exemplos e a obrigação de revisão estão em `AGENTS.md`. [ESLint — id-length](https://eslint.org/docs/latest/rules/id-length).

Os ajustes locais de estado derivados de rota são condicionados a uma mudança real e atualizam o próprio componente antes do commit dos filhos, sem efeito para copiar props. O lint também protege contra atualizações incondicionais durante renderização. [React — ajuste de estado a partir de renderizações anteriores](https://react.dev/reference/react/useState#storing-information-from-previous-renders).

Como indicador descritivo, o inventário AST passou de 99 para 30 chamadas de `useState`, de 13 para 12 de `useEffect`, e passou a ter oito chamadas de `useReducer`. A meta não foi a redução numérica: estados independentes de formulário/expansão e efeitos externos legítimos continuam existindo.

### 19.4. Evidência de validação e limites

O `npm run verify` final passou com lint sem warnings, TypeScript sem erros, **70 testes das proteções** e **369 testes Jest em 42 suítes**. O analisador examinou **162 arquivos de produção**, com inventário de exceções vazio e nenhuma violação nova. Os comandos de qualidade, a restrição de I/O e a regra de não crescimento das exceções foram preservados; as mudanças de política acrescentam restrições e testes.

As regressões novas cobrem respostas fora de ordem, troca de conta/seleção/rota, término de operação antiga, toques duplicados, liberação experimental interrompida por troca de identidade, limpeza dos listeners e blur/background durante leitura. Os testes de banco, recibo original, retry, lease e ordem dos comandos administrativos continuam passando. Os fixtures de AppState agora simulam vários assinantes, como a API real; verificações de UI inspecionam texto e rótulos acessíveis renderizados, em vez de serializar elementos React armazenados nos props de uma lista.

O teste de volume carrega 500 pedidos, mantém o conjunto de dados e comprova que apenas uma janela de linhas é montada, sem ScrollView ancestral. É uma verificação estrutural de virtualização, não uma medição de FPS, memória nativa ou latência em release. As duas políticas de teclado são verificadas por plataforma e altura de cabeçalho nos testes de componente.

A exportação iOS pelo Expo CLI também passou: 1.248 módulos, bundle Hermes e assets gerados em `.tmp/refactor-plan-ios`. Ela comprova o empacotamento JavaScript, sem equivaler a build nativo ou ensaio de RF.

Os clientes usados nos scripts de aceite foram compilados com TypeScript em modo Node16 e seus módulos separados foram carregados. Os scripts receberam os novos caminhos; essa verificação não faz login nem altera contas em API real.

**Aceite em aparelho ainda necessário:** teclado com fonte ampliada/orientação, VoiceOver/TalkBack, desempenho em release com massa real e RF. A refatoração não declara aprovação desses ensaios. RN07 do original e suas oito exceções ficam fora desta entrega Expo. A publicação da CI e a proteção remota de merge permanecem como já documentado.
