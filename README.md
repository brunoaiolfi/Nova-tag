# Nova-tag NFC — Expo Development Build

Aplicativo Expo com NFC físico e API NFC Trace. Branch `codex/nfc-onboarding`, no
worktree `C:\src\Nova-tag-expo`, dentro do mesmo repositório. O checkout original
em `C:\src\Nova-tag` permanece separado. Não foi feito merge na main.

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

Para vincular, selecione um pedido da lista com busca e paginação. O modelo vem
como **Desconhecido**; use as opções apenas se souber o chip. Leia e confira a tag,
vincule ao pedido e conclua a configuração/ativação. Na aba Registrar, escolha a
operação, leia, confira e confirme o envio. O comprovante permanece na tela e
distingue captura salva, operação autorizada/rejeitada e leitura suspeita.

Na aba **Rastreio**, leia a etiqueta ou busque o pedido na lista. Também há o
botão **Ver histórico desta etiqueta** no resultado da leitura e após enviar um
evento. A consulta mostra provisionamento, operações autorizadas e tentativas
rejeitadas, estado atual do pedido e horários do servidor/aparelho. **Carregar mais
registros** continua a paginação; **Atualizar histórico** consulta novamente a API.
O histórico é atualizado ao retornar à aba depois de registrar uma operação.

Ao consultar uma tag, **Esta etiqueta** mostra somente o provisionamento identificado;
**Pedido completo** inclui seus demais vínculos. UID consulta o último vínculo da tag,
enquanto a referência NDEF consulta o vínculo exato, inclusive se encerrado. Para
pedidos de épocas anteriores, use a busca por pedido. A consulta não altera a tag
nem registra outro evento e está disponível também para o perfil Consulta.

Mudanças apenas de interface/JavaScript são carregadas pelo Metro no development
build já instalado, sem iniciar outra compilação EAS. Dependências ou configurações
nativas novas exigiriam outro build.

## Interface de rastreio

A situação atual do pedido aparece acima das etapas conectadas: cadastro,
coleta, recebimento e entrega. A expedição aparece como um marco adicional quando
registrada; não é requisito para mostrar a entrega. A linha do tempo abaixo
preserva a ordem do servidor e inclui tentativas rejeitadas, sem avançar o trajeto.
O horário declarado pelo aparelho, autoria e identificadores ficam nos detalhes
de cada registro. Divergências e rejeições permanecem visíveis.

As ações principais têm altura mínima de 58 px e texto que pode ocupar mais de
uma linha. Leitura, vínculo e registro mostram seu progresso e exigem confirmação
explícita. A tela inicial agrupa as ações em uma lista, com a leitura em destaque.
O login utiliza a conexão configurada no ambiente; o endereço pode ser alterado
em **Configuração de conexão**. Não houve alteração do contrato HTTP ou do leitor
NFC nativo nesta revisão visual.

## Operações reais

- Login, sessão, expiração e logout com API e Expo SecureStore.
- Provisionamento de pedido existente por UID ou NDEF; modelo declarado.
- Registro antes da escrita; NDEF usa a URI opaca emitida pela API.
- Conferência do UID antes de escrever e releitura após a escrita.
- Ativação somente após confirmação explícita da configuração física.
- Capturas físicas e decisões logísticas da API, inclusive rejeições armazenadas.
- NDEF copiado identifica o vínculo pela referência; UID divergente é avaliado
  pelo servidor sem validação conjunta inventada pelo mobile.
- Reenvio na mesma tela mantém UUID, horário, leitura e operador originais.

Esta branch não simula operações. Expo Go e web informam que NFC está indisponível.
A prévia simulada permanece na branch anterior `feat/expo-go-iphone`.

## Limites

Esta versão **não altera chaves, configura SDM nem bloqueia a escrita**. A API
exige `bloqueioConfirmado`; a tela permite declarar isso somente após conferir
externamente a configuração e o bloqueio necessários ao ensaio. Não declare
bloqueio apenas porque a leitura/gravação funcionou. Sem confirmação, o vínculo
fica pendente. O modelo da tag e seu procedimento físico ainda precisam ser
validados. MIFARE Classic não é compatível com iPhone; tags protegidas ou sem NDEF
podem não permitir essas operações.

Capturas pendentes ficam em memória enquanto a tela estiver aberta; não há fila
offline persistente. Fechar/reiniciar perde a captura ainda não confirmada.
Offline, SDM e reconciliação continuam nas respectivas issues.

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
sintéticas. Plugin e schema Codegen foram verificados. O development build iOS
`7ca41977-dee3-48b9-8d98-acb74368a285` foi concluído no EAS e instalado pelo usuário.
Os testes automatizados não substituem o ensaio físico de leitura e escrita.

`react-native-nfc-manager@4.0.0-beta.10` suporta a nova arquitetura segundo o
mantenedor, mas é beta. Expo Doctor mantém aviso de metadados da React Native
Directory (20/21 verificações). Não foi ocultado esse aviso.

GitHub Actions continua manual e desabilitado remotamente. Veja
[decisões e aceite físico](docs/04-expo-nfc-real.md).
