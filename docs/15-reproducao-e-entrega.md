# Reprodução e APK candidato — preparação da #9

Branch `codex/issue-12-secure-messaging`, sobre a preparação #9. Reconciliação e
offline estão implementados; protocolo/analista preliminares estão na API #18.
Administração NTAG tem [fluxo integrado candidato](16-administracao-ntag.md).
Aceite/proteção física #12, piloto/coleta #8, integração na main e reprodução
por outro integrante continuam pendentes. Esta preparação não fecha #9.

## Checkout e execução

```powershell
git clone --branch codex/issue-12-secure-messaging https://github.com/brunoaiolfi/Nova-tag.git
cd Nova-tag
npm ci
Copy-Item .env.example .env
npm run typecheck
npm run lint
npm test -- --runInBand
```

Node 24.18+ da linha 24 é a versão comum validada com API/Expo. Alterar URL local
no `.env` para o computador da API, terminando em `/api/v1`; nunca colocar senha/
token em EXPO_PUBLIC. Em telefone usar IP LAN/HTTPS; em emulador Android 10.0.2.2
representa o host. A URL também pode ser conferida/configurada no login.
Fonte/build/dependências devem corresponder ao manifesto candidato da API.

## Build Android local com bundle

Android SDK e Java 17, com versões pedidas pelo prebuild/Gradle do Expo instaladas.
Este comando compila **localmente**: sem EAS/Actions. `android/` é gerado/ignorado;
preservar customizações privadas/builds necessários antes de regenerar esse diretório.

```powershell
$env:ANDROID_HOME = 'CAMINHO_DO_ANDROID_SDK'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
npx expo prebuild --platform android --no-install
.\android\gradlew.bat -p android assembleRelease --console=plain --no-daemon '-PreactNativeArchitectures=arm64-v8a,x86_64'
```

APK: `android/app/build/outputs/apk/release/app-release.apk`, versão **0.4.0**,
versionCode **4**, pacote `com.joaoaugustopf.novatag.nfc`. Bundle está embutido;
não exige Metro para abrir. Inclui NFC/SQLite/SecureStore/rede. Este build é para
laboratório com assinatura de desenvolvimento do template, não release de loja.
Guardar log Gradle, SHA-256 do APK e manifesto. Não versionar keystores/binários.

Instalar no Android de ensaio identificado, preservando dados quando compatível:

```powershell
adb devices -l
adb -s ID_DO_APARELHO install -r android/app/build/outputs/apk/release/app-release.apk
```

Não desinstalar/limpar dados com fila pendente. Se assinatura não corresponder,
preservar/exportar dados antes de decidir troca; não usar uma limpeza automática.
Emulador pode verificar instalação e abertura/login, **não NFC**. Registrar UID,
bytes, procedimentos e decisões no Android real só quando hardware/proteção #12
estiverem disponíveis. Tag Feiju não é equivalente ao lote NTAG controlado.

Development build continua disponível: `npm start -- --lan --port 8082 --scheme
novatag`. Expo Go não contém NFC. iPhone usa build próprio e Apple Developer/EAS;
nenhum novo build iOS é iniciado por esta entrega. Módulos SQLite/rede #4 precisam
estar no binário iOS. Alterações de módulos/configuração nativa exigem build próprio.

## Identificação de fonte e binário

`app.config.js` acrescenta somente hashes/revisão públicos a `extra.reproducibility`.
Não lê `.env` nem inclui seus valores. Diagnóstico físico registra essa identidade
do JS/config junto da versão e build nativo. Em development client, Metro pode
carregar outro JS: **identidade JS não certifica o binário nativo instalado**.
Reiniciar Metro depois de mudar a fonte/configuração para renovar os metadados.
Um release com bundle embutido precisa do log e hash de APK associados às fontes.

```powershell
New-Item -ItemType Directory -Path .tmp/delivery -Force
npm run source:manifest -- .tmp/delivery/mobile.json android/app/build/outputs/apk/release/app-release.apk
```

Manifesto usa revisão Git, alterações rastreadas, hashes de fontes/lock/configuração
e SHA-256 do APK. Saída deve ser nova. Associação do binário é declarada, até
conferir log, instalação e versão efetiva. Não exporta credenciais/contas.
Com APK, requer Python 3.12+ (somente biblioteca padrão) para ler configuração e
bundle embutidos. Conferir `embeddedSourceMatchesCheckout` e revisão/versão
embutidas; correspondência de fonte não comprova assinatura ou funcionamento NFC.
Código/configuração no workspace pode mudar após build; regenerar o manifesto
sozinho não recompila o APK. Não descrever um APK antigo como build atual.

## Roteiro de reprodução independente

Outro integrante deve instalar API pelo [guia correspondente](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/codex/issue-9-reproducibility/docs/reproduction.md),
criar contas sem senha padrão, instalar APK, configurar rede/login e verificar
permissões. Admin prepara vínculo; operador captura e consulta; Consulta só lê.
Exercitar seis eventos, tentativas inválidas, histórico, offline/reinício/perda de
ACK, reconciliação e épocas. Dados e comprovantes têm origem/verificação/decisão
separadas; não considerar HTTP 200 como autorização.

Depois do aceite NTAG #12, repetir UID/NDEF/SDM e proteção/administração, validar
bytes/chaves/contador/políticas e alimentar protocolo #8. Registrar tags/aparelhos/
builds/épocas e observador externo. Roteiros sintéticos da API verificam software,
sem simular leitura no aplicativo nem substituir o ensaio real.

Documentos 03/05/06/07/08 preservam registros históricos. O [estado atual](10-estado-do-projeto.md)
e este guia definem reprodução vigente; falhas/limites históricos não significam
que funcionalidades posteriores estejam ausentes. Integração/revisão/conclusões
permanecem #9. Nenhum push/PR deve reativar os workflows automáticos do GitHub.
