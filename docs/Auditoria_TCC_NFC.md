# Relatório de auditoria do TCC sobre rastreabilidade logística com NFC

## 1. Resumo da proposta que você entendeu

O projeto de Bruno Sezar Marcelino Aiolfi e João Augusto Pupo Fagundes, orientado por Cleber Lourenço Izidoro, pretende construir um **artefato experimental** de rastreabilidade de encomendas. O aplicativo Android registra observações NFC, mantém uma fila local quando não há conexão e posteriormente envia as evidências a um backend. Serão comparados conteúdo NDEF estático, associação por UID e autenticação dinâmica, inicialmente com NTAG 424 DNA/SDM.

**Parecer: manter com ajustes importantes.** O problema mais defensável é avaliar os limites da autenticação e das políticas de processamento quando evidências podem ser copiadas, reapresentadas e sincronizadas fora de ordem. Desenvolver um aplicativo NFC de rastreabilidade, isoladamente, não constitui uma lacuna científica demonstrada.

A principal descoberta técnica é que **mensagem criptograficamente válida, mensagem ainda não utilizada e evidência recente de uma movimentação são propriedades diferentes**. A documentação do componente já reconhece o risco de guardar mensagens legítimas para apresentá-las posteriormente. [1]

O estado oficial considerado é o descrito em **Texto colado (1).txt**. Não se presume acesso ao pré-projeto PDF anterior nem alteração dos compromissos aprovados pelo orientador. A auditoria considera fontes disponíveis até **9 de setembro de 2026**. As seções distinguem fatos documentados, inferências técnicas e recomendações. **Não foram realizados testes físicos; nenhuma taxa ou latência apresentada como exemplo é resultado do protótipo.**

## 2. Principais premissas assumidas atualmente

| Premissa | Situação na auditoria | Consequência |
|---|---|---|
| Aproximar um celular identifica uma interação com uma etiqueta | Aceitável para o aplicativo honesto, dentro do cenário ensaiado | O servidor recebe uma alegação e evidências; não observa diretamente o rádio |
| Uma etiqueta legítima representa a encomenda correta | Não garantido pelo NFC | O vínculo físico e o cadastramento precisam ser pressupostos ou avaliados separadamente |
| SDM permite verificar evidências no servidor | Documentado | Falta definir quais decisões podem decorrer da verificação |
| Dados offline podem chegar fora de ordem | Compatível com o sistema proposto | Ordem de chegada não pode ser tomada automaticamente como ordem logística |
| O cliente pode ser adulterado | Previsto no modelo de ameaça | UID, horário, operação e posição fornecidos pelo cliente não são verdade independente |
| O backend e seu estado persistente são confiáveis | Necessário ao recorte mínimo | Exclui resistência contra administrador malicioso e restauração indevida do estado anti-replay |
| A comparação dos três mecanismos ainda não foi feita | Não confirmado | Afirmar apenas lacuna candidata, condicionada ao mapeamento |
| Vários taps equivalem a várias réplicas independentes | Premissa incorreta | A análise deve considerar etiqueta, aparelho, sessão e repetição |
| Não é necessário impedir toda fraude logística | Premissa adequada | É necessário delimitar exatamente quais fraudes e falhas serão estudadas |

Antes da implementação, o orientador precisa concordar com a **unidade de análise**: observações NFC e decisões do sistema, e não a prova absoluta de que um pacote real se movimentou.

## 3. O que está tecnicamente correto

A proposta já separa autenticação da etiqueta, integridade dos registros e integridade física da embalagem. Também acerta ao tratar UID como identificador, admitir clientes adulterados, prever idempotência e evitar infraestrutura desnecessária.

É correto escolher captura offline com validação posterior como recorte inicial. A documentação Android oferece uma arquitetura compatível com persistência local e sincronização; isso não transforma uma captura pendente em leitura autenticada. [3]

Também é coerente manter Kotlin, um backend e PostgreSQL. A API `IsoDep` fornece comunicação com etiquetas ISO-DEP, suficiente como interface de transporte para uma implementação dos comandos necessários; a camada criptográfica e o provisionamento continuam sendo responsabilidades do projeto. [4]

A preocupação com usar o mesmo hardware nos tratamentos é particularmente pertinente. Comparar uma NTAG215 com uma NTAG424 mede simultaneamente diferenças de chip, protocolo, antena, capacidade e software, além da estratégia de segurança.

## 4. O que está conceitualmente impreciso

**“Autenticidade da leitura” e “evento válido” precisam ser desmembrados.** Uma evidência da tag não autentica automaticamente a operação `DELIVERED`, o operador, o pacote apresentado, o GPS ou o horário acrescentados pelo aplicativo. Uma leitura genuína também pode ser associada a uma narrativa falsa.

Adotar as seguintes definições operacionais no TCC:

| Termo | Significado exigido no trabalho |
|---|---|
| Identificação | Obter um identificador e associá-lo a um cadastro |
| Autenticação | Verificar uma alegação de identidade/origem segundo um protocolo e pressupostos declarados |
| Autenticidade | Propriedade cuja evidência passa nessa verificação; declarar se é origem dos dados, dispositivo ou entidade |
| Integridade | Detectar alteração de uma representação protegida entre pontos definidos; não implica veracidade inicial |
| Freshness | Evidência de atualidade em relação a uma sessão, desafio, sequência ou prazo; especificar qual |
| Unicidade | Não repetição dentro de um domínio definido: evento, contador, chave, etiqueta ou experimento |
| Anti-cloning | Resistência à reprodução do comportamento autenticador, sob capacidades específicas do atacante |
| Anti-replay | Resistência à reutilização de evidências; indicar se inclui a primeira apresentação atrasada |
| Não repúdio | Evidência atribuível e verificável sob uma política; um MAC simétrico não distingue qual detentor da chave o produziu |
| Autorização | Permissão para executar a operação após verificar identidade e regras |
| Cadeia de custódia | Histórico de posse/transferência apoiado por procedimentos, identidades e evidências suficientes |
| Tamper evidence | Evidência de manipulação de uma fronteira física específica, segundo um mecanismo de detecção |
| Rastreabilidade | Capacidade de recuperar a história e as associações registradas de um objeto |

NDEF é um **formato**, não uma alternativa incompatível com criptografia. O próprio tratamento SDM pode transportar seus dados em NDEF. Portanto, chamar a comparação de “NDEF versus criptografia” induz erro; prefira “NDEF estático sem prova criptográfica, associação por UID e evidência dinâmica autenticada”. O catálogo NFC Forum distingue formato NDEF, tipos de tag e mecanismos como Signature RTD. [5]

## 5. As 10 maiores possíveis refutações do trabalho

### REFUTAÇÃO DA PROPOSTA

| Refutação | Gravidade e fundamento | Invalida o quê? | Mitigação e alteração exigida |
|---|---|---|---|
| **1. A pergunta responde como construir, mas pouco explica o que descobrir** | Alta. A existência de plataformas e protótipos anteriores é verificável [10], [11], [12], [13] | A alegação de novidade baseada apenas no desenvolvimento | Reformular pergunta e contribuição para decisões mensuráveis sob ameaças e reordenação |
| **2. Os resultados centrais podem ser previsíveis por construção** | Alta. Um identificador público reproduzido continua igual; rejeitar MAC adulterado é requisito funcional | Tratar conformidade básica como descoberta estatística | Usar esses testes como controles; investigar falhas de integração, rejeição de leituras legítimas e custo operacional |
| **3. SDM não resolve a primeira apresentação de evidência guardada** | Crítica para promessas de presença/atualidade. Risco explicitado pelo fabricante [1] | “MAC válido prova movimentação recente” | Criar cenário de evidência nunca antes enviada; restringir conclusão ou mudar para protocolo interativo |
| **4. Aceitar reordenação altera a política de segurança recomendada** | Alta. A recomendação documentada inclui rejeitar contadores fora de ordem [1] | Alegar simultaneamente a política do fabricante e aceitação irrestrita de atrasos | Comparar política estrita com registro de observações atrasadas, declarando a garantia mais fraca |
| **5. Autenticar a tag não autentica o evento completo** | Crítica. O aplicativo fornece contexto externo à evidência | “SDM assegura integridade de toda movimentação” | Separar evidência, alegação contextual e decisão; testar mudança de operação mantendo a evidência |
| **6. Cliente adulterado elimina a força do UID declarado** | Alta. O backend não lê o identificador físico; o cliente o informa [6] | Segurança do tratamento UID contra clientes hostis | Dois perfis de atacante: cópia física com cliente honesto e submissão por cliente adulterado |
| **7. A etiqueta pode ser transferida intacta** | Alta para embalagem; administrável para autenticação digital. A literatura já descreve a limitação [10] | Inferência de autenticidade do conteúdo da caixa | Ground truth físico e demonstração de transferência; retirar promessa de inviolabilidade |
| **8. Comparação mistura mecanismos com hardware e extensão de payload** | Alta para desempenho | Atribuir toda diferença de latência à criptografia | Mesmo SKU/antena, procedimento uniforme e medição separada de RF, verificação e rede |
| **9. Pseudorreplicação e ausência de ground truth tornam taxas enganosas** | Alta metodológica [8] | Generalização estatística e taxas de fraude “no mundo real” | Blocos, repetições identificadas, campanhas independentes e roteiro externo ao sistema |
| **10. O custo e o gesto de leitura podem não justificar NFC na logística escolhida** | Alta para utilidade, não para a existência do experimento | “NFC é melhor para logística em geral” | Definir um posto de conferência deliberada; comparar custo total e tempo operacional com QR |

Essas refutações **não exigem abandonar o experimento**. Exigem abandonar conclusões mais fortes do que as evidências e as fronteiras de confiança permitem.

## 6. Problemas que podem inviabilizar o projeto

1. **Não obter tags configuráveis com controle das chaves.** Uma etiqueta vendida já vinculada a uma plataforma pode servir à aplicação comercial e não permitir a experimentação pretendida.
2. **Não concluir o gate do SDM em prazo curto.** Sem configuração reproduzível e verificação independente, o tratamento principal fica indefinido.
3. **A exigência acadêmica continuar sendo provar integridade física e autoria de todas as movimentações.** A arquitetura descrita não contém evidências suficientes para isso.
4. **A lacuna ser apenas a soma de funcionalidades já conhecidas.** Nesse caso, é necessário assumir uma replicação contextual com contribuição empírica, ou reformular a pesquisa.
5. **Não existir tempo para coleta após desenvolver o sistema.** O cronograma precisa reservar a fase experimental antes de distribuir esforço em telas.
6. **Não haver acesso aos artigos centrais.** Isso não impede iniciar o gate técnico, mas impede concluir honestamente a revisão de novidade.

Ter apenas um telefone não inviabiliza toda a pesquisa: inviabiliza a alegação de comparação entre aparelhos. Não conseguir TagTamper tampouco inviabiliza o núcleo recomendado.

## 7. Problemas que apenas exigem ajuste de escopo

| Problema | Ajuste suficiente |
|---|---|
| Relay não será executado | Excluir prova de proximidade e resistência a relay das conclusões |
| GPS e relógio não são confiáveis | Tratar como metadados alegados e usar horários externos no experimento |
| TagTamper aumenta custo e montagem | Manter como extensão, sem usá-lo para justificar resultados do núcleo |
| Poucos aparelhos | Estudo de casos dos aparelhos disponíveis, sem generalização por fabricante ou chipset |
| Assinatura de dispositivo aumenta trabalho | Omitir no núcleo e restringir a integridade local; ou manter fixa em todos os tratamentos se for requisito central |
| Rotação de chaves complexa | Provisionamento controlado, revogação e mudança de época em laboratório; sem serviço completo de rotação em produção |
| Muitas etapas logísticas | Usar uma sequência curta: cadastrado, coletado, recebido e entregue |
| Baseline QR vira quarto tratamento | Fazer análise econômica/ergonômica complementar, sem replicar toda a bateria de segurança |

## 8. Lacuna científica candidata

**Candidata recomendada:** avaliação reproduzível de políticas de validação de evidências NFC com diferentes forças de identificação/autenticação, sob entrega atrasada e reordenação, distinguindo evidência reutilizada, primeira apresentação atrasada e duplicação de processamento.

A contribuição pode investigar duas perguntas concretas:

- **RQ1:** sob capacidades explícitas do atacante, quais alegações indevidas cada mecanismo permite aceitar, e quais controles são responsáveis pelas rejeições?
- **RQ2:** ao processar evidências SDM fora de ordem, qual é o efeito das políticas adotadas sobre observações legítimas preservadas, operações indevidamente autorizadas e tempo de reconciliação?

Desempenho em alguns smartphones entra como RQ secundária. O recorte não precisa incluir simultaneamente prova de custódia física, comparação de antenas, atestação de dispositivos e detecção de abertura.

**Não está confirmado que essa lacuna seja inédita.** As buscas e leituras desta auditoria não equivalem a uma consulta exaustiva de IEEE Xplore, Scopus, Web of Science e Portal CAPES. Não foi encontrado, no conjunto efetivamente examinado, um experimento correspondente ao conjunto restrito acima. Isso é uma delimitação da evidência disponível, não uma prova de inexistência.

## 9. Trabalhos que podem já ter preenchido essa lacuna

**O argumento genérico “ainda falta usar NFC para autenticar e rastrear produtos” está refutado.** Há propostas anteriores envolvendo NFC, assinaturas, contadores, cadeias de fornecimento, verificação offline e sistemas de rastreabilidade. [10], [11], [12], [13], [14]

Os adversários bibliográficos mais relevantes são:

- **Alzahrani e Bulusu, 2016:** combina contador, identificador, assinatura e verificação offline pelo consumidor. É mais próximo do problema de segurança do que aplicações de inventário simples. Não confundir seu offline de verificação com fila offline de eventos logísticos.
- **Block-Supply Chain, 2018:** aproxima NFC, anticópia e cadeia de fornecimento. Deve entrar no conjunto de leitura integral antes da alegação final de lacuna.
- **Yiu, 2021:** oferece arquitetura e protótipo de rastreabilidade/antifalsificação com NFC e registros distribuídos. Enfraquece novidade baseada no sistema completo.
- **Subramaniam et al., 2025:** trabalha identidade dinâmica e plataforma NFC. A leitura integral distingue sua avaliação de percepção/aceitação de uma campanha controlada de replay e sincronização.
- **Oláh et al., 2026:** propõe autenticação mútua NFC-PUF e análise com ProVerif. É alternativa recente a estudar, mas o resumo não basta para avaliar a equivalência experimental.

No lado industrial, **Ixkio/Seritag** e **tag.link/Shop NFC** já oferecem autenticação e provisionamento de tags seguras. Sua existência refuta a novidade comercial genérica, mas documentação de vendedor não comprova taxas de segurança, eficácia física ou comportamento correto em toda condição offline. [30], [31], [32]

| Evidência comercial | O que a oferta confirma | O que permanece sem demonstração independente |
|---|---|---|
| Seritag/Ixkio, etiquetas NTAG424 e plataforma de autenticação | Componentes e serviço comercial para o fluxo de autenticação [30] | Garantias de custódia e política de evidências offline do TCC |
| Shop NFC/TagLink DNA, serviço de programação e gestão | Provisionamento e autenticação já são oferecidos como serviço; há restrições de regravação anunciadas [32] | Acesso do cliente às chaves e adequação a um experimento auditável |
| Seritag, etiquetas destrutíveis; GoToTags, catálogo tamper | Oferta de formatos físicos diferentes [30], [35] | Eficácia contra todas as formas de remoção, abertura ou substituição |

O levantamento comercial verificável ficou concentrado em **etiquetas e plataformas NFC**. Não foi obtida documentação comparável suficiente para auditar sistemas completos de electronic seals/RFID seals de contêineres, seus protocolos e preços. Portanto, não se conclui que o problema logístico inteiro esteja amplamente resolvido industrialmente; conclui-se que a combinação básica etiqueta autenticadora + servidor já é comercializada.

## 10. Artigos mais próximos encontrados

| Trabalho e metadados | Proximidade | O que foi verificado e o que não se deve extrapolar |
|---|---|---|
| **Securing Pharmaceutical and High-Value Products against Tag Reapplication Attacks Using NFC Tags** — Naif Alzahrani; Nirupama Bulusu. IEEE SMARTCOMP, 2016. DOI [10.1109/SMARTCOMP.2016.7501715](https://doi.org/10.1109/SMARTCOMP.2016.7501715) | **MUITO PRÓXIMO** ao problema conceitual | Texto integral. NTAG216F, contador, ID e assinaturas, fases online/offline. A seção VI reconhece falha na transferência sem leitura. A avaliação não é o experimento multifatorial proposto aqui |
| **Block-Supply Chain: A New Anti-Counterfeiting Supply Chain Using NFC and Blockchain** — Naif Alzahrani; Nirupama Bulusu. CryBlock, 2018. DOI [10.1145/3211933.3211939](https://doi.org/10.1145/3211933.3211939) | **PRÓXIMO** | Metadados e referência retrospectiva confirmados. Texto integral ainda precisa ser avaliado para preencher detalhes experimentais |
| **Decentralizing Supply Chain Anti-Counterfeiting and Traceability Systems Using Blockchain Technology** — Neo C. K. Yiu. *Future Internet*, 13(4), 84, 2021. DOI [10.3390/fi13040084](https://doi.org/10.3390/fi13040084) | **PRÓXIMO** | Texto integral, arquitetura dNAS e protótipo. Não demonstra a comparação NDEF estático/UID/SDM sob fila offline do recorte recomendado |
| **A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain Technologies** — Rajendren Subramaniam; Saaidal Razalli Azzuhri; Teh Ying Wah; Atif Mahmood; Vimala Balakrishnan. *Computers, Materials & Continua*, 83(3), 4257–4280, 2025. DOI [10.32604/cmc.2025.061560](https://doi.org/10.32604/cmc.2025.061560) | **PRÓXIMO** | Texto integral. A seção 5.1 descreve blockchain simulada; a seção 7 avalia versões da proposta com participantes. Não converter aceitação/percepção em taxa objetiva de detecção de fraude |
| **PUF-based Smart Tags for Supply Chain Management** — Alberto Falcone; Carmelo Felicetti; Alfredo Garro; Antonino Rullo; Domenico Saccà. ARES, 2021. DOI [10.1145/3465481.3469195](https://doi.org/10.1145/3465481.3469195) | **PARCIALMENTE RELACIONADO** | Texto disponível em repositório do projeto; PUF, ECC e NFC com cenários de aplicação. Diferente raiz de confiança e hardware; não é evidência de desempenho de SDM |
| **EVO-NFC: Extra Virgin Olive Oil Traceability Using NFC Suitable for Small-Medium Farms** — Massimo Conti. *IEEE Access*, 10, 20345–20356, 2022. DOI [10.1109/ACCESS.2022.3151795](https://doi.org/10.1109/ACCESS.2022.3151795) | **PARCIALMENTE RELACIONADO** | Metadados confirmados; texto integral não verificado nesta auditoria. Pertinência ao domínio estabelecida, detalhes criptográficos ficam em aberto |
| **NFC-PUF Three-Pass Authentication for Supply Blockchains** — Norbert Oláh; Tamás Girászi; Máté Vajda; Andrea Huszti. CCIS 2937, CSCE 2025, publicação online 19/05/2026, pp. 171–192. DOI [10.1007/978-3-032-22208-4_12](https://doi.org/10.1007/978-3-032-22208-4_12) | **PRÓXIMO** como alternativa | Resumo e metadados oficiais. Propõe autenticação mútua e verificação formal. Não foi acessado o texto integral; não endossar “todos os requisitos satisfeitos” fora do modelo formal |
| **NFCGate: Opening the Door for NFC Security Research with a Smartphone-Based Toolkit** — Steffen Klee; Alexandros Roussos; Max Maass; Matthias Hollick. USENIX WOOT, 2020. [Artigo dos autores](https://arxiv.org/abs/2008.03913) | **APENAS FUNDAMENTAÇÃO/INSTRUMENTAÇÃO** | Texto integral. Ferramenta para análise, modificação, replay e relay; não é sistema logístico nem prova de emulação universal de todo UID/chip |

**Avaliação crítica dos próprios papers:** a afirmação de Alzahrani e Bulusu de que a transferência sem leitura seria economicamente pouco motivada depende do negócio; não é impossibilidade técnica. Em produtos reutilizados, embalagens descartadas ou fraude interna, essa premissa exige nova análise. Isso torna a fonte útil para criticar hipóteses, em vez de adotá-las por autoridade.

## 11. Matriz comparativa da literatura

Legenda: **D** = descrito no texto examinado; **NR** = não verificado/não suficientemente descrito na evidência acessada; **Fora** = não é o objeto da contribuição examinada. “D” não significa eficácia demonstrada. Em texto não acessado, **NR nunca significa ausência**.

| Artigo | Ano | Domínio | NDEF | UID/ID | Criptografia | SDM/SUN | Clonagem | Replay | Tamper/troca | Offline | Multi-device | Métricas/método | Diferença para o TCC |
|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| Alzahrani–Bulusu/TRD | 2016 | Produtos de valor/fármacos | Signature RTD | D | Assinatura | Fora | Análise | Excluído na análise principal | Reaplicação | Verificação consumidor | NR | Análise de cenários/custo | Não é fila offline SDM; premissas de UID e leitura adicional |
| Block-Supply Chain | 2018 | Supply chain | NR | NR | NR | NR | NR | NR | NR | NR | NR | Integral pendente | Equivalência ainda precisa ser examinada |
| Yiu/dNAS | 2021 | Vinho/supply chain | NR | D | Assinaturas/registros | NR | D | NR | D | NR | NR | Protótipo/análise | Não compara os três tratamentos propostos |
| Falcone et al. | 2021 | Supply chain | NR | Identidade PUF | PUF/ECC | Fora | D | D no protocolo | Acoplamento discutido | NR | NR | Cenários/análise | Hardware e protocolo diferentes |
| EVO-NFC | 2022 | Azeite/rastreabilidade | NR | NR | NR | NR | NR | NR | NR | NR | NR | Integral pendente | Não atribuir propriedades pelo título |
| Subramaniam et al. | 2025 | Antifalsificação | NR | Identidade dinâmica | Hashes/registros | NR | D | NR | NR | NR | NR | Protótipo/percepção de versões | Não mede FAR/FRR de uma campanha SDM offline |
| Oláh et al. | 2026 | Supply blockchain | NR | PUF | AES/assinaturas PUF | NR | Alegação no resumo | NR | Alegação no resumo | NR | NR | ProVerif declarado | Texto integral necessário; não equiparar a avaliação em celulares |
| NFCGate | 2020 | Ferramenta de segurança | Não central | Interação NFC | Não central | Fora | Não central | D | Fora | Fora | D, no estudo da ferramenta | Latência/caso de fechadura | Instrumentação e ameaça, não lacuna logística |

Não há base para preencher esta tabela inteira com “não” e declarar ineditismo. Os campos NR dos trabalhos mais próximos são **tarefas de leitura prioritárias**.

## 12. Novos artigos essenciais para leitura

As prioridades indicam valor para decidir o TCC, não prestígio da publicação. As seções sugeridas de artigos não integralmente acessados são temas a localizar; não se inventam números de capítulos.

| Prioridade | Leitura, autores, ano e publicação | Por que ler e onde concentrar |
|---|---|---|
| **ESSENCIAL** | Alzahrani; Bulusu. *Securing Pharmaceutical and High-Value Products…*, IEEE SMARTCOMP, 2016. [DOI](https://doi.org/10.1109/SMARTCOMP.2016.7501715) | Seções IV–VI. Comparar seus pressupostos sobre contador, UID, offline e transferência sem leitura |
| **ESSENCIAL** | Mikko Lehtonen; Thorsten Staake; Florian Michahelles. *From Identification to Authentication – A Review of RFID Product Authentication Techniques*. Capítulo de revisão, Springer, 2008. [DOI 10.1007/978-3-540-71641-9_9](https://doi.org/10.1007/978-3-540-71641-9_9) | Taxonomia de identificação, autenticação e vínculo produto–tag; revisar condições de ataque em vez de adotar conclusões datadas |
| **ESSENCIAL** | Kai Petersen; Sairam Vakkalanka; Ludwik Kuzniarz. *Guidelines for conducting systematic mapping studies in software engineering: An update*. *Information and Software Technology*, 64, 1–18, 2015. [DOI 10.1016/j.infsof.2015.03.007](https://doi.org/10.1016/j.infsof.2015.03.007) | Planejamento, classificação, seleção e apresentação do mapeamento |
| **ESSENCIAL** | Claes Wohlin. *Guidelines for snowballing in systematic literature studies and a replication in software engineering*. EASE, 2014. [DOI 10.1145/2601248.2601268](https://doi.org/10.1145/2601248.2601268) | Seção 3, conjunto inicial e iterações. É o procedimento para seguir os trabalhos centrais |
| **ESSENCIAL** | Lawrence D. Brown; T. Tony Cai; Anirban DasGupta. *Interval Estimation for a Binomial Proportion*. *Statistical Science*, 2001. [DOI 10.1214/ss/1009213286](https://doi.org/10.1214/ss/1009213286) | Intervalos para proporções; evitar o intervalo normal ingênuo, especialmente perto de zero/um |
| **IMPORTANTE** | Bruce Schneier; John Kelsey. *Secure Audit Logs to Support Computer Forensics*. *ACM TISSEC*, 1999. [DOI 10.1145/317087.317089](https://doi.org/10.1145/317087.317089) | Modelo de comprometimento e proteção de registros anteriores. Não importar a arquitetura inteira para o TCC |
| **IMPORTANTE** | Roger G. Johnston. *Effective Vulnerability Assessment of Tamper-Indicating Seals*. *Journal of Testing and Evaluation*, 1997. [DOI 10.1520/JTE11883J](https://doi.org/10.1520/JTE11883J) | Avaliação adversarial de lacres e distinção entre ensaio de resistência e avaliação de vulnerabilidade |
| **IMPORTANTE** | Subramaniam et al. *A Holistic Anti-Counterfeiting Platform…*, 2025. [DOI](https://doi.org/10.32604/cmc.2025.061560) | Seções 5 e 7. Separar mecanismo de identidade dinâmica, simulação e avaliação de percepção |
| **IMPORTANTE** | Alzahrani; Bulusu. *Block-Supply Chain*, 2018. [DOI](https://doi.org/10.1145/3211933.3211939) | Modelo de ameaça, protocolo e avaliação; candidato obrigatório à refutação da lacuna |
| **IMPORTANTE** | Oláh; Girászi; Vajda; Huszti. *NFC-PUF Three-Pass Authentication for Supply Blockchains*, 2026. [DOI](https://doi.org/10.1007/978-3-032-22208-4_12) | Obter integral e confrontar o modelo formal com ataques de transferência e cliente hostil |
| **COMPLEMENTAR** | Yanni Yang; Jiannong Cao; Zhenlin An; Yanwen Wang; Pengfei Hu; Guoming Zhang. *NFChain: A Practical Fingerprinting Scheme for NFC Tag Authentication*. IEEE INFOCOM, 2023. [DOI 10.1109/INFOCOM53939.2023.10229040](https://doi.org/10.1109/INFOCOM53939.2023.10229040) | Alternativa de autenticação física; metadados confirmados, avaliação integral pendente. Não ampliar o protótipo para RF fingerprinting |

Não foi validado um survey recente e abrangente especificamente sobre **SDM + sincronização offline**. É preferível registrar essa pendência a recomendar uma revisão genérica como se respondesse ao problema.

## 13. Novos livros/fontes técnicas recomendadas

Não é necessário comprar mais livros antes de acessar os já selecionados pela biblioteca da instituição. A recomendação é fixar edições e capítulos úteis.

| Prioridade | Fonte e identificação | Trechos de interesse / uso |
|---|---|---|
| **ESSENCIAL** | NXP. *NTAG 424 DNA – Secure NFC T4T compliant IC*, NT4H2421Gx, rev. 3.0, 2019. [PDF](https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf) | §9.3 e subitens, permissões e comandos; fonte primária para limites e funcionamento |
| **ESSENCIAL** | NXP. *NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints*, AN12196, rev. 2.0, 04/03/2025. [PDF](https://www.nxp.com/docs/en/application-note/AN12196.pdf) | §§3–4: configuração, exemplos e cálculos; conferir cada representação de bytes no gate |
| **ESSENCIAL** | Morris Dworkin/NIST. *Recommendation for Block Cipher Modes of Operation: The CMAC Mode for Authentication*, SP 800-38B, 2005, atualização de 2016. [DOI 10.6028/NIST.SP.800-38B](https://doi.org/10.6028/NIST.SP.800-38B) | Geração/verificação de CMAC. Não confundir a primitiva com um protocolo completo |
| **ESSENCIAL** | Claes Wohlin; Per Runeson; Martin Höst; Magnus C. Ohlsson; Björn Regnell; Anders Wesslén. *Experimentation in Software Engineering*, Springer, 2024. [DOI](https://doi.org/10.1007/978-3-662-69306-3) | *Essential Areas in Empirical Research*, *Planning*, *Analysis and Interpretation*, *Presentation and Package* |
| **IMPORTANTE** | Martin Kleppmann; Chris Riccomini. *Designing Data-Intensive Applications*, 2ª ed., O’Reilly, fevereiro de 2026. [Editora](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) | Cap. 8, transações; 9, falhas/relógios; 10, consistência; 12, processamento de eventos |
| **IMPORTANTE** | Jean-Philippe Aumasson. *Serious Cryptography*, 2ª ed., No Starch Press, agosto de 2024. [Editora](https://nostarch.com/serious-cryptography-2nd-edition) | AES, MACs, aleatoriedade, autenticação e falhas de implementação; não usar como especificação SDM |
| **IMPORTANTE** | Adam Shostack. *Threat Modeling: Designing for Security*, Wiley, 2014. [Autor](https://shostack.org/books/threat-modeling-book) | Fronteiras de confiança, ameaças e mitigação. A 2ª edição anunciada para 2027 não é uma leitura já publicada em setembro de 2026 |
| **IMPORTANTE** | NXP. *Symmetric key diversifications*, AN10922, rev. 2.2, 2019. [PDF](https://www.nxp.com/docs/en/application-note/AN10922.pdf) | Diversificação com CMAC; adaptar apenas com compatibilidade explicitamente verificada |
| **IMPORTANTE** | Stephen Kent. RFC 4303, *IP Encapsulating Security Payload*, 2005. [RFC](https://www.rfc-editor.org/rfc/rfc4303) | §3.4.3 e apêndice A: janela anti-replay e atualização do estado após autenticação. Inspiração, não especificação para SDM |
| **IMPORTANTE** | John Kelsey; Jon Callas; Alexander Clemm. RFC 5848, *Signed Syslog Messages*, 2010. [RFC](https://www.rfc-editor.org/rfc/rfc5848) | Seções 7–8: revisão offline, sequência, perda e integridade de registros |
| **COMPLEMENTAR** | Anders Rundgren; Bret Jordan; Samuel Erdtman. RFC 8785, *JSON Canonicalization Scheme*, 2020. [RFC](https://www.rfc-editor.org/rfc/rfc8785) | Canonicalização se houver assinatura/hash do envelope; evitar ambiguidade de serialização |
| **IMPORTANTE** | Android Developers: `Tag`, `IsoDep`, arquitetura offline-first, Keystore e key attestation. [NFC](https://developer.android.com/reference/android/nfc/Tag), [offline](https://developer.android.com/topic/architecture/data-layer/offline-first), [Keystore](https://developer.android.com/privacy-and-security/keystore) | Interfaces e fronteiras reais; atestação só se continuar no escopo |

## 14. Lacunas bibliográficas ainda abertas

### Auditoria individual das 34 referências fornecidas

**Legenda:** T = texto técnico/trechos relevantes examinados; M = existência e metadados confirmados, sem validação integral do argumento; P = referência incompleta ou confirmação ainda pendente. Especificações são fontes primárias normativas/técnicas, não artigos revisados por pares. Livros são sínteses; artigos originais são fontes primárias para seus próprios resultados. Publicação em venue científico não significa que esta auditoria verificou o processo editorial individual.

| Nº original | Validação/correção | Natureza, atualidade e decisão |
|---:|---|---|
| 1 | NFC Forum, *Data Exchange Format (NDEF) Technical Specification*. Existência confirmada no [catálogo](https://nfc-forum.org/build/specifications/); versão/ano do PDF usado ainda precisam ser fixados | **T parcial/P da versão**. Especificação primária; central. Catálogo não substitui leitura integral da edição citada |
| 2 | NFC Forum, *Specifications*. Página institucional, autoria corporativa, sem DOI | **T**. Índice redundante como referência conceitual; citar o documento específico |
| 3 | NFC Forum, *NFC Technology Roadmap*. A semente não identifica edição, data ou URL exatos | **P**. Planejamento institucional; não fundamenta comportamento do chip disponível |
| 4 | NFC Forum, DPP/sustainability candidate. O catálogo atual lista *NFC Digital Product Passport Technical Specification* | **T parcial**. Atualizar nomenclatura; confirmar versão. DPP não é protocolo antifraude e tem baixa prioridade |
| 5 | NXP, *NTAG213/215/216…*, documento NTAG213_215_216. [PDF oficial](https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf) | **T**. Primária técnica; manter para hardware Type 2, memória e limites |
| 6 | NXP, *NTAG 424 DNA – Secure NFC T4T compliant IC*, NT4H2421Gx, rev. 3.0, 31/01/2019 | **T**. Primária e central. Antiguidade não invalida especificação do componente |
| 7 | NXP, AN12196; versão consultada **2.0, 04/03/2025** | **T**. Primária e central; registrar versão no repositório experimental |
| 8 | NXP, *NTAG 424 DNA TT – Secure NFC T4T compliant IC with Tag Tamper feature*, **NT4H2421Tx**, rev. 3.0, 2019. [PDF](https://www.nxp.com/docs/en/data-sheet/NT4H2421Tx.pdf) | **T**. Primária; extensão física. Não confundir com etiqueta destrutível de chip comum |
| 9 | NIST SP 800-38B, Morris J. Dworkin; original 2005, atualização 2016; [DOI 10.6028/NIST.SP.800-38B](https://doi.org/10.6028/NIST.SP.800-38B) | **T**. Primária técnica, central para CMAC; não prova antirreplay por si só |
| 10 | Android Developers, `android.nfc.Tag`; autoria Google/Android; documentação contínua | **T**. Primária; confirma RID e IDs ausentes. Citar data de acesso |
| 11 | Android Developers, *Build an offline-first app* / data layer | **T**. Primária de plataforma; confiabilidade de implementação, não garantia contra operador malicioso |
| 12 | Vedat Coskun; Kerem Ok; Busra Ozdenizci. *Near Field Communication: From Theory to Practice*. Wiley. [DOI 10.1002/9781119965794](https://doi.org/10.1002/9781119965794). Online 27/12/2011; impressão 27/01/2012 | **M**. Livro real; corrigir grafia dos nomes e fixar ano da edição usada. Bom para base, insuficiente para APIs atuais |
| 13 | Michael Roland. *Security Issues in Mobile NFC Devices*. Springer, 2015. [DOI](https://doi.org/10.1007/978-3-319-15488-6) | **M**. Livro real; relevante para segurança, restrições atuais de Android exigem fonte atual |
| 14 | Jean-Philippe Aumasson. *Serious Cryptography*. Semente sem edição; recomendada 2ª ed., 2024, No Starch Press | **M**. Livro real; não inventar DOI. Síntese criptográfica, não evidência experimental NFC |
| 15 | Adam Shostack. *Threat Modeling: Designing for Security*. Wiley, 2014 | **M**. Livro real. Não citar como publicada a edição futura anunciada para 2027 |
| 16 | Wohlin, Runeson, Höst, Ohlsson, Regnell e Wesslén. *Experimentation in Software Engineering*, Springer, 2024; [DOI 10.1007/978-3-662-69306-3](https://doi.org/10.1007/978-3-662-69306-3) | **T parcial/M**. Livro central. Registrar a edição conforme ficha do exemplar; não transferir paginação de 2012 para 2024 |
| 17 | Douglas C. Montgomery. *Design and Analysis of Experiments*. Wiley. Semente sem edição/ano | **P da edição**. Livro fundamental reconhecido, mas referência fornecida não está pronta para a bibliografia. Usar exemplar identificado; não atribuir DOI sem confirmar |
| 18 | Klaus Finkenzeller. *RFID Handbook*. Wiley, 2010, [DOI 10.1002/9780470665121](https://doi.org/10.1002/9780470665121) | **M**. Livro real, associado à 3ª edição; bom para RF, não para promessas de segurança de SDM |
| 19 | Martin Kleppmann; Chris Riccomini. *Designing Data-Intensive Applications*, **2ª ed., fevereiro de 2026**, O’Reilly | **T do sumário/M**. Autores e edição confirmados. Citar edição efetivamente lida |
| 20 | Barbara Kitchenham; Stuart Charters. *Guidelines for Performing Systematic Literature Reviews in Software Engineering*, 2007, relatório **EBSE-2007-01** | **P da cópia integral nesta auditoria**. Relatório metodológico, não artigo de journal. Sem DOI confirmado; manter com registro institucional obtido |
| 21 | Kai Petersen; Robert Feldt; Shahid Mujtaba; Michael Mattsson. *Systematic Mapping Studies in Software Engineering*, EASE/BCS, 2008. [DOI 10.14236/ewic/EASE2008.8](https://doi.org/10.14236/ewic/EASE2008.8) | **M**. Artigo de conferência real; acrescentar a atualização de 2015 |
| 22 | Massimo Conti, EVO-NFC, *IEEE Access*, 2022; páginas confirmadas; [DOI 10.1109/ACCESS.2022.3151795](https://doi.org/10.1109/ACCESS.2022.3151795) | **M**. Artigo original; manter para domínio, deixar recursos técnicos como não verificados até leitura integral |
| 23 | Steffen Klee; Alexandros Roussos; Max Maass; Matthias Hollick, NFCGate, WOOT, 2020 | **T**. Artigo de workshop aceito. DOI **10.48550/arXiv.2008.03913** é do depósito, não um DOI dos anais USENIX |
| 24 | José Vila; Ricardo J. Rodríguez. *Practical Experiences on NFC Relay Attacks with Android*, RFIDSec 2015/LNCS. [DOI 10.1007/978-3-319-24837-0_6](https://doi.org/10.1007/978-3-319-24837-0_6) | **M**. Referência real; útil para relay, não obriga reproduzi-lo |
| 25 | Alberto Falcone; Carmelo Felicetti; Alfredo Garro; Antonino Rullo; Domenico Saccà. ARES, 2021; [DOI 10.1145/3465481.3469195](https://doi.org/10.1145/3465481.3469195) | **T**. Artigo original; PUF/ECC, não equivalente a SDM |
| 26 | Bingbing Liu, *Research on NFC Anti-Counterfeit Traceability Based on Signcryption Algorithm*. Evento **MLCA 2023**; online **16/04/2024**, pp. 941–949. [DOI 10.1145/3650215.3650383](https://doi.org/10.1145/3650215.3650383) | **M**. Crossref apresenta título com trecho duplicado; conferir folha do artigo antes da referência final. Não presumir que signcryption foi executada numa tag comum |
| 27 | Konstantinos Markantonakis; Julia A. Meister; Iakovos Gurulian; Carlton Shepherd; Raja Naeem Akram; Sarah Hani Abu Ghazalah; Mumraiz Kasi; Damien Sauveron; Gerhard Hancke. *Using Ambient Sensors for Proximity and Relay Attack Detection in NFC Transactions: A Reproducibility Study*. *IEEE Access*, 12, 150372–150386, 2024; [DOI 10.1109/ACCESS.2024.3479729](https://doi.org/10.1109/ACCESS.2024.3479729) | **M**. Estudo de reprodutibilidade real. Sem leitura integral, não reportar sua taxa de sucesso nem conclusão específica |
| 28 | Woongsup Lee; Seon Yeob Baek; Seong Hwan Kim. *Deep-Learning-Aided RF Fingerprinting for NFC Security*, *IEEE Communications Magazine*, 59(5), 96–101, 2021; [DOI 10.1109/MCOM.001.2000912](https://doi.org/10.1109/MCOM.001.2000912) | **M**. Artigo real; fundamentação alternativa, não componente do núcleo |
| 29 | **Yifeng Wang; Junwei Zou; Kai Zhang**. *Deep-Learning-Aided RF Fingerprinting for NFC Relay Attack Detection*, *Electronics*, 12(3), 559, 2023. [DOI 10.3390/electronics12030559](https://doi.org/10.3390/electronics12030559) | **M**. Completar autores e DOI. Não é o mesmo artigo/autoria do item 28 |
| 30 | Mohammed Alhassan Jubur. *Comparative Technical Analysis of QR Code and NFC in Contactless Payments*. ICCTA, 2024, pp. 242–246; [DOI 10.1145/3674558.3674593](https://doi.org/10.1145/3674558.3674593) | **M**. Conferência, domínio de pagamentos. Fraco para inferir throughput, custos ou fraude em encomendas |
| 31 | Liisa Hakola; Elina Hakola; Sarianna Palola; Anna Tenhunen-Lunkka; Jussi Lahtinen. *Durable and sustainable smart tags for identity management and condition monitoring: Case study for reusable packaging and recyclable data carriers*. Online **13/11/2023**; *Packaging Technology and Science*, 37(2), 107–121, **2024**; [DOI 10.1002/pts.2781](https://doi.org/10.1002/pts.2781) | **M**. Artigo original; durabilidade/reutilização, não prova de autenticidade física |
| 32 | Atharv Naik; Hong Seok Lee; Jack Herrington; Giandrin Barandun; Genevieve Flock; Firat Güder; Laura Gonzalez-Macia. *Smart Packaging with Disposable NFC-enabled Wireless Gas Sensors for Monitoring Food Spoilage*. *ACS Sensors*, 9(12), 6789–6799, **2024**; [DOI 10.1021/acssensors.4c02510](https://doi.org/10.1021/acssensors.4c02510) | **M**. Ano 2024 confirmado. Sensor de deterioração não é detector de abertura nem autenticação logística |
| 33 | Ejo Imandeka; Achmad Nizar Hidayanto; Panca O. Hadi Putra; Heru Suhartanto; Jan Pidanic. *Unlocking the Potential of Smart Security and Surveillance Technology in Prisons: A Brief Review*. *Revue d’Intelligence Artificielle*, 38(3), 2024; [DOI 10.18280/ria.380302](https://doi.org/10.18280/ria.380302) | **M**. Revisão secundária e distante do problema; remover da bibliografia central |
| 34 | Jansen Marion H. Du; Patricia Marian D. Gervacio; Karl Andrei Santisteban; Paolo Luigi S. Solacito; Maricel A. Balais. *A secure and automated student attendance tracking system utilizing NFC technologies for junior high school students at the UST*. *IET Conference Proceedings*, vol. 2024, nº 30, 25–30; publicação **março de 2025**. [DOI 10.1049/icp.2025.0229](https://doi.org/10.1049/icp.2025.0229) | **M**. Referência real, anais apesar da classificação de registro como journal-article. Baixa relevância; palavra “secure” no título não comprova resistência a ataques |

**Metadados não são validação dos resultados.** Os registros DOI foram confrontados com metadados editoriais/Crossref; campos sem confirmação ficaram explicitamente pendentes. Não se detectou evidência de que os DOI técnicos fornecidos sejam inventados; foram detectadas incompletudes, ambiguidade de datas e referências pouco pertinentes.

### Mapeamento sistemático recomendado

O mapeamento é adequado se for **limitado à classificação de mecanismos, ameaças e avaliações**. Uma revisão sistemática com metanálise de eficácia provavelmente não é viável: protocolos, dispositivos, ameaças e denominadores são heterogêneos. Não chamar esta auditoria de revisão sistemática concluída.

**Questões da revisão:** quais propriedades são alegadas? Onde está a chave? Qual parte do evento é autenticada? O trabalho considera cliente hostil, replay nunca apresentado e transferência física? Como trata desconexão/reordenação? Há hardware, dataset, múltiplas unidades e métricas replicáveis?

**Bases:** IEEE Xplore e ACM DL para computação; Scopus **ou** Web of Science como índice amplo; SpringerLink e ScienceDirect para leitura/snowballing; Portal CAPES como meio de acesso. Google Scholar e OpenAlex servem à descoberta e citações, não substituem especificar as bases efetivamente consultadas. Fontes industriais formam um conjunto separado.

**Período:** 2015 até a data da última busca em 2026, com sementes anteriores por relevância conceitual. Inglês e português; registrar exclusão por idioma quando ocorrer. Não exigir todas as palavras da lacuna numa única string.

| Grupo | String conceitual a adaptar à sintaxe de cada base |
|---|---|
| Autenticação | `(NFC OR "near field communication") AND (tag OR label) AND (authentication OR cloning OR replay OR counterfeit*)` |
| Logística | `(NFC OR "near field communication") AND (logistic* OR traceability OR "supply chain" OR "chain of custody")` |
| SDM | `("secure dynamic messaging" OR "secure unique NFC" OR "NTAG 424" OR NTAG424) AND (authentication OR verification OR counter OR replay)` |
| Offline | `(NFC OR "secure tag") AND (offline OR disconnected OR "intermittent connectivity" OR synchronization)` |
| Vínculo físico | `(NFC OR RFID) AND ("tag reapplication" OR "tag-to-object" OR "tamper evident" OR "electronic seal" OR "smart seal")` |
| Registros | `("secure logging" OR "event integrity") AND (mobile OR offline OR replay OR sequencing)` |

Evitar `SUN` isolado, que produz ruído. Incluir artigos com mecanismo identificável ou contribuição metodológica relevante. Excluir aplicações que apenas abrem uma URL sem avaliação pertinente, duplicatas, resumos insuficientes e domínios distantes sem transferência justificável. **Não excluir resultados negativos.** Agrupar versões do mesmo estudo; manter a versão mais completa sem contar o preprint como estudo independente.

Bruno e João devem fazer uma triagem piloto comum e depois registrar decisões individualmente, resolvendo desacordos com justificativa. Guardar consulta literal, base, data, filtros, exportação, exclusão por fase, link/DOI e disponibilidade do integral. O fluxograma PRISMA pode documentar o fluxo, mas não certifica a qualidade do mapeamento. Fazer backward e forward snowballing em Alzahrani/Bulusu, NFCGate, EVO-NFC, Falcone e trabalhos SDM eventualmente localizados. [19], [20], [21]

Avaliar qualidade por itens separados: ameaça explícita, vínculo das alegações ao protocolo, hardware descrito, controle de variáveis, amostragem, dados/código, adequação das métricas e limitações. Não reduzir tudo a uma nota de “qualidade” sem explicar a regra.

### Tabela de extração proposta

Uma linha por estudo e uma tabela secundária por configuração experimental. Assim, um paper com vários protocolos não é comprimido em uma descrição enganosa.

| Campos | Como preencher |
|---|---|
| Paper; autores; ano; DOI; venue; tipo; versão | Metadados conferidos na publicação, com ano do evento separado do online |
| Tipo de tag; NFC Forum Type; NDEF; UID | Chip/SKU, protocolo, formato e origem do identificador |
| Crypto; SDM; SUN; Counter; MAC | Algoritmo, local da chave, dados cobertos e semântica do contador |
| Clone; Replay; Relay; Tamper | Para cada ameaça: não tratado, discutido, simulado ou fisicamente testado |
| Supply Chain; Logistics; Chain of Custody | Domínio e procedimento, sem inferir cadeia de custódia apenas por haver eventos |
| Offline; sincronização; reordenação | Captura, validação local ou reconciliação posterior; política utilizada |
| Smartphones; número de dispositivos | Modelos e unidades físicas; versões Android e aplicação |
| Amostra; réplicas; métricas; método estatístico | Denominadores, unidade experimental, repetição e incerteza |
| Resultados; limitações; future work | Separar resultados medidos de alegações dos autores |
| Relevância; diferença para o TCC | Classificação e justificativa específica |
| Nível de acesso; página/seção; ground truth | Integral/resumo/metadados, localização da evidência e referência externa |

Persistem lacunas de **acesso integral** em parte da semente, de literatura especificamente SDM/offline, de estudos de custo no Brasil e de evidência de uma necessidade logística local. A existência desses campos abertos deve aparecer no TCC até ser resolvida.

## 15. Análise crítica de NDEF

Definir o tratamento como **NDEF estático, contendo uma referência pública ao cadastro, sem autenticação criptográfica da tag**. Não colocar todos os dados pessoais ou logísticos na etiqueta. A referência deve resolver para o cadastro no servidor, sujeito às mesmas regras de acesso usadas nos outros tratamentos.

Copiar os bytes para outra etiqueta compatível reproduz a identificação por conteúdo. Bloquear a escrita do original impede determinadas alterações naquele original, mas não impede copiar seu conteúdo. Uma assinatura de conteúdo estático pode permitir verificar origem e integridade dos dados assinados; a cópia integral continua transportando uma assinatura válida. Logo, “estático”, “sem criptografia” e “gravável” são dimensões distintas. [5]

Esse baseline é cientificamente útil para medir quanto a segurança observada vem dos controles comuns do servidor. Se uma segunda solicitação é rejeitada por idempotência ou pela máquina de estados, a rejeição não deve ser atribuída ao NDEF. Se uma etiqueta clonada permite identificar a mesma encomenda num cliente honesto, isso demonstra a limitação sob essa ameaça, não a quebra de um algoritmo criptográfico.

**Protocolo:** usar a mesma referência lógica e a mesma interface de leitura dos demais tratamentos sempre que possível; registrar comprimento do payload. Um ensaio com tamanhos naturais mede a solução completa. Um ensaio complementar com comprimentos equiparados ajuda a separar custo de transferência e custo de processamento. Não preencher artificialmente mensagens e depois generalizar sua latência para todos os sistemas comerciais.

## 16. Análise crítica de UID

O UID é um identificador, **não um segredo nem uma prova criptográfica**. A API Android informa que a estabilidade e a existência do identificador dependem da tecnologia; há identificadores aleatórios e casos sem identificador disponível. Para o SKU escolhido, documentar a configuração efetiva e verificar se o UID observado permanece estável entre sessões. [6]

Há dois experimentos diferentes:

| Situação | O que o servidor recebe | Conclusão permitida |
|---|---|---|
| Conteúdo copiado para outra tag de UID diferente, aplicativo honesto | O UID efetivamente observado pelo aplicativo | A vinculação pode detectar a diferença |
| Cliente adulterado declara o UID da tag original | Uma sequência de bytes escolhida pelo cliente | A consulta ao cadastro, isoladamente, não autentica a presença da tag |
| Emulação ou clonagem do identificador no rádio | Depende de hardware, protocolo e capacidade do emulador | Só afirmar viabilidade no conjunto de equipamentos efetivamente demonstrado |

É possível demonstrar a segunda limitação sem comprar equipamento para clonar UID no rádio. Esse teste é uma **falsificação da alegação ao backend**, não uma clonagem física de UID. NFCGate oferece evidência de que interceptação, replay e relay merecem consideração, mas não autoriza afirmar que qualquer Android emula qualquer UID ou chip. [17]

Não confundir UID obtido por `Tag.getId()` com texto denominado `uid` dentro do NDEF. Ambos precisam ser descritos quanto à origem. O backend deve definir o mecanismo esperado no cadastro; aceitar que o cliente selecione um esquema mais fraco permitiria downgrade.

## 17. Análise crítica de autenticação dinâmica/SDM

O tratamento recomendado é **verificação posterior, no backend, de uma mensagem SDM produzida por uma NTAG 424 DNA provisionada pelo experimento**. “SDM/SUN” não deve aparecer como se fosse um único protocolo abstrato independente de configuração: identificar arquivo, campos espelhados, opções de criptografia, offsets, chave e regra de validação usados. [1], [2]

Como requisito do perfil experimental, os campos usados para identificar a tag e controlar reutilização devem estar vinculados à verificação criptográfica, conforme o perfil oficial adotado. Não basta colocar um contador público ao lado de um MAC que não o protege.

O protocolo permite verificar dados autenticados pela chave associada à tag. Isso não basta para concluir que houve uma interação recente com a encomenda, nem que o contexto acrescentado pelo aplicativo corresponde ao mundo físico. A documentação técnica deve fundamentar as propriedades do mecanismo; frases comerciais como “impossível de clonar” não devem substituir um modelo de ameaça.

### Fronteiras da proteção

| Informação/propriedade | Tratamento exigido |
|---|---|
| Bytes efetivamente cobertos pelo MAC | Verificar segundo a configuração e os vetores oficiais |
| Contador extraído de mensagem válida | Interpretar com a política de uso de evidências |
| Operação, operador, localização e horário acrescentados pelo app | Alegações externas ao SDM, salvo vínculo adicional expressamente construído |
| Ausência de uso anterior no servidor | Consulta ao estado persistido; não é propriedade do MAC sozinho |
| Recência física da leitura | Não demonstrada apenas pela primeira apresentação de SDM |
| Correspondência entre tag e conteúdo da caixa | Depende do vínculo físico e do procedimento de cadastramento |

**Inferência de projeto:** para explicar o resultado, apresentar o envelope de evidência separado do envelope contextual. Um MAC válido continua válido quando o cliente troca um campo contextual não autenticado. Regras de negócio podem rejeitar a alteração, mas isso não amplia retroativamente a cobertura do MAC.

### Contador e provisionamento

Não presumir “um incremento por toque”. O `SDMReadCtr` é um contador de 24 bits, diferente do contador de comandos de uma sessão autenticada. A relação entre aproximações, sessões RF e leituras depende dos comandos e da configuração; o gate deve medi-la. Limites, reinicialização na habilitação do SDM e falhas no limite precisam seguir a documentação, sem pressupor wraparound. [1], [2]

Uma reconfiguração experimental pode reutilizar valores. Por isso, o histórico precisa distinguir **épocas de provisionamento confiáveis**. Um novo identificador de execução informado pelo cliente não pode apagar a proteção contra replay. Se reinicializar o contador, usar novo material de chave e registrar a transição autorizada; não aceitar “nova época” arbitrária no pedido. Manter as configurações congeladas dentro de cada bloco de coleta.

O protocolo de captura também precisa impedir que a equipe conte duas releituras da mesma mensagem como duas evidências novas. Classificar reutilização de evidência não equivale a acusar fraude: a causa pode ser cache, sessão de leitura ou repetição legítima do operador.

No núcleo, preferir um perfil documentado simples, com referência pública à tag e verificação no servidor. UID público não prejudica, por si só, a função autenticadora do MAC. Chaves aleatórias por tag simplificam a separação entre unidades; diversificação por chave mestra é alternativa, se necessária e corretamente especificada. AN10922 é referência para diversificação, não obrigação de acrescentar um SAM ao protótipo. [29]

## 18. Análise do problema de replay

**Replay de evidência e repetição de entrega são problemas distintos.** A mesma solicitação pode reaparecer porque a confirmação se perdeu. Nesse caso, retornar a decisão já persistida é comportamento correto. Um atacante pode manter a mesma evidência NFC, gerar outro `eventId` e alterar o contexto; idempotência por identificador do evento não detecta essa reutilização.

Nos baselines, o NDEF estático e o UID reaparecem legitimamente em várias movimentações. Não tornar esses identificadores globalmente consumíveis após a primeira leitura: isso fabricaria um baseline incapaz de operar. A regra de uso único de **evidência dinâmica** aplica-se ao SDM; idempotência de eventos, autorização e regras logísticas devem permanecer comuns aos três tratamentos.

| Caso controlado | Política/resposta esperada | Interpretação |
|---|---|---|
| Mesmo evento, mesmos bytes, ACK perdido | Retornar resultado anterior, sem novo efeito | Duplicação legítima de transporte |
| Mesmo evento, conteúdo diferente | Conflito explícito | Colisão ou adulteração da identidade da solicitação |
| Novo evento, evidência SDM já consumida | Rejeitar reutilização; guardar tentativa conforme política | Replay conhecido |
| Mensagem SDM antiga, válida e nunca apresentada | Pode passar no MAC e no teste de não utilização | Limite de freshness, não quebra do AES |
| Contador 102 chega antes do 101 legítimo | Resultado depende da política escolhida | Reordenação não equivale automaticamente a ataque |
| Contador muito alto com MAC inválido | Rejeitar sem atualizar estado anti-replay | Evitar envenenamento do maior contador |
| Mesmo contador válido, solicitações concorrentes | Uma única reivindicação de evidência | Exige controle transacional, não apenas consulta prévia |
| Nova época declarada por cliente hostil | Recusar a troca de época | Cadastro/provisionamento são autoridades separadas |

### Um limite que o experimento precisa demonstrar

Considere dois mundos: **A**, um operador honesto lê uma tag offline e envia a mensagem válida depois; **B**, alguém guarda essa mesma mensagem e apresenta pela primeira vez uma alegação falsa no mesmo momento posterior. Se o servidor observa os mesmos dados, não dispõe de desafio atual, referência temporal confiável ou evidência física independente, não tem informação para distinguir A de B.

Esse argumento é uma **inferência sobre a arquitetura**, não uma alegação de teorema novo nem um resultado experimental já obtido. Ele explica por que exigir aceitação offline irrestrita e rejeição de toda primeira apresentação atrasada é contraditório nesse modelo. A advertência de replay residual da NXP sustenta a relevância do problema. [1]

### Políticas que vale comparar

| Política | Regra de evidência | Benefício | Custo/limite |
|---|---|---|---|
| P1 — maior contador | Aceitar apenas contador válido maior que o máximo persistido | Rejeita valores anteriores ao máximo observado | Descarta evidências legítimas que cheguem depois com contador menor |
| P2 — conjunto de valores usados | Admitir contador válido ainda não registrado, inclusive abaixo do máximo | Preserva mais observações atrasadas | Admite primeira apresentação antiga não observada; requer retenção do conjunto |
| P3 — registro tardio separado | Registrar a observação válida atrasada, sem autorizar automaticamente uma transição | Preserva auditoria e torna o conflito visível | Não resolve, sozinho, o conflito logístico nem prova freshness |

Para caber no TCC, comparar **P1 e P3**, usando em P3 controle de valores já vistos. Uma janela limitada pode ser extensão se houver necessidade mensurável. Janelas anti-replay têm precedentes consolidados; não devem ser apresentadas como invenção do projeto. [23]

P3 pode ser vista como uma composição: classificação criptográfica, controle de uso e decisão de negócio separada. Uma mensagem tardia não deve fazer uma encomenda já entregue “voltar” a coletada. É possível preservar uma observação sem aceitar a movimentação que ela alega.

## 19. Análise da conectividade intermitente

**Escolha recomendada:** captura local durável e autenticação posterior. Enquanto houver pendência, a interface informa “capturado; aguardando verificação”. Não deve exibir um selo de autenticidade definitiva.

| Capacidade | O núcleo proposto fornece? | Condição/limite |
|---|---|---|
| Ler sem internet | Sim, se o aparelho e a tag funcionarem | A leitura RF pode falhar independentemente da rede |
| Persistir antes de confirmar ao operador | Deve fornecer | Transação local concluída |
| Verificar SDM criptograficamente offline | Não no recorte mínimo | Exigiria material e política de verificação local |
| Saber offline se outro aparelho já usou a evidência | Não de forma global | Exige comunicação ou restrição adicional |
| Sincronizar após reconexão | Objetivo verificável | Reconexão, execução do aplicativo e dados locais preservados |
| Garantir ausência de perda após desinstalação ou destruição do telefone | Não | Fora do modelo mínimo de falhas |

Room mantém eventos e fila de saída de forma transacional; WorkManager coordena tentativas persistentes compatíveis com as restrições do sistema. Ele não é um relógio de execução imediata. Prever também sincronização iniciada pela interface quando o app estiver ativo. A documentação Android recomenda tratar a fonte local e a reconciliação como partes explícitas da arquitetura offline. [3]

**Não prometer entrega exatamente uma vez pela rede.** Projetar tentativas ao menos uma vez, dentro das condições declaradas, e efeitos de negócio no máximo uma vez. O teste deve derrubar a conexão depois do commit no servidor e antes do ACK: se a tentativa seguinte duplica a movimentação, a implementação falhou.

Separar morte de processo, reinicialização do aparelho, suspensão em segundo plano, force-stop, desinstalação e limpeza de dados. Registrar quando o usuário precisa reabrir o aplicativo. Não classificar ausência de execução permitida pelo sistema operacional como perda silenciosa de um evento já confirmado pelo servidor.

### O que significaria autenticação offline verdadeira

Uma chave AES guardada no aparelho permitiria verificar mensagens localmente, mas ampliaria a fronteira de confiança: quem consegue usar a chave para autenticar também pode, conforme sua exposição e a arquitetura, produzir mensagens compatíveis. O Keystore pode dificultar extração; não elimina o uso indevido da chave por um aplicativo/processo comprometido. Atestação é uma evidência adicional sobre chaves/dispositivo, não um comprovante físico do pacote. [26], [27]

Assinaturas assimétricas permitem ao verificador portar uma chave pública sem o poder de assinar. Contudo, assinatura estática continua copiável; challenge-response assimétrico requer tag e protocolo apropriados. Mesmo esse mecanismo não resolve sozinho revogação recente ou duplo uso entre verificadores desconectados. Isso seria outro recorte, não uma opção de configuração que se deve atribuir ao SDM atual.

## 20. Análise da cadeia de custódia

Um histórico íntegro de alegações não é automaticamente uma cadeia de custódia comprovada. É preciso definir quem entrega, quem recebe, qual objeto é conferido e como um desacordo é tratado. Um único operador registrar “recebido” fornece evidência da alegação daquele operador, sob as condições de autenticação adotadas.

Para o TCC, usar quatro estados e um procedimento explícito de laboratório: **cadastrado → coletado → recebido → entregue**. Transições exigem operador autorizado e antecedente compatível. Identificadores dos eventos anteriores ou uma expectativa de versão ajudam a identificar dependências; relógio do cliente não deve decidir conflitos sozinho.

| Situação | Comportamento recomendado |
|---|---|
| Evento válido chega antes de seu antecessor | Manter pendente de dependência; reavaliar após a chegada do anterior |
| Duas transições incompatíveis disputam a mesma versão | Registrar conflito; não sobrescrever silenciosamente |
| Observação antiga chega após entrega | Acrescentar ao histórico com sua classificação; não retroceder estado automaticamente |
| Leitura genuína é associada a outra embalagem | O controle digital pode continuar passando; comparar com ground truth físico |
| Cliente altera horário ou localização | Conservar como alegação e marcar origem; não promover a verdade independente |

O contador pode ajudar a ordenar gerações de evidências daquela tag sob a configuração declarada. Ele não é um relógio confiável da custódia, e lacunas não provam perda de eventos: podem ocorrer leituras sem criação de evento.

Confirmação bilateral de transferência fortaleceria custódia, mas acrescenta identidades, coordenação e conflitos offline. Incluir somente se for a pergunta central. No núcleo recomendado, falar em **registro de eventos de movimentação e limitações do vínculo físico**, não em certificação completa da cadeia de custódia.

## 21. Análise dos lacres físicos e tamper evidence

Há três mecanismos que não devem ser agrupados como equivalentes:

| Mecanismo | O que pode evidenciar | Limite relevante |
|---|---|---|
| Etiqueta destrutível ao descolar | Sinais visuais ou perda funcional após remoção | Ausência de resposta também pode ser defeito, posição ou falha RF |
| Lacre com circuito/sensor, como variante TagTamper | Estado do circuito segundo projeto e configuração do chip | Não identifica automaticamente pessoa, causa, conteúdo ou todas as rotas de abertura |
| Procedimento físico auditado | Correspondência entre etiqueta, embalagem e ações observadas | Depende de execução, registro e perímetro do procedimento |

NTAG 424 DNA e NTAG 424 DNA **TagTamper** são variantes distintas. Um adesivo anunciado como “tamper” pode usar material destrutível com NTAG424 comum. Conferir part number e ficha técnica antes de chamar o produto de TagTamper. [28], [30]

O artigo de Alzahrani e Bulusu de 2016 é especialmente relevante: a avaliação reconhece a limitação da transferência de etiqueta sem a leitura necessária para detectar a situação. Isso contradiz a hipótese ampla de que um histórico digital impede, por si só, troca de etiquetas. [10]

**Decisão:** manter no experimento principal uma demonstração controlada de transferência de etiqueta intacta entre caixas identificadas externamente. Ela delimita os três tratamentos. Adiar uma avaliação completa de lacres, que exigiria especificar adesivo, superfície, envelhecimento, montagem, formas de abertura, classificação física e falsos alarmes. Johnston oferece uma referência anterior à tecnologia NFC para pensar em testes de selos; o item exato de 2003 mencionado na semente continua pendente de identificação. [41]

## 22. Análise da viabilidade logística do NFC

A justificativa depende do **posto de trabalho**. NFC é uma candidata razoável para conferência deliberada de uma encomenda por vez, com smartphone disponível e operador que já manipula o volume. Sua adequação a portais, leitura simultânea ou grandes fluxos não decorre dessa hipótese.

| Alternativa | Situação a investigar | Limite da comparação |
|---|---|---|
| QR/código visual estático | Baixo custo de marcação e uso de câmera | Identificação estática é copiável; QR dinâmico/assinado é outra configuração |
| NFC estático/UID | Interação deliberada e curta aproximação | Sem prova criptográfica pelo identificador sozinho |
| NFC com SDM | Verificação de origem da evidência sob chaves e backend | Mais provisionamento e gestão; limites de replay e vínculo físico |
| UHF RFID | Leitura automatizada e múltiplos itens, conforme instalação | Infraestrutura e ambiente diferentes; um sistema UHF também pode ter variantes de segurança |

Essa tabela é uma **orientação de desenho**, não resultado de benchmark. Antes de declarar vantagem econômica, medir o processo completo: localizar a etiqueta, posicionar o telefone, obter leitura, corrigir falhas, confirmar operação e tratar pendências. Tempo de verificação do MAC pode ser pequeno diante do gesto; só a medição poderá quantificar.

Definir um cenário concreto, por exemplo: balcão de conferência de volumes unitários em ambiente interno, com desconexões temporárias. Registrar superfície da embalagem, distância, orientação, capas dos celulares, presença de metal/líquidos e necessidade de uma mão livre. O ensaio básico deve padronizar esses fatores; um pequeno ensaio de sensibilidade pode variar somente os dois mais relevantes ao cenário.

Avaliar custo por **evento concluído**, não apenas por etiqueta: tag, impressão/fixação, perdas, provisionamento, mão de obra, aparelhos, manutenção e retrabalho. A seção 30 traz preços de referência verificáveis, sem inferir custo entregue no Brasil. Se o contexto real não exigir autenticação da tag, QR pode bastar; isso é um resultado útil para a decisão de adoção, não um fracasso do TCC.

## 23. Análise do desenho experimental

Classificar como **pesquisa aplicada com construção de artefato e avaliação experimental controlada**. A criação do software é o meio de realizar a comparação. Não é necessário adotar formalmente Design Science Research se o curso não exigir e o ciclo de pesquisa não for efetivamente seguido.

Separar três baterias evita uma explosão fatorial:

| Bateria | Pergunta | Desenho mínimo |
|---|---|---|
| A — leitura e custo operacional | Como os tratamentos diferem em sucesso e tempo de leitura? | Três tratamentos, mesmo SKU, etiquetas e aparelhos identificados, sessões em blocos |
| B — ameaças | O que cada tratamento permite aceitar sob cada capacidade adversarial? | Casos positivos e negativos roteirizados; efeitos criptográficos e de negócio separados |
| C — entrega e reconciliação | O que duplicação, atraso e reordenação alteram? | Evidências reais previamente capturadas, cronogramas de envio controlados, P1 e P3 no SDM |

A bateria C pode reutilizar um corpus de mensagens reais para comparar políticas determinísticas, desde que isso seja declarado como **reexecução de traces**, sem contar cada reexecução como nova leitura física. Guardar também algumas execuções completas com dois telefones para confirmar a integração.

### Como tentar refutar cada hipótese original

| Hipótese | Tentativa de refutação | Reformulação recomendada |
|---|---|---|
| H1 — dinâmica apresenta menor aceitação indevida | Usar primeira apresentação antiga válida, contexto adulterado e controles comuns que rejeitam pedidos em todos os tratamentos. A vantagem pode desaparecer nesses cenários | Comparar sucesso do ataque **por capacidade e cenário**, sem hipótese global de superioridade |
| H2 — UID detecta cópia simples, mas não necessariamente replay | Informar UID original por cliente hostil; testar comportamento com UID instável/configuração inadequada | Condicionar a detecção de cópia a cliente honesto e UID diferente, efetivamente observado |
| H3 — NDEF estático depende do backend | Mostrar que uma assinatura estática ou segredo externo muda a definição do baseline | Fixar “NDEF estático sem prova criptográfica”; tratar a limitação como propriedade do tratamento, não descoberta estatística |
| H4 — nenhum mecanismo necessariamente impede transferência | Demonstrar transferência intacta com os três tratamentos; um lacre especial alteraria o mecanismo físico estudado | Registrar como limite de escopo corroborado por demonstração e literatura, não hipótese de equivalência universal |
| H5 — offline preserva eventos sem efeitos duplicados | Perder ACK, enviar em paralelo, reiniciar processo, chegar fora de ordem, conflitar IDs, perder dados locais | Enunciar invariantes sob falhas delimitadas, persistência preservada e conectividade eventualmente restabelecida |

H1 e H2 podem gerar contrastes experimentais. H3 e H4 são principalmente proposições de arquitetura/modelo de ameaça. H5 combina requisitos verificáveis e hipóteses operacionais; nenhum número finito de execuções prova todos os comportamentos possíveis de um sistema distribuído.

### Casos mínimos e resultados esperados antes da coleta

| Caso | Ground truth externo | Desfecho a registrar |
|---|---|---|
| Leitura legítima online | Etiqueta e caixa corretas; operador autorizado | Sucesso RF, decisão e latências |
| Leitura legítima offline | Mesmo procedimento, rede bloqueada | Persistência, classificação pendente, decisão posterior |
| Cópia de conteúdo em tag diferente | Identidade física original/cópia documentada | Identificação aceita e autorização indevida |
| UID declarado falsamente ao servidor | Requisição marcada pelo gerador de cenário | Rejeição/aceitação da alegação |
| Mensagem alterada | Byte alterado registrado fora do verificador | Falha de verificação; ausência de efeito |
| Novo ID com evidência usada | Referência ao evento original | Reutilização detectada e efeito adicional |
| Evidência antiga inédita | Horário da captura registrado externamente | MAC válido, classificação de freshness, autorização |
| Contexto trocado mantendo evidência | Operação/caixa falsa conhecida pelo roteiro | O que rejeita: criptografia, autorização ou regra de negócio |
| Duplicação/reordenação/concorrência | Sequência de geração e entrega predefinida | Preservação, conflitos e número de efeitos |
| Transferência física de tag | Caixa de origem e de destino identificadas | Limite do vínculo tag–objeto |

Usar identificadores físicos externos, roteiro prévio e registro do executor/observador. O JSON produzido pelo app não pode ser a única “verdade” usada para provar que esse mesmo app detectou adulteração.

## 24. Variáveis e confundidores

| Variável | Papel recomendado | Tratamento |
|---|---|---|
| Mecanismo estático/UID/SDM | Fator principal | Mesma lógica de negócio e instrumentação |
| Política SDM P1/P3 | Fator na bateria C | Comparação sobre o mesmo trace; não cruzar desnecessariamente com todos os fatores RF |
| Perfil de ataque | Fator na bateria B | Relatar separadamente; não produzir média global sem distribuição de ameaças justificada |
| Regime de entrega | Fator | Online, interrupção, inversão, duplicação, concorrência, ACK perdido |
| Tag física e lote/SKU | Unidade e bloco | Rastrear serial experimental, lote e configuração; não confundir replicação com taps |
| Aparelho físico | Bloco/caso | Modelo, Android e unidade; não atribuir causalidade isolada ao fabricante |
| Sessão/dia | Bloco | Repetir em pelo menos duas sessões quando viável |
| Ordem dos tratamentos | Randomização balanceada | Distribuir as seis permutações possíveis entre tags |
| Ordem dos cenários/execuções | Randomização dentro do bloco | Evitar aquecimento, aprendizado e fadiga alinhados a um tratamento |
| Operador | Controle ou bloco | Procedimento treinado; se houver dois, distribuir o trabalho de forma balanceada |
| Antena, material, distância, orientação e capa | Controle no ensaio principal | Suporte simples de posicionamento; documentar tolerâncias |
| Tamanho do NDEF e número de comandos | Medir; ensaio complementar se necessário | Separar comparação de solução e investigação do mecanismo |
| Backend, build, banco, carga e rede | Controle/registro | Versões congeladas; coletar tempo de CPU e transporte separadamente |
| Cache NDEF, sessão RF, leituras de fundo | Confundidor específico | Reconexão/procedimento explícito; registrar comandos relevantes |

**Crossover recomendado:** as mesmas tags passam pelos três tratamentos, com ordem balanceada e provisionamento documentado. Reconfigurar não significa misturar evidências de épocas diferentes. Se o gate mostrar que a reconfiguração causa efeitos difíceis de controlar, usar grupos de tags idênticas do mesmo lote, distribuídas aleatoriamente entre tratamentos, admitindo menor eficiência estatística.

Não manter SDM ativo e simplesmente ignorar o MAC no “baseline de desempenho”: isso incluiria trabalho e bytes do mecanismo dinâmico no baseline. Essa modalidade pode ser uma **ablação de verificações do servidor**, mas deve receber esse nome e ser analisada separadamente.

Com um telefone de cada modelo, “modelo”, “fabricante”, “versão Android”, “chipset NFC” e “unidade física” ficam parcialmente confundidos. A conclusão correta é sobre os aparelhos ensaiados. Mais taps não desfazem esse confundimento.

## 25. Métricas recomendadas

Fixar os denominadores antes do piloto. Um único “aceito/rejeitado” mistura rádio, criptografia, reutilização e autorização.

| Métrica | Definição operacional | Cuidado |
|---|---|---|
| Sucesso de leitura | Tentativas com evidência completa / tentativas físicas iniciadas | Incluir timeouts e falhas; definir janela e número máximo de novas aproximações |
| Sucesso do ataque | Tentativas adversariais que atingem o objetivo / tentativas elegíveis daquele cenário | Objetivo pode ser autenticar evidência ou aplicar movimentação; relatar ambos |
| FAR operacional | Alegações indevidas autorizadas / alegações indevidas submetidas no cenário | Não interpretar como probabilidade universal de falsificação criptográfica |
| FRR operacional | Eventos legítimos rejeitados definitivamente / eventos legítimos elegíveis | Pendências não resolvidas e falhas RF ficam em categorias próprias |
| Rejeição tardia legítima | Evidências legítimas descartadas por política temporal / evidências legítimas entregues fora de ordem | Principal contraste P1/P3 |
| Taxa de detecção | Ataques corretamente classificados / ataques elegíveis | Rejeição por estado incompatível não prova identificação correta do ataque |
| Latência RF | Tempo monotônico do início definido da leitura até obter evidência completa | Não inclui a procura manual da etiqueta se o início já é a conexão |
| Tempo operacional | Tempo do início da tarefa do operador até confirmação local | Captura custos de aproximação e retrabalho |
| Latência de verificação | Tempo medido no mesmo servidor ao processar a evidência | Distinguir parse, criptografia e transação, se a instrumentação permitir |
| Latência online total | Intervalo medido no aparelho entre ação e resposta | Não subtrair relógios de hosts diferentes |
| Tempo de reconciliação | Intervalo entre restauração controlada da comunicação e classificação de todos os eventos elegíveis | Fixar timeout; informar execuções censuradas/não concluídas |
| Efeitos duplicados | Efeitos adicionais além do único efeito autorizado para a identidade definida | Contar registros de tentativa separadamente de movimentações |
| Perda de eventos | Capturas confirmadas localmente sem registro durável recuperável ao fim do procedimento definido | Separar perda local, falha de transporte e rejeição legítima |
| Conflitos e pendências | Contagens por motivo e tempo até resolução | Não esconder como sucesso porque houve HTTP 200 |
| Custo operacional | Custo de material e tempo / eventos concluídos, no cenário | Mostrar premissas e moeda/data; não extrapolar para escala não medida |

Publicar a matriz de confusão quando houver classificação de ataques. Registrar motivo de falha e camada da decisão. “Detectado” deve significar que a classificação corresponde ao ground truth; um erro de rede que impediu o ataque não é uma detecção de segurança.

O dataset deve conter **também tentativas que falharam**, IDs de tag/aparelho/sessão, tratamento, configuração, tempos, ordem real de envio e decisões. Não publicar chaves operacionais, credenciais ou dados pessoais. Chaves públicas de teste e vetores demonstrativos podem compor um conjunto separado, claramente sem uso operacional.

## 26. Método estatístico recomendado

Começar por estimativas, distribuições e intervalos de incerteza. Testes de hipótese entram para contrastes previamente definidos, não para procurar qualquer diferença significativa em dezenas de combinações.

| Tipo de desfecho/desenho | Método útil | Restrição |
|---|---|---|
| Proporção em unidades independentes | Intervalo de Wilson; diferença de riscos com intervalo apropriado | A fórmula binomial simples não corrige agrupamento |
| Dois grupos independentes, contagens pequenas | Fisher exato | Não aplicar como se taps repetidos fossem indivíduos independentes |
| Grupos independentes com contagens adequadas | Qui-quadrado | Verificar contagens esperadas e independência |
| Desfecho binário pareado | McNemar para pares bem definidos; versão exata quando necessária | O par precisa ser unidade comparável; não fabricar pareamento posterior |
| Dados binários repetidos e cruzados | Modelo logístico misto ou análise agregada por bloco | Modelos complexos exigem unidades suficientes e diagnóstico |
| Latências independentes entre dois grupos | Mann–Whitney e efeito como Cliff's delta | Diferença de distribuição não equivale sempre a diferença de mediana |
| Mais de dois grupos independentes | Kruskal–Wallis com contrastes planejados | Inadequado para ignorar dependência do crossover |
| Latências nos mesmos blocos | Diferenças pareadas; Wilcoxon/Friedman conforme o desenho | Declarar pressupostos e tratar empates |
| Latências com repetição por tag/aparelho/sessão | Modelo misto, transformação justificada ou resumo por bloco | Três aparelhos não sustentam inferência robusta sobre a população de modelos |
| Mediana/p95 e diferenças | Bootstrap que preserve a estrutura de dependência | Reamostrar taps isolados subestima incerteza; poucos clusters limitam o próprio bootstrap |

Wilson é preferível ao intervalo normal ingênuo em muitas situações de proporções; Brown, Cai e DasGupta discutem o problema de cobertura desses intervalos. Isso não autoriza usar Wilson em uma amostra dependente sem adaptação. [22]

Recomendação prática: aparelhos como **casos/fatores fixos**, etiquetas como unidades repetidas, sessões registradas e contrastes pareados por bloco. Se a amostra permitir modelo misto, definir antes quais efeitos são fixos e aleatórios; caso contrário, usar uma análise descritiva honesta por aparelho e agregação no nível da tag.

Reportar diferença absoluta de riscos em pontos percentuais e diferença de tempo em milissegundos, com intervalos. Odds ratio pode complementar, mas é menos intuitivo e fica instável com células zero; não acrescentar correções arbitrárias só para obter um número finito. Mostrar zeros como zeros e sua incerteza.

Mediana e p95 são úteis, mas p95 com poucas observações por condição é instável. Mostrar quantidade de dados, distribuição e falhas/timeout. Não excluir silenciosamente as leituras lentas que falharam. Para muitos contrastes secundários, usar correção predefinida, como Holm, ou rotulá-los como exploratórios; não deixar a significância escolher a narrativa.

## 27. Quantidade/amostragem sugerida e como determiná-la

### Piloto para dimensionar, não para concluir

Proposta inicial de viabilidade: **6 tags físicas do mesmo SKU, 3 aparelhos disponíveis e 10 tentativas por combinação tag–aparelho–tratamento**, totalizando 540 tentativas de leitura. Distribuir as seis ordens possíveis dos tratamentos entre as seis tags. São 54 células tag–aparelho–tratamento com repetição, **não 540 unidades independentes**. O número serve para descobrir falhas e variabilidade; não é um cálculo de poder.

Se só houver dois aparelhos, adaptar e assumir a limitação. Não comprar um terceiro telefone apenas para cumprir esse número antes de procurar empréstimo institucional. O piloto deve incluir pequenos lotes de cada cenário de falha, especialmente ACK perdido, concorrência, reordenação e primeira apresentação antiga.

Medir variabilidade entre tags, entre sessões, dentro do bloco, proporção de falhas e duração operacional. Só então fixar o experimento principal. Um candidato organizacional, caso o orçamento permita, é **18 tags × 3 aparelhos × 2 sessões × 3 tratamentos × 5 tentativas = 1.620 leituras**. As 18 tags permitem três repetições das seis ordens. Esse exemplo **não afirma poder suficiente** e não substitui dimensionamento após o piloto.

### Critérios para calcular o tamanho final

1. Escolher um ou dois desfechos primários: por exemplo, diferença na rejeição tardia legítima entre políticas e aumento de tempo operacional entre tratamentos.
2. Definir diferença mínima relevante **antes de olhar resultados principais**. Um limite deve vir do procedimento logístico, não de conveniência estatística.
3. Usar variância e dependência observadas no piloto para calcular ou simular o poder/precisão do desenho efetivo, incluindo tags, aparelhos e sessões.
4. Priorizar novas tags e sessões quando a correlação intrabloco for alta, em vez de aumentar indefinidamente taps na mesma combinação.
5. Fixar o plano e a regra de parada. Não encerrar a coleta assim que surgir um p-valor desejado.

Como referência matemática, para uma proporção binomial com observações independentes, a aproximação conservadora com 95% de confiança e margem de ±5 pontos percentuais fornece cerca de **385 observações**. Ela não é uma recomendação de fazer 385 leituras da mesma tag.

Se forem observadas zero falhas em `n` tentativas **independentes**, o limite superior unilateral exato de 95% é `1 − 0,05^(1/n)`. Com 100 tentativas, aproximadamente 2,95%; com 299, aproximadamente 1,00%. Portanto, “zero em cem” não demonstra taxa inferior a 1%, e dependência reduz ainda mais a força dessa inferência.

A expressão ilustrativa `n_efetivo ≈ n / [1 + (m − 1)ρ]` ajuda a entender agrupamento simples de tamanho `m` e correlação intraclasse `ρ`. Ela não resolve automaticamente um desenho cruzado de tags e aparelhos. Para o plano final, preservar sua estrutura em simulação ou trabalhar no nível dos blocos.

Ataques determinísticos de conformidade não precisam de um grande `n` para “provar” que a regra existe. Precisam de cobertura de casos, execuções concorrentes relevantes e evidência reproduzível. Reservar a inferência estatística para os desfechos com variabilidade e população-alvo definidas.

## 28. Modelo de ameaças revisado

**Ativos:** associação tag–cadastro, chaves, evidências capturadas, estado de utilização dos contadores, registro durável de eventos, autorização de transições e disponibilidade suficiente à conclusão dos ensaios.

**Fronteiras de confiança:** tag↔telefone, aplicativo↔armazenamento local, telefone↔API, API↔banco e cadastro digital↔objeto físico. HTTPS protege um canal; não torna verdadeiro o conteúdo produzido por um cliente autorizado e malicioso. O servidor, seu relógio operacional, o banco e o provisionamento controlado são confiáveis neste recorte.

| Perfil/capacidade adversarial | Incluído? | Ensaio/limite |
|---|---|---|
| Copiar NDEF para outra etiqueta | Sim | Cópia física, aplicativo honesto |
| Observar e guardar mensagens legítimas | Sim | Reutilização conhecida e primeira apresentação atrasada |
| Submeter UID/contexto falsos à API | Sim | Cliente de laboratório autorizado para testar o canal |
| Criar novo ID para evidência antiga | Sim | Separar idempotência e unicidade da evidência |
| Duplicar, atrasar e reordenar entregas | Sim | Falha ou adversário; ground truth determina qual |
| Disputar a mesma evidência concorrentemente | Sim | Verificar transação/constraint e efeito único |
| Transferir tag genuína intacta | Sim, demonstração delimitadora | Evidência física externa |
| Ler genuinamente e mentir sobre a operação | Sim | Mostrar limites da autenticação da tag |
| Usar privilégios de operador fora da operação permitida | Sim, regras mínimas | Identidade autenticada não implica autorização irrestrita |
| Relay no rádio | Fora da execução principal | Discutido; sem alegação de resistência ou prova de proximidade |
| Extrair chaves do chip, side channel avançado | Não | Não avaliar resistência física do fabricante |
| Comprometer servidor, administrador ou banco | Não | Histórico resistente a administrador exigiria outra arquitetura |
| Destruir/perder aparelho ou apagar todo armazenamento | Fora da garantia de preservação | Falha catastrófica declarada; não prometer recuperação sem cópia |
| Disponibilidade sob DDoS/escala de produção | Não | Limites básicos de entrada bastam ao laboratório |

Autenticação do operador deve existir e ser igual nos três tratamentos. Para estudar cliente hostil, dar ao instrumento de teste as credenciais de um operador com permissões delimitadas: assim o resultado não será apenas “a API rejeitou usuário anônimo”.

Chaves por tag reduzem o domínio de dano de uma chave individual exposta. Guardar segredos fora do dataset e do repositório; documentar onde ficam no experimento. Não é necessário construir um HSM corporativo para um adversário que explicitamente não compromete o backend. Também não se deve anunciar segurança de produção a partir dessa exclusão.

**Propriedades de aceitação do artefato:** evidência adulterada não altera estado; evento duplicado não duplica efeito; evidência usada não ganha novo efeito por novo ID; contador não autenticado não avança a proteção; cliente não redefine o esquema nem a época; eventos fora de ordem recebem classificação explícita; observações e decisões mantêm sua origem e versões.

## 29. Arquitetura mínima recomendada

**Um aplicativo Android, uma API NestJS e um PostgreSQL.** O provisionamento pode ser uma função administrativa separada da interface operacional, sem virar um serviço distribuído. Python fica na análise posterior. Essa arquitetura é suficiente para o volume experimental previsto.

### Componentes e responsabilidades

| Componente | Responsabilidade mínima |
|---|---|
| Leitor Android | Obter evidência, registrar metadados técnicos e informar sucesso/falha de captura |
| Persistência Room | Salvar evento e item de saída na mesma transação; manter estado de confirmação |
| Sincronizador | Reenviar o mesmo evento, com o mesmo conteúdo; interpretar resposta por item |
| API | Autenticar operador/dispositivo, validar entrada, receber eventos e consultar decisões |
| Verificador | Interpretar evidência conforme cadastro, verificar mecanismo e produzir classificação |
| Processador transacional | Aplicar idempotência, uso único de evidência e transição autorizada |
| Histórico/exportação | Preservar observações e decisões; exportar conjunto experimental com dicionário |
| Provisionador | Controlar chaves, configuração, vínculo inicial, revogação e época confiável |

Evitar um status único como `VALID`. Guardar dimensões separadas: recepção durável; evidência bem formada; resultado criptográfico; uso anterior/atraso; autorização; dependência logística; efeito aplicado; confirmação ao cliente. Uma mensagem pode ser criptograficamente válida e, ainda assim, não autorizar uma movimentação.

### Envelope conceitual do evento — sem código de implementação

| Campo/grupo | Origem e regra |
|---|---|
| `eventId`, `schemaVersion` | Identidade estável da captura e versão do contrato |
| `deviceId`, sessão/credencial do operador | Autenticados pelo canal de aplicação; não confiar apenas nos valores no corpo |
| `packageRef`, `tagRef`, `schemeHint` | Alegações para localizar contexto; backend confirma associação e mecanismo esperado |
| Evidência NFC bruta | Bytes em representação reversível; conservar exatamente o necessário à verificação |
| UID observado e tecnologia | Metadados do leitor; evidência forte somente se protegida pelo protocolo correspondente |
| Tipo de operação e referência ao predecessor/versão esperada | Contexto de negócio sujeito a autorização e causalidade |
| Horário local e tempo monotônico local | Diagnóstico; não ordenar globalmente aparelhos pelo relógio do cliente |
| Horário de recebimento e versão da política | Acrescentados pelo servidor |
| Configuração/época resolvida | Provenientes do registro de provisionamento, sem reset comandado pelo cliente |
| Classificações e motivo da decisão | Resultado estruturado, preservado para auditoria e análise |

O MAC SDM deve ser verificado sobre os bytes e regras corretos do perfil, **não sobre uma reconstrução arbitrária de uma URL já normalizada**. URL decoding, maiúsculas em hexadecimal, offsets e serialização são pontos de integração a cobrir por vetores conhecidos. Para identificar o conteúdo de uma solicitação, definir uma representação estável; RFC 8785 é uma opção caso se escolha canonicalizar JSON. Isso não muda a cobertura criptográfica original da tag. [2], [25]

### Persistência e processamento

Tabelas conceituais suficientes: cadastro de encomendas; tags/épocas/configurações; operadores/dispositivos; eventos recebidos; reivindicações de evidência; decisões/transições; execuções experimentais. O histórico de execução é metadado de pesquisa, sem autoridade para reinicializar a segurança.

O processamento recomendado é:

1. Autenticar a chamada, limitar tamanho e validar estrutura. Registrar duravelmente a recepção relevante ao ensaio.
2. Consultar a identidade idempotente: mesmo evento e mesmo conteúdo retornam a decisão anterior; conteúdo divergente gera conflito.
3. Resolver tag, vínculo e esquema pelo cadastro. Não permitir downgrade por campo do cliente.
4. Verificar a evidência. Dados não autenticados não atualizam contador ou conjunto de valores usados.
5. Na transação que controla a decisão, disputar a identidade única da evidência, aplicar política de atraso, autorização e dependências, e persistir decisão/efeito.
6. Confirmar ao cliente somente o estado durável. Se a confirmação se perder, uma tentativa posterior recupera esse resultado.

A reivindicação de evidência SDM deve ter unicidade no domínio **tag + época confiável + contador**, conforme o perfil escolhido. A identidade idempotente pode usar **dispositivo cadastrado + eventId**, com comparação de conteúdo. Constraints e transações devem arbitrar solicitações concorrentes; “consultar e depois inserir” sem proteção não basta. PostgreSQL oferece restrições de unicidade como parte desse mecanismo. [37]

Uma evidência válida apresentada num evento posteriormente rejeitado não deve ficar livre para ser silenciosamente reutilizada com novo contexto. Recomenda-se manter sua primeira reivindicação vinculada ao evento. Correções exigem um procedimento explícito de decisão posterior ou evento substituto referenciado; para simplificar o TCC, usar casos roteirizados sem edição informal de eventos já capturados.

A API precisa apenas de operações de recebimento individual ou em lote, consulta de decisões/histórico e cadastro/provisionamento restrito. Em lote, retornar resultado por evento; uma falha não pode levar o aplicativo a marcar todo o lote como concluído.

### Integridade do registro: qual garantia será entregue?

No núcleo: histórico durável, acesso controlado, registro de decisões sem sobrescrita silenciosa e efeitos transacionais. Uma cadeia de hashes local, sem referência externa confiável, não impede que quem controla todo o armazenamento reescreva a cadeia. Logs assinados/encadeados são uma literatura própria; usá-la para delimitar a garantia, não para prometer resistência a um administrador excluído do modelo. [24], [42]

Assinatura do envelope pelo dispositivo é **opcional**. Se incluída, fixar a mesma proteção nos três tratamentos e explicar que ela detecta alterações após a assinatura sob o modelo de chave, mas não torna verdadeiro o evento criado por um operador/aplicativo hostil. Sem essa proteção, retirar a alegação de integridade contra adulteração do armazenamento local antes do envio. Essa escolha precisa aparecer no título/objetivo apenas se tal garantia for central.

## 30. Hardware necessário

### Escolha dos componentes

| Componente | Propriedades relevantes | Decisão |
|---|---|---|
| NTAG213/215/216 | Type 2; memórias de usuário de 144/504/888 bytes, respectivamente; identificadores e recursos de acesso não equivalem a SDM [7] | Pequeno lote opcional para demonstração de cópia. NTAG216 não é necessária para uma referência curta |
| NTAG 424 DNA | Type 4, mecanismo dinâmico e chaves/configurações próprias [1], [2] | SKU principal, mesma antena/lote nos tratamentos |
| NTAG 424 DNA TagTamper | Variante com circuito de tamper [28] | Adiar; não comprar para justificar o núcleo digital |
| Smartphones Android com NFC | Comunicação ISO-DEP pelo caminho de leitura escolhido [4] | Um no gate; buscar 2–3 aparelhos físicos emprestados para o estudo |
| Computador disponível | Backend, banco, coleta e análise | Reutilizar; não há necessidade demonstrada de servidor especial |
| Embalagens e suporte de posicionamento | Controle do ensaio e identificação física externa | Caixas pequenas, etiquetas visuais, fita, régua e suporte simples |

**É possível provisionar com smartphone? Sim, em princípio, com Android compatível, tags configuráveis, chaves corretas e software que implemente os comandos exigidos.** A API `IsoDep.transceive` fornece o transporte; a configuração segura não é oferecida automaticamente por toda aplicação genérica de gravação NDEF. Essa é uma conclusão de viabilidade baseada nas interfaces, sujeita ao gate nos aparelhos reais. [4]

Não há requisito intrínseco de comprar ACR122U, PN532, Proxmark, leitor Identiv ou SAM para o caminho proposto. Um leitor USB pode facilitar o diagnóstico em computador, mas não substitui o provisionador. Se o Android bloquear o progresso por um problema de transporte reproduzível, o **ACR1252U** é um candidato de contingência: o fabricante documenta suporte à família ISO 14443 e interfaces de desenvolvimento. A compatibilidade do fluxo SDM completo ainda deve ser testada. [43]

PN532 introduz integração adicional; Proxmark faz sentido para outra profundidade de análise RF. Ambos ficam fora da compra inicial. SDKs e ferramentas comerciais podem reduzir trabalho, mas avaliar suporte ao SKU, configuração exportável, acesso às chaves, versão e licença antes de torná-los dependência. Não depender de uma verificação comercial opaca para produzir a principal variável de segurança do estudo.

### Preços observados em 9 de setembro de 2026

Valores de catálogo em moeda original, **sem somar frete, tributos, câmbio, montagem ou provisionamento**. Não são cotações finais de entrega no Brasil. Os produtos diferem em formato/antena, portanto a tabela é para orçamento, não para declarar igualdade RF.

| Fonte/produto | Preço observado | Uso e ressalva |
|---|---:|---|
| GoToTags, inlay NTAG424 DNA 25 mm, SKU 34EJ25CNVM | **US$ 0,90/un. em 10**; US$ 0,77 em 100; US$ 0,68 em 1.000 | Pedido mínimo 10; alternativa de lote inicial [33] |
| Shop NFC, adesivo NTAG424 DNA ø22 mm | **€ 0,92/un.**, pedido mínimo 10 | Confirmar configuração/chaves e entrega antes de comprar [31] |
| GoToTags, token NTAG215 25 mm no catálogo | **US$ 0,35/un.** anunciado | Formato diferente; preço por volume pode variar [34] |
| GoToTags, inlay NTAG213 no catálogo | **US$ 0,40/un.** anunciado | Referência de tag simples; confirmar SKU/quantidade no orçamento [34] |
| GoToTags, variantes NTAG424 DNA TT | Preço utilizável **não confirmado** | Listagem com US$ 0,00 não significa produto gratuito; solicitar cotação [35] |
| Shop NFC, ACR1252U | **€ 48,30** promocional observado | Opcional; não comprar antes do gate [36] |
| Shop NFC, Identiv uTrust 3700 F | **€ 44,96** promocional observado | Referência de preço, sem validação de provisionamento neste relatório [36] |
| NTAG216, embalagens e frete Brasil | Cotação comparável não obtida | Não preencher com estimativa inventada |

Dois cenários aritméticos, não orçamentos completos: **10 tags NTAG424 do primeiro fornecedor = US$ 9,00** de material; **20 = US$ 18,00** se mantido o preço unitário da faixa inicial. No segundo fornecedor, 10 × € 0,92 = **€ 9,20**. A diferença não deve orientar a compra sem frete, prazo e condições de provisionamento.

Comprar inicialmente **10 unidades** se esse for o mínimo do fornecedor; reservar algumas para erro de configuração e exemplares de referência. Ampliar após o gate e dimensionamento. Para o desenho candidato com 18 tags, 20 unidades dão uma reserva modesta; não interpretar isso como tamanho amostral já aprovado.

GoToTags, Shop NFC e Seritag são **canais comerciais identificados com documentação de produto**, não fornecedores cuja cadeia de autenticidade foi auditada presencialmente. Exigir SKU/chip, capacidade de reconfiguração, situação das chaves, lote e comprovante. Verificação de originalidade do chip pode auxiliar o recebimento; não substitui autenticação dinâmica nem prova do vínculo com a encomenda. Rejeitar anúncios vagos de “NTAG compatível” como equivalência garantida ao componente seguro.

## 31. Gate técnico inicial

O gate deve acontecer **antes do aplicativo completo**. Sua saída é uma decisão documentada de viabilidade, não uma tela demonstrativa. Timebox proposto: 5–10 dias úteis de trabalho técnico após chegada do material, ajustado com o orientador e sem consumir o período reservado à coleta.

| Etapa | Evidência exigida para passar |
|---|---|
| Receber e identificar | SKU, fornecedor, lote, tecnologia observada e condições das chaves registradas |
| Conectar pelo Android | Troca de comandos necessária repetida sem depender de leitura em navegador |
| Ler/escrever arquivo apropriado | NDEF recuperado corretamente; configuração persistente confirmada |
| Habilitar perfil SDM | Manifesto de configuração, permissões, campos e offsets documentado |
| Provisionar chaves de teste | Chaves padrão substituídas no exemplar de ensaio; procedimento de recuperação conhecido |
| Validar vetores conhecidos | Verificação independente consistente com exemplos oficiais |
| Obter duas mensagens em sessões distintas | Campos dinâmicos interpretados; relação leitura/contador documentada |
| Testar cache e comandos | Distinguir releitura do mesmo conteúdo, nova sessão RF e geração de nova evidência |
| Verificar mensagem física no backend | Resultado reproduzível com a configuração exata, não apenas num portal comercial |
| Alterar um byte e usar chave errada | Falha corretamente detectada, sem mutar estado anti-replay |
| Reenviar mesma evidência | Mesmo ID retorna decisão anterior; novo ID não cria novo efeito |
| Inverter ordem de duas evidências | P1 e política de observação tardia produzem classificações documentadas |
| Apresentar evidência inédita antiga | Limite de freshness demonstrado e explicado |
| Reiniciar app/servidor | Estado relevante persiste e resultado se mantém |
| Reprovisionar uma tag controladamente | Nova época/chave não permite ao cliente reabrir o histórico antigo |

O documento de saída contém versão do app de teste, modelo/Android, bytes de teste sanitizados, configuração, resultados esperados/observados e falhas. Usar chaves deliberadamente públicas apenas no material de reprodução; separar tags e chaves operacionais.

**Gate aprovado:** qualquer integrante consegue repetir o fluxo em uma tag de reserva usando a documentação. **Gate reprovado:** a equipe só consegue abrir uma URL pronta, não controla chaves/configuração, não explica o MAC/contador, ou não reproduz a verificação fora de um serviço opaco. Registrar a causa e acionar o plano B; não construir todo o sistema apostando que o SDM será resolvido no final.

## 32. Planos B e C

| Plano | Quando acionar | O que preserva | Mudança necessária |
|---|---|---|---|
| **A — NTAG424 provisionada pela equipe** | Gate aprovado | Comparação física dos três tratamentos e políticas offline | Recorte recomendado neste relatório |
| **B — NTAG424 pré-provisionada de forma auditável** | Falha localizada no provisionamento, com leitura/verificação dominadas | Hardware real, evidências SDM e backend próprio | Fornecedor deve entregar perfil, autoridade sobre chaves e condições de reconfiguração; registrar custo/dependência |
| **B alternativo — autenticação interativa suportada** | Freshness de sessão se torna requisito central | Avaliação real de autenticação | Mudar protocolo e, possivelmente, hardware; reduzir captura offline e refazer pergunta/comparação. Não chamar de mesmo experimento SDM |
| **C1 — identificação estática/UID e confiabilidade de eventos** | Tags seguras indisponíveis no prazo | Experimento físico e investigação de falhas/reconciliação | Retirar alegação de avaliação física de autenticação dinâmica; reformular título/objetivo com o orientador |
| **C2 — políticas de processamento com traces e simulação declarada** | Protocolo físico não pode ser viabilizado | Estudo de software sobre replay, idempotência e reordenação | Não reportar sucesso RF, desempenho de chip ou resistência física; contribuição passa a ser de processamento de eventos |

Preferir **B auditável** antes de trocar de família de tag. Uma plataforma que devolve apenas “autêntico” sem permitir inspecionar entradas, configuração e regra de validação prejudica a pesquisa; sua existência pode ser discutida na revisão industrial, mas não deve mascarar a ausência do mecanismo experimental.

Simulação é aceitável se for a pergunta assumida. É inaceitável apresentar uma mensagem SDM fabricada em software como se tivesse sido medida numa etiqueta real. Se C for necessário, a mudança de escopo deve ocorrer cedo e ficar explícita na redação.

## 33. O que deve ser removido do escopo

Remover do núcleo: blockchain, IA/RF fingerprinting, microserviços, broker de mensagens, integração com transportadoras, portal comercial completo, múltiplos sistemas operacionais, geolocalização como prova, certificação de custódia, resistência a extração física de chaves, implementação de relay e avaliação completa de lacres.

Adiar atestação de dispositivo, rotação corporativa de chaves, HSM/SAM, protocolo assimétrico e confirmação bilateral de custódia. Assinatura do envelope só permanece se houver uma propriedade central que a exija e tempo para avaliá-la corretamente.

**A conectividade intermitente não precisa virar um segundo TCC** se limitada a persistência, retransmissão e políticas de decisão sobre poucos tipos de evento. Vira um segundo projeto quando inclui consenso distribuído, operação de negócios arbitrária entre vários agentes desconectados e resolução automática de toda disputa de custódia.

Os lacres estão parcialmente desconectados do experimento digital proposto. A demonstração de transferência delimita a garantia; desenvolver e validar um lacre novo muda substancialmente a pesquisa. Não preencher a fundamentação com páginas de sensores que não participam de nenhuma questão ou medida.

Também remover a meta de “implementar quinze artefatos” como se fossem quinze aplicações. Baselines, verificador e suporte offline são funcionalidades do mesmo artefato; modelo de ameaça, protocolo e dataset são seus produtos científicos.

## 34. O que pode fortalecer o TCC

O maior ganho vem de **tornar cada decisão auditável**: qual evidência foi recebida, qual propriedade ela sustenta, qual regra autorizou a operação e qual ground truth permite julgar a decisão.

O pacote final pode ser organizado em oito entregáveis:

1. Aplicativo Android com os três tratamentos, captura durável e indicação correta de pendência.
2. Backend e esquema de banco, com decisões transacionais e histórico.
3. Procedimento/ferramenta de provisionamento, manifestos de configuração e vetores públicos de teste.
4. Protocolo experimental congelado, modelo de ameaça e plano de análise.
5. Dataset bruto sanitizado, dicionário, ground truth e rastreio de falhas/exclusões.
6. Análise reproduzível com estimativas, intervalos, figuras e versões das dependências.
7. Documentação de reprodução e limitações, incluindo uma execução por outro integrante.
8. Texto do TCC e matriz de decisão derivada das evidências.

Uma ablação pequena pode fortalecer a atribuição causal: mesmos dados e regras comuns, alterando apenas o verificador ou a política de contador. Ela ajuda a distinguir rejeição por autenticação, idempotência e estado logístico. Não precisa virar uma quarta solução de produção.

### Matriz de decisão a preencher depois dos resultados

| Cenário/requisito | NDEF estático | UID | SDM | Evidência que deve decidir |
|---|---|---|---|---|
| Baixo risco, identificação suficiente | A medir | A medir | A medir | Custo e sucesso operacional; necessidade real de autenticação |
| Cópia física com leitor honesto | A testar | A testar | A testar | Sucesso por cenário e limitações de hardware |
| Cliente que falsifica alegações | A testar | A testar | A testar | Operações indevidamente autorizadas, por camada |
| Reutilização de evidência conhecida | A testar | A testar | A testar por política | Separar controle comum e mecanismo da tag |
| Primeira apresentação antiga | A testar | A testar | A testar | Critério de freshness e fontes de confiança disponíveis |
| Captura offline e reordenação | A medir | A medir | A medir por política | Preservação, rejeições tardias, conflitos e reconciliação |
| Baixo custo total | A calcular | A calcular | A calcular | Material, provisionamento, tempo e retrabalho |
| Vínculo físico com embalagem | Limitação a demonstrar | Limitação a demonstrar | Limitação a demonstrar | Observação externa de transferência; controle físico adicional |

Não usar uma linha “alta segurança” sem decompor as ameaças. Não dar uma nota geral somando custo e segurança com pesos escolhidos após conhecer o vencedor. Se for necessária pontuação multicritério, definir requisitos mínimos e pesos com o cenário/usuários antes da análise.

## 35. Reformulação sugerida da contribuição científica

**Contribuição principal proposta:** evidência experimental reproduzível sobre os limites e os custos de identificar/autenticar observações NFC e processá-las sob entrega atrasada, reutilização e reordenação, com separação entre validação criptográfica e autorização de eventos logísticos.

Contribuições secundárias: um corpus de evidências e traces com ground truth; comparação de políticas de processamento; demonstração dos limites do vínculo físico; e um artefato de referência que permita reproduzir os resultados. Uma arquitetura conhecida, implementada corretamente, é suporte à contribuição empírica.

Essa formulação continua defensável se os mecanismos se comportarem como previsto. O valor poderá estar em quantificar rejeições legítimas, descobrir erros de integração ou mostrar que determinado requisito não pode ser satisfeito sob as informações disponíveis. Não é preciso que SDM “vença tudo”.

**Alegações a evitar:** primeiro sistema NFC de rastreabilidade; novo algoritmo de autenticação; solução definitiva contra clonagem; garantia de presença física; prova de conteúdo intacto; entrega exatamente uma vez; e superioridade geral para toda logística. Nenhuma dessas afirmações está sustentada pela proposta ou pela revisão disponível.

Se a leitura integral dos trabalhos centrais revelar o mesmo desenho, assumir **replicação e extensão contextual** é melhor do que reformular palavras para fabricar uma lacuna. A extensão deve indicar o que muda: política, adversário, regime de falha, plataforma ou medida — e por que essa diferença importa.

## 36. Se tema/título/pergunta/objetivo precisam mudar

**Tema: ajuste terminológico e de foco. Título: alteração recomendada. Pergunta e objetivo: redução necessária.** As formulações seguintes são propostas de revisão; não substituem silenciosamente as versões oficiais.

| Elemento | Diagnóstico do atual | Formulação sugerida |
|---|---|---|
| Tema | Reúne as dimensões corretas, mas “autenticidade de leituras” e “integridade de eventos” podem sugerir garantias indivisas | **Identificação e autenticação de evidências NFC no registro de eventos logísticos sob conectividade intermitente** |
| Título | “Desenvolvimento de um Sistema…” enfatiza construção e esconde a comparação central | **Avaliação experimental de identificação e autenticação NFC no registro de eventos logísticos sob conectividade intermitente** |
| Pergunta principal | “Como desenvolver e validar…” abrange segurança, desempenho, confiabilidade e logística simultaneamente | **Como mecanismos de identificação e autenticação NFC e políticas de processamento de evidências afetam a aceitação indevida e a preservação de eventos logísticos sob reutilização, atraso e reordenação?** |
| Objetivo geral | “Autenticar sua identificação” é impreciso; o objetivo mistura construção e muitas garantias | **Desenvolver um artefato experimental e avaliar NDEF estático, associação por UID e evidências SDM quanto à aceitação indevida, preservação de eventos e custo operacional, sob ameaças e regimes de conectividade explicitamente delimitados.** |

Caso o título administrativo precise manter “Desenvolvimento”, a alternativa é: **Desenvolvimento e avaliação experimental de um sistema NFC para registro de eventos logísticos sob conectividade intermitente**. A contribuição científica ainda deve aparecer nas questões e no método.

Objetivos específicos: estabelecer o modelo de ameaça e as propriedades; configurar os tratamentos comparáveis; implementar captura e processamento mínimo; executar piloto e dimensionar; realizar os contrastes pré-definidos; analisar resultados e limites em relação à literatura; disponibilizar documentação e dados reproduzíveis.

Palavras-chave sugeridas: NFC; autenticação de etiquetas; rastreabilidade logística; replay; conectividade intermitente; avaliação experimental. NDEF, UID e SDM podem constar conforme o limite de palavras-chave da instituição.

### Revisão do pré-sumário

O pré-sumário atual tem boa cobertura, mas fragmenta a fundamentação e repete os mecanismos na teoria, desenvolvimento e resultados. A versão abaixo mantém seis capítulos e liga a discussão às questões de pesquisa:

| Capítulo | Estrutura sugerida |
|---|---|
| **1. Introdução** | Contexto e cenário; problema; lacuna candidata; justificativa; pergunta; objetivos; escopo |
| **2. Fundamentação e trabalhos relacionados** | NFC/formatos/tags; identificação e autenticação; ameaças e vínculo físico; registros sob desconexão; comparação crítica da literatura |
| **3. Método de pesquisa e protocolo experimental** | Questões e hipóteses operacionais; modelo de ameaça; tratamentos; unidades/fatores; cenários; ground truth; métricas; piloto/amostragem; análise; ameaças à validade |
| **4. Artefato experimental** | Arquitetura e fronteiras; provisionamento; captura; verificadores; persistência e políticas; instrumentação; versões e reprodução |
| **5. Resultados e discussão** | Qualidade/completude dos dados; RQ1 por ameaça; RQ2 por política; desempenho secundário; atribuição aos controles; comparação com literatura; limitações; matriz de decisão |
| **6. Conclusão** | Respostas às questões; contribuição efetiva; condições de aplicação; limitações remanescentes; extensões justificadas |

Evitar uma seção de resultados para cada tratamento seguida de outra “comparação” que repete todos os números. Apresentar os tratamentos lado a lado por questão. Detalhes longos de comandos, configuração e dicionário de dados vão para apêndices. Relay e sensores merecem apenas o espaço necessário para explicar exclusões e limites.

## 37. Roadmap detalhado das próximas etapas

A sequência deve antecipar o risco de hardware e reservar coleta/análise antes de expandir interface. Revisão bibliográfica e obtenção do material podem avançar em paralelo; o protocolo final depende do piloto.

| Etapa | Trabalho e produto verificável | Critério de saída/dependência |
|---|---|---|
| 1. Fechar recorte | Uma página com RQ, propriedades, exclusões e cenário logístico | Concordância acadêmica com o que será medido |
| 2. Fazer leitura de risco | NXP/Android e artigos que ameaçam a lacuna; completar matriz dos mais próximos | Nenhuma alegação central apoiada apenas no título de um paper |
| 3. Obter material | Pequeno lote configurável e aparelhos emprestados | Identidade do chip e condições de chaves documentadas |
| 4. Executar gate | Fluxo mínimo da seção 31 | A/B/C decidido dentro do timebox |
| 5. Especificar decisões e protocolo provisório | Invariantes, estados, cenários, dados e ground truth | Cada hipótese ligada a um desfecho e um procedimento |
| 6. Construir uma fatia completa | Uma captura, persistência, envio, decisão durável e retorno | Caminho completo com perda de ACK sem efeito duplicado |
| 7. Completar tratamentos e políticas | Baselines, SDM, uso de evidência, dependências e instrumentação | Vetores corretos e classificação por camada |
| 8. Validar falhas críticas | Concorrência, reordenação, reinício e evidência inédita antiga | Invariantes satisfeitos ou limitações formalmente incorporadas |
| 9. Executar piloto | Amostra exploratória e duração/variância por bloco | Dados suficientes para escolher desenho viável |
| 10. Dimensionar e congelar | Fatores, amostra, exclusões, contrastes, timeouts e critérios de parada | Protocolo versionado; versões e configurações fixadas |
| 11. Fazer coleta oficial | Ordem balanceada, registro de falhas e checagem de completude | Sem alterações silenciosas; desvios documentados |
| 12. Analisar | Estimativas, intervalos, gráficos e sensibilidade aos blocos | Nenhuma contagem de taps apresentada como independência inexistente |
| 13. Discutir e decidir | Respostas às RQ, contraste com literatura e matriz de decisão | Separação de propriedade esperada, resultado medido e limite |
| 14. Reproduzir e redigir entrega | Segundo integrante repete um bloco a partir da documentação | Artefatos, texto, dados e resultados consistentes |

Redigir introdução provisória, literatura e método durante as etapas; não deixar toda a escrita para depois da análise. Reservar, como planejamento inicial, cerca de **um terço do tempo remanescente** para coleta, análise, discussão e correções. Essa proporção é uma recomendação de gestão, não estimativa da duração real do projeto.

Se houver defeito material durante a coleta, pausar, registrar a versão e decidir se os blocos afetados devem ser refeitos. Não misturar resultados de políticas diferentes sob o mesmo rótulo. Congelamento significa rastreabilidade de mudanças, não proibição de corrigir um erro conhecido.

## 38. Lista priorizada do que devemos ler primeiro

| Ordem | Leitura | Decisão que precisa habilitar |
|---:|---|---|
| 1 | NXP NT4H2421Gx §9.3 e AN12196, trechos de configuração/exemplos [1], [2] | Qual evidência será gerada e quais limites o verificador terá |
| 2 | Android `Tag`/`IsoDep` e arquitetura offline [3], [4], [6] | Caminho real de captura/provisionamento e significado de pendência |
| 3 | Alzahrani e Bulusu, 2016, §§IV–VI [10] | Por que contador/offline não resolvem transferência física |
| 4 | EVO-NFC e Block-Supply Chain, integrais a obter [16], [11] | Se a lacuna operacional já foi coberta e em que condições |
| 5 | Yiu 2021 e Subramaniam et al. 2025 [12], [13] | O que já existe como sistema e que avaliação realmente sustenta as alegações |
| 6 | NFCGate e Lehtonen/Staake/Michahelles [17], [18] | Separação entre ameaças do canal, identidade e autenticação do produto |
| 7 | Wohlin 2024, planejamento/análise; Brown et al. 2001 [8], [22] | Unidades, dependência, intervalos e dimensionamento |
| 8 | Petersen 2015 e Wohlin 2014 [19], [20] | Protocolo de mapeamento e snowballing reproduzível |
| 9 | DDIA, capítulos pertinentes; RFC 4303; PostgreSQL [38], [23], [37] | Reordenação, transações e propriedade de efeito único |
| 10 | NIST CMAC e AN10922 conforme a escolha de chaves [9], [29] | Verificação da primitiva e administração do material de teste |
| 11 | Falcone 2021 e Oláh 2026 [15], [14] | Alternativas recentes e limites do ineditismo |
| 12 | Johnston e ficha TagTamper [41], [28] | Somente se um experimento físico de lacre permanecer |

Distribuição prática: um integrante começa por mecanismo/provisionamento; o outro por revisão/método e decisões do backend. Ambos leem as fontes 1–3 e revisam o trabalho do colega. O experimento não deve depender de apenas uma pessoa entender as chaves ou o significado de uma aceitação.

## 39. Perguntas que ainda precisamos responder antes de começar o desenvolvimento

Estas perguntas são decisões de projeto para a reunião técnica; **não impedem iniciar as leituras e o gate mínimo** já delineados.

| Pergunta | Default recomendado / quem precisa decidir |
|---|---|
| Qual posto logístico estamos representando? | Conferência unitária interna; equipe deve validar a pertinência com o orientador ou observação do processo |
| Qual propriedade é primária: origem da evidência, freshness ou custódia física? | Origem e processamento de evidências; restringir as demais |
| Cliente hostil está realmente incluído? | Sim, com credenciais delimitadas e contexto adulterável |
| A captura offline será apenas pendente? | Sim; autenticação posterior no servidor |
| Evidência tardia válida pode autorizar imediatamente uma operação? | Não por padrão; separar observação e transição |
| Quais políticas serão contrastadas? | Maior contador versus registro tardio com controle de uso e decisão de negócio |
| Quem cria/revoga vínculo e época de provisionamento? | Administração do experimento, fora da autoridade do cliente operacional |
| Haverá assinatura do dispositivo? | Omitir no núcleo, salvo exigência de integridade local contra adulteração; declarar o limite |
| Quais aparelhos e quantas tags existem de fato? | Inventário antes de fixar amostra; empréstimo antes de compra de celulares |
| As tags permitem configuração e controle das chaves? | Confirmar antes da compra e comprovar no gate |
| Qual atraso é operacionalmente aceitável? | Definir com o cenário; não inventar janela de segurança por conveniência |
| Qual diferença de tempo/taxa justificaria adoção? | Limite mínimo relevante pré-definido para dimensionamento |
| Como será produzido o ground truth? | Roteiro externo, IDs físicos e registro independente da decisão do sistema |
| Quais falhas estão cobertas pela promessa de preservação? | Dados locais preservados, tentativas permitidas e reconexão eventual; excluir destruição/limpeza |
| Qual o prazo final e a data de decisão A/B/C? | Orientador/equipe; proteger tempo de coleta e análise |
| Os integrais dos papers mais próximos estão disponíveis? | Resolver antes de afirmar novidade; registrar acesso parcial até lá |

## 40. Veredito final

**MANTER COM AJUSTES.** O projeto tem um artefato plausível, ameaças relevantes e um caminho experimental viável. O que ainda não tem é uma lacuna inédita demonstrada, hardware configurado ou resultados que sustentem a abrangência das garantias atuais.

A condição para seguir é deslocar o centro de “um sistema seguro de rastreabilidade” para **uma avaliação de evidências e decisões sob hipóteses explícitas**. A pergunta mais interessante envolve o que acontece quando o servidor precisa lidar com uma leitura legítima atrasada e uma evidência antiga ainda não utilizada. Não se deve prometer que essas situações são sempre distinguíveis.

Manter Android, backend único, PostgreSQL, os três tratamentos e captura offline com verificação posterior. Antecipar o gate; controlar hardware; separar propriedades; reduzir lacres e custódia; dimensionar a partir do piloto; e reportar resultados por ameaça e política. Se não houver controle do SDM, acionar B/C cedo e alterar as alegações correspondentes.

O parecer mudaria para **reformular significativamente** se fosse obrigatório provar presença recente ou inviolabilidade física com a evidência atual. Não há motivo suficiente para abandonar NFC como instrumento experimental, mas há motivo suficiente para abandonar a ideia de que NFC, UID ou um MAC válido certificam sozinhos a movimentação e o conteúdo de uma encomenda.

### Fontes e referências

As referências abaixo identificam as fontes dos números usados no texto. Autores completos, metadados complementares e nível de acesso dos artigos constam nas seções 10–14. Fontes técnicas e comerciais de atualização contínua foram consultadas em 09/09/2026. A indicação de acesso parcial é mantida onde o texto integral não pôde ser examinado.

1. NXP Semiconductors. [NTAG 424 DNA – Secure NFC T4T compliant IC, NT4H2421Gx](https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf). Rev. 3.0, 31/01/2019; especialmente §9.3.
2. NXP Semiconductors. [NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints, AN12196](https://www.nxp.com/docs/en/application-note/AN12196.pdf). Rev. 2.0, 04/03/2025.
3. Android Developers. [Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first). Documentação de arquitetura.
4. Android Developers. [IsoDep](https://developer.android.com/reference/android/nfc/tech/IsoDep). Referência da API NFC.
5. NFC Forum. [Specifications](https://nfc-forum.org/build/specifications/). Catálogo oficial; versões específicas pendentes quando indicado.
6. Android Developers. [Tag](https://developer.android.com/reference/android/nfc/Tag). Referência da API, incluindo getId.
7. NXP Semiconductors. [NTAG213/215/216 – NFC Forum Type 2 Tag compliant IC](https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf). Ficha técnica.
8. Wohlin, C.; Runeson, P.; Höst, M.; Ohlsson, M. C.; Regnell, B.; Wesslén, A.. [Experimentation in Software Engineering](https://link.springer.com/book/10.1007/978-3-662-69306-3). Springer, 2024; DOI 10.1007/978-3-662-69306-3.
9. Dworkin, M. J.; NIST. [Recommendation for Block Cipher Modes of Operation: The CMAC Mode for Authentication](https://csrc.nist.gov/pubs/sp/800/38/b/upd1/final). SP 800-38B, 2005, atualização 2016; DOI 10.6028/NIST.SP.800-38B.
10. Alzahrani, N.; Bulusu, N.. [Securing Pharmaceutical and High-Value Products against Tag Reapplication Attacks Using NFC Tags](https://web.cecs.pdx.edu/~nbulusu/papers/smartcomp16.pdf). IEEE SMARTCOMP, 2016; DOI 10.1109/SMARTCOMP.2016.7501715; integral dos autores.
11. Alzahrani, N.; Bulusu, N.. [Block-Supply Chain: A New Anti-Counterfeiting Supply Chain Using NFC and Blockchain](https://doi.org/10.1145/3211933.3211939). CryBlock, ACM, 2018; metadados, integral pendente.
12. Yiu, N. C. K.. [Decentralizing Supply Chain Anti-Counterfeiting and Traceability Systems Using Blockchain Technology](https://www.mdpi.com/1999-5903/13/4/84). Future Internet, 13(4), 84, 2021; DOI 10.3390/fi13040084.
13. Subramaniam, R.; Azzuhri, S. R.; Wah, T. Y.; Mahmood, A.; Balakrishnan, V.. [A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain Technologies](https://www.techscience.com/cmc/v83n3/60992). Computers, Materials & Continua, 83(3), 4257–4280, 2025; DOI 10.32604/cmc.2025.061560.
14. Oláh, N.; Girászi, T.; Vajda, M.; Huszti, A.. [NFC-PUF Three-Pass Authentication for Supply Blockchains](https://link.springer.com/chapter/10.1007/978-3-032-22208-4_12). CCIS 2937, 171–192, 2026; resumo/metadados, integral pendente.
15. Falcone, A.; Felicetti, C.; Garro, A.; Rullo, A.; Saccà, D.. [PUF-based Smart Tags for Supply Chain Management](https://www.progetto-demetra.it/wp-content/uploads/2022/10/ARES_2021_DIMES.pdf). ARES, 2021; DOI 10.1145/3465481.3469195; cópia no projeto.
16. Conti, M.. [EVO-NFC: Extra Virgin Olive Oil Traceability Using NFC Suitable for Small-Medium Farms](https://doi.org/10.1109/ACCESS.2022.3151795). IEEE Access, 10, 20345–20356, 2022; metadados, integral pendente.
17. Klee, S.; Roussos, A.; Maass, M.; Hollick, M.. [NFCGate: Opening the Door for NFC Security Research with a Smartphone-Based Toolkit](https://arxiv.org/abs/2008.03913). USENIX WOOT, 2020; depósito arXiv:2008.03913.
18. Lehtonen, M.; Staake, T.; Michahelles, F.. [From Identification to Authentication – A Review of RFID Product Authentication Techniques](https://doi.org/10.1007/978-3-540-71641-9_9). Springer, 2008; capítulo de revisão.
19. Petersen, K.; Vakkalanka, S.; Kuzniarz, L.. [Guidelines for conducting systematic mapping studies in software engineering: An update](https://doi.org/10.1016/j.infsof.2015.03.007). Information and Software Technology, 64, 1–18, 2015.
20. Wohlin, C.. [Guidelines for snowballing in systematic literature studies and a replication in software engineering](https://www.wohlin.eu/ease14.pdf). EASE, 2014; DOI 10.1145/2601248.2601268; integral do autor.
21. PRISMA Statement. [PRISMA 2020](https://www.prisma-statement.org/prisma-2020). Orientação para relato do fluxo de revisão.
22. Brown, L. D.; Cai, T. T.; DasGupta, A.. [Interval Estimation for a Binomial Proportion](https://doi.org/10.1214/ss/1009213286). Statistical Science, 2001.
23. Kent, S.. [IP Encapsulating Security Payload (ESP)](https://www.rfc-editor.org/rfc/rfc4303). RFC 4303, 2005; §3.4.3 e apêndice A.
24. Kelsey, J.; Callas, J.; Clemm, A.. [Signed Syslog Messages](https://www.rfc-editor.org/rfc/rfc5848). RFC 5848, 2010.
25. Rundgren, A.; Jordan, B.; Erdtman, S.. [JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785). RFC 8785, 2020.
26. Android Developers. [Android Keystore system](https://developer.android.com/privacy-and-security/keystore). Documentação de segurança.
27. Android Developers. [Verify hardware-backed key pairs with key attestation](https://developer.android.com/privacy-and-security/security-key-attestation). Documentação de segurança.
28. NXP Semiconductors. [NTAG 424 DNA TT – Secure NFC T4T compliant IC with Tag Tamper feature, NT4H2421Tx](https://www.nxp.com/docs/en/data-sheet/NT4H2421Tx.pdf). Rev. 3.0, 31/01/2019.
29. NXP Semiconductors. [Symmetric key diversifications, AN10922](https://www.nxp.com/docs/en/application-note/AN10922.pdf). Rev. 2.2, 2019.
30. Seritag. [Authentication](https://seritag.com/nfc-tags/authentication). Catálogo comercial de etiquetas e plataforma Ixkio.
31. Shop NFC. [NFC Stickers NTAG424 DNA ø22mm](https://shopnfc.com/en/nfc-stickers/487-nfc-stickers-ntag424-dna-d22mm.html). Página comercial; preço e quantidade mínima.
32. Shop NFC. [NFC Encoding – TagLink](https://shopnfc.com/en/nfc-solutions/314-749-taglink.html). Página comercial; serviço e restrições de programação.
33. GoToTags. [Simple NFC Inlay – NTAG 424 DNA – 25 mm Circle](https://store.gototags.com/simple-nfc-inlay-ntag-424-dna-25-mm-circle/). SKU 34EJ25CNVM; preços por quantidade.
34. GoToTags. [NFC Tags](https://store.gototags.com/nfc-tags/). Catálogo comercial; referências de NTAG213/215.
35. GoToTags. [Tamper Evident Security NFC Stickers](https://store.gototags.com/nfc-tags/nfc-tags-by-use/tamper-evident-security-nfc-stickers/). Catálogo comercial; preço TT não confirmado.
36. Shop NFC. [USB NFC Readers](https://shopnfc.com/en/38-usb-nfc-readers). Catálogo comercial; referências de leitores opcionais.
37. PostgreSQL Global Development Group. [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html). Documentação oficial; restrições de unicidade.
38. Kleppmann, M.; Riccomini, C.. [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/). 2ª ed., O’Reilly, fevereiro de 2026; página editorial e sumário.
39. Aumasson, J.-P.. [Serious Cryptography](https://nostarch.com/serious-cryptography-2nd-edition). 2ª ed., No Starch Press, agosto de 2024.
40. Shostack, A.. [Threat Modeling: Designing for Security](https://shostack.org/books/threat-modeling-book). Wiley, 2014; página do autor também anuncia edição futura.
41. Johnston, R. G.. [Effective Vulnerability Assessment of Tamper-Indicating Seals](https://store.astm.org/jte11883j.html). Journal of Testing and Evaluation, 1997; DOI 10.1520/JTE11883J; resumo editorial.
42. Schneier, B.; Kelsey, J.. [Secure Audit Logs to Support Computer Forensics](https://www.schneier.com/academic/archives/1999/05/secure_audit_logs_to.html). ACM TISSEC, 1999; DOI 10.1145/317087.317089; resumo dos autores.
43. Advanced Card Systems. [ACR1252U USB NFC Reader III](https://www.acs.com.hk/en/products/342/acr1252u-usb-nfc-reader-iii-nfc-forum-certified-reader/). Página e documentação oficiais do fabricante.

As demais referências da semente têm seus links DOI diretamente na tabela da seção 14; novas leituras complementares estão identificadas na seção 12. Referências ainda incompletas não foram transformadas em citações bibliográficas fictícias.

[1]: https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf "NTAG 424 DNA – Secure NFC T4T compliant IC, NT4H2421Gx"
[2]: https://www.nxp.com/docs/en/application-note/AN12196.pdf "NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints, AN12196"
[3]: https://developer.android.com/topic/architecture/data-layer/offline-first "Build an offline-first app"
[4]: https://developer.android.com/reference/android/nfc/tech/IsoDep "IsoDep"
[5]: https://nfc-forum.org/build/specifications/ "Specifications"
[6]: https://developer.android.com/reference/android/nfc/Tag "Tag"
[7]: https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf "NTAG213/215/216 – NFC Forum Type 2 Tag compliant IC"
[8]: https://link.springer.com/book/10.1007/978-3-662-69306-3 "Experimentation in Software Engineering"
[9]: https://csrc.nist.gov/pubs/sp/800/38/b/upd1/final "Recommendation for Block Cipher Modes of Operation: The CMAC Mode for Authentication"
[10]: https://web.cecs.pdx.edu/~nbulusu/papers/smartcomp16.pdf "Securing Pharmaceutical and High-Value Products against Tag Reapplication Attacks Using NFC Tags"
[11]: https://doi.org/10.1145/3211933.3211939 "Block-Supply Chain: A New Anti-Counterfeiting Supply Chain Using NFC and Blockchain"
[12]: https://www.mdpi.com/1999-5903/13/4/84 "Decentralizing Supply Chain Anti-Counterfeiting and Traceability Systems Using Blockchain Technology"
[13]: https://www.techscience.com/cmc/v83n3/60992 "A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain Technologies"
[14]: https://link.springer.com/chapter/10.1007/978-3-032-22208-4_12 "NFC-PUF Three-Pass Authentication for Supply Blockchains"
[15]: https://www.progetto-demetra.it/wp-content/uploads/2022/10/ARES_2021_DIMES.pdf "PUF-based Smart Tags for Supply Chain Management"
[16]: https://doi.org/10.1109/ACCESS.2022.3151795 "EVO-NFC: Extra Virgin Olive Oil Traceability Using NFC Suitable for Small-Medium Farms"
[17]: https://arxiv.org/abs/2008.03913 "NFCGate: Opening the Door for NFC Security Research with a Smartphone-Based Toolkit"
[18]: https://doi.org/10.1007/978-3-540-71641-9_9 "From Identification to Authentication – A Review of RFID Product Authentication Techniques"
[19]: https://doi.org/10.1016/j.infsof.2015.03.007 "Guidelines for conducting systematic mapping studies in software engineering: An update"
[20]: https://www.wohlin.eu/ease14.pdf "Guidelines for snowballing in systematic literature studies and a replication in software engineering"
[21]: https://www.prisma-statement.org/prisma-2020 "PRISMA 2020"
[22]: https://doi.org/10.1214/ss/1009213286 "Interval Estimation for a Binomial Proportion"
[23]: https://www.rfc-editor.org/rfc/rfc4303 "IP Encapsulating Security Payload (ESP)"
[24]: https://www.rfc-editor.org/rfc/rfc5848 "Signed Syslog Messages"
[25]: https://www.rfc-editor.org/rfc/rfc8785 "JSON Canonicalization Scheme (JCS)"
[26]: https://developer.android.com/privacy-and-security/keystore "Android Keystore system"
[27]: https://developer.android.com/privacy-and-security/security-key-attestation "Verify hardware-backed key pairs with key attestation"
[28]: https://www.nxp.com/docs/en/data-sheet/NT4H2421Tx.pdf "NTAG 424 DNA TT – Secure NFC T4T compliant IC with Tag Tamper feature, NT4H2421Tx"
[29]: https://www.nxp.com/docs/en/application-note/AN10922.pdf "Symmetric key diversifications, AN10922"
[30]: https://seritag.com/nfc-tags/authentication "Authentication"
[31]: https://shopnfc.com/en/nfc-stickers/487-nfc-stickers-ntag424-dna-d22mm.html "NFC Stickers NTAG424 DNA ø22mm"
[32]: https://shopnfc.com/en/nfc-solutions/314-749-taglink.html "NFC Encoding – TagLink"
[33]: https://store.gototags.com/simple-nfc-inlay-ntag-424-dna-25-mm-circle/ "Simple NFC Inlay – NTAG 424 DNA – 25 mm Circle"
[34]: https://store.gototags.com/nfc-tags/ "NFC Tags"
[35]: https://store.gototags.com/nfc-tags/nfc-tags-by-use/tamper-evident-security-nfc-stickers/ "Tamper Evident Security NFC Stickers"
[36]: https://shopnfc.com/en/38-usb-nfc-readers "USB NFC Readers"
[37]: https://www.postgresql.org/docs/current/ddl-constraints.html "Constraints"
[38]: https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/ "Designing Data-Intensive Applications"
[39]: https://nostarch.com/serious-cryptography-2nd-edition "Serious Cryptography"
[40]: https://shostack.org/books/threat-modeling-book "Threat Modeling: Designing for Security"
[41]: https://store.astm.org/jte11883j.html "Effective Vulnerability Assessment of Tamper-Indicating Seals"
[42]: https://www.schneier.com/academic/archives/1999/05/secure_audit_logs_to.html "Secure Audit Logs to Support Computer Forensics"
[43]: https://www.acs.com.hk/en/products/342/acr1252u-usb-nfc-reader-iii-nfc-forum-certified-reader/ "ACR1252U USB NFC Reader III"
