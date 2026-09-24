import { describe, expect, it } from 'vitest';
import { gameConfig } from '../data/gameConfig';
import { DEPOSITO_POSITION, objectives, roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
import {
  actionAvailability,
  evalCharges,
  evalTime,
  targetPosition,
  type EffectContext,
} from './effects';
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
import { distanceBetween, travelMinutes } from './movement';
import type { GameState, SituationAction } from './types';

/**
 * Política do jogador simulado: minimizar o CUSTO TOTAL estimado da rota, não o
 * tempo imediato.
 *
 * A versão anterior escolhia sempre a ação mais barata em minutos, e por isso
 * pegava a opção que gasta mais material — medindo a miopia do simulador em vez
 * da eficiência da rota. O custo estimado aqui soma:
 *
 *   tempo imediato + deslocamento provocado
 *   − bônus de tempo diferido que a ação concede
 *   + custo das recargas que a ação ainda vai obrigar
 *
 * O material não é cobrado por carga amortizada: o que pesa é se a ação empurra
 * o carrinho para ALÉM do que falta da rota, porque aí o jogador paga uma ida e
 * volta inteira ao depósito por poucas cargas. É esse degrau que faz "preservar
 * material" valer a pena quando evita uma viagem — e não valer quando a viagem
 * vai acontecer de todo jeito.
 */

/** Cargas ainda necessárias para fechar os objetivos que restam. */
function materialRestante(state: GameState, concluiAtual: string | null): number {
  return todosObjetivos
    .filter((room) => room.id !== concluiAtual)
    .filter((room) => state.rooms[room.id].status !== 'concluida')
    .reduce((total, room) => total + room.materialCost, 0);
}

/** Minutos de uma ida e volta ao depósito a partir daqui, mais a recarga. */
function custoDeUmaRecarga(position: number): number {
  const ida = distanceBetween(position, DEPOSITO_POSITION);
  return gameConfig.refillMinutes + travelMinutes(ida * 2);
}

type Avaliacao = { action: SituationAction; custo: number };

function avaliar(action: SituationAction, state: GameState, ctx: EffectContext): Avaliacao {
  let tempo = 0;
  let metros = 0;
  let gastas = 0;
  let ganhas = 0;
  let bonusTempo = 0;
  let conclui = false;
  let posicaoFinal = ctx.position;

  for (const effect of action.effects) {
    switch (effect.type) {
      case 'cleanTime':
      case 'eventTime':
        tempo += evalTime(effect.amount, ctx);
        break;
      case 'spendCharges':
        gastas += evalCharges(effect.amount, ctx);
        break;
      case 'setCharges':
        gastas += Math.max(0, ctx.charges - effect.value);
        break;
      case 'gainCharges':
        ganhas += effect.amount;
        break;
      case 'refill':
        ganhas += gameConfig.maxCharges;
        break;
      case 'grantBuff':
        if (effect.kind === 'tempo') bonusTempo += effect.amount * effect.rooms;
        else ganhas += effect.amount * effect.rooms;
        break;
      case 'completeRoom':
        conclui = true;
        break;
      case 'moveTo': {
        const destino = targetPosition(effect.target);
        metros += distanceBetween(posicaoFinal, destino);
        posicaoFinal = destino;
        break;
      }
      default:
        break;
    }
  }

  const cargasDepois = Math.min(
    gameConfig.maxCharges,
    Math.max(0, ctx.charges - gastas + ganhas),
  );
  const falta = Math.max(0, materialRestante(state, conclui ? ctx.room.id : null) - cargasDepois);
  const recargas = Math.ceil(falta / gameConfig.maxCharges);

  const custo =
    tempo - bonusTempo + travelMinutes(metros) + recargas * custoDeUmaRecarga(posicaoFinal);

  return { action, custo };
}

/** A melhor ação que conclui a sala sem sair do lugar, pelo custo total. */
function bestFinishing(state: GameState): string | null {
  const situation = situationsById[state.situation!.situationId];
  const ctx = contextOf(state);

  const candidatas = situation.actions
    .filter((action) => actionAvailability(action, ctx).available)
    .filter((action) => action.effects.some((effect) => effect.type === 'completeRoom'))
    .filter((action) => !action.effects.some((effect) => effect.type === 'moveTo'))
    .map((action) => avaliar(action, state, ctx))
    .sort((a, b) => a.custo - b.custo);

  return candidatas[0]?.action.id ?? null;
}

function contextOf(state: GameState): EffectContext {
  const room = roomsById[state.situation!.roomId];
  return {
    room,
    roomState: state.rooms[room.id],
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: state.situation!.blockTargetId,
    unblockTargetId: state.situation!.unblockTargetId ?? null,
    /* A partida inteira, como o jogo passa: requisitos como "existe algum
       ambiente fechado" só se respondem olhando o estado. Sem isto o jogador
       simulado escolhia uma ação que o jogo recusava e ficava parado nela. */
    game: state,
  };
}

/**
 * Qualquer ação executável, para quando nenhuma consegue concluir a sala.
 * O sorteador garante que sempre existe ao menos uma; escolher uma posição
 * fixa do catálogo não garante, e foi o que travava a simulação.
 */
function anyAvailable(state: GameState): string {
  const ctx = contextOf(state);
  const disponiveis = situationsById[state.situation!.situationId].actions.filter(
    (action) => actionAvailability(action, ctx).available,
  );
  if (disponiveis.length === 0) throw new Error('situação oferecida sem nenhuma ação executável');

  /* Um jogador competente não bloqueia a própria sala tendo outra saída:
     bloquear pode forçá-lo a ficar ocioso no corredor esperando liberar.
     Sem esta preferência, a medição mede a política do simulador em vez da
     eficiência da rota. */
  const semAutoBloqueio = disponiveis.filter(
    (action) =>
      !action.effects.some((effect) => effect.type === 'blockRoom' && effect.target === 'self'),
  );
  return (semAutoBloqueio[0] ?? disponiveis[0]).id;
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
      const actionId = bestFinishing(state);
      if (!actionId) {
        // Sem material para concluir: passa no depósito e volta depois.
        state = chooseAction(state, anyAvailable(state));
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
      `  ocioso:                  ${a.idleMinutes} min`,
      `  TOTAL:                   ${a.totalMinutes.toFixed(1)} min`,
      '',
      'ROTA RUIM',
      `  concluídas:              ${b.concluidas.length}/${b.totalObjectives}`,
      `  distância:               ${b.distanceTraveled} m  (${b.travelMinutes.toFixed(1)} min)`,
      `  limpeza:                 ${b.cleaningMinutes} min`,
      `  eventos:                 ${b.eventMinutes} min`,
      `  ocioso:                  ${b.idleMinutes} min`,
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
