import './fixturesDeTeste';
import { describe, expect, it } from 'vitest';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  isSelectable,
  minutesUntilFree,
  mustWait,
  previewCleaningMinutes,
  selectRoom,
  waitInCorridor,
} from './game';
import { gameConfig } from '../data/gameConfig';
import { objectives, roomsById } from '../data/rooms';
import type { GameState } from './types';

function arriveAt(state: GameState, roomId: string): GameState {
  return confirmTravel(selectRoom(state, roomId));
}

/** Força uma situação específica, contornando o sorteio, para testar seus efeitos. */
function forceSituation(state: GameState, roomId: string, situationId: string): GameState {
  const arrived = arriveAt(state, roomId);
  return { ...arrived, phase: 'situacao', situation: { situationId, roomId, blockTargetId: null } };
}

describe('material e depósito', () => {
  it('limpar tudo exige 17 cargas, mas o carrinho só leva 10 — a ida ao depósito é obrigatória', () => {
    const necessario = objectives.reduce((total, room) => total + room.materialCost, 0);
    expect(necessario).toBe(17); // 12 salas + 2 banheiros (2 cada) + caixa de escada
    expect(gameConfig.initialCharges).toBe(10);
    expect(gameConfig.maxCharges).toBe(10);
    expect(necessario).toBeGreaterThan(gameConfig.maxCharges);
    // Margem de folga: sobra pouco, mas uma única recarga ainda basta.
    expect(gameConfig.maxCharges * 2 - necessario).toBe(3);
  });

  it('salas custam 1 carga e banheiros custam 2', () => {
    expect(roomsById['S5'].materialCost).toBe(1);
    expect(roomsById['WC-A'].materialCost).toBe(2);
    expect(roomsById['WC-B'].materialCost).toBe(2);
  });

  it('passar pelo depósito durante outro deslocamento NÃO reabastece', () => {
    // S6 → WC-A(4) passa por cima do depósito, em 8.
    let state = createInitialState();
    state = chooseAction(forceSituation(state, 'S6', 'teste-generica'), 'racionar');
    const antes = state.charges;

    state = arriveAt(state, 'WC-A');
    expect(state.currentPosition).toBe(4);
    expect(state.charges).toBe(antes); // nenhuma recarga silenciosa
  });

  it('o depósito é um destino clicável que cobra deslocamento e 4 min', () => {
    let state = createInitialState();
    state = chooseAction(forceSituation(state, 'S1', 'teste-generica'), 'racionar');
    const gastas = gameConfig.initialCharges - state.charges;
    expect(gastas).toBe(1);

    expect(isSelectable(state, 'DEP-A')).toBe(true);
    const distanciaAntes = state.distanceTraveled;
    const eventosAntes = state.eventMinutes;

    state = arriveAt(state, 'DEP-A');
    expect(state.charges).toBe(gameConfig.maxCharges);
    expect(state.eventMinutes - eventosAntes).toBe(gameConfig.refillMinutes);
    expect(state.distanceTraveled - distanciaAntes).toBeCloseTo(roomsById.S1.corridorPosition - 8); // S1 → depósito
    expect(state.phase).toBe('mapa'); // depósito não abre situação
  });

  it('parar no depósito no meio de uma varredura monotônica custa 0 m extras', () => {
    // S6 → DEP(8) → WC-A(4) percorre os mesmos metros de S6 → WC-A.
    let comParada = createInitialState();
    comParada = chooseAction(forceSituation(comParada, 'S6', 'teste-generica'), 'racionar');
    const base = comParada.distanceTraveled;
    comParada = arriveAt(comParada, 'DEP-A');
    comParada = arriveAt(comParada, 'WC-A');
    expect(comParada.distanceTraveled - base).toBeCloseTo(roomsById.S6.corridorPosition - 4);
  });

  it('sem cargas suficientes a limpeza completa fica indisponível, mas a situação sempre tem saída', () => {
    let state = { ...createInitialState(), charges: 0 };
    state = forceSituation(state, 'WC-A', 'teste-generica');
    // 'racionar' exige 2 cargas e 'limpeza-seca' exige 1: ambas bloqueadas.
    expect(chooseAction(state, 'racionar')).toBe(state);
    expect(chooseAction(state, 'limpeza-seca')).toBe(state);
    // 'esperar-agua' não exige material: o jogador nunca fica preso.
    const depois = chooseAction(state, 'esperar-agua');
    expect(depois.phase).toBe('mapa');
  });
});

describe('pendência', () => {
  it('limpeza rápida deixa residual e a volta conclui sem gastar material', () => {
    let state = createInitialState();
    state = chooseAction(forceSituation(state, 'S2', 'teste-generica'), 'limpeza-seca');

    const base = roomsById['S2'].baseCleaningMinutes; // 8
    expect(state.rooms['S2'].status).toBe('pendente');
    expect(state.cleaningMinutes).toBe(Math.ceil(base / 2)); // 4
    expect(state.rooms['S2'].residualMinutes).toBe(base - Math.ceil(base / 2) + 2); // 6
    expect(state.charges).toBe(gameConfig.initialCharges - 1);

    // A confirmação mostra o residual, não o tempo base.
    expect(previewCleaningMinutes(state, 'S2')).toBe(6);

    /* Uma volta exige ter saído: o ambiente incompleto sob os pés não é
       selecionável. O desvio pelo depósito é a saída sempre disponível, e as
       cargas são medidas DEPOIS dele — a asserção é sobre o trecho de volta
       não consumir material, que continua sendo o que importa aqui. */
    expect(isSelectable(state, 'S2')).toBe(false);
    state = arriveAt(state, 'DEP-A');
    expect(isSelectable(state, 'S2')).toBe(true);

    const cargasAntes = state.charges;
    const voltando = arriveAt(state, 'S2');
    expect(voltando.phase).toBe('mapa'); // sem nova situação (Q18)
    expect(voltando.rooms['S2'].status).toBe('concluida');
    expect(voltando.cleaningMinutes).toBe(4 + 6);
    expect(voltando.charges).toBe(cargasAntes); // sem consumo no retorno
  });

  it('rápida + retorno custa mais tempo de limpeza do que ter limpado de uma vez', () => {
    const base = roomsById['S2'].baseCleaningMinutes;
    const rapida = Math.ceil(base / 2);
    const residual = base - rapida + 2;
    expect(rapida + residual).toBeGreaterThan(base);
  });

  it('a volta para resolver a pendência cobra deslocamento de verdade', () => {
    let state = createInitialState();
    state = chooseAction(forceSituation(state, 'S2', 'teste-generica'), 'limpeza-seca'); // 15 m
    state = chooseAction(forceSituation(state, 'WC-A', 'teste-generica'), 'racionar'); // volta até o banheiro
    const antes = state.distanceTraveled;
    state = arriveAt(state, 'S2'); // e de volta à S2
    expect(state.distanceTraveled - antes).toBeCloseTo(roomsById.S2.corridorPosition - 4);
  });

  it('adiar acumula sujeira: a sala fica mais cara na próxima visita', () => {
    let state = createInitialState();
    const base = roomsById['S5'].baseCleaningMinutes;
    state = chooseAction(forceSituation(state, 'S5', 'teste-sujeira'), 'sinalizar');
    expect(state.rooms['S5'].status).toBe('nao-iniciada');
    expect(state.charges).toBe(gameConfig.initialCharges);
    expect(previewCleaningMinutes(state, 'S5')).toBe(base + 4);
  });
});

describe('bloqueio temporário', () => {
  it('bloqueia contra o tempo total acumulado', () => {
    let state = createInitialState();
    state = chooseAction(forceSituation(state, 'S5', 'teste-ocupada'), 'seguir');
    const total = currentTotal(state);
    expect(state.rooms['S5'].blockedUntilMinute).toBeCloseTo(total + gameConfig.blockDurationMinutes);
    expect(isSelectable(state, 'S5')).toBe(false);
    expect(minutesUntilFree(state, 'S5')).toBeCloseTo(gameConfig.blockDurationMinutes);
  });

  it('avançar o relógio limpando outras salas destrava a sala bloqueada', () => {
    let state = createInitialState();
    state = chooseAction(forceSituation(state, 'S5', 'teste-ocupada'), 'seguir');
    expect(isSelectable(state, 'S5')).toBe(false);

    // S2 e S8 são as salas mais demoradas: queimam relógio depressa.
    state = chooseAction(forceSituation(state, 'S2', 'teste-generica'), 'racionar');
    state = chooseAction(forceSituation(state, 'S8', 'teste-generica'), 'racionar');
    state = chooseAction(forceSituation(state, 'WC-A', 'teste-generica'), 'racionar');
    expect(currentTotal(state)).toBeGreaterThan(gameConfig.blockDurationMinutes);
    expect(isSelectable(state, 'S5')).toBe(true);
  });

  it('o botão Aguardar só existe quando tudo o que resta está bloqueado', () => {
    const state = createInitialState();
    expect(mustWait(state)).toBe(false);
  });

  it('Aguardar avança exatamente até o próximo desbloqueio e registra tempo ocioso', () => {
    // Estado artificial: um único objetivo restante, bloqueado.
    let state = createInitialState();
    const rooms = { ...state.rooms };
    for (const room of objectives) {
      rooms[room.id] = { ...rooms[room.id], status: 'concluida' };
    }
    rooms['S5'] = { ...rooms['S5'], status: 'nao-iniciada', blockedUntilMinute: 40 };
    state = { ...state, rooms, cleaningMinutes: 30 };

    expect(mustWait(state)).toBe(true);
    const depois = waitInCorridor(state);
    expect(depois.idleMinutes).toBe(10);
    expect(currentTotal(depois)).toBe(40);
    expect(mustWait(depois)).toBe(false);
    expect(depois.log.at(-1)?.deltaIdle).toBe(10);
  });

  it('pedir a chave bloqueia um objetivo ainda não concluído, nunca a sala atual', () => {
    let state = createInitialState();
    const arrived = arriveAt(state, 'S5');
    state = {
      ...arrived,
      phase: 'situacao',
      situation: { situationId: 'sala-trancada', roomId: 'S5', blockTargetId: 'S11' },
    };
    state = chooseAction(state, 'pedir-chave');
    expect(state.rooms['S5'].status).toBe('concluida');
    expect(state.rooms['S11'].blockedUntilMinute).not.toBeNull();
    expect(isSelectable(state, 'S11')).toBe(false);
  });
});
