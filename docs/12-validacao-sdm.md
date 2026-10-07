# Captura SDM integrada à API — #5

Entrega em `codex/issue-5-sdm-validation`, sobre a fila #4. A API valida o perfil
candidato `nfc-trace.sdm.encrypted-picc.v1` com as primitivas documentadas pela
[NXP AN12196](https://www.nxp.com/docs/en/application-note/AN12196.pdf). O software
não constitui aceite físico: só há Feiju disponível, e a configuração/proteção/
secure messaging da NTAG 424 DNA permanece na
[#12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12).

## Operação

Uma tag SDM previamente personalizada pela bancada pode ser lida em **Registrar
evento**, disponibilizada offline e consultada em **Histórico**. A referência
`urn:nfc-trace:sdm:v1:<uuid>?picc_data=<32 hex>&cmac=<16 hex>` resolve seu
provisionamento específico; não existe fallback por UID depois de erro. Referências
ambíguas/múltiplas do projeto são recusadas. Cadastro de época e política pertencem
ao servidor, que retorna metadados públicos e nenhum material privado.

O app exige URI e bytes NDEF originais completos, exatamente o layout do perfil,
além de uma época/profile compatível no vínculo retornado. Isso é **conferência
estrutural**, sem autenticar ou consumir contador localmente. Captura Type 4 usa
o leitor de bytes já existente; não recodifica registros do SDK nem usa relatório
do diagnóstico como uma captura. Outras leituras sem bytes originais não confirmam SDM.

O vínculo ativo pode ficar em cache por API/operador/época por até 24 horas. Referência
SDM desconhecida ou antiga não é substituída pelo vínculo mais recente da UID.
SQLite conserva UUID, bytes, contexto, época e primeiro comprovante; ao reabrir,
a sincronização reenvia o mesmo payload. Só a API decide validade/efeito.
503 `SDM_CHAVES_INDISPONIVEIS` é falha recuperável do servidor, sem perda da captura.

## Resultados claros

Captura, aba **Envios** e histórico exibem separadamente:

- Evidência autenticada ou autenticidade não confirmada.
- Evidência já utilizada ou leitura recebida fora de ordem.
- Política estrita/registro tardio, época e contador informado pela API.
- Movimentação autorizada ou rejeitada e motivo legível.

Contador reutilizado nunca produz outro movimento. Contador inédito menor que o
máximo é suspeito/rejeitado na política estrita; no registro tardio, fica preservado
sem movimento automático. Uma leitura autenticada pode ter sua operação rejeitada;
não sugerir sucesso logístico apenas pelo resultado criptográfico. A reconciliação
de pendências e decisões versionadas continua na #6.

Uma leitura válida guardada e apresentada pela primeira vez não prova frescor ou
presença atual da tag. MAC não vincula UUID, ação, coordenadas, operador, aparelho ou
horário declarados. Autoria da sessão é outra informação. UID capturada divergente
é registrada como suspeita; ela não muda a UID autenticada pelo PICC nem escolhe estratégia.

## Administração e build

**Vincular** continua configurando somente UID/NDEF estático. Provisionamento SDM
é iniciado pelo administrador na API, com política explícita, chaves novas e época
atribuída. Primeira ativação exige prova válida após personalização; o adaptador
HTTP do mobile transporta essa prova quando acionado pela bancada. Não foi adicionada
uma tela que declare personalização/proteção sem executá-la.

**Gerenciar etiqueta** exibe SDM/política e permite encerramento conforme permissão.
Após encerrar SDM, orienta nova configuração de bancada em vez de transformar o
vínculo em NDEF estático automaticamente. Segredos não vão para cache, fila, logs,
relatórios ou telas. Exportação administrativa protegida e recuperação são tarefas
locais da API; ver [guia do cofre e políticas](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/codex/issue-5-sdm-validation/docs/sdm-validation.md).

A #5 altera somente JS/TypeScript, sem módulo nativo novo. O iPhone ainda precisa
do development build que inclua SQLite/rede da #4. Nenhum novo EAS ou Actions foi
iniciado nesta entrega. Bundle iOS exportado localmente não equivale a app nativo
instalado. NFC não funciona pelo Expo Go.

## Evidência de software

Testes Jest usam layout/leituras sintéticos declarados. Não são mensagens NTAG reais.
`TraceabilityWorkflow`: resolução por referência, bytes, perfil/época, ausência de
fallback e transporte de prova. `OfflineQueue`: SQLite real, fechamento/reabertura,
retry 503 sem mudança de payload e preservação da decisão tardia. `HistoryScreen`
verifica autenticação distinta de movimento. `NfcReader` recusa URIs ambíguas.
O backend usa vetores oficiais NXP/NIST e PostgreSQL/Supertest reais; seu teste
compara byte a byte o mesmo exemplo público de layout gerado pelo Nova-tag.

Mensagens físicas, contador observado nas sessões SDK/OS, proteção de escrita e
aceite Android/iPhone continuam na #12. Não há simulação inserida na navegação do app.
