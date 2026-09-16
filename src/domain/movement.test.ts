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
function resolveInPlaceActionId(state: GameState): string {
  const situationId = state.situation!.situationId;
  const map: Record<string, string> = {
    'sala-suja': 'completa',
    'material-acabando': 'economizar',
    'sala-em-uso': 'priorizar',
    'lixeiras-cheias': 'acumular',
    'sala-trancada': 'sala-vizinha',
    'equipamento-quebrado': 'improvisar',
  };
  return map[situationId];
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
    // Entrada(0) → WC-A(62) → S1(5). Ida 62 m, volta 57 m.
    const state = walk(['WC-A', 'S1']);
    expect(state.distanceTraveled).toBe(62 + 57);
    expect(state.currentPosition).toBe(5);
  });

  it('a varredura monotônica gasta exatamente a extensão do corredor', () => {
    const sweep = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'WC-A'];
    const state = walk(sweep);
    expect(state.distanceTraveled).toBe(62);
    expect(state.distanceTraveled).toBe(gameConfig.minimumSweepMeters);
  });

  it('duas ordens diferentes produzem deslocamentos diferentes', () => {
    const emOrdem = walk(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'WC-A']);
    const zigZag = walk(['WC-A', 'S1', 'S6', 'S2', 'S5', 'S3', 'S4']);
    expect(emOrdem.distanceTraveled).toBe(62);
    expect(zigZag.distanceTraveled).toBeGreaterThan(emOrdem.distanceTraveled);
    // A rota ruim custa mais que o dobro da boa — o planejamento tem peso real.
    expect(zigZag.distanceTraveled).toBeGreaterThan(emOrdem.distanceTraveled * 2);
  });

  it('salas opostas compartilham posição: atravessar o corredor não custa nada', () => {
    const state = walk(['S5', 'S11']);
    expect(roomsById['S5'].corridorPosition).toBe(roomsById['S11'].corridorPosition);
    expect(state.distanceTraveled).toBe(42);
  });

  it('o tempo de deslocamento entra no total separado do tempo de limpeza', () => {
    const state = walk(['WC-A', 'S1']);
    const summary = summarize(state);
    expect(summary.travelMinutes).toBeCloseTo((62 + 57) / 5);
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
    expect(confirmed.distanceTraveled).toBe(52);
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
