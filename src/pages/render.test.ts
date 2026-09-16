import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { BuildingMap } from '../components/BuildingMap';
import { FinalResult } from '../components/FinalResult';
import { SituationDialog } from '../components/Dialogs';
import { situationsById } from '../data/situations';
import { objectives, roomsById } from '../data/rooms';
import { actionAvailability, describeAction, type EffectContext } from '../domain/effects';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  finishShift,
  isSelectable,
  mustWait,
  selectRoom,
  summarize,
  waitInCorridor,
} from '../domain/game';
import type { GameState } from '../domain/types';

/** Joga uma partida inteira escolhendo sempre a primeira ação disponível. */
function playFullGame(): GameState {
  let state = createInitialState();
  let guard = 0;

  while (guard < 300) {
    guard += 1;
    const target = objectives.find((room) => isSelectable(state, room.id));

    if (!target) {
      if (mustWait(state)) {
        state = waitInCorridor(state);
        continue;
      }
      // Sem material para concluir nada: passa no depósito.
      if (isSelectable(state, 'DEP-A') && state.charges < 2) {
        state = confirmTravel(selectRoom(state, 'DEP-A'));
        continue;
      }
      break;
    }

    state = confirmTravel(selectRoom(state, target.id));
    if (state.phase !== 'situacao' || !state.situation) continue;

    const situation = situationsById[state.situation.situationId];
    const ctx: EffectContext = {
      room: roomsById[target.id],
      roomState: state.rooms[target.id],
      charges: state.charges,
      position: roomsById[target.id].corridorPosition,
      blockTargetId: state.situation.blockTargetId,
    };
    const action = situation.actions.find((candidate) => actionAvailability(candidate, ctx).available);
    expect(action, `nenhuma ação disponível em ${situation.id}`).toBeDefined();
    state = chooseAction(state, action!.id);
  }
  return state;
}

describe('partida completa', () => {
  it('é possível concluir os 14 objetivos sem recarregar a página', () => {
    const state = playFullGame();
    const summary = summarize(state);
    expect(summary.concluidas.length).toBe(summary.totalObjectives);
    expect(state.phase).toBe('mapa');
    expect(summary.totalMinutes).toBeGreaterThan(0);
    expect(state.log.length).toBeGreaterThan(14);
  });

  it('o total é sempre a soma exata das parcelas registradas no log', () => {
    const state = playFullGame();
    const somaLog = state.log.reduce(
      (total, entry) => total + entry.deltaCleaning + entry.deltaEvent + entry.deltaIdle,
      0,
    );
    const somaDistancia = state.log.reduce((total, entry) => total + entry.deltaDistance, 0);
    expect(somaDistancia).toBe(state.distanceTraveled);
    expect(somaLog + somaDistancia / 5).toBeCloseTo(currentTotal(state));
  });
});

describe('renderização dos componentes', () => {
  it('o mapa renderiza todas as salas como elementos SVG próprios', () => {
    const state = createInitialState();
    const html = renderToString(
      createElement(BuildingMap, {
        state,
        totalMinutes: 0,
        showRoute: true,
        cleaningMinutesFor: () => 5,
        minutesUntilFree: () => 0,
        onSelect: () => {},
      }),
    );
    expect(html).toContain('<svg');
    for (const room of objectives) {
      expect(html).toContain(room.name);
    }
    // A planta desenhada, não uma imagem clicável.
    expect(html).not.toContain('<image');
    expect(html).toContain('ENTRADA (0 m)');
  });

  it('o modal de situação mostra as três cartas com seus efeitos', () => {
    const state = confirmTravel(selectRoom(createInitialState(), 'S5'));
    const situation = situationsById[state.situation!.situationId];
    const room = roomsById['S5'];
    const ctx: EffectContext = {
      room,
      roomState: state.rooms['S5'],
      charges: state.charges,
      position: room.corridorPosition,
      blockTargetId: state.situation!.blockTargetId,
    };
    const html = renderToString(
      createElement(SituationDialog, {
        situation,
        room,
        cards: situation.actions.map((action) => ({
          action,
          badges: describeAction(action, ctx),
          availability: actionAvailability(action, ctx),
        })),
        onChoose: () => {},
      }),
    );
    for (const action of situation.actions) {
      expect(html).toContain(action.label);
    }
    expect(html).toContain('Escolher');
  });

  it('a tela final reconstrói a rota e seus custos', () => {
    const played = finishShift(playFullGame());
    const summary = summarize(played);
    const html = renderToString(
      createElement(FinalResult, {
        state: played,
        summary,
        history: [],
        onRestart: () => {},
        onClearHistory: () => {},
      }),
    );
    expect(html).toContain('Decomposição da partida');
    expect(html).toContain('Referência espacial mínima');
    expect(html).toContain(`${summary.distanceTraveled} m`);
    // Cada passo do log aparece na tabela.
    expect(html).toContain(played.log[0].title);
    expect(html).toContain(played.log.at(-1)!.title);
  });
});
