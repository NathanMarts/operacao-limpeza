# Playtest da Fase 1: o mapa como mecânica

Protótipo do novo sistema em 8 das 32 situações, antes de expandir para as outras 24. A base é a [revisão de game design](revisao_situacoes.md). Este documento registra a **consolidação**: a segunda rodada, depois do primeiro playtest simulado.

> **Sobre este playtest.** Ele é **simulado**: um bot competente jogou cerca de 3.450 partidas por rodada. Ele mede equilíbrio e dependência de contexto, mas não mede diversão nem o que uma pessoa percebe na tela. Onde o texto fala de percepção, a base é a revisão das telas, não o comportamento de jogadores.

## Rodada 3: núcleo congelado para o playtest humano

Dois ajustes finais, e depois nada muda até o teste com pessoas ([roteiro](roteiro_playtest_humano.md)):

- **Alunos ajudam:** as duas primeiras ações empatavam. Agora são estratégias diferentes:
  - **Ajuda aqui:** metade do tempo e **sem gastar o seu material**, porque os alunos usam o deles. Ganho certo, agora.
  - **Preparar as salas ao lado:** −2 min em cada vizinha, mas **só por 12 min**, enquanto a turma está no andar. Exige ficar na região.
  - Uma tentativa intermediária (−3 min, com a ajuda ainda gastando material) deu 85% para "preparar": a exigência de ficar na região quase nunca custa, porque as vizinhas são o caminho natural. A mudança de estratégia na "ajuda aqui" resolveu.
- **Entrega de material:** "Deixar no fundo" não aparece mais quando você já está no fundo, onde a caixa seria recolhida na hora.
- **Modo de playtest:** `?playtest=fase1` no link sorteia só as 8 situações do protótipo. O cabeçalho avisa, e o CSV do histórico marca a partida na coluna **Modo**.

| Situação | Rodada 3 (melhor em, por ação) | Onde a melhor escolha muda |
|---|---|---|
| Sala muito suja | 27 · 21 · 59 | (mesma situação da rodada 2) |
| Material acabando | 36 · 37 · 43 | Raspar: 44% no meio → 27% no fundo |
| Sala trancada | 22 · 49 · 43 | Buscar a chave: 41% na base → 15% no fundo |
| **Alunos ajudam** | **58 · 48 · 8** | Ajuda aqui: 77% na base. Preparar as vizinhas: 60% no meio do mapa. A diferença entre a melhor e a pior ação subiu de 4,1 para 8,6 min: a decisão passou a pesar |
| Carrinho da manutenção | 23 · 61 · 47 | |
| Fluxo na escada | 19 · 31 · 58 | |
| Enceradeira | 20 · 45 · 51 | |
| **Entrega de material** | **49 · 37 · 37** | Deixar no fundo: 64% na base. Parar e estocar: 53% no fundo |

"Perguntar o que vem pela frente" ficou em 8%. Continua no jogo de propósito: é a mecânica de informação, que o bot não sabe usar, e o playtest humano vai dizer se ela vale.

## O que mudou na consolidação

| Pedido | O que foi feito |
|---|---|
| Remover dominâncias mudando a estratégia | **Fluxo na escada** redesenhado (controlar, janela, reorganizar). Em **Alunos**, "Espalhar" (−1 min em todas as vizinhas) virou "Arrumar a sala da frente", com endereço. A **Enceradeira** ganhou posição física |
| Tirar "mesmo lado" | Saiu do motor. As regiões agora são: sala da frente, raio em metros, um ponto do corredor e a sala mais distante do depósito |
| Mais recursos físicos no mapa | Enceradeira estacionada num ponto (desenhada no corredor), sala entregue a um colega, material no corredor, salas fechadas por cavaletes |
| Piora com o tempo | **Removida** (opção A). Nenhuma situação a usava de forma que mudasse decisões, e ela obrigava o jogador a acompanhar mais um relógio. A pendência continua persistente |
| Substituir "Pedir que tragam material" | Virou **informação**: "Perguntar o que vem pela frente" revela e fixa a situação das 2 salas mais próximas. O mapa marca essas salas com "i" |
| Encadeamento | O rádio de "Material acabando" busca no **ponto de material mais próximo**: o depósito ou uma caixa que você deixou no corredor. A carta mostra de onde vem ("10 m de 'Caixas da entrega'"), e a caixa é consumida |

### As 8 situações agora

| Situação | Ação 1 | Ação 2 | Ação 3 |
|---|---|---|---|
| Sala muito suja | Força-tarefa (B+3, 1 carga a mais) | Varrer para o corredor (+2 min nas vizinhas) | Chamar a equipe da noite (pronta em 60 min, 3 cargas) |
| Material acabando | Rádio (espera = distância ao ponto de material mais próximo) | Raspar o fundo (a próxima parada é o depósito) | Só com água (+4 min, sem produto) |
| Sala trancada | Buscar a chave na entrada (a volta é só limpar) | Pedir pelo rádio (fecha a sala vizinha) | Deixar para depois (a mesma situação espera) |
| Alunos ajudam | Ajuda aqui (metade do tempo) | Arrumar a sala da frente (−3 min nela) | **Perguntar o que vem pela frente** (revela 2 salas) |
| Carrinho da manutenção | Usar o material deles | Carrinho no meio do corredor (4 cargas em S4/S10) | O outro banheiro com a manutenção |
| Fluxo na escada | **Pôr cavaletes** (S1 e S7 fechadas por 12 min) | **Esperar o sinal do intervalo** (espera até o próximo múltiplo de 20 min; limpa com −2) | **Deixar a escada para o final** (a mesma situação espera; −2 min na volta) |
| Enceradeira | Usar aqui (metade do tempo, 1 carga a mais) | **Deixar a máquina em S2/S8** (−3 min em cada; desenhada no corredor) | **Entregar a um colega** (ele encera a sala mais distante do depósito) |
| Entrega de material | Pegar de passagem (+2) | Deixar no fundo (5 cargas em S2/S8) | Parar e estocar (+6; o que não cabe fica no chão) |

## Resultados

Mesmo método da rodada anterior: [`scripts/playtest.ts`](../scripts/playtest.ts), com 150 estados de partida por situação. Em cada estado, o jogo vai até o fim com cada uma das três ações.

"Melhor em" é a porcentagem dos estados em que a ação termina o turno mais cedo, com empate de até 0,5 min contando para as duas (por isso as linhas podem somar mais de 100%).

**Ruído:** com 150 estados, cada porcentagem tem margem de cerca de ±8 pontos. Mudar uma situação também altera os sorteios das outras, então valores parecidos entre rodadas não devem ser lidos como diferença real.

| Situação | Catálogo antigo | 1ª rodada | **Agora** | Onde a melhor escolha muda |
|---|---|---|---|---|
| Sala muito suja | 5 · 49 · 52 | 30 · 19 · 58 | **24 · 19 · 64** | Equipe da noite: 81% cedo → 17% tarde. Varrer: 43% tarde |
| Material acabando | 37 · 39 · 41 | 35 · 34 · 46 | **41 · 32 · 41** | Rádio: 50% tarde. Só água: 52% no meio do turno |
| Sala trancada | 3 · 42 · 59 | 19 · 55 · 41 | **21 · 51 · 48** | Buscar a chave: 40% na base → 16% no fundo |
| Alunos ajudam | 2 · 21 · 79 | 39 · 9 · 75 | **66 · 74 · 14** | As duas primeiras empatam quase sempre (ver abaixo) |
| Carrinho da manutenção | 15 · 9 · 81 | 23 · 57 · 47 | **30 · 52 · 49** | Carrinho no meio: 66% cedo → 26% no meio do turno |
| Fluxo na escada | 59 · 23 · 28 | 75 · 44 · 22 | **25 · 27 · 56** | Cavaletes e intervalo vencem em estados diferentes; deixar para o final cai de 62% cedo para 38% tarde |
| Enceradeira | 12 · 75 · 23 | 21 · 65 · 32 | **25 · 45 · 53** | Entregar: 68% na base. Estacionar: 56% no meio. Usar aqui: 35% tarde |
| Entrega de material | 5 · 29 · 75 | 43 · 36 · 27 | **61 · 26 · 23** | Pegar de passagem: 38% cedo → 86% tarde. Deixar no fundo: 42% cedo |

### Critérios de sucesso

| Critério | Resultado |
|---|---|
| Nenhuma ação acima de ~70% de forma consistente | ✓ Nenhuma no geral. Picos em recortes: equipe da noite (81% cedo), "arrumar a da frente" (84% no meio do mapa), pegar de passagem (86% tarde). São acima de 70% só naquele contexto, que é o comportamento pedido |
| Nenhuma abaixo de ~10%, salvo situacional | ✓ A menor é "Perguntar o que vem pela frente", com 14% (e ela é subestimada pelo bot, ver abaixo) |
| O contexto muda a melhor escolha | ✓ Em todas as 8: por zona do mapa, por momento do turno ou pelo que já foi feito ao redor |
| Pelo menos duas ações boas em estados diferentes | ✓ Em todas |
| Decisões alteram a rota | ✓ A ordem das salas no resto do turno muda em 45–100% dos estados. Em Alunos, só 31% |
| Recursos no mapa são usados | ✓ Material no corredor recolhido em 69–100% das partidas |

## As 8 situações, uma a uma

### Sala muito suja
- **A decisão interessante:** pagar agora, empurrar a sujeira para as vizinhas, ou entregar a sala à equipe da noite e esperar 60 min.
- **O que muda o valor:** o momento do turno (delegar cedo é ótimo; tarde, a equipe chega depois de você terminar) e se as vizinhas ainda estão por fazer.
- **O jogador precisa pensar?** Sim: estimar quanto falta do turno e olhar o que está limpo ao redor.
- **Ação dominante?** Não no geral (64%), mas a equipe da noite é forte no começo (81%).
- **Ação inútil?** Não. Varrer para o corredor fica em 19%, e é a melhor em 43% no fim do turno.
- **Consequência no mapa?** Selos "+2" nas vizinhas; sala hachurada com "colega · ~N min".
- **Interação com outra decisão?** A sala delegada pode obrigar a esperar no corredor no fim, e as vizinhas mais caras mudam a ordem da rota.

### Material acabando
- **A decisão interessante:** buscar material onde ele está mais perto, zerar o carrinho e ir ao depósito na próxima parada, ou pagar em tempo.
- **O que muda o valor:** a distância até o material mais próximo, que pode ser uma caixa deixada antes, e quantas salas faltam.
- **O jogador precisa pensar?** Sim: lembrar se deixou material pelo caminho e para onde vai depois.
- **Ação dominante?** Não (41 · 32 · 41).
- **Ação inútil?** Não.
- **Consequência no mapa?** A carta diz de onde vem o material ("10 m de 'Caixas da entrega'"), e a caixa some do corredor quando é usada.
- **Interação com outra decisão?** **Sim, é o encadeamento principal.** Uma caixa deixada no fundo (Entrega) ou no meio (Carrinho) vira o ponto de reposição mais barato aqui.

### Sala trancada
- **A decisão interessante:** andar até a entrada agora, prender outra sala para ter a chave, ou adiar e encarar depois o mesmo problema.
- **O que muda o valor:** a distância até a entrada (buscar a chave vale na base e quase nunca no fundo) e se há outra sala que possa ser fechada.
- **O jogador precisa pensar?** Sim, principalmente sobre quando voltar.
- **Ação dominante?** Não (21 · 51 · 48).
- **Ação inútil?** Não. Buscar a chave é situacional: 40% na base, 16% no fundo.
- **Consequência no mapa?** "!" e "adiada" na sala; a sala fechada pelo pedido de chave aparece bloqueada.
- **Interação com outra decisão?** Pedir a chave fecha a sala vizinha. Adiar deixa a mesma escolha para depois, quando o contexto pode ter mudado.

### Alunos se oferecem para ajudar
- **A decisão interessante:** ganhar tempo aqui, preparar a sala da frente, ou saber o que vem nas próximas salas.
- **O que muda o valor:** se a sala da frente ainda está por fazer e se você vai para ela agora.
- **O jogador precisa pensar?** **Pouco.** "Ajuda aqui" (metade do tempo) e "arrumar a da frente" (−3 min) empatam quase sempre: o arrependimento médio é de 0,4 a 0,6 min, e a diferença entre a melhor e a pior ação é só 4,1 min. É a situação de menor peso das 8.
- **Ação dominante?** Não, mas por empate, não por dilema.
- **Ação inútil?** "Perguntar o que vem pela frente" fica em 14%. O número subestima a informação: o bot planeja a rota por varreduras, então saber o problema de duas salas quase nunca muda o plano dele. Uma pessoa pode usar isso para escolher a ordem. **É a ação que mais precisa de teste com gente.**
- **Consequência no mapa?** "−3" na sala da frente; "i" nas salas reveladas; o painel "No mapa" lista o que você descobriu.
- **Interação com outra decisão?** A informação muda a decisão nas 2 salas reveladas.
- **Ainda precisa de trabalho:** separar as duas primeiras ações. Por exemplo: "arrumar a da frente" deixa a sala pronta **só por 10 min** (um prazo que puxa a rota), ou "ajuda aqui" custa material dos alunos.

### Carrinho da manutenção esquecido
- **A decisão interessante:** usar o material agora, criar um ponto de recarga no meio do corredor, ou tirar o outro banheiro da sua lista.
- **O que muda o valor:** o momento do turno (o carrinho no meio vale cedo, antes de você passar pelo meio) e se o outro banheiro já foi feito.
- **O jogador precisa pensar?** Sim: onde vai ser a próxima recarga.
- **Ação dominante?** Não (30 · 52 · 49).
- **Ação inútil?** Não.
- **Consequência no mapa?** A caixa "+4" em S4/S10; o outro banheiro com "colega".
- **Interação com outra decisão?** O carrinho no meio vira ponto de reposição para o rádio de "Material acabando" e muda onde você recarrega.

### Fluxo constante na escada
- **A decisão interessante:** controlar o fluxo (e fechar S1 e S7), esperar a janela do intervalo, ou reorganizar a rota e deixar a escada para o final.
- **O que muda o valor:** **onde você está e para onde vai.** Os cavaletes são de graça se S1 e S7 já foram feitas, e caros se eram as próximas. O intervalo depende do relógio (a carta mostra "próximo intervalo no minuto 80"). Deixar para o final só vale se a rota volta à escada.
- **O jogador precisa pensar?** Sim. É a situação que mais depende da rota planejada.
- **Ação dominante?** Não (25 · 27 · 56).
- **Ação inútil?** Não.
- **Consequência no mapa?** Cadeados em S1 e S7 com contagem regressiva; "!" na escada adiada.
- **Interação com outra decisão?** Os cavaletes mudam a ordem das salas do fundo; a escada adiada volta com a mesma escolha.

### Enceradeira livre hoje
- **A decisão interessante:** usar agora, estacionar a máquina nas salas grandes do fundo, ou entregá-la a um colega que assume a sala mais distante.
- **O que muda o valor:** se S2 e S8 ainda estão por fazer e se você ainda vai ao fundo; na base, entregar ao colega vale mais (68%).
- **O jogador precisa pensar?** Sim: é um objeto que fica num lugar ou vai embora com alguém.
- **Ação dominante?** Não (25 · 45 · 53).
- **Ação inútil?** Não.
- **Consequência no mapa?** A máquina aparece desenhada no corredor, com "−3" em S2 e S8; a sala assumida pelo colega fica com "colega".
- **Interação com outra decisão?** Estacionar define que o fundo fica mais barato; entregar tira uma sala distante da sua rota.

### Entrega de material no andar
- **A decisão interessante:** pegar pouco agora, mandar para o fundo, ou parar e encher o carrinho.
- **O que muda o valor:** o momento do turno (deixar no fundo vale cedo, antes de você ir para lá; no fim, pegar de passagem vence em 86%).
- **O jogador precisa pensar?** Sim, cedo; no fim, é quase automático.
- **Ação dominante?** Não no geral (61%); pegar de passagem domina só no fim do turno.
- **Ação inútil?** Não.
- **Consequência no mapa?** A caixa "+5" no fundo; o material que sobra vira caixa no chão onde você está.
- **Interação com outra decisão?** A caixa no fundo vira o ponto de reposição do rádio de "Material acabando".

## Achados desta rodada

- **Bug corrigido: uma situação podia ser sorteada sem nenhuma ação possível.** O sorteio checava as ações sem olhar a partida; a enceradeira podia aparecer com S2 e S8 já limpas e o carrinho no limite, prendendo o jogador na carta. O simulador encontrou o caso. Há um teste de regressão.
- **Aviso novo no diálogo de confirmação:** quando o carrinho não tem material para aquela sala. Na rodada anterior, o bot voltava a uma sala adiada sem material e só conseguia adiar de novo.
- **Ainda não resolvido:** "Deixar no fundo" estando no fundo (S1, S7, S2, S8) continua sendo um "pegar de passagem" mais caro. A caixa é recolhida assim que você sai.

## Limitações do simulador

- O bot não sabe usar informação bem: planeja a rota por varreduras e só usa o custo das situações reveladas como estimativa. "Perguntar o que vem pela frente" deve valer mais para uma pessoa do que o número mostra.
- O bot não tem aversão a risco nem esquece nada. Delegação e estoques no corredor são mais fáceis para ele do que para um iniciante, que pode esquecer que deixou a caixa lá.
- "A escolha muda a ordem das salas" inclui o ruído dos sorteios seguintes.

## Antes de expandir para as outras 24

1. **Alunos:** separar "ajuda aqui" de "arrumar a da frente", que hoje empatam.
2. **"Deixar no fundo" em salas do fundo:** esconder a ação ou mandar a caixa para o meio.
3. **Playtest com pessoas, na oficina.** O que observar:
   - Olham o painel "No mapa" e o corredor antes de escolher a próxima sala?
   - Alguém usa o rádio **porque** lembrou da caixa que deixou antes? Esse é o teste do encadeamento.
   - Usam a informação dos alunos para escolher a ordem?
   - Entendem por que S1 e S7 ficaram fechadas, ou por que a sala delegada ficou pronta?
   - Depois da partida, conseguem apontar uma decisão que mudou a rota?
