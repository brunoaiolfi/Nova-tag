# Perfil SDM e permissões — próxima etapa da issue #1

**Registro histórico de implementação.** O mantenedor aprovou o software #1/#2/#3 para publicação. Personalização administrativa, proteção, recuperação e aceite físico pendentes estão na [issue #12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12); integração na main permanece nos PRs. Estados de issue/branch desta etapa são históricos. Veja [situação atual](10-estado-do-projeto.md).

Etapa local de 6 de outubro de 2026 em `codex/issue-1-sdm-bench-profile`, nos
dois repositórios, preservando as alterações anteriores. As mains remotas foram
consultadas e já estão incluídas. Sem push, PR, merge, Actions ou build EAS.

## Diagnóstico no app

Em **Vincular → Diagnosticar etiqueta**, uma declaração GET_VERSION compatível
com NTAG 424 DNA habilita uma consulta **GetFileSettings do arquivo 02**. Em
hardware desconhecido, como uma Feiju sem essa declaração, o comando específico
não é enviado. A consulta NDEF continua independente de uma recusa de permissões;
perda física, cancelamento e timeout interrompem a sessão.

O resultado mostra leitura, escrita, leitura/escrita e alteração das permissões.
Uma rota ReadWrite livre permite escrita mesmo quando Write exige chave; as duas
rotas são consideradas na mensagem exibida. O relatório compartilhado passa para
**versão 2**, com bytes e campos das permissões, comunicação, SDM e offsets.
Respostas truncadas, reservadas, com campos condicionais ausentes, regiões
sobrepostas ou fora do arquivo são rejeitadas. O parser suporta ASCII SDM normal;
não assume suporte a extensões de TagTamper ou formatos desconhecidos.

GetFileSettings é uma **declaração do chip**. Não comprova segredo instalado,
originalidade, escrita não autorizada negada ou configuração recuperável. O
diagnóstico não autentica, grava, muda permissões/chaves ou ativa vínculos.
Essa interpretação segue as seções 8.2.3.3, 10.7.1 e 10.7.2 do
[datasheet NXP](https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf).

O comando ocorre antes das leituras CC/NDEF. No trecho NLEN/fragmentos continuam
apenas READ_BINARY consecutivos. Permanecem os efeitos de SDK/OS e os limites
documentados em [08-evidencia-operacional.md](08-evidencia-operacional.md).

## Candidato versionado de bancada

O gerador puro TypeScript define `nfc-trace.sdm.encrypted-picc.v1`. O status é
`CANDIDATO_BANCADA`; o perfil experimental definitivo depende dos testes físicos.
Ele produz uma mensagem URI curta única, sem compressão, com o formato:

```text
urn:nfc-trace:sdm:v1:<uuid>?picc_data=<32 caracteres hex>&cmac=<16 caracteres hex>
```

Este identificador não é a referência NDEF estática da v1. A API continua
rejeitando provisionamento SDM; o app não recebe uma nova estratégia ou botão de
ativação. Fornecer um UUID ao gerador não cria um provisionamento nem uma época.
O futuro cadastro do servidor deverá atribuir UUID/época, perfil e referências de
chave; o cliente não poderá escolher esses dados para autorizar uma captura.

| Propriedade | Candidato v1 |
| --- | --- |
| Arquivo | Nativo 02, ISO E104, 256 bytes incluindo NLEN |
| Representação | NDEF URI, prefixo 00, ASCII; metadados PICC cifrados e CMAC |
| Comunicação autenticada | FULL; leitura ISO livre continua em plain |
| Direitos | Read=E, Write=0, ReadWrite=F, Change=0 |
| SDMOptions | C1: UID, contador e ASCII; sem dados adicionais cifrados/limite |
| SDMAccessRights | FF12: consulta direta do contador negada, metadados chave 1, CMAC chave 2 |
| Administração | Slot 0; nenhum valor de chave aparece no artefato |
| Offsets no arquivo | PICCData=75, MACInput=7, MAC=113; comprimentos 32 e 16 |
| Mensagem/arquivo usados | 127 / 129 bytes, sem preencher artificialmente os 256 |

O gerador calcula offsets **em bytes do arquivo**, incluindo NLEN, cabeçalho e
prefixo URI. Campos numéricos da referência GetFileSettings usam little endian.
O MACInput começa no início da URI e termina antes do CMAC, abrangendo a referência
de provisionamento, o PICC cifrado e os separadores. Quando o verificador #5 existir,
deverá conferir esses bytes e o cadastro esperado. Esse recorte não autentica tipo
logístico, horário, operador, dispositivo ou conteúdo físico da caixa.

As escolhas de slots e formato são decisões desta implementação, baseadas nas
tabelas 69/73 e nas seções 3.4.2/3.4.4 da
[AN12196](https://www.nxp.com/docs/en/application-note/AN12196.pdf); não são um
perfil certificado pela NXP. Não foram publicados vetores criptográficos novos.

[Exemplo reproduzível](nfc/sdm-profile-v1.example.json) usa UUID fictício e zeros
como placeholders. Não é mensagem SDM física nem provisionamento cadastrado.
`expectedSettings.rawHex` é uma referência em formato GetFileSettings, **não um
comando de alteração**. Não enviar esse valor como APDU ChangeFileSettings: a
personalização autenticada, secure messaging e recuperação ainda precisam ser
implementadas e verificadas na bancada.

## Gerar e comparar

```powershell
cd C:\src\Nova-tag-expo
npm run nfc:profile -- --provisioning-id 11111111-2222-4333-8444-555555555555 --output .tmp/perfil-sdm.json

# Após salvar o relatório v2 compartilhado pelo app:
npm run nfc:profile -- --provisioning-id 11111111-2222-4333-8444-555555555555 --report .tmp/diagnostico-real.json --output .tmp/comparacao-sdm.json
```

O comando compila apenas o domínio necessário para `.tmp/nfc-profile` e funciona
offline. Não chama API, SDK NFC ou EAS. O destino precisa ser novo: arquivos de
evidência existentes não são sobrescritos. Não aceita argumentos de chave/época.

O JSON contém plano, NDEF hexadecimal, hashes SHA-256 da mensagem/plano e,
havendo relatório, hash do relatório e identificação do aparelho. Hash identifica
um artefato; não o autentica como evidência física. Na comparação, os quadros de
versão são interpretados novamente, em vez de confiar só no booleano declarado.
As permissões são reinterpretadas a partir do hexadecimal original. Arquivo e
capacidade do CC, conteúdo estático, comprimentos e formato dos campos dinâmicos
precisam coincidir. Apenas PICC/CMAC são mascarados ao comparar o conteúdo estático;
zeros também correspondem ao layout, sem provar que SDM gerou a mensagem.

| Código de saída | Resultado |
| --- | --- |
| 0 | Plano gerado ou layout correspondente; sem autenticação/aceite físico |
| 1 | Entrada inválida, modelo não confirmado, relatório incompleto ou arquivo existente |
| 2 | Comparação válida com divergências, preservadas no arquivo de saída |

`authenticated` e `physicallyAccepted` permanecem false em toda comparação.
Relatórios são dados declarados e podem ser fabricados. A ferramenta não valida
CMAC nem administra reutilização de evidência, contador ou política logística.
Esses resultados pertencem ao verificador autoritativo #5, após seus pré-requisitos.

## Validação e pendências

- 203 testes mobile em 22 suítes, lint, tipos e exportação iOS local passaram.
- Casos incluem permissões condicionais, campos reservados, truncamento, offsets,
  sobreposição, exclusão de comandos em modelo desconhecido, perda física durante
  a consulta, UI persistente, geração e comparação via CLI real, adulteração do
  plano e preservação de arquivos existentes.
- Os testes usam fixtures sintéticas de protocolo/ponte nativa e não substituem
  uma etiqueta. Não houve alteração de código/contrato/migration na API nesta etapa;
  sua validação anterior permanece registrada no guia 08.
- API, Metro, gateway e ngrok mantidos ativos. Para o app instalado, recarregar o
  JavaScript; nenhum módulo nativo novo foi adicionado.

Faltam NTAG 424 DNA real, instalação controlada de material privado e versões de
chave, personalização autenticada, testes negativos de escrita, reconfiguração e
recuperação, medidas do contador sob SDK/OS e mensagens físicas com CMAC verificado.
Reset/reconfiguração exige nova época/material de chave administrados pelo servidor;
este gerador não aloca nem recicla esses valores. Ainda faltam revisão do colega e
integração das branches. A #1 fica aberta; bloqueios de #2/#5 permanecem.
