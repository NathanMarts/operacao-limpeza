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
  /** Alvo resolvido de `unblockRoom`, quando existir. */
  unblockTargetId?: string | null;
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
    case 'gainCharges':
      return { text: `+${effect.amount} ${plural(effect.amount, 'carga', 'cargas')}`, tone: 'bom' };
    case 'grantBuff':
      return {
        text:
          effect.kind === 'tempo'
            ? `−${effect.amount} min nas próximas ${effect.rooms} salas`
            : `−${effect.amount} carga nas próximas ${effect.rooms} salas`,
        tone: 'bom',
      };
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
    case 'unblockRoom': {
      /* Sem alvo, dizer "libera um ambiente" seria prometer o que não existe. */
      const name = ctx.unblockTargetId ? roomsById[ctx.unblockTargetId]?.shortName : null;
      return name
        ? { text: `libera ${name} agora`, tone: 'bom' }
        : { text: 'nada bloqueado para liberar agora', tone: 'tempo' };
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

/** Formata metros em padrão pt-BR. Posições podem ser fracionárias. */
export function formatMeters(value: number): string {
  return formatMinutes(value);
}

/** Formata minutos com no máximo uma casa decimal, em padrão pt-BR. */
export function formatMinutes(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');
}

/* ------------------------------------------------------------------ */
/* Resumo agrupado por categoria — usado pelas cartas de decisão        */
/* ------------------------------------------------------------------ */

/** Categoria da consequência. Escolher o ícone é papel da camada visual. */
export type ConsequenceKind =
  | 'tempo'
  | 'deslocamento'
  | 'material'
  | 'pendencia'
  | 'intocada'
  | 'sujeira'
  | 'bloqueio';

export type ConsequenceLine = { kind: ConsequenceKind; label: string; value: string };

export type ActionSummary = {
  /** O que a escolha cobra imediatamente. */
  agora: ConsequenceLine[];
  /** O que a escolha deixa para o futuro — onde mora o trade-off. */
  depois: ConsequenceLine[];
  /** A sala fica fechada com esta ação? */
  conclui: boolean;
  /** Custo imediato somado, em minutos, para o selo da carta. */
  minutosAgora: number;
};

/**
 * Agrupa os efeitos em quatro categorias legíveis (tempo, deslocamento,
 * material, consequência futura) e separa AGORA de DEPOIS. É essa separação
 * que torna o trade-off visível de relance, em vez de virar contagem de selos.
 */
export function summarizeAction(action: SituationAction, ctx: EffectContext): ActionSummary {
  let minutos = 0;
  let metros = 0;
  let cargas = 0;
  let zeraCarrinho = false;
  let reabastece = false;
  let conclui = false;
  const depois: ConsequenceLine[] = [];

  for (const effect of action.effects) {
    switch (effect.type) {
      case 'cleanTime':
      case 'eventTime':
        minutos += evalTime(effect.amount, ctx);
        break;
      case 'spendCharges':
        cargas += evalCharges(effect.amount, ctx);
        break;
      case 'setCharges':
        zeraCarrinho = true;
        break;
      case 'refill':
        reabastece = true;
        break;
      case 'gainCharges':
        cargas -= effect.amount;
        break;
      case 'grantBuff':
        depois.push({
          kind: effect.kind === 'tempo' ? 'tempo' : 'material',
          label: effect.label,
          value:
            effect.kind === 'tempo'
              ? `−${effect.amount} min por sala, nas próximas ${effect.rooms}`
              : `−${effect.amount} carga por sala, nas próximas ${effect.rooms}`,
        });
        break;
      case 'completeRoom':
        conclui = true;
        break;
      case 'moveTo':
        metros += distanceBetween(ctx.position, targetPosition(effect.target));
        break;
      case 'leavePending':
        depois.push({
          kind: 'pendencia',
          label: 'Pendência',
          value: `${evalTime(effect.residual, ctx)} min quando voltar aqui`,
        });
        break;
      case 'leaveUnstarted':
        depois.push({
          kind: 'intocada',
          label: 'Sala intocada',
          value: `${evalTime({ kind: 'base' }, ctx)} min inteiros ainda por fazer`,
        });
        break;
      case 'addDirt':
        depois.push({
          kind: 'sujeira',
          label: 'Sujeira acumula',
          value: `+${effect.minutes} min na próxima visita`,
        });
        break;
      case 'unblockRoom': {
        const nome = ctx.unblockTargetId ? roomsById[ctx.unblockTargetId]?.shortName : null;
        depois.push({
          kind: 'bloqueio',
          label: nome ? 'Rota liberada' : 'Sem efeito na rota',
          value: nome
            ? `${nome} volta a ficar disponível`
            : 'nenhum ambiente está bloqueado agora',
        });
        break;
      }
      case 'blockRoom': {
        const alvo =
          effect.target === 'self'
            ? 'Esta sala'
            : ctx.blockTargetId
              ? roomsById[ctx.blockTargetId]?.shortName ?? 'Outro ambiente'
              : 'Outro ambiente';
        depois.push({
          kind: 'bloqueio',
          label: 'Bloqueio',
          value: `${alvo} indisponível por ${effect.minutes} min`,
        });
        break;
      }
    }
  }

  const agora: ConsequenceLine[] = [];
  if (minutos > 0) {
    agora.push({ kind: 'tempo', label: 'Tempo', value: `+${formatMinutes(minutos)} min` });
  }
  if (metros > 0) {
    agora.push({
      kind: 'deslocamento',
      label: 'Deslocamento',
      value: `+${metros} m · ${formatMinutes(travelMinutes(metros))} min`,
    });
  }
  if (reabastece) {
    agora.push({ kind: 'material', label: 'Material', value: `reabastece até ${gameConfig.maxCharges}` });
  } else if (zeraCarrinho) {
    agora.push({ kind: 'material', label: 'Material', value: 'zera o carrinho' });
  } else if (cargas > 0) {
    agora.push({
      kind: 'material',
      label: 'Material',
      value: `−${cargas} ${cargas === 1 ? 'carga' : 'cargas'}`,
    });
  } else {
    agora.push({ kind: 'material', label: 'Material', value: 'não gasta nada' });
  }

  return {
    agora,
    depois,
    conclui,
    minutosAgora: minutos + travelMinutes(metros),
  };
}
