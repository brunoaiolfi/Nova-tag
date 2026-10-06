# Capturas duráveis e sincronização — #4

Branch `codex/issue-4-durable-offline`. A captura confirmada passa a ser salva em
SQLite antes de qualquer envio. Dependências nativas novas (`expo-sqlite` e
`expo-network`) exigem atualizar o development build; o aplicativo iOS anterior
não contém esses módulos. Não há fallback silencioso para memória.

## Usar no laboratório

1. Entre com conexão. Na aba **Envios**, use **Disponibilizar etiqueta para offline**
   e leia cada etiqueta que será usada. O app consulta o vínculo ativo na API.
2. Essa confirmação fica disponível por até 24 horas, apenas para a mesma API e
   operador. O login previamente verificado também precisa continuar dentro da
   validade. Etiquetas desconhecidas/expiradas precisam de conexão; provisionar
   ou ativar etiquetas continua sendo uma operação online.
3. Na aba **Registrar**, escolha a etapa, leia e confirme. **Captura salva neste
   aparelho** aparece somente após o commit local. Pode sair da tela, fechar o
   app e reabri-lo. Leituras ainda não confirmadas continuam sendo trabalho da tela.
4. Abra **Envios** para acompanhar. Reconexão/retorno ao primeiro plano tentam
   sincronizar; **Sincronizar agora** permite retomada explícita. O app não executa
   um serviço permanente em background. Registros aguardam a próxima abertura.
5. Confira separadamente o envio e a decisão logística. **Operação aceita** é a
   autorização do servidor; uma tentativa rejeitada permanece no histórico sem
   alterar o pedido. Conflitos e erros definitivos ficam visíveis, sem retry infinito.

Encerrar sessão, expirar o token ou entrar com outra conta não apaga capturas.
Outra conta não vê/envia os registros anteriores. Entre novamente com o operador
original na mesma API para retomá-los. Não desinstale o app ou limpe seus dados
enquanto houver registros pendentes: isso remove o SQLite local. O armazenamento
local não representa backup externo.

## Contrato e invariantes

O UUID é gerado na leitura e mantido na confirmação/reenvio. Payload, horário
declarado, dispositivo, operador, bytes Base64/URI, provisionamento e época ficam
congelados. Reutilizar uma etiqueta nunca reatribui uma captura antiga. A API
revalida o vínculo no recebimento; o cache não comprova que ele continua vigente.

NDEF do projeto consulta a referência exata, inclusive quando o UID da cópia é
diferente. Referência inválida não cai para UID. A classificação de suspeita é
produzida pela API. Não existe associação posterior de etiqueta desconhecida;
a mensagem explica a necessidade de disponibilizá-la com conexão.

SQLite tem migration `user_version=1`, WAL, transações exclusivas, sincronização
FULL, índices, triggers de imutabilidade de entrada e primeiro comprovante.
Token/senha continuam no SecureStore, nunca no banco da fila. O SQLite da fila
não usa criptografia adicional; contém evidências e identificadores locais do
laboratório dentro do armazenamento privado do app.

| Transporte | Significado |
| --- | --- |
| QUEUED | Salva localmente, ainda não enviada |
| SENDING | Claim de envio em andamento; lease de 45 segundos |
| RETRY | Falha transitória/resposta incerta; mesmo payload será reenviado |
| AUTH_REQUIRED | Aguarda autenticação do operador original |
| STORED | Comprovante durável recebido da API |
| CONFLICT | Mesmo UUID com conteúdo diferente; original preservado |
| FAILED | Erro definitivo exibido, sem retry automático |

Negócio é independente: NONE, PENDING, ACCEPTED ou REJECTED. PENDING está preparado
para #6; atualmente a API rejeita sequências incompatíveis, sem reavaliação.
Consultar uma futura decisão atual modifica apenas sua projeção, preservando
entrada e primeiro comprovante. Não afirmar que reconciliação já está implementada.

O sincronizador compartilha a execução concorrente, reclama cada item uma vez,
envia um registro por pedido a cada lote e só libera o seguinte após a resposta
do anterior. Lease vencido permite recuperação de envio interrompido; um recibo
atrasado não confirma um claim posterior. Tentativas usam atraso exponencial
limitado a 5 minutos. HTTP usa sessão atual, mas exige API e operador originais.
Recepção parcial conserva os demais itens; corpo inválido/incompleto mantém o
payload para reenvio. Lotes usam `/eventos/lote`, até 20 itens/28.000 bytes UTF-8,
abaixo do limite servidor de 50 itens/32 KiB.

Uma identidade salva e previamente verificada permite somente captura local
quando a API está inacessível. Um token salvo sem essa verificação, identidade
expirada ou 401 conhecido exige login. O modo offline nunca libera HTTP e não
transforma o perfil local em autorização do servidor. Na volta da conexão a
sessão é conferida novamente antes do envio.

SDM operacional ainda é recusado. A fila é capaz de persistir bytes opacos; o
teste sintético disso não autentica SDM. Verificador é #5, integração/reconciliação
é #6 e fluxo/aceite físico UID/NDEF/NTAG 424 DNA é #12.

## Reproduzir a verificação nativa

Os testes Jest da fila usam `node:sqlite`, arquivo real e classes de produção.
Não usam um repositório em memória. O harness nativo separado em
`scripts/native-offline-harness` usa Expo SQLite/SecureStore, coordenador e
provider de produção contra API/PostgreSQL reais. As entradas são explicitamente
**sintéticas**, sem leitor NFC ou alteração de etiqueta. Não fazem parte da navegação
do aplicativo de trabalho.

Compilar/instalar o APK local conforme o guia de autenticação. No repositório da API:

```powershell
npm run build
$env:OFFLINE_ACCEPTANCE_FILE = 'C:\src\Nova-tag-expo\.tmp\offline-native\config.json'
node scripts/offline-acceptance-api.cjs
```

O script usa banco isolado `nfc_trace_offline_acceptance_test`, porta 3114 e contas
efêmeras aleatórias. Para outra instalação, definir `OFFLINE_TEST_DATABASE_URL`
local com banco terminado em `_test`. Nunca usar contas reais no harness.
Em outro terminal no mobile, mantendo a mesma variável:

```powershell
cd scripts/native-offline-harness
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
npx expo start --host lan --port 8083
adb reverse tcp:8083 tcp:8083
adb reverse tcp:3114 tcp:3114
adb shell am start -a android.intent.action.VIEW -d 'novatag://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083' com.joaoaugustopf.novatag.nfc
```

Não publicar o arquivo privado nem expor esse Metro no túnel. A fixture inclui
credenciais temporárias no bundle de teste. Parar API/Metro e revogar as sessões
temporárias após o ensaio. Os diretórios `.tmp`, `.expo`, builds e credenciais
permanecem ignorados pelo Git.

Entrar A, disponibilizar UID/NDEF, remover apenas o reverse 3114 e habilitar modo
avião no emulador. Restaurar sessão, capturar UID/NDEF e conferir a confirmação
local. Forçar encerramento/reabrir, depois reiniciar o Android e repetir a consulta.
Manter apenas reverse 8083 para carregar JavaScript do development build, sem
acesso à API. Recuperar API/rede, verificar sincronização dos mesmos IDs e seus
efeitos no PostgreSQL. O Metro acessível não simula conectividade com a API.

O helper `node scripts/native-offline-harness/adb.cjs status` mostra resultados
sem senha/token. `tap '<rótulo>'` opera botões observados na árvore do Android.
**Perder resposta** descarta deliberadamente uma resposta bem-sucedida após o
commit real; o reenvio deve recuperar seu primeiro comprovante. Testar também
troca A/B, logout/login A e acionamentos concorrentes. Os testes de contrato
Supertest comprovam lote misto, conflitos e permissões.

Não houve novo build EAS nem Actions. Para instalar esta mudança no iPhone,
executar explicitamente `npx --yes eas-cli@24.10.0 build --platform ios --profile development`,
selecionar o dispositivo já registrado e instalar o resultado. O QR do Metro
abre o JavaScript; não atualiza módulos nativos. Exportação local do bundle iOS
verifica empacotamento, mas não substitui esse build nem um ensaio físico.

## Resultado em 6 de outubro de 2026

- Mobile: **221 testes / 23 suítes**, lint e tipos; exportação local iOS passou.
  Quinze testes de fila usam SQLite real, incluindo fechamento/reabertura, claim
  concorrente, lease vencido, resposta perdida, estados mistos, cache/épocas,
  identidade, imutabilidade e preservação opaca de bytes SDM sintéticos.
- API: **76 testes / 7 suítes**, PostgreSQL real/Supertest, 8 limites arquiteturais,
  tipos, formatação, build e OpenAPI. Seis testes novos cobrem lote e contrato.
- APK debug compilado localmente, instalado com `adb install -r`, Android 16/API 36,
  AVD Pixel_Android16 x86_64. SHA-256 do APK:
  `e15bbc51f3a96117382df57520ee349749156367ba58b57c8b65525c8c6cf249`.

| Ensaio nativo com entradas sintéticas | Resultado observado |
| --- | --- |
| API inacessível + modo avião | Identidade anteriormente verificada abre coleta local; cache ativo permite captura |
| Encerramento forçado e abertura fria | Mesmos UUIDs, bytes, época e estados recuperados do SQLite; sessão recuperada pelo SecureStore |
| Reinício do Android sem acesso à API | Capturas confirmadas preservadas, incluindo UID/NDEF; Metro apenas fornece JS do development build |
| Reconexão | UID/NDEF aceitos; repetição de COLETA permanece rejeitada sem novo efeito |
| Resposta descartada depois do commit de RECEBIMENTO | Dois envios, mesmo UUID/payload, uma movimentação PostgreSQL e comprovante recuperado |
| Conta A → B → A | B não exibe registros de A; todos reaparecem em A |
| Logout e login A | Capturas e primeiros comprovantes preservados |

Durante a preparação, duas entradas inválidas do harness incluíram NDEF com tipo
objeto. A API respondeu 400 por item, e os registros permaneceram FAILED sem
retry infinito ou movimentação. A fixture foi corrigida e a confirmação agora
recusa esse tipo inválido antes de salvar. O fluxo UID sem NDEF foi repetido e
aceito. Falhas de preparação não foram apresentadas como leituras NFC reais.

Nenhuma tag real participou desses ensaios. A Feiju disponível, a NTAG 424 DNA,
mensagens físicas, SDM e operação real dos três tratamentos continuam na #12.
O iPhone anterior não foi atualizado nem testado com SQLite nesta entrega.
