/**
 * Playtest simulado das situações (Fase 1 e Fase 2).
 *
 * Um bot competente joga a partida: escolhe a rota comparando planos inteiros
 * (para onde ir primeiro, onde recarregar) e resolve as situações olhando um
 * passo adiante. Para cada situação estudada, gera estados variados de
 * partida, força a situação numa sala plausível e joga ATÉ O FIM com cada uma
 * das três ações. A ação que termina o turno mais cedo é a melhor NAQUELE
 * estado — e o que interessa é como isso muda de um estado para outro.
 *
 *   pnpm exec vite-node scripts/playtest.ts [cenarios-por-situacao] [saida.json] [onda]
 *
 * `onda`: fase1, a, b, c, d, fase2 (as 24) ou todas (as 32). Padrão: fase1.
 * Com `partidas` no lugar da onda, joga partidas inteiras com o sorteio normal
 * e mede o fluxo: fechamentos ao mesmo tempo, espera no corredor, cartas vistas.
 *
 * Só usa a API pública do domínio, para rodar também contra versões antigas
 * do catálogo e comparar antes e depois.
 */
import { writeFileSync } from 'node:fs';
import { gameConfig } from '../src/data/gameConfig';
import { DEPOSITO_POSITION, objectives, roomsById } from '../src/data/rooms';
import { situations, situationsById } from '../src/data/situations';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  isComplete,
  isSelectable,
  mustWait,
  selectRoom,
  waitInCorridor,
} from '../src/domain/game';
import { actionAvailability, evalTime, type EffectContext } from '../src/domain/effects';
import { findNearestBlockable, findNearestBlocked, isEligible } from '../src/domain/situationPicker';
import type { GameState, RoomState, SituationAction } from '../src/domain/types';

const ONDAS: Record<string, string[]> = {
  fase1: [
    'sala-suja',
    'material-acabando',
    'sala-trancada',
    'turma-ajuda',
    'carrinho-da-manutencao',
    'fluxo-de-alunos',
    'enceradeira-disponivel',
    'entrega-de-material',
  ],
  /* Onda A: só mecânicas que já existiam, com parâmetros novos. */
  a: [
    'sala-em-uso',
    'lixeiras-cheias',
    'cadeiras-em-circulo',
    'janela-aberta',
    'vaso-entupido',
    'piso-encharcado',
    'turno-da-manha',
    'escada-enlameada',
    'poeira-de-obra',
    'escada-ja-varrida',
    'falta-de-agua',
    'colega-de-turno',
    'evento-cancelado',
    'sem-torneira-na-sala',
    'mural-do-semestre',
    'ar-condicionado-pingando',
    'banheiro-reformado',
    'carrinho-desorganizado',
  ],
  /* Onda B: o relógio do intervalo e a caixa do corredor consumida. */
  b: ['sala-organizada', 'sem-reposicao'],
  /* Onda C: aposta. */
  c: ['equipamento-quebrado', 'sala-de-prova'],
  /* Onda D: metas com prazo. */
  d: ['visita-da-direcao', 'pedido-da-coordenacao'],
};
ONDAS.fase2 = [...ONDAS.a, ...ONDAS.b, ...ONDAS.c, ...ONDAS.d];
ONDAS.todas = situations.map((situation) => situation.id);

const CENARIOS = Number(process.argv[2] ?? 120);
const SAIDA = process.argv[3];
const ONDA = process.argv[4] ?? 'fase1';
const ALVOS = ONDAS[ONDA] ?? [];

/* ------------------------------------------------------------------ */
/* Gerador determinístico                                              */
/* ------------------------------------------------------------------ */

let semente = 12345;
const aleatorio = () => {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
};
const sortear = <T,>(itens: T[]): T => itens[Math.floor(aleatorio() * itens.length)];

/* ------------------------------------------------------------------ */
/* Estimativa de um plano de rota                                      */
/* ------------------------------------------------------------------ */

/** Sobra média de uma situação ainda não vista: eventos custam ~2 min. */
const SOBRA_SITUACAO = 2;
const minutosDe = (metros: number) => metros / gameConfig.metersPerMinute;

/**
 * Custo de uma situação já conhecida (adiada ou revelada): a ação mais barata
 * que conclui a sala, em tempo. É isso que dá valor à informação — sem ela o
 * bot só conhece a média.
 */
function custoConhecido(situationId: string, roomId: string, rs: RoomState): number {
  const situation = situationsById[situationId];
  const room = roomsById[roomId];
  if (!situation) return room.baseCleaningMinutes + SOBRA_SITUACAO;
  const ctx: EffectContext = {
    room,
    roomState: rs,
    charges: gameConfig.maxCharges,
    position: room.corridorPosition,
    blockTargetId: null,
  };
  const custos = situation.actions
    .filter((a) => a.effects.some((e) => e.type === 'completeRoom'))
    .map((a) =>
      a.effects.reduce(
        (t, e) => t + (e.type === 'cleanTime' || e.type === 'eventTime' ? evalTime(e.amount, ctx) : 0),
        0,
      ),
    );
  return custos.length ? Math.min(...custos) : room.baseCleaningMinutes + SOBRA_SITUACAO + 3;
}

function modificadorEm(state: GameState, roomId: string, t: number): number {
  return (state.modifiers ?? [])
    .filter((m) => m.targets.includes(roomId) && (m.until === null || m.until > t))
    .reduce((total, m) => total + m.minutes, 0);
}

const delegada = (rs: RoomState) => Boolean(rs.delegatedUntil) && rs.status !== 'concluida';

function estimar(state: GameState, ordem: string[]): number {
  let pos = state.currentPosition;
  let t = currentTotal(state);
  let cargas = state.charges;
  let estoques = (state.stashes ?? []).map((s) => ({ ...s }));

  const andar = (destino: number, recolher: boolean) => {
    const de = Math.min(pos, destino);
    const ate = Math.max(pos, destino);
    t += minutosDe(Math.abs(pos - destino));
    if (recolher) {
      estoques = estoques.filter((e) => {
        if (e.position < de || e.position > ate) return true;
        const pega = Math.min(e.charges, gameConfig.maxCharges - cargas);
        cargas += pega;
        e.charges -= pega;
        return e.charges > 0;
      });
    }
    pos = destino;
  };
  /* Depósito fechado: quem chega antes da hora espera abrir. */
  const depositoAbre = state.rooms['DEP-A'].blockedUntilMinute ?? 0;
  const recarregar = () => {
    andar(DEPOSITO_POSITION, false);
    t = Math.max(t, depositoAbre);
    t += gameConfig.refillMinutes;
    cargas = gameConfig.maxCharges;
  };
  const prontaEm: Record<string, number> = {};

  for (const id of ordem) {
    if (id === 'DEP') {
      recarregar();
      continue;
    }
    const room = roomsById[id];
    const rs = state.rooms[id];
    const custo = rs.status === 'pendente' ? 0 : room.materialCost;
    if (cargas < custo) recarregar();
    andar(room.corridorPosition, true);
    if (rs.blockedUntilMinute !== null && rs.blockedUntilMinute > t) t = rs.blockedUntilMinute;
    /* Situação conhecida (adiada ou revelada): custo real da melhor ação.
       Desconhecida: tempo base mais a sobra média de uma situação. */
    const conhecida = rs.deferredSituationId ?? rs.previewSituationId;
    const base =
      rs.status === 'pendente'
        ? rs.residualMinutes
        : conhecida
          ? custoConhecido(conhecida, id, rs)
          : room.baseCleaningMinutes + rs.extraDirtMinutes + SOBRA_SITUACAO;
    t += Math.max(0, base + modificadorEm(state, id, t));
    prontaEm[id] = t;
    cargas -= custo;
  }
  /* Metas abertas: atrasar custa a penalidade; cumprir vale uma sala a menos
     (a recompensa entrega uma sala a alguém), estimada por baixo. */
  for (const meta of state.metas ?? []) {
    const atrasadas = meta.targets.filter((id) => state.rooms[id].status !== 'concluida' && (prontaEm[id] ?? Infinity) > meta.until);
    if (atrasadas.length) t += meta.penalidade * (meta.penalidadePorSala ? atrasadas.length : 1);
    else if (meta.recompensa) t -= 5;
  }
  const prontasDelegadas = objectives
    .map((r) => state.rooms[r.id])
    .filter(delegada)
    .map((rs) => rs.delegatedUntil ?? 0);
  return Math.max(t, ...prontasDelegadas);
}

/** Melhor plano entre varreduras nas duas direções, com a recarga em cada ponto possível. */
function melhorPlano(state: GameState): { ordem: string[]; custo: number } {
  const restantes = objectives.filter(
    (r) => state.rooms[r.id].status !== 'concluida' && !delegada(state.rooms[r.id]),
  );
  if (restantes.length === 0) return { ordem: [], custo: estimar(state, []) };
  const pos = state.currentPosition;
  const porPos = (a: typeof restantes[number], b: typeof restantes[number]) =>
    a.corridorPosition - b.corridorPosition || a.id.localeCompare(b.id);
  const adiante = restantes.filter((r) => r.corridorPosition >= pos).sort(porPos);
  const atras = restantes.filter((r) => r.corridorPosition < pos).sort(porPos).reverse();
  const atrasInclusivo = restantes.filter((r) => r.corridorPosition <= pos).sort(porPos).reverse();
  const adianteExclusivo = restantes.filter((r) => r.corridorPosition > pos).sort(porPos);
  const bases = [
    [...adiante, ...atras].map((r) => r.id),
    [...atrasInclusivo, ...adianteExclusivo].map((r) => r.id),
  ];

  let melhor = { ordem: bases[0], custo: Infinity };
  for (const base of bases) {
    for (let k = -1; k <= base.length; k += 1) {
      const ordem = k < 0 ? base : [...base.slice(0, k), 'DEP', ...base.slice(k)];
      const custo = estimar(state, ordem);
      if (custo < melhor.custo) melhor = { ordem, custo };
    }
  }
  return melhor;
}

/* ------------------------------------------------------------------ */
/* O bot                                                               */
/* ------------------------------------------------------------------ */

function contexto(state: GameState): EffectContext {
  const room = roomsById[state.situation!.roomId];
  return {
    room,
    roomState: state.rooms[room.id],
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: state.situation!.blockTargetId,
    unblockTargetId: state.situation!.unblockTargetId ?? null,
    game: state,
  };
}

function acoesDisponiveis(state: GameState) {
  const situation = situationsById[state.situation!.situationId];
  const ctx = contexto(state);
  return situation.actions.filter((a) => actionAvailability(a, ctx).available);
}

const temAposta = (acao: SituationAction) => acao.effects.some((e) => e.type === 'aposta');

/**
 * Custo de uma ação olhando um passo adiante. Com aposta, a média de algumas
 * sementes: o bot não pode ver o resultado antes de escolher, como o jogador.
 */
function custoDaAcao(state: GameState, acao: SituationAction): number {
  const amostras = temAposta(acao) ? [0, 1, 2, 3, 4, 5] : [0];
  let total = 0;
  for (const k of amostras) {
    const inicio = k === 0 ? state : { ...state, rngState: (state.rngState + 7919 * k) | 0 };
    const depois = chooseAction(inicio, acao.id);
    const deixaProblema = depois.rooms[state.situation!.roomId].deferredSituationId ? SOBRA_SITUACAO : 0;
    total += melhorPlano(depois).custo + deixaProblema;
  }
  return total / amostras.length;
}

/** Escolhe a ação olhando um passo adiante: a que deixa o melhor plano para o resto. */
function escolherAcao(state: GameState, epsilon: number): string {
  /* Um jogador não adia a mesma sala duas vezes: na volta, ele resolve. Sem
     isto o bot fica indo e voltando, porque adiar sempre parece um pouco mais
     barato quando o custo futuro é só uma estimativa. */
  const jaAdiada = Boolean(state.rooms[state.situation!.roomId].deferredSituationId);
  const todas = acoesDisponiveis(state);
  const semAdiar = todas.filter((a) => !a.effects.some((e) => e.type === 'leaveUnstarted'));
  const acoes = jaAdiada && semAdiar.length > 0 ? semAdiar : todas;
  if (aleatorio() < epsilon) return sortear(acoes).id;
  let melhor = { id: acoes[0].id, custo: Infinity };
  for (const acao of acoes) {
    const custo = custoDaAcao(state, acao);
    if (custo < melhor.custo) melhor = { id: acao.id, custo };
  }
  return melhor.id;
}

function proximaParada(state: GameState, epsilon: number): string | null {
  const selecionaveis = [...objectives.map((r) => r.id), 'DEP-A'].filter((id) => isSelectable(state, id));
  if (selecionaveis.length === 0) return null;
  if (aleatorio() < epsilon) return sortear(selecionaveis);
  const plano = melhorPlano(state).ordem.map((id) => (id === 'DEP' ? 'DEP-A' : id));
  const proxima = plano.find((id) => isSelectable(state, id)) ?? selecionaveis[0];
  /* O plano conta com a recarga implícita quando falta material; o jogador
     precisa ir de fato ao depósito antes, ou chega à sala sem ter como limpar. */
  const sala = roomsById[proxima];
  if (sala.cleanable && state.rooms[proxima].status !== 'pendente' && state.charges < sala.materialCost) {
    if (isSelectable(state, 'DEP-A')) return 'DEP-A';
    /* Depósito fechado: resolve uma pendência (não gasta material) ou segue
       para onde houver carta sem custo; o relógio anda até ele abrir. */
    const pendente = selecionaveis.find((id) => state.rooms[id]?.status === 'pendente');
    if (pendente) return pendente;
    /* Sem pendência: anda para perto do depósito enquanto ele não abre. */
    const andando = selecionaveis.filter((id) => roomsById[id].corridorPosition !== state.currentPosition);
    const pertoDoDeposito = [...(andando.length ? andando : selecionaveis)].sort(
      (a, b) =>
        Math.abs(roomsById[a].corridorPosition - DEPOSITO_POSITION) -
        Math.abs(roomsById[b].corridorPosition - DEPOSITO_POSITION),
    );
    return pertoDoDeposito[0] ?? proxima;
  }
  return proxima;
}

/** Um passo do jogo. Devolve null se não há o que fazer. */
function passo(state: GameState, epsilon: number): GameState | null {
  if (state.phase === 'situacao') return chooseAction(state, escolherAcao(state, epsilon));
  if (isComplete(state)) return null;
  const destino = proximaParada(state, epsilon);
  if (!destino) return mustWait(state) ? waitInCorridor(state) : null;
  return confirmTravel(selectRoom(state, destino));
}

function jogarAteOFim(state: GameState): GameState {
  let s = state;
  for (let guarda = 0; guarda < 400; guarda += 1) {
    const proximo = passo(s, 0);
    if (!proximo) break;
    s = proximo;
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Cenários                                                            */
/* ------------------------------------------------------------------ */

type Resultado = {
  situacao: string;
  sala: string;
  zona: 'base' | 'meio' | 'fundo';
  cargas: number;
  restantes: number;
  minuto: number;
  acoes: Record<string, { rota: string[]; total: number; completou: boolean; proxima: string | null; estoqueUsado?: boolean; alvosUsados?: number; alvosCriados?: number; ocioso: number }>;
};

const zonaDe = (pos: number): Resultado['zona'] => (pos <= 18 ? 'base' : pos <= 45 ? 'meio' : 'fundo');

function prepararEstado(): GameState {
  let s = createInitialState(1 + Math.floor(aleatorio() * 10000));
  const passos = Math.floor(aleatorio() * 26);
  for (let i = 0; i < passos; i += 1) {
    const proximo = passo(s, 0.35);
    if (!proximo) break;
    s = proximo;
    if (isComplete(s)) break;
  }
  // Nunca parar no meio de uma situação: ela é resolvida antes do cenário.
  if (s.phase === 'situacao') s = chooseAction(s, escolherAcao(s, 0));
  return s;
}

function cenario(situacaoId: string): Resultado | null {
  let s = prepararEstado();
  if (s.phase !== 'mapa' || isComplete(s)) return null;
  const situacao = situationsById[situacaoId];
  if (situacaoId === 'material-acabando') s = { ...s, charges: Math.floor(aleatorio() * 4) };

  const candidatas = objectives.filter((room) => {
    if (!isSelectable(s, room.id)) return false;
    const rs = s.rooms[room.id];
    if (rs.status !== 'nao-iniciada' || rs.deferredSituationId) return false;
    return isEligible(situacao, s, room, rs, currentTotal(s));
  });
  if (candidatas.length === 0) return null;
  const room = sortear(candidatas);

  let chegou = confirmTravel(selectRoom(s, room.id));
  const agora = currentTotal(chegou);
  chegou = {
    ...chegou,
    phase: 'situacao',
    situation: {
      situationId: situacaoId,
      roomId: room.id,
      blockTargetId: findNearestBlockable(chegou, room, agora),
      unblockTargetId: findNearestBlocked(chegou, room, agora),
    },
  };

  const acoes: Resultado['acoes'] = {};
  for (const acao of acoesDisponiveis(chegou)) {
    /* A aposta é medida pela média: cada cenário joga uma semente diferente
       do sorteio, e o relatório agrega muitos cenários. */
    const depois = chooseAction(
      temAposta(acao) ? { ...chegou, rngState: (chegou.rngState + Math.floor(aleatorio() * 1e6)) | 0 } : chegou,
      acao.id,
    );
    const proxima = depois.phase === 'mapa' ? proximaParada(depois, 0) : null;
    const fim = jogarAteOFim(depois);
    const criado = (depois.stashes ?? []).length > (chegou.stashes ?? []).length;
    const mods = (depois.modifiers ?? []).slice((chegou.modifiers ?? []).length);
    const alvosCriados = mods.reduce((n, m) => n + m.targets.length, 0);
    const restantesNoFim = mods.reduce((n, m) => {
      const aindaLa = (fim.modifiers ?? []).find((f) => f.id === m.id);
      return n + (aindaLa ? aindaLa.targets.length : 0);
    }, 0);
    acoes[acao.id] = {
      /* Ordem das salas limpas depois da decisão: é aqui que "mudou a rota" aparece. */
      rota: fim.route.slice(depois.route.length).map((p) => p.roomId).filter((id) => id !== 'DEP-A'),
      total: currentTotal(fim),
      completou: isComplete(fim),
      proxima,
      estoqueUsado: criado ? (fim.stashes ?? []).length < (depois.stashes ?? []).length : undefined,
      alvosCriados: mods.length ? alvosCriados : undefined,
      alvosUsados: mods.length ? alvosCriados - restantesNoFim : undefined,
      ocioso: fim.idleMinutes - depois.idleMinutes,
    };
    if (!isComplete(fim) || currentTotal(fim) > 400) {
      travadas.push(
        `${situacaoId}.${acao.id} em ${room.id}: fase ${fim.phase}, cargas ${fim.charges}, min ${currentTotal(fim).toFixed(0)}, ` +
          `faltam ${objectives.filter((r) => fim.rooms[r.id].status !== 'concluida').map((r) => `${r.id}(${fim.rooms[r.id].status}${fim.rooms[r.id].blockedUntilMinute ? ' até ' + fim.rooms[r.id].blockedUntilMinute : ''})`).join(',')}` +
          ` · DEP ${fim.rooms['DEP-A'].blockedUntilMinute ?? '-'} · ` +
          fim.log.slice(-6).map((e) => e.title).join(' | '),
      );
    }
  }
  if (Object.keys(acoes).length < 2) return null;

  return {
    situacao: situacaoId,
    sala: room.id,
    zona: zonaDe(room.corridorPosition),
    cargas: chegou.charges,
    restantes: objectives.filter((r) => chegou.rooms[r.id].status !== 'concluida').length,
    minuto: agora,
    acoes,
  };
}

/* ------------------------------------------------------------------ */
/* Execução e relatório                                                */
/* ------------------------------------------------------------------ */

const resultados: Resultado[] = [];
const travadas: string[] = [];

/* ------------------------------------------------------------------ */
/* Modo partidas: o jogo inteiro, com o sorteio de verdade              */
/* ------------------------------------------------------------------ */

if (ONDA === 'partidas') {
  const N = CENARIOS;
  const vistas: Record<string, number> = {};
  const escolhas: Record<string, number> = {};
  const totais: number[] = [];
  const ociosos: number[] = [];
  const picos: number[] = [];
  const minutosComFechamento: number[] = [];
  let incompletas = 0;
  for (let i = 0; i < N; i += 1) {
    let s = createInitialState(1000 + i * 37);
    let pico = 0;
    let comFechamento = 0;
    for (let guarda = 0; guarda < 400; guarda += 1) {
      if (s.phase === 'situacao') vistas[s.situation!.situationId] = (vistas[s.situation!.situationId] ?? 0) + 1;
      const antes = currentTotal(s);
      const fechadas = [...objectives.map((r) => r.id), 'DEP-A'].filter((id) => {
        const rs = s.rooms[id];
        return rs.status !== 'concluida' && !rs.delegatedUntil && rs.blockedUntilMinute !== null && rs.blockedUntilMinute > antes;
      }).length;
      pico = Math.max(pico, fechadas);
      const proximo = passo(s, 0);
      if (!proximo) break;
      if (fechadas > 0) comFechamento += currentTotal(proximo) - antes;
      if (s.phase === 'situacao' && proximo.decisions.length > s.decisions.length) {
        const d = proximo.decisions.at(-1)!;
        const chave = `${d.situationId}.${d.actionId}`;
        escolhas[chave] = (escolhas[chave] ?? 0) + 1;
      }
      s = proximo;
    }
    if (!isComplete(s)) {
      incompletas += 1;
      travadas.push(
        `semente ${1000 + i * 37}: fase ${s.phase}, cargas ${s.charges}, min ${currentTotal(s).toFixed(0)}, pos ${s.currentPosition}, ` +
          `faltam ${objectives
            .filter((r) => s.rooms[r.id].status !== 'concluida')
            .map((r) => `${r.id}(${s.rooms[r.id].status}${s.rooms[r.id].blockedUntilMinute ? ` até ${s.rooms[r.id].blockedUntilMinute}` : ''}${s.rooms[r.id].delegatedUntil ? ' deleg' : ''})`)
            .join(',')}` +
          ` · DEP ${s.rooms['DEP-A'].blockedUntilMinute ?? '-'} · ` +
          s.log.slice(-5).map((e) => `${e.title} [${e.detail}]`).join(' | '),
      );
    }
    totais.push(currentTotal(s));
    ociosos.push(s.idleMinutes);
    picos.push(pico);
    minutosComFechamento.push(comFechamento / Math.max(1, currentTotal(s)));
  }
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const out: string[] = [];
  out.push(`Partidas completas: ${N} · incompletas: ${incompletas}`);
  out.push(`Tempo final: mediana ${med(totais).toFixed(0)} min (mín ${Math.min(...totais).toFixed(0)}, máx ${Math.max(...totais).toFixed(0)})`);
  out.push(`Espera no corredor: média ${media(ociosos).toFixed(1)} min · partidas com espera: ${ociosos.filter((x) => x > 0).length}`);
  out.push(`Ambientes fechados ao mesmo tempo (pico por partida): mediana ${med(picos)} · máx ${Math.max(...picos)} · partidas com 3+: ${picos.filter((x) => x >= 3).length}`);
  out.push(`Parte do turno com algum ambiente fechado: ${(100 * media(minutosComFechamento)).toFixed(0)}%`);
  out.push(`Cartas por partida: ${(Object.values(vistas).reduce((a, b) => a + b, 0) / N).toFixed(1)}`);
  out.push('\nCartas vistas (sorteio real):');
  for (const sit of situations) out.push(`  ${String(vistas[sit.id] ?? 0).padStart(4)}  ${sit.title}`);
  out.push('\nEscolhas do bot, por situação:');
  for (const sit of situations) {
    const partes = sit.actions.map((a) => `${a.id} ${escolhas[`${sit.id}.${a.id}`] ?? 0}`);
    out.push(`  ${sit.title}: ${partes.join(' · ')}`);
  }
  if (travadas.length) out.push(`\nPARTIDAS INCOMPLETAS\n${travadas.join('\n')}`);
  console.log(out.join('\n'));
  process.exit(0);
}

for (const id of ALVOS) {
  if (!situationsById[id]) continue;
  let feitos = 0;
  for (let tentativa = 0; feitos < CENARIOS && tentativa < CENARIOS * 6; tentativa += 1) {
    const r = cenario(id);
    if (r) {
      resultados.push(r);
      feitos += 1;
    }
  }
}

const EMPATE = 0.5;
const linhas: string[] = [];
{
  const todas = resultados.flatMap((r) => Object.values(r.acoes));
  const incompletas = todas.filter((a) => !a.completou).length;
  const totais = todas.map((a) => a.total).sort((a, b) => a - b);
  linhas.push(
    `Partidas simuladas: ${todas.length} · incompletas: ${incompletas}` +
      ` · tempo final mín/mediana/máx: ${totais[0]?.toFixed(0)}/${totais[Math.floor(totais.length / 2)]?.toFixed(0)}/${totais.at(-1)?.toFixed(0)} min`,
  );
}
for (const id of ALVOS) {
  const rs = resultados.filter((r) => r.situacao === id);
  if (rs.length === 0) continue;
  const situacao = situationsById[id];
  linhas.push(`\n## ${situacao.title}  (${rs.length} cenários)`);
  const ids = situacao.actions.map((a) => a.id);
  for (const aid of ids) {
    const comAcao = rs.filter((r) => r.acoes[aid]);
    if (comAcao.length === 0) continue;
    const melhor = (r: Resultado) => Math.min(...Object.values(r.acoes).map((a) => a.total));
    const vence = comAcao.filter((r) => r.acoes[aid].total <= melhor(r) + EMPATE);
    const arrependimento = comAcao.map((r) => r.acoes[aid].total - melhor(r));
    const media = arrependimento.reduce((a, b) => a + b, 0) / arrependimento.length;
    const porZona = (['base', 'meio', 'fundo'] as const)
      .map((z) => {
        const daZona = comAcao.filter((r) => r.zona === z);
        if (daZona.length === 0) return `${z} —`;
        const v = daZona.filter((r) => r.acoes[aid].total <= melhor(r) + EMPATE).length;
        return `${z} ${Math.round((100 * v) / daZona.length)}%`;
      })
      .join(' · ');
    const label = situacao.actions.find((a) => a.id === aid)!.label;
    linhas.push(
      `- ${label.padEnd(38)} melhor em ${String(Math.round((100 * vence.length) / comAcao.length)).padStart(3)}%` +
        ` | arrependimento médio ${media.toFixed(1)} min | ${porZona}`,
    );
    const estoque = comAcao.filter((r) => r.acoes[aid].estoqueUsado !== undefined);
    if (estoque.length) {
      const usados = estoque.filter((r) => r.acoes[aid].estoqueUsado).length;
      linhas.push(`    estoque recolhido em ${Math.round((100 * usados) / estoque.length)}% das partidas`);
    }
    const mods = comAcao.filter((r) => r.acoes[aid].alvosCriados !== undefined);
    if (mods.length) {
      const criados = mods.reduce((n, r) => n + (r.acoes[aid].alvosCriados ?? 0), 0);
      const usados = mods.reduce((n, r) => n + (r.acoes[aid].alvosUsados ?? 0), 0);
      linhas.push(
        `    efeito regional: ${(criados / mods.length).toFixed(1)} salas alcançadas em média,` +
          ` ${criados ? Math.round((100 * usados) / criados) : 0}% delas chegaram a receber o efeito`,
      );
    }
    const ocioso = comAcao.reduce((n, r) => n + r.acoes[aid].ocioso, 0) / comAcao.length;
    if (ocioso > 0.05) linhas.push(`    espera no corredor depois: ${ocioso.toFixed(1)} min em média`);
  }
  const mudaRota = rs.filter((r) => new Set(Object.values(r.acoes).map((a) => a.rota.join('>'))).size > 1).length;
  const porMomento = (['cedo', 'meio', 'tarde'] as const).map((m) => {
    const faixa = rs.filter((r) => (r.minuto < 45 ? 'cedo' : r.minuto < 90 ? 'meio' : 'tarde') === m);
    if (!faixa.length) return `${m}: —`;
    const melhores = ids.map((aid) => {
      const v = faixa.filter((r) => r.acoes[aid] && r.acoes[aid].total <= Math.min(...Object.values(r.acoes).map((a) => a.total)) + EMPATE).length;
      return `${Math.round((100 * v) / faixa.length)}%`;
    });
    return `${m} (${faixa.length}): ${melhores.join('/')}`;
  });
  linhas.push(`  por momento do turno (melhor, na ordem das ações): ${porMomento.join(' · ')}`);
  const spread = rs.map((r) => {
    const totais = Object.values(r.acoes).map((a) => a.total);
    return Math.max(...totais) - Math.min(...totais);
  });
  linhas.push(
    `  → a escolha muda a ordem das salas no resto do turno em ${Math.round((100 * mudaRota) / rs.length)}% dos cenários;` +
      ` diferença média entre a melhor e a pior ação: ${(spread.reduce((a, b) => a + b, 0) / spread.length).toFixed(1)} min`,
  );
}
/* Painel de dinamismo: o critério da Fase 1 aplicado a cada situação. */
linhas.push('\n## Resumo de dinamismo (critério da Fase 1: nenhuma ação melhor em mais de 70%)');
for (const id of ALVOS) {
  const rs = resultados.filter((r) => r.situacao === id);
  if (rs.length === 0) {
    linhas.push(`- ${id}: sem cenários`);
    continue;
  }
  const situacao = situationsById[id];
  const melhor = (r: Resultado) => Math.min(...Object.values(r.acoes).map((a) => a.total));
  const partes = situacao.actions.map((a) => {
    const com = rs.filter((r) => r.acoes[a.id]);
    if (!com.length) return 0;
    return Math.round((100 * com.filter((r) => r.acoes[a.id].total <= melhor(r) + EMPATE).length) / com.length);
  });
  const mudaRota = Math.round(
    (100 * rs.filter((r) => new Set(Object.values(r.acoes).map((a) => a.rota.join('>'))).size > 1).length) / rs.length,
  );
  const alerta = Math.max(...partes) > 70 ? '  ⚠ dominante' : Math.min(...partes) < 5 ? '  ⚠ ação morta' : '';
  linhas.push(`- ${situacao.title.padEnd(34)} ${partes.map((p) => `${String(p).padStart(3)}%`).join(' ')} | muda rota ${mudaRota}%${alerta}`);
}
console.log(linhas.join('\n'));
if (travadas.length) console.log(`\nPARTIDAS TRAVADAS (${travadas.length})\n${travadas.slice(0, 6).join('\n')}`);
if (SAIDA) writeFileSync(SAIDA, JSON.stringify(resultados));
