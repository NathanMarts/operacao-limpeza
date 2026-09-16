import { DEPOSITO_POSITION, ENTRANCE_POSITION, roomsById } from '../data/rooms';
import { gameConfig } from '../data/gameConfig';
import { distanceBetween, travelMinutes } from './movement';
import type {
  ChargeExpr,
  Effect,
  Requirement,
  RoomDef,
  RoomState,
  SituationAction,
  TimeExpr,
} from './types';

export type EffectContext = {
  room: RoomDef;
  roomState: RoomState;
  charges: number;
  /** Posição no instante em que a ação é resolvida (já dentro da sala). */
  position: number;
  /** Alvo resolvido de um bloqueio `nearestOther`, quando existir. */
  blockTargetId: string | null;
};

/** Tempo base efetivo: o da planta mais a sujeira acumulada por adiamentos. */
export function effectiveBase(room: RoomDef, roomState: RoomState): number {
  return room.baseCleaningMinutes + roomState.extraDirtMinutes;
}

export function evalTime(expr: TimeExpr, ctx: EffectContext): number {
  const base = effectiveBase(ctx.room, ctx.roomState);
  switch (expr.kind) {
    case 'base':
      return base;
    case 'halfBase':
      return Math.ceil(base / 2);
    case 'const':
      return expr.value;
    case 'sum':
      return expr.terms.reduce((total, term) => total + evalTime(term, ctx), 0);
    case 'diff':
      return evalTime(expr.left, ctx) - evalTime(expr.right, ctx);
  }
}

export function evalCharges(expr: ChargeExpr, ctx: EffectContext): number {
  switch (expr.kind) {
    case 'roomCost':
      return ctx.room.materialCost;
    case 'const':
      return expr.value;
    case 'roomCostPlus':
      return ctx.room.materialCost + expr.value;
  }
}

export function targetPosition(target: 'deposito' | 'entrada'): number {
  return target === 'deposito' ? DEPOSITO_POSITION : ENTRANCE_POSITION;
}

/* ------------------------------------------------------------------ */
/* Pré-condições                                                       */
/* ------------------------------------------------------------------ */

export type Availability = { available: true } | { available: false; reason: string };

function checkRequirement(requirement: Requirement, ctx: EffectContext): Availability {
  const needed = evalCharges(requirement.amount, ctx);
  if (ctx.charges >= needed) return { available: true };
  return {
    available: false,
    reason: `Precisa de ${needed} ${needed === 1 ? 'carga' : 'cargas'} — você tem ${ctx.charges}.`,
  };
}

/** Decisão L5: ação sem material fica desabilitada e explica o motivo. */
export function actionAvailability(action: SituationAction, ctx: EffectContext): Availability {
  for (const requirement of action.requires) {
    const result = checkRequirement(requirement, ctx);
    if (!result.available) return result;
  }
  return { available: true };
}

/* ------------------------------------------------------------------ */
/* Descrição dos efeitos — transparência total (decisão Q10)           */
/* ------------------------------------------------------------------ */

export type EffectBadge = {
  text: string;
  /** Natureza do custo, para a UI colorir sem embutir regra. */
  tone: 'tempo' | 'material' | 'pendencia' | 'bloqueio' | 'deslocamento' | 'bom';
};

const plural = (value: number, one: string, many: string) => (value === 1 ? one : many);

export function describeEffect(effect: Effect, ctx: EffectContext): EffectBadge | null {
  switch (effect.type) {
    case 'cleanTime': {
      const minutes = evalTime(effect.amount, ctx);
      return { text: `+${minutes} min de limpeza`, tone: 'tempo' };
    }
    case 'eventTime': {
      const minutes = evalTime(effect.amount, ctx);
      return { text: `+${minutes} min extras`, tone: 'tempo' };
    }
    case 'spendCharges': {
      const amount = evalCharges(effect.amount, ctx);
      return { text: `−${amount} ${plural(amount, 'carga', 'cargas')}`, tone: 'material' };
    }
    case 'setCharges':
      return { text: 'o carrinho zera', tone: 'material' };
    case 'refill':
      return { text: `reabastece até ${gameConfig.maxCharges} cargas`, tone: 'bom' };
    case 'completeRoom':
      return { text: 'conclui a sala', tone: 'bom' };
    case 'leavePending': {
      const minutes = evalTime(effect.residual, ctx);
      return { text: `deixa pendência: ${minutes} min + voltar aqui`, tone: 'pendencia' };
    }
    case 'leaveUnstarted':
      return { text: 'a sala continua suja', tone: 'pendencia' };
    case 'addDirt':
      return { text: `+${effect.minutes} min quando voltar`, tone: 'pendencia' };
    case 'moveTo': {
      const destination = targetPosition(effect.target);
      const meters = distanceBetween(ctx.position, destination);
      const label = effect.target === 'deposito' ? 'até o depósito' : 'até a entrada';
      return {
        text: `desloca ${label}: +${meters} m (+${formatMinutes(travelMinutes(meters))} min)`,
        tone: 'deslocamento',
      };
    }
    case 'blockRoom': {
      if (effect.target === 'self') {
        return { text: `esta sala fica bloqueada por ${effect.minutes} min`, tone: 'bloqueio' };
      }
      const name = ctx.blockTargetId ? roomsById[ctx.blockTargetId]?.shortName : null;
      return {
        text: name
          ? `bloqueia ${name} por ${effect.minutes} min`
          : `bloqueia outro objetivo por ${effect.minutes} min`,
        tone: 'bloqueio',
      };
    }
  }
}

export function describeAction(action: SituationAction, ctx: EffectContext): EffectBadge[] {
  return action.effects
    .map((effect) => describeEffect(effect, ctx))
    .filter((badge): badge is EffectBadge => badge !== null);
}

/** Formata minutos com no máximo uma casa decimal, em padrão pt-BR. */
export function formatMinutes(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');
}
