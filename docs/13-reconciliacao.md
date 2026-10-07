# Pendências logísticas e decisões — #6

Branch `codex/issue-6-event-reconciliation`, baseada em #5. API e app implementam
software de reconciliação; não dependem de NTAG 424 DNA. Aceite físico continua #12.

Na aba **Envios**, “salva neste aparelho” significa transporte ainda pendente.
“Salva no servidor · aguardando etapa anterior” indica captura confirmada que ainda
não movimentou o pedido. A tela informa as etapas necessárias e o prazo. Rejeição
definitiva informa o motivo; SDM tardio fica preservado sem movimentação automática.

O mesmo tratamento aparece ao confirmar uma captura e no **Histórico**. A linha do
tempo mantém a ordem de recebimento; uma captura reconciliada apresenta todas as
decisões e seus horários, sem fazer a leitura desaparecer nem trocar seu UUID.
Use **Atualizar histórico** para consultar a projeção atual da API.

Envios atualiza decisões automaticamente ao abrir/retomar, reconectar e a cada 15
segundos em primeiro plano. Requisições simultâneas de atualização são reunidas;
SQLite aceita somente uma revisão maior, impedindo que resposta antiga reverta a
decisão. O comprovante de envio e o payload permanecem imutáveis após reinício.

O prazo definido pela API é até 24h do recebimento, limitado pela validade da sessão
original. Revogação/logout, expiração, encerramento do vínculo ou etapa já ultrapassada
encerram a pendência. Entrar com outra sessão não muda sua autoria. A API executa
`all` ou `api` + `events`; apenas `api` não processa reavaliação.

POST/lote sempre devolvem o recibo original de idempotência; GET/histórico devolvem
decisão atual e `historicoDecisoes`. Não reenviar uma pendência com UUID novo nem
inventar uma leitura SDM. Evidência SDM NOVA já reservada permanece com seu UUID;
TARDIA/reutilizada nunca ganha autorização só pela chegada de uma etapa anterior.

Verificação: SQLite real/Jest testa recibo, reabertura, resposta antiga e projeção;
testes de tela cobrem pendência, prazos, revisões e tratamento tardio. O teste
`scripts/reconciliation-acceptance.cjs` da API usa este código da fila contra HTTP e
PostgreSQL reais para os três tratamentos, com fixtures declaradas e sem NFC físico.
Procedimento, políticas e campos em
[guia da API](https://github.com/Joao-AugustoPF/nfc-trace-api/blob/codex/issue-6-event-reconciliation/docs/reconciliation.md).

Mudanças #6 são JS/TypeScript e não acrescentam módulos nativos. O iPhone ainda
precisa do development build com SQLite/rede da #4. Não houve EAS, Actions, nova
instalação iOS ou aceite físico nesta etapa. Nenhuma simulação foi inserida no app.
