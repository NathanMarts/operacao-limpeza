import { gameConfig } from '../data/gameConfig';
import { objectives, rooms, roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
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
import { drawSituation, findNearestBlockable } from './situationPicker';
import type { Effect, GameState, LogEntry, RoomDef, RoomState } from './types';

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
    currentPosition: 0,
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

export function isSelectable(state: GameState, roomId: string): boolean {
  if (state.phase !== 'mapa') return false;
  const room = roomsById[roomId];
  if (!room) return false;
  // O depósito é um destino como qualquer outro; passar por ele não recarrega (C3).
  if (room.kind === 'deposito') return true;
  if (!room.cleanable) return false;
  if (state.rooms[roomId].status === 'concluida') return false;
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
    return appendLog({ ...next, phase: 'mapa' }, {
      roomId: room.id,
      title: `${room.shortName}: pendência resolvida`,
      detail: `${residual} min de serviço restante, sem consumo de material`,
      deltaDistance: 0,
      deltaCleaning: residual,
      deltaEvent: 0,
      deltaIdle: 0,
      deltaCharges: 0,
    });
  }

  // Sala não iniciada: sorteia a situação.
  const totalNow = currentTotal(next);
  const drawn = drawSituation(next, room, roomStateBefore, totalNow);
  const situationId = drawn?.situationId ?? 'sala-suja';
  const situation = situationsById[situationId];
  const needsBlockTarget = situation.actions.some((action) =>
    action.effects.some((effect) => effect.type === 'blockRoom' && effect.target === 'nearestOther'),
  );

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
  let next = state;
  for (const effect of action.effects) {
    next = applyEffect(next, effect, ctx, deltas);
  }

  next = { ...next, phase: 'mapa', situation: null };
  return appendLog(next, {
    roomId: room.id,
    title: `${room.shortName} — ${situation.title}`,
    detail: action.label,
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
