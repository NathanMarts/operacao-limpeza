# Revisão de game design das situações

O mapa já tem uma estratégia escondida: uma recarga obrigatória que faz parte do corredor ser cruzada três vezes. As situações não usam isso, e duas regras do motor fazem "deixar para depois" vencer quase sempre. Esta revisão parte do mapa, audita as 32 situações de [`src/data/situations.ts`](../src/data/situations.ts) e redesenha as que se repetem.

**Notação.** `B` é o tempo base do ambiente e `R` o material dele (1 nas salas e na escada, 2 nos banheiros). `d(DEP)` é a distância até o depósito e `d(WC)` até o banheiro mais próximo. 5 m valem 1 min. Os números das ações novas são pontos de partida para calibrar, não o valor final.

## Sumário

- [Em uma página](#em-uma-página)
- [O mapa em números](#o-mapa-em-números)
- [Mecânicas](#mecânicas)
- [Auditoria](#auditoria)
- [Reprojeto](#reprojeto)
- [Como implementar](#como-implementar)

## Em uma página

1. **Deixar pendente vence resolver em 11 de 32 situações.** As salas frente a frente ficam na mesma posição do corredor: atravessar custa 0 m. Nessas 11, a ação parcial mais a volta custa 1 a 2 min a menos que a completa, com carga igual ou menor. Medido no motor: na S3 com volta pela S9, "Sala de prova" sai por 4 min contra 7. As 11 são: 1, 3, 6, 8, 12, 16, 17, 18, 20, 27 e 32.
2. **"Adiar" é um novo sorteio em 15 de 32 situações.** Uma sala deixada por fazer (`leaveUnstarted`) sorteia outra situação na volta. Em 30 sementes, voltar à mesma S3 deu 17 situações diferentes. Adiar vira "trocar de problema pagando o deslocamento".
3. **São 3 moldes para 32 situações.** 15 são "resolver / parcial / adiar", 12 são "rápido / bônus / poupar" e 5 são logística. Por isso as situações parecem variações do mesmo problema.
4. **12 situações dão bônus sem endereço.** "−2 min nas próximas 2 salas" vale em qualquer sala, onde quer que esteja. Uma decisão em S3 nunca deixa vantagem para S4, S5 ou S6 em particular, e um bônus ganho na escada (o fim natural da rota) quase nunca é usado.
5. **A carga vale em degraus, e ninguém vê.** Com 3 cargas de folga, a primeira carga extra gasta não muda nada, e por isso "gastar 1 carga para poupar 4 min" domina. Mas uma carga a mais antes da virada pode adiantar a recarga em uma estação e poupar 4 min.

## O mapa em números

Limpar tudo custa **17 cargas** (12 salas × 1, 2 banheiros × 2, escada × 1) e o carrinho leva **10**. Toda partida tem pelo menos uma recarga. Como cada par de salas divide a mesma posição, o corredor tem na prática oito paradas: banheiros (4 m), depósito (8 m), as seis estações de salas e a escada (71,5 m).

A recarga só funciona depois de gastar 7 cargas, ou o carrinho não chega ao fim. O ponto mais perto do depósito onde isso acontece é S5/S11: banheiros (4) + S6/S12 (2) + S5/S11 (2) = 8 cargas. A melhor rota nasce daí: limpar até 28 m, voltar ao depósito, seguir até a escada. São **113,5 m**, contra 73,5 m do corredor percorrido uma vez só.

```
          PASSAGEM ÚNICA (1×)                     ZONA DE RETORNO (3×)
      ┌──────────────────────────────────────┬───────────────────┐
      │  S1     S2      S3    S4      S5     │       S6          │   WC
 ESC ═╪══╪══════╪══════╪═════╪═══════╪══════╪═══════╪══════════DEP═╪══ início
      │  S7     S8      S9    S10     S11    │       S12         │   WC
      └──────────────────────────────────────┴───────────────────┘
 71,5   65     55      45    38      28             18          8   4   −2  m

 1 · limpa a base e S5/S11 (8 cargas)      ◀──────────────────────────────  −2 → 28
 2 · volta para recarregar                         ──────────────────▶        28 → 8
 3 · segue até a escada (9 cargas)  ◀────────────────────────────────────     8 → 71,5
                                                        total: 113,5 m
```

A distância de volta de uma pendência depende de onde ela fica. Na zona de retorno (8–28 m), a rota ótima passa três vezes, então voltar é quase de graça. Da estação S4/S10 em diante, passa uma vez só: voltar custa a ida e a volta inteiras. É esse valor posicional que o redesenho torna visível.

### Distâncias de cada estação

| Estação | Posição | Até o depósito | Ida e volta + recarga |
|---|--:|--:|--:|
| Banheiros | 4 m | 4 m | 5,6 min |
| S6 / S12 | 18 m | 10 m | 8 min |
| S5 / S11 | 28 m | 20 m | 12 min |
| S4 / S10 | 38 m | 30 m | 16 min |
| S3 / S9 | 45 m | 37 m | 18,8 min |
| S2 / S8 | 55 m | 47 m | 22,8 min |
| S1 / S7 | 65 m | 57 m | 26,8 min |
| Escada | 71,5 m | 63,5 m | 29,4 min |

### Quanto vale uma carga (antes da virada)

| Cargas ganhas | Onde virar | Desvio | Economia |
|---|---|--:|--:|
| 0 | S5 / S11 | 40 m | — |
| 1 a 2 | S6 / S12 | 20 m | 4 min |
| 3 a 6 | Banheiros | 0 m | 8 min |
| 7 ou mais | Sem recarga | 0 m | 12 min |
| −1 (gasta) | S5 / S11 | 40 m | 0 min |
| −2 (gasta) | S4 / S10 | 60 m | −4 min |

Estimativas da rota ótima, com 5 m por minuto e 4 min de recarga. "Economia" é relativa à rota sem ganho de carga. Quando você ganha a carga também importa: ela precisa chegar antes da virada.

## Mecânicas

Três já existem no motor e só precisam ser usadas de propósito. Uma é uma regra que acaba com o novo sorteio. As outras são novas, cada uma pequena e reaproveitada em várias situações: é isso que deixa o catálogo variado sem virar 32 casos especiais.

| Mecânica | Tipo | O que faz | No motor | Custo | Usada em |
|---|---|---|---|---|---|
| **R1 · Voltar sem novo sorteio** | regra | Sala deixada para depois guarda a situação e o custo que já tinha. Hoje ela volta a "não iniciada" e sorteia outra situação na volta — um jeito de trocar de problema pagando só o deslocamento. | Guardar situationId (ou um custo fixo) no RoomState ao aplicar leaveUnstarted. | Baixo | 1, 2, 3, 5, 6, 18, 20, 32 |
| **Secagem** | já existe | Pendência pequena + bloqueio da própria sala por N min. O jogador não pode voltar antes: a volta só é barata se a rota passar por aqui DEPOIS do prazo. | Combinação de leavePending + blockRoom self, que já existem. | Nenhum | 1, 3, 7, 8, 12, 13, 18, 20, 24, 25 |
| **Ida ao depósito ou à entrada** | já existe | Move o jogador de verdade: o custo é a distância real, então a mesma ação é barata na base e cara no fundo. | moveTo, já existe. | Nenhum | 2, 4, 5, 6, 26 |
| **Bloquear ou liberar a vizinha** | já existe | Mexe numa sala que não é a atual — em geral a da frente, a 0 m. | blockRoom nearestOther / unblockRoom, já existem. | Nenhum | 5, 7, 23, 32 |
| **N1 · Custo pela distância** | nova | Tempo proporcional à distância até um ponto do mapa (depósito, entrada, banheiro). "Alguém traz" ou "você busca" passa a valer diferente em cada sala. | Nova TimeExpr { kind: "distance", to, factor }, avaliada com a posição atual. | Baixo | 2, 10, 24 |
| **N2 · Pendência que piora** | nova | O resíduo cresce com o relógio (ex.: +1 min a cada 10 min). Deixar para depois só compensa se o "depois" for logo. | RoomState ganha growth { every, amount, since }; o residual é calculado na volta. | Médio | 1, 11, 17, 27 |
| **N3 · Efeito regional** | nova | Bônus ou penalidade com endereço: salas a até 10 m, o mesmo lado (S1–S6 ou S7–S12), um tipo (banheiros, escada) ou a sala da frente. Substitui o "próximas N salas" que vale em qualquer lugar. | ActiveBuff ganha scope { raio \| lado \| tipo \| frente } e pode ter valor negativo. | Médio | 6, 9, 10, 16, 17, 19, 22, 23, 27, 28, 30 |
| **N4 · Estoque no mapa** | nova | Cargas deixadas numa posição do corredor. Ao entrar numa sala a até 5 m dali, o jogador recolhe. Cria pontos de recarga fora da base. | GameState.stashes [{ position, charges, from }]; consumido em confirmTravel. Precisa de ícone no mapa. | Médio | 13, 15, 29 |
| **N5 · Delegar a um colega** | nova | Uma sala é concluída sozinha no minuto T. Até lá fica bloqueada; se o jogador acabar o resto antes, espera no corredor. | RoomState "delegada" com completesAt; alvo resolvido como o blockTargetId. | Médio | 11, 16, 21 |
| **N6 · Trecho do corredor** | nova | Um trecho fica lento (×2) por N min: piso molhado, sacos, alunos. Só pesa para quem ainda vai cruzar aquele trecho. | Modificador { from, to, factor, until } aplicado em travelTo; desenhado no corredor. | Médio | 4, 12, 18 |
| **N7 · Prazo** | nova | Uma sala-alvo precisa estar concluída até o minuto T: bônus se sim, penalidade se não. Puxa a rota para um lugar específico. | GameState.deadlines [{ roomId, until, bonus, penalty }], avaliado ao concluir e no fim. | Médio | 31, 32 |
| **N9 · Risco sorteado** | nova | A ação tem chance declarada de dar errado (ex.: 1 em 3). Usa o gerador com semente, então a partida continua reproduzível. | Efeito { type: "chance", p, then } resolvido com rngState. | Baixo | 8, 25 |
| **N10 · Favor** | nova | Crédito com a equipe: o próximo pedido por rádio ou a um colega (N1, N5) sai sem espera. Liga uma situação a outra. | Contador em GameState; zera a espera de N1/N5 quando existe. | Baixo | 15, 28, 31 |
| **RR · Recarga mais rápida** | nova | A próxima recarga no depósito leva 1 min em vez de 4. Só vale para quem já vai recarregar: amarra a situação ao momento da virada. | Flag em GameState lida no confirmTravel do depósito. | Baixo | 20, 30 |
| **N11 · Informação** | nova | Revela e fixa a situação que espera nas próximas salas. Troca tempo por previsibilidade. | Pré-sorteio por sala guardado no estado (o saco de sorteio já é determinístico). | Médio | 14 |

## Auditoria

**2** manter · **7** ajustar · **18** redesenhar · **5** redesenhar completamente

| # | Situação | Padrão das 3 ações | Ação dominante | "Deixar para depois" disfarçado | Usa o mapa | Afeta salas futuras | 3 estratégias distintas | Decisão |
|--:|---|---|---|---|---|---|---|---|
| 1 | **Sala muito suja** (Salas) | Resolver / Parcial / Adiar | Sim: Rápida + volta = B+2 contra B+3 da Completa, com a mesma carga | Rápida e Adiar | Não | Não | Não | Redesenhar completamente |
| 2 | **Material acabando** (Qualquer ambiente (carrinho ≤ 3)) | Desvio / Economia / Esgotar | Não; o valor muda com a posição | Não | Sim (depósito) | Sim (próxima parada) | Sim | Ajustar |
| 3 | **Sala será usada em breve** (Salas) | Resolver / Parcial / Bloquear | Parcial + volta (B+1) vence Priorizar (B+2) quando há sala de frente | Parcial e Seguir | Fraco (bloqueia a si mesma) | Não | Não | Redesenhar |
| 4 | **Lixeiras cheias** (Salas e banheiros) | Desvio / Material / Pendência | Acumular (1 carga) quase sempre vence: a primeira carga extra não muda onde você recarrega | Deixar para depois | Sim (depósito) | Fraco | Parcial | Ajustar |
| 5 | **Sala trancada** (Salas) | Desvio / Ajuda / Bloquear | Não | Pular (bloqueio e novo sorteio) | Sim (entrada, vizinha) | Sim (bloqueia a vizinha) | Sim | Manter |
| 6 | **Equipamento quebrado** (Qualquer ambiente) | Desvio / Resolver / Parcial | Meia limpeza + volta (B+4) quase empata com Improvisar (B+5) | Meia limpeza | Sim (depósito) | Não | Parcial | Redesenhar |
| 7 | **Sala usada em evento** (Salas) | Resolver / Material / Bloquear | Limpar sem mexer (1 carga) quase sempre vence os 4 min de Reorganizar | Esperar desmontarem | Não | Não | Não | Redesenhar |
| 8 | **Janela esquecida aberta** (Salas) | Resolver / Parcial / Bloquear | Essencial + volta (B+4) ≈ Secar tudo (B+5) | Essencial e Arejar | Não | Não | Não | Redesenhar |
| 9 | **Turma deixou a sala organizada** (Salas) | Rápido / Bônus / Poupar | Caprichar (−2 min × 2) domina em salas de 4 min; Poupar (+2 min por 1 carga) quase nunca vale | Não | Não | Bônus sem endereço | Não | Redesenhar completamente |
| 10 | **Alunos se oferecem para ajudar** (Salas) | Imediato / Material / Bônus | Adiantar as próximas (−2 × 3 por B/2) domina no início | Não | Não | Bônus sem endereço | Parcial | Ajustar |
| 11 | **Vaso entupido** (Banheiros) | Resolver / Parcial / Bloquear | Isolar a cabine poupa 1 carga por uma pendência de 6 | Isolar e Chamar a manutenção | Fraco | Não | Não | Redesenhar |
| 12 | **Piso alagado** (Banheiros) | Resolver / Parcial / Bloquear | Sim: Rodo e voltar (B+3, 1 carga) vence Secar (B+5, 2 cargas). O banheiro da frente fica a 0 m | Rodo e Fechar | Não | Não | Não | Redesenhar |
| 13 | **Acabou papel e sabonete** (Banheiros) | Material / Desvio / Pendência | Ir buscar é quase grátis: o depósito fica a 4 m do banheiro | Anotar | Sim, mas sem peso | Não | Parcial | Redesenhar |
| 14 | **O turno da manhã já passou aqui** (Banheiros) | Rápido / Material / Bônus (clone) | Seguir embalado domina no início | Não | Não | Bônus sem endereço | Não | Redesenhar completamente |
| 15 | **Carrinho da manutenção esquecido** (Banheiros) | Economia / Bônus / Bônus | Usar o deles (poupa 2 cargas) é forte | Não | Não | Dois bônus sem endereço | Não (duas são bônus) | Redesenhar |
| 16 | **Escada enlameada** (Escada) | Resolver / Parcial / Bloquear | Não, mas a pendência aqui é a mais cara do mapa e a carta não diz isso | Raspar e Sinalizar | Não | Não | Não | Redesenhar |
| 17 | **Poeira de obra** (Escada) | Resolver / Parcial / Adiar | Só varrer (0 carga) + volta ≈ Varrer e pano, e poupa material no ponto mais longe | Só varrer e Esperar | Não | Não | Não | Redesenhar |
| 18 | **Fluxo constante na escada** (Escada) | Resolver / Parcial / Adiar | Entre intervalos (B+2 + volta de 6,5 m) ≈ Interditar (B+3) | Entre intervalos e Voltar depois | Não | Não | Não | Redesenhar |
| 19 | **A portaria já passou a vassoura** (Escada) | Rápido / Bônus / Poupar (clone) | Só o pano domina: o bônus nasce na escada, quase sempre a última parada, quando não sobra sala para usá-lo | Não | Não (e o bônus é inútil no fundo) | Bônus sem endereço | Não | Redesenhar completamente |
| 20 | **Falta de água no bloco** (Qualquer ambiente) | Resolver / Parcial / Bloquear | Limpeza seca + volta (B+2) < Racionar (B+3) | Limpeza seca e Esperar | Não | Não | Não | Redesenhar |
| 21 | **Colega de turno passa por aqui** (Qualquer ambiente) | Rápido / Material / Bônus (clone) | Adiantar a rota domina no início | Não | Não | Bônus sem endereço | Não | Redesenhar |
| 22 | **Enceradeira livre hoje** (Salas) | Rápido / Bônus / Bônus de material | Reservar domina no início | Não | Não | Bônus sem endereço | Parcial | Ajustar |
| 23 | **Evento cancelado** (Salas) | Rápido / Bônus / Liberar | Sem nada bloqueado, Assumir o que ficou vira só "poupar 1 carga" | Não | Sim (liberar) | Sim | Sim | Ajustar |
| 24 | **Sala sem torneira** (Salas) | Resolver / Material / Pendência | Balde grande (1 carga) quase sempre vence | Parte seca | Não: a torneira não existe no mapa | Não | Não | Redesenhar |
| 25 | **Sala preparada para prova** (Salas) | Material / Resolver / Parcial | Sim: Só os corredores deixa uma pendência sem agravo (B/2 + B/2 = B) contra B+3. Medido: 4 min contra 7 na S3 | Corredores | Não | Não | Não | Redesenhar |
| 26 | **Murais de fim de semestre** (Salas) | Resolver / Material / Desvio | Não | Não | Sim (depósito) | Sim (recarga) | Sim | Manter |
| 27 | **Ar-condicionado pingando** (Salas) | Resolver / Pendência / Adiar | Bacia + volta ≈ Secar e desligar | Bacia e Sinalizar | Não | Não | Não | Redesenhar |
| 28 | **Banheiro recém-reformado** (Banheiros) | Rápido / Bônus / Poupar (clone) | Mesmo molde e mesma dominância da 9 | Não | Não | Bônus sem endereço | Não | Redesenhar completamente |
| 29 | **Entrega de material no andar** (Salas e banheiros) | Material futuro / Material / Bônus | Pegar de passagem (+2 cargas sem custo) domina | Não | Não | Bônus sem endereço | Parcial | Ajustar |
| 30 | **Carrinho desorganizado** (Salas e banheiros) | Bônus / Economia / Material | Pano de reserva (R+1) forte com carga sobrando | Não | Não | Bônus sem endereço | Parcial | Redesenhar |
| 31 | **Visita da direção hoje** (Salas) | Bônus / Rápido / Bônus de material (clone) | Caprichar domina em salas pequenas | Não | Não | Bônus sem endereço | Não | Redesenhar |
| 32 | **Pedido da coordenação** (Qualquer ambiente) | Resolver / Pendência / Bloquear a vizinha | Atender no fim é mais uma pendência fixa | Atender no fim | Fraco (vizinha) | Sim | Parcial | Ajustar |

## Reprojeto

### 1. Sala muito suja

**Decisão:** Redesenhar completamente · **Onde:** Salas · **Mecânicas:** Secagem, N2 · Pendência que piora, R1 · Voltar sem novo sorteio

**Hoje:** Completa (B+3) · Rápida (B/2, pendência B/2+2) · Adiar (+3 de sujeira, novo sorteio)

**SITUAÇÃO:** Sala muito suja

**CONTEXTO:** Sujeira muito acima da escala. O problema real é quando voltar: o produto precisa de tempo para agir, mas a sujeira gruda se ficar muito tempo.

**AÇÃO 1**

- **Nome:** Força-tarefa
- **O que o jogador faz:** Limpa tudo agora, com produto extra.
- **Custo:** B+3 min, R+1 cargas.
- **Benefício:** Sala fechada, nada fica para trás.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra, mas a carga extra pesa quando o carrinho está perto do limite e longe do depósito.

**AÇÃO 2**

- **Nome:** Deixar o produto agindo
- **O que o jogador faz:** Aplica desengordurante e sai.
- **Custo:** B/2 agora, R. Volta obrigatória de 2 min.
- **Benefício:** Total de B/2+2, o mais barato das três.
- **Consequência futura:** Sala bloqueada por 12 min: só dá para terminar DEPOIS disso.
- **Impacto na rota:** Ótima se a rota volta por aqui mais tarde (zona de retorno, antes da recarga); péssima no fundo.

**AÇÃO 3**

- **Nome:** Recolher o grosso e voltar logo
- **O que o jogador faz:** Tira o lixo pesado e segue.
- **Custo:** 1 min, 0 carga agora.
- **Benefício:** Libera você na hora.
- **Consequência futura:** A sala fica por fazer, sem novo sorteio: custa B se você voltar em até 20 min, B+4 depois disso.
- **Impacto na rota:** Ótima quando a sala da frente ou a vizinha é a próxima parada; ruim se você está saindo da região.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** As duas últimas pedem uma volta, mas em janelas opostas: "não antes de 12 min" contra "antes de 20 min". A primeira paga para não depender da rota. Qual é melhor depende de para onde você vai depois, não da conta de minutos.

### 2. Material acabando

**Decisão:** Ajustar · **Onde:** Qualquer ambiente (carrinho ≤ 3) · **Mecânicas:** Ida ao depósito ou à entrada, N1 · Custo pela distância, R1 · Voltar sem novo sorteio

**Hoje:** Ir ao depósito (recarga, sala não iniciada) · Economizar (B+4, sem carga) · Raspar o fundo (B, zera o carrinho)

**SITUAÇÃO:** Material acabando

**CONTEXTO:** É a única situação que já usa a posição. Mas "Ir ao depósito" faz o mesmo que clicar no depósito e ainda ganha um novo sorteio ao voltar. Troco essa ação por uma que só existe dentro da situação.

**AÇÃO 1**

- **Nome:** Voltar ao depósito agora
- **O que o jogador faz:** Vai, recarrega e volta para esta sala.
- **Custo:** Ida e volta (2×d(DEP)/5) + 4 min. Em S6: 8 min. Em S3: 18,8. Na escada: 29,4.
- **Benefício:** Carrinho cheio.
- **Consequência futura:** A sala fica pendente com B, sem novo sorteio. Provavelmente a última recarga do turno.
- **Impacto na rota:** Barato na base, caríssimo no fundo.

**AÇÃO 2**

- **Nome:** Pedir reposição pelo rádio
- **O que o jogador faz:** Um colega traz material até você.
- **Custo:** Espera de d(DEP)/5 min (S6: 2; S3: 7,4; escada: 12,7), mais B e R.
- **Benefício:** +4 cargas sem sair do lugar.
- **Consequência futura:** Só +4: se ainda falta muito, vem outra recarga.
- **Impacto na rota:** Mantém sua direção. Brilha longe do depósito e perto do fim do turno.

**AÇÃO 3**

- **Nome:** Raspar o fundo
- **O que o jogador faz:** Usa tudo o que sobrou nesta sala.
- **Custo:** B, e o carrinho zera.
- **Benefício:** Nenhum tempo extra agora.
- **Consequência futura:** A próxima parada TEM de ser o depósito.
- **Impacto na rota:** Perfeita se o depósito já era o próximo destino; ruim se ainda há salas adiante.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** A primeira compra autonomia com deslocamento, a segunda compra pouco material com uma espera que cresce com a distância, e a terceira não custa nada agora mas entrega a rota. Perto do depósito a primeira é quase de graça; na escada, a segunda; a terceira quando a sequência já ia voltar.

### 3. Sala será usada em breve

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** Secagem, R1 · Voltar sem novo sorteio

**Hoje:** Priorizar (B+2) · Parcial (B/2, pendência B/2+1) · Seguir (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Sala será usada em breve

**CONTEXTO:** Uma turma entra em breve e fica 25 min. Depois a sala fica livre até o fim do turno. A pergunta é: você estará aqui de novo daqui a 25 min?

**AÇÃO 1**

- **Nome:** Correr antes da turma
- **O que o jogador faz:** Limpa sob pressão.
- **Custo:** B+2 min, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Encaixar na volta
- **O que o jogador faz:** Sai agora e volta depois da aula.
- **Custo:** 0 agora; depois B+2 (a turma suja) e R.
- **Benefício:** Todo o tempo vai para outras salas agora.
- **Consequência futura:** Sala ocupada por 25 min, depois fica por fazer, sem novo sorteio.
- **Impacto na rota:** Ótima se sua rota cruza aqui de novo depois de 25 min (zona de retorno); ruim no fundo, onde você não volta.

**AÇÃO 3**

- **Nome:** Montar o kit para a turma
- **O que o jogador faz:** Deixa sacos e produto com o professor.
- **Custo:** R+1 cargas agora, 1 min.
- **Benefício:** A turma recolhe o lixo; depois da aula sobra um retoque de 2 min.
- **Consequência futura:** Sala ocupada por 25 min e pendência de 2 min.
- **Impacto na rota:** Mesma dependência de rota da anterior, mas troca tempo futuro por material agora: boa perto do depósito, cara longe dele.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo agora, rota planejada, ou material agora para encurtar a volta. As duas últimas só valem se você passa aqui de novo; entre elas, decide o carrinho.

### 4. Lixeiras cheias

**Decisão:** Ajustar · **Onde:** Salas e banheiros · **Mecânicas:** Ida ao depósito ou à entrada, N6 · Trecho do corredor

**Hoje:** Levar ao depósito (recarga) · Acumular (R+1) · Deixar (pendência 3)

**SITUAÇÃO:** Lixeiras cheias

**CONTEXTO:** Levar ao depósito já é posicional e fica. Troco "Deixar para depois", uma pendência fixa que ignora o mapa, por um custo no próprio corredor.

**AÇÃO 1**

- **Nome:** Levar ao depósito agora
- **O que o jogador faz:** Fecha a sala e desce com os sacos.
- **Custo:** B, R + ida ao depósito (d(DEP)/5) + 3 min.
- **Benefício:** Conclui e recarrega.
- **Consequência futura:** Sua posição passa a ser o depósito.
- **Impacto na rota:** Quase de graça na base; no fundo, só vale se você já precisava recarregar.

**AÇÃO 2**

- **Nome:** Acumular no carrinho
- **O que o jogador faz:** Fecha a sala sem desvio, gastando sacos.
- **Custo:** B, R+1.
- **Benefício:** Conclui sem mudar a rota.
- **Consequência futura:** Uma carga a menos, que pode empurrar a recarga uma estação adiante (veja o valor da carga).
- **Impacto na rota:** Nenhuma mudança.

**AÇÃO 3**

- **Nome:** Deixar os sacos no corredor
- **O que o jogador faz:** Fecha a sala e deixa os sacos na porta.
- **Custo:** B, R.
- **Benefício:** Conclui sem tempo extra.
- **Consequência futura:** Os 10 m de corredor em volta desta porta ficam lentos (×2) por 20 min.
- **Impacto na rota:** De graça se você está saindo desta região; caro se ainda vai cruzá-la, por exemplo indo e voltando do depósito.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** A primeira muda sua posição, a segunda gasta material, a terceira cobra no mapa, e só de quem passar ali de novo.

### 5. Sala trancada

**Decisão:** Manter · **Onde:** Salas · **Mecânicas:** Ida ao depósito ou à entrada, Bloquear ou liberar a vizinha, R1 · Voltar sem novo sorteio

**Hoje:** Buscar a chave na entrada (ida real até a entrada) · Pedir pelo rádio (bloqueia a vizinha 10 min) · Pular (bloqueia 10 min)

É a melhor situação posicional do catálogo: buscar a chave custa a distância real até a entrada, então vale na base e pesa no fundo; pedir pelo rádio empurra o problema para a sala vizinha. Único ajuste: "Pular esta sala" hoje dá novo sorteio na volta. Troque por "a chave chega em 10 min": sala bloqueada 10 min e, na volta, limpeza normal, sem novo sorteio.

### 6. Equipamento quebrado

**Decisão:** Redesenhar · **Onde:** Qualquer ambiente · **Mecânicas:** Ida ao depósito ou à entrada, N3 · Efeito regional, R1 · Voltar sem novo sorteio

**Hoje:** Trocar no depósito (recarga, sala não iniciada) · Improvisar (B+5) · Meia limpeza (B/2, pendência B/2+4)

**SITUAÇÃO:** Equipamento quebrado

**CONTEXTO:** O mop quebrou. A decisão interessante não é "limpar pela metade": é consertar agora, mais tarde, ou nunca.

**AÇÃO 1**

- **Nome:** Trocar no depósito
- **O que o jogador faz:** Vai ao depósito buscar outro.
- **Custo:** Ida e volta (2×d(DEP)/5) + 2 min. A sala fica pendente com B, sem novo sorteio.
- **Benefício:** Equipamento novo e, de quebra, carrinho cheio.
- **Consequência futura:** Nenhuma penalidade.
- **Impacto na rota:** Quase de graça na base; no fundo, só se coincidir com a recarga.

**AÇÃO 2**

- **Nome:** Seguir com o remendo
- **O que o jogador faz:** Prende com fita e continua.
- **Custo:** B+1, R.
- **Benefício:** Conclui quase sem atraso.
- **Consequência futura:** As próximas salas custam +1 min cada até você passar pelo depósito, onde troca o equipamento.
- **Impacto na rota:** Barato se o depósito vem logo na sua rota; caro com muitas salas antes da próxima recarga.

**AÇÃO 3**

- **Nome:** Improvisar com pano e balde
- **O que o jogador faz:** Faz tudo à mão.
- **Custo:** B+4, R+1.
- **Benefício:** Conclui sem consequência futura.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** A primeira gasta deslocamento; a segunda empurra o custo para as próximas salas e premia quem já planejou passar pelo depósito; a terceira paga tudo agora. É a posição do depósito na sua rota que decide.

### 7. Sala usada em evento

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** Bloquear ou liberar a vizinha, Secagem

**Hoje:** Reorganizar (B+4) · Limpar sem mexer (R+1) · Pedir para desmontarem (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Sala usada em evento

**CONTEXTO:** Cadeiras em círculo. As cadeiras precisam ir para algum lugar, e as duas salas do par ficam na mesma posição do corredor.

**AÇÃO 1**

- **Nome:** Reorganizar sozinho
- **O que o jogador faz:** Arruma e limpa.
- **Custo:** B+4, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Passar as cadeiras para a sala da frente
- **O que o jogador faz:** Empilha as cadeiras no outro lado do corredor.
- **Custo:** B+1, R.
- **Benefício:** Conclui esta quase no tempo normal.
- **Consequência futura:** A sala da frente, se ainda não foi limpa, fica bloqueada 15 min.
- **Impacto na rota:** De graça se você já limpou a da frente; atrapalha se ela era a próxima. Trocar a ordem resolve.

**AÇÃO 3**

- **Nome:** Esperar a equipe do evento
- **O que o jogador faz:** Combina que eles desmontam e varrem.
- **Custo:** 0 agora.
- **Benefício:** Na volta, a limpeza custa B−2.
- **Consequência futura:** Sala bloqueada 10 min, depois pendência de B−2.
- **Impacto na rota:** Ótima com vizinhas para limpar nesses 10 min; ruim se você está de saída.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo agora; empurrar o problema para a vizinha, o que obriga a pensar na ordem do par; ou esperar e voltar. Cada uma pede uma rota local diferente.

### 8. Janela esquecida aberta

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** Secagem, N9 · Risco sorteado

**Hoje:** Secar tudo (B+5) · Essencial (pendência 4) · Arejar (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Janela esquecida aberta

**CONTEXTO:** Choveu dentro da sala. Secar direito custa caro; esperar secar sozinho pede uma volta; fechar e seguir é uma aposta.

**AÇÃO 1**

- **Nome:** Secar tudo com panos extras
- **O que o jogador faz:** Resolve de uma vez.
- **Custo:** B+3, R+1.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Fechar e deixar secar
- **O que o jogador faz:** Fecha a janela e dá tempo ao piso.
- **Custo:** B/2, R.
- **Benefício:** Total de B/2+1.
- **Consequência futura:** Sala bloqueada 12 min, depois pendência de 1 min.
- **Impacto na rota:** Ótima com retorno planejado; ruim no fundo.

**AÇÃO 3**

- **Nome:** Fechar a janela e torcer
- **O que o jogador faz:** Limpa normalmente e segue.
- **Custo:** B, R.
- **Benefício:** Conclui na hora.
- **Consequência futura:** 1 em 3: o piso mancha e a sala volta a ficar pendente (4 min). A carta mostra a chance; o sorteio acontece ao escolher.
- **Impacto na rota:** O risco pesa mais quanto mais caro for voltar aqui.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Certeza cara, barato com volta, barato com risco. O valor da aposta depende da distância de volta, então a mesma carta é segura em S6 e perigosa em S1.

### 9. Turma deixou a sala organizada

**Decisão:** Redesenhar completamente · **Onde:** Salas · **Mecânicas:** N3 · Efeito regional

**Hoje:** Fechar rápido (B/2) · Caprichar (−2 min nas próximas 2) · Poupar material (B+2, sem carga)

**SITUAÇÃO:** Turma deixou a sala organizada

**CONTEXTO:** Oportunidade: a sala está pronta. É o molde "rápido / bônus / poupar", repetido em outras 7 situações. Aqui o bônus ganha endereço: a sala da frente.

**AÇÃO 1**

- **Nome:** Fechar rápido
- **O que o jogador faz:** Só confere e sai.
- **Custo:** B/2, R.
- **Benefício:** Tempo livre agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Pedir que a turma arrume a da frente
- **O que o jogador faz:** Combina com a turma que sai.
- **Custo:** B, R.
- **Benefício:** A sala da frente, se ainda não foi limpa, passa a custar B/2.
- **Consequência futura:** Vale só para ela.
- **Impacto na rota:** Ótimo se você vai cruzar agora (0 m); inútil se ela já foi feita.

**AÇÃO 3**

- **Nome:** Limpeza a seco
- **O que o jogador faz:** Não abre produto.
- **Custo:** B, 0 carga.
- **Benefício:** Poupa R.
- **Consequência futura:** A carga poupada pode adiantar sua virada para o depósito em uma estação (cerca de 4 min).
- **Impacto na rota:** Vale muito perto do limite de material; quase nada com o carrinho cheio.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, mapa (a sala da frente) e material. O valor da carga depende de onde fica sua recarga, e não de uma conta fixa.

### 10. Alunos se oferecem para ajudar

**Decisão:** Ajustar · **Onde:** Salas · **Mecânicas:** N1 · Custo pela distância, N3 · Efeito regional

**Hoje:** Ajudar aqui (B/2) · Buscar material (+3 cargas) · Adiantar as próximas (−2 min × 3)

**SITUAÇÃO:** Alunos se oferecem para ajudar

**CONTEXTO:** Boa cooperação, mas o bônus vale em qualquer sala, onde quer que esteja, e buscar material leva o mesmo tempo em qualquer lugar.

**AÇÃO 1**

- **Nome:** Aceitar ajuda aqui
- **O que o jogador faz:** Divide o serviço.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Pedir que tragam material
- **O que o jogador faz:** Os alunos vão ao depósito.
- **Custo:** B, R + espera de d(DEP)/5 min.
- **Benefício:** +3 cargas.
- **Consequência futura:** Pode eliminar uma volta ao depósito.
- **Impacto na rota:** Quanto mais longe, mais demora, mas mais vale.

**AÇÃO 3**

- **Nome:** Espalhar a turma pelas vizinhas
- **O que o jogador faz:** Cada aluno adianta uma sala.
- **Custo:** B, R.
- **Benefício:** Salas por fazer a até 10 m desta porta (incluindo a da frente) custam −2 min.
- **Consequência futura:** Vale até o fim do turno, só na região.
- **Impacto na rota:** Excelente no meio do corredor com vizinhas por fazer; inútil se a região já está limpa.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Agora, material cujo preço depende da distância, e um bônus com endereço.

### 11. Vaso entupido

**Decisão:** Redesenhar · **Onde:** Banheiros · **Mecânicas:** N5 · Delegar a um colega, N2 · Pendência que piora

**Hoje:** Desentupir (B+6) · Isolar a cabine (1 carga, pendência 6) · Chamar a manutenção (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Vaso entupido

**CONTEXTO:** Os banheiros ficam a 4 m da entrada e do depósito: toda recarga passa por eles. A manutenção resolve, mas no horário dela.

**AÇÃO 1**

- **Nome:** Desentupir você mesmo
- **O que o jogador faz:** Resolve na hora.
- **Custo:** B+6, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Chamar a manutenção
- **O que o jogador faz:** Registra o chamado.
- **Custo:** 1 min.
- **Benefício:** A manutenção conclui o banheiro no minuto atual +25; você não volta.
- **Consequência futura:** Banheiro bloqueado até lá. Se você acabar o resto antes, espera no corredor.
- **Impacto na rota:** Ótima no começo do turno; perigosa no fim.

**AÇÃO 3**

- **Nome:** Isolar a cabine
- **O que o jogador faz:** Interdita uma cabine e limpa o resto.
- **Custo:** B, 1 carga (em vez de 2).
- **Benefício:** Quase tudo feito, com 1 carga poupada.
- **Consequência futura:** Pendência de 2 min que cresce +1 a cada 10 min.
- **Impacto na rota:** Barata se sua recarga é em breve, porque o banheiro fica colado ao depósito.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo; terceirizar e depender do horário; ou uma pendência que piora, barata só para quem vai passar pelo depósito logo.

### 12. Piso alagado

**Decisão:** Redesenhar · **Onde:** Banheiros · **Mecânicas:** Secagem, N6 · Trecho do corredor

**Hoje:** Secar completo (B+5) · Rodo e voltar (B/2, pendência B/2+3) · Fechar para secar (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Piso alagado

**CONTEXTO:** A água tem de ir para algum lugar. Os banheiros ficam na base, o trecho que o jogador mais cruza.

**AÇÃO 1**

- **Nome:** Secar tudo
- **O que o jogador faz:** Rodo, pano e balde.
- **Custo:** B+4, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Rodo e deixar secar
- **O que o jogador faz:** Tira o grosso e fecha a porta.
- **Custo:** B/2, R.
- **Benefício:** Total barato.
- **Consequência futura:** Bloqueado 10 min, depois pendência de 1 min.
- **Impacto na rota:** Combina com uma recarga logo depois (o depósito fica ao lado); péssima se você vai direto para o fundo.

**AÇÃO 3**

- **Nome:** Puxar a água para o ralo do corredor
- **O que o jogador faz:** Empurra tudo para fora.
- **Custo:** B, R.
- **Benefício:** Conclui na hora.
- **Consequência futura:** O corredor da base (0 a 18 m) fica escorregadio: deslocamento ×2 por 15 min.
- **Impacto na rota:** Indo para o fundo agora, custa só a travessia desses 14 m; se ainda vai e volta do depósito, fica caro.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo; volta com espera, que casa com o depósito; ou um custo no corredor que depende da sua próxima perna. A mesma sala, dois usos opostos do mesmo trecho.

### 13. Acabou papel e sabonete

**Decisão:** Redesenhar · **Onde:** Banheiros · **Mecânicas:** N4 · Estoque no mapa, Secagem

**Hoje:** Repor do carrinho (R+1) · Ir buscar (recarga, sala não iniciada) · Anotar (pendência 3)

**SITUAÇÃO:** Acabou papel e sabonete

**CONTEXTO:** O banheiro é o lugar mais perto da logística. Em vez de oferecer um depósito que já está ao lado, a situação deixa preparar o lugar mais caro do mapa: o fundo.

**AÇÃO 1**

- **Nome:** Repor do carrinho
- **O que o jogador faz:** Usa o que você traz.
- **Custo:** B, R+1.
- **Benefício:** Conclui.
- **Consequência futura:** Uma carga a menos.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Pedir uma caixa no fundo
- **O que o jogador faz:** Liga para o almoxarifado.
- **Custo:** B, R + 3 min ao telefone.
- **Benefício:** No minuto atual +15, surge um estoque de 4 cargas na escada (71,5 m).
- **Consequência futura:** Quem for ao fundo depois recarrega lá, sem voltar 63 m.
- **Impacto na rota:** Prepara a região mais cara; inútil se o fundo já foi feito.

**AÇÃO 3**

- **Nome:** Repor na volta do depósito
- **O que o jogador faz:** Anota e segue.
- **Custo:** B, R.
- **Benefício:** Nada extra agora.
- **Consequência futura:** Pendência de 2 min, sem material.
- **Impacto na rota:** De graça se você volta para recarregar (o depósito é vizinho); senão, uma volta de até 67 m.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Material agora, preparar o fundo, ou uma pendência amarrada ao depósito. A primeira é local; as outras duas são apostas sobre a sua rota.

### 14. O turno da manhã já passou aqui

**Decisão:** Redesenhar completamente · **Onde:** Banheiros · **Mecânicas:** N11 · Informação

**Hoje:** Só conferir (B/2) · Recolher a sobra (+3 cargas) · Seguir embalado (−2 min × 2)

**SITUAÇÃO:** O turno da manhã já passou aqui

**CONTEXTO:** O turno anterior deixa material e informação. Informação é a moeda que o catálogo ainda não usa.

**AÇÃO 1**

- **Nome:** Só conferir
- **O que o jogador faz:** Confere e fecha.
- **Custo:** B/2, 1 carga.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Ler o caderno de ocorrências
- **O que o jogador faz:** Lê o que a manhã anotou.
- **Custo:** B, R + 2 min.
- **Benefício:** Revela a situação das 2 salas por fazer mais próximas.
- **Consequência futura:** Esses sorteios ficam fixos: você escolhe a ordem sabendo o que vem.
- **Impacto na rota:** Informação para reordenar a rota, evitando ou buscando uma situação.

**AÇÃO 3**

- **Nome:** Recolher o que sobrou
- **O que o jogador faz:** Junta o material esquecido.
- **Custo:** B+2, R.
- **Benefício:** +3 cargas.
- **Consequência futura:** Pode adiar ou eliminar uma recarga.
- **Impacto na rota:** Vale mais perto do limite de material.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, informação ou material: três moedas diferentes, e nenhuma vira as outras.

### 15. Carrinho da manutenção esquecido

**Decisão:** Redesenhar · **Onde:** Banheiros · **Mecânicas:** N4 · Estoque no mapa, N10 · Favor

**Hoje:** Usar o material deles · Levar a sobra (−1 carga × 3) · Combinar apoio (−1 min × 3)

**SITUAÇÃO:** Carrinho da manutenção esquecido

**CONTEXTO:** Um carrinho esquecido é material com rodas. Pede uma decisão de logística, não um terceiro bônus.

**AÇÃO 1**

- **Nome:** Usar o material deles aqui
- **O que o jogador faz:** Limpa com o carrinho deles.
- **Custo:** B, 0 carga.
- **Benefício:** Poupa R (2 cargas).
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Pedir que deixem o carrinho no meio do corredor
- **O que o jogador faz:** Avisa a manutenção.
- **Custo:** B, R + 2 min.
- **Benefício:** Estoque de 4 cargas em S4/S10 (38 m).
- **Consequência futura:** Cria um ponto de recarga no meio do mapa.
- **Impacto na rota:** Muda onde fica sua virada: pode trocar a volta ao depósito por uma parada no caminho.

**AÇÃO 3**

- **Nome:** Devolver e ganhar um favor
- **O que o jogador faz:** Leva o carrinho até eles.
- **Custo:** B, R + 2 min.
- **Benefício:** Um favor com a equipe.
- **Consequência futura:** O próximo pedido por rádio ou a um colega sai sem espera (liga com as situações 2, 10, 11 e 21).
- **Impacto na rota:** Vale mais se você espera precisar de ajuda longe da base.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Material agora, preparar o meio do mapa, ou crédito para uma decisão futura. É a situação que mais conversa com as outras.

### 16. Escada enlameada

**Decisão:** Redesenhar · **Onde:** Escada · **Mecânicas:** N3 · Efeito regional, N5 · Delegar a um colega

**Hoje:** Lavar degrau por degrau (B+6, R+1) · Raspar (pendência 4) · Sinalizar (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Escada enlameada

**CONTEXTO:** A escada fica a 63,5 m do depósito, o fim natural do corredor. O que importa é de onde você veio.

**AÇÃO 1**

- **Nome:** Lavar degrau por degrau
- **O que o jogador faz:** Resolve tudo.
- **Custo:** B+5, R+1.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** A carga extra, no ponto mais longe do depósito, é cara com o carrinho baixo.

**AÇÃO 2**

- **Nome:** Raspar o barro e seguir
- **O que o jogador faz:** Tira o grosso.
- **Custo:** B/2, R.
- **Benefício:** Conclui rápido.
- **Consequência futura:** Você espalha lama: S1 e S7 (a 6,5 m), se ainda não foram limpas, custam +2 min cada.
- **Impacto na rota:** De graça se você veio de S1/S7 (a escada é a última); caro se ela é a primeira do fundo.

**AÇÃO 3**

- **Nome:** Chamar a portaria
- **O que o jogador faz:** A portaria cuida da escada.
- **Custo:** R+1 (você entrega o produto), 1 min.
- **Benefício:** A escada conclui sozinha no minuto atual +20.
- **Consequência futura:** Fica bloqueada até lá; se você acabar antes, espera.
- **Impacto na rota:** Boa cedo no turno; arriscada se a escada era sua última parada.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo e material, uma penalidade que depende da direção em que você veio, ou delegar. A mesma escada é a primeira ou a última parada, e isso inverte a melhor escolha.

### 17. Poeira de obra

**Decisão:** Redesenhar · **Onde:** Escada · **Mecânicas:** N2 · Pendência que piora, N3 · Efeito regional

**Hoje:** Varrer e passar pano (B+4) · Só varrer (sem carga, pendência B/2+3) · Esperar a obra (+4 de sujeira, novo sorteio)

**SITUAÇÃO:** Poeira de obra

**CONTEXTO:** A obra continua. A poeira volta, e desce pelo corredor.

**AÇÃO 1**

- **Nome:** Varrer e passar pano
- **O que o jogador faz:** Faz completo.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Só varrer
- **O que o jogador faz:** Varre sem molhar.
- **Custo:** B/2, 0 carga.
- **Benefício:** Poupa material no ponto mais longe do depósito.
- **Consequência futura:** Pendência de B/2 que cresce +1 a cada 10 min (a poeira volta).
- **Impacto na rota:** Só vale com volta rápida, por exemplo S1/S7 e de volta (6,5 m).

**AÇÃO 3**

- **Nome:** Fechar a porta corta-fogo
- **O que o jogador faz:** Isola a escada do corredor.
- **Custo:** B+2, R.
- **Benefício:** Conclui.
- **Consequência futura:** S1, S7, S2 e S8, se ainda não foram limpas, custam −1 min cada.
- **Impacto na rota:** Vale se você começou pelo fundo; inútil se o fundo já foi feito.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo; material com uma pendência que piora; ou investir na região, e isso depende da direção.

### 18. Fluxo constante na escada

**Decisão:** Redesenhar · **Onde:** Escada · **Mecânicas:** N6 · Trecho do corredor, Secagem, R1 · Voltar sem novo sorteio

**Hoje:** Interditar (B+3) · Entre intervalos (pendência 2) · Voltar depois (+3 de sujeira, novo sorteio)

**SITUAÇÃO:** Fluxo constante na escada

**CONTEXTO:** Alunos sobem e descem sem parar. Interditar muda por onde eles passam; o fluxo diminui no fim do turno.

**AÇÃO 1**

- **Nome:** Interditar e limpar
- **O que o jogador faz:** Fecha a escada.
- **Custo:** B+1, R.
- **Benefício:** Conclui.
- **Consequência futura:** Os alunos desviam pelo fundo do corredor: o trecho de 55 a 71,5 m fica lento (×2) por 10 min.
- **Impacto na rota:** Ruim se você ainda vai trabalhar em S1/S7/S2/S8 agora; de graça se está saindo do fundo.

**AÇÃO 2**

- **Nome:** Limpar entre os intervalos
- **O que o jogador faz:** Faz metade agora.
- **Custo:** B/2, R.
- **Benefício:** Barato agora.
- **Consequência futura:** Bloqueada 10 min, depois pendência de B/2.
- **Impacto na rota:** Só compensa com salas do fundo para fazer nesse meio-tempo.

**AÇÃO 3**

- **Nome:** Deixar para o fim do turno
- **O que o jogador faz:** Sai sem limpar.
- **Custo:** 0 agora.
- **Benefício:** Depois do minuto 100, o fluxo acaba: a escada custa B−2.
- **Consequência futura:** Antes disso, a mesma situação se repete (sem novo sorteio).
- **Impacto na rota:** Premia quem planeja terminar o turno na escada, o fim natural do corredor.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Custo no corredor, espera e volta, ou planejar o fim do turno. A terceira é uma decisão sobre a rota inteira, não sobre esta sala.

### 19. A portaria já passou a vassoura

**Decisão:** Redesenhar completamente · **Onde:** Escada · **Mecânicas:** N3 · Efeito regional

**Hoje:** Só o pano (B/2) · Encerar (−2 min × 2, R+1) · Sem material (B, 0 carga)

**SITUAÇÃO:** A portaria já passou a vassoura

**CONTEXTO:** Oportunidade no ponto mais longe do depósito: é lá que material vale mais.

**AÇÃO 1**

- **Nome:** Só o pano
- **O que o jogador faz:** Passa o pano e fecha.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Encerar o patamar do fundo
- **O que o jogador faz:** Aproveita e encera o acesso às salas.
- **Custo:** B+2, R+1.
- **Benefício:** S1, S7, S2 e S8, se ainda não foram limpas, custam −2 min cada.
- **Consequência futura:** Vale só no fundo.
- **Impacto na rota:** Vale se você começou pelo fundo; inútil se a escada é a última.

**AÇÃO 3**

- **Nome:** Pedir o carrinho de apoio da portaria
- **O que o jogador faz:** A portaria empresta material.
- **Custo:** B, R + 3 min de espera.
- **Benefício:** +4 cargas, no ponto mais longe do depósito.
- **Consequência futura:** Pode eliminar a volta de 63,5 m.
- **Impacto na rota:** Essencial com o carrinho baixo e o fundo pela frente; inútil com o carrinho cheio.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, região ou material exatamente onde ele é mais caro.

### 20. Falta de água no bloco

**Decisão:** Redesenhar · **Onde:** Qualquer ambiente · **Mecânicas:** Secagem, RR · Recarga mais rápida, R1 · Voltar sem novo sorteio

**Hoje:** Racionar (B+3) · Limpeza seca (B/2, pendência B/2+2) · Esperar a água (bloqueia 10 min, novo sorteio)

**SITUAÇÃO:** Falta de água no bloco

**CONTEXTO:** A água volta em 20 min. É um evento do bloco inteiro: a pergunta é o que fazer com esses 20 minutos.

**AÇÃO 1**

- **Nome:** Racionar o balde
- **O que o jogador faz:** Limpa com o que tem.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Seco agora, úmido quando a água voltar
- **O que o jogador faz:** Varre e deixa o pano para depois.
- **Custo:** B/2, 1 carga.
- **Benefício:** Barato agora.
- **Consequência futura:** Sala bloqueada 20 min, depois pendência de B/2.
- **Impacto na rota:** Boa se você passa aqui de novo depois dos 20 min.

**AÇÃO 3**

- **Nome:** Usar a pausa para a logística
- **O que o jogador faz:** Sai sem limpar e vai cuidar do carrinho.
- **Custo:** 0 agora (sala por fazer, sem novo sorteio).
- **Benefício:** Se você recarregar nos próximos 20 min, a recarga leva 1 min em vez de 4 (o almoxarife está parado e ajuda).
- **Consequência futura:** A sala continua por fazer.
- **Impacto na rota:** Excelente se sua virada para o depósito é agora; inútil longe dela.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Resolver com esforço, esperar e voltar, ou transformar o problema em logística. A terceira só existe por causa da posição do depósito.

### 21. Colega de turno passa por aqui

**Decisão:** Redesenhar · **Onde:** Qualquer ambiente · **Mecânicas:** N5 · Delegar a um colega

**Hoje:** Ajuda aqui (B/2) · Repor o carrinho (+3 cargas) · Adiantar a rota (−2 min × 2)

**SITUAÇÃO:** Colega de turno passa por aqui

**CONTEXTO:** Um colega livre é a maior alavanca de rota do jogo: ele pode ir aonde você não quer ir.

**AÇÃO 1**

- **Nome:** Ajuda aqui
- **O que o jogador faz:** Dividem esta sala.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Assumir as salas mais distantes
- **O que o jogador faz:** O colega pega o par por fazer mais longe do depósito.
- **Custo:** B, R aqui + o material das duas salas.
- **Benefício:** As duas concluem sozinhas no minuto atual +25.
- **Consequência futura:** Ficam bloqueadas até lá.
- **Impacto na rota:** Pode cortar a ida ao fundo, até 127 m de ida e volta. Enorme se o fundo está intocado; inútil se já foi feito.

**AÇÃO 3**

- **Nome:** Repor seu carrinho
- **O que o jogador faz:** O colega traz material.
- **Custo:** B, R.
- **Benefício:** +4 cargas.
- **Consequência futura:** Pode eliminar uma recarga.
- **Impacto na rota:** Vale mais perto do limite de material.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, encurtar a rota inteira ou material. A segunda muda o formato do turno; seu valor vai de zero a enorme conforme o que resta.

### 22. Enceradeira livre hoje

**Decisão:** Ajustar · **Onde:** Salas · **Mecânicas:** N3 · Efeito regional

**Hoje:** Usar aqui (B/2, R+1) · Reservar (−2 min × 3) · Passar ao colega (−1 carga × 2)

**SITUAÇÃO:** Enceradeira livre hoje

**CONTEXTO:** A travessia entre salas do mesmo par é de graça, então hoje os lados do corredor não importam. A enceradeira faz o lado importar.

**AÇÃO 1**

- **Nome:** Usar aqui
- **O que o jogador faz:** Encera esta sala.
- **Custo:** B/2, R+1.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Reservar para o seu lado
- **O que o jogador faz:** Leva a enceradeira pelo lado atual do corredor.
- **Custo:** B, R.
- **Benefício:** As próximas 3 salas DO MESMO LADO (S1–S6 ou S7–S12) custam −2 min.
- **Consequência futura:** Só no lado escolhido.
- **Impacto na rota:** Premia seguir por um lado; quem zigue-zagueia entre os pares aproveita menos.

**AÇÃO 3**

- **Nome:** Emprestar ao colega
- **O que o jogador faz:** Passa adiante.
- **Custo:** B, R.
- **Benefício:** As próximas 2 salas custam −1 carga.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Vale mais perto do limite de material.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo agora, uma rota por um lado, ou material.

### 23. Evento cancelado

**Decisão:** Ajustar · **Onde:** Salas · **Mecânicas:** Bloquear ou liberar a vizinha, N3 · Efeito regional

**Hoje:** Limpar agora (B/2) · Adiantar (−2 min × 2) · Assumir o que ficou (sem carga, libera um bloqueado)

**SITUAÇÃO:** Evento cancelado

**CONTEXTO:** Boa situação de interação entre salas. Dois ajustes: dar endereço ao bônus e só oferecer "liberar" quando existe algo bloqueado.

**AÇÃO 1**

- **Nome:** Limpar agora
- **O que o jogador faz:** Aproveita a sala vazia.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Adiantar as vizinhas
- **O que o jogador faz:** Usa o tempo livre nas salas ao lado.
- **Custo:** B, R.
- **Benefício:** Salas por fazer a até 10 m custam −2 min.
- **Consequência futura:** Só na região.
- **Impacto na rota:** Vale no meio de uma região ainda por fazer.

**AÇÃO 3**

- **Nome:** Assumir o que ficou
- **O que o jogador faz:** Libera outra sala bloqueada.
- **Custo:** B, 0 carga.
- **Benefício:** Libera o ambiente bloqueado mais próximo.
- **Consequência futura:** Desfaz um bloqueio e reabre a rota.
- **Impacto na rota:** Só aparece se existe algo bloqueado (condição nova na ação).

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, região ou reabrir a rota.

### 24. Sala sem torneira

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** N1 · Custo pela distância, Secagem

**Hoje:** Duas viagens (B+2) · Balde grande (R+1) · Parte seca (pendência 2)

**SITUAÇÃO:** Sala sem torneira

**CONTEXTO:** A água vem do banheiro, na base (4 m). A torneira passa a existir no mapa: quanto mais longe, mais cara a água.

**AÇÃO 1**

- **Nome:** Buscar água no banheiro
- **O que o jogador faz:** Faz a viagem com o balde.
- **Custo:** B + d(WC)/5 min (S6: 2,8; S3: 8,2; S1: 12,2).
- **Benefício:** Conclui sem gastar carga extra.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Barata na base, cara no fundo.

**AÇÃO 2**

- **Nome:** Balde grande
- **O que o jogador faz:** Uma viagem, mais produto.
- **Custo:** B, R+1.
- **Benefício:** Conclui.
- **Consequência futura:** Uma carga a menos.
- **Impacto na rota:** Custo fixo em qualquer lugar.

**AÇÃO 3**

- **Nome:** Parte seca agora, úmida na volta
- **O que o jogador faz:** Deixa o pano para quando passar de novo.
- **Custo:** B/2, R.
- **Benefício:** Barato agora.
- **Consequência futura:** Pendência de 1 min; a água vem do banheiro na sua próxima passagem pela base.
- **Impacto na rota:** De graça se você volta para recarregar; senão, uma volta.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** O preço da água depende da posição, o do balde é fixo, e a terceira depende da rota. Existe uma sala em que cada uma é a melhor.

### 25. Sala preparada para prova

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** Secagem, N9 · Risco sorteado

**Hoje:** Contornar (R+1) · Mover e recolocar (B+3) · Só os corredores (B/2, pendência B/2 sem agravo)

**SITUAÇÃO:** Sala preparada para prova

**CONTEXTO:** Prova em andamento até o minuto atual +15. Entrar agora é arriscado; esperar pede uma volta.

**AÇÃO 1**

- **Nome:** Limpar em silêncio
- **O que o jogador faz:** Contorna as carteiras com cuidado.
- **Custo:** B+2, R+1.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Esperar a prova acabar
- **O que o jogador faz:** Volta depois.
- **Custo:** 0 agora.
- **Benefício:** A sala esvazia: a limpeza custa B−1.
- **Consequência futura:** Bloqueada 15 min, depois pendência de B−1.
- **Impacto na rota:** Ótima com vizinhas para fazer nesses 15 min; ruim se você está saindo da região.

**AÇÃO 3**

- **Nome:** Entrar na troca de folhas
- **O que o jogador faz:** Aproveita um intervalo curto.
- **Custo:** B, R.
- **Benefício:** Conclui na hora.
- **Consequência futura:** 1 em 3: o fiscal pede para sair; você perde 2 min e a sala fica pendente com B/2.
- **Impacto na rota:** O risco pesa mais quanto mais caro for voltar.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Certeza cara, espera com volta, ou aposta. A mesma estrutura da janela aberta (8), mas com a espera obrigatória no lugar da secagem.

### 26. Murais de fim de semestre

**Decisão:** Manter · **Onde:** Salas · **Mecânicas:** Ida ao depósito ou à entrada

**Hoje:** Desmontar tudo (B+3) · Ensacar (R+1) · Descer o volume (vai ao depósito e recarrega)

Tempo, material e uma ida real ao depósito: três estratégias diferentes, uma delas posicional (quase de graça na base, cara no fundo). Manter.

### 27. Ar-condicionado pingando

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** N2 · Pendência que piora, N3 · Efeito regional

**Hoje:** Esvaziar e desligar (B+4) · Bacia (pendência 3) · Sinalizar (+4 de sujeira, novo sorteio)

**SITUAÇÃO:** Ar-condicionado pingando

**CONTEXTO:** A bandeja enche com o tempo. E todos os aparelhos daquele lado dividem o mesmo circuito.

**AÇÃO 1**

- **Nome:** Esvaziar a bandeja e desligar
- **O que o jogador faz:** Resolve este aparelho.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Bacia embaixo
- **O que o jogador faz:** Põe uma bacia e segue.
- **Custo:** B, R.
- **Benefício:** Conclui quase tudo.
- **Consequência futura:** Pendência de 1 min que cresce +1 a cada 5 min (a bacia enche).
- **Impacto na rota:** Só compensa com volta rápida (a sala da frente ou a vizinha); vira armadilha se você esquece.

**AÇÃO 3**

- **Nome:** Desligar o disjuntor da ala
- **O que o jogador faz:** Corta todos os aparelhos deste lado.
- **Custo:** B+1, R.
- **Benefício:** Conclui quase no tempo normal.
- **Consequência futura:** As salas por fazer do MESMO LADO ficam abafadas: +1 min cada.
- **Impacto na rota:** Boa no fim do turno, com pouco a fazer naquele lado; ruim no começo.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo; uma pendência com relógio; ou um atalho que cobra do seu lado do corredor. O valor da terceira cresce conforme o lado vai ficando pronto.

### 28. Banheiro recém-reformado

**Decisão:** Redesenhar completamente · **Onde:** Banheiros · **Mecânicas:** N3 · Efeito regional, N10 · Favor

**Hoje:** Aproveitar (B/2) · A fundo (−2 min × 2) · Sem produto (B+2, sem carga)

**SITUAÇÃO:** Banheiro recém-reformado

**CONTEXTO:** A reforma deixou uma lavadora de piso nova e uma equipe de manutenção por perto.

**AÇÃO 1**

- **Nome:** Aproveitar e fechar
- **O que o jogador faz:** Só confere.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Levar a lavadora para o outro banheiro e a escada
- **O que o jogador faz:** Reserva o equipamento para ambientes do mesmo tipo.
- **Custo:** B+1, R.
- **Benefício:** O próximo banheiro e a escada custam −3 min.
- **Consequência futura:** Vale só para esses dois.
- **Impacto na rota:** O outro banheiro fica a 0 m (vale já); a escada, a 67,5 m, só vale se ainda está por fazer.

**AÇÃO 3**

- **Nome:** Ceder o banheiro de base para a manutenção
- **O que o jogador faz:** Deixa a equipe usar o espaço.
- **Custo:** B, R + 2 min.
- **Benefício:** Um favor com a equipe.
- **Consequência futura:** O próximo pedido por rádio ou a um colega sai sem espera.
- **Impacto na rota:** Vale se você espera precisar de ajuda longe da base.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, um bônus por tipo de ambiente, ou crédito para depois.

### 29. Entrega de material no andar

**Decisão:** Ajustar · **Onde:** Salas e banheiros · **Mecânicas:** N4 · Estoque no mapa

**Hoje:** Parar e estocar (−2 cargas × 2) · Pegar de passagem (+2 cargas) · Deixar com o colega (−2 min × 2)

**SITUAÇÃO:** Entrega de material no andar

**CONTEXTO:** A entrega está no andar e pode ir para onde você quiser.

**AÇÃO 1**

- **Nome:** Pegar de passagem
- **O que o jogador faz:** Pega umas caixas.
- **Custo:** B, R.
- **Benefício:** +2 cargas.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Pedir que deixem as caixas no fundo
- **O que o jogador faz:** Indica onde descarregar.
- **Custo:** B, R + 1 min.
- **Benefício:** Estoque de 5 cargas em S2/S8 (55 m).
- **Consequência futura:** Um ponto de recarga na região mais cara.
- **Impacto na rota:** Inútil se o fundo já foi feito ou se você não vai precisar.

**AÇÃO 3**

- **Nome:** Parar e estocar tudo
- **O que o jogador faz:** Descarrega com calma.
- **Custo:** B, R + 3 min.
- **Benefício:** +5 cargas agora.
- **Consequência futura:** Pode eliminar uma recarga.
- **Impacto na rota:** Vale mais longe do depósito.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Pouco agora e de graça, muito agora com tempo, ou material onde ele vai faltar.

### 30. Carrinho desorganizado

**Decisão:** Redesenhar · **Onde:** Salas e banheiros · **Mecânicas:** RR · Recarga mais rápida, N3 · Efeito regional

**Hoje:** Organizar (−1 min × 3) · Sem repor (B+3, sem carga) · Pano de reserva (B/2, R+1)

**SITUAÇÃO:** Carrinho desorganizado

**CONTEXTO:** O carrinho está uma bagunça. Arrumar custa tempo; descartar o vencido mexe na próxima recarga.

**AÇÃO 1**

- **Nome:** Organizar agora
- **O que o jogador faz:** Arruma o carrinho.
- **Custo:** B+2, R.
- **Benefício:** As próximas 4 salas custam −1 min.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Vale no começo do turno.

**AÇÃO 2**

- **Nome:** Pano de reserva
- **O que o jogador faz:** Usa o que achar primeiro.
- **Custo:** B/2, R+1.
- **Benefício:** Tempo agora.
- **Consequência futura:** Uma carga a menos.
- **Impacto na rota:** Neutra.

**AÇÃO 3**

- **Nome:** Descartar o que está vencido
- **O que o jogador faz:** Joga fora o que não presta.
- **Custo:** B, R, e perde 2 cargas.
- **Benefício:** A próxima recarga leva 1 min em vez de 4.
- **Consequência futura:** Você chega ao depósito sabendo o que falta.
- **Impacto na rota:** Vale se a recarga é iminente; ruim se você tentava evitá-la.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Investir em tempo, gastar material, ou apostar na recarga. A terceira só é boa perto da sua virada para o depósito.

### 31. Visita da direção hoje

**Decisão:** Redesenhar · **Onde:** Salas · **Mecânicas:** N7 · Prazo, N10 · Favor

**Hoje:** Caprichar (−2 min × 2) · Fechar antes (B/2) · Avisar a ala (−1 carga × 2)

**SITUAÇÃO:** Visita da direção hoje

**CONTEXTO:** A direção vai passar por este trecho do corredor em 15 min.

**AÇÃO 1**

- **Nome:** Fechar rápido e sair
- **O que o jogador faz:** Termina antes da visita.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência futura:** Nenhuma.
- **Impacto na rota:** Neutra.

**AÇÃO 2**

- **Nome:** Mostrar o serviço
- **O que o jogador faz:** Acompanha a visita.
- **Custo:** B, R + 3 min.
- **Benefício:** Um favor: a direção autoriza apoio.
- **Consequência futura:** O próximo pedido por rádio ou a um colega sai sem espera.
- **Impacto na rota:** Vale se você espera precisar de ajuda.

**AÇÃO 3**

- **Nome:** Deixar o caminho da visita pronto
- **O que o jogador faz:** Promete o trecho limpo.
- **Custo:** B, R.
- **Benefício:** Se a sala da frente e as vizinhas a até 10 m estiverem concluídas em 15 min: −5 min no total.
- **Consequência futura:** Se não estiverem: +3 min (retrabalho).
- **Impacto na rota:** Obriga a ficar nesta região agora. Ótima com as vizinhas por fazer; arriscada se você ia sair.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Tempo, favor ou um prazo que reorganiza a rota local.

### 32. Pedido da coordenação

**Decisão:** Ajustar · **Onde:** Qualquer ambiente · **Mecânicas:** N7 · Prazo, Bloquear ou liberar a vizinha, R1 · Voltar sem novo sorteio

**Hoje:** Atender agora (B+3) · Atender no fim (pendência 2) · Atender em outro (bloqueia a vizinha 10 min)

**SITUAÇÃO:** Pedido da coordenação

**CONTEXTO:** A coordenação marca uma reunião, daqui a 30 min, na sala por fazer mais distante daqui.

**AÇÃO 1**

- **Nome:** Largar tudo e ir
- **O que o jogador faz:** Esta sala fica por fazer (sem novo sorteio).
- **Custo:** 0 agora.
- **Benefício:** Prazo de 30 min na sala da reunião: a tempo, −4 min no total.
- **Consequência futura:** Atrasou: +5 min.
- **Impacto na rota:** Puxa você para o outro extremo agora. Ótima se você já ia para lá.

**AÇÃO 2**

- **Nome:** Negociar mais prazo
- **O que o jogador faz:** Pede para a reunião ser mais tarde.
- **Custo:** B, R + 3 min.
- **Benefício:** Conclui esta sala; o prazo passa a 60 min, sem bônus.
- **Consequência futura:** Atrasou: +5 min.
- **Impacto na rota:** Mantém sua rota com uma restrição suave.

**AÇÃO 3**

- **Nome:** Recusar
- **O que o jogador faz:** Segue sua rota.
- **Custo:** B, R.
- **Benefício:** Conclui esta sala.
- **Consequência futura:** A sala da reunião fica bloqueada 20 min e suja: +2 min.
- **Impacto na rota:** Neutra agora; cobra depois, lá longe.

**POR QUE AS 3 ESCOLHAS SÃO DIFERENTES:** Mudar a rota agora, aceitar uma restrição, ou pagar mais tarde num lugar específico. As três falam de outra sala, não desta.

## Como implementar

Quantas situações usam cada mecânica depois do redesenho. Nenhuma domina o catálogo. A Informação só aparece em uma situação: é a candidata natural a ficar para depois, ou a ganhar uma segunda situação.

| Mecânica | Situações |
|---|--:|
| N3 · Efeito regional | 11 |
| Secagem | 10 |
| R1 · Voltar sem novo sorteio | 8 |
| Ida ao depósito ou à entrada | 5 |
| N2 · Pendência que piora | 4 |
| Bloquear ou liberar a vizinha | 4 |
| N1 · Custo pela distância | 3 |
| N6 · Trecho do corredor | 3 |
| N5 · Delegar a um colega | 3 |
| N4 · Estoque no mapa | 3 |
| N10 · Favor | 3 |
| N9 · Risco sorteado | 2 |
| RR · Recarga mais rápida | 2 |
| N7 · Prazo | 2 |
| N11 · Informação | 1 |

### Onda 1: fecha os defeitos

- Voltar sem novo sorteio.
- Secagem, com mecânicas que já existem.
- Custo pela distância.
- Efeito regional: raio, lado, tipo e sala da frente.
- Revisar as 11 parciais dominantes.

Sozinha, já desfaz os três moldes e resolve as dominâncias medidas.

### Onda 2: o mapa vira jogo

- Pendência que piora.
- Estoque no mapa.
- Delegar a um colega.
- Trecho do corredor.

Precisa de desenho no mapa: estoques, trechos lentos e salas delegadas têm de aparecer no corredor.

### Onda 3: cadeia e surpresa

- Prazo.
- Risco sorteado.
- Favor.
- Informação.
- Recarga mais rápida.

Ligam uma situação a outra e trazem imprevisibilidade controlada, sempre com o gerador com semente.

### Três cuidados antes de codar

1. **O teste de invariante precisa de moedas novas.** Hoje [`situations.test.ts`](../src/domain/situations.test.ts) compara quatro moedas (tempo, material, pendência, bloqueio). Sem posição, região e prazo, ele reprova ações que só diferem no mapa.
2. **Calibrar com o simulador.** Os números acima são estimativas da rota ótima. O simulador de [`calibracao.test.ts`](../src/domain/calibracao.test.ts) deve rodar a cada onda, para confirmar que nenhuma ação nova virou dominante.
3. **O jogador precisa VER a posição.** A carta deve mostrar o custo já calculado ("espera de 7 min daqui"), e o mapa, a distância até o depósito.

O teste de sucesso: no fim de uma rodada, o jogador consegue apontar uma sala em que a decisão mudou o resto da rota? Com o catálogo de hoje, raramente: só 8 situações mexem na posição do jogador ou em outra sala, e nenhuma deixa algo num lugar específico do mapa. Com o redesenho, todas as 32 têm ao menos uma ação cujo valor muda com a posição ou com a rota que vem depois.
