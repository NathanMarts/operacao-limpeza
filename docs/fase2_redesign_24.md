# Fase 2: redesign das 24 situações restantes

Proposta de game design para revisão. **Nada aqui está implementado.**

As 8 situações da Fase 1 são o padrão de qualidade. Este documento não as copia: extrai os princípios delas e aplica às outras 24, buscando **variedade**, não complexidade.

**Notação.**
- `B` é o tempo base do ambiente e `R` o material dele (1 nas salas e na escada, 2 nos banheiros).
- Posições no corredor, em metros a partir da entrada: banheiros 4, depósito 8, S6/S12 18, S5/S11 28, S4/S10 38, S3/S9 45, S2/S8 55, S1/S7 65, escada 71,5.
- 5 m de caminhada = 1 min.
- Os números são pontos de partida; o simulador e o playtest decidem os finais.

## O que as 8 da Fase 1 ensinaram

Seis princípios que valem para as 24:

1. **A mesma carta vale diferente em lugares diferentes.** Buscar a chave é ótimo na base e quase inútil no fundo; o rádio custa a distância até o material mais próximo.
2. **A consequência tem endereço e aparece no mapa.** Caixa em S2/S8, "−3" em S2 e S8, S1 e S7 com cadeado. Nunca "as próximas 3 salas".
3. **Uma decisão deixa algo para outra decisão usar.** A caixa da entrega vira a reposição do rádio.
4. **O tempo do turno muda o valor.** Delegar é bom cedo e ruim tarde; deixar material no fundo só vale antes de ir para lá.
5. **Adiar é honesto.** A mesma situação espera na volta, então adiar é uma decisão sobre a rota, não um sorteio.
6. **Cada ação é tentadora por um motivo diferente**, e o motivo depende do estado da partida.

## 1. Auditoria resumida das 24

Estado atual, antes do redesign. Desde a Fase 1, "adiar" já não sorteia outra situação (a pendência é persistente), mas o **formato** das cartas continua o antigo.

Colunas:
- **Molde antigo?** Se segue "resolver / parcial / adiar".
- **Adiar disfarçado:** qual ação é só uma versão de "deixar para depois".
- **Dominante:** ação que vence quase sempre (medido na [revisão](revisao_situacoes.md)).
- **Mapa? / Outra sala? / Encadeia?** Se a situação usa a posição, afeta outra sala ou pode alimentar outra decisão.

| # | Situação | Padrão atual | Molde antigo? | Adiar disfarçado | Dominante | Mapa? | Outra sala? | Encadeia? | Oportunidade única (o que só esta situação pode dar) |
|--:|---|---|---|---|---|---|---|---|---|
| 3 | Sala será usada em breve | resolver · parcial · adiar+bloqueio | Sim | Parcial e "Adiar e seguir" | Parcial + volta | Não | Não | Não | Decidir **qual sala** a turma vai ocupar |
| 4 | Lixeiras cheias | depósito · +1 carga · pendência | Parcial | "Deixar o lixo" | "Acumular" com carga sobrando | Sim (depósito) | Não | Fraco | Juntar a viagem do lixo com a recarga |
| 6 | Equipamento quebrado | depósito · resolver · parcial | Sim | "Meia limpeza" | Meia limpeza ≈ improvisar | Sim (depósito) | Não | Não | Arriscar com uma ferramenta ruim |
| 7 | Sala usada em evento | resolver · +1 carga · adiar+bloqueio | Sim | "Pedir para desmontarem" | "Limpar sem mexer" | Não | Não | Não | Decidir **para onde vão as cadeiras** |
| 8 | Janela esquecida aberta | resolver · parcial · adiar+bloqueio | Sim | Duas das três | Parcial + volta | Não | Não | Não | Deixar o tempo trabalhar (o piso seca sozinho) |
| 9 | Turma deixou a sala organizada | rápido · bônus genérico · poupar | Molde "bônus" | Não | Bônus em salas pequenas | Não | Não | Não | A turma vai **para outra sala**: dá para escolher qual |
| 11 | Vaso entupido | resolver · parcial · adiar+bloqueio | Sim | Duas das três | — | Fraco | Não | Não | A manutenção resolve no horário dela, colada ao depósito |
| 12 | Piso alagado | resolver · parcial · adiar+bloqueio | Sim | Duas das três | Rodo + volta | Não | Não | Não | A água tem que ir para algum lugar, **inclusive o depósito** |
| 13 | Acabou papel e sabonete | +1 carga · depósito · pendência | Parcial | "Anotar" | Ir buscar (depósito a 4 m) | Trivial | Não | Não | Fazer um **pedido** que chega depois |
| 14 | O turno da manhã já passou aqui | rápido · material · bônus genérico | Molde "bônus" | Não | Bônus | Não | Não | Não | O caderno da manhã **conta o que tem no bloco** |
| 16 | Escada enlameada | resolver · parcial · adiar+bloqueio | Sim | Duas das três | — | Não | Não | Não | O barro tem direção: **de onde você veio** muda tudo |
| 17 | Poeira de obra | resolver · parcial · adiar | Sim | Duas das três | Só varrer | Não | Não | Não | Proteger o fundo **antes** de limpá-lo |
| 19 | A portaria já passou a vassoura | rápido · bônus genérico · poupar | Molde "bônus" | Não | Só o pano | Não | Não | Não | Ajuda e material **no ponto mais longe do depósito** |
| 20 | Falta de água no bloco | resolver · parcial · adiar+bloqueio | Sim | Duas das três | Seca + volta | Não | Não | Não | Um evento do bloco inteiro com hora para acabar |
| 21 | Colega de turno passa por aqui | rápido · material · bônus genérico | Molde "bônus" | Não | Bônus cedo | Não | Não | Não | Trocar de ponta com alguém: **dividir o mapa** |
| 23 | Evento cancelado | rápido · bônus · liberar | Parcial | Não | — | Sim (liberar) | Sim | Sim | Uma sala vazia no meio do turno vira **ponto de apoio** |
| 24 | Sala sem torneira | resolver · +1 carga · pendência | Sim | "Parte seca" | Balde grande | Não | Não | Não | A água está **em outro lugar**: na sala da frente |
| 25 | Sala preparada para prova | +1 carga · resolver · parcial sem agravo | Sim | "Só entre as fileiras" | Parcial (4 contra 7 min) | Não | Não | Não | Uma prova com **hora certa para acabar** |
| 26 | Murais de fim de semestre | resolver · +1 carga · depósito | Não | Não | — | Sim (depósito) | Não | Fraco | Volume que pode ir **para a ponta que você vai** |
| 27 | Ar-condicionado pingando | resolver · pendência · adiar | Sim | Duas das três | Bacia + volta | Não | Não | Não | Um disjuntor que **desliga um trecho do corredor** |
| 28 | Banheiro recém-reformado | rápido · bônus genérico · poupar | Molde "bônus" | Não | Bônus | Não | Não | Não | Um **equipamento novo** que pode ir para outro ambiente |
| 30 | Carrinho desorganizado | bônus genérico · poupar · +1 carga | Molde "bônus" | Não | Pano de reserva | Não | Não | Não | Pagar a arrumação agora ou **na próxima recarga** |
| 31 | Visita da direção hoje | bônus · rápido · bônus de material | Molde "bônus" | Não | Caprichar | Não | Não | Não | Uma **meta com prazo** que a direção recompensa |
| 32 | Pedido da coordenação | resolver · pendência · bloquear vizinha | Parcial | "Atender no fim" | — | Fraco | Sim | Fraco | Uma sala **lá longe** com hora marcada |

**Em resumo:** 13 das 24 ainda são "resolver / parcial / adiar", 8 são o molde "rápido / bônus genérico / poupar", e só 3 (23, 26, 32) já tocam o mapa de algum jeito. Nenhuma estrutura atual foi preservada só por existir.

## 2. Arquétipo e mecânica principal

| # | Situação | Arquétipo | Mecânica principal | Por que ela existe (teste de função) |
|--:|---|---|---|---|
| 3 | Sala será usada em breve | Interação entre salas | Fechar a sala da frente / efeito com prazo | Fazer o jogador decidir **qual sala perde**: esta, a da frente ou nenhuma |
| 4 | Lixeiras cheias | Logística | Ida ao depósito / espera pela distância | Transformar uma obrigação (lixo) numa **recarga antecipada**, se a posição ajudar |
| 6 | Equipamento quebrado | Risco | Aposta com chance visível | Fazer o jogador **medir o risco pela distância de volta** |
| 7 | Sala usada em evento | Interação entre salas | Fechar a frente / efeito no par | Decidir **onde o problema vai parar**: aqui, na frente ou em nenhum lugar agora |
| 8 | Janela esquecida aberta | Preparação | Secagem (fechar + resíduo) / distância ao banheiro | Deixar **o tempo trabalhar** a seu favor, se a rota voltar por aqui |
| 9 | Turma deixou a sala organizada | Prazo | Bloqueio agendado | Mostrar **um fechamento futuro no mapa** e deixar o jogador escolher a quem ele atinge |
| 11 | Vaso entupido | Cooperação | Delegação com hora | Tirar um ambiente da rota **em troca de depender do relógio** de outra pessoa |
| 12 | Piso alagado | Bloqueio | Fechar os banheiros / **fechar o depósito** | Obrigar a escolher **qual ponto da base** fica indisponível por um tempo |
| 13 | Acabou papel e sabonete | Pedido | Entrega agendada no corredor | Fazer um pedido **agora** que só ajuda **quem estiver no meio do corredor depois** |
| 14 | O turno da manhã já passou aqui | Informação | Revelar uma região | Dar informação sobre **o fundo** antes de o jogador decidir ir até lá |
| 16 | Escada enlameada | Rota | Ida ao depósito a partir da escada / efeito em S1/S7 | Fazer a **direção da rota** decidir o custo |
| 17 | Poeira de obra | Preparação regional | Efeito com prazo na região do fundo | Premiar quem **reorganiza a rota** para limpar o fundo enquanto ele está protegido |
| 19 | A portaria já passou a vassoura | Recurso | Material no ponto mais longe | Oferecer material **onde ele é mais caro** |
| 20 | Falta de água no bloco | Emergência | Secagem até a água voltar / distância ao banheiro | Um problema do bloco inteiro que **a posição resolve** (perto da torneira) ou **o tempo resolve** |
| 21 | Colega de turno passa por aqui | Cooperação | Delegar o par mais distante | **Dividir o mapa** com outra pessoa e redesenhar o turno inteiro |
| 23 | Evento cancelado | Oportunidade | Liberar sala / material no ponto atual | Transformar **uma sala vazia** num ponto de apoio ou numa rota reaberta |
| 24 | Sala sem torneira | Interação entre salas | Efeito na sala da frente | Usar a sala da frente como recurso, **com custo que depende da ordem do par** |
| 25 | Sala preparada para prova | Risco com janela | Aposta / fechar até o intervalo | Escolher entre **arriscar agora** e **esperar a hora certa** |
| 26 | Murais de fim de semestre | Logística de direção | Ida até a escada / efeito na escada | Levar volume **para a ponta aonde você vai**, não sempre para o depósito |
| 27 | Ar-condicionado pingando | Bloqueio regional | Fechar as vizinhas (disjuntor) | Resolver rápido **à custa do trecho**: bom se o trecho já está pronto |
| 28 | Banheiro recém-reformado | Equipamento | Equipamento estacionado na escada | Levar um equipamento **da base para o fundo** e decidir se vale o esforço |
| 30 | Carrinho desorganizado | Logística | Custo pago no depósito | Escolher **onde pagar** a arrumação: aqui, no próximo banheiro ou na próxima recarga |
| 31 | Visita da direção hoje | Prazo | Meta com prazo e recompensa | Criar uma **meta local de curto prazo** que muda a próxima parada |
| 32 | Pedido da coordenação | Prazo à distância | Meta com prazo numa sala distante | Puxar o jogador **para o outro extremo** agora, ou pagar depois |

**Distribuição dos arquétipos:**
- interação entre salas: 3 (3, 7, 24)
- prazo: 3 (9, 31, 32)
- logística: 3 (4, 26, 30)
- cooperação: 2 (11, 21)
- risco: 2 (6, 25)
- preparação: 2 (8, 17)
- bloqueio: 2 (12, 27)
- rota: 1 (16)
- informação: 1 (14)
- recurso: 1 (19)
- oportunidade: 1 (23)
- emergência: 1 (20)
- pedido: 1 (13)
- equipamento: 1 (28)

Somando as 8 da Fase 1 (informação, recurso, delegação e equipamento já estão lá), nenhum arquétipo passa de 5 no catálogo inteiro.

## 3. Redesign completo

### SITUAÇÃO 3 — Sala será usada em breve
**Onde aparece:** salas.

**CONTEXTO:** Uma turma precisa de uma sala em 10 minutos e vai ficar 25. O professor aceita qualquer sala do par.

**OPORTUNIDADE DE GAMEPLAY:** É a única situação em que o jogador decide **qual sala perde** o acesso: esta, a da frente, ou nenhuma (pagando tempo). Ela transforma um bloqueio inevitável numa escolha de rota.

**AÇÃO 1**
- **Nome:** Correr antes da turma
- **O que o jogador faz:** Limpa sob pressão e entrega a sala pronta.
- **Custo:** B+2 min, R.
- **Benefício:** A turma usa esta sala, já limpa; nada fecha.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** É a escolha de quem precisa do par inteiro agora e não quer perder nenhuma sala.

**AÇÃO 2**
- **Nome:** Mandar a turma para a sala da frente
- **O que o jogador faz:** Limpa esta com calma; a turma ocupa a sala do outro lado.
- **Custo:** B, R.
- **Benefício:** Sem pressa aqui.
- **Consequência:** A sala da frente fica **fechada por 25 min** (cadeado no mapa). Se ela já estava limpa, isso não custa nada.
- **Impacto na rota:** Se a frente ainda estava por fazer, sai da rota agora e volta depois.
- **O que torna essa ação interessante:** Perfeita quando a frente já foi feita; cara quando a frente era a próxima parada.

**AÇÃO 3**
- **Nome:** Ceder esta sala e aproveitar a que a turma deixou
- **O que o jogador faz:** Deixa a turma entrar aqui e vai para a sala que ela desocupou.
- **Custo:** 0 agora.
- **Benefício:** A sala por fazer mais próxima **em outra estação** está vazia agora: −3 min nela por 10 min.
- **Consequência:** Esta sala fica **fechada por 25 min** e depois volta como pendência de B+2 (a aula suja).
- **Impacto na rota:** Muda a próxima parada, com hora para chegar.
- **O que torna essa ação interessante:** Troca uma sala agora por uma oportunidade em outra estação; boa para quem ia mesmo para lá.

**DIFERENÇA ENTRE AS 3:** Pagar tempo para manter tudo aberto, empurrar o fechamento para a frente, ou trocar de sala e seguir a oportunidade.

**ENCADEAMENTO:**
- A frente fechada conversa com "Pedir a chave" (outra sala fechada) e com "Evento cancelado" (que libera salas fechadas).
- A informação dos Alunos (Fase 1) ou do Turno da manhã (14) pode revelar esta situação antes: o jogador chega sabendo o que fazer com a frente.

### SITUAÇÃO 4 — Lixeiras cheias
**Onde aparece:** salas e banheiros.

**CONTEXTO:** As lixeiras transbordaram. O lixo precisa sair daqui de algum jeito.

**OPORTUNIDADE DE GAMEPLAY:** Transformar uma obrigação numa **recarga antecipada**. A mesma carta é quase grátis perto da virada para o depósito e cara no fundo.

**AÇÃO 1**
- **Nome:** Levar ao depósito e aproveitar para recarregar
- **O que o jogador faz:** Fecha a sala e desce com os sacos.
- **Custo:** B, R + ida ao depósito (distância real) + 2 min.
- **Benefício:** Conclui e recarrega (carrinho cheio).
- **Consequência:** Sua posição passa a ser o depósito.
- **Impacto na rota:** Você vira na base agora. Bom se a virada já estava perto.
- **O que torna essa ação interessante:** Casa duas tarefas numa viagem, se a posição ajudar.

**AÇÃO 2**
- **Nome:** Compactar no carrinho
- **O que o jogador faz:** Fecha a sala e leva os sacos junto.
- **Custo:** B, R+1.
- **Benefício:** Conclui sem desvio.
- **Consequência:** Uma carga a menos no carrinho.
- **Impacto na rota:** Nenhum agora; pode adiantar a próxima recarga.
- **O que torna essa ação interessante:** Boa com carga sobrando e longe do depósito.

**AÇÃO 3**
- **Nome:** Chamar a coleta pelo rádio
- **O que o jogador faz:** Fecha a sala e espera o colega da coleta.
- **Custo:** B, R + espera de d(DEP)/5 + 1 min.
- **Benefício:** Conclui sem sair do lugar e sem gastar carga extra.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** A espera cresce com a distância. Barata perto da base, e é a saída de quem está sem carga sobrando e não quer virar.

**DIFERENÇA ENTRE AS 3:** Você vai (e muda de posição), você carrega (material), ou alguém vem (tempo pela distância).

**ENCADEAMENTO:**
- Levar ao depósito evita "Material acabando" logo depois.
- Se o depósito estiver fechado (situação 12), a ação 1 fica indisponível: uma decisão anterior muda esta.

### SITUAÇÃO 6 — Equipamento quebrado
**Onde aparece:** qualquer ambiente.

**CONTEXTO:** O mop quebrou no meio do serviço.

**OPORTUNIDADE DE GAMEPLAY:** É a situação de **risco**: o jogador mede a aposta pela distância que teria de voltar se der errado.

**AÇÃO 1**
- **Nome:** Buscar outro no depósito
- **O que o jogador faz:** Vai ao depósito, troca o equipamento e aproveita para recarregar.
- **Custo:** Ida ao depósito agora; esta sala vira pendência de B (sem nova situação).
- **Benefício:** Equipamento novo e carrinho cheio.
- **Consequência:** Você precisa voltar a esta sala.
- **Impacto na rota:** Vira a rota para a base agora.
- **O que torna essa ação interessante:** Resolve a causa; quase de graça na zona de retorno, caríssima no fundo.

**AÇÃO 2**
- **Nome:** Improvisar à mão
- **O que o jogador faz:** Termina com pano e balde.
- **Custo:** B+4, R+1.
- **Benefício:** Conclui com certeza.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** A saída segura para quem não pode arriscar.

**AÇÃO 3**
- **Nome:** Seguir com o remendo
- **O que o jogador faz:** Prende com fita e continua.
- **Custo:** B, R.
- **Benefício:** Conclui no tempo normal, se aguentar.
- **Consequência:** **1 em 3:** o remendo solta e a sala vira pendência de 4 min. A carta mostra a chance **e quanto custaria voltar daqui**.
- **Impacto na rota:** Se der errado, obriga uma volta.
- **O que torna essa ação interessante:** A aposta é boa perto de casa e ruim no fundo; o jogador olha o mapa para decidir.

**DIFERENÇA ENTRE AS 3:** Resolver a causa mudando de posição, pagar pela certeza, ou apostar pesando a distância.

**ENCADEAMENTO:**
- A ida ao depósito combina com "Lixeiras" e "Material acabando": a mesma viagem resolve várias coisas.
- O depósito fechado (12) bloqueia a ação 1.

### SITUAÇÃO 7 — Sala usada em evento
**Onde aparece:** salas.

**CONTEXTO:** Um evento deixou as cadeiras em círculo. As cadeiras precisam ir para algum lugar.

**OPORTUNIDADE DE GAMEPLAY:** Decidir **onde o problema vai parar**. É a situação do par de salas: ela conversa com a sala da frente como nenhuma outra.

**AÇÃO 1**
- **Nome:** Reorganizar sozinho
- **O que o jogador faz:** Arruma e limpa.
- **Custo:** B+4, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Quando os dois lados do par ainda estão por fazer e você não quer perder nenhum.

**AÇÃO 2**
- **Nome:** Empilhar as cadeiras na sala da frente
- **O que o jogador faz:** Leva as cadeiras para o outro lado do corredor.
- **Custo:** B+1, R.
- **Benefício:** Conclui quase no tempo normal.
- **Consequência:** A sala da frente fica **fechada por 15 min**, se ainda por fazer.
- **Impacto na rota:** Muda a ordem do par.
- **O que torna essa ação interessante:** De graça se a frente já foi feita.

**AÇÃO 3**
- **Nome:** Chamar a equipe do evento para desmontar o par
- **O que o jogador faz:** Combina que a equipe desmonta aqui e na frente.
- **Custo:** 0 agora.
- **Benefício:** Esta sala e a da frente ficam **−3 min cada** depois.
- **Consequência:** As duas ficam **fechadas por 10 min**. Depois, esta sala volta como limpeza simples, sem nova situação e com o −3 já aplicado.
- **Impacto na rota:** Você sai desta estação agora e volta depois.
- **O que torna essa ação interessante:** Boa no meio de uma região que você vai revisitar; o par inteiro fica mais barato.

**DIFERENÇA ENTRE AS 3:** Pagar aqui, empurrar para a frente, ou tirar o par da rota por 10 min e voltar para um par mais barato.

**ENCADEAMENTO:**
- A informação (Alunos, Turno da manhã) pode revelar este evento antes: o jogador limpa a frente primeiro e depois empilha nela de graça.
- "Evento cancelado" (23) pode liberar a frente fechada.

### SITUAÇÃO 8 — Janela esquecida aberta
**Onde aparece:** salas.

**CONTEXTO:** Choveu dentro da sala. O piso está molhado, mas seca sozinho com o tempo.

**OPORTUNIDADE DE GAMEPLAY:** A única situação em que **o tempo trabalha a favor** do jogador, se a rota voltar por aqui na hora certa.

**AÇÃO 1**
- **Nome:** Secar tudo com panos extras
- **O que o jogador faz:** Resolve de uma vez.
- **Custo:** B+3, R+1.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Certeza, gastando material.

**AÇÃO 2**
- **Nome:** Fechar e deixar secando
- **O que o jogador faz:** Fecha a janela e segue.
- **Custo:** B/2, R.
- **Benefício:** Total de B/2+1.
- **Consequência:** A sala fica **fechada por 12 min**; depois, pendência de 1 min.
- **Impacto na rota:** Você precisa passar aqui de novo **depois** de 12 min.
- **O que torna essa ação interessante:** Excelente na zona de retorno (antes da virada para o depósito); ruim no fundo.

**AÇÃO 3**
- **Nome:** Levar a água no balde até o banheiro
- **O que o jogador faz:** Recolhe a água e esvazia no banheiro.
- **Custo:** B + d(banheiro)/5 min, R.
- **Benefício:** Conclui sem gastar material extra.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Barata perto dos banheiros (na base), cara no fundo. É o contrário da ação 1, que custa o mesmo em qualquer lugar.

**DIFERENÇA ENTRE AS 3:** Material fixo, tempo que depende da volta, ou tempo que depende da distância até a água.

**ENCADEAMENTO:**
- A ação 2 casa com a virada para recarregar: quem vai ao depósito e volta passa por aqui depois de 12 min.
- "Evento cancelado" pode liberar a sala fechada.

### SITUAÇÃO 9 — Turma deixou a sala organizada
**Onde aparece:** salas.

**CONTEXTO:** A turma deixou tudo arrumado e vai para outra aula: em 10 minutos ela ocupa **a sala por fazer mais próxima** por 30 minutos. O mapa já mostra essa sala com um relógio.

**OPORTUNIDADE DE GAMEPLAY:** É a situação que põe **um fechamento futuro no mapa** e deixa o jogador escolher a quem ele atinge. Mecânica nova: bloqueio agendado (ver seção 5).

**AÇÃO 1**
- **Nome:** Fechar rápido
- **O que o jogador faz:** Confere e sai.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência:** A sala da próxima aula **fecha em 10 min, por 30 min**.
- **Impacto na rota:** Se você quer aquela sala, precisa fazê-la nos próximos 10 min.
- **O que torna essa ação interessante:** Ganha tempo e aceita a corrida (ou a perda) da outra sala.

**AÇÃO 2**
- **Nome:** Pedir que usem uma sala já limpa
- **O que o jogador faz:** Limpa com calma e indica uma sala concluída para a turma.
- **Custo:** B, R.
- **Benefício:** Nenhuma sala sua fecha.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Paga a arrumação da turma com tempo para manter a rota livre.

**AÇÃO 3**
- **Nome:** Ir junto e limpar a sala da aula antes deles
- **O que o jogador faz:** Deixa esta sala quase pronta e vai com a turma.
- **Custo:** 0 agora; esta sala vira pendência de B/2 (já está arrumada).
- **Benefício:** A sala da próxima aula fica **−3 min pelos próximos 10 min** (a turma ajuda a preparar).
- **Consequência:** Depois de 10 min, a sala da aula fecha por 30.
- **Impacto na rota:** Muda a próxima parada, com prazo.
- **O que torna essa ação interessante:** Transforma o fechamento numa oportunidade, se você correr.

**DIFERENÇA ENTRE AS 3:** Aceitar o fechamento, evitá-lo pagando tempo, ou correr na frente dele.

**ENCADEAMENTO:**
- O bloqueio agendado conversa com "Evento cancelado" (que pode liberar) e com a informação dos Alunos (quem sabe o que tem na sala da aula decide melhor se vale correr).

### SITUAÇÃO 11 — Vaso entupido
**Onde aparece:** banheiros.

**CONTEXTO:** Um vaso entupiu. Os banheiros ficam na base, a 4 m do depósito.

**OPORTUNIDADE DE GAMEPLAY:** Tirar um ambiente da rota **em troca de depender do relógio** da manutenção. Na base, isso pesa diferente do que no meio do mapa.

**AÇÃO 1**
- **Nome:** Desentupir você mesmo
- **O que o jogador faz:** Resolve na hora.
- **Custo:** B+6, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Certeza, para quem já está terminando o turno.

**AÇÃO 2**
- **Nome:** Chamar a manutenção
- **O que o jogador faz:** Registra o chamado.
- **Custo:** 1 min.
- **Benefício:** O banheiro fica pronto sozinho em 25 min.
- **Consequência:** Fica fechado até lá; se você terminar o resto antes, espera no corredor.
- **Impacto na rota:** Sai da rota.
- **O que torna essa ação interessante:** Ótima no começo do turno, arriscada no fim.

**AÇÃO 3**
- **Nome:** Interditar a cabine e fechar na volta da recarga
- **O que o jogador faz:** Limpa o resto e deixa a cabine.
- **Custo:** B, 1 carga (em vez de 2).
- **Benefício:** Poupa material.
- **Consequência:** Pendência de 2 min neste banheiro.
- **Impacto na rota:** A volta é de graça se você vai ao depósito depois (ele fica ao lado).
- **O que torna essa ação interessante:** É uma pendência que **casa com a recarga**, não um "voltar depois" genérico.

**DIFERENÇA ENTRE AS 3:** Resolver agora, terceirizar com prazo, ou deixar uma pendência amarrada ao depósito.

**ENCADEAMENTO:**
- A ação 3 depende da virada para recarregar, que pode mudar por "Material acabando", "Lixeiras" ou "Carrinho no meio".
- A ação 2 disputa o fim do turno com as outras delegações (Sala muito suja, Colega de turno).

### SITUAÇÃO 12 — Piso alagado
**Onde aparece:** banheiros.

**CONTEXTO:** A água escorre pelo piso. Ela tem que ir para algum lugar: o outro banheiro ou o ralo do depósito.

**OPORTUNIDADE DE GAMEPLAY:** É a única situação que pode **fechar o depósito**. O jogador escolhe qual ponto da base fica indisponível.

**AÇÃO 1**
- **Nome:** Secar tudo
- **O que o jogador faz:** Rodo, pano e balde.
- **Custo:** B+4, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Não mexe na base, que é o trecho mais cruzado do mapa.

**AÇÃO 2**
- **Nome:** Rodo e fechar os dois banheiros para secar
- **O que o jogador faz:** Tira o grosso e interdita os banheiros.
- **Custo:** B/2, R.
- **Benefício:** Barato agora.
- **Consequência:** Os dois banheiros ficam **fechados por 15 min**; este vira pendência de 1 min.
- **Impacto na rota:** Bom se você está saindo da base para o meio ou o fundo.
- **O que torna essa ação interessante:** Aposta que você não vai precisar dos banheiros nos próximos 15 min.

**AÇÃO 3**
- **Nome:** Puxar a água para o ralo do depósito
- **O que o jogador faz:** Conclui aqui e empurra a água para o depósito.
- **Custo:** B, R.
- **Benefício:** Conclui na hora.
- **Consequência:** O **depósito fica fechado por 10 min** (cadeado no depósito).
- **Impacto na rota:** Sem recarga por 10 min.
- **O que torna essa ação interessante:** De graça com o carrinho cheio; péssima se a virada para recarregar é agora.

**DIFERENÇA ENTRE AS 3:** Pagar tempo, fechar os banheiros, ou fechar a recarga.

**ENCADEAMENTO:**
- O depósito fechado muda "Material acabando" (o rádio busca no estoque do corredor), "Lixeiras" e "Equipamento quebrado" (a ação de ir ao depósito fica indisponível).
- Um estoque deixado antes no corredor (Entrega, Carrinho) vira a saída.

### SITUAÇÃO 13 — Acabou papel e sabonete
**Onde aparece:** banheiros.

**CONTEXTO:** Falta reposição. O depósito está a 4 m, e o almoxarifado aceita pedidos.

**OPORTUNIDADE DE GAMEPLAY:** Fazer um **pedido agora** que chega depois num ponto do corredor. Diferente da Entrega (que já está no andar), aqui o material ainda não existe: ele aparece **em 15 min**. Mecânica nova: entrega agendada.

**AÇÃO 1**
- **Nome:** Repor do carrinho
- **O que o jogador faz:** Usa o que traz.
- **Custo:** B, R+1.
- **Benefício:** Conclui.
- **Consequência:** Uma carga a menos.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Simples, e boa com carga sobrando.

**AÇÃO 2**
- **Nome:** Recarregar agora no depósito ao lado
- **O que o jogador faz:** Dá quatro passos até o depósito e enche o carrinho.
- **Custo:** B, R + 4 min de recarga (o deslocamento é mínimo).
- **Benefício:** Carrinho cheio.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Antecipa a recarga, o que só ajuda se você já gastou bastante.
- **O que torna essa ação interessante:** Parece óbvia, mas recarregar cedo pode desperdiçar a parada. O jogador precisa saber onde está no próprio plano.

**AÇÃO 3**
- **Nome:** Pedir uma caixa para o meio do corredor
- **O que o jogador faz:** Liga para o almoxarifado.
- **Custo:** B, R + 2 min.
- **Benefício:** **Em 15 min**, uma caixa de 5 cargas aparece em S4/S10 (o mapa mostra a caixa "a caminho").
- **Consequência:** Se você passar pelo meio antes da entrega, ela ainda não está lá.
- **Impacto na rota:** Cria um ponto de recarga no meio, com hora para existir.
- **O que torna essa ação interessante:** Planejar **quando** passar pelo meio.

**DIFERENÇA ENTRE AS 3:** Gastar agora, recarregar cedo, ou encomendar para depois.

**ENCADEAMENTO:**
- A caixa no meio é encontrada pelo rádio de "Material acabando".
- Ela disputa espaço de decisão com o "Carrinho no meio" (15): dois estoques no meio mudam a virada.

### SITUAÇÃO 14 — O turno da manhã já passou aqui
**Onde aparece:** banheiros.

**CONTEXTO:** O turno anterior deixou material e um caderno de ocorrências sobre o bloco.

**OPORTUNIDADE DE GAMEPLAY:** **Informação sobre o fundo**, antes de o jogador decidir ir até lá. Os Alunos (Fase 1) revelam as 2 salas mais próximas; aqui a informação é sobre a região mais cara do mapa.

**AÇÃO 1**
- **Nome:** Só conferir
- **O que o jogador faz:** Confere e fecha.
- **Custo:** B/2, 1 carga.
- **Benefício:** Tempo agora.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Para quem já tem o plano.

**AÇÃO 2**
- **Nome:** Ler o caderno de ocorrências
- **O que o jogador faz:** Lê o que a manhã anotou.
- **Custo:** B, R + 2 min.
- **Benefício:** Revela a situação de **S1, S7, S2 e S8** (as 4 do fundo), marcadas com "i".
- **Consequência:** Esses sorteios ficam fixos.
- **Impacto na rota:** Decidir se vale ir ao fundo primeiro, e em que ordem.
- **O que torna essa ação interessante:** Troca tempo por previsibilidade na região em que um erro custa mais.

**AÇÃO 3**
- **Nome:** Recolher o material da manhã
- **O que o jogador faz:** Junta o que foi esquecido.
- **Custo:** B+2, R.
- **Benefício:** +3 cargas (o que não couber fica no chão, aqui).
- **Consequência:** Nenhuma.
- **Impacto na rota:** Pode adiar ou eliminar uma recarga.
- **O que torna essa ação interessante:** Material na base, onde ele vale menos. Bom quando você está perto do limite.

**DIFERENÇA ENTRE AS 3:** Tempo, informação sobre o fundo, ou material.

**ENCADEAMENTO:**
- Saber o que tem no fundo muda decisões de Entrega ("Deixar no fundo"), Enceradeira ("Deixar em S2/S8") e Colega de turno (21).

### SITUAÇÃO 16 — Escada enlameada
**Onde aparece:** escada.

**CONTEXTO:** Barro nos degraus. A escada é a ponta do corredor, a 63,5 m do depósito.

**OPORTUNIDADE DE GAMEPLAY:** A **direção da rota** decide o custo. Quem chega à escada no começo do turno (fundo primeiro) e quem chega no fim veem esta carta de jeitos opostos.

**AÇÃO 1**
- **Nome:** Lavar degrau por degrau
- **O que o jogador faz:** Resolve tudo aqui.
- **Custo:** B+5, R+1.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** A carga extra no ponto mais longe do depósito pesa quando o carrinho está baixo.

**AÇÃO 2**
- **Nome:** Raspar e seguir
- **O que o jogador faz:** Tira o grosso e vai embora.
- **Custo:** B/2, R.
- **Benefício:** Conclui rápido.
- **Consequência:** O barro vai no sapato: **S1 e S7 +2 min**, se ainda por fazer.
- **Impacto na rota:** De graça se você veio de S1/S7; caro se a escada é a primeira do fundo.
- **O que torna essa ação interessante:** A melhor opção muda com a direção.

**AÇÃO 3**
- **Nome:** Levar o barro para o depósito
- **O que o jogador faz:** Ensaca o barro e desce até o depósito com ele.
- **Custo:** B/2, R + ida ao depósito (63,5 m, ~13 min).
- **Benefício:** Conclui e **recarrega** lá.
- **Consequência:** Sua posição passa a ser o depósito.
- **Impacto na rota:** Vira a rota inteira para a base.
- **O que torna essa ação interessante:** Péssima para quem ainda vai trabalhar no fundo; ótima para quem fez o fundo primeiro e já estava voltando.

**DIFERENÇA ENTRE AS 3:** Pagar aqui, sujar o fundo, ou transformar o barro numa volta para a base.

**ENCADEAMENTO:**
- A ação 2 soma com os cavaletes do Fluxo (S1/S7 fechadas).
- A ação 3 resolve "Material acabando" antes que ele apareça.

### SITUAÇÃO 17 — Poeira de obra
**Onde aparece:** escada.

**CONTEXTO:** A obra ao lado da escada solta poeira. Fechando a porta corta-fogo, o corredor do fundo fica protegido por um tempo.

**OPORTUNIDADE DE GAMEPLAY:** Premiar quem **reorganiza a rota** para limpar o fundo enquanto ele está protegido. É preparação com prazo, numa região inteira.

**AÇÃO 1**
- **Nome:** Varrer e passar pano
- **O que o jogador faz:** Limpa a escada completa.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** A opção de quem já fez o fundo.

**AÇÃO 2**
- **Nome:** Só varrer
- **O que o jogador faz:** Varre sem molhar.
- **Custo:** B/2, 0 carga.
- **Benefício:** Poupa material no ponto mais longe do depósito.
- **Consequência:** A poeira volta: pendência de 3 min na escada.
- **Impacto na rota:** Só vale se você volta à escada (fim do turno).
- **O que torna essa ação interessante:** Material onde ele é mais caro, em troca de uma volta.

**AÇÃO 3**
- **Nome:** Fechar a porta corta-fogo e fazer o fundo agora
- **O que o jogador faz:** Isola a escada da obra e deixa a escada para depois.
- **Custo:** 0 agora; a escada fica adiada (a mesma situação espera).
- **Benefício:** **S1, S7, S2 e S8 −2 min cada nos próximos 20 min** (sem poeira).
- **Consequência:** Depois de 20 min o efeito acaba.
- **Impacto na rota:** Puxa o jogador para o fundo **agora**.
- **O que torna essa ação interessante:** Excelente se o fundo está todo por fazer; inútil se já foi feito.

**DIFERENÇA ENTRE AS 3:** Terminar aqui, economizar material aqui, ou reorganizar o fundo em volta de uma janela.

**ENCADEAMENTO:**
- Informação do Turno da manhã (14) sobre o fundo ajuda a decidir.
- Se S1/S7 estiverem fechadas pelos cavaletes do Fluxo, a janela vale menos.

### SITUAÇÃO 19 — A portaria já passou a vassoura
**Onde aparece:** escada.

**CONTEXTO:** O porteiro varreu a escada e tem um carrinho de apoio. A escada é o ponto mais longe do depósito.

**OPORTUNIDADE DE GAMEPLAY:** Material e ajuda **onde eles são mais caros de conseguir**.

**AÇÃO 1**
- **Nome:** Só o pano
- **O que o jogador faz:** Passa o pano e fecha.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Para quem está com o carrinho bom e pressa.

**AÇÃO 2**
- **Nome:** Pedir o carrinho de apoio
- **O que o jogador faz:** O porteiro empresta material.
- **Custo:** B, R + 3 min de espera.
- **Benefício:** +4 cargas no fundo.
- **Consequência:** O que não couber fica no chão, na escada.
- **Impacto na rota:** Pode eliminar a volta de 63 m até o depósito.
- **O que torna essa ação interessante:** Vale muito com o carrinho baixo e o fundo pela frente.

**AÇÃO 3**
- **Nome:** Encerar o patamar
- **O que o jogador faz:** Aproveita a escada varrida para encerar o acesso às salas do fundo.
- **Custo:** B+2, R+1.
- **Benefício:** **S1 e S7 −2 min cada**.
- **Consequência:** Vale só para elas.
- **Impacto na rota:** Incentiva fazer S1/S7 em seguida.
- **O que torna essa ação interessante:** Boa se você começou pelo fundo; inútil se a escada é a última parada.

**DIFERENÇA ENTRE AS 3:** Tempo, material no pior lugar para faltar, ou preparar o vizinho da escada.

**ENCADEAMENTO:**
- A sobra no chão da escada vira o ponto de material mais próximo para o rádio de "Material acabando" no fundo.
- A ação 3 é o oposto da ação 2 da Escada enlameada (16): as duas mexem em S1/S7, em sentidos contrários.

### SITUAÇÃO 20 — Falta de água no bloco
**Onde aparece:** qualquer ambiente.

**CONTEXTO:** A água do bloco foi cortada e volta em 20 min. Os banheiros (na base) têm a caixa d'água própria.

**OPORTUNIDADE DE GAMEPLAY:** Um problema do bloco inteiro que **a posição resolve** (perto da torneira dos banheiros) ou **o tempo resolve** (esperando a água voltar).

**AÇÃO 1**
- **Nome:** Racionar o balde
- **O que o jogador faz:** Limpa com o que tem.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Custo fixo em qualquer lugar.

**AÇÃO 2**
- **Nome:** Seco agora, pano quando a água voltar
- **O que o jogador faz:** Varre e deixa o pano para depois.
- **Custo:** B/2, 1 carga.
- **Benefício:** Barato agora.
- **Consequência:** A sala fica **fechada até a água voltar** (20 min), depois pendência de B/2.
- **Impacto na rota:** Exige passar aqui de novo depois de 20 min.
- **O que torna essa ação interessante:** Boa na zona de retorno.

**AÇÃO 3**
- **Nome:** Buscar água na caixa dos banheiros
- **O que o jogador faz:** Vai com o balde até a caixa d'água da base.
- **Custo:** B + d(banheiro)/5 min, R.
- **Benefício:** Conclui sem esperar a água voltar.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Barata perto da base, cara no fundo.

**DIFERENÇA ENTRE AS 3:** Custo fixo, custo pela volta no tempo certo, ou custo pela distância até a água.

**ENCADEAMENTO:**
- Casa com a zona de retorno e com a virada para recarregar (ação 2).
- Com o depósito fechado (12), quem está na base fica ainda mais parado: a ação 3 vira a saída.

### SITUAÇÃO 21 — Colega de turno passa por aqui
**Onde aparece:** qualquer ambiente.

**CONTEXTO:** Um colega terminou a ala dele e está livre.

**OPORTUNIDADE DE GAMEPLAY:** **Dividir o mapa**: é a única situação que pode tirar uma **região inteira** da rota. As outras delegações tiram uma sala só.

**AÇÃO 1**
- **Nome:** Ajuda aqui
- **O que o jogador faz:** Dividem esta sala.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Quando o fundo já foi feito e só faltam salas perto.

**AÇÃO 2**
- **Nome:** Assumir o par mais distante
- **O que o jogador faz:** O colega pega as duas salas por fazer mais longe do depósito.
- **Custo:** B, R aqui + o material das duas salas.
- **Benefício:** As duas ficam prontas sozinhas em 30 min.
- **Consequência:** Ficam fechadas até lá.
- **Impacto na rota:** Pode cortar a ida ao fundo inteira (até 127 m de ida e volta).
- **O que torna essa ação interessante:** Vale de zero a enorme, conforme o que ainda falta no fundo.

**AÇÃO 3**
- **Nome:** Trocar de carrinho com ele
- **O que o jogador faz:** Pega o carrinho dele, que está cheio.
- **Custo:** B, R.
- **Benefício:** Carrinho cheio agora, onde você estiver.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Elimina uma recarga, e a virada para o depósito com ela.
- **O que torna essa ação interessante:** Uma recarga "portátil": vale mais longe do depósito.

**DIFERENÇA ENTRE AS 3:** Tempo aqui, cortar uma região da rota, ou eliminar a viagem ao depósito.

**ENCADEAMENTO:**
- A ação 2 disputa o fim do turno com outras delegações.
- A ação 3 torna inúteis os estoques do corredor (Entrega, Carrinho), ou os deixa para mais tarde.

### SITUAÇÃO 23 — Evento cancelado
**Onde aparece:** salas.

**CONTEXTO:** O evento desta sala foi cancelado: ela está vazia, e a coordenação oferece guardar coisas aqui.

**OPORTUNIDADE DE GAMEPLAY:** Uma **sala vazia no meio do turno** vira ponto de apoio ou reabre a rota. Mecânica: material no ponto atual (ver seção 5).

**AÇÃO 1**
- **Nome:** Limpar agora que vagou
- **O que o jogador faz:** Aproveita a sala vazia.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Oportunidade simples, sempre disponível.

**AÇÃO 2**
- **Nome:** Liberar a sala que estava fechada
- **O que o jogador faz:** O evento cancelado libera a equipe que ocupava outra sala.
- **Custo:** B, 0 carga.
- **Benefício:** Reabre **o ambiente fechado mais próximo**.
- **Consequência:** Só aparece se existe algo fechado.
- **Impacto na rota:** Reabre uma parada que você tinha perdido.
- **O que torna essa ação interessante:** Desfaz a consequência de outra decisão (cadeiras, cavaletes, pedido de chave).

**AÇÃO 3**
- **Nome:** Guardar material aqui
- **O que o jogador faz:** Pede à coordenação que o almoxarifado deixe caixas nesta sala.
- **Custo:** B, R + 2 min.
- **Benefício:** Um estoque de 4 cargas **nesta estação** (ícone no corredor).
- **Consequência:** Vale para quem passar aqui de novo.
- **Impacto na rota:** Cria um ponto de recarga onde você está: útil se você volta por aqui.
- **O que torna essa ação interessante:** O único estoque que o jogador põe **no lugar em que está**, e não no meio ou no fundo.

**DIFERENÇA ENTRE AS 3:** Tempo agora, reabrir a rota, ou criar um ponto de apoio aqui.

**ENCADEAMENTO:**
- Libera o que 3, 7, 8, 12, 27 e o Fluxo fecharam.
- O estoque é encontrado pelo rádio de "Material acabando".

### SITUAÇÃO 24 — Sala sem torneira
**Onde aparece:** salas.

**CONTEXTO:** Esta sala não tem torneira; a sala da frente tem.

**OPORTUNIDADE DE GAMEPLAY:** Usar a sala da frente como recurso, com um custo que **depende da ordem do par**.

**AÇÃO 1**
- **Nome:** Encher o balde grande
- **O que o jogador faz:** Uma viagem, mais produto.
- **Custo:** B, R+1.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Custo fixo em material.

**AÇÃO 2**
- **Nome:** Pegar água na sala da frente
- **O que o jogador faz:** Atravessa o corredor com o balde.
- **Custo:** B + 1 min, R.
- **Benefício:** Conclui sem material extra.
- **Consequência:** Se a frente ainda não foi limpa, você molha o chão dela: **+2 min lá**.
- **Impacto na rota:** De graça se a frente já foi feita.
- **O que torna essa ação interessante:** A ordem do par decide o custo.

**AÇÃO 3**
- **Nome:** Parte seca agora, úmida quando voltar
- **O que o jogador faz:** Deixa o pano para a próxima passagem.
- **Custo:** B/2, R.
- **Benefício:** Barato agora.
- **Consequência:** Pendência de 1 min.
- **Impacto na rota:** Só vale se você passa aqui de novo.
- **O que torna essa ação interessante:** Pendência pequena e útil na zona de retorno.

**DIFERENÇA ENTRE AS 3:** Material, a ordem do par, ou uma volta.

**ENCADEAMENTO:**
- Informação sobre a sala da frente (Alunos, Turno da manhã) muda o valor da ação 2.

### SITUAÇÃO 25 — Sala preparada para prova
**Onde aparece:** salas.

**CONTEXTO:** Uma prova está em andamento e acaba no **próximo sinal do intervalo** (a cada 20 min de turno, o mesmo relógio do Fluxo na escada).

**OPORTUNIDADE DE GAMEPLAY:** Escolher entre **arriscar agora** e **esperar a hora certa**. É o segundo uso da aposta, num contexto de tempo, não de distância.

**AÇÃO 1**
- **Nome:** Limpar em silêncio
- **O que o jogador faz:** Contorna as carteiras com cuidado.
- **Custo:** B+2, R+1.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Certeza cara.

**AÇÃO 2**
- **Nome:** Voltar no fim da prova
- **O que o jogador faz:** Sai agora.
- **Custo:** 0 agora.
- **Benefício:** No fim da prova a sala esvazia: B−2 na volta.
- **Consequência:** Fechada até o próximo sinal (a carta mostra "prova acaba no minuto 60"); depois, pendência de B−2.
- **Impacto na rota:** Você volta quando o relógio mandar.
- **O que torna essa ação interessante:** Se o sinal está perto, quase não custa; se está longe, trava a sala por muito tempo.

**AÇÃO 3**
- **Nome:** Entrar na troca de folhas
- **O que o jogador faz:** Aproveita um intervalo curto dentro da prova.
- **Custo:** B, R.
- **Benefício:** Conclui na hora, se der certo.
- **Consequência:** **1 em 3:** o fiscal pede para sair; você perde 2 min e a sala vira pendência de B/2.
- **Impacto na rota:** Se der errado, obriga uma volta.
- **O que torna essa ação interessante:** A aposta vale mais perto de casa e com o sinal longe.

**DIFERENÇA ENTRE AS 3:** Pagar a certeza, esperar o relógio, ou arriscar.

**ENCADEAMENTO:**
- Usa o mesmo relógio de intervalos do Fluxo na escada: o jogador aprende a regra uma vez e a vê em dois lugares.

### SITUAÇÃO 26 — Murais de fim de semestre
**Onde aparece:** salas.

**CONTEXTO:** Os murais precisam sair. Os painéis são volumosos; o papel serve para forrar o chão da escada.

**OPORTUNIDADE DE GAMEPLAY:** Levar o volume **para a ponta aonde você vai**. As Lixeiras (4) sempre apontam para o depósito; aqui a escada é o destino alternativo.

**AÇÃO 1**
- **Nome:** Desmontar e deixar ensacado
- **O que o jogador faz:** Desmonta tudo aqui.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** A opção neutra, sem viagem.

**AÇÃO 2**
- **Nome:** Descer o volume ao depósito
- **O que o jogador faz:** Leva os painéis ao depósito e recarrega.
- **Custo:** B, R + ida ao depósito + 2 min.
- **Benefício:** Conclui e recarrega.
- **Consequência:** Sua posição passa a ser o depósito.
- **Impacto na rota:** Vira para a base.
- **O que torna essa ação interessante:** Boa perto da virada, como a ação 1 das Lixeiras. É o destino "normal".

**AÇÃO 3**
- **Nome:** Levar o papel para forrar a escada
- **O que o jogador faz:** Carrega os painéis até a escada.
- **Custo:** B, R + ida até a escada (distância real).
- **Benefício:** **Escada −3 min** (papel forrando o chão da obra).
- **Consequência:** Sua posição passa a ser a escada.
- **Impacto na rota:** Vira para o fundo.
- **O que torna essa ação interessante:** O espelho da ação 2: vale para quem está indo ao fundo.

**DIFERENÇA ENTRE AS 3:** Ficar, ir para a base, ou ir para o fundo.

**ENCADEAMENTO:**
- A escada mais barata soma com qualquer situação de escada (Fluxo, Enlameada, Poeira, Portaria).
- A ida ao depósito combina com "Material acabando".

### SITUAÇÃO 27 — Ar-condicionado pingando
**Onde aparece:** salas.

**CONTEXTO:** O aparelho pinga. O disjuntor corta a energia de um trecho inteiro do corredor.

**OPORTUNIDADE DE GAMEPLAY:** Resolver rápido **à custa do trecho**. É bom quando o trecho já está pronto, e o jogador precisa olhar o que está feito ao redor.

**AÇÃO 1**
- **Nome:** Esvaziar a bandeja e desligar o aparelho
- **O que o jogador faz:** Resolve este aparelho.
- **Custo:** B+3, R.
- **Benefício:** Conclui.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Não mexe em mais nada.

**AÇÃO 2**
- **Nome:** Bacia embaixo e voltar
- **O que o jogador faz:** Põe uma bacia e segue.
- **Custo:** B, R.
- **Benefício:** Conclui quase tudo.
- **Consequência:** Pendência de 2 min (esvaziar a bacia).
- **Impacto na rota:** Exige passar aqui de novo.
- **O que torna essa ação interessante:** Barata na zona de retorno.

**AÇÃO 3**
- **Nome:** Desligar o disjuntor do trecho
- **O que o jogador faz:** Corta a energia desta estação e das vizinhas.
- **Custo:** B, R.
- **Benefício:** Conclui no tempo normal, sem risco.
- **Consequência:** As salas por fazer **a até 10 m ficam fechadas por 10 min** (sem luz).
- **Impacto na rota:** Obriga a sair da região agora.
- **O que torna essa ação interessante:** De graça se o trecho está pronto; péssima no começo de uma região.

**DIFERENÇA ENTRE AS 3:** Resolver só aqui, deixar uma volta, ou fechar o trecho.

**ENCADEAMENTO:**
- "Evento cancelado" (23) pode religar uma sala do trecho.
- Contrasta com "Preparar as vizinhas" dos Alunos, que prende o jogador na região.

### SITUAÇÃO 28 — Banheiro recém-reformado
**Onde aparece:** banheiros.

**CONTEXTO:** A reforma deixou uma lavadora de piso nova no banheiro.

**OPORTUNIDADE DE GAMEPLAY:** Um **equipamento que atravessa o mapa**: da base, onde está, até a escada, onde o piso é pior. A Enceradeira (Fase 1) fica no fundo; esta vai para a ponta.

**AÇÃO 1**
- **Nome:** Aproveitar e fechar
- **O que o jogador faz:** Confere e fecha.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Rápido, na base.

**AÇÃO 2**
- **Nome:** Levar a lavadora para a escada
- **O que o jogador faz:** Pede à manutenção que suba a máquina.
- **Custo:** B, R + 2 min.
- **Benefício:** **Escada −4 min**; a lavadora aparece desenhada lá.
- **Consequência:** Vale só na escada.
- **Impacto na rota:** Nenhum agora; barateia a ponta.
- **O que torna essa ação interessante:** Boa se a escada ainda está por fazer.

**AÇÃO 3**
- **Nome:** Usar a sobra de material da obra
- **O que o jogador faz:** Recolhe o que a reforma deixou.
- **Custo:** B+2, R.
- **Benefício:** +3 cargas (o que não couber fica no chão, aqui).
- **Consequência:** Nenhuma.
- **Impacto na rota:** Pode adiar uma recarga.
- **O que torna essa ação interessante:** Material na base, útil perto do limite.

**DIFERENÇA ENTRE AS 3:** Tempo aqui, investir na ponta do mapa, ou material.

**ENCADEAMENTO:**
- Soma com o papel dos Murais (26) na escada; as duas juntas deixam a escada muito barata.
- Informação sobre a escada muda o valor da ação 2.

### SITUAÇÃO 30 — Carrinho desorganizado
**Onde aparece:** salas e banheiros.

**CONTEXTO:** O carrinho está uma bagunça.

**OPORTUNIDADE DE GAMEPLAY:** Escolher **onde pagar** a arrumação: aqui, nos banheiros, ou no depósito, na próxima recarga.

**AÇÃO 1**
- **Nome:** Organizar e montar o kit dos banheiros
- **O que o jogador faz:** Arruma o carrinho e separa o kit de banheiro.
- **Custo:** B+2, R.
- **Benefício:** **Os dois banheiros −2 min cada.**
- **Consequência:** Vale só neles.
- **Impacto na rota:** Nenhum agora.
- **O que torna essa ação interessante:** Boa se os banheiros ainda estão por fazer.

**AÇÃO 2**
- **Nome:** Usar o pano de reserva
- **O que o jogador faz:** Usa o que achar primeiro.
- **Custo:** B/2, R+1.
- **Benefício:** Tempo agora.
- **Consequência:** Uma carga a menos.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Rápido, gastando material.

**AÇÃO 3**
- **Nome:** Arrumar na próxima recarga
- **O que o jogador faz:** Limpa normalmente e deixa a arrumação para o depósito.
- **Custo:** B, R.
- **Benefício:** Nada extra agora.
- **Consequência:** **A próxima recarga no depósito leva +3 min** (o painel "No mapa" mostra).
- **Impacto na rota:** Só custa se você recarregar; de graça para quem já não precisa voltar.
- **O que torna essa ação interessante:** Um custo com endereço: o depósito.

**DIFERENÇA ENTRE AS 3:** Investir nos banheiros, gastar material, ou empurrar o custo para a recarga.

**ENCADEAMENTO:**
- A ação 3 fica de graça se outra situação (Colega de turno, Portaria, estoques) eliminar a recarga.

### SITUAÇÃO 31 — Visita da direção hoje
**Onde aparece:** salas.

**CONTEXTO:** A direção vai passar por este trecho do corredor em 15 min.

**OPORTUNIDADE DE GAMEPLAY:** Uma **meta de curto prazo** que muda a próxima parada. Mecânica nova: meta com prazo (ver seção 5).

**AÇÃO 1**
- **Nome:** Fechar rápido e sair
- **O que o jogador faz:** Termina antes da visita.
- **Custo:** B/2, R.
- **Benefício:** Tempo agora.
- **Consequência:** Nenhuma.
- **Impacto na rota:** Nenhum.
- **O que torna essa ação interessante:** Quem não quer compromisso.

**AÇÃO 2**
- **Nome:** Mostrar o serviço
- **O que o jogador faz:** Acompanha a direção.
- **Custo:** B, R + 3 min.
- **Benefício:** A direção conta o que tem nas **2 salas por fazer mais distantes** (informação, com "i" no mapa).
- **Consequência:** Nenhuma.
- **Impacto na rota:** Informação sobre a ponta da rota.
- **O que torna essa ação interessante:** Informação sobre o lugar que custa mais visitar à toa.

**AÇÃO 3**
- **Nome:** Prometer o trecho limpo
- **O que o jogador faz:** Compromete-se com a sala da frente e as vizinhas a até 10 m.
- **Custo:** B, R.
- **Benefício:** Se todas estiverem prontas **em 15 min**, a direção libera um colega que conclui a sala por fazer mais distante.
- **Consequência:** Se não estiverem: +3 min (retrabalho).
- **Impacto na rota:** Obriga a ficar na região agora; a recompensa corta a ponta da rota.
- **O que torna essa ação interessante:** Aposta em planejamento, não em sorte: o jogador sabe se consegue.

**DIFERENÇA ENTRE AS 3:** Nada, informação, ou uma meta local com recompensa distante.

**ENCADEAMENTO:**
- A recompensa (colega na sala mais distante) conversa com o Colega de turno (21) e com a Enceradeira (Fase 1).
- A meta falha se algo fechar a região (27, 3, 7).

### SITUAÇÃO 32 — Pedido da coordenação
**Onde aparece:** qualquer ambiente.

**CONTEXTO:** Haverá uma reunião, daqui a 30 min, na sala por fazer mais distante daqui.

**OPORTUNIDADE DE GAMEPLAY:** Puxar o jogador **para o outro extremo** agora, ou fazê-lo pagar lá depois. É o espelho da Visita (31): a meta é longe, não em volta.

**AÇÃO 1**
- **Nome:** Largar tudo e ir
- **O que o jogador faz:** Esta sala fica adiada (a mesma situação espera) e vai para a sala da reunião.
- **Custo:** 0 agora.
- **Benefício:** Se a sala da reunião estiver pronta em 30 min, a coordenação **manda alguém concluir esta sala**.
- **Consequência:** Se atrasar: +5 min.
- **Impacto na rota:** Vira a rota para o outro extremo agora.
- **O que torna essa ação interessante:** Ótima se você já ia para lá; custa a viagem se não.

**AÇÃO 2**
- **Nome:** Negociar mais prazo
- **O que o jogador faz:** Pede para a reunião ser mais tarde.
- **Custo:** B, R + 3 min.
- **Benefício:** Conclui esta sala; a meta passa a 60 min, sem recompensa.
- **Consequência:** Se atrasar: +5 min.
- **Impacto na rota:** Uma restrição suave no resto do turno.
- **O que torna essa ação interessante:** Mantém o plano, com um lembrete no mapa.

**AÇÃO 3**
- **Nome:** Recusar
- **O que o jogador faz:** Segue a rota.
- **Custo:** B, R.
- **Benefício:** Conclui esta sala.
- **Consequência:** A reunião acontece mesmo assim: a sala dela fica **fechada por 20 min, daqui a 30**, e suja (+2).
- **Impacto na rota:** Nenhum agora; cobra lá longe.
- **O que torna essa ação interessante:** De graça se você não ia lá nesse horário.

**DIFERENÇA ENTRE AS 3:** Mudar a rota agora, aceitar uma restrição, ou pagar depois num lugar específico.

**ENCADEAMENTO:**
- A recompensa (esta sala concluída por alguém) combina com qualquer situação que tenha deixado esta sala cara.
- O fechamento da ação 3 usa o mesmo bloqueio agendado da Turma organizada (9).

## 4. Encadeamentos

| Situação que cria | O que fica no mapa | Quem aproveita |
|---|---|---|
| Entrega de material (F1) · Carrinho da manutenção (F1) · 13 Acabou papel · 23 Evento cancelado · 19 Portaria (sobra) | Caixa de material num ponto do corredor | Material acabando (o rádio busca na mais próxima) · qualquer um que passe por ali |
| 12 Piso alagado | **Depósito fechado** | Material acabando, 4 Lixeiras, 6 Equipamento, 26 Murais (a ida ao depósito fica indisponível) · estoques no corredor viram a saída |
| 3 Sala em breve · 7 Evento · 8 Janela · 20 Falta de água · 27 Ar-condicionado · Fluxo (F1) · Pedir a chave (F1) · 9 Turma organizada · 32 Coordenação | Sala ou região fechada | 23 Evento cancelado (libera) · 31 Visita (a meta falha) · rota de quem precisava daquela sala |
| Alunos (F1) · 14 Turno da manhã · 31 Visita | Salas reveladas ("i") | 3, 7, 24 (saber o que tem na frente) · 17 Poeira (saber o que tem no fundo) · a escolha da rota |
| 26 Murais · 28 Banheiro reformado · 19 Portaria | Escada ou S1/S7 mais baratas | Fluxo (F1), 16 Enlameada, 17 Poeira (as quatro situações de escada) |
| 16 Enlameada | S1/S7 mais caras | Fluxo (cavaletes em S1/S7) · 19 Portaria (efeito contrário) |
| 21 Colega · 11 Vaso · Sala muito suja (F1) · Enceradeira (F1) · 31 e 32 (recompensas) | Salas com colega, prontas numa hora marcada | O fim do turno (espera no corredor) · a meta da 31 |
| 30 Carrinho desorganizado | Recarga mais lenta | 21 Colega (troca de carrinho) e estoques do corredor, que evitam a recarga |
| 4 Lixeiras · 6 Equipamento · 16 Enlameada · 26 Murais | Você no depósito (recarregado) | Material acabando não aparece; 11 Vaso (pendência resolvida de passagem) |

## 5. Mecânicas reutilizadas

**Já existem no jogo** (vieram da Fase 1):

| Mecânica | Onde aparece nas 24 |
|---|---|
| Custo pela distância (depósito, entrada, material mais próximo) | 4, 6, 16, 26 |
| Janela do intervalo (a cada 20 min) | 25 |
| Efeito com endereço (frente, raio, ponto, sala mais distante; com prazo opcional) | 3, 7, 9, 16, 17, 19, 24, 26, 28, 30 |
| Fechar salas (frente, raio, vizinha) e liberar fechadas | 3, 7, 8, 12, 20, 23, 27, 32 |
| Material no corredor, sobra no chão, rádio | 13, 14, 19, 23, 28 |
| Delegar (esta sala, frente, mais distante) | 11, 21, 31, 32 |
| Informação (revelar situações) | 14, 31 |
| Pendência persistente e pendência com resíduo | 7, 8, 11, 17, 20, 24, 25, 27, 32 |
| Ir ao depósito | 4, 6, 16, 26 |

**Extensões pequenas das mecânicas existentes** (parâmetros novos, sem regra nova):

| Extensão | Para quê | Onde |
|---|---|---|
| Distância até os **banheiros** e até a **escada** | Água (8, 20) e o destino "escada" dos Murais (26) | 8, 20, 26 |
| Material **no ponto atual** | O estoque da sala do evento (23) | 23 |
| Revelar **uma região** (o fundo) ou **as mais distantes** | Caderno da manhã (14), Visita (31) | 14, 31 |
| **Depósito** como alvo (fechar; recarga mais lenta) | Piso alagado (12), Carrinho desorganizado (30) | 12, 30 |
| Região "sala mais próxima **em outra estação**" | A sala que a turma deixou (3, 9) | 3, 9 |

**Três mecânicas novas**, cada uma usada em mais de uma situação e sempre visível:

| Mecânica | Como aparece | Onde |
|---|---|---|
| **Agendamento** | Um efeito do mapa com hora para começar: "S9 fecha em 10 min" ou "caixa chega em S4/S10 em 15 min". Relógio no mapa e no painel "No mapa" | 9, 13, 32 |
| **Aposta** | Ação com chance declarada na carta ("1 em 3"), sorteada com a semente da partida, então reproduzível | 6, 25 |
| **Meta com prazo** | Um conjunto de salas destacado no mapa, com o minuto-limite, a recompensa e a penalidade escritos no painel | 31, 32 |

Nenhuma delas pede ao jogador para memorizar regra: tudo o que importa aparece no mapa, no painel ou na carta.

## 6. Onde ainda pode haver repetição

A segunda auditoria, feita depois do desenho:

1. **Sala da frente demais.** 3, 7 e 24 usam a frente como eixo, e 7 mexe no par inteiro. São três contextos diferentes (turma, cadeiras, torneira), mas o dilema "a frente já foi feita?" se repete. **Candidata a mudar:** a 24 poderia usar a torneira **dos banheiros** (distância) em vez da frente, o que a aproxima da 20. Precisa de playtest para decidir qual das duas repetições incomoda menos.
2. **Fechamentos demais.** Nove situações fecham algo (3, 7, 8, 9, 12, 20, 25, 27, 32). Somando as da Fase 1, uma partida pode ter três ou quatro cadeados ao mesmo tempo. **Mitigação:** o sorteio poderia evitar duas situações de fechamento seguidas, ou reduzir a duração padrão para 10 min. Observar no playtest se o mapa fica "travado".
3. **Ida ao depósito em 4 situações** (4, 6, 16, 26). Os contextos diferem (lixo, ferramenta, barro, volume), mas a decisão é sempre "virar agora?". **Candidata:** a 6 poderia trocar a ida ao depósito por "pedir outra ferramenta no meio do corredor" (agendamento), abrindo espaço.
4. **Escada com quatro situações** (Fluxo, 16, 17, 19), e três delas mexem em S1/S7 ou no fundo. Estão diferenciadas (direção, janela regional, material), mas quem jogar várias vezes vai reconhecer o padrão "escada afeta S1/S7".
5. **Pendência "volte depois" ainda em 9 situações.** Em nenhuma ela é a terceira opção automática: está amarrada a um motivo (secagem, recarga, prova, reunião). Mesmo assim, é a mecânica mais frequente, e vale acompanhar se o jogador a sente como "mais do mesmo".
6. **Dois "material na base"** (14 ação 3 e 28 ação 3) têm o mesmo formato: +3 cargas por 2 min. **Candidata:** trocar uma delas por um recurso diferente, por exemplo a lavadora da 28 também poder ficar no outro banheiro.

## 7. Ordem de implementação

Em ondas pequenas, cada uma com simulação e um playtest curto antes da próxima, como na Fase 1:

1. **Onda A: só mecânicas existentes e extensões de parâmetro.**
   - Situações: 4, 7, 8, 11, 14, 16, 19, 20, 21, 23, 24, 26, 27, 28, 30, 12 (16 situações).
   - É onde está a maior parte da variedade, com o menor risco.
2. **Onda B: agendamento.**
   - Situações: 9, 13, 3.
   - A 3 entra aqui porque "a sala que a turma deixou" usa a mesma região da 9.
3. **Onda C: aposta.**
   - Situações: 6, 25.
   - Pequena, e fácil de retirar se o playtest disser que sorte não combina com o jogo.
4. **Onda D: meta com prazo.**
   - Situações: 17, 31, 32.
   - A 17 usa efeito com prazo, já existente, mas faz mais sentido testada junto com as metas, porque as três puxam a rota para uma região.

**Depois de cada onda:**
- rodar `scripts/playtest.ts`, com os mesmos critérios da Fase 1;
- conferir a repetição da seção 6 com pessoas jogando;
- só então começar a onda seguinte.
