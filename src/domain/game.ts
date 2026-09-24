import { gameConfig } from '../data/gameConfig';
import { ENTRANCE_POSITION, objectives, rooms, roomsById } from '../data/rooms';
import { situations, situationsById } from '../data/situations';
import {
  actionAvailability,
  effectiveBase,
  evalCharges,
  evalTime,
  formatMinutes,
  targetPosition,
  type EffectContext,
} from './effects';
import { distanceBetween, totalMinutes, travelMinutes } from './movement';
import {
  DEPOSITOS,
  minutoDoSinal,
  modificadorDaSala,
  nomeDaPosicao,
  nomesDasSalas,
  resolverRegiao,
  suprimentoMaisProximo,
  PONTOS,
} from './mapa';
import { nextRandom } from './rng';
import { drawSituation, findNearestBlockable, findNearestBlocked, isEligible } from './situationPicker';
import type { ActiveBuff, Effect, GameState, LogEntry, Meta, RoomDef, RoomState, SituationDef } from './types';

/* ------------------------------------------------------------------ */
/* Estado inicial                                                      */
/* ------------------------------------------------------------------ */

function initialRoomState(): RoomState {
  return {
    status: 'nao-iniciada',
    residualMinutes: 0,
    extraDirtMinutes: 0,
    blockedUntilMinute: null,
  };
}

export function createInitialState(seed: number = gameConfig.seed): GameState {
  return {
    phase: 'mapa',
    currentPosition: ENTRANCE_POSITION,
    buffs: [],
    modifiers: [],
    stashes: [],
    metas: [],
    distanceTraveled: 0,
    cleaningMinutes: 0,
    eventMinutes: 0,
    idleMinutes: 0,
    charges: gameConfig.initialCharges,
    rooms: Object.fromEntries(rooms.map((room) => [room.id, initialRoomState()])),
    route: [],
    log: [],
    decisions: [],
    pendingTargetId: null,
    situation: null,
    rngState: seed,
    bag: [],
    lastSituationId: null,
  };
}

/* ------------------------------------------------------------------ */
/* Seletores                                                           */
/* ------------------------------------------------------------------ */

export const currentTotal = (state: GameState): number => totalMinutes(state);

export function isBlocked(state: GameState, roomId: string): boolean {
  const until = state.rooms[roomId].blockedUntilMinute;
  return until !== null && until > currentTotal(state);
}

export function minutesUntilFree(state: GameState, roomId: string): number {
  const until = state.rooms[roomId].blockedUntilMinute;
  if (until === null) return 0;
  return Math.max(0, until - currentTotal(state));
}

export function remainingObjectives(state: GameState): RoomDef[] {
  return objectives.filter((room) => state.rooms[room.id].status !== 'concluida');
}

/**
 * O ambiente em que o trabalhador está parado, se ele estiver dentro de um.
 *
 * É a última parada da rota — mas só enquanto ele continuar ali. Efeitos de
 * `moveTo` (ida ao depósito, volta à entrada) mudam a posição sem abrir parada
 * nova, então a última parada pode ser um ambiente já deixado para trás. Daí a
 * confirmação pela posição: ela distingue "ainda aqui" de "já saí".
 */
function ambienteAtual(state: GameState): RoomDef | null {
  const ultima = state.route.at(-1);
  if (!ultima) return null;
  const room = roomsById[ultima.roomId];
  if (!room) return null;
  return room.corridorPosition === state.currentPosition ? room : null;
}

export function isSelectable(state: GameState, roomId: string): boolean {
  if (state.phase !== 'mapa') return false;
  const room = roomsById[roomId];
  if (!room) return false;
  // O depósito é um destino como qualquer outro; passar por ele não recarrega (C3).
  // Só não dá para ir até ele enquanto estiver fechado.
  if (room.kind === 'deposito') return !isBlocked(state, roomId);
  if (!room.cleanable) return false;
  if (state.rooms[roomId].status === 'concluida') return false;
  /* Sala entregue a um colega não é mais sua, mesmo que alguém a libere. */
  if (state.rooms[roomId].delegatedUntil) return false;
  /**
   * Uma volta exige ter saído.
   *
   * As cartas que deixam pendência cobram uma viagem de retorno ("na volta
   * fica X min"), e as que adiam cobram a sujeira acumulada. Só que nada
   * impedia reabrir o mesmo ambiente no instante seguinte, com deslocamento
   * zero — e terminar o resíduo não consome material. Medido no catálogo: isso
   * DOMINAVA a opção de fazer o serviço completo em 4 situações, empatava em
   * outras 3, e permitia re-sortear a situação pelo preço da sujeira.
   *
   * A comparação é por identidade de ambiente, nunca por posição: S1 e S7
   * dividem a mesma `corridorPosition`, e bloquear por posição impediria
   * limpar a sala da ala oposta, que é um destino legítimo.
   *
   * Não há impasse: o depósito é sempre selecionável, então sair e voltar é
   * sempre possível — e é exatamente o deslocamento que a carta cobrava.
   */
  if (ambienteAtual(state)?.id === roomId) return false;
  return !isBlocked(state, roomId);
}

/**
 * Válvula anti-deadlock: aparece quando todo objetivo restante está bloqueado,
 * ou quando não há destino nenhum. O segundo caso existe porque o depósito
 * também fecha: quem deixou uma pendência no último ambiente precisa sair e
 * voltar, e com o depósito fechado não tem para onde ir. Esperar a reabertura
 * é a única saída honesta.
 */
export function mustWait(state: GameState): boolean {
  const remaining = remainingObjectives(state);
  if (remaining.length === 0) return false;
  if (remaining.every((room) => isBlocked(state, room.id))) return true;
  const destinos = [...remaining.map((room) => room.id), ...DEPOSITOS];
  return state.phase === 'mapa' && !destinos.some((id) => isSelectable(state, id));
}

/**
 * O que falta é só o ambiente em que o trabalhador está (pendente ou adiado).
 * Pela regra "uma volta exige ter saído" ele precisa sair e voltar, e o
 * destino possível é o depósito. Devolve esse ambiente, para a tela avisar;
 * sem o aviso, o mapa parece travado.
 */
export function precisaSairParaVoltar(state: GameState): RoomDef | null {
  if (state.phase !== 'mapa' || mustWait(state)) return null;
  const remaining = remainingObjectives(state);
  if (remaining.length === 0 || remaining.some((room) => isSelectable(state, room.id))) return null;
  const atual = ambienteAtual(state);
  return atual && remaining.some((room) => room.id === atual.id) ? atual : null;
}

/**
 * Atalho do "saia e volte": vai ao depósito (recarrega, como qualquer ida) e
 * volta ao ambiente que falta. Custa exatamente o que as duas idas custariam
 * clicadas uma a uma; só poupa o jogador de descobrir o caminho.
 */
export function sairEVoltar(state: GameState): GameState {
  const sala = precisaSairParaVoltar(state);
  if (!sala) return state;
  const deposito = DEPOSITOS.find((id) => isSelectable(state, id));
  if (!deposito) return state;
  const noDeposito = confirmTravel(selectRoom(state, deposito));
  return confirmTravel(selectRoom(noDeposito, sala.id));
}

export function nextUnblockMinute(state: GameState): number | null {
  const times = [...remainingObjectives(state).map((room) => room.id), ...DEPOSITOS]
    .map((id) => state.rooms[id].blockedUntilMinute)
    .filter((value): value is number => value !== null && value > currentTotal(state));
  return times.length > 0 ? Math.min(...times) : null;
}

export function isComplete(state: GameState): boolean {
  return remainingObjectives(state).length === 0;
}

/* ------------------------------------------------------------------ */
/* Log                                                                 */
/* ------------------------------------------------------------------ */

type LogDraft = Omit<LogEntry, 'index' | 'totalAfter'>;

function appendLog(state: GameState, draft: LogDraft): GameState {
  const entry: LogEntry = {
    ...draft,
    index: state.log.length + 1,
    totalAfter: currentTotal(state),
  };
  return { ...state, log: [...state.log, entry] };
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

export function selectRoom(state: GameState, roomId: string): GameState {
  if (!isSelectable(state, roomId)) return state;
  return { ...state, phase: 'confirmacao', pendingTargetId: roomId };
}

export function cancelSelection(state: GameState): GameState {
  if (state.phase !== 'confirmacao') return state;
  return { ...state, phase: 'mapa', pendingTargetId: null };
}

/** Material recolhido de um estoque no caminho. */
type Recolha = { label: string; position: number; charges: number };

/**
 * Aplica apenas o deslocamento. Ponto de não-retorno da decisão Q11.
 *
 * Quem passa por um estoque no corredor recolhe o que cabe no carrinho; o que
 * não cabe continua lá. Indo ao depósito não recolhe: a recarga enche o
 * carrinho de qualquer jeito, e o estoque seria gasto à toa.
 */
function travelTo(
  state: GameState,
  position: number,
  recolher = true,
): { state: GameState; meters: number; recolhido: Recolha[] } {
  const meters = distanceBetween(state.currentPosition, position);
  const de = Math.min(state.currentPosition, position);
  const ate = Math.max(state.currentPosition, position);
  let charges = state.charges;
  const recolhido: Recolha[] = [];
  /* A caixa do ponto de partida não é recolhida ao sair: "pega ao passar"
     quer dizer chegar ou atravessar. Sem isso, uma caixa deixada aqui voltaria
     ao carrinho no primeiro passo e seria só um ganho de carga disfarçado. */
  const stashes = recolher
    ? state.stashes.flatMap((stash) => {
        if (stash.position < de || stash.position > ate) return [stash];
        if (stash.position === state.currentPosition && meters > 0) return [stash];
        const pega = Math.min(stash.charges, gameConfig.maxCharges - charges);
        if (pega > 0) {
          charges += pega;
          recolhido.push({ label: stash.label, position: stash.position, charges: pega });
        }
        const sobra = stash.charges - pega;
        return sobra > 0 ? [{ ...stash, charges: sobra }] : [];
      })
    : state.stashes;
  return {
    state: {
      ...state,
      currentPosition: position,
      distanceTraveled: state.distanceTraveled + meters,
      charges,
      stashes,
    },
    meters,
    recolhido,
  };
}

/** Registra no log o material recolhido, para o carrinho cheio ter explicação. */
function logRecolhido(state: GameState, recolhido: Recolha[]): GameState {
  return recolhido.reduce(
    (atual, item) =>
      appendLog(atual, {
        roomId: null,
        title: `${item.label}: material recolhido`,
        detail: `+${item.charges} ${item.charges === 1 ? 'carga' : 'cargas'} em ${nomeDaPosicao(item.position)}`,
        deltaDistance: 0,
        deltaCleaning: 0,
        deltaEvent: 0,
        deltaIdle: 0,
        deltaCharges: item.charges,
      }),
    state,
  );
}

/**
 * Aplica os modificadores do mapa que apontam para esta sala e os consome.
 * Um bônus nunca devolve mais tempo do que a sala custou; uma penalidade só
 * pega quem trabalhar na sala antes de ela expirar.
 */
function aplicarModificadores(
  state: GameState,
  roomId: string,
  deltas: Deltas,
  agora: number,
): { state: GameState; abatidos: string[] } {
  const ativos = state.modifiers.filter((mod) => mod.until === null || mod.until > agora);
  if (deltas.cleaning <= 0) return { state: { ...state, modifiers: ativos }, abatidos: [] };

  let cleaning = deltas.cleaning;
  const abatidos: string[] = [];
  const modifiers = ativos
    .map((mod) => {
      if (!mod.targets.includes(roomId)) return mod;
      const delta = mod.minutes < 0 ? -Math.min(-mod.minutes, cleaning) : mod.minutes;
      cleaning += delta;
      if (delta !== 0) {
        abatidos.push(`${mod.label}: ${delta < 0 ? '−' : '+'}${formatMinutes(Math.abs(delta))} min`);
      }
      return { ...mod, targets: mod.targets.filter((id) => id !== roomId) };
    })
    .filter((mod) => mod.targets.length > 0);

  const diferenca = cleaning - deltas.cleaning;
  deltas.cleaning = cleaning;
  return {
    state: { ...state, modifiers, cleaningMinutes: state.cleaningMinutes + diferenca },
    abatidos,
  };
}

/**
 * Salas entregues a um colega ficam prontas quando o relógio chega ao minuto
 * combinado. Roda depois de toda ação que avança o relógio.
 */
function concluirDelegadas(state: GameState): GameState {
  const agora = currentTotal(state);
  const prontas = objectives.filter((room) => {
    const until = state.rooms[room.id].delegatedUntil;
    return until != null && until <= agora;
  });
  return prontas.reduce((atual, room) => {
    const rooms = {
      ...atual.rooms,
      [room.id]: {
        ...atual.rooms[room.id],
        status: 'concluida' as const,
        delegatedUntil: null,
        blockedUntilMinute: null,
        residualMinutes: 0,
      },
    };
    const modifiers = atual.modifiers
      .map((mod) => ({ ...mod, targets: mod.targets.filter((id) => id !== room.id) }))
      .filter((mod) => mod.targets.length > 0);
    return appendLog({ ...atual, rooms, modifiers }, {
      roomId: room.id,
      title: `${room.shortName}: concluída por um colega`,
      detail: 'Serviço delegado, sem custo seu',
      deltaDistance: 0,
      deltaCleaning: 0,
      deltaEvent: 0,
      deltaIdle: 0,
      deltaCharges: 0,
    });
  }, state);
}

/**
 * Aplica os bônus diferidos em vigor a UMA sala trabalhada e gasta uma carga de
 * cada um. Abate no máximo o que a sala custou — um bônus nunca devolve tempo
 * ou material que não foi gasto ali.
 *
 * Vale tanto para uma situação resolvida quanto para o retorno a uma pendência:
 * as duas são trabalho numa sala, e tratar só uma delas criaria uma exceção que
 * o jogador não teria como adivinhar.
 */
function consumirBuffs(
  state: GameState,
  deltas: Deltas,
): { state: GameState; abatidos: string[] } {
  if (state.buffs.length === 0) return { state, abatidos: [] };

  let cleaning = deltas.cleaning;
  let charges = state.charges;
  const gastasAqui = -deltas.charges;
  let devolvidas = 0;
  const abatidos: string[] = [];

  const restantes: ActiveBuff[] = [];
  for (const buff of state.buffs) {
    if (buff.kind === 'tempo') {
      const abate = Math.min(buff.amount, cleaning);
      if (abate > 0) {
        cleaning -= abate;
        abatidos.push(`${buff.label}: −${formatMinutes(abate)} min`);
      }
    } else {
      const abate = Math.min(buff.amount, gastasAqui - devolvidas);
      if (abate > 0) {
        devolvidas += abate;
        abatidos.push(`${buff.label}: −${abate} carga${abate === 1 ? '' : 's'}`);
      }
    }
    const roomsLeft = buff.roomsLeft - 1;
    if (roomsLeft > 0) restantes.push({ ...buff, roomsLeft });
  }

  const economia = deltas.cleaning - cleaning;
  charges = Math.min(gameConfig.maxCharges, charges + devolvidas);
  deltas.cleaning = cleaning;
  deltas.charges += devolvidas;

  return {
    state: {
      ...state,
      buffs: restantes,
      charges,
      cleaningMinutes: state.cleaningMinutes - economia,
    },
    abatidos,
  };
}

export function confirmTravel(state: GameState): GameState {
  return depoisDoRelogio(chegarAoDestino(state));
}

/** Tudo o que acontece sozinho quando o relógio anda: colegas e prazos. */
function depoisDoRelogio(state: GameState): GameState {
  return avaliarMetas(concluirDelegadas(state));
}

/** Minutos até o colega da recompensa terminar a sala que ganhou. */
const MINUTOS_DA_RECOMPENSA = 10;

/**
 * Metas com prazo: cumpridas assim que todas as salas-alvo estão prontas (ou
 * entregues a alguém); vencidas quando o relógio passa do prazo com alguma
 * por fazer. A penalidade vira um "+N min" com endereço nas salas que faltaram,
 * o mesmo selo que o jogador já conhece do mapa.
 */
function avaliarMetas(state: GameState): GameState {
  if (state.metas.length === 0) return state;
  const agora = currentTotal(state);
  let next = state;
  const abertas: Meta[] = [];
  for (const meta of state.metas) {
    const faltam = meta.targets.filter((id) => {
      const rs = next.rooms[id];
      return rs.status !== 'concluida' && !rs.delegatedUntil;
    });
    if (faltam.length === 0) {
      const origem = roomsById[meta.origem];
      const premio = meta.recompensa
        ? meta.recompensa.target === 'origem'
          ? [meta.origem]
          : resolverRegiao(next, origem, meta.recompensa.target).slice(0, 1)
        : [];
      const alvos = premio.filter((id) => next.rooms[id].status !== 'concluida' && !next.rooms[id].delegatedUntil);
      next = delegar(next, alvos, agora + MINUTOS_DA_RECOMPENSA);
      next = appendLog(next, {
        roomId: null,
        title: `${meta.label}: cumprida`,
        detail: meta.recompensa && alvos.length
          ? `${meta.recompensa.label}: ${nomesDasSalas(alvos)} pronta no minuto ${formatMinutes(agora + MINUTOS_DA_RECOMPENSA)}`
          : 'Salas prontas a tempo',
        deltaDistance: 0,
        deltaCleaning: 0,
        deltaEvent: 0,
        deltaIdle: 0,
        deltaCharges: 0,
      });
      continue;
    }
    if (agora >= meta.until) {
      const multadas = meta.penalidadePorSala ? faltam : faltam.slice(0, 1);
      next = {
        ...next,
        modifiers: [
          ...next.modifiers,
          {
            id: `meta-${meta.id}`,
            label: `${meta.label} (atrasou)`,
            minutes: meta.penalidade,
            targets: multadas,
            until: null,
          },
        ],
      };
      next = appendLog(next, {
        roomId: null,
        title: `${meta.label}: prazo vencido`,
        detail: `+${meta.penalidade} min em ${nomesDasSalas(multadas)}`,
        deltaDistance: 0,
        deltaCleaning: 0,
        deltaEvent: 0,
        deltaIdle: 0,
        deltaCharges: 0,
      });
      continue;
    }
    abertas.push(meta);
  }
  return { ...next, metas: abertas };
}

/** Entrega salas a alguém: ficam fechadas e prontas no minuto combinado. */
function delegar(state: GameState, ids: string[], until: number): GameState {
  if (ids.length === 0) return state;
  return {
    ...state,
    rooms: {
      ...state.rooms,
      ...Object.fromEntries(
        ids.map((id) => [
          id,
          {
            ...state.rooms[id],
            status: 'nao-iniciada' as const,
            residualMinutes: 0,
            delegatedUntil: until,
            blockedUntilMinute: until,
            deferredSituationId: null,
            previewSituationId: null,
          },
        ]),
      ),
    },
  };
}

/** A situação ainda oferece ao menos uma saída, com o estado de agora? */
function temAcaoExecutavel(
  situation: SituationDef,
  state: GameState,
  room: RoomDef,
  roomState: RoomState,
): boolean {
  const ctx: EffectContext = {
    room,
    roomState,
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: null,
    game: state,
  };
  return situation.actions.some((action) => actionAvailability(action, ctx).available);
}

function chegarAoDestino(state: GameState): GameState {
  if (state.phase !== 'confirmacao' || !state.pendingTargetId) return state;
  const room = roomsById[state.pendingTargetId];
  const roomStateBefore = state.rooms[room.id];

  const moved = travelTo(state, room.corridorPosition, room.kind !== 'deposito');
  let next: GameState = { ...moved.state, pendingTargetId: null };

  const purpose =
    room.kind === 'deposito' ? 'deposito' : roomStateBefore.status === 'pendente' ? 'retorno' : 'limpeza';

  next = {
    ...next,
    route: [...next.route, { roomId: room.id, roomName: room.name, distance: moved.meters, purpose }],
  };

  next = appendLog(next, {
    roomId: room.id,
    title: `Deslocamento até ${room.shortName}`,
    detail: `${moved.meters} m percorridos (${formatMinutes(travelMinutes(moved.meters))} min)`,
    deltaDistance: moved.meters,
    deltaCleaning: 0,
    deltaEvent: 0,
    deltaIdle: 0,
    deltaCharges: 0,
  });
  next = logRecolhido(next, moved.recolhido);

  // Depósito: parada deliberada, reabastece e cobra o tempo de recarga (C3/Q8).
  if (room.kind === 'deposito') {
    const gained = gameConfig.maxCharges - next.charges;
    next = {
      ...next,
      charges: gameConfig.maxCharges,
      eventMinutes: next.eventMinutes + gameConfig.refillMinutes,
    };
    return appendLog({ ...next, phase: 'mapa' }, {
      roomId: room.id,
      title: 'Reabastecimento no depósito',
      detail: `Carrinho completo (${gameConfig.maxCharges} cargas)`,
      deltaDistance: 0,
      deltaCleaning: 0,
      deltaEvent: gameConfig.refillMinutes,
      deltaIdle: 0,
      deltaCharges: gained,
    });
  }

  // Pendência: conclui direto, sem situação, sem escolha e sem material (Q18).
  if (roomStateBefore.status === 'pendente') {
    const agora = currentTotal(next);
    const residual = roomStateBefore.residualMinutes;
    next = {
      ...next,
      cleaningMinutes: next.cleaningMinutes + residual,
      rooms: {
        ...next.rooms,
        [room.id]: {
          ...roomStateBefore,
          status: 'concluida',
          residualMinutes: 0,
          deferredSituationId: null,
        },
      },
    };
    const pendDeltas: Deltas = { distance: 0, cleaning: residual, event: 0, charges: 0 };
    const comMapa = aplicarModificadores(next, room.id, pendDeltas, agora);
    const comBuffs = consumirBuffs(comMapa.state, pendDeltas);
    next = comBuffs.state;
    const abatidos = [...comMapa.abatidos, ...comBuffs.abatidos];
    return appendLog({ ...next, phase: 'mapa' }, {
      roomId: room.id,
      title: `${room.shortName}: pendência resolvida`,
      detail: abatidos.length
        ? `${pendDeltas.cleaning} min de serviço restante · ${abatidos.join(' · ')}`
        : `${residual} min de serviço restante, sem consumo de material`,
      deltaDistance: 0,
      deltaCleaning: pendDeltas.cleaning,
      deltaEvent: 0,
      deltaIdle: 0,
      deltaCharges: 0,
    });
  }

  const totalNow = currentTotal(next);
  const roomStateAgora: RoomState = roomStateBefore;

  /**
   * Sala adiada: a mesma situação espera o jogador. Um novo sorteio faria de
   * "deixar para depois" um jeito de trocar de problema pagando só o
   * deslocamento. A pré-condição original não é reavaliada — o problema
   * continua lá —, mas a situação precisa ter ao menos uma saída possível.
   */
  /* A situação já conhecida — adiada aqui, ou contada por alguém antes de
     o jogador chegar — vale no lugar do sorteio. */
  const conhecidaId = roomStateAgora.deferredSituationId ?? roomStateAgora.previewSituationId;
  const conhecida = conhecidaId ? situationsById[conhecidaId] : undefined;
  const retomada =
    conhecida && temAcaoExecutavel(conhecida, next, room, roomStateAgora) ? conhecida.id : null;
  if (roomStateAgora.previewSituationId) {
    next = {
      ...next,
      rooms: { ...next.rooms, [room.id]: { ...roomStateAgora, previewSituationId: null } },
    };
  }

  // Sala não iniciada: sorteia a situação.
  const drawn = retomada ? null : drawSituation(next, room, roomStateAgora, totalNow);
  /* Se o sorteio falhar, a reserva tem de respeitar o escopo do ambiente: um
     id fixo furaria a regra de que cada tipo de cômodo tem seus problemas. */
  const reserva = situations.find((candidate) =>
    isEligible(candidate, next, room, roomStateAgora, totalNow),
  );
  const situationId = retomada ?? drawn?.situationId ?? reserva?.id;
  /**
   * Invariante: todo tipo de ambiente tem ao menos uma situação sem
   * pré-condição, cuja elegibilidade ainda exige uma ação executável. Chegar
   * aqui significa que o catálogo perdeu essa cobertura para este `kind` — e o
   * jogador já pagou o deslocamento. Falhar alto é melhor que devolvê-lo ao
   * mapa em silêncio, cobrando uma viagem que não virou decisão nenhuma.
   */
  if (!situationId) {
    throw new Error(
      `Nenhuma situação elegível para ${room.id} (kind "${room.kind}"). ` +
        'O catálogo precisa de ao menos uma situação sem pré-condição para cada ' +
        'tipo de ambiente, com ao menos uma ação executável.',
    );
  }
  const situation = situationsById[situationId];

  const usaEfeito = (tipo: Effect['type'], extra?: (effect: Effect) => boolean) =>
    situation.actions.some((action) =>
      action.effects.some((effect) => effect.type === tipo && (!extra || extra(effect))),
    );
  const needsBlockTarget = usaEfeito(
    'blockRoom',
    (effect) => effect.type === 'blockRoom' && effect.target === 'nearestOther',
  );
  const needsUnblockTarget = usaEfeito('unblockRoom');

  return {
    ...next,
    phase: 'situacao',
    bag: drawn?.bag ?? next.bag,
    rngState: drawn?.rngState ?? next.rngState,
    lastSituationId: situationId,
    situation: {
      situationId,
      roomId: room.id,
      blockTargetId: needsBlockTarget ? findNearestBlockable(next, room, totalNow) : null,
      unblockTargetId: needsUnblockTarget ? findNearestBlocked(next, room, totalNow) : null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Aplicação dos efeitos                                               */
/* ------------------------------------------------------------------ */

type Deltas = {
  distance: number;
  cleaning: number;
  event: number;
  charges: number;
  /** O que aconteceu e não aparece nos números, como o resultado de uma aposta. */
  notas?: string[];
};

function applyEffect(
  state: GameState,
  effect: Effect,
  ctx: EffectContext,
  deltas: Deltas,
): GameState {
  const roomId = ctx.room.id;
  const roomState = state.rooms[roomId];

  switch (effect.type) {
    case 'cleanTime': {
      const minutes = evalTime(effect.amount, ctx);
      deltas.cleaning += minutes;
      return { ...state, cleaningMinutes: state.cleaningMinutes + minutes };
    }
    case 'eventTime': {
      const minutes = evalTime(effect.amount, ctx);
      deltas.event += minutes;
      return { ...state, eventMinutes: state.eventMinutes + minutes };
    }
    case 'spendCharges': {
      const amount = evalCharges(effect.amount, ctx);
      deltas.charges -= amount;
      return { ...state, charges: Math.max(0, state.charges - amount) };
    }
    case 'setCharges': {
      deltas.charges += effect.value - state.charges;
      return { ...state, charges: effect.value };
    }
    case 'refill': {
      deltas.charges += gameConfig.maxCharges - state.charges;
      return { ...state, charges: gameConfig.maxCharges };
    }
    case 'gainCharges': {
      const ganho = Math.min(effect.amount, gameConfig.maxCharges - state.charges);
      deltas.charges += ganho;
      /* O que não cabe no carrinho fica no corredor, aqui mesmo: material é
         coisa física no mapa, não some. Quem voltar por aqui recolhe. */
      const sobra = effect.amount - ganho;
      const stashes =
        sobra > 0
          ? [
              ...state.stashes,
              {
                id: `sobra-${state.log.length}-${state.stashes.length}`,
                label: 'Material que sobrou',
                position: ctx.position,
                charges: sobra,
              },
            ]
          : state.stashes;
      return { ...state, charges: state.charges + ganho, stashes };
    }
    case 'grantBuff': {
      const buff = {
        id: `${effect.kind}-${state.log.length}`,
        label: effect.label,
        kind: effect.kind,
        amount: effect.amount,
        roomsLeft: effect.rooms,
      };
      return { ...state, buffs: [...state.buffs, buff] };
    }
    case 'completeRoom':
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [roomId]: {
            ...roomState,
            status: 'concluida',
            residualMinutes: 0,
            deferredSituationId: null,
            previewSituationId: null,
          },
        },
      };
    case 'leavePending': {
      const residual = evalTime(effect.residual, ctx);
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [roomId]: {
            ...roomState,
            status: 'pendente',
            residualMinutes: residual,
            deferredSituationId: null,
          },
        },
      };
    }
    case 'modifyRooms': {
      const targets =
        effect.target === 'self' ? [roomId] : resolverRegiao(state, ctx.room, effect.target);
      if (targets.length === 0) return state;
      const posicao =
        effect.target !== 'self' && effect.target.kind === 'ponto'
          ? PONTOS[effect.target.at]
          : roomsById[targets[0]].corridorPosition;
      const modifier = {
        id: `mod-${state.log.length}-${state.modifiers.length}`,
        label: effect.label,
        minutes: effect.minutes,
        targets,
        until: effect.durationMinutes ? currentTotal(state) + effect.durationMinutes : null,
        ...(effect.equipment ? { equipment: { label: effect.equipment, position: posicao } } : {}),
      };
      return { ...state, modifiers: [...state.modifiers, modifier] };
    }
    case 'blockRooms': {
      const until = currentTotal(state) + effect.minutes;
      const alvos = resolverRegiao(state, ctx.room, effect.target);
      return {
        ...state,
        rooms: {
          ...state.rooms,
          ...Object.fromEntries(
            alvos.map((id) => [
              id,
              {
                ...state.rooms[id],
                blockedUntilMinute: Math.max(state.rooms[id].blockedUntilMinute ?? 0, until),
              },
            ]),
          ),
        },
      };
    }
    case 'fetchSupply': {
      /* O colega traz do ponto mais próximo. Se for um estoque deixado no
         corredor, é dele que as cargas saem: a caixa de antes vira a solução
         de agora, e acaba. */
      const ponto = suprimentoMaisProximo(state, ctx.position, effect.origem ?? 'qualquer');
      if (!ponto) return state;
      const disponivel = ponto.stashId
        ? state.stashes.find((stash) => stash.id === ponto.stashId)?.charges ?? 0
        : effect.amount;
      const trazido = Math.min(effect.amount, disponivel);
      const ganho = Math.min(trazido, gameConfig.maxCharges - state.charges);
      deltas.charges += ganho;
      const stashes = ponto.stashId
        ? state.stashes
            .map((stash) => (stash.id === ponto.stashId ? { ...stash, charges: stash.charges - ganho } : stash))
            .filter((stash) => stash.charges > 0)
        : state.stashes;
      return { ...state, charges: state.charges + ganho, stashes };
    }
    case 'revealSituations': {
      /* Pré-sorteia a situação das salas ainda intocadas: as mais próximas, ou
         as de uma região. Na chegada, a situação revelada vale no lugar do
         sorteio. */
      const agora = currentTotal(state);
      const intocada = (id: string) => {
        const rs = state.rooms[id];
        return (
          rs.status === 'nao-iniciada' && !rs.delegatedUntil && !rs.deferredSituationId && !rs.previewSituationId
        );
      };
      const alvos = effect.target
        ? resolverRegiao(state, ctx.room, effect.target)
            .filter(intocada)
            .map((id) => roomsById[id])
        : objectives
            .filter((other) => other.id !== roomId)
            .filter((other) => intocada(other.id))
            .sort(
              (a, b) =>
                distanceBetween(a.corridorPosition, ctx.position) -
                  distanceBetween(b.corridorPosition, ctx.position) || a.id.localeCompare(b.id),
            )
            .slice(0, effect.count);
      let next = state;
      for (const alvo of alvos) {
        const sorteio = drawSituation(next, alvo, next.rooms[alvo.id], agora);
        if (!sorteio) continue;
        next = {
          ...next,
          bag: sorteio.bag,
          rngState: sorteio.rngState,
          rooms: {
            ...next.rooms,
            [alvo.id]: { ...next.rooms[alvo.id], previewSituationId: sorteio.situationId },
          },
        };
      }
      return next;
    }
    case 'placeStash': {
      const stash = {
        id: `estoque-${state.log.length}-${state.stashes.length}`,
        label: effect.label,
        position: effect.at === 'aqui' ? ctx.position : PONTOS[effect.at],
        charges: effect.charges,
      };
      return { ...state, stashes: [...state.stashes, stash] };
    }
    case 'delegate': {
      const alvos =
        effect.target === 'self'
          ? [roomId]
          : resolverRegiao(state, ctx.room, effect.target).slice(0, effect.limite ?? Infinity);
      const agora = currentTotal(state);
      const until = effect.ateSinal ? minutoDoSinal(agora, effect.ateSinal) : agora + effect.minutes;
      return delegar(state, alvos, until);
    }
    case 'blockDeposito': {
      const until = currentTotal(state) + effect.minutes;
      return {
        ...state,
        rooms: {
          ...state.rooms,
          ...Object.fromEntries(
            DEPOSITOS.map((id) => [
              id,
              { ...state.rooms[id], blockedUntilMinute: Math.max(state.rooms[id].blockedUntilMinute ?? 0, until) },
            ]),
          ),
        },
      };
    }
    case 'aposta': {
      /* Sorteada com a semente da partida: a mesma escolha, no mesmo ponto da
         mesma partida, dá sempre o mesmo resultado. */
      const sorteio = nextRandom(state.rngState);
      const falhou = sorteio.value < 1 / effect.umEm;
      let next: GameState = { ...state, rngState: sorteio.state };
      deltas.notas = [...(deltas.notas ?? []), falhou ? `deu errado: ${effect.label}` : 'deu certo'];
      if (falhou) {
        for (const efeito of effect.seFalhar) next = applyEffect(next, efeito, ctx, deltas);
      }
      return next;
    }
    case 'addMeta': {
      const targets = resolverRegiao(state, ctx.room, effect.target);
      if (targets.length === 0) return state;
      const meta: Meta = {
        id: `${state.log.length}-${state.metas.length}`,
        label: effect.label,
        origem: roomId,
        targets,
        until: currentTotal(state) + effect.minutes,
        recompensa: effect.recompensa,
        penalidade: effect.penalidade,
        penalidadePorSala: Boolean(effect.penalidadePorSala),
      };
      /* A mesma promessa, feita de novo no mesmo lugar, substitui a anterior:
         aceitar duas vezes não vale duas recompensas nem duas multas. */
      const outras = state.metas.filter((m) => !(m.origem === roomId && m.label === effect.label));
      return { ...state, metas: [...outras, meta] };
    }
    case 'leaveUnstarted':
      return {
        ...state,
        rooms: { ...state.rooms, [roomId]: { ...roomState, status: 'nao-iniciada' } },
      };
    case 'addDirt':
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [roomId]: { ...roomState, extraDirtMinutes: roomState.extraDirtMinutes + effect.minutes },
        },
      };
    case 'moveTo': {
      const moved = travelTo(state, targetPosition(effect.target), effect.target !== 'deposito');
      deltas.distance += moved.meters;
      deltas.charges += moved.recolhido.reduce((total, item) => total + item.charges, 0);
      return moved.state;
    }
    case 'unblockRoom': {
      const targetId = ctx.unblockTargetId ?? null;
      if (!targetId) return state;
      return {
        ...state,
        rooms: { ...state.rooms, [targetId]: { ...state.rooms[targetId], blockedUntilMinute: null } },
      };
    }
    case 'blockRoom': {
      const targetId = effect.target === 'self' ? roomId : ctx.blockTargetId;
      if (!targetId) return state;
      const agora = currentTotal(state);
      const until = effect.ateSinal ? minutoDoSinal(agora, effect.ateSinal) : agora + effect.minutes;
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [targetId]: { ...state.rooms[targetId], blockedUntilMinute: until },
        },
      };
    }
  }
}

export function chooseAction(state: GameState, actionId: string): GameState {
  return depoisDoRelogio(resolverSituacao(state, actionId));
}

function resolverSituacao(state: GameState, actionId: string): GameState {
  if (state.phase !== 'situacao' || !state.situation) return state;
  const situation = situationsById[state.situation.situationId];
  const action = situation.actions.find((candidate) => candidate.id === actionId);
  if (!action) return state;

  const room = roomsById[state.situation.roomId];
  const roomStateSnapshot = state.rooms[room.id];
  const ctx: EffectContext = {
    room,
    roomState: roomStateSnapshot,
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: state.situation.blockTargetId,
    unblockTargetId: state.situation.unblockTargetId ?? null,
    game: state,
  };

  if (!actionAvailability(action, ctx).available) return state;

  const deltas: Deltas = { distance: 0, cleaning: 0, event: 0, charges: 0 };
  const buffsAntes = state.buffs;
  let next = state;
  for (const effect of action.effects) {
    next = applyEffect(next, effect, ctx, deltas);
  }

  /* Deixar para depois guarda o problema: na volta, a mesma situação. */
  if (action.effects.some((effect) => effect.type === 'leaveUnstarted')) {
    next = {
      ...next,
      rooms: {
        ...next.rooms,
        [room.id]: { ...next.rooms[room.id], deferredSituationId: situation.id },
      },
    };
  }

  /* Efeitos do mapa que já apontavam para esta sala valem aqui; os criados
     agora, só nas outras. */
  const comMapa = aplicarModificadores(next, room.id, deltas, currentTotal(state));
  next = comMapa.state;

  /* Só os bônus que já estavam em vigor valem para ESTA sala. Um bônus
     concedido agora conta a partir da PRÓXIMA — senão "nas próximas 2 salas"
     gastaria uma carga na sala que o concedeu. */
  const concedidosAgora = next.buffs.slice(buffsAntes.length);
  const comBuffs = consumirBuffs({ ...next, buffs: buffsAntes }, deltas);
  next = {
    ...comBuffs.state,
    buffs: [...comBuffs.state.buffs, ...concedidosAgora],
    decisions: [
      ...state.decisions,
      {
        roomId: room.id,
        situationId: situation.id,
        actionId: action.id,
        minute: currentTotal(state),
        charges: state.charges,
      },
    ],
    phase: 'mapa',
    situation: null,
  };
  const abatidos = [...(deltas.notas ?? []), ...comMapa.abatidos, ...comBuffs.abatidos];
  return appendLog(next, {
    roomId: room.id,
    title: `${room.shortName} — ${situation.title}`,
    detail: abatidos.length ? `${action.label} · ${abatidos.join(' · ')}` : action.label,
    deltaDistance: deltas.distance,
    deltaCleaning: deltas.cleaning,
    deltaEvent: deltas.event,
    deltaIdle: 0,
    deltaCharges: deltas.charges,
  });
}

/** Avança o relógio exatamente até o próximo desbloqueio (decisão Q16). */
export function waitInCorridor(state: GameState): GameState {
  return depoisDoRelogio(esperar(state));
}

function esperar(state: GameState): GameState {
  if (state.phase !== 'mapa' || !mustWait(state)) return state;
  const target = nextUnblockMinute(state);
  if (target === null) return state;
  const idle = Math.max(0, target - currentTotal(state));
  const next = { ...state, idleMinutes: state.idleMinutes + idle };
  return appendLog(next, {
    roomId: null,
    title: 'Aguardando no corredor',
    detail: 'Nenhum destino disponível: os ambientes restantes ou o depósito estavam fechados',
    deltaDistance: 0,
    deltaCleaning: 0,
    deltaEvent: 0,
    deltaIdle: idle,
    deltaCharges: 0,
  });
}

export function finishShift(state: GameState): GameState {
  return { ...state, phase: 'final', pendingTargetId: null, situation: null };
}

export function restart(seed?: number): GameState {
  return createInitialState(seed);
}

/* ------------------------------------------------------------------ */
/* Resumo final                                                        */
/* ------------------------------------------------------------------ */

export type Summary = {
  concluidas: RoomDef[];
  pendentes: RoomDef[];
  naoIniciadas: RoomDef[];
  totalObjectives: number;
  distanceTraveled: number;
  cleaningMinutes: number;
  travelMinutes: number;
  eventMinutes: number;
  idleMinutes: number;
  totalMinutes: number;
  referenceShiftMinutes: number;
  minimumSweepMeters: number;
};

export function summarize(state: GameState): Summary {
  const byStatus = (status: RoomState['status']) =>
    objectives.filter((room) => state.rooms[room.id].status === status);

  return {
    concluidas: byStatus('concluida'),
    pendentes: byStatus('pendente'),
    naoIniciadas: byStatus('nao-iniciada'),
    totalObjectives: objectives.length,
    distanceTraveled: state.distanceTraveled,
    cleaningMinutes: state.cleaningMinutes,
    travelMinutes: travelMinutes(state.distanceTraveled),
    eventMinutes: state.eventMinutes,
    idleMinutes: state.idleMinutes,
    totalMinutes: currentTotal(state),
    referenceShiftMinutes: gameConfig.referenceShiftMinutes,
    minimumSweepMeters: gameConfig.minimumSweepMeters,
  };
}

/** Tempo previsto para a próxima visita a uma sala, usado na tela de confirmação. */
export function previewCleaningMinutes(state: GameState, roomId: string): number {
  const room = roomsById[roomId];
  const roomState = state.rooms[roomId];
  /* O número no mapa já conta os efeitos com endereço: é por ele que o
     jogador percebe que a decisão de antes mudou esta sala. */
  const base =
    roomState.status === 'pendente' ? roomState.residualMinutes : effectiveBase(room, roomState);
  return Math.max(0, base + modificadorDaSala(state, roomId));
}
