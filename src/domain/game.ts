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
import { drawSituation, findNearestBlockable, findNearestBlocked, isEligible } from './situationPicker';
import type { ActiveBuff, Effect, GameState, LogEntry, RoomDef, RoomState } from './types';

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
    distanceTraveled: 0,
    cleaningMinutes: 0,
    eventMinutes: 0,
    idleMinutes: 0,
    charges: gameConfig.initialCharges,
    rooms: Object.fromEntries(rooms.map((room) => [room.id, initialRoomState()])),
    route: [],
    log: [],
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
  if (room.kind === 'deposito') return true;
  if (!room.cleanable) return false;
  if (state.rooms[roomId].status === 'concluida') return false;
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

/** Válvula anti-deadlock: só aparece quando todo objetivo restante está bloqueado. */
export function mustWait(state: GameState): boolean {
  const remaining = remainingObjectives(state);
  if (remaining.length === 0) return false;
  return remaining.every((room) => isBlocked(state, room.id));
}

export function nextUnblockMinute(state: GameState): number | null {
  const times = remainingObjectives(state)
    .map((room) => state.rooms[room.id].blockedUntilMinute)
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

/** Aplica apenas o deslocamento. Ponto de não-retorno da decisão Q11. */
function travelTo(state: GameState, position: number): { state: GameState; meters: number } {
  const meters = distanceBetween(state.currentPosition, position);
  return {
    state: {
      ...state,
      currentPosition: position,
      distanceTraveled: state.distanceTraveled + meters,
    },
    meters,
  };
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
  if (state.phase !== 'confirmacao' || !state.pendingTargetId) return state;
  const room = roomsById[state.pendingTargetId];
  const roomStateBefore = state.rooms[room.id];

  const moved = travelTo(state, room.corridorPosition);
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
    const residual = roomStateBefore.residualMinutes;
    next = {
      ...next,
      cleaningMinutes: next.cleaningMinutes + residual,
      rooms: {
        ...next.rooms,
        [room.id]: { ...roomStateBefore, status: 'concluida', residualMinutes: 0 },
      },
    };
    const pendDeltas: Deltas = { distance: 0, cleaning: residual, event: 0, charges: 0 };
    const comBuffs = consumirBuffs(next, pendDeltas);
    next = comBuffs.state;
    return appendLog({ ...next, phase: 'mapa' }, {
      roomId: room.id,
      title: `${room.shortName}: pendência resolvida`,
      detail: comBuffs.abatidos.length
        ? `${pendDeltas.cleaning} min de serviço restante · ${comBuffs.abatidos.join(' · ')}`
        : `${residual} min de serviço restante, sem consumo de material`,
      deltaDistance: 0,
      deltaCleaning: pendDeltas.cleaning,
      deltaEvent: 0,
      deltaIdle: 0,
      deltaCharges: 0,
    });
  }

  // Sala não iniciada: sorteia a situação.
  const totalNow = currentTotal(next);
  const drawn = drawSituation(next, room, roomStateBefore, totalNow);
  /* Se o sorteio falhar, a reserva tem de respeitar o escopo do ambiente: um
     id fixo furaria a regra de que cada tipo de cômodo tem seus problemas. */
  const reserva = situations.find((candidate) =>
    isEligible(candidate, next, room, roomStateBefore, totalNow),
  );
  const situationId = drawn?.situationId ?? reserva?.id;
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

type Deltas = { distance: number; cleaning: number; event: number; charges: number };

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
      return { ...state, charges: state.charges + ganho };
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
        rooms: { ...state.rooms, [roomId]: { ...roomState, status: 'concluida', residualMinutes: 0 } },
      };
    case 'leavePending': {
      const residual = evalTime(effect.residual, ctx);
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [roomId]: { ...roomState, status: 'pendente', residualMinutes: residual },
        },
      };
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
      const moved = travelTo(state, targetPosition(effect.target));
      deltas.distance += moved.meters;
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
      const until = currentTotal(state) + effect.minutes;
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
  };

  if (!actionAvailability(action, ctx).available) return state;

  const deltas: Deltas = { distance: 0, cleaning: 0, event: 0, charges: 0 };
  const buffsAntes = state.buffs;
  let next = state;
  for (const effect of action.effects) {
    next = applyEffect(next, effect, ctx, deltas);
  }

  /* Só os bônus que já estavam em vigor valem para ESTA sala. Um bônus
     concedido agora conta a partir da PRÓXIMA — senão "nas próximas 2 salas"
     gastaria uma carga na sala que o concedeu. */
  const concedidosAgora = next.buffs.slice(buffsAntes.length);
  const comBuffs = consumirBuffs({ ...next, buffs: buffsAntes }, deltas);
  next = {
    ...comBuffs.state,
    buffs: [...comBuffs.state.buffs, ...concedidosAgora],
    phase: 'mapa',
    situation: null,
  };
  return appendLog(next, {
    roomId: room.id,
    title: `${room.shortName} — ${situation.title}`,
    detail: comBuffs.abatidos.length
      ? `${action.label} · ${comBuffs.abatidos.join(' · ')}`
      : action.label,
    deltaDistance: deltas.distance,
    deltaCleaning: deltas.cleaning,
    deltaEvent: deltas.event,
    deltaIdle: 0,
    deltaCharges: deltas.charges,
  });
}

/** Avança o relógio exatamente até o próximo desbloqueio (decisão Q16). */
export function waitInCorridor(state: GameState): GameState {
  if (state.phase !== 'mapa' || !mustWait(state)) return state;
  const target = nextUnblockMinute(state);
  if (target === null) return state;
  const idle = Math.max(0, target - currentTotal(state));
  const next = { ...state, idleMinutes: state.idleMinutes + idle };
  return appendLog(next, {
    roomId: null,
    title: 'Aguardando no corredor',
    detail: 'Todos os objetivos restantes estavam bloqueados',
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
  if (roomState.status === 'pendente') return roomState.residualMinutes;
  return effectiveBase(room, roomState);
}
