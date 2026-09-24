# Fase 2: implementação e playtest simulado

As 24 situações restantes foram implementadas conforme a [revisão final aprovada](fase2_revisao_final.md), em quatro ondas, e testadas no simulador com o mesmo critério da Fase 1. Nenhuma mecânica nova foi criada, e nenhuma regra para limitar fechamentos foi acrescentada.

**Resultado em uma linha:** as 32 situações passam no critério de dinamismo da Fase 1, e as 8 da Fase 1 continuam tão dinâmicas quanto antes, agora jogando junto com as outras 24. O playtest humano ainda não foi feito: o roteiro está em [roteiro_playtest_fase2.md](roteiro_playtest_fase2.md).

## 1. O que foi implementado

| Onda | Situações | O que usa |
|---|---|---|
| A | 3, 4, 7, 8, 11, 12, 14, 16, 17, 19, 20, 21, 23, 24, 26, 27, 28, 30 | Só mecânicas da Fase 1, com parâmetros novos |
| B | 9, 13 | O relógio do intervalo (fechar e delegar "até o 2º sinal") e a caixa do corredor consumida |
| C | 6, 25 | Aposta com a chance escrita na carta |
| D | 31, 32 | Meta com prazo |

**Parâmetros novos no motor** (nenhum é regra nova para o jogador):
- regiões: o par de salas mais distante, a sala mais próxima em outra estação, ambientes nomeados (S1/S7/S2/S8, a escada), todos de um tipo (os banheiros), as suas pendências;
- distância até os banheiros e até uma caixa do corredor; ir até a escada;
- fechar o depósito;
- caixa de material "aqui", no ponto em que você está;
- fechar ou delegar "até o N-ésimo sinal";
- revelar uma região inteira.

**As duas regras de uso limitado:**
- **Aposta** (6 e 25): a carta diz "chance de 1 em 3". O sorteio usa a semente da partida, então é reproduzível, e o log registra "deu certo" ou "deu errado".
- **Meta com prazo** (31 e 32): aparece no painel "No mapa" com as salas, o minuto-limite, a recompensa e a multa. Cumprida, um colega faz uma sala para você. Vencida, as salas que faltaram ganham um selo "+N min". Aceitar a mesma meta de novo, no mesmo lugar, substitui a anterior.

**Na tela:**
- o cabeçalho mostra o **próximo sinal**, embaixo do tempo total;
- o depósito ganha cadeado e a palavra "FECHADO" quando está fechado;
- o painel "No mapa" lista o depósito fechado e as metas abertas.

## 2. O critério e o resultado

**Critério da Fase 1:**
- nenhuma ação é a melhor em mais de 70% dos estados;
- as três ações de cada carta são a melhor sozinha em algum estado;
- a escolha muda a rota.

**Método:** o simulador gera estados variados de partida, força a situação numa sala plausível e joga até o fim com cada ação. Foram 120 cenários por situação, cerca de 8.200 partidas para as 24 novas e 2.700 para as 8 da Fase 1.

### As 24 novas

"Melhor em" soma mais de 100% quando há empate (diferença de até 0,5 min).

| # | Situação | Ação 1 | Ação 2 | Ação 3 | Muda a rota |
|--:|---|--:|--:|--:|--:|
| 3 | Sala será usada em breve | 40% | 31% | 36% | 99% |
| 4 | Lixeiras cheias | 30% | 68% | 13% | 83% |
| 6 | Equipamento quebrado | 25% | 24% | 57% | 100% |
| 7 | Sala usada em evento | 18% | 19% | 68% | 100% |
| 8 | Janela esquecida aberta | 35% | 63% | 13% | 100% |
| 9 | Turma deixou a sala organizada | 32% | 20% | 58% | 97% |
| 11 | Vaso entupido | 8% | 48% | 56% | 98% |
| 12 | Piso alagado | 28% | 28% | 47% | 100% |
| 13 | Acabou papel e sabonete | 55% | 15% | 47% | 28% |
| 14 | O turno da manhã já passou aqui | 50% | 51% | 12% | 83% |
| 16 | Escada enlameada | 25% | 57% | 22% | 97% |
| 17 | Poeira de obra | 34% | 45% | 32% | 99% |
| 19 | A portaria já passou a vassoura | 60% | 30% | 34% | 68% |
| 20 | Falta de água no bloco | 47% | 41% | 48% | 47% |
| 21 | Colega de turno | 26% | 61% | 26% | 95% |
| 23 | Evento cancelado | 64% | 14% | 40% | 42% |
| 24 | Sala sem torneira | 39% | 11% | 65% | 100% |
| 25 | Sala preparada para prova | 13% | 61% | 30% | 99% |
| 26 | Murais de fim de semestre | 39% | 26% | 50% | 91% |
| 27 | Ar-condicionado pingando | 20% | 51% | 33% | 100% |
| 28 | Banheiro recém-reformado | 26% | 55% | 47% | 39% |
| 30 | Carrinho desorganizado | 11% | 50% | 46% | 47% |
| 31 | Visita da direção | 35% | 20% | 49% | 100% |
| 32 | Pedido da coordenação | 58% | 29% | 47% | 78% |

### Comparação com a Fase 1: o dinamismo foi preservado

| | Fase 1 (8) | Fase 2 (24) |
|---|--:|--:|
| Maior fatia de uma ação, média | 52% | 56% |
| Pior caso (a ação mais dominante) | 61% | 68% |
| A escolha muda a ordem das salas | 79% | 83% |
| Diferença entre a melhor e a pior ação | 10,9 min | 10,3 min |
| Situações em que as 3 ações são a melhor sozinha em algum estado | 8 de 8 | 24 de 24 |

As 8 da Fase 1, agora sorteadas no meio das outras 24, continuam no mesmo patamar da rodada em que foram congeladas: nenhuma passa de 61%.

### Fluxo da partida inteira (a pergunta dos fechamentos)

Foram 300 partidas completas, com o sorteio de verdade e o bot jogando a melhor rota que encontra:

- Nenhuma partida travou, e ninguém esperou no corredor.
- **Fechamentos ao mesmo tempo:** a mediana do pico é **1 ambiente**. Houve 3 ou mais fechados ao mesmo tempo em 11 das 300 partidas (máximo 4).
- **Em 10% do turno** existe algum ambiente fechado.
- Cerca de 14 cartas por partida.

**Conclusão:** no simulador, os fechamentos não travam o fluxo, e a decisão de não criar regra para limitá-los se sustenta. Falta confirmar com pessoas, porque um cadeado que o bot contorna sem custo pode incomodar quem joga (ver o roteiro).

## 3. Ajustes feitos durante a simulação

Os números do redesign eram pontos de partida. Três rodadas de simulação mexeram nestes. Nenhum ajuste mudou a identidade de uma carta. Três pontos se afastam do texto aprovado e estão na seção 4, para você decidir.

| # | Situação | Aprovado | Implementado | Por quê |
|--:|---|---|---|---|
| 6 | Equipamento | Improvisar B+4 | B+3 | O remendo vencia 73% |
| 7 | Sala usada em evento | Equipe: −3 min cada, fecha 10 | −2 cada, fecha 12 | A equipe vencia 75% |
| 8 | Janela aberta | Secando: sobra 1 min | Sobra 3 min | Deixar secar vencia 76% |
| 9 | Turma organizada | Deixar com a turma: material da sala | Material da sala +1 | Vencia 73%: a sala sumia da rota de graça |
| 11 | Vaso entupido | Chamar: 1 min, pronto em 25 | 5 min e o material do banheiro, pronto em 50 | Chamar vencia 80% (a volta ao banheiro sai quase de graça por causa do depósito ao lado) |
| 11 | Vaso entupido | Desentupir B+6; interditar sobra 2 | B+4; sobra 1 | Desentupir era quase morta (4%) |
| 12 | Piso alagado | Secar B+4; ralo fecha o depósito 10 | B+3; fecha 20 | O ralo vencia 73%: 10 min de depósito fechado quase nunca atrapalhava |
| 13 | Acabou papel | Repor B, R+1 | B+1, R+1 | Repor vencia 88% |
| 13 | Acabou papel | Buscar na caixa: repor do carrinho e trazer 3 da caixa | Gasta 2 cargas da caixa, nenhuma do carrinho | Nunca era a melhor (0%): trocava carga por carga pagando a caminhada |
| 16 | Escada enlameada | Lavar B+5; raspar B/2 e S1/S7 +2 | Lavar B+3; raspar B−2 e S1/S7 +3 | Raspar vencia 78% |
| 19 | Portaria | Só o pano B/2 | B−2 | Vencia 74% |
| 20 | Falta de água | Racionar B+3; deixar para os banheiros sobra B; religar espera 4 | B+2; sobra B+2 (a sala continua sem água); espera 5 | Deixar para os banheiros vencia 77% |
| 23 | Evento cancelado | Limpar agora B/2 | B−1 | Limpar agora vencia 96% das partidas naturais |
| 24 | Sala sem torneira | Parte seca: sobra 1 min | Sobra 2 min | Vencia 71% |
| 30 | Carrinho desorganizado | Pano de reserva R+1 | R+2 | Vencia 74% |

B é o tempo base da sala e R o material dela, como no redesign.

## 4. Decisões que são suas

1. **Carrinho desorganizado (30), ação 3.** O aprovado era "descartar o vencido: perde 2 cargas e ganha tempo nesta sala". Implementada ao pé da letra, ela era **dominada pelo pano de reserva em todas as salas**: as duas trocavam material por tempo, e o pano trocava melhor. Troquei por **"Gastar os frascos abertos": +2 min, nenhuma carga do carrinho**, a troca ao contrário (tempo por material). Assim a carta mantém a identidade aprovada, "trocar tempo por material, no ponto em que o material vale", e as três ações ficam em 11%/50%/46%. Se preferir outra ação 3, é só trocar essa.
2. **Vaso entupido (11): chamar a manutenção agora gasta o material do banheiro.** Sem isso, chamar era "tirar o banheiro da rota de graça", a mesma decisão em qualquer estado. A leitura é "separar o material para a manutenção". A identidade ("depender do relógio de outra pessoa") continua.
3. **Falta de água (20): deixar a sala para ir aos banheiros deixa uma pendência de B+2**, porque a sala continua sem água. Coerente com o evento, mas é um número que não estava no aprovado.

## 5. Problemas encontrados e corrigidos

1. **Beco sem saída com o depósito fechado.** O jogo contava com o depósito sempre aberto: "uma volta exige ter saído" funcionava porque dava para ir ao depósito e voltar. O Piso alagado fecha o depósito, e quem deixasse uma pendência no último ambiente ficava sem destino e sem o botão de esperar. **Correção:** o botão "Aguardar no corredor" também aparece quando não há destino nenhum, e espera até o próximo desbloqueio, depósito incluído. O texto do aviso foi atualizado. Tem teste de regressão.
2. **Metas repetidas.** Adiar a Coordenação e voltar oferecia a mesma carta, e cada "Largar tudo e ir" criava outra meta igual. Agora a meta nova substitui a anterior.
3. **Caixa deixada "aqui".** A regra "pega ao passar" recolheria a caixa no primeiro passo para fora da estação, e a caixa viraria só um ganho de carga disfarçado. **Regra esclarecida:** a caixa do ponto de partida não é recolhida ao sair, só quando você chega ou passa por ela de novo.
4. **Texto das cartas:** "S10 fechadas", "ESC: −3 min cada" e o rótulo repetido "O colega: O colega:" foram corrigidos (singular e plural, "cada" só com mais de uma sala).

## 6. Mudanças nas regras dos testes

Duas regras estruturais do catálogo foram trocadas, porque o molde antigo as tornava impossíveis de cumprir com o desenho aprovado:
- **"Todo bloqueio dura os 10 min do config"** virou **"todo fechamento dura entre 5 e 30 min, ou até no máximo 2 sinais"**. As durações próprias de cada carta (a turma fica 25 min, o piso seca em 12) fazem parte da identidade aprovada.
- **"Toda carta tem uma ação sem material"** virou **"com o carrinho vazio, cada tipo de ambiente ainda tem ao menos 2 cartas com saída"**. O sorteio já descarta cartas sem ação possível. O que não pode acontecer é um tipo de ambiente ficar sem carta.

Os testes que usavam cartas antigas como cobaia (a Falta de água antiga, por exemplo) agora usam **cartas de laboratório** (`src/domain/fixturesDeTeste.ts`), que o sorteio nunca vê.

**Suíte:** 112 testes passando, typecheck e build limpos. Há testes novos para relógio, depósito fechado, aposta, metas e caixa "aqui".

## 7. O que o simulador não mede

- **O bot joga a varredura perfeita.** Nas partidas naturais ele converge para as mesmas escolhas, e algumas ações quase nunca aparecem: "Ceder esta sala" (3), "Voltar depois da aula" (9), "Fechar os banheiros" (12), "Recolher o material da manhã" (14), "Levar o barro ao depósito" (16), "Pedir o carrinho de apoio" (19), "Deixar esta e fazer os banheiros" (20). Nos estados variados, elas são a melhor em 12% a 41% dos casos. **Isso já acontecia na Fase 1** ("Usar o material deles", "Parar e estocar tudo"). Pessoas não jogam a varredura perfeita, e o playtest é que diz se essas ações são tentadoras.
- **O bot não sente o custo de ler.** A Visita (31) e a Coordenação (32) passam no critério, mas pedem acompanhar um prazo no painel. Se é carga demais, só uma pessoa mostra.
- **Aposta:** o bot avalia pela média de várias sementes. Uma pessoa pode sentir a falha como injusta, mesmo com a chance escrita. Pela revisão, a aposta é a primeira regra a sair se o playtest disser que sorte não combina com o jogo.
- **Banheiros:** 6 cartas disputam 2 ambientes, então cada carta de banheiro aparece em cerca de 1 de cada 6 partidas. Num playtest de 2 partidas por pessoa, várias delas não vão aparecer.

## 8. Para observar no playtest humano

Da revisão aprovada, e do que a simulação levantou:
1. **3, 7 e 24 (sala da frente):** a pessoa sente as três como a mesma pergunta?
2. **Fechamentos:** o mapa parece travado? Houve momento de "não tenho para onde ir"?
3. **Relógio do intervalo:** a pessoa olha o "próximo sinal" no cabeçalho antes de escolher em 9, 18 e 25?
4. **9 (Turma organizada):** ela entende que a turma limpa a sala no fim da aula, e não que a limpeza "sumiu"?
5. **Aposta (6, 25):** a reação quando dá errado. Aceita ("eu sabia do risco") ou reclama ("azar")?
6. **Metas (31, 32):** ela lembra do prazo sem voltar a ler o painel? Muda a rota por causa da meta?
7. **Depósito fechado (12):** percebe o cadeado no depósito? Entende por que o rádio ou as Lixeiras ficaram sem a opção do depósito?

## Como reproduzir

```
pnpm exec vitest run
pnpm exec vite-node scripts/playtest.ts 120 saida.json fase2     # as 24 novas
pnpm exec vite-node scripts/playtest.ts 120 saida.json fase1     # as 8 da Fase 1
pnpm exec vite-node scripts/playtest.ts 300 "" partidas          # partidas completas, sorteio real
```

As ondas também rodam separadas: `a`, `b`, `c`, `d`, e `todas` roda as 32.
