import './fixturesDeTeste';
import { describe, expect, it } from 'vitest';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  isSelectable,
  selectRoom,
} from './game';
import { roomsById } from '../data/rooms';
import type { GameState } from './types';

/**
 * Regra: uma volta exige ter saído. Um ambiente incompleto sob os pés do
 * trabalhador não é selecionável.
 *
 * Sem ela, as cartas que deixam pendência ou adiam o serviço cobravam uma
 * viagem de retorno que ninguém precisava fazer: bastava reabrir o mesmo
 * ambiente no instante seguinte, com deslocamento zero.
 */

/** Força a situação sorteada, para o teste não depender do saco do RNG. */
function comSituacao(state: GameState, roomId: string, situationId: string): GameState {
  const viajado = confirmTravel(selectRoom(state, roomId));
  expect(viajado.phase, `${roomId} deveria oferecer situação`).toBe('situacao');
  return { ...viajado, situation: { ...viajado.situation!, situationId } };
}

describe('volta exige ter saído', () => {
  it('não deixa terminar a pendência sem sair do ambiente', () => {
    const s = chooseAction(comSituacao(createInitialState(), 'S5', 'teste-generica'), 'limpeza-seca');

    expect(s.rooms['S5'].status).toBe('pendente');
    expect(s.rooms['S5'].residualMinutes).toBeGreaterThan(0);
    expect(isSelectable(s, 'S5')).toBe(false);

    /* A regra vale no domínio, não só na interface: selectRoom também recusa. */
    expect(selectRoom(s, 'S5')).toBe(s);
  });

  it('não deixa re-sortear a situação de um ambiente apenas adiado', () => {
    const s = chooseAction(comSituacao(createInitialState(), 'S5', 'teste-sujeira'), 'sinalizar');

    expect(s.rooms['S5'].status).toBe('nao-iniciada');
    expect(isSelectable(s, 'S5')).toBe(false);
  });

  it('libera o ambiente depois de o trabalhador sair e voltar', () => {
    let s = chooseAction(comSituacao(createInitialState(), 'S5', 'teste-generica'), 'limpeza-seca');
    expect(isSelectable(s, 'S5')).toBe(false);

    /* O depósito é sempre selecionável: sair e voltar é sempre possível. */
    s = confirmTravel(selectRoom(s, 'DEP-A'));
    expect(isSelectable(s, 'S5')).toBe(true);

    const antes = s.distanceTraveled;
    s = confirmTravel(selectRoom(s, 'S5'));
    expect(s.rooms['S5'].status).toBe('concluida');
    /* O retorno agora custa deslocamento de verdade, que era o ponto. */
    expect(s.distanceTraveled).toBeGreaterThan(antes);
  });

  it('bloqueia por identidade de ambiente, não por posição no corredor', () => {
    /* S1 e S7 dividem a mesma corridorPosition: bloquear por posição
       impediria limpar a sala da ala oposta, que é destino legítimo. */
    expect(roomsById['S1'].corridorPosition).toBe(roomsById['S7'].corridorPosition);
    expect(roomsById['S1'].side).not.toBe(roomsById['S7'].side);

    const s = chooseAction(comSituacao(createInitialState(), 'S1', 'teste-generica'), 'limpeza-seca');

    expect(isSelectable(s, 'S1')).toBe(false);
    expect(isSelectable(s, 'S7')).toBe(true);
  });

  it('não confunde ambiente deixado por moveTo com ambiente atual', () => {
    /* `moveTo` muda a posição sem abrir parada nova, então a última parada da
       rota continua sendo a sala — mas o trabalhador já saiu dela. */
    const s = chooseAction(
      comSituacao(createInitialState(), 'S5', 'teste-deposito'),
      'trocar',
    );

    expect(s.route.at(-1)?.roomId).toBe('S5');
    expect(s.currentPosition).not.toBe(roomsById['S5'].corridorPosition);
    expect(s.rooms['S5'].status).toBe('nao-iniciada');
    expect(isSelectable(s, 'S5')).toBe(true);
  });
});
