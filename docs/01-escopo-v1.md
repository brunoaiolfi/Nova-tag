# Escopo da Primeira Entrega (v1)

Projeto: Sistema de Rastreabilidade Logística baseado em NFC para Autenticação e Registro de Eventos
Autores: Bruno Sezar Marcelino Aiolfi, João Augusto Pupo Fagundes
Orientador: Cleber Lourenço Izidoro

---

## 1. Objetivo da v1

Validar o loop completo **etiqueta NFC → aplicativo → backend**, entregando duas
funcionalidades: **provisionamento de etiquetas** e **registro de eventos**.

A v1 não busca segurança nem resiliência. Busca provar que o fluxo físico funciona,
que a leitura NFC é confiável em campo e que o modelo de dados de eventos se sustenta.
Segurança e offline-first entram nas versões seguintes, sobre essa base.

### Plataforma

Android apenas. Sem versão iOS.

Justificativa: no Android há acesso livre a `IsoDep` e envio de comandos APDU sem
pré-declaração de AID, o que no iOS exigiria declarar os AIDs no `Info.plist` em tempo
de build. Como o NTAG 424 DNA é central para as versões seguintes, a restrição do iOS
inviabilizaria parte do experimento.

### Hardware

Padronizar **NTAG 424 DNA** para todos os braços do experimento.

Justificativa: o NTAG 424 é superconjunto dos três mecanismos avaliados. Rodar todos os
braços no mesmo chip elimina o modelo da etiqueta como **variável de confusão** — mesma
antena, mesmo comportamento de RF, mesmo protocolo. Sem isso, qualquer diferença de
latência ou de taxa de sucesso medida entre os braços poderia ser atribuída ao hardware
em vez do mecanismo, o que é uma ameaça direta à validade interna do trabalho.

O custo unitário por etiqueta não se perde como dado: entra na análise como pesquisa de
preço de mercado, não como variável do experimento controlado.

---

## 2. Dentro e fora do escopo

### Dentro

- Provisionamento de etiqueta (associação etiqueta ↔ pedido)
- Detecção do tipo de etiqueta via `GET_VERSION` e `techList`
- Seleção de estratégia entre as suportadas pela etiqueta
- Bloqueio de escrita por chave
- Registro de evento por leitura NFC
- Seleção do tipo de evento (enum fixo)
- Envio imediato ao backend
- Consulta de pedidos com autocomplete

### Fora

| Item | Versão prevista |
|---|---|
| Persistência local / fila offline | v2 |
| Sincronização e resolução de conflitos | v2 |
| Autenticação dinâmica (SDM / CMAC) | v3 |
| Validação criptográfica no backend | v3 |
| Detecção de replay e clonagem | v3 |
| Instrumentação de métricas do experimento | v3 |
| Tipos de evento configuráveis pelo servidor | pós-TCC |

---

## 3. Decisões de arquitetura

### 3.1 A estratégia pertence à etiqueta, não ao aplicativo

A estratégia é escolhida **uma vez**, no provisionamento, gravada no backend vinculada
àquela etiqueta, e é imutável dali em diante.

Na leitura de evento ninguém escolhe estratégia: ela é resolvida a partir da etiqueta.

Justificativa: se a estratégia fosse um ajuste global do aplicativo lido no momento da
leitura, um atacante poderia forçar o app para o modo mais fraco e validar uma etiqueta
dinâmica como UID simples (*downgrade attack*). Além do furo, contaminaria o experimento,
atribuindo leituras ao braço errado.

O seletor de estratégia existe **apenas na tela de provisionamento**. Sua natureza
configurável é acadêmica: permite alternar entre os braços do experimento usando a mesma
base de código, mesmo aparelho e mesmo operador — controlando as variáveis que a
metodologia exige manter constantes.

### 3.2 O tipo da etiqueta restringe, não determina, a estratégia

A relação não é um-para-um:

| Etiqueta | NDEF estático | UID | Dinâmica |
|---|---|---|---|
| NTAG213/215/216 | sim | sim | não |
| NTAG 424 DNA | sim | sim | sim |

O aplicativo detecta o modelo e **filtra** as estratégias possíveis; o operador escolhe
entre as restantes. Se a estratégia selecionada não for suportada pela etiqueta
aproximada, a operação é bloqueada antes de qualquer gravação.

### 3.3 O cliente captura tudo; o backend decide

Na leitura, o aplicativo captura **todos** os dados que a etiqueta oferece — UID sempre,
payload NDEF se houver, contador e CMAC se houver — independentemente da estratégia, e
envia o pacote completo. O backend é a única autoridade sobre o que validar.

Justificativa: garante que o aplicativo funcione sem conhecimento prévio da etiqueta
(essencial quando a fila offline entrar na v2) e permite reanálise dos mesmos dados
coletados sob critérios diferentes, sem repetir a coleta em campo.

### 3.4 Bloqueio por chave, não por lock bits

O bloqueio de escrita é feito trocando as chaves de fábrica do NTAG 424 DNA e exigindo
essa chave para escrita no arquivo NDEF. **Não** usar os lock bits do NTAG21x.

Justificativa: lock bits são irreversíveis — cada erro durante o desenvolvimento
inutilizaria a etiqueta permanentemente e impediria reciclar o lote entre rodadas do
experimento. A proteção por chave oferece a mesma garantia em campo (quem não tem a
chave não escreve) preservando a capacidade de desprovisionar.

Nota de escopo: na v1, com a estratégia UID, o bloqueio tem valor prático limitado — o
UID já é read-only de fábrica e o NDEF não é lido para validação. Ele passa a proteger
algo efetivo no braço NDEF estático (impede substituição do payload) e no dinâmico
(protege a configuração de chaves). É implementado na v1 para fechar o fluxo.

### 3.5 Backend antes do bloqueio

A ordem do provisionamento é `confirmar → backend → bloquear`, nunca o inverso.

Justificativa: sem fila offline na v1, uma falha de rede após o bloqueio deixaria uma
etiqueta bloqueada e vinculada a nada — inutilizada, sem possibilidade de reenvio.
Invertendo a ordem, os modos de falha viram:

- Backend falha → aborta; etiqueta não bloqueada, reutilizável
- Bloqueio falha → etiqueta registrada mas destravada; basta repetir o bloqueio

Ambos recuperáveis. O princípio é **sempre falhar para o lado da etiqueta viva**.

### 3.6 UUID do evento gerado no cliente

Todo evento nasce com um UUID gerado no aparelho no momento da leitura, enviado ao
backend como chave de idempotência.

Justificativa: a v1 não tem fila offline, mas retrofitar idempotência depois exige mudar
o contrato da API, o esquema do banco e os dados já coletados. Incluir o campo agora é
praticamente gratuito e evita uma migração dolorosa na v2.

### 3.7 Detecção de tipo não é controle de segurança

`ATQA`, `SAK`, `UID` e a resposta do `GET_VERSION` são bytes que a etiqueta envia e podem
ser forjados por etiquetas "magic" ou emuladores. A detecção de tipo serve à **ergonomia**
(impedir erro do operador no provisionamento), nunca à segurança.

A garantia criptográfica virá apenas do CMAC no braço dinâmico (v3). Na v1 e v2 o sistema
é, por construção, vulnerável a clonagem e replay — o que é intencional: demonstrar essa
vulnerabilidade experimentalmente é um resultado esperado do trabalho.

---

## 4. Modelo de dados

### Etiqueta

| Campo | Tipo | Observação |
|---|---|---|
| `uid` | string (hex) | identificador de fábrica, chave natural |
| `modelo` | string | ex.: `NTAG424DNA`, obtido via `GET_VERSION` |
| `estrategia` | enum | `NDEF_ESTATICO`, `UID`, `DINAMICA` — imutável |
| `pedido_id` | FK | pedido vinculado |
| `status` | enum | `REGISTRADA`, `ATIVA`, `DESPROVISIONADA` |
| `provisionada_em` | timestamp | |

`REGISTRADA` = gravada no backend, bloqueio ainda não confirmado.
`ATIVA` = bloqueio confirmado, pronta para uso.

### Evento

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | **gerado no cliente** — chave de idempotência |
| `uid` | string (hex) | etiqueta lida |
| `pedido_id` | FK | resolvido pelo backend a partir do UID |
| `tipo` | enum | ver abaixo |
| `ocorrido_em` | timestamp | relógio do dispositivo |
| `recebido_em` | timestamp | relógio do servidor |
| `latitude` / `longitude` | decimal | nulável |
| `operador_id` | FK | |
| `dispositivo_id` | string | identificador do aparelho |
| `leitura_bruta` | JSON | payload completo capturado da etiqueta |

### Tipos de evento (v1)

Enum fixo no aplicativo, derivado das etapas descritas no pré-projeto:

```
PROVISIONAMENTO   // evento zero da cadeia de custódia
COLETA
RECEBIMENTO
MOVIMENTACAO
EXPEDICAO
ENTREGA
```

O provisionamento é registrado como evento, de modo que a cadeia de custódia comece na
associação etiqueta ↔ pedido e não na primeira movimentação.

---

## 5. Fluxo: provisionamento

```
1. LEITURA DA ETIQUETA
   - Reader mode ativo
   - Lê UID, techList e GET_VERSION
   - Identifica o modelo
   - Filtra as estratégias suportadas
   - Se a etiqueta já estiver provisionada → evento SUSPEITO, aborta

2. SELEÇÃO DA ESTRATÉGIA
   - Operador escolhe entre as estratégias suportadas pelo modelo detectado

3. IDENTIFICAÇÃO DO PEDIDO
   - Campo de busca com autocomplete
   - Operador digita o código; app consulta o backend e sugere
   - Requer conectividade (aceitável na v1)

4. CONFIRMAÇÃO
   - Exibe: UID, modelo, estratégia, pedido, operador
   - Operador confirma

5. REGISTRO NO BACKEND
   - POST /etiquetas  → status REGISTRADA
   - Falha aqui → aborta; etiqueta intacta e reutilizável

6. BLOQUEIO DA ETIQUETA
   - Troca das chaves de fábrica; escrita no NDEF passa a exigir a chave
   - Falha aqui → etiqueta fica REGISTRADA; permite nova tentativa

7. CONFIRMAÇÃO DO BLOQUEIO
   - PATCH /etiquetas/{uid}  → status ATIVA
   - Registra o evento PROVISIONAMENTO
```

### Casos de exceção

| Situação | Tratamento |
|---|---|
| Etiqueta já provisionada | Evento `SUSPEITO`; não bloqueia a UI silenciosamente |
| Modelo não suporta a estratégia | Bloqueia antes de gravar, com mensagem explícita |
| Pedido inexistente | Autocomplete não sugere; impede avançar |
| Pedido já possui etiqueta | Alerta; exige confirmação explícita |
| Etiqueta removida do campo NFC no meio | Aborta a etapa; não deixa estado parcial |

---

## 6. Fluxo: registro de evento

```
1. LEITURA DA ETIQUETA
   - Lê UID e captura o payload completo disponível

2. IDENTIFICAÇÃO
   - Consulta o backend pelo UID
   - Exibe pedido vinculado e estratégia registrada
   - UID desconhecido → erro, sem opção de provisionar por aqui

3. SELEÇÃO DO EVENTO
   - Operador escolhe o tipo no enum

4. ENVIO
   - Gera UUID no cliente
   - POST /eventos imediatamente
   - Falha de rede → erro explícito; evento NÃO é registrado (v1 sem fila)
```

Divergência entre o modelo detectado e o registrado no backend **não bloqueia** a
operação: gera um evento marcado como `SUSPEITO` e segue. É um possível sinal de
clonagem, e é exatamente o dado que os cenários experimentais precisam capturar.

---

## 7. Contratos da API (v1)

```
GET   /pedidos?busca={termo}         → autocomplete
POST  /etiquetas                     → cria vínculo, status REGISTRADA
PATCH /etiquetas/{uid}               → confirma bloqueio, status ATIVA
GET   /etiquetas/{uid}               → resolve pedido + estratégia
POST  /eventos                       → registra evento (idempotente por UUID)
GET   /pedidos/{id}/eventos          → histórico
```

`POST /eventos` deve ser idempotente pelo `id` desde a v1: reenvio do mesmo UUID retorna
o evento já existente em vez de criar um duplicado.

---

## 8. Critérios de aceite

- [ ] Provisionar uma etiqueta NTAG 424 DNA de ponta a ponta, com bloqueio efetivo
- [ ] Etiqueta bloqueada rejeita escrita por aplicativo NFC genérico de terceiros
- [ ] Tentar provisionar etiqueta já provisionada gera evento `SUSPEITO`
- [ ] Selecionar estratégia dinâmica com NTAG213 é bloqueado antes da gravação
- [ ] Falha de rede na etapa 5 deixa a etiqueta reutilizável
- [ ] Registrar os cinco tipos de evento numa etiqueta provisionada
- [ ] Histórico do pedido exibe os eventos em ordem, começando no provisionamento
- [ ] Reenvio do mesmo UUID de evento não gera duplicata

---

## 9. Riscos conhecidos

| Risco | Impacto | Mitigação |
|---|---|---|
| Troca de chaves do NTAG 424 malfeita inutiliza a etiqueta | Alto | Lote de reserva; testar em etiquetas descartáveis antes |
| Sem fila offline, eventos se perdem em falha de rede | Médio | Aceito na v1; é o objetivo central da v2 |
| Autocomplete depende de conectividade | Médio | Aceito na v1 |
| Relógio do dispositivo é manipulável | Médio | `recebido_em` do servidor como referência; contador da etiqueta na v3 |
| Custo do NTAG 424 limita o tamanho do lote | Baixo | Dimensionar o lote junto ao desenho experimental |
