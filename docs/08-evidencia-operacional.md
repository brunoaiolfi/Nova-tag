# Bytes originais na captura NFC — issues #1 e #2

**Registro histórico de implementação.** O mantenedor aprovou o software #1/#2/#3 para publicação. Personalização administrativa, proteção, recuperação e aceite físico pendentes estão na [issue #12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12); integração na main permanece nos PRs. Estados de issue/branch desta etapa são históricos. Veja [situação atual](10-estado-do-projeto.md).

Etapa local em `codex/issue-1-operational-evidence`, preservando as implementações
anteriores de autenticação, interface e pedidos/vínculos. Main remota consultada e
incluída nos dois repositórios; nenhum push, merge, Actions ou build EAS. O usuário
dispõe somente da Feiju; não houve aceite físico da NTAG 424 DNA.

## Comportamento implementado

- A leitura cotidiana prioriza IsoDep. Quando essa tecnologia é selecionada pelo
  SDK, consulta a aplicação NDEF, o CC e o arquivo indicado no CC, sem GET_VERSION,
  autenticação ou escrita. Exige mapeamento Type 4 versão 2 e leitura pública.
- NLEN e fragmentos da mensagem são lidos com READ_BINARY consecutivos, sem
  intercalar seleção, diagnóstico ou comandos de versão nesse trecho. MLe,
  status, capacidade e comprimentos são conferidos. Limite: 4096 bytes de mensagem.
- `bytesBase64` é a mensagem exata, sem NLEN, CC ou status APDU. O app interpreta
  os mesmos bytes para obter a URI; não usa um resultado anterior do SDK nem
  recodifica registros. Registros longos/curtos, múltiplos registros, identificadores
  e chunks são conferidos sem alterar os bytes originais. URI/Text têm interpretação
  de Unicode validada; registros malformados e referências ambíguas são rejeitados.
- No preparo da captura, UID, URI, bytes e tecnologias/modelo disponíveis são
  copiados e congelados **antes** de aguardar a consulta do vínculo. O UUID/horário
  da captura e o usuário iniciador continuam sendo mantidos nos retries da tela.
- Outras tecnologias e a conferência de gravação seguem usando registros do SDK.
  Não geram bytes originais artificialmente. Mensagem vazia não gera Base64 vazio.
  A indisponibilidade dos bytes aparece em **Ver detalhes técnicos**.
  Se o SDK informar NDEF não suportado antes da leitura APDU, o UID continua
  disponível sem fabricar referência/bytes. Isso não transforma uma falha APDU
  em fallback nem autoriza um vínculo cadastrado para NDEF sem a referência.
- Remoção, cancelamento, truncamento, arquivo protegido ou resposta incompatível
  não produzem uma captura binária parcialmente válida. Não existe fallback de
  uma falha Type 4 para uma mensagem NDEF do cache/SDK. Modelo não é inferido como
  NTAG 424 pela seleção IsoDep ou pelo fabricante.

O diagnóstico administrativo reutiliza o leitor de arquivo, mas mantém sua
consulta GET_VERSION e seu relatório separados. Nunca anexar bytes daquele
diagnóstico como se fossem os bytes de uma nova operação logística.

## Persistência e significado dos dados

A API já aceita `leituraBruta.bytesBase64`, opcional. Não houve migration ou novo
campo de contrato. A descrição OpenAPI agora explicita o formato e os limites.
`GET /eventos/{id}` recupera a mensagem armazenada exatamente. O mesmo UUID e
conteúdo recuperam a decisão original; mudar o Base64 sob esse UUID retorna 409,
inclusive quando duas mensagens diferentes representem a mesma URI.

Os bytes são **evidência declarada pelo cliente**, não uma prova criptográfica.
Na API v1 a decisão depende de UID/URI cadastrados; ela ainda não verifica se o
Base64 corresponde à URI nem valida SDM. Isso será responsabilidade do perfil e
verificador autoritativo da #5. UID/NDEF estático continuam reutilizáveis, sem
ganhar artificialmente uma proteção contra replay.

## Limite relevante de SDK e SDM

No SDK instalado (`react-native-nfc-manager` 4.0.0-beta.10), o caminho iOS de
`getTag` chama `readNDEF` para acrescentar registros aos metadados. O adaptador
precisa dessa chamada para obter o UID; descarta esse NDEF na operação Type 4 e
depois captura a mensagem original por APDU. A descoberta Android também pode
envolver leitura do sistema. Não se garante “um tap = um incremento”.

O [datasheet NTAG 424 DNA, seção 9.3.3](https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf)
explica que comandos de leitura sucessivos do mesmo tipo/arquivo mantêm o
contador, enquanto outra operação pode fazê-lo avançar na próxima leitura. O
trecho APDU implementado mantém a sequência; **o efeito do SDK/OS precisa ser
medido no aparelho real**, com perfil SDM conhecido. Não há patch de código
nativo nem promessa de evitar a leitura interna do SDK neste build.

O modelo/bloqueio por chave e a recuperação de configuração permanecem no roteiro
de hardware da #1. A leitura não configura SDM, muda chaves ou ativa vínculos.

## Verificação e roteiro físico

```powershell
cd C:\src\Nova-tag-expo
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo export --platform ios --output-dir .tmp/evidence-ios

cd C:\src\nfc-trace-api
npm run test:all
npm run lint
npm run typecheck
npm run build
npm run openapi
```

O `npm run test:orders:api` documentado em [07-pedidos-e-vinculos.md](07-pedidos-e-vinculos.md)
também verifica bytes preservados, perda da resposta após commit e conflito por
mudança de bytes, usando cliente/HTTP/PostgreSQL reais na API de testes 3110.
Suas leituras são fixtures sintéticas explícitas, não amostras físicas.

Resultado local em 6 de outubro de 2026: **165 testes mobile / 20 suítes** e
**70 testes API / 6 suítes** (incluindo PostgreSQL/Supertest). A suíte mobile completa
foi repetida após o ajuste que mantém o UID disponível em IsoDep sem suporte NDEF.
Lint, tipos, build da API, OpenAPI e exportação local do bundle iOS passaram. O
cliente de contrato verificou preservação binária, perda de resposta após commit,
conflito, épocas, histórico e permissões na API isolada. Não é aceite de hardware.

Para o aparelho instalado, basta recarregar o JavaScript. Com a Feiju, ler uma
etiqueta e abrir os detalhes técnicos. Se o mapeamento Type 4 não for compatível,
guardar a mensagem e o relatório administrativo, sem declarar aceite NTAG 424.
Com uma etiqueta real compatível e vínculo ativo, registrar uma etapa, consultar
o evento na API e conferir os bytes/URI. Repetir transmissão sem reler; o UUID e
os bytes devem permanecer iguais, com um único movimento.

Na bancada NTAG 424 DNA, comparar fragmentos e contador em leitura cotidiana e
diagnóstico, anotar aparelho/build/UID/perfil/lote e registrar remoção durante
READ_BINARY. Incluir UID/NDEF estático antes de SDM; anexar amostras reais antes
de concluir #1/#2. Esse roteiro ainda não foi executado por esta implementação.
