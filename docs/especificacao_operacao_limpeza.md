# OPERAÇÃO LIMPEZA

## Especificação do protótipo

Jogo educacional sobre **Pensamento Computacional**, no qual o jogador planeja uma sequência de limpeza em um bloco de faculdade.

O foco não é programação nem encontrar um caminho em um labirinto. O foco é **planejamento, decomposição de problemas, análise de consequências, otimização e tomada de decisão sob restrições**.

---

## 1. Stack

- Vite
- React 19
- TypeScript com `strict`
- Tailwind CSS v4
- Vitest
- pnpm
- SVG para o mapa interativo

Não há backend no MVP.

Estrutura sugerida:

```text
src/
├── components/
├── data/
│   ├── rooms.ts
│   └── situations.ts
├── domain/
│   ├── effects.ts
│   └── game.ts
├── state/
└── ...
```

Os dados de salas e situações devem ficar separados da interface. Regras de negócio não devem ficar espalhadas pelos componentes.

---

# 2. Direção visual

A interface deve ter estética de **jogo/protótipo educacional moderno**, e não de dashboard administrativo.

Direção:

- dark;
- moderna;
- limpa;
- sofisticada;
- boa hierarquia visual;
- poucos elementos decorativos;
- bastante espaço visual;
- cards usados com propósito;
- ícones consistentes;
- feedback visual claro.

Preferir uma biblioteca única de ícones. **Phosphor Icons** é a referência preferida por oferecer pesos `regular`, `bold`, `fill` e `duotone`.

Evitar excesso de badges e pequenos cards.

O mapa é o protagonista da experiência.

---

# 3. Mapa

O prédio deve ser representado como um **corredor central linear**, fiel à disposição real.

Não implementar como labirinto ou sistema de pathfinding.

O mapa deve ser um único SVG dinâmico.

Cada sala/objetivo deve ser um elemento SVG individual e clicável. Não criar um arquivo SVG separado para cada sala.

A geometria visual deve ser derivada dos dados das salas.

Características visuais importantes:

- escada em formato de L à esquerda;
- corredor horizontal central;
- salas dos dois lados;
- 6 salas na parte superior;
- 6 salas na parte inferior;
- banheiros na extremidade leste;
- DEP entre as salas laranjas e os banheiros;
- S7/S8 com a projeção do lado esquerdo;
- larguras diferentes para salas largas e estreitas;
- marcações de distância no corredor.

O mapa deve ser responsivo.

---

# 4. Objetivos e posições

Existem:

- 12 salas: S1–S12;
- 2 banheiros;
- DEP, que é um ponto de serviço e **não é objetivo de limpeza**.

Posições no eixo do corredor:

| Local | Posição |
|---|---:|
| Entrada | 0 m |
| S1 / S7 | 5 m |
| S2 / S8 | 15 m |
| S3 / S9 | 25 m |
| S4 / S10 | 32 m |
| S5 / S11 | 42 m |
| S6 / S12 | 52 m |
| DEP | 58 m |
| WC | 62 m |

Os dados devem ser configuráveis em `data/rooms.ts`.

### Tempos base

| Objetivo | Tempo |
|---|---:|
| S1 | 5 min |
| S2 | 8 min |
| S3 | 4 min |
| S4 | 4 min |
| S5 | 6 min |
| S6 | 6 min |
| S7 | 5 min |
| S8 | 8 min |
| S9 | 4 min |
| S10 | 4 min |
| S11 | 6 min |
| S12 | 6 min |
| WC | 3 min |

Há 2 WCs; a posição/identificação exata do segundo deve ser definida pelos dados do mapa sem alterar a mecânica geral.

---

# 5. Deslocamento

A regra de deslocamento é:

```text
distância = abs(posiçãoAtual - posiçãoDestino)
```

Conversão atual:

```text
1 minuto a cada 5 metros
```

Portanto:

```text
tempoDeslocamento = distância / 5
```

O tempo pode ser fracionário quando necessário.

Exemplo:

```text
S1 = 5 m
S5 = 42 m

distância = |5 - 42| = 37 m
tempo = 37 / 5 = 7,4 min
```

A distância percorrida deve ser acumulada durante a partida.

Importante: a referência de 62 m representa apenas uma **referência espacial mínima**, não uma “rota ótima”. Depósito, pendências e decisões podem alterar o custo total.

---

# 6. Movimento e feedback visual

O jogador possui uma `currentPosition`.

Ao selecionar um destino:

1. o destino é destacado;
2. o custo do deslocamento é apresentado;
3. o jogador confirma;
4. o marcador do jogador se desloca;
5. o tempo e a distância são atualizados;
6. o estado do objetivo é atualizado.

O mapa deve mostrar em tempo real:

- posição atual do jogador;
- destino selecionado;
- trajetória;
- salas concluídas;
- salas pendentes;
- salas bloqueadas;
- sala atual;
- DEP;
- demais estados relevantes.

Estados devem ser distinguíveis também por símbolos/ícones, não apenas por cor.

Exemplo:

```text
✓ concluída
◐ pendente
🔒 bloqueada
● posição atual
```

A trajetória pode ser uma linha/polilinha visualmente discreta sobre o corredor.

---

# 7. Materiais

Estoque inicial:

```text
10 cargas
```

Estoque máximo:

```text
10 cargas
```

Consumo normal:

```text
Sala comum = 1 carga
Banheiro = 2 cargas
```

Uma limpeza completa só pode acontecer se:

```text
cargas >= custoDaLimpeza
```

Caso contrário, a ação deve ficar desabilitada e explicar o motivo.

Exemplo:

> Precisa de 2 cargas, você tem 1.

---

# 8. DEP

O DEP é um destino clicável no mapa.

Ir ao DEP:

```text
tempo de deslocamento
+
4 minutos de recarga
```

A recarga enche o estoque até 10.

**Passar pelo DEP durante outro deslocamento não recarrega automaticamente.**

É necessário escolher o DEP como destino.

Isso cria uma decisão espacial relevante: dependendo da rota, visitar o DEP pode acrescentar pouco deslocamento.

---

# 9. Objetivo e término

Objetivo principal:

> Limpar todos os 14 objetivos.

Existe uma régua de referência de:

```text
140 minutos
```

Ultrapassar 140 minutos **não causa derrota automática**.

O botão:

> Finalizar limpeza

fica disponível durante a partida.

A tela final deve mostrar:

- objetivos concluídos;
- objetivos pendentes;
- objetivos não iniciados;
- tempo total;
- distância total;
- consumo de material;
- resumo da rota.

O objetivo educacional é permitir que o participante termine a partida e depois compare sua estratégia.

---

# 10. Recordes / partidas

Partidas devem ser comparadas por:

1. quantidade de objetivos concluídos, em ordem decrescente;
2. em caso de empate, menor tempo total.

Portanto:

```text
14/14 em 150 min
```

fica acima de:

```text
10/14 em 80 min
```

Partidas incompletas devem ficar visualmente identificadas.

O sistema não deve considerar uma partida imediatamente encerrada como “melhor” apenas por ter 0 minutos.

---

# 11. Situações / cartas

O MVP possui 6 situações.

A ideia central é:

> A situação apresenta um problema e oferece três formas diferentes de resolvê-lo.

As três opções **não devem ser “boa, média e ruim”**.

Cada escolha precisa possuir trade-offs.

As consequências devem ser transparentes antes da escolha.

As situações devem ficar em:

```text
data/situations.ts
```

Os efeitos devem ser descritos como dados tipados e interpretados pela camada de domínio.

---

# 12. Seleção das situações

Não usar aleatoriedade pura.

Usar:

- pré-condições;
- bag embaralhada;
- seed fixa;
- sem repetir a mesma situação consecutivamente.

Cada situação declara quando pode aparecer.

Exemplos:

- “material acabando” exige estoque baixo;
- “sala trancada” não deve ocorrer em banheiro;
- “lixeiras cheias” pode ser elegível normalmente.

Como as pré-condições dependem do estado da partida, rotas diferentes podem encontrar situações diferentes.

A mesma rota com a mesma seed deve ser reproduzível.

Não permitir situações impossíveis ou incoerentes.

---

# 13. Situação 1 — Sala muito suja

Considere:

- `b` = tempo base atual;
- `c` = custo de material.

### A — Limpeza completa

```text
+b+3 min
-c cargas
conclui
```

### B — Meia limpeza

```text
+ceil(b/2) min
-1 carga
pendência R
```

Onde:

```text
R = b - ceil(b/2) + 2
```

A pendência será resolvida posteriormente.

### C — Adiar

```text
0 min
0 cargas
não conclui
tempo base aumenta +3
```

O incremento de sujeira deve ficar no estado da partida, não em `rooms.ts`.

---

# 14. Situação 2 — Material acabando

### A — Ir ao depósito

```text
+abs(pos - 58)m
+4 min
recarrega até 10
sala não iniciada
```

### B — Economizar material

```text
+b+4 min
0 cargas
conclui
```

### C — Raspar reserva

```text
+b min
cargas vão a 0
conclui
```

A situação só deve aparecer quando sua pré-condição de material for atendida.

---

# 15. Situação 3 — Sala será usada em breve

### A — Priorizar

```text
+b+2 min
-c
conclui
```

### B — Limpeza parcial

```text
+ceil(b/2) min
-1 carga
pendência R
```

### C — Adiar e seguir

```text
0 min
0 cargas
sala bloqueada por 25 min
```

---

# 16. Situação 4 — Lixeiras cheias

### A — Levar ao depósito agora

```text
+b min
-c cargas
conclui
vai até DEP
+3 min
recarrega até 10
```

### B — Acumular no carrinho

```text
+b min
-(c+1) cargas
conclui
```

### C — Deixar lixo para depois

```text
+b min
-c cargas
pendência R = 3
```

---

# 17. Situação 5 — Sala trancada

### A — Buscar chave na entrada

```text
+abs(pos - 0)m
+2 min
sala não iniciada
jogador fica em 0
```

### B — Entrar pela sala vizinha

```text
+b+3 min
-c
conclui
```

Porém, o bloqueio deve atingir o **objetivo não concluído mais próximo**:

1. vizinho imediato, se disponível;
2. caso contrário, próximo objetivo pendente/não iniciado mais próximo.

A sala que será bloqueada deve ser mostrada antes da escolha.

Se não houver outro objetivo que possa ser bloqueado, a situação fica inelegível.

### C — Pular

```text
0 min
0 cargas
sala bloqueada por 25 min
```

---

# 18. Situação 6 — Equipamento quebrado

### A — Trocar no depósito

```text
+abs(pos - 58)m
+4 min
recarrega até 10
sala não iniciada
```

### B — Improvisar

```text
+b+5 min
-c
conclui
```

### C — Meia limpeza

```text
+ceil(b/2) min
-1 carga
pendência R
```

Onde:

```text
R = b - ceil(b/2) + 4
```

---

# 19. Pendências

Uma sala com pendência:

- continua aparecendo no mapa;
- possui estado visual próprio;
- mostra aproximadamente quanto tempo falta;
- continua sendo um objetivo não concluído.

Ao clicar em uma sala pendente:

1. abrir confirmação normal;
2. mostrar `R` como tempo de limpeza;
3. cobrar o deslocamento normalmente;
4. cobrar `R` minutos;
5. concluir a sala.

Ao resolver uma pendência:

- não gerar nova situação;
- não gerar novas três escolhas;
- não consumir material;
- não permitir adiar novamente.

A resolução é determinística.

---

# 20. Bloqueios temporários

Bloqueios de 25 minutos usam o **tempo total acumulado da partida**.

Ao bloquear:

```text
desbloqueiaEm = tempoTotal + 25
```

O objetivo fica indisponível até:

```text
tempoTotal >= desbloqueiaEm
```

Se todos os objetivos restantes estiverem bloqueados, o jogador pode usar:

> Aguardar

O jogo deve avançar exatamente até o próximo desbloqueio e registrar o tempo ocioso.

Aguardar não deve gerar uma nova situação automaticamente.

---

# 21. Interface das situações

O modal de situação deve parecer uma decisão estratégica do jogo, não um formulário administrativo.

Estrutura:

```text
SITUAÇÃO

Título

Descrição curta do problema

┌────────────┐ ┌────────────┐ ┌────────────┐
│ OPÇÃO A    │ │ OPÇÃO B    │ │ OPÇÃO C    │
│            │ │            │ │            │
│ consequências
│            │ │            │ │            │
│ ESCOLHER   │ │ ESCOLHER   │ │ ESCOLHER   │
└────────────┘ └────────────┘ └────────────┘
```

Consequências devem ser agrupadas por categoria:

- tempo;
- deslocamento;
- material;
- consequência futura.

Não esconder efeitos relevantes.

O jogador deve conseguir comparar as três alternativas rapidamente.

---

# 22. Feedback pós-decisão

Depois de uma escolha, o mapa deve refletir imediatamente o resultado.

Exemplos:

### Limpeza parcial

```text
S7
◐
PENDÊNCIA · 6 min
```

### Sala bloqueada

```text
S5
🔒
bloqueada · 18 min
```

### Limpeza concluída

```text
S5
✓
```

### Ida ao DEP

Mostrar visualmente:

```text
jogador → DEP → destino
```

A interface deve comunicar a consequência espacial da decisão, não apenas escrever um texto de log.

---

# 23. Histórico da partida

O histórico deve mostrar a sequência de decisões de forma compreensível.

Exemplo:

```text
Entrada
  ↓
S1
  ↓
S5
  ↓
DEP
  ↓
S8
```

O painel “O que mudou o total” deve funcionar como um log visual amigável, mostrando eventos relevantes e seus impactos.

Evitar aparência de log técnico.

---

# 24. Critérios de aceite

O MVP será considerado funcional quando:

- todas as 14 áreas de limpeza puderem ser identificadas;
- cada objetivo for clicável;
- o jogador tiver uma posição atual;
- o deslocamento for calculado por distância no corredor;
- a conversão for 1 min / 5 m;
- o mapa mostrar a posição atual;
- o mapa mostrar trajetória;
- o mapa mostrar estados das salas;
- o DEP for clicável;
- passar pelo DEP não recarregar automaticamente;
- estoque inicial/máximo for 10;
- salas consumirem 1 carga;
- banheiros consumirem 2 cargas;
- limpeza exigir material suficiente;
- situações possuírem pré-condições;
- a seed tornar o comportamento reproduzível;
- não haja repetição consecutiva da mesma situação;
- cada situação tenha três alternativas;
- as consequências sejam visíveis antes da escolha;
- pendências possam ser resolvidas posteriormente;
- pendências não gerem nova situação;
- bloqueios funcionem por tempo acumulado;
- “Aguardar” avance até o próximo desbloqueio;
- o jogo possa ser finalizado antes de concluir tudo;
- a tela final diferencie completas, pendentes e não iniciadas;
- partidas incompletas não superem automaticamente partidas completas;
- os dados e regras estejam separados dos componentes;
- `Reiniciar` restaure completamente o estado inicial.

---

# 25. Calibração

Os valores atuais devem ser tratados como parâmetros configuráveis.

Não alterar as regras durante a implementação apenas para facilitar a UI.

Após o MVP funcionando, podemos testar partidas reais e calibrar:

- duração do turno;
- pré-condições das situações;
- tempos;
- frequência das situações;
- quantidade de material;
- efeitos das cartas.

A prioridade inicial é validar a **mecânica e a experiência**, não encontrar os valores matematicamente perfeitos.

---

# 26. Princípio pedagógico

O jogo deve fazer o participante perceber que:

> **Uma solução eficiente não depende apenas de executar cada tarefa rapidamente, mas de escolher a ordem, antecipar consequências e administrar recursos.**

As principais dimensões de decisão são:

- ordem das salas;
- deslocamento;
- tempo;
- material;
- pendências;
- bloqueios;
- consequências futuras.

O jogo deve tornar essas relações visíveis através do mapa e dos feedbacks, sem exigir que o participante saiba programação.

---

# 27. Regra de ouro da implementação

**Não transformar o jogo em um dashboard.**

A experiência principal deve ser:

```text
OBSERVAR O MAPA
      ↓
ESCOLHER O PRÓXIMO OBJETIVO
      ↓
ANALISAR O CUSTO
      ↓
ENFRENTAR UMA SITUAÇÃO
      ↓
ESCOLHER UMA ESTRATÉGIA
      ↓
VER A CONSEQUÊNCIA NO MAPA
      ↓
PLANEJAR O PRÓXIMO MOVIMENTO
```

O mapa é o centro da experiência.
