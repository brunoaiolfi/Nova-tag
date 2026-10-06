# Entregas atuais e pendências

Atualização aprovada pelo mantenedor em 6 de outubro de 2026. A branch publicada
é `codex/issue-1-sdm-bench-profile`; sua integração na main continua em PR separado.

As issues #1 (adaptador/diagnóstico/perfil candidato), #2 (fluxo online UID/NDEF)
e #3 (login/permissões/SecureStore) registram o software concluído. Foram aprovadas
pelo mantenedor para publicação, com 203 testes mobile e 70 da API passando
localmente. Não houve aprovação física de NTAG 424 DNA nem revisão independente
atribuída ao colega.

Personalização autenticada, proteção reversível, recuperação e roteiro físico dos
três tratamentos foram concentrados na
[#12](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/12). Essa entrega ainda
inclui código administrativo que precisa ser implementado, além de hardware real.
O perfil SDM é candidato de bancada; a API continua rejeitando SDM.

Restam #12 → #5 (verificação SDM/épocas/chaves/políticas) → #4 (fila offline e
sincronização) → #6 (reconciliação) → #7 (instrumentação/exportação) → #8
(experimentos/análise) → #9 (integração/reprodução/entrega final).

O [plano #10](https://github.com/Joao-AugustoPF/nfc-trace-api/issues/10) é o mapa
atual de dependências. Os guias 05 a 09 preservam evidências históricas; seus
antigos estados de issue/branch não representam pendências adicionais de software.
Na #9, conferir a integração dos PRs e repetir o aceite sobre a versão exata
entregue. Fechar issue de software aprovado/publicado não significa merge na main.

Credenciais, tokens, chaves, `.env`, `.tmp`, builds e relatórios privados permanecem
fora do Git. CI fica manual e desativado remotamente; esta publicação não executa
GitHub Actions ou novo build EAS. API, Metro e ngrok locais continuam disponíveis.
