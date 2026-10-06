# Prévia do Nova-tag no Expo Go

Documento histórico da branch `feat/expo-go-iphone`. A branch atual usa NFC físico
com development build: veja [Expo NFC real](04-expo-nfc-real.md) e o README.

## Isolamento e decisão

Worktree `C:\src\Nova-tag-expo`, branch `feat/expo-go-iphone`, mesmo repositório
Git do aplicativo. A branch parte da autenticação e incorpora os commits NDEF da main.
O checkout original permanece em `C:\src\Nova-tag`. Não foi criado outro repositório.

O Expo Go atual requer alinhar React Native/React ao SDK 57. Entry point usa
`registerRootComponent`; Babel e Metro usam os presets Expo. As configurações nativas
antigas de RN 0.79 foram removidas desta branch, que passa a usar configuração Expo.
Não executar os comandos de Gradle/CocoaPods do guia histórico nesta prévia.

## Adaptadores

- `SecureSessionStorage`: Expo SecureStore no aparelho; valida o formato da sessão
  e propaga falhas de armazenamento. Senha nunca é persistida.
- `.web.ts`: sessão apenas em memória para a prévia no navegador, sem localStorage.
- `Leitor`: formulário explícito de captura simulada. Não importa nem inicializa
  módulos NFC nativos. Permite UID normalizado, texto NDEF e erro simulado.
- Ícones: fontes de `@expo/vector-icons`, compatíveis com Expo Go.
- Domínio, casos de uso de sessão e HTTP autenticado permanecem compartilhados.

Os stubs de provisionamento/eventos anteriores continuam stubs, com mensagens que
informam que não houve persistência ou gravação física. Somente autenticação/sessão
utilizam a API real. Nenhuma leitura é apresentada como prova de hardware.

## Rede e execução

```sh
npm ci
npm start -- --lan --port 8082
```

Mesmo Wi-Fi para iPhone/computador. O QR precisa conter `exp://<IPv4>:8082`, em vez
de uma URL HTTP do Metro nativo. Atualizar Expo Go na App Store. Autorizar acesso à
rede local no iPhone quando solicitado. O computador deve permitir Node no firewall.

`EXPO_PUBLIC_API_URL` pode apontar para `http://<IPv4>:3000/api/v1` em `.env`
(ignorado pelo Git). Se não configurada, o host do Metro é usado para sugerir a API.
Em um túnel Expo, configurar explicitamente uma API alcançável pelo aparelho: o túnel
do Metro não expõe a API automaticamente.

Para retornar ao desenvolvimento nativo, usar o checkout original. Para evoluir esta
branch com NFC real, será necessário implementar o adaptador nativo e configurar um
development build com permissões/assinatura iOS e testes físicos. O leitor simulado
não muda automaticamente para leitura real ao gerar um binário nativo.

## Custos e validação

Todas as verificações são locais. Workflow permanece manual e verifica tipos, lint,
testes e exportação JavaScript, sem instalar SDK Android ou compilar APK. Não houve
execução de GitHub Actions nem EAS Build nesta migração.

Testes de sessão/UI existentes são mantidos; os novos testes cobrem captura simulada
e falhas do adaptador SecureStore. Exportações iOS/web/Android verificam o bundle.
Validação no browser complementa os testes, sem comprovar execução física no iPhone.
O browser exige CORS na API. A validação automatizada usa uma ponte HTTP apenas
no teste para acessar a API local real; a configuração da API não foi alterada.
No Expo Go, as chamadas nativas não dependem de CORS.

O audit npm ainda aponta avisos transitivos na toolchain Expo/Metro/Jest e geração
de projetos nativos. As correções compatíveis foram aplicadas; as sugestões restantes
envolvem trocar de SDK ou versões incompatíveis. A prévia é para desenvolvimento
local, sem publicação nem build remoto; atualização da toolchain deve preservar
a compatibilidade com o Expo Go.
