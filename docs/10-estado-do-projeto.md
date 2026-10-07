# Entregas atuais e pendências

Atualização de 7 de outubro de 2026. Branch `codex/issue-5-sdm-validation`,
baseada em `codex/issue-4-durable-offline`. Publicação autorizada pelo mantenedor,
sem merge na main. Software #1/#2/#3/#4/#5 implementado e validado localmente.

| Entrega | Disponível |
| --- | --- |
| #1 NFC | Sessão exclusiva, timeout/cancelamento, Type 4, bytes originais, diagnóstico e perfil SDM candidato |
| #2 Online | Pedidos, vínculos, ativação/encerramento/reutilização, eventos e histórico |
| #3 Identidade | Login/permissões, restauração/revogação/logout e SecureStore |
| #4 Offline | SQLite transacional, cache ativo por API/operador/época, recuperação, lote e Envios |
| #5 SDM | Resolução pelo provisionamento, bytes completos, cache/fila e apresentação de autenticação/uso/política separada da movimentação; verificação/épocas/chaves no servidor |

Verificação atual: **228 testes/23 suítes mobile; 98/9 API**, SQLite e PostgreSQL
reais. Lint/tipos, build/OpenAPI e exportação local do bundle iOS. Vetores oficiais
NXP/NIST testam primitivas; fixtures de mensagens/perfil são sintéticas. A #4 já
tinha validado APK Android/SQLite/SecureStore contra API real com reinício offline,
reconexão e resposta perdida depois do commit. Não há aceite NFC real nesta #5.

Atualizar development build iOS continua necessário pelos módulos SQLite/rede #4.
A #5 não acrescenta dependência nativa. Nenhum build EAS, GitHub Actions ou merge
foi iniciado. Workflows permanecem manuais e desativados remotamente.

A próxima entrega disponível é **#6 — reconciliação e decisões rastreáveis**, sem
NTAG 424 DNA. #4/#5 concluídas permanecem como dependências históricas no GitHub;
integrar as bases ao assumir. Depois, #7 instrumentação/exportação/cenários.

| Issue restante | Dependência pendente |
| --- | --- |
| [#6](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/6) Reconciliação | Nenhuma issue pendente; integrar contratos #4/#5 |
| [#7](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/7) Instrumentação | #6 |
| [#12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12) Administração física e NTAG | Hardware real e código/procedimento de personalização/proteção/secure messaging restantes |
| [#8](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/8) Experimentos | #7 + #12 |
| [#9](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/9) Integração/entrega final | #8 |

Somente Feiju está disponível; não há aceite NTAG 424 DNA. A #12 mantém todos os
critérios físicos, instalação de chaves e medição do contador/SDK/OS, sem confundir
software com bancada. Aprovação do mantenedor não é revisão independente do colega.
Revisão/integração dos PRs na main e reprodução final são #9. Não criar issues
pequenas para trabalho já agrupado. Plano/sub-issues/dependências em
[#10](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/10).

Veja [captura/decisões SDM](12-validacao-sdm.md) e
[offline e ensaio nativo](11-captura-offline.md). Guias 05–09 preservam o registro
histórico de suas etapas; estados antigos de branch/issue não substituem este mapa.
Segredos, material de bancada, tokens, `.env`, `.tmp` e builds ficam fora do Git.
