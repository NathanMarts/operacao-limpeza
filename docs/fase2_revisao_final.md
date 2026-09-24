# Fase 2: revisão final de design

Revisão do [redesign das 24](fase2_redesign_24.md) antes de implementar, contra dois riscos: **excesso de mecânicas** e **repetição disfarçada**. O catálogo foi olhado inteiro, com as 8 da Fase 1 junto, porque é o conjunto que precisa parecer um jogo só.

**Aprovada para implementação**, com os ajustes da revisão do dono do projeto (registrados abaixo, em "Ajustes da aprovação").

**Implementada.** Os números finais, os ajustes feitos no simulador e as decisões pendentes estão em [playtest_fase2.md](playtest_fase2.md).

## O que mudou em relação à proposta

**Regra 1 (reutilizar antes de inventar) derrubou uma das três mecânicas novas.** O **agendamento** ("S9 fecha em 10 min", "caixa chega em 15 min") produzia dilemas que o jogo já sabe produzir:
- o **fechamento com hora certa** já existe no **relógio do intervalo** da Fase 1 (o sinal a cada 20 min). "A próxima aula começa no sinal" dá a mesma decisão que "a sala fecha em 10 min", sem regra nova, e o jogador já conhece o sinal;
- a **caixa que chega depois** só acrescentava "quando" a uma caixa no corredor, que já existe.

Também saíram duas extensões que só serviam a uma situação cada:
- **recarga mais lenta** (Carrinho desorganizado);
- **sala mais próxima em outra estação** (Sala será usada em breve).

## Ajustes da aprovação

1. **Ida ao depósito são 4 situações: 4, 6, 16 e 26.** A Equipamento quebrado (6) mantém "buscar outro no depósito", como no redesign; o ajuste que trocava essa ação pelo rádio foi retirado.
2. **3, 7 e 24 não mudam.** A repetição da sala da frente foi identificada, mas os dilemas são diferentes. As três ficam como no [redesign](fase2_redesign_24.md) e são **marcadas para observação no playtest** (ver seção 6). Isso inclui a 7, que não é mais redesenhada.
3. **A situação 9 foi reescrita para ficar clara:** a sala fica pronta porque **a turma da próxima aula a limpa no fim da aula**, com o material que você deixa, e não porque a limpeza "some".
4. **Nenhuma regra para limitar fechamentos** por enquanto. Primeiro, observar no playtest se os vários bloqueios travam o fluxo.
5. **Nenhuma mecânica nova** além do que está nesta revisão.

## 1. Situações que permanecem

Identidade própria e nenhum conflito com outra carta. Ao lado, a **decisão exclusiva** que cada uma faz tomar (Regra 6).

| # | Situação | Decisão exclusiva |
|--:|---|---|
| 3 | Sala será usada em breve | "Qual sala a turma vai ocupar: esta, a da frente, ou nenhuma?" (**observar no playtest**: sala da frente) |
| 4 | Lixeiras cheias | "Viro para o depósito agora, carrego o lixo comigo, ou pago espera para alguém vir buscar?" |
| 6 | Equipamento quebrado | "Arrisco com o remendo, pago a certeza, ou viro para o depósito agora?" |
| 7 | Sala usada em evento | "Para onde vão as cadeiras: ficam comigo, vão para a frente, ou a equipe desmonta o par?" (**observar no playtest**: sala da frente) |
| 8 | Janela esquecida aberta | "Vou passar por aqui de novo daqui a 12 min? Se sim, o tempo seca o chão para mim." |
| 11 | Vaso entupido | "Entrego o banheiro à manutenção, sabendo que o turno pode acabar antes dela?" |
| 12 | Piso alagado | "Qual ponto da base eu fecho: os banheiros ou o depósito?" (a única carta que fecha a recarga) |
| 14 | O turno da manhã já passou aqui | "Vale gastar tempo para saber o que me espera **no fundo**, antes de ir?" |
| 16 | Escada enlameada | "De onde eu vim? Isso decide se sujar S1/S7 é de graça, e se voltar para a base agora é natural ou absurdo." |
| 17 | Poeira de obra | "Reorganizo a rota para fazer o fundo **enquanto ele está protegido**?" |
| 19 | A portaria já passou a vassoura | "Preciso de material justamente aqui, no ponto mais longe do depósito?" |
| 21 | Colega de turno passa por aqui | "Divido o mapa (ele pega o fundo) ou pego o carrinho cheio dele (acabo com a recarga)?" |
| 23 | Evento cancelado | "Reabro uma sala que eu tinha perdido, ou transformo esta sala num ponto de apoio?" |
| 24 | Sala sem torneira | "Já limpei a sala da frente? Se sim, a água dela é de graça." (**observar no playtest**: sala da frente) |
| 26 | Murais de fim de semestre | "Para qual ponta eu vou agora, a base ou o fundo?" |
| 27 | Ar-condicionado pingando | "O trecho em volta já está pronto? Se sim, desligar o disjuntor não custa nada." |

## 2. Situações com pequeno ajuste

| # | Situação | Ajuste | Por quê |
|--:|---|---|---|
| 25 | Sala preparada para prova | A ação "voltar no fim da prova" usa o **relógio do intervalo** existente: a sala fica fechada até o próximo sinal | Nenhuma mudança de dilema; só confirma que o fechamento vem do relógio que o jogador já conhece |
| 28 | Banheiro recém-reformado | Trocar "+3 cargas da sobra da obra" (repete o Turno da manhã) por "**usar a lavadora aqui e no banheiro da frente**": −2 min no outro banheiro | Duas cartas de banheiro davam o mesmo "+3 cargas na base". Agora a 28 decide **onde fica a lavadora: na base ou na escada** |
| 32 | Pedido da coordenação | A consequência de "recusar" deixa de ser um fechamento agendado e vira **+3 min na sala da reunião** (a reunião suja a sala). A meta com prazo continua | Tira a dependência do agendamento sem mudar o dilema: ir agora para o outro extremo, aceitar a restrição, ou pagar lá depois |

## 3. Situações que precisam ser redesenhadas de novo

Em cada uma, o problema, a identidade que ela deve ter e um esboço das ações. O desenho completo vem depois da sua aprovação.

### 9 — Turma deixou a sala organizada
- **Problema:** dependia do agendamento. Sem ele, a ação 3 virava um bônus por pouco tempo, o mesmo das Alunos.
- **Identidade nova:** **usar o relógio a seu favor.** A sala está pronta agora, mas a próxima aula começa no **próximo sinal** e vai até o **sinal seguinte**. O relógio do intervalo decide quando ela fica livre de novo.
- **Ações:**
  - **Fechar agora, antes da aula:** metade do tempo e o material normal.
  - **Voltar depois da aula:** não faz nada agora. A sala fica **fechada até o fim da próxima aula** (o segundo sinal) e depois volta como pendência de metade do tempo, **sem gastar material** (a turma deixou tudo arrumado). Vale se sua rota passa por aqui depois disso.
  - **Deixar o material com a turma da próxima aula:** 1 min para combinar e o material da sala, entregue ao professor. **A turma limpa a sala no fim da aula, com o seu material**, e ela fica pronta no segundo sinal. Você não volta. A carta diz isso com essas palavras: quem limpa, com o quê e a que horas.
- **A decisão:** pagar agora, esperar a aula acabar e voltar de graça no material, ou pagar em material para não voltar, dependendo do relógio.

### 13 — Acabou papel e sabonete
- **Problema:** "recarregar cedo" é uma armadilha, não um dilema, e a caixa agendada no meio repetia o Carrinho da manutenção.
- **Identidade nova:** **o banheiro que puxa material de volta.** É a única carta que **consome** um recurso deixado no mapa em vez de criar um.
- **Esboço:**
  - repor do carrinho (+1 carga);
  - buscar na caixa do corredor mais próxima, se houver: consome a caixa, custa a distância, e é o encadeamento ao contrário;
  - improvisar com o que há no banheiro: conclui, mas o banheiro da frente fica sem reposição (+2 min lá).

### 20 — Falta de água no bloco
- **Problema:** era o **mesmo dilema da Janela aberta** (8): pagar, esperar secar/voltar a água, ou andar até os banheiros. Mesmas três moedas.
- **Identidade nova:** **o único evento do bloco inteiro.** Por 20 min, toda sala por fazer custa +2 (sem água), menos os banheiros, que têm caixa própria. O painel mostra.
- **Esboço:**
  - racionar aqui e seguir;
  - deixar esta sala e fazer os banheiros agora (a rota vira para a base);
  - pedir que religuem primeiro este trecho: +4 min de espera, e o +2 some das salas a até 10 m.
- **A decisão:** o que fazer com 20 minutos em que tudo fica mais caro.

### 30 — Carrinho desorganizado
- **Problema:** a ação 3 usava uma mecânica que saiu (recarga mais lenta), e a ação 1 era mais um bônus numa sala.
- **Identidade nova:** **trocar tempo por material, no ponto em que o material vale.**
- **Esboço:**
  - arrumar agora: +3 min, e a sobra vira uma caixa de 2 cargas **aqui**;
  - usar o pano de reserva: rápido, 1 carga a mais;
  - descartar o vencido: perde 2 cargas e ganha tempo nesta sala.
- **A decisão:** perto da virada para o depósito, carga vale pouco; no fundo, vale muito.

### 31 — Visita da direção hoje
- **Problema:** "prometer o trecho limpo em 15 min" era a mesma decisão das Alunos ("fique nesta região agora"), com outra roupa.
- **Identidade nova:** **a cobrança das suas pendências.** Só aparece se você tem salas adiadas ou pendentes, e a direção pergunta por elas.
- **Esboço:**
  - prometer resolvê-las em 20 min (meta com prazo: a tempo, um colega assume a sala mais distante; atrasou, +3 em cada uma);
  - mostrar o serviço feito: a direção revela as 2 salas mais distantes;
  - explicar e pedir ajuda: +3 min, e a pendência mais antiga vai para um colega.
- **A decisão:** o passado do seu turno vira um prazo. Isso liga a pendência persistente a uma consequência.

## 4. Mecânicas globais do jogo

O jogador aprende **oito regras**. Todas já existem desde a Fase 1.

| # | Regra | O que o jogador vê |
|--:|---|---|
| 1 | **Distância real**: andar e esperar custam pelo mapa | A carta diz "37 m do depósito: espera de 7,4 min" |
| 2 | **Material e recarga**: depósito, caixas no corredor, o rádio busca na mais próxima, a sobra fica no chão | Caixa "+5" no corredor; a carta diz de onde vem o material |
| 3 | **Pendência persistente**: adiar mantém a mesma situação | "!" e "adiada" na sala |
| 4 | **Efeito com endereço**: bônus ou penalidade em salas nomeadas, às vezes por um tempo | Selo "−3" ou "+2" na sala; a carta nomeia as salas |
| 5 | **Fechar e liberar**: salas, regiões e o depósito | Cadeado com contagem regressiva |
| 6 | **Delegação**: alguém conclui uma sala numa hora marcada | Ícone de pessoa e "colega · ~N min" |
| 7 | **Informação**: saber antes o que tem numa sala | "i" na sala; o painel lista o que você descobriu |
| 8 | **Relógio do intervalo**: um sinal a cada 20 min | A carta diz "próximo sinal no minuto 80" |

E **duas regras de uso limitado**, que não podem virar molde:

| Regra | Onde | Limite |
|---|---|---|
| **Aposta** (chance escrita na carta) | 6, 25 | Só 2 situações; é a primeira a sair se o playtest disser que sorte não combina |
| **Meta com prazo** (salas destacadas, minuto-limite, recompensa e penalidade no painel) | 31, 32 | Só 2, e com dilemas opostos: 31 cobra o passado do turno (suas pendências), 32 puxa para o outro extremo do mapa |

**Parâmetros novos**, que não são regras novas para o jogador: distância até os **banheiros** (8, 20); caixa **no ponto atual** (23, 30); revelar **uma região** (14); **o depósito** pode ser fechado (12).

## 5. Matriz situação × mecânica

Legenda das colunas:
- **Dist:** distância real.
- **Mat:** material e recarga.
- **Pend:** pendência persistente.
- **Efeito:** efeito com endereço (+ penalidade, − bônus).
- **Fecha:** fechar ou liberar.
- **Deleg:** delegação.
- **Info:** informação.
- **Sinal:** relógio do intervalo.
- **Aposta** e **Meta:** as duas regras limitadas.
- **Depósito:** a carta pede "virar para o depósito agora".
- **Frente:** a sala da frente é o eixo.
- **Segura:** há uma ação "paga e resolve", e em que posição ela aparece.

| # | Situação | Dist | Mat | Pend | Efeito | Fecha | Deleg | Info | Sinal | Aposta | Meta | Depósito | Frente | Segura |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | Sala muito suja *(F1)* | | | | + | | ● | | | | | | | 1ª |
| 2 | Material acabando *(F1)* | ● | ● | | | | | | | | | | | 3ª |
| 3 | Sala será usada em breve | | | ● | − | ● | | | | | | | ● | 1ª |
| 4 | Lixeiras cheias | ● | ● | | | | | | | | | ● | | — |
| 5 | Sala trancada *(F1)* | ● | | ● | | ● | | | | | | | | — |
| 6 | Equipamento quebrado | ● | ● | ● | | | | | | ● | | ● | | 2ª |
| 7 | Sala usada em evento | | | ● | − | ● | | | | | | | ● | 1ª |
| 8 | Janela esquecida aberta | ● | | ● | | ● | | | | | | | | 1ª |
| 9 | Turma deixou a sala organizada *(novo)* | | | ● | | ● | ● | | ● | | | | | — |
| 10 | Alunos ajudam *(F1)* | | ● | | − | | | ● | | | | | | — |
| 11 | Vaso entupido | | | ● | | | ● | | | | | | | 1ª |
| 12 | Piso alagado | | | ● | | ● | | | | | | | | 1ª |
| 13 | Acabou papel e sabonete *(novo)* | ● | ● | | + | | | | | | | | ● | — |
| 14 | O turno da manhã já passou aqui | | ● | | | | | ● | | | | | | — |
| 15 | Carrinho da manutenção *(F1)* | | ● | | | | ● | | | | | | ● | — |
| 16 | Escada enlameada | ● | ● | | + | | | | | | | ● | | 1ª |
| 17 | Poeira de obra | | | ● | − | | | | | | | | | 1ª |
| 18 | Fluxo na escada *(F1)* | | | ● | − | ● | | | ● | | | | | — |
| 19 | A portaria já passou a vassoura | | ● | | − | | | | | | | | | — |
| 20 | Falta de água no bloco *(novo)* | | | ● | + | | | | | | | | | — |
| 21 | Colega de turno | | ● | | | | ● | | | | | | | — |
| 22 | Enceradeira *(F1)* | | | | − | | ● | | | | | | | — |
| 23 | Evento cancelado | | ● | | | ● | | | | | | | | — |
| 24 | Sala sem torneira | | | ● | + | | | | | | | | ● | — |
| 25 | Sala preparada para prova | | | ● | | ● | | | ● | ● | | | | 1ª |
| 26 | Murais de fim de semestre | ● | ● | | − | | | | | | | ● | | 1ª |
| 27 | Ar-condicionado pingando | | | ● | | ● | | | | | | | | 1ª |
| 28 | Banheiro recém-reformado | | | | − | | | | | | | | ● | — |
| 29 | Entrega de material *(F1)* | | ● | | | | | | | | | | | — |
| 30 | Carrinho desorganizado *(novo)* | | ● | | | | | | | | | | | 2ª |
| 31 | Visita da direção *(novo)* | | | ● | + | | ● | ● | | | ● | | | — |
| 32 | Pedido da coordenação | | | ● | + | | ● | | | | ● | | | — |
| | **Total (de 32)** | **8** | **14** | **16** | **16** | **10** | **8** | **3** | **3** | **2** | **2** | **4** | **6** | **14** |

**Como ler os totais:**
- **Ida ao depósito:** 4 cartas (4, 6, 16, 26), cada uma com um motivo diferente: o lixo, a ferramenta quebrada, o barro (saindo do extremo oposto) e os murais (escolhendo a ponta).
- **Sala da frente:** 6 cartas. A **decisão** muda em cada uma: fechar a frente (3), o par inteiro (7), consumir reposição dela (13), delegá-la (15), o custo da ordem do par (24), a lavadora nos dois banheiros (28).
- **Solução segura:** 14 de 32, em posições variadas (1ª em 11, 2ª em 2, 3ª em 1). As outras 18 não têm uma opção "paga e resolve". A 1ª posição ainda concentra a maioria: ao implementar, vale inverter a ordem em 3 ou 4 delas (Regra 5).
- **Delegação:** 8, mas só 4 são ações de "entregar a sala" (1, 11, 15, 22). As demais são recompensas (31, 32), o relógio (9) ou o Colega (21), que é a carta de delegação por definição.

## 6. Repetições que restam

Em ordem de risco:

1. **Efeito com endereço em 16 de 32 cartas.** É a mecânica mais usada. Não é um molde repetido, porque o endereço e o sinal mudam (vizinhas, frente, ponto, escada, banheiros; bônus ou penalidade), mas é onde o catálogo pode começar a parecer "mais um selo no mapa". São 9 bônus e 7 penalidades. **Quatro dos bônus miram a escada ou o fundo** (17, 19, 26, 28), e o 16 encarece S1/S7. Se o playtest mostrar que a escada fica barata demais, cortar primeiro a ação da escada dos Murais (26).
2. **Pendência em 16 cartas.** Nenhuma usa pendência como "terceira opção automática", e cada uma tem um motivo (secagem, recarga, prova, sinal, reunião). Mas é a segunda mecânica mais frequente. Observar se o jogador sente o "deixar para depois" como mais do mesmo, principalmente em 8, 12 e 27, que são as três em que a pendência é a ação do meio.
3. **Fechamentos em 10 cartas.** A Regra 4 é cumprida (proteger, reorganizar, alguém ocupa, disjuntor, depósito), mas numa partida podem aparecer três cadeados ao mesmo tempo. **Decisão da aprovação:** nenhuma regra nova por enquanto; observar no playtest se os bloqueios travam o fluxo.
4. **Duas cartas de "material na base"**: Turno da manhã (14, +3 cargas no banheiro) e Carrinho da manutenção (15, material do carrinho). Estão em situações de banheiro e dão coisas parecidas. Aceitável porque o resto das duas cartas é muito diferente (informação e delegação), mas fica anotado.
5. **Rádio e espera pela distância** em Material acabando, Lixeiras e Acabou papel e sabonete (13). Três vezes a mesma conta ("alguém vem até você, e a espera depende de onde você está"), com objetos diferentes (material, lixo, reposição tirada de uma caixa do corredor). É a mesma regra 1 aplicada, o que a Regra 7 pede, mas as três decisões ("pago a espera ou me mexo?") são próximas. Se uma tiver que mudar, é a da Lixeira.
6. **Relógio do intervalo em 3 cartas** (9, 18, 25), 4 se a Falta de água usar o sinal para a volta da água. É bom que seja o mesmo relógio, mas o sinal pode ficar denso. Cuidar para que ele apareça no cabeçalho ou no mapa, e não só na carta.
7. **Sala da frente em 3, 7 e 24 (marcadas para observação).** Os dilemas são diferentes (qual sala perde, para onde vão as cadeiras, a ordem do par), mas no playtest vale anotar se o jogador sente as três como a mesma pergunta.
