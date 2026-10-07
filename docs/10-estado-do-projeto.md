# Entregas atuais e pendências

Atualização de 7 de outubro de 2026. Branch `codex/issue-6-event-reconciliation`,
baseada em `codex/issue-5-sdm-validation`. Publicação autorizada pelo mantenedor,
sem merge na main. Software #1/#2/#3/#4/#5/#6 implementado e validado localmente.

| Entrega | Disponível |
| --- | --- |
| #1 NFC | Sessão exclusiva, timeout/cancelamento, Type 4, bytes originais, diagnóstico e perfil SDM candidato |
| #2 Online | Pedidos, vínculos, ativação/encerramento/reutilização, eventos e histórico |
| #3 Identidade | Login/permissões, restauração/revogação/logout e SecureStore |
| #4 Offline | SQLite transacional, cache ativo por API/operador/época, recuperação, lote e Envios |
| #5 SDM | Resolução pelo provisionamento, bytes completos, cache/fila e apresentação de autenticação/uso/política separada da movimentação; verificação/épocas/chaves no servidor |
| #6 Reconciliação | Pendências e prazos, atualização automática da projeção, recibo imutável, versões e evolução da decisão no histórico |

Verificação atual: **232 testes/23 suítes mobile; 118/10 API**, SQLite e PostgreSQL
reais. Lint/tipos, build/OpenAPI e exportação local do bundle iOS. Vetores oficiais
NXP/NIST testam primitivas; fixtures de mensagens/perfil são sintéticas. A #4 já
tinha validado APK Android/SQLite/SecureStore contra API real com reinício offline,
reconexão e resposta perdida depois do commit. O ensaio integrado #6 usa fila mobile, SQLite e HTTP/PostgreSQL reais para UID/NDEF/SDM,
com reabertura do arquivo e recibo preservado. Não há aceite NFC real nesta #6.

Atualizar development build iOS continua necessário pelos módulos SQLite/rede #4.
As #5/#6 não acrescentam dependência nativa. Nenhum build EAS, GitHub Actions ou merge
foi iniciado. Workflows permanecem manuais e desativados remotamente.

A próxima entrega disponível é **#7 — instrumentação/exportação/cenários**, sem
NTAG 424 DNA. #4/#5/#6 concluídas permanecem como dependências históricas no GitHub;
integrar as bases ao assumir. Contrato #6 já está disponível para integração.

| Issue restante | Dependência pendente |
| --- | --- |
| [#7](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/7) Instrumentação | Nenhuma issue pendente; integrar contrato #6 |
| [#12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12) Administração física e NTAG | Hardware real e código/procedimento de personalização/proteção/secure messaging restantes |
| [#8](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/8) Experimentos | #7 + #12 |
| [#9](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/9) Integração/entrega final | #8 |

Somente Feiju está disponível; não há aceite NTAG 424 DNA. A #12 mantém todos os
critérios físicos, instalação de chaves e medição do contador/SDK/OS, sem confundir
software com bancada. Aprovação do mantenedor não é revisão independente do colega.
Revisão/integração dos PRs na main e reprodução final são #9. Não criar issues
pequenas para trabalho já agrupado. Plano/sub-issues/dependências em
[#10](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/10).

Veja [reconciliação](13-reconciliacao.md), [captura/decisões SDM](12-validacao-sdm.md) e
[offline e ensaio nativo](11-captura-offline.md). Guias 05–09 preservam o registro
histórico de suas etapas; estados antigos de branch/issue não substituem este mapa.
Segredos, material de bancada, tokens, `.env`, `.tmp` e builds ficam fora do Git.
