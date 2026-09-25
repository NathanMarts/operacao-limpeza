import { describe, expect, it } from 'vitest';
import { distanceBetween, travelMinutes } from './movement';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  isSelectable,
  selectRoom,
  summarize,
} from './game';
import { roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
import { actionAvailability, type EffectContext } from './effects';
import { gameConfig } from '../data/gameConfig';
import type { GameState } from './types';

/**
 * Percorre uma rota resolvendo cada situação com a ação que conclui a sala sem
 * provocar deslocamento extra — assim o teste mede só o efeito da ORDEM.
 */
function walk(order: string[], seed = gameConfig.seed): GameState {
  let state = createInitialState(seed);
  for (const roomId of order) {
    state = confirmTravel(selectRoom(state, roomId));
    if (state.phase === 'situacao' && state.situation) {
      state = chooseAction(state, resolveInPlaceActionId(state));
    }
  }
  return state;
}

/** Ação "fecha a sala aqui mesmo" de cada situação, sem moveTo nem pendência. */
/**
 * Ação que resolve a sala NO LUGAR: nunca provoca deslocamento, e conclui
 * quando possível. Derivada dos efeitos, e não de um mapa fixo por situação —
 * um mapa fica incompleto a cada situação nova e trava a fase sem avisar.
 */
function resolveInPlaceActionId(state: GameState): string {
  const situation = situationsById[state.situation!.situationId];
  const room = roomsById[state.situation!.roomId];
  const ctx: EffectContext = {
    room,
    roomState: state.rooms[room.id],
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: state.situation!.blockTargetId,
  };

  const semDeslocamento = situation.actions.filter(
    (action) =>
      actionAvailability(action, ctx).available &&
      !action.effects.some((effect) => effect.type === 'moveTo'),
  );
  const conclui = semDeslocamento.find((action) =>
    action.effects.some((effect) => effect.type === 'completeRoom'),
  );
  const escolhida = conclui ?? semDeslocamento[0];
  if (!escolhida) throw new Error(`sem ação in loco em ${situation.id}`);
  return escolhida.id;
}

describe('regra espacial do corredor', () => {
  it('deslocamento é a diferença absoluta entre posições', () => {
    expect(distanceBetween(0, 5)).toBe(5);
    expect(distanceBetween(25, 5)).toBe(20);
    expect(distanceBetween(62, 15)).toBe(47);
  });

  it('converte metros em minutos a 1 min / 5 m', () => {
    expect(gameConfig.metersPerMinute).toBe(5);
    expect(travelMinutes(62)).toBeCloseTo(12.4);
    expect(travelMinutes(20)).toBe(4);
  });

  it('reproduz o exemplo da especificação (entrada → A → C → B = 35 m)', () => {
    let position = 0;
    let total = 0;
    for (const destination of [5, 25, 15]) {
      total += distanceBetween(position, destination);
      position = destination;
    }
    expect(total).toBe(35);
  });
});

describe('ida e volta pelo corredor', () => {
  it('acumula o custo da volta: ir longe e retornar cobra os dois trechos', () => {
    // Entrada(−2) → WC-A(4) → S1. Ida 6 m, depois do banheiro até a S1.
    const s1 = roomsById.S1.corridorPosition;
    const state = walk(['WC-A', 'S1']);
    expect(state.distanceTraveled).toBeCloseTo(6 + (s1 - 4));
    expect(state.currentPosition).toBe(s1);
  });

  it('a varredura monotônica gasta exatamente a extensão do corredor', () => {
    // A partir da entrada, a leste: banheiro primeiro, escada por último.
    const sweep = ['WC-A', 'S6', 'S5', 'S4', 'S3', 'S2', 'S1', 'ESC'];
    const state = walk(sweep);
    expect(state.distanceTraveled).toBe(gameConfig.minimumSweepMeters);
    expect(state.distanceTraveled).toBe(gameConfig.minimumSweepMeters);
  });

  it('duas ordens diferentes produzem deslocamentos diferentes', () => {
    const emOrdem = walk(['WC-A', 'S6', 'S5', 'S4', 'S3', 'S2', 'S1', 'ESC']);
    const zigZag = walk(['S1', 'WC-A', 'S2', 'S6', 'S3', 'S5', 'S4', 'ESC']);
    expect(emOrdem.distanceTraveled).toBe(gameConfig.minimumSweepMeters);
    expect(zigZag.distanceTraveled).toBeGreaterThan(emOrdem.distanceTraveled);
    // A rota ruim custa mais que o dobro da boa — o planejamento tem peso real.
    expect(zigZag.distanceTraveled).toBeGreaterThan(emOrdem.distanceTraveled * 2);
  });

  it('salas opostas compartilham posição: atravessar o corredor não custa nada', () => {
    const state = walk(['S5', 'S11']);
    expect(roomsById['S5'].corridorPosition).toBe(roomsById['S11'].corridorPosition);
    expect(state.distanceTraveled).toBeCloseTo(roomsById.S5.corridorPosition + 2);
  });

  it('o tempo de deslocamento entra no total separado do tempo de limpeza', () => {
    const state = walk(['WC-A', 'S1']);
    const summary = summarize(state);
    expect(summary.travelMinutes).toBeCloseTo(travelMinutes(6 + (roomsById.S1.corridorPosition - 4)));
    expect(summary.totalMinutes).toBeCloseTo(
      summary.cleaningMinutes + summary.travelMinutes + summary.eventMinutes + summary.idleMinutes,
    );
  });
});

describe('ponto de não-retorno', () => {
  it('o deslocamento é cobrado na confirmação, antes de ver a situação', () => {
    const selected = selectRoom(createInitialState(), 'S6');
    expect(selected.phase).toBe('confirmacao');
    expect(selected.distanceTraveled).toBe(0);

    const confirmed = confirmTravel(selected);
    expect(confirmed.distanceTraveled).toBeCloseTo(roomsById.S6.corridorPosition + 2);
    expect(confirmed.phase).toBe('situacao');
  });

  it('não é possível escolher outra sala enquanto a situação está aberta', () => {
    const state = confirmTravel(selectRoom(createInitialState(), 'S6'));
    expect(state.phase).toBe('situacao');
    expect(isSelectable(state, 'S1')).toBe(false);
    expect(selectRoom(state, 'S1')).toBe(state);
  });

  it('uma sala concluída deixa de ser selecionável', () => {
    const arrived = confirmTravel(selectRoom(createInitialState(), 'S3'));
    const state = chooseAction(arrived, resolveInPlaceActionId(arrived));
    expect(state.rooms['S3'].status).toBe('concluida');
    expect(isSelectable(state, 'S3')).toBe(false);
  });
});
