# Ensaio do TCC — instrumentação #7

Em **Envios → Ensaio do TCC**, o operador vê seu identificador de aparelho, busca
os roteiros da API e seleciona caixa/etiqueta/etapa planejadas. O administrador
cadastra execução física e tentativas previamente e registra a observação
independente em outro momento. Roteiros sintéticos não geram leituras no app.

Abrir **Registrar etapa**, escolher a etapa indicada e ler a tag normalmente.
O diário persiste início antes do SDK; falha/timeout/cancelamento são preservados.
Confirmar a captura só mostra sucesso após commit de captura e associação ao
ensaio em SQLite. Os bytes/UUID/payload original não recebem campos experimentais.

Modo offline de ensaio pausa novos envios, consultas de decisão e estágios deste
operador. **Liberar comunicação e sincronizar** registra um T0 comum para as
capturas elegíveis e retoma o fluxo. É uma barreira do aplicativo; para ensaio de
rede real, bloquear conexão mantendo NFC disponível. Preparar o cache antes e
selecionar roteiro com fila ociosa. Requisições em curso não são revertidas.

O painel mostra estágios pendentes/confirmados/recusados. Capturas continuam na
fila habitual, com recibo original e revisão atual. A seleção/pausa e o diário são
separados por API/conta, persistem após reinício e não guardam tokens.
Recusados ficam preservados para inspeção da configuração/exportação. Não apagar
SQLite nem substituir valores ausentes para concluir um relatório.

SQLite sobe de v1 para v2 sem alterar capturas antigas. Reinício durante NFC
registra `LEITURA_INTERROMPIDA`. Durações usam `performance.now()` e origem UUID
por execução; mudança de origem censura o intervalo, sem subtrair relógios UTC.

Tempo `SESSAO_NFC_ATE_EVIDENCIA` inclui descoberta, aproximação, comunicação,
decodificação e encerramento do SDK, excluindo commit do início. **Não é RF pura.**
Há intervalos separados para confirmação local, requisição/resposta, total até
decisão e liberação controlada até todos os finais. Não comparar fronteiras
diferentes nem usar horário declarado do celular menos horário do servidor.

Contrato, dicionário, populações das métricas, CLI JSON/CSV, validador e cenários:
[docs/experimentation.md na API](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/codex/issue-7-experiment-instrumentation/docs/experimentation.md).
Dataset exportado apenas por administrador; clientes adulterados/reexecuções
usam perfil OPERADOR. Ground truth não é deduzido da decisão do servidor.

Verificação local: Jest/SQLite e ciclo HTTP/PostgreSQL com fixtures sintéticas;
bundle iOS exportado sem EAS. Os tempos físicos do iPhone e a NTAG 424 DNA ainda
precisam do ensaio #12/#8. A #7 altera somente JS/TS; o development build instalado
precisa dos módulos SQLite/rede adicionados na #4. Não desinstalar com fila pendente.
