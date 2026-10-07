# Entregas atuais e pendências

Atualização de 7 de outubro de 2026. Branch `codex/issue-7-experiment-instrumentation`,
sobre `codex/issue-6-event-reconciliation`. Publicação autorizada; sem merge na main.
Software #1–#7 implementado e validado localmente.

| Entrega | Disponível |
| --- | --- |
| #1 | NFC exclusivo, timeout/cancelamento, Type 4/bytes, diagnóstico/perfil candidato |
| #2 | Pedidos, vínculos/épocas, eventos e histórico |
| #3 | Login/permissões, SecureStore, restauração/revogação/logout |
| #4 | SQLite, cache por API/conta/época, fila, lote e Envios |
| #5 | Captura/cache SDM sem fallback; prova/uso/política separados de autorização |
| #6 | Pendências/prazo, recibo original e decisões versionadas/histórico |
| #7 | Roteiro em Envios, tentativas/falhas duráveis, clocks/fronteiras, associação atômica e liberação controlada; exportação/cenários na API |

Verificação #7: **241 testes/24 suítes mobile; 122/11 API**, SQLite e PostgreSQL
reais. Lint/tipos, build/OpenAPI e bundle iOS local. Arquivos desta entrega
formatados; formatter global aponta 15 arquivos legados fora do escopo.
34 cenários/43 roteiros sintéticos em HTTP/PostgreSQL/SQLite; validador/CSV e
reexecução por OPERADOR verificados. Tempos físicos ausentes ficam null.

A #4 já verificou APK Android/SQLite/SecureStore contra API real com reinício
offline, reconexão e resposta perdida. #6 verificou recibo/reconciliação nos três
tratamentos. A #7 não realizou instalação iOS, NFC real, EAS, Actions ou merge.
Workflows permanecem manuais e desativados remotamente. Development build iOS
precisa dos módulos SQLite/rede #4; #5/#6/#7 não acrescentam dependências nativas.

Próxima parte independente: **#8 — protocolo preliminar e análise reproduzível**.

| Issue restante | Dependência para concluir |
| --- | --- |
| [#12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12) Administração/aceite NTAG | Hardware e código/procedimento de personalização/proteção/secure messaging restante |
| [#8](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/8) Experimentos | #12; instrumentação #7 disponível |
| [#9](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/9) Integração/entrega final | #8 e aceites físicos transitivos |

Somente Feiju está disponível. Aprovação/publicação não substituem revisão do
colega, integração/reprodução final ou aceite físico. Leituras sintéticas e
reexecuções não são leituras físicas novas. Plano/dependências em
[#10](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/10).

Veja [instrumentação](14-instrumentacao-experimento.md),
[reconciliação](13-reconciliacao.md), [SDM](12-validacao-sdm.md) e
[offline](11-captura-offline.md). Guias anteriores mantêm resultados históricos.
Segredos, tokens, `.env`, `.tmp`, dados de bancada e builds ficam fora do Git.
Não desinstalar o aplicativo com registros pendentes.

Publicação anterior: Nova-tag #5 sobre #4 e API #16 sobre #15. Integrar as bases
na ordem de dependências apenas no aceite #9.
