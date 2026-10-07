# Configuração administrativa da NTAG 424 DNA

Branch `codex/issue-12-secure-messaging`, sobre `codex/issue-9-reproducibility`.
Integra a API da mesma branch, [PR #20](https://github.com/Joao-AugustoPF/nfc-trace-api/pull/20).
Software candidato; somente Feiju disponível, sem personalização física realizada.
O perfil SDM continua candidato até a conferência em bancada da issue #12.

## Preparação

Use development build próprio, com NFC/SQLite/SecureStore, conta ADMINISTRADOR
online e API acessível. Expo Go/navegador não executam comandos administrativos.
O administrador importa previamente o inventário privado de credenciais e suas
versões pelo CLI da API, com mestra externa. Não há senha padrão, chave digitada
na tela, geração local de chave ou tentativa automática de credencial alternativa.
Veja [cofre e protocolo da API](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/codex/issue-12-secure-messaging/docs/ntag-administration.md).

Na aba **Vincular → Configurar NTAG 424 DNA**:

1. Escolha um pedido Cadastrado e toque em **Identificar NTAG 424 DNA**.
   O modelo e UID são preenchidos automaticamente; SELECT/GET_VERSION não leem
   o NDEF. Esta declaração do chip não comprova originalidade. UID público
   instável/oculto e Feiju são recusados antes de comandos administrativos.
2. Escolha UID, NDEF estático ou SDM. Para SDM, escolha a política estrita ou
   de registro tardio. **Preparar plano** salva o vínculo e recupera o alvo
   original por provisionamento/época na API, sem transmitir mutações NFC.
3. Confira pedido, UID, época, tratamento e versões. Marque a confirmação do
   plano e toque em **Aproximar e configurar**. A etiqueta deve permanecer junto
   à antena com rede estável. O progresso e o último resultado permanecem visíveis.
4. Após **Configuração conferida**, afaste a etiqueta. Confirme e toque em
   **Ler novamente e ativar**. Essa leitura usa outra sessão NFC; a API autentica
   a evidência SDM antes de ativar. A configuração conferida sozinha não ativa
   o vínculo nem representa um movimento logístico.
5. Finalize a operação administrativa para liberar futuras operações de
   administração. O plano, as credenciais no cofre e os diários permanecem.
   Para reutilização, encerre o vínculo em Gerenciar e crie outra época; não
   reinicie SDM mantendo as credenciais de uma época já utilizada.

O fluxo simples UID/NDEF da Feiju permanece separado. Na tela **Gerenciar**, um
vínculo NTAG oferece **Retomar configuração da NTAG 424 DNA**, inclusive após
reinício do app. Consulta/Operador e sessão offline não executam esta configuração.

## Interrupção e recuperação

O diário usa banco separado `nova-tag-administration.db`, WAL e synchronous FULL.
Não muda a fila `nova-tag-captures.db` nem seu schema v2. A conta e URL da API
delimitam os registros; o token não é salvo. A identidade declarada da estação e
o fingerprint do login delimitam cada RF; não certificam o aparelho.

Cada comando passa por **Aguardando envio → Tentativa → Resposta salva → Recibo
API**. A tentativa é confirmada em SQLite antes do NFC, e a resposta, incluindo
SW1/SW2, antes do HTTP. O recibo e o próximo comando são salvos atomicamente.
APDUs são opacas para o app; a autenticação/criptografia permanece na API.
O transporte recusa instruções fora da lista permitida e não envia SetConfiguration
ou comandos arbitrários. Diário visível mostra metadados; não exibe/exporta chaves,
tokens, desafios ou mensagens criptográficas.

Falha HTTP pode reenviar a **mesma resposta salva**, com os mesmos identificadores.
Isso nunca retransmite o comando à etiqueta. O app tenta o HTTP uma vez mais
enquanto a RF está válida; após perda/reinício, **Atualizar operação e diário**
recupera apenas HTTP, encerra a RF anterior e exige uma nova aproximação. Outra
conta/API/login não envia resposta da RF original. Sessão sem identidade RF local
exige encerramento na estação de origem ou expiração do prazo da API.

Na recuperação, selecione **Atual** (credencial anterior ao plano) ou **Alvo**
(credencial deste plano) para cada slot 0–4 e confirme o conjunto. Recibos de
troca sugerem Alvo; uma tentativa sem recibo deixa o slot sem seleção. O app não
  adivinha se a troca física aconteceu, não gera novo alvo e não tenta uma chave
alternativa após falha. Determine o material pela evidência da bancada antes de
confirmar. SDM final com prova completa faz somente conferência no servidor;
o app não reseta contador.

Cancelar, sair da tela ou colocar o app em background encerra a RF. O estado
`inactive` da folha NFC do iOS não cancela a sessão. Resposta NFC tardia ainda é
salva antes do encerramento do trabalho; ela não libera outro comando.
O orçamento da sessão administrativa no app é de 180 segundos; leituras comuns
continuam com 45 segundos e o mesmo proprietário exclusivo. A API tem seu prazo
próprio de 180 segundos, e o sistema operacional pode encerrar antes. Duração
efetiva e latência por comando ainda precisam ser medidas no aparelho real.

Leitura de ativação válida fica salva antes do HTTP. Se a resposta for perdida,
o app consulta o vínculo exato e oferece **Reenviar leitura de ativação** sem
reabrir NFC. Leitura estruturalmente inválida não ocupa o registro pendente;
rejeição SDM definitiva é preservada e permite nova leitura. Falha de rede conserva
a leitura original. Não desinstale/limpe dados com registros pendentes.

## Evidência e aceite

Testes locais usam SQLite real, adaptador nativo controlado e respostas sintéticas
de API/NFC para validar o transporte e a interface. A API usa PostgreSQL/Supertest,
EV2 e PICC sintética. Isso não comprova alcance da antena, proteções físicas,
protocolo no chip real, efeitos do SDK/OS no contador, instalação iOS ou ensaio Android.
Nenhum EAS/Actions/merge é iniciado para este incremento.

Antes de fechar #12: identificar lote/aparelhos/builds; executar e recuperar os
três tratamentos no chip real; demonstrar escrita pública negada e reconfiguração
autorizada; conferir CC/permissões/offsets/slots e mensagens SDM; medir contador
por sessão/SDK; executar online/offline/reinício com Android real e repetir com
outro integrante. #8 exige o piloto/coleta real e #9 a integração/reprodução final.
