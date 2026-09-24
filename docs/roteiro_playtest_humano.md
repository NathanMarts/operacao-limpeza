# Roteiro do playtest humano — Fase 1

**Para quem conduz o teste.** Este roteiro serve para descobrir se o núcleo das 8 situações é **divertido para uma pessoa**: se cria dilemas, planejamento e memória do mapa. Não é para medir quem joga melhor.

O núcleo está congelado: durante o playtest, nada de mecânica nova. O que está em teste é só isto: posição, distância, pendência persistente, efeitos locais, recursos no mapa, delegação e informação.

## Antes de começar

**O link.** Abra o jogo com `?playtest=fase1` no fim do endereço:

- local: `pnpm dev` e `http://localhost:5173/?playtest=fase1`
- publicado (depois do deploy): `https://nathanmarts.github.io/operacao-limpeza/?playtest=fase1`

Confira que o cabeçalho diz **"Modo playtest · fase1"**. Nesse modo, o sorteio usa só as 8 situações do protótipo, então cada pessoa vê a maioria delas, algumas mais de uma vez.

**Por pessoa:**
- 2 partidas completas. A primeira é para aprender; a segunda mostra se a pessoa passou a planejar.
- Cerca de 35 minutos no total: 2 partidas de ~12 min e 10 min de conversa.
- Um observador com a folha de observação (abaixo), sentado ao lado, sem apontar para a tela.

**Entre uma pessoa e outra:**
1. Na aba Histórico, clique em **Baixar partidas** e **Baixar decisões**.
2. Renomeie os dois arquivos com o código da pessoa (ex.: `P03_partidas.csv`).
3. Clique em **Limpar histórico**.

**Quantas pessoas:** 5 a 8 já mostram a maior parte dos problemas. Se possível, misture quem já jogou a versão antiga com quem nunca jogou.

## O que dizer

Leia algo próximo disto, e só isto:

> "Você é da equipe de limpeza e precisa limpar todas as salas deste bloco no menor tempo que conseguir. Em cada sala acontece alguma coisa e você escolhe o que fazer. Não existe resposta certa. Enquanto joga, tente falar em voz alta o que está pensando: por que vai para uma sala, por que escolhe uma carta. Eu não vou te ajudar durante a partida, porque quero ver como você joga sozinho."

**Durante a partida:**
- **Não explique estratégia, nunca.** Se perguntarem "qual é a melhor?", responda "faça o que achar melhor".
- **Se perguntarem o que um ícone ou número significa**, devolva: "o que você acha que é?". Anote como **confusão**.
- **Se a pessoa travar por mais de 1 minuto** sem saber o que um elemento é, explique o que ele **é** ("esse quadrado é material deixado no corredor"), nunca o que fazer com ele. Anote também.
- **Se ela parar de falar em voz alta**, um "o que você está pensando agora?" basta.

## O que observar

### Folha de observação (uma por partida)

Marque um tique a cada vez que acontecer. Anote a frase exata sempre que puder.

| # | O que observar | Sinal concreto | Contagem e notas |
|--:|---|---|---|
| 1 | Olha o mapa antes de escolher | Antes de clicar numa carta, desvia o olhar ou o mouse para o mapa, ou fala de uma sala | |
| 2 | Olha o painel "No mapa" | Lê ou aponta o painel à direita; cita algo que só aparece lá | |
| 3 | Percebe recursos deixados antes | Comenta uma caixa, a enceradeira, um selo "−2" ou um "i" que ela mesma causou | |
| 4 | Lembra do material em outro ponto | Na carta do rádio ou antes de recarregar, fala da caixa no corredor | |
| 5 | Muda a rota por causa de uma decisão | Vai para uma sala que não iria, ou evita uma, e cita o motivo | |
| 6 | Entende a sala delegada | Não tenta clicar na sala com "colega"; comenta quando ela fica pronta | |
| 7 | Percebe quando um efeito regional termina | Nota que um selo sumiu ou que S1/S7 reabriram | |
| 8 | Usa informação para escolher a próxima sala | Depois de "Perguntar o que vem pela frente", vai (ou evita ir) a uma sala marcada com "i" por causa do que leu | |
| 9 | Cria um plano para o resto do turno | Fala em sequência ("faço esta, depois aquelas, depois recarrego") | |
| 10 | Mostra indecisão real entre duas ações | Demora, volta o olhar entre duas cartas, compara em voz alta | |

### Registro por situação

Uma linha por carta que aparecer.

| Situação | Sala | Tempo para decidir (rápido < 5 s / pensou / hesitou muito) | Olhou o mapa? | Escolheu | O que disse |
|---|---|---|---|---|---|
| | | | | | |

### O que cada situação testa

| Situação | Mecânica em teste | O que vale a pena notar |
|---|---|---|
| Sala muito suja | Delegação e efeito local | Chama a equipe da noite cedo e depois espera no fim? Percebe o "+2" que empurrou para as vizinhas? |
| Material acabando | Distância e encadeamento | A carta do rádio diz de onde vem o material. A pessoa percebe que é a caixa que ela deixou? |
| Sala trancada | Posição e pendência persistente | Quando adia, lembra que a mesma situação vai estar esperando? Busca a chave quando está perto da entrada? |
| Alunos ajudam | Efeito local com prazo e informação | Depois de "preparar as vizinhas", fica na região ou vai embora e perde o efeito? Usa o que os alunos contaram? |
| Carrinho da manutenção | Recurso no mapa e delegação | Lembra do carrinho no meio quando o material acaba? |
| Fluxo na escada | Posição, rota e janela de tempo | Os cavaletes fecham S1/S7: estava indo para lá? Espera o intervalo quando ele está perto? |
| Enceradeira | Equipamento no mapa e delegação | Escolhe onde deixar a máquina pensando em para onde vai? |
| Entrega de material | Recurso no mapa | Manda a caixa para o fundo e depois passa por lá de propósito? |

### Frases para anotar ao pé da letra

São os sinais que o teste procura:

- "Se eu tivesse feito X antes, agora seria diferente."
- "Vou deixar isso aqui porque vou precisar depois."
- "Não quero voltar até lá."
- "Ah, é aquela caixa que eu deixei."
- "Vou fazer essa antes que \[o efeito\] acabe."

E os sinais de alerta:

- "Tanto faz."
- Escolher sempre a mesma posição de carta (a da esquerda, por exemplo).
- Clicar na carta sem ler, repetidamente.
- "Não entendi o que aconteceu" depois de uma escolha.

## Depois da segunda partida

Faça as perguntas nesta ordem. Depois de cada resposta, só um "por quê?" ou "me conta mais". Não sugira respostas e não diga o que era melhor.

1. "Qual foi a decisão mais difícil?"
2. "Teve alguma decisão de que você se arrependeu depois?"
3. "Teve alguma decisão que você tomou pensando no que faria mais tarde?"
4. "Você lembra de algum recurso que deixou no mapa?"
5. "Alguma decisão mudou sua rota?"
6. "Teve alguma situação em que você clicou sem pensar?"
7. "Você sentiu que tinha um plano ou estava apenas reagindo?"

Só no final, se sobrar tempo: "Você jogaria de novo tentando outra estratégia? Qual?"

## Como analisar

Junte as folhas de observação, as respostas e os CSVs (a coluna **Modo** separa as partidas do playtest).

### Por mecânica

Classifique cada mecânica em uma categoria, pela evidência de todas as pessoas:

| Categoria | Quando usar |
|---|---|
| **Divertido** | Aparece nos "bons sinais": frases de planejamento, arrependimento ou antecipação ligadas a ela; a pessoa a usa de propósito na segunda partida |
| **Neutro** | É usada, mas ninguém comenta nem hesita; não muda o comportamento da primeira para a segunda partida |
| **Confuso** | Gera perguntas sobre o que é, ou "não entendi o que aconteceu"; a pessoa tenta clicar em algo bloqueado ou delegado |
| **Chato** | "Tanto faz", clique sem ler, a mesma escolha sempre; reclamação de espera (ex.: esperar a equipe da noite no fim) |
| **Complexo demais** | A pessoa entende depois de explicada, mas não consegue acompanhar durante o jogo (ex.: esquece prazos, perde a conta do que está no mapa) |

Mecânicas a classificar: posição, distância, pendência persistente, efeitos locais, recursos no mapa, delegação e informação.

### Por decisão: planejou ou resolveu no automático

Para cada situação, e dentro dela para cada ação escolhida:

- **Planejou**: hesitou, olhou o mapa, falou do que faria depois, ou citou uma decisão anterior.
- **Automático**: decidiu em menos de 5 segundos sem olhar o mapa, ou escolheu sempre a mesma coisa sem comentar.

A pergunta mais importante do teste é **quais situações fazem a pessoa planejar e quais ela resolve no automático**. Uma situação resolvida no automático por quase todos é candidata a redesenho antes de ir para as outras 24, mesmo que o simulador diga que ela está equilibrada.

Com as folhas, as respostas e os CSVs em mãos, dá para montar essa análise.
