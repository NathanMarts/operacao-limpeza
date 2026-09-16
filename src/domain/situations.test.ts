import { describe, expect, it } from 'vitest';
import { situations } from '../data/situations';
import { roomsById } from '../data/rooms';
import { gameConfig } from '../data/gameConfig';
import { actionAvailability, evalCharges, evalTime, targetPosition, type EffectContext } from './effects';
import { distanceBetween } from './movement';
import { createInitialState, confirmTravel, selectRoom, chooseAction, currentTotal } from './game';
import { isEligible } from './situationPicker';
import type { RoomState, SituationAction } from './types';

/**
 * Vetor de custo de uma ação nas moedas do jogo. Todos os eixos são "quanto pior,
 * maior" — assim dominância vira uma comparação componente a componente.
 */
type CostVector = {
  tempoAgora: number;
  material: number;
  trabalhoFuturo: number;
  bloqueio: number;
  deslocamento: number;
};

function costOf(action: SituationAction, ctx: EffectContext): CostVector {
  const cost: CostVector = {
    tempoAgora: 0,
    material: 0,
    trabalhoFuturo: 0,
    bloqueio: 0,
    deslocamento: 0,
  };
  let charges = ctx.charges;
  let concluded = false;

  for (const effect of action.effects) {
    switch (effect.type) {
      case 'cleanTime':
      case 'eventTime':
        cost.tempoAgora += evalTime(effect.amount, ctx);
        break;
      case 'spendCharges': {
        const amount = evalCharges(effect.amount, ctx);
        cost.material += amount;
        charges -= amount;
        break;
      }
      case 'setCharges':
        cost.material += charges - effect.value;
        charges = effect.value;
        break;
      case 'refill':
        // Reabastecer é ganho de material: custo negativo.
        cost.material -= gameConfig.maxCharges - charges;
        charges = gameConfig.maxCharges;
        break;
      case 'completeRoom':
        concluded = true;
        break;
      case 'leavePending':
        cost.trabalhoFuturo += evalTime(effect.residual, ctx);
        break;
      case 'leaveUnstarted':
        cost.trabalhoFuturo += evalTime({ kind: 'base' }, ctx);
        break;
      case 'addDirt':
        cost.trabalhoFuturo += effect.minutes;
        break;
      case 'blockRoom':
        cost.bloqueio += effect.minutes;
        break;
      case 'moveTo':
        cost.deslocamento += distanceBetween(ctx.position, targetPosition(effect.target));
        break;
    }
  }
  void concluded;
  return cost;
}

const AXES: (keyof CostVector)[] = [
  'tempoAgora',
  'material',
  'trabalhoFuturo',
  'bloqueio',
  'deslocamento',
];

/** X domina Y se não é pior em nenhum eixo e é melhor em ao menos um. */
function dominates(x: CostVector, y: CostVector): boolean {
  const neverWorse = AXES.every((axis) => x[axis] <= y[axis]);
  const betterSomewhere = AXES.some((axis) => x[axis] < y[axis]);
  return neverWorse && betterSomewhere;
}

const cleanRoomState: RoomState = {
  status: 'nao-iniciada',
  residualMinutes: 0,
  extraDirtMinutes: 0,
  blockedUntilMinute: null,
};

/** Contextos representativos: sala comum e banheiro, com carrinho cheio e quase vazio. */
const contexts: { label: string; ctx: EffectContext }[] = [];
for (const roomId of ['S5', 'S2', 'S1', 'WC-A']) {
  for (const charges of [3, 10]) {
    const room = roomsById[roomId];
    contexts.push({
      label: `${roomId} com ${charges} cargas`,
      ctx: {
        room,
        roomState: cleanRoomState,
        charges,
        position: room.corridorPosition,
        blockTargetId: 'S12',
      },
    });
  }
}

describe('invariante de trade-off', () => {
  it('nenhuma ação domina outra em todos os eixos, em nenhum contexto', () => {
    const violations: string[] = [];

    for (const situation of situations) {
      for (const { label, ctx } of contexts) {
        const available = situation.actions.filter(
          (action) => actionAvailability(action, ctx).available,
        );
        if (available.length < 2) continue;

        const costs = available.map((action) => ({ action, cost: costOf(action, ctx) }));
        for (const x of costs) {
          for (const y of costs) {
            if (x.action.id === y.action.id) continue;
            if (dominates(x.cost, y.cost)) {
              violations.push(
                `${situation.id} / ${label}: "${x.action.label}" domina "${y.action.label}" ` +
                  `(${JSON.stringify(x.cost)} vs ${JSON.stringify(y.cost)})`,
              );
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('toda situação tem exatamente três ações', () => {
    for (const situation of situations) {
      expect(situation.actions).toHaveLength(3);
    }
  });

  it('toda situação tem ao menos uma ação executável com o carrinho vazio', () => {
    for (const situation of situations) {
      const room = roomsById['WC-A']; // pior caso: custo de material 2
      const ctx: EffectContext = {
        room,
        roomState: cleanRoomState,
        charges: 0,
        position: room.corridorPosition,
        blockTargetId: 'S12',
      };
      const eligible = situation.conditions.length === 0;
      if (!eligible) continue;
      const anyAvailable = situation.actions.some(
        (action) => actionAvailability(action, ctx).available,
      );
      expect(anyAvailable, `${situation.id} trava com 0 cargas`).toBe(true);
    }
  });
});

describe('elegibilidade das situações', () => {
  it('"material acabando" não aparece com o carrinho cheio', () => {
    const state = createInitialState();
    const situation = situations.find((s) => s.id === 'material-acabando')!;
    expect(isEligible(situation, state, roomsById['S5'], cleanRoomState, 0)).toBe(false);

    const quaseVazio = { ...state, charges: 2 };
    expect(isEligible(situation, quaseVazio, roomsById['S5'], cleanRoomState, 0)).toBe(true);
  });

  it('"sala trancada" não aparece em banheiro', () => {
    const state = createInitialState();
    const situation = situations.find((s) => s.id === 'sala-trancada')!;
    expect(isEligible(situation, state, roomsById['WC-A'], cleanRoomState, 0)).toBe(false);
    expect(isEligible(situation, state, roomsById['S5'], cleanRoomState, 0)).toBe(true);
  });

  it('"sala trancada" fica inelegível quando não há outro objetivo para bloquear', () => {
    let state = createInitialState();
    const rooms = { ...state.rooms };
    for (const id of Object.keys(rooms)) {
      if (roomsById[id].cleanable && id !== 'S5') {
        rooms[id] = { ...rooms[id], status: 'concluida' };
      }
    }
    state = { ...state, rooms };
    const situation = situations.find((s) => s.id === 'sala-trancada')!;
    expect(isEligible(situation, state, roomsById['S5'], cleanRoomState, 0)).toBe(false);
  });
});

describe('determinismo', () => {
  it('a mesma semente e a mesma rota produzem as mesmas situações', () => {
    const run = () => {
      let state = createInitialState(gameConfig.seed);
      const drawn: string[] = [];
      for (const roomId of ['S1', 'S2', 'S3', 'S4', 'S5']) {
        state = confirmTravel(selectRoom(state, roomId));
        if (state.situation) {
          drawn.push(state.situation.situationId);
          const first = state.situation.situationId;
          const situation = situations.find((s) => s.id === first)!;
          const usable = situation.actions.find(
            (action) =>
              actionAvailability(action, {
                room: roomsById[roomId],
                roomState: state.rooms[roomId],
                charges: state.charges,
                position: roomsById[roomId].corridorPosition,
                blockTargetId: state.situation!.blockTargetId,
              }).available,
          )!;
          state = chooseAction(state, usable.id);
        }
      }
      return { drawn, total: currentTotal(state) };
    };

    const a = run();
    const b = run();
    expect(a.drawn).toEqual(b.drawn);
    expect(a.total).toBe(b.total);
  });

  it('a mesma situação nunca sai duas vezes seguidas', () => {
    let state = createInitialState();
    const drawn: string[] = [];
    for (const roomId of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']) {
      state = confirmTravel(selectRoom(state, roomId));
      if (!state.situation) continue;
      drawn.push(state.situation.situationId);
      const situation = situations.find((s) => s.id === state.situation!.situationId)!;
      const usable = situation.actions.find(
        (action) =>
          actionAvailability(action, {
            room: roomsById[roomId],
            roomState: state.rooms[roomId],
            charges: state.charges,
            position: roomsById[roomId].corridorPosition,
            blockTargetId: state.situation!.blockTargetId,
          }).available,
      )!;
      state = chooseAction(state, usable.id);
    }
    for (let i = 1; i < drawn.length; i += 1) {
      expect(drawn[i]).not.toBe(drawn[i - 1]);
    }
  });
});
