# Hardware NFC — progresso da issue #1

**Registro histórico de implementação.** O mantenedor aprovou o software #1/#2/#3 para publicação. Personalização administrativa, proteção, recuperação e aceite físico pendentes estão na [issue #12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12); integração na main permanece nos PRs. Estados de issue/branch desta etapa são históricos. Veja [situação atual](10-estado-do-projeto.md).

Atualização local de 6 de outubro de 2026. Branch `codex/issue-1-nfc-hardware`,
base mobile `b237ef3`, incluindo `origin/main` (`e085cbc`). Sem push, merge,
GitHub Actions ou build EAS. O usuário dispõe apenas da etiqueta Feiju da foto;
nesta entrega não houve acesso físico a uma NTAG 424 DNA.

## Implementado

- Uma sessão exclusiva compartilhada por leitura, gravação e diagnóstico.
  Cancelamento e timeout de 45 segundos interrompem o resultado imediatamente;
  a exclusividade permanece até o trabalho nativo e o encerramento terminarem.
  Cada chamada verifica cancelamento antes e depois de aguardar o adaptador,
  impedindo abrir uma janela NFC depois de cancelar durante a preparação.
- Códigos estáveis e mensagens para cancelamento, timeout, perda de conexão,
  NFC desativado, indisponibilidade, UID inválido e protocolo incompatível.
  Cancelamento durante a gravação não confirma configuração ou ativa um vínculo.
  Uma escrita já enviada ao chip pode ter ocorrido e exige releitura ao retomar.
- Diagnóstico administrativo em **Vincular → Diagnosticar etiqueta**, separado
  dos registros logísticos e independente da API. O resultado permanece visível;
  outra tentativa que falhar mantém o resultado anterior com sua data.
- Adaptador APDU de consulta Type 4/IsoDep: seleção da aplicação NDEF, GET_VERSION
  em três quadros, CC, seleção do arquivo pelo identificador do CC, NLEN e leitura
  binária em blocos limitados por MLe. Status, tamanhos e limites são conferidos.
  Mapeamentos extended/versões desconhecidas não são assumidos como compatíveis.
- Relatório compartilhável com UID, tecnologias, plataforma, versão do sistema,
  versão do manifesto, build nativo informado pelo aparelho, comandos/respostas
  APDU e mensagem NDEF original em hexadecimal. O build não é inferido do manifesto
  do Metro, que pode estar mais recente que o aplicativo instalado.
- Modelo compatível somente após conferir os campos e quadros GET_VERSION.
  Fabricante pelo UID ou tecnologia ISO 14443-4 não identificam o modelo.
  A declaração de versão também não prova autenticidade criptográfica.
- Domínio e aplicação NFC são TypeScript puro, com portas para APDU e agendamento.
  ESLint impede imports de infraestrutura, React Native e Expo nessas camadas.

## Limites desta entrega

O diagnóstico usa comandos de consulta, sem autenticar, alterar chaves, permissões
ou gravar dados. Consultar NDEF numa etiqueta já configurada para SDM pode avançar
o contador do chip; isso não é uma movimentação logística nem prova de frescor.

O CC declara capacidade/permissões, mas não comprova a proteção por chave.
GET_VERSION sem sucesso deixa o modelo não confirmado; isso não significa que toda
leitura UID ou NDEF estático seja impossível. Não há fallback para SDM ou para outro
tratamento. O diagnóstico APDU exige Type 4/IsoDep; a leitura cotidiana também
aceita as outras tecnologias já suportadas pelo adaptador.

A leitura cotidiana agora prioriza IsoDep e usa os bytes originais da mensagem
Type 4 tanto para interpretar a referência quanto para enviar `bytesBase64` na
captura. Outras tecnologias e a conferência de escrita continuam usando registros
do SDK; nelas, a ausência de bytes originais permanece explícita. Não há recodificação
de registros como evidência. Detalhes da etapa seguinte e limites do SDK/SDM em
[08-evidencia-operacional.md](08-evidencia-operacional.md). O aceite físico continua
pendente e o relatório de diagnóstico não é associado automaticamente a uma captura.

Na etapa seguinte, o diagnóstico passou a consultar GetFileSettings apenas em
chips com declaração de versão compatível, com relatório v2 de permissões/SDM.
Foi acrescentado um gerador e comparador de perfil **candidato** de bancada.
Veja [09-perfil-sdm-bancada.md](09-perfil-sdm-bancada.md); não é configuração física.

Não foi implementada nesta entrega a personalização autenticada NTAG 424 DNA,
proteção reversível por chave ou um perfil SDM aceito em bancada. A gravação NDEF
existente grava e relê a referência, mantendo o vínculo pendente em caso de falha;
nunca utiliza `makeReadOnly` ou bloqueios irreversíveis. Chaves de administração
não estão presentes no aplicativo, fixtures ou relatório.

## Validação local da etapa inicial de diagnóstico

- `npm test -- --runInBand`: 94 testes, 16 suítes. Inclui cancelamento na preparação,
  cancelamento durante escrita pendente, timeout, exclusão concorrente até cleanup,
  erro nativo, perda de conexão, quadros malformados, status inesperados, CC/NLEN
  inválidos, leitura fragmentada, hardware desconhecido e permanência do resultado.
- `npm run typecheck` e `npm run lint`: passaram.
- Exportação local do bundle iOS: passou; não é um build nativo nem teste físico.
- Navegação administrativa e layout web em 320/390 pixels, com login/API reais:
  passaram. Botão NFC permanece indisponível no navegador; não é aceite físico.
- Cliente de autenticação real: três perfis, restauração, 403, revogação/401 e
  logout verificados novamente contra a API isolada.
- API: 66 testes com PostgreSQL real passaram. API, Metro e ngrok mantidos ativos.

O vetor público GET_VERSION vem da AN12196, seção 5.5, tabela 12. Fixtures CC/NDEF
dos testes são sintéticas e estão identificadas como tal; não são amostras do lote,
nem amostras SDM reais. Testes de adaptadores utilizam uma ponte nativa simulada
apenas no ambiente de testes. O aplicativo não contém um modo de NFC simulado.

## Roteiro com a etiqueta Feiju

1. Recarregar o aplicativo de desenvolvimento já instalado. Entrar com o perfil
   Administrador, abrir **Vincular** e **Diagnosticar etiqueta**.
2. Aproximar a etiqueta e manter até terminar. Conferir UID, data, tecnologias,
   capacidade NDEF e eventual recusa GET_VERSION. Modelo deve continuar não
   confirmado se a etiqueta não responder com o protocolo esperado.
3. Compartilhar o relatório para guardar a evidência. Anotar externamente lote,
   formato/antena e modelo do aparelho. Não tratar essa leitura como ensaio NTAG 424.
4. Repetir três vezes com a mesma etiqueta, afastando-a entre sessões. Comparar
   UIDs; um UID coincidente numa única leitura não comprova estabilidade.
5. Cancelar antes de aproximar e deixar uma tentativa expirar; depois iniciar outra.
   Durante a gravação NDEF de teste, remover a etiqueta e retomar o mesmo vínculo
   pendente, conferindo fisicamente o conteúdo antes de ativar.

Este roteiro ainda precisa ser executado no aparelho e ter os relatórios anexados.
A foto anterior é evidência de tecnologia/UID, não de execução deste adaptador.

## Para concluir #1 e liberar #2/#5

- Obter a NTAG 424 DNA e identificar lote, antena, aparelho e versões reais.
- Repetir detecção/GET_VERSION, UID estável com RandomID desabilitado e NDEF.
- Implementar e testar personalização autenticada, proteção por chave e recuperação
  de configuração parcial; provar escrita não autorizada negada e reconfiguração
  autorizada possível, preservando reutilização entre tratamentos.
- Fixar o perfil SDM após a bancada: arquivo, permissões, offsets, representação e
  identificadores de chave. Guardar segredos fora do app e do Git, com acesso de
  bancada controlado. Novo contador/época exige o material de chave adequado.
- Anexar amostras SDM reais e vetores públicos separados, revisar com o colega e
  integrar as branches quando autorizado. Só então encerrar a issue.

O aceite nativo de autenticação foi documentado em
[05-aceite-autenticacao.md](05-aceite-autenticacao.md). A #3 permanece aberta pela
revisão e integração; o antigo impedimento de SDK/JDK/Keychain não se aplica à
versão Expo, validada com SecureStore e APK Android local.

## Referências de protocolo

[NTAG 424 DNA, datasheet Rev. 3](https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf)
e [AN12196, Rev. 2](https://www.nxp.com/docs/en/application-note/AN12196.pdf).
Os campos de subtipo e revisões de software variam entre os exemplos oficiais;
o relatório preserva seus bytes, sem inferir capacidade NDEF pelo código de armazenamento.
