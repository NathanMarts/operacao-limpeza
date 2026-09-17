import { describe, expect, it } from 'vitest';
import { gameConfig } from '../data/gameConfig';
import { objectives, roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
import { actionAvailability, evalTime, type EffectContext } from './effects';
import { objectives as todosObjetivos } from '../data/rooms';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  isSelectable,
  mustWait,
  waitInCorridor,
  selectRoom,
  summarize,
} from './game';
import { travelMinutes } from './movement';
import type { GameState } from './types';

/**
 * Política "terminar agora pelo menor tempo": entre as ações disponíveis que
 * concluem a sala sem provocar deslocamento extra, escolhe a mais barata.
 * Serve para medir o piso de tempo de uma rota, isolando o efeito da ORDEM.
 */
function cheapestFinishing(state: GameState): string | null {
  const situation = situationsById[state.situation!.situationId];
  const room = roomsById[state.situation!.roomId];
  const ctx: EffectContext = {
    room,
    roomState: state.rooms[room.id],
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: state.situation!.blockTargetId,
  };

  const candidates = situation.actions
    .filter((action) => actionAvailability(action, ctx).available)
    .filter((action) => action.effects.some((effect) => effect.type === 'completeRoom'))
    .filter((action) => !action.effects.some((effect) => effect.type === 'moveTo'))
    .map((action) => ({
      action,
      minutes: action.effects.reduce(
        (total, effect) =>
          effect.type === 'cleanTime' || effect.type === 'eventTime'
            ? total + evalTime(effect.amount, ctx)
            : total,
        0,
      ),
    }))
    .sort((a, b) => a.minutes - b.minutes);

  return candidates[0]?.action.id ?? null;
}

/** Executa uma rota; se a sala não puder ser concluída, tenta de novo mais tarde. */
function playRoute(order: string[], seed = gameConfig.seed): GameState {
  let state = createInitialState(seed);
  const queue: string[] = [...order];
  let guard = 0;

  while (guard < 400) {
    guard += 1;

    /* Acabou a rota planejada mas sobrou serviço: um jogador não vai embora,
       ele volta para o que ficou. Sem isso a medição subestima a partida. */
    if (queue.length === 0) {
      const pendentes = todosObjetivos
        .filter((room) => state.rooms[room.id].status !== 'concluida')
        .map((room) => room.id);
      if (pendentes.length === 0) break;
      queue.push(...pendentes);
    }

    // Um jogador competente não insiste numa sala bloqueada: pega a próxima
    // da sua rota que esteja disponível, preferindo a mais perto.
    let index = queue.findIndex((id) => isSelectable(state, id));
    if (index < 0) {
      if (mustWait(state)) {
        state = waitInCorridor(state);
        continue;
      }
      break;
    }
    if (!isSelectable(state, queue[0])) {
      let best = index;
      for (let i = index; i < queue.length; i += 1) {
        if (!isSelectable(state, queue[i])) continue;
        const near = Math.abs(roomsById[queue[i]].corridorPosition - state.currentPosition);
        const bestNear = Math.abs(roomsById[queue[best]].corridorPosition - state.currentPosition);
        if (near < bestNear) best = i;
      }
      index = best;
    }
    const [roomId] = queue.splice(index, 1);
    state = confirmTravel(selectRoom(state, roomId));
    if (state.phase === 'situacao') {
      const actionId = cheapestFinishing(state);
      if (!actionId) {
        // Sem material para concluir: passa no depósito e volta depois.
        state = chooseAction(state, situationsById[state.situation!.situationId].actions[2].id);
        queue.unshift(roomId);
        queue.unshift('DEP-A');
        continue;
      }
      state = chooseAction(state, actionId);
    }
  }
  return state;
}

const ROTA_EFICIENTE = [
  'WC-A', 'WC-B', 'S6', 'S12', 'S5', 'S11', 'S4', 'S10',
  'DEP-A',
  'S3', 'S9', 'S2', 'S8', 'S1', 'S7', 'ESC',
];

const ROTA_RUIM = [
  'S1', 'WC-A', 'S6', 'S7', 'ESC', 'S2', 'DEP-A', 'S12', 'S3', 'S11',
  'S4', 'S8', 'DEP-A', 'WC-B', 'S9', 'S10',
];

describe('calibração', () => {
  it('relatório dos valores acordados', () => {
    const eficiente = playRoute(ROTA_EFICIENTE);
    const ruim = playRoute(ROTA_RUIM);
    const a = summarize(eficiente);
    const b = summarize(ruim);

    const baseTotal = objectives.reduce((total, room) => total + room.baseCleaningMinutes, 0);
    const materialTotal = objectives.reduce((total, room) => total + room.materialCost, 0);

    const report = [
      '',
      '──────── CALIBRAÇÃO ────────',
      `Objetivos:                 ${objectives.length}`,
      `Tempo base somado:         ${baseTotal} min`,
      `Material necessário:       ${materialTotal} cargas (carrinho: ${gameConfig.maxCharges})`,
      `Conversão:                 1 min / ${gameConfig.metersPerMinute} m`,
      `Varredura de ${gameConfig.minimumSweepMeters} m:        ${travelMinutes(gameConfig.minimumSweepMeters).toFixed(1)} min`,
      `Turno de referência:       ${gameConfig.referenceShiftMinutes} min`,
      '',
      'ROTA EFICIENTE',
      `  concluídas:              ${a.concluidas.length}/${a.totalObjectives}`,
      `  distância:               ${a.distanceTraveled} m  (${a.travelMinutes.toFixed(1)} min)`,
      `  limpeza:                 ${a.cleaningMinutes} min`,
      `  eventos:                 ${a.eventMinutes} min`,
      `  TOTAL:                   ${a.totalMinutes.toFixed(1)} min`,
      '',
      'ROTA RUIM',
      `  concluídas:              ${b.concluidas.length}/${b.totalObjectives}`,
      `  distância:               ${b.distanceTraveled} m  (${b.travelMinutes.toFixed(1)} min)`,
      `  limpeza:                 ${b.cleaningMinutes} min`,
      `  eventos:                 ${b.eventMinutes} min`,
      `  TOTAL:                   ${b.totalMinutes.toFixed(1)} min`,
      '',
      `DIFERENÇA:                 ${(b.totalMinutes - a.totalMinutes).toFixed(1)} min ` +
        `(${(((b.totalMinutes - a.totalMinutes) / a.totalMinutes) * 100).toFixed(0)}%)`,
      `  só por deslocamento:     ${(b.travelMinutes - a.travelMinutes).toFixed(1)} min ` +
        `(${b.distanceTraveled - a.distanceTraveled} m)`,
      '────────────────────────────',
    ].join('\n');
    console.log(report);

    // Ambas as rotas precisam ser jogáveis até o fim.
    expect(a.concluidas.length).toBe(a.totalObjectives);
    expect(b.concluidas.length).toBe(b.totalObjectives);

    // O ponto central: a ordem tem peso mensurável.
    expect(b.distanceTraveled).toBeGreaterThan(a.distanceTraveled * 1.8);
    expect(b.totalMinutes).toBeGreaterThan(a.totalMinutes);
  });

  it('o deslocamento pesa o suficiente para a ordem importar', () => {
    const eficiente = summarize(playRoute(ROTA_EFICIENTE));
    const ruim = summarize(playRoute(ROTA_RUIM));

    // A diferença de tempo entre as duas rotas vem majoritariamente do corredor,
    // e não dos sorteios: é esse o critério pedagógico do jogo.
    const difTotal = ruim.totalMinutes - eficiente.totalMinutes;
    const difDeslocamento = ruim.travelMinutes - eficiente.travelMinutes;
    expect(difDeslocamento / difTotal).toBeGreaterThan(0.7);

    // O deslocamento precisa ser uma fatia visível do total, não um detalhe.
    expect(ruim.travelMinutes / ruim.totalMinutes).toBeGreaterThan(0.3);
  });
});
