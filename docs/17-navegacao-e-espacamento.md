# Navegação e espaçamento

Revisão de interface em 07/10/2026, na branch `codex/issue-12-secure-messaging`.

## Ajustes

- Os dois navegadores internos compartilham o cabeçalho e o botão **Voltar**, com área de toque de pelo menos 44 pontos. O controle chama `navigation.goBack()`; nomes como `InformativoEtapas` e `EtapasProvisionamento` deixam de aparecer como rótulo de retorno. As rotas iniciais também possuem títulos em português.
- Nas telas internas, o banner apresenta apenas título e explicação, com tipografia e margens menores. O cabeçalho da navegação já identifica o fluxo, dispensando uma segunda faixa de identificação.
- A margem lateral do conteúdo passou para 16 pontos. Rodapés, seleção de etapas, atalhos da página inicial e histórico possuem espaçamento mais compacto, sem alturas fixas que cortem textos.
- Ações principais continuam com pelo menos 60 pontos de altura; ações de texto usam pelo menos 44. Textos continuam adaptando-se ao espaço disponível.
- A barra de abas informa sua altura real ao navegador, inclusive zero quando fica oculta. A tela aplica a proteção inferior apenas quando as abas não ocupam essa área, evitando somar duas vezes o espaço do indicador de início do iPhone.
- A configuração administrativa usa a tela sem abas, como os demais fluxos internos de vínculo. A navegação de retorno permanece disponível.
- Na leitura, **Trocar etapa**, **Voltar ao pedido**, **Voltar ao vínculo**, **Voltar ao histórico**, **Voltar à consulta**, **Voltar aos envios** e **Voltar ao início** identificam o destino da ação local. O **Voltar** do cabeçalho retorna pela pilha de navegação.
- A seleção UID/NDEF aparece antes das instruções e ferramentas auxiliares de vínculo. A introdução de registro explica corretamente que a captura pode ser salva offline e só será autorizada após avaliação pela API.
- O login omite a ilustração decorativa em telas com altura inferior a 700 pontos ou largura inferior a 360 pontos, reservando mais espaço ao formulário.
- A ilustração do login conecta pacote, transporte e destino em uma linha com os elementos alinhados. Não utiliza borda parcial rotacionada nem posicionamento absoluto, evitando diferenças de desenho entre plataformas. Essa correção está no JavaScript e pode ser carregada pelo Metro no development client 0.4.0 (5), sem outro build EAS.
- O painel de experimento não inicializa o identificador nativo quando não existe diário disponível; falhas de leitura desse identificador são tratadas na tela, sem promessa rejeitada sem tratamento.

## Verificação local

`npm run lint`, `npm run typecheck` e `npm test -- --runInBand`: **286 testes em 30 suítes**. Os testes de navegação exercitam a barra de abas autenticada, o retorno pelo cabeçalho e a troca de etapa sem salvar capturas.

Prévia web do próprio aplicativo em **390 × 844** e **320 × 568**: 15 telas por tamanho, sem overflow horizontal nem erros JavaScript. Foram percorridos login, início, introdução e escolha de etapa, leitura, introdução e escolha de pedido, cadastro, diagnóstico, gerenciamento, administração, consulta e detalhes do histórico e envios. Os retornos foram acionados e as ações principais fixas permaneceram dentro da tela. Campos e textos extensos continuam acessíveis por rolagem.

A prévia usou respostas HTTP sintéticas apenas para apresentar pedidos e histórico. Nenhum dado do laboratório foi alterado, nenhuma captura NFC foi simulada no aplicativo e nenhuma validação física foi produzida. Relatório e imagens locais ficam em `.tmp/layout-polish/`, ignorados pelo Git.

Ainda é necessário conferir a renderização nativa no iPhone, especialmente a área segura, o cabeçalho e a ampliação de fontes. Esta revisão não representa aceite físico NFC e não altera as pendências das issues #8, #9 e #12 da API.

Nenhum build EAS, execução do GitHub Actions ou merge na `main` foi realizado para esta revisão.

## Hierarquia das ações e redução de texto

Revisão posterior em 07/10/2026:

- A página inicial destaca **Escanear etiqueta**. Os demais destinos usam linhas de navegação; **Sair** fica diretamente no final da página, sem dropdown.
- Registro e vínculo apresentam instrução curta e ação principal. O passo a passo completo abre em **Como funciona** ou **Como vincular**.
- A introdução de vínculo mantém a identificação UID/NDEF em primeiro plano. Gerenciamento, diagnóstico e NTAG ficam em **Outras opções**, com o mesmo controle de acesso.
- O vínculo simples apresenta uma única ação principal no rodapé, conforme a fase: **Ler etiqueta**, **Vincular**, **Gravar NDEF**/**Reler etiqueta**, **Ativar etiqueta** ou **Novo vínculo**. Sem releitura válida e confirmação explícita, não ativa. A explicação de bloqueio continua visível antes da confirmação.
- A leitura apresenta uma instrução junto à ilustração. O resultado permanece até uma ação explícita; **Dados da leitura** abre horário e conteúdo técnico. Após salvar uma etapa, a leitura continua acessível em **Comprovante**.
- **Ver envios**, **Ver histórico**, **Trocar etiqueta**, **Sincronizar** e as ações administrativas usam rótulos curtos. Ações alternativas usam tratamento de texto em vez de competir com o botão principal preenchido.
- Envios prioriza a fila e a decisão. A preparação do cache está em **Preparar uso offline → Preparar etiqueta**; o ensaio fica após as capturas, com indicação de envios pausados quando selecionado.
- Pendências, motivos de rejeição e prazos continuam visíveis. Validação SDM, evolução das decisões, comprovantes e versões das chaves podem ser abertos sob demanda. Identificação, armazenamento e autorização continuam separados.
- Títulos de página não são repetidos em uma segunda faixa de identificação.

Verificação: lint, tipos e **287 testes em 30 suítes**. Os testes existentes foram adaptados aos novos rótulos e à abertura dos detalhes; continuam verificando UID/time/UUID preservados, permissões, revisão de decisão, recuperação administrativa e confirmação. O novo caso NDEF percorre gravação → verificação → confirmação → ativação e verifica a ação principal em cada fase.

Prévia web: **17 telas em 390 × 844 e 320 × 568**, incluindo ajuda e opções offline abertas, sem overflow horizontal ou erros JavaScript. Fixtures HTTP isoladas, sem capturas NFC ou alterações nos dados de laboratório. Evidências em `.tmp/action-hierarchy/`. A conferência nativa no iPhone continua necessária; testes web não validam RF nem o chip.

Mudanças JS/TS: recarregar o development client pelo Metro. Esta revisão não exige outra compilação EAS.

## Configuração e recuperação visual — 23/10/2026

- **Configurar NTAG 424** aparece diretamente em Vincular. O novo fluxo apresenta uma tarefa por etapa: escolher pedido → identificar a etiqueta → escolher identificação. Nenhum tratamento vem selecionado silenciosamente; Estrita continua sendo a política inicial visível quando SDM é escolhido.
- O plano existente abre na etapa correspondente. Pedido, UID, época e tratamento ficam num resumo compacto. A recuperação apresenta as cinco chaves em linhas com seletores Atual/Alvo; resultados desconhecidos ficam destacados e exigem escolha explícita.
- A confirmação possui caixa e marca desenhadas pelo app, inclusive no iOS, e semântica de checkbox. Fica junto à ação principal no rodapé. A configuração bloqueada informa o que falta: confirmação, chave pendente, carregamento das cinco chaves ou atualização de sessão em andamento.
- Configuração física e ativação continuam separadas. A segunda etapa solicita nova leitura NFC; uma evidência de ativação já salva oferece apenas seu reenvio. O progresso diferencia consulta HTTP de sessão NFC.
- Versões, diário e identificadores ficam em **Detalhes técnicos**. Alertas aparecem no início do conteúdo. Resultados de sucesso são apresentados pelo estado da tela, sem repetir explicações em avisos amarelos.
- Um vínculo NTAG pendente destaca **Retomar configuração**. Encerrar abre uma confirmação focada, com pedido/UID e consequências resumidas por ícones; o botão destrutivo é vermelho. Um vínculo SDM encerrado oferece **Novo vínculo**, abrindo uma administração nova sem reaproveitar o plano encerrado.
- A confirmação visível também foi aplicada à ativação do vínculo simples UID/NDEF. Permissões, necessidade de releitura, confirmação explícita e regras de recuperação permanecem obrigatórias.

Verificação visual isolada em **390 × 844** e **320 × 568**: 34 capturas de estados de configuração, seleção de tratamento, recuperação com chaves conhecidas/desconhecidas, erro NFC, ativação e encerramento. As ações principais permanecem dentro da tela, com pelo menos 60 pontos, sem overflow horizontal. Em telas menores, o conteúdo rola acima do rodapé. Evidências em `.tmp/setup-layout/`; cópias temporárias das telas usam adaptadores fictícios, sem alterar o transporte NFC ou os dados do laboratório. A renderização nativa e a operação física ainda precisam ser conferidas no iPhone.

Verificação de código: **303 testes em 31 suítes**, lint e tipos aprovados. A API e o Metro responderam HTTP 200; o bundle iOS também respondeu 200 contendo os novos controles. A revisão continua na branch `codex/issue-12-secure-messaging`, com atualização via Metro, sem necessidade de nova compilação nativa.

### Bloqueios e falhas de configuração

Falhas abrem um modal com cabeçalho vermelho, ícone de erro, motivo e botão de tamanho normal. O código técnico fica em texto secundário. Fechar o modal mantém um aviso vermelho no início da tela, disponível até nova tentativa, sem desaparecer por tempo. O conteúdo do modal permite rolagem em telas pequenas, preservando a ação principal.

`NFC_ETIQUETA_EM_USO` substitui a ação normal por **Resolver pendência**. O app consulta a configuração aberta pelo UID e apresenta sua época/UID. **Encerrar e continuar** exige clique explícito e só aparece sem alteração física emitida: encerra o plano anterior e prepara o atual, sem transmitir NFC ou ativar o vínculo. Planos com alteração emitida oferecem **Abrir configuração anterior**, preservando recuperação e as restrições de encerramento da API. Outra conta, etiqueta divergente ou consulta indisponível não autorizam encerramento.

Verificação: **308 testes do mobile**, **21 testes de integração NFC da API com PostgreSQL real**, lint, tipos, build e contrato OpenAPI. A prévia isolada capturou 14 estados em dois tamanhos, verificando modal e ação principal dentro da tela, permanência do bloqueio, consulta indisponível e recuperação obrigatória. Evidências em `.tmp/blocking-failure/`. API local reiniciada com a rota de consulta; bundle iOS atualizado pelo Metro. Nenhuma configuração real foi encerrada automaticamente.

## Revisão de Envios — 03/11/2026

A lista de Envios herdava o fundo primário do contêiner com cabeçalho, sem receber
a superfície clara aplicada às telas comuns. Isso deixava mensagens escuras
sobre azul. A lista agora tem fundo branco, cabeçalho azul separado e uma seção
de conteúdo com cantos arredondados. A virtualização e os insets foram mantidos.

O estado vazio orienta a registrar uma etapa, sem mostrar um contador redundante
de zero capturas. Carregamento e falha de armazenamento têm estados próprios.
Capturas existentes mantêm status, comprovante, vínculo e decisões. As opções
offline e de ensaio usam a mesma variante de cartão expansível de `Details`,
com ícone, descrição e semântica de expansão; a variante simples permanece
disponível para as telas anteriores.

Verificação: `npm run verify` aprovado, **405 testes em 45 suítes** e **88 testes
das proteções arquiteturais**, com lint e tipos. Cinco casos de apresentação
cobrem fila vazia, carregamento/erro, sincronização, detalhes da captura e perfil
de consulta. O aplicativo real foi conferido em emulador Android com largura de
393 pontos, autenticação pelo fixture local e fila SQLite vazia. Foram inspecionados
o estado vazio e a abertura da preparação offline. Captura local em
`.tmp/envios-corrigido.png`; contexto do fixture em
`postman/simulations/nova-tag-ui.context.yaml`. Isso não representa aceite nativo
no iPhone, validação da API implantada ou operação física NFC.

## Seletor de pedidos — 03/11/2026

A busca e os resultados agora ficam sobre uma superfície branca, separada do
cabeçalho azul por cantos arredondados. Cada pedido usa um cartão com borda,
raio de 20 pontos e espaçamento externo. Código e descrição ocupam a largura do
cartão, preservando identificadores longos completos. O estado aparece em um
badge e a indisponibilidade de vínculo tem explicação visível e acessível.

A seleção continua restrita aos pedidos cadastrados no provisionamento; o
histórico permite consultar pedidos já movimentados. Paginação, busca protegida
contra respostas antigas e virtualização permanecem cobertas por testes. A
regressão acrescentada usa um código longo sintético e verifica identidade
acessível, superfície clara, cartão arredondado e seleção correta.

`npm run verify` aprovado: **406 testes em 45 suítes**, **88 testes das proteções
arquiteturais**, lint, tipos e compilação verificada pelo React Compiler.

A revisão automática bloqueou a inicialização do ambiente de prévia nativa
(emulador e servidores locais), sem apresentar um motivo específico. Portanto,
esta revisão não contém uma nova captura validada no Android ou iPhone. Os
resultados de testes JS e compilação não são apresentados como inspeção visual
nativa.

## Histórico do pedido — 03/11/2026

O histórico apresentava a mesma falha de superfície da lista de Envios: a
renderização virtualizada própria não recebia o fundo claro do contêiner comum.
A lista agora tem fundo branco e conteúdo com cantos superiores arredondados,
enquanto o resumo do pedido permanece no cabeçalho azul. Os insets inferiores
e a virtualização continuam sob responsabilidade dos componentes existentes.

O aviso de ativação pendente aparece em um painel de atenção. Os filtros usam
cores explícitas para texto e seleção, com altura mínima de 48 pontos. O vínculo
usa o cartão expansível compartilhado, com ícone e descrição. Registros recebem
cartões separados e arredondados; seus detalhes usam o mesmo controle de
expansão acessível. Carregamento, erro e histórico vazio têm apresentações
distintas, sem apresentar ausência de registros durante uma consulta ou falha.

As regressões de apresentação cobrem a etiqueta registrada sem eventos,
expansão dos detalhes, troca de escopo e falha seguida de nova tentativa.
Os cenários existentes preservam paginação, descarte de respostas antigas,
permissões de gerenciamento, decisões pendentes/rejeitadas e revisões da decisão.
As regras de ativação, os dados de evidência e o acesso à API não foram alterados.

`npm run verify` aprovado: **408 testes em 45 suítes**, incluindo 14 cenários de
apresentação do histórico, mais **88 testes das proteções arquiteturais**, lint,
tipos e a verificação do React Compiler no escopo existente.

Esta alteração não tem uma nova inspeção visual em dispositivo. O ambiente de
prévia nativa teve sua inicialização bloqueada pela revisão automática na
revisão anterior, sem motivo específico; os testes de apresentação não
substituem a conferência visual no Android e no iPhone.

## Confirmação de encerramento — 03/11/2026

O modal de encerramento usava `Dialog.Actions`, que dispõe os filhos em uma
linha. Os dois `ActionButton` com textos longos excediam a largura disponível e
cortavam a ação de voltar. O modal agora apresenta a confirmação e a volta em
uma coluna com largura total, sem as margens horizontais injetadas por esse
contêiner. A superfície tem raio de 24 pontos e largura máxima de 440 pontos,
limitada pela janela e pelos insets laterais.

Título, explicação e ações pertencem à mesma área rolável. A altura máxima
considera os insets superiores/inferiores e uma margem de 16 pontos em cada
extremidade, permitindo alcançar as ações quando o conteúdo ultrapassa essa
altura. Os rótulos mantêm a quebra de linha e o ajuste de fonte do sistema.

A apresentação foi extraída para `EndAdministrationDialog`, dentro da
funcionalidade de administração. A tela continua responsável pelo comando de
encerramento e pelo estado de abertura. Voltar ou dispensar o modal não executa
o comando; a confirmação preserva o fluxo existente e as explicações para plano
não configurado, configuração conferida e vínculo ativo.

Os testes de apresentação verificam os limites e a disposição das ações em
janelas de 320 × 568, 390 × 844 e 667 × 375, com escalas de fonte de 1 a 2,
além de distinguir os callbacks de voltar e confirmar. São verificações de
contrato de layout em JS, sem medição de pixels ou nova inspeção visual nativa.

`npm run verify` aprovado: **412 testes em 46 suítes**, mais **88 testes das
proteções arquiteturais**, lint, tipos e verificação do React Compiler.
