import { describe, expect, it } from 'vitest';
import { objectives } from '../data/rooms';
import { situationsById } from '../data/situations';
import { chooseAction, confirmTravel, createInitialState, selectRoom, summarize } from './game';
import { decisoesCsv, partidasCsv } from './exportHistory';
import type { HistoryEntry } from './history';

/** Joga até enfrentar `n` situações, sempre escolhendo a primeira ação possível. */
function partidaCom(n: number) {
  let state = createInitialState();
  for (const room of objectives) {
    if (state.decisions.length >= n) break;
    state = confirmTravel(selectRoom(state, room.id));
    if (state.phase === 'situacao' && state.situation) {
      for (const action of situationsById[state.situation.situationId].actions) {
        const next = chooseAction(state, action.id);
        if (next !== state) {
          state = next;
          break;
        }
      }
    }
  }
  return state;
}

function entrada(playedAt: number, state = partidaCom(2)): HistoryEntry {
  const summary = summarize(state);
  return {
    id: String(playedAt),
    playedAt,
    concluidas: summary.concluidas.length,
    totalObjectives: summary.totalObjectives,
    pendentes: summary.pendentes.length,
    naoIniciadas: summary.naoIniciadas.length,
    distanceTraveled: summary.distanceTraveled,
    totalMinutes: summary.totalMinutes,
    complete: false,
    route: state.route.map((step) => step.roomId),
    decisions: state.decisions,
  };
}

const linhas = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

describe('exportação do histórico', () => {
  it('registra cada escolha com a situação, a ação e o momento', () => {
    const state = partidaCom(2);
    expect(state.decisions).toHaveLength(2);
    expect(state.decisions[0].minute).toBeGreaterThan(0);
    expect(situationsById[state.decisions[0].situationId]).toBeDefined();
  });

  it('numera as partidas em ordem cronológica, mesmo com o histórico do mais novo ao mais velho', () => {
    const csv = partidasCsv([entrada(2_000_000_000_000), entrada(1_000_000_000_000)]);
    const [cabecalho, primeira, segunda] = linhas(csv);
    expect(cabecalho.split(';')[0]).toBe('Partida');
    expect(primeira).toMatch(/^1;\d\d\/\d\d\/2001;/);
    expect(segunda).toMatch(/^2;\d\d\/\d\d\/2033;/);
  });

  it('gera uma linha por decisão, com nomes legíveis e a estratégia', () => {
    const state = partidaCom(2);
    const [, primeira] = linhas(decisoesCsv([entrada(1_000_000_000_000, state)]));
    const colunas = primeira.split(';');
    const situacao = situationsById[state.decisions[0].situationId];
    expect(colunas[6]).toBe(situacao.title);
    expect(colunas[7]).toBe(situacao.actions.find((a) => a.id === state.decisions[0].actionId)!.label);
    expect(colunas[8]).not.toBe('');
    expect(linhas(decisoesCsv([entrada(1, state)]))).toHaveLength(3);
  });

  it('aceita partidas antigas, salvas antes de as decisões existirem', () => {
    const { decisions: _, ...antiga } = entrada(1);
    expect(linhas(decisoesCsv([antiga]))).toHaveLength(1);
    expect(linhas(partidasCsv([antiga]))[1].split(';')[11]).toBe('');
  });

  it('usa vírgula decimal e protege texto com separador', () => {
    const csv = partidasCsv([{ ...entrada(1), distanceTraveled: 73.5 }]);
    expect(linhas(csv)[1].split(';')[10]).toBe('73,5');
    expect(csv.startsWith('﻿')).toBe(true);
  });
});
