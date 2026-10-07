# Nova-tag NFC — Expo Development Build

Aplicativo Expo com NFC físico e API NFC Trace. Branch `codex/issue-4-durable-offline`, no
worktree `C:\src\Nova-tag-expo`, dentro do mesmo repositório. O checkout original
em `C:\src\Nova-tag` permanece separado. Não foi feito merge na main.

Software #1/#2/#3, fila durável #4 e validação SDM #5 implementados. Personalização/proteção
e aceite físico ficaram na #12; reconciliação e experimentos continuam pendentes.
Veja [entregas atuais e próximas etapas](docs/10-estado-do-projeto.md).

## Instalar no iPhone usando Windows

É necessário instalar um **development build próprio**. Expo Go não contém o
módulo NFC. EAS compila na nuvem sem Mac local, mas a instalação no iPhone exige
assinatura ativa do **Apple Developer Program** e dispositivo registrado. Ter
apenas o aplicativo Apple Developer instalado não substitui a assinatura.

O projeto [joaoaugustopfpf/nova-tag-nfc](https://expo.dev/accounts/joaoaugustopfpf/projects/nova-tag-nfc)
está configurado. Nenhum build remoto é iniciado pelos scripts de desenvolvimento
ou pelo push. Execute a compilação quando quiser consumir um build EAS; ela segue
a cota/cobrança da conta Expo, independentemente do GitHub Actions.

```powershell
cd C:\src\Nova-tag-expo
npm ci
npx --yes eas-cli@24.10.0 device:create
npx --yes eas-cli@24.10.0 build --platform ios --profile development
```

Faça login Apple e responda ao segundo fator **no terminal**. Abra no iPhone o
link de registro gerado pelo primeiro comando. Selecione esse dispositivo durante
o build. Quando terminar, abra o link/QR de instalação no Safari. Ative o Modo de
Desenvolvedor quando solicitado. Veja o
[procedimento oficial](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

## Rodar no laboratório

```powershell
npm start -- --lan --port 8082 --scheme novatag
```

Abra o QR do Metro no **Nova-tag NFC instalado**, com iPhone e computador no mesmo
Wi-Fi. Esse QR abre o projeto; não instala o aplicativo. Use iOS 16.4 ou posterior
(Expo SDK 57). Inicie a API separadamente. Configure `.env` conforme `.env.example`,
usando o IP do computador e `/api/v1`, nunca localhost no iPhone. Permita rede
local no iPhone. Não coloque credenciais em variáveis `EXPO_PUBLIC_*`.

Após login, use **Escanear etiqueta** na tela inicial. Toque em **Ler etiqueta**,
aproxime a tag da parte superior do iPhone e mantenha-a parada. O resultado fica
aberto até **Concluir consulta**, com UID, conteúdo NDEF e detalhes técnicos.
Você pode afastar a etiqueta assim que a leitura terminar. Essa consulta não grava
dados nem cadastra vínculo.

Para vincular, selecione um pedido da lista com busca por código/descrição e paginação.
O Administrador também pode usar **Novo pedido**, cadastrar código/descrição e
confirmar **Usar este pedido** antes de ler a etiqueta. O modelo vem
como **Desconhecido**; use as opções apenas se souber o chip. Leia e confira a tag,
vincule ao pedido e conclua a configuração/ativação. Na aba Registrar, escolha a
operação, leia, confira e confirme a captura. Ela é salva em SQLite antes do envio.
O comprovante permanece na tela e
distingue captura salva, operação autorizada/rejeitada e leitura suspeita.
Na aba **Envios**, disponibilize etiquetas com conexão antes da coleta offline
e acompanhe tentativas/decisões. Veja [captura offline e sincronização](docs/11-captura-offline.md).

Na aba **Rastreio**, leia a etiqueta ou busque o pedido na lista. Também há o
botão **Ver histórico desta etiqueta** no resultado da leitura e após enviar um
evento. A consulta mostra provisionamento, operações autorizadas e tentativas
rejeitadas, estado atual do pedido e horários do servidor/aparelho. **Carregar mais
registros** continua a paginação; **Atualizar histórico** consulta novamente a API.
O histórico é atualizado ao retornar à aba depois de registrar uma operação.

O Administrador pode abrir **Sobre a etiqueta deste pedido → Gerenciar este vínculo**
no histórico ou **Vincular → Gerenciar etiqueta** para consultar pela leitura física.
A tela mostra pedido, UID, época e situação. **Encerrar vínculo** exige conferir o
pedido e confirmar: libera a etiqueta, preserva o histórico e mantém o estado
logístico do pedido. **Vincular a outro pedido** inicia uma nova etapa com o modelo
já cadastrado e exige reler a mesma etiqueta; a API atribui a próxima época.
O [guia da integração online](docs/07-pedidos-e-vinculos.md) descreve recuperação
de respostas perdidas, reutilização e limites do aceite físico.

Ao consultar uma tag, **Esta etiqueta** mostra somente o provisionamento identificado;
**Pedido completo** inclui seus demais vínculos. UID consulta o último vínculo da tag,
enquanto a referência NDEF consulta o vínculo exato, inclusive se encerrado. Para
pedidos de épocas anteriores, use a busca por pedido. A consulta não altera a tag
nem registra outro evento e está disponível também para o perfil Consulta.

Mudanças apenas de interface/JavaScript são carregadas pelo Metro no development
build já instalado, sem iniciar outra compilação EAS. Dependências ou configurações
nativas novas exigem outro build. A #4 adiciona SQLite e monitoramento de rede;
atualize o development build iOS para usar a fila. Nenhum build EAS é iniciado automaticamente.

## Interface de rastreio

A situação atual do pedido aparece acima das etapas conectadas: cadastro,
coleta, recebimento e entrega. A expedição aparece como um marco adicional quando
registrada; não é requisito para mostrar a entrega. A linha do tempo abaixo
preserva a ordem do servidor e inclui tentativas rejeitadas, sem avançar o trajeto.
O horário declarado pelo aparelho, autoria e identificadores ficam nos detalhes
de cada registro. Divergências e rejeições permanecem visíveis.

As ações principais têm altura mínima de 60 px e texto que pode ocupar mais de
uma linha. Leitura, vínculo e registro mostram seu progresso e exigem confirmação
explícita. A tela inicial destaca a leitura em um painel branco sobre o cabeçalho
azul e agrupa os atalhos em blocos grandes. Em telas estreitas ou com fonte ampliada,
os atalhos passam para uma coluna. O laranja destaca a ação inicial e o registro;
verde, amarelo e vermelho identificam decisões e alertas. O histórico conecta a
situação atual à sequência de registros, com dados técnicos expansíveis. Os fluxos
de leitura e registro mantêm a confirmação acessível no rodapé.
O login utiliza a conexão configurada no ambiente; o endereço pode ser alterado
em **Configuração de conexão**. Não houve alteração do contrato HTTP ou do leitor
NFC nativo nesta revisão visual.

## Operações reais

- Login, sessão, expiração e logout com API e Expo SecureStore.
- Cadastro e busca de pedidos por código/descrição; código único no servidor.
- Provisionamento por UID ou NDEF; modelo declarado.
- Encerramento confirmado e reutilização em nova época, preservando históricos.
- Registro antes da escrita; NDEF usa a URI opaca emitida pela API.
- Conferência do UID antes de escrever e releitura após a escrita.
- Ativação somente após confirmação explícita da configuração física.
- Capturas físicas e decisões logísticas da API, inclusive rejeições armazenadas.
- NDEF copiado identifica o vínculo pela referência; UID divergente é avaliado
  pelo servidor sem validação conjunta inventada pelo mobile.
- Fila SQLite mantém UUID, horário, leitura, operador e época após fechar/reiniciar.
- Sincronização recuperável, manual e em primeiro plano, com resultados por item.
- Leituras Type 4/IsoDep preservam o NDEF original em Base64; a URI vem dos
  mesmos bytes, sem reconstrução pelo SDK. A captura é congelada antes da consulta
  ao vínculo. Veja [bytes da captura e limites físicos](docs/08-evidencia-operacional.md).

Esta branch não simula operações. Expo Go e web informam que NFC está indisponível.
A prévia simulada permanece na branch anterior `feat/expo-go-iphone`.

O [guia de login](docs/02-autenticacao.md) documenta configuração, restauração,
restrições dos três perfis e compilação Android local. SecureStore substitui a
biblioteca Keychain da implementação nativa anterior.

## Limites

Esta versão **não altera chaves, configura SDM nem bloqueia a escrita**. A API
exige `bloqueioConfirmado`; a tela permite declarar isso somente após conferir
externamente a configuração e o bloqueio necessários ao ensaio. Não declare
bloqueio apenas porque a leitura/gravação funcionou. Sem confirmação, o vínculo
fica pendente. O modelo da tag e seu procedimento físico ainda precisam ser
validados. MIFARE Classic não é compatível com iPhone; tags protegidas ou sem NDEF
podem não permitir essas operações.

Capturas confirmadas localmente persistem no aparelho. Etiquetas precisam de
vínculo ativo consultado online por esse operador nas últimas 24 horas; não há
associação offline de etiqueta desconhecida. Login verificado e ainda válido
permite coleta local quando a API está inacessível. Envio exige revalidar a sessão.
Não há serviço de background; a próxima abertura retoma os registros. Capturas SDM
de tags configuradas pela bancada são validadas na API; a reconciliação continua
na #6. Desinstalar/limpar dados remove a fila.

## Verificação local

```powershell
npm run check
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform all
```

Os testes cobrem autenticação, NFC com adaptador nativo substituído por mock,
decodificação URI/texto, gravação/releitura, divergência, retomada, reenvio e rejeição,
resultado persistente até confirmação, cancelamento, seleção paginada de pedidos,
buscas concorrentes e preservação do horário da leitura durante o reenvio.
O contrato UID/NDEF também foi exercitado contra API/PostgreSQL locais com fixtures
sintéticas. Testes da fila usam SQLite real. Plugin e schema Codegen foram verificados.
O development build iOS anterior,
`7ca41977-dee3-48b9-8d98-acb74368a285` foi concluído no EAS e instalado pelo usuário.
Ele precisa ser atualizado para os módulos da #4. Os testes automatizados não substituem
o ensaio físico de leitura e escrita.

`react-native-nfc-manager@4.0.0-beta.10` suporta a nova arquitetura segundo o
mantenedor, mas é beta. Expo Doctor mantém aviso de metadados da React Native
Directory (20/21 verificações). Não foi ocultado esse aviso.

GitHub Actions continua manual e desabilitado remotamente. Veja
[decisões e aceite físico](docs/04-expo-nfc-real.md).

A compilação Android e o login/SecureStore foram validados localmente em emulador,
incluindo reinício, falha de rede, logout, revogação e os três perfis. O
[registro de aceite da autenticação](docs/05-aceite-autenticacao.md) separa esses
resultados dos ensaios físicos NFC ainda pendentes.

O diagnóstico administrativo está em **Vincular → Diagnosticar etiqueta**. Ele
consulta GET_VERSION, permissões GetFileSettings de chips compatíveis e o NDEF
Type 4 original e permite compartilhar um relatório;
o resultado permanece visível, inclusive se uma nova tentativa falhar. Leitura,
gravação e diagnóstico compartilham uma sessão exclusiva com timeout de 45 segundos.
Veja [hardware NFC: progresso e roteiro](docs/06-hardware-nfc.md) para os limites,
testes e aceite físico ainda necessário. A branch atual é
`codex/issue-5-sdm-validation`; a integração na main permanece separada.

O [perfil SDM candidato e roteiro de bancada](docs/09-perfil-sdm-bancada.md)
inclui geração offline de NDEF/offsets e comparação estrutural com o relatório v2.
Ele funciona sem configurar etiquetas, armazenar chaves ou habilitar SDM na API.

O [guia de captura SDM](docs/12-validacao-sdm.md) documenta resolução sem fallback,
fila por época, validação no servidor e resultados separados da movimentação.
