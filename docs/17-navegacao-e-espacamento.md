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
