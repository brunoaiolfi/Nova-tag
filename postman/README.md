# Simulação local para verificar UI nativa

Este fixture cobre autenticação de teste e o fluxo de pedidos do aplicativo real.
Não executa APDU, administração física, ingestão de eventos nem criptografia.
Rotas não modeladas retornam 501; pedido inexistente retorna 404.

## Origem

O ponto de partida foi `postman mock generate` sobre o OpenAPI do checkout local
`C:/src/nfc-trace-api/docs/openapi.json`, em 23/10/2026. O handler gerado foi
substituído por um recorte que preserva o envelope HTTP real e permite POST → GET.
O contrato usado está em `contracts/nfc-trace-ui.openapi.json`, com SHA-256 da
origem completa. O envelope/correlação foram conferidos também em
`nfc-trace-api/src/bootstrap/http.ts`. O fixture aceita o formato de pedido já
normalizado enviado pelo app; não replica todas as políticas do servidor.

Não foi pesquisado/publicado um mock de outra equipe: o contrato pertence ao
checkout local do mesmo projeto; não há vínculo Postman configurado neste app.
Não há deploy nem upload. As credenciais abaixo são sintéticas e locais.

## Executar

Requer Postman CLI >= 1.70 (verificado com 1.75.0):

```powershell
postman simulation run postman/simulations/nova-tag-ui.sim.yaml --port 3115 --no-history --output ndjson
```

No emulador, encaminhe a porta e use a URL na configuração de conexão do app:

```powershell
adb -s emulator-5560 reverse tcp:3115 tcp:3115
```

- URL: `http://127.0.0.1:3115/api/v1`
- Login: `standards.admin`
- Senha: `fixture-only-password`
- Reset: `POST http://127.0.0.1:3115/api/__fixture/reset`

O reset limpa autenticação e repõe 500 pedidos paginados. Um cadastro novo aparece
nas consultas seguintes; código repetido retorna 409. Dados são efêmeros por
execução, com chaves `pm.state` prefixadas por `nova-tag-ui.`. A lista móvel
carrega páginas de dez, de acordo com seu caso de uso real.

O smoke do fixture pode ser repetido em outro terminal:

```powershell
node postman/verify-ui-simulation.cjs
```

Para comprovar o fluxo do aplicativo, execute também a UI real e confira os eventos
`request` da simulação. O smoke HTTP isolado só comprova o fixture. Logs e imagens
ficam em `.tmp`, ignorado pelo Git. Rejeições, fonte ampliada, teclado e TalkBack
exigem observação separada; desempenho deve ser medido em release no aparelho.
Este ambiente usa HTTP em loopback para laboratório, sem alterar `.env` ou a API real.
