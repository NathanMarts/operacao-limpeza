import './fixturesDeTeste';
import { describe, expect, it } from 'vitest';
import { situations } from '../data/situations';
import { DEPOSITO_POSITION, roomsById } from '../data/rooms';
import { gameConfig } from '../data/gameConfig';
import {
  actionAvailability,
  describeAction,
  evalCharges,
  evalTime,
  summarizeAction,
  targetPosition,
  type EffectContext,
} from './effects';
import { distanceBetween } from './movement';
import { createInitialState, confirmTravel, selectRoom, chooseAction, currentTotal } from './game';
import { isEligible } from './situationPicker';
import type { GameState, RoomState, SituationAction } from './types';
import { objectives as todosObjetivos } from '../data/rooms';

/** Chega numa sala pagando o deslocamento, sem passar pelo sorteio. */
function arriveAt(state: GameState, roomId: string): GameState {
  return confirmTravel(selectRoom(state, roomId));
}

/** Força uma situação específica numa sala, para testar o efeito isolado. */
function forceSituation(state: GameState, roomId: string, situationId: string): GameState {
  const arrived = arriveAt(state, roomId);
  return { ...arrived, phase: 'situacao', situation: { situationId, roomId, blockTargetId: null } };
}

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
  /** Material que só existe se a rota passar por ele: vale menos que carga na mão. */
  materialNoMapa: number;
  /** Depender do relógio de outra pessoa: a sala só fica pronta no minuto combinado. */
  dependencia: number;
  /** Custo empurrado para salas vizinhas: pesa só se elas ainda estão por fazer. */
  regiao: number;
  /** A situação continua em aberto: o mesmo problema espera na volta. */
  problemaAberto: number;
  /** Saber antes o que espera nas próximas salas. */
  informacao: number;
  /** O resultado depende de sorte: a chance está escrita na carta. */
  risco: number;
  /** Um prazo aceito restringe a rota daqui para a frente. */
  compromisso: number;
};

/** Espera média até o N-ésimo sinal, sem saber a hora: meio intervalo a menos. */
const esperaDoSinal = (n: number) => n * 20 - 10;

function costOf(action: SituationAction, ctx: EffectContext): CostVector {
  const cost: CostVector = {
    tempoAgora: 0,
    material: 0,
    trabalhoFuturo: 0,
    bloqueio: 0,
    deslocamento: 0,
    materialNoMapa: 0,
    dependencia: 0,
    regiao: 0,
    problemaAberto: 0,
    informacao: 0,
    risco: 0,
    compromisso: 0,
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
        cost.problemaAberto += 1;
        break;
      case 'addDirt':
        cost.trabalhoFuturo += effect.minutes;
        break;
      case 'blockRoom':
        cost.bloqueio += effect.ateSinal ? esperaDoSinal(effect.ateSinal) : effect.minutes;
        break;
      case 'blockDeposito':
        // Fechar a recarga pesa como fechar uma sala: é um ponto da rota que some.
        cost.bloqueio += effect.minutes;
        break;
      case 'aposta': {
        // Custo esperado da falha, mais a incerteza em si.
        const falha = costOf({ ...action, effects: effect.seFalhar }, ctx);
        for (const axis of AXES) cost[axis] += falha[axis] / effect.umEm;
        cost.risco += 1;
        break;
      }
      case 'addMeta':
        cost.compromisso += 1;
        if (effect.recompensa) cost.trabalhoFuturo -= 3;
        break;
      case 'unblockRoom':
        // Liberar um objetivo é ganho de rota: custo negativo.
        cost.bloqueio -= gameConfig.blockDurationMinutes;
        break;
      case 'moveTo':
        cost.deslocamento += distanceBetween(ctx.position, targetPosition(effect.target));
        break;
      case 'gainCharges': {
        // Ganhar material é custo negativo, como reabastecer; o que não cabe fica no mapa.
        const cabe = Math.min(effect.amount, gameConfig.maxCharges - charges);
        cost.material -= cabe;
        cost.materialNoMapa -= effect.amount - cabe;
        charges += cabe;
        break;
      }
      case 'grantBuff':
        // Um bônus diferido vale trabalho futuro poupado.
        if (effect.kind === 'tempo') cost.trabalhoFuturo -= effect.amount * effect.rooms;
        else cost.material -= effect.amount * effect.rooms;
        break;
      case 'modifyRooms':
        // Sem a partida, assume uma sala alcançada: o sinal é o que importa.
        cost.regiao += effect.minutes;
        break;
      case 'placeStash':
        cost.materialNoMapa -= effect.charges;
        break;
      case 'delegate':
        cost.dependencia += effect.ateSinal ? esperaDoSinal(effect.ateSinal) : effect.minutes;
        // Delegar a si mesma não conclui agora, mas também não deixa trabalho seu.
        if (effect.target !== 'self') cost.trabalhoFuturo -= 3;
        break;
      case 'blockRooms':
        cost.regiao += effect.minutes / 5;
        break;
      case 'fetchSupply':
        // Vindo de uma caixa do corredor, o ganho no carrinho é perda no mapa.
        if (effect.origem === 'estoque') cost.materialNoMapa += effect.amount;
        cost.material -= Math.min(effect.amount, gameConfig.maxCharges - charges);
        charges = Math.min(gameConfig.maxCharges, charges + effect.amount);
        break;
      case 'revealSituations':
        cost.informacao -= effect.count;
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
  'materialNoMapa',
  'dependencia',
  'regiao',
  'problemaAberto',
  'informacao',
  'risco',
  'compromisso',
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
        /* Contextos em que a situação nunca aparece não contam: "material
           acabando" com o carrinho cheio é uma comparação que o jogo não faz. */
        const aparece = situation.conditions.every((condition) => {
          if (condition.type === 'chargesAtMost') return ctx.charges <= condition.value;
          if (condition.type === 'distanceFromDepotAtLeast') {
            return Math.abs(ctx.position - DEPOSITO_POSITION) >= condition.meters;
          }
          return true;
        });
        if (!aparece) continue;
        if (situation.appliesTo && !situation.appliesTo.includes(ctx.room.kind)) continue;
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

    if (violations.length) console.log(violations.join(String.fromCharCode(10)));
    expect(violations).toEqual([]);
  });

  it('toda situação tem exatamente três ações', () => {
    for (const situation of situations) {
      expect(situation.actions).toHaveLength(3);
    }
  });

  it('com o carrinho vazio, todo tipo de ambiente ainda tem cartas com saída', () => {
    /* Nem toda carta precisa de uma saída sem material: o sorteio já descarta
       as que não têm ação possível (isEligible). O que não pode acontecer é um
       tipo de ambiente ficar sem nenhuma carta sorteável com o carrinho vazio. */
    for (const roomId of ['S5', 'WC-A', 'ESC']) {
      const room = roomsById[roomId];
      const ctx: EffectContext = {
        room,
        roomState: cleanRoomState,
        charges: 0,
        position: room.corridorPosition,
        blockTargetId: 'S12',
      };
      const comSaida = situations.filter(
        (situation) =>
          situation.conditions.length === 0 &&
          (!situation.appliesTo || situation.appliesTo.includes(room.kind)) &&
          situation.actions.some((action) => actionAvailability(action, ctx).available),
      );
      expect(comSaida.length, `${room.kind} sem carta possível com 0 cargas`).toBeGreaterThanOrEqual(2);
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

describe('escopo por tipo de ambiente', () => {
  const kindsPorSituacao = () =>
    situations.map((situation) => ({ id: situation.id, appliesTo: situation.appliesTo }));

  it('cada tipo de ambiente tem situações próprias além das genéricas', () => {
    const porTipo = (kind: 'sala' | 'wc' | 'escada') =>
      kindsPorSituacao().filter((s) => s.appliesTo?.includes(kind)).length;

    // Sem isso, os três tipos de cômodo receberiam o mesmo conteúdo genérico.
    expect(porTipo('sala')).toBeGreaterThanOrEqual(4);
    expect(porTipo('wc')).toBeGreaterThanOrEqual(4);
    expect(porTipo('escada')).toBeGreaterThanOrEqual(3);
    // E ainda sobram situações que valem em qualquer ambiente.
    const emTodos = (s: { appliesTo?: string[] }) =>
      !s.appliesTo || ['sala', 'wc', 'escada'].every((kind) => s.appliesTo!.includes(kind));
    expect(kindsPorSituacao().filter(emTodos).length).toBeGreaterThanOrEqual(3);
  });

  it('uma situação escopada nunca é oferecida num tipo fora do seu escopo', () => {
    const state = createInitialState();
    for (const situation of situations) {
      if (!situation.appliesTo) continue;
      for (const room of todosObjetivos) {
        if (situation.appliesTo.includes(room.kind)) continue;
        expect(
          isEligible(situation, state, room, cleanRoomState, 0),
          `${situation.id} (escopo ${situation.appliesTo.join('/')}) apareceu em ${room.id} (${room.kind})`,
        ).toBe(false);
      }
    }
  });

  it('todo ambiente limpável tem ao menos uma situação elegível', () => {
    const state = createInitialState();
    for (const room of todosObjetivos) {
      const elegiveis = situations.filter((situation) =>
        isEligible(situation, state, room, cleanRoomState, 0),
      );
      expect(elegiveis.length, `${room.id} (${room.kind}) sem situação elegível`).toBeGreaterThan(0);
    }
  });
});

describe('bônus diferidos', () => {
  /** Leva o jogador até uma sala e escolhe a ação pedida. */
  function jogar(state: GameState, roomId: string, situationId: string, actionId: string) {
    const levado = forceSituation(state, roomId, situationId);
    return chooseAction(levado, actionId);
  }

  it('um bônus de tempo abate minutos nas próximas salas e depois expira', () => {
    // "Caprichar e pegar embalo": −2 min nas 2 salas seguintes.
    let state = jogar(createInitialState(), 'S5', 'teste-embalo', 'caprichar');
    expect(state.buffs).toHaveLength(1);
    expect(state.buffs[0].roomsLeft).toBe(2);

    const antes = state.cleaningMinutes;
    state = jogar(state, 'S4', 'teste-generica', 'racionar');
    const gastoComBonus = state.cleaningMinutes - antes;
    // S4 tem 4 min de base; o bônus abate 2.
    expect(gastoComBonus).toBe(roomsById['S4'].baseCleaningMinutes - 2);
    expect(state.buffs[0].roomsLeft).toBe(1);

    state = jogar(state, 'S3', 'teste-generica', 'racionar');
    expect(state.buffs).toHaveLength(0); // consumido nas duas salas

    const antesSemBonus = state.cleaningMinutes;
    state = jogar(state, 'S2', 'teste-generica', 'racionar');
    expect(state.cleaningMinutes - antesSemBonus).toBe(roomsById['S2'].baseCleaningMinutes);
  });

  it('o bônus nunca devolve mais tempo do que a sala custou', () => {
    let state = jogar(createInitialState(), 'S5', 'teste-embalo', 'caprichar');
    const antes = state.cleaningMinutes;
    // Retorno a uma pendência de 3 min com um bônus de 2: abate só 2.
    state = {
      ...state,
      rooms: {
        ...state.rooms,
        S3: { ...state.rooms['S3'], status: 'pendente', residualMinutes: 3 },
      },
    };
    state = confirmTravel(selectRoom(state, 'S3'));
    expect(state.cleaningMinutes - antes).toBe(1);
    expect(state.cleaningMinutes - antes).toBeGreaterThanOrEqual(0);
  });

  it('um bônus de material devolve cargas, sem passar do teto do carrinho', () => {
    let state = jogar(createInitialState(), 'S6', 'teste-bonus-material', 'avisar-ala');
    expect(state.buffs[0].kind).toBe('material');

    const antes = state.charges;
    state = jogar(state, 'S5', 'teste-generica', 'racionar');
    // S5 custa 1 carga e o bônus devolve 1: o saldo não muda.
    expect(state.charges).toBe(antes);
    expect(state.charges).toBeLessThanOrEqual(gameConfig.maxCharges);
  });

  it('o abatimento aparece no log, para o total continuar explicável', () => {
    let state = jogar(createInitialState(), 'S5', 'teste-embalo', 'caprichar');
    state = jogar(state, 'S4', 'teste-generica', 'racionar');
    const entrada = state.log.at(-1)!;
    expect(entrada.detail).toContain('Ritmo embalado');
  });
});

describe('regras estruturais do catálogo', () => {
  it('todo fechamento é curto e tem hora para acabar', () => {
    /* Cada carta diz por quanto tempo fecha (a turma fica 25 min, o piso seca
       em 12), ou fecha até um sinal do intervalo. Nenhum fechamento passa de
       meia hora nem de dois sinais: fechar é desviar a rota, não tirar a sala
       do jogo. */
    for (const situation of situations) {
      for (const action of situation.actions) {
        for (const effect of action.effects) {
          const onde = `${situation.id}/${action.id}`;
          if (effect.type === 'blockRoom' && effect.ateSinal) {
            expect(effect.ateSinal, `${onde} fecha por sinais demais`).toBeLessThanOrEqual(2);
            continue;
          }
          if (effect.type !== 'blockRoom' && effect.type !== 'blockRooms' && effect.type !== 'blockDeposito') continue;
          expect(effect.minutes, `${onde} fecha por tempo demais`).toBeLessThanOrEqual(30);
          expect(effect.minutes, `${onde} fecha sem duração`).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it('todo efeito do catálogo é visível antes da escolha', () => {
    const ctx: EffectContext = {
      room: roomsById['S5'],
      roomState: cleanRoomState,
      charges: 5,
      position: roomsById['S5'].corridorPosition,
      blockTargetId: 'S12',
    };
    for (const situation of situations) {
      for (const action of situation.actions) {
        // Um efeito sem selo seria consequência escondida (decisão Q10).
        expect(
          describeAction(action, ctx).length,
          `${situation.id}/${action.id} tem efeito sem selo visível`,
        ).toBe(action.effects.length);

        const resumo = summarizeAction(action, ctx);
        expect(
          resumo.agora.length + resumo.depois.length,
          `${situation.id}/${action.id} não resume nada nas cartas`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('toda consequência futura tem lugar no estado da partida', () => {
    /* Pendência -> roomState.residualMinutes; sujeira -> extraDirtMinutes;
       bloqueio -> blockedUntilMinute; bônus -> state.buffs. Um efeito futuro
       sem campo correspondente seria promessa que o jogo não cumpre. */
    const state = createInitialState();
    const campos: Record<string, boolean> = {
      leavePending: 'residualMinutes' in state.rooms['S5'],
      addDirt: 'extraDirtMinutes' in state.rooms['S5'],
      blockRoom: 'blockedUntilMinute' in state.rooms['S5'],
      grantBuff: Array.isArray(state.buffs),
      leaveUnstarted: 'status' in state.rooms['S5'],
      modifyRooms: Array.isArray(state.modifiers),
      placeStash: Array.isArray(state.stashes),
      addMeta: Array.isArray(state.metas),
      delegate: 'blockedUntilMinute' in state.rooms['S5'],
    };
    const futuros = new Set<string>();
    for (const situation of situations) {
      for (const action of situation.actions) {
        for (const effect of action.effects) {
          if (effect.type in campos) futuros.add(effect.type);
        }
      }
    }
    for (const tipo of futuros) {
      expect(campos[tipo], `efeito futuro "${tipo}" sem campo no estado`).toBe(true);
    }
    // O catálogo de fato usa as quatro moedas futuras.
    expect(futuros.size).toBeGreaterThanOrEqual(4);
  });

  it('cada situação tem id único', () => {
    const ids = situations.map((situation) => situation.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
