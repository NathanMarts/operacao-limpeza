import './fixturesDeTeste';
import { describe, expect, it } from 'vitest';
import { gameConfig } from '../data/gameConfig';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  isSelectable,
  mustWait,
  previewCleaningMinutes,
  selectRoom,
  waitInCorridor,
} from './game';
import { actionAvailability, evalTime, type EffectContext } from './effects';
import { roomsById } from '../data/rooms';
import { prototipoFase1, situationsById } from '../data/situations';
import { definirModoPlaytest, isEligible } from './situationPicker';
import { PONTOS } from './mapa';
import type { GameState } from './types';

/** Chega numa sala pagando o deslocamento e força a situação pedida. */
function em(state: GameState, roomId: string, situationId: string): GameState {
  const chegou = confirmTravel(selectRoom(state, roomId));
  return { ...chegou, phase: 'situacao', situation: { situationId, roomId, blockTargetId: null } };
}

/** Anda até uma sala e resolve a situação que estiver lá com a ação que conclui mais simples. */
function limpar(state: GameState, roomId: string): GameState {
  return chooseAction(em(state, roomId, 'teste-generica'), 'racionar');
}

describe('pendência persistente', () => {
  it('a sala deixada para depois volta com a MESMA situação, sem novo sorteio', () => {
    let s = chooseAction(em(createInitialState(), 'S5', 'sala-trancada'), 'deixar-trancada');
    expect(s.rooms.S5.deferredSituationId).toBe('sala-trancada');

    s = limpar(s, 'S11');
    const bagAntes = s.bag;
    s = confirmTravel(selectRoom(s, 'S5'));
    expect(s.situation?.situationId).toBe('sala-trancada');
    // O saco de sorteio não foi tocado: não houve sorteio.
    expect(s.bag).toEqual(bagAntes);
  });

  it('deixar a escada para o final: a mesma situação espera, e ela rende mais na volta', () => {
    let s = chooseAction(em(createInitialState(), 'ESC', 'fluxo-de-alunos'), 'deixar-final');
    expect(s.rooms.ESC.deferredSituationId).toBe('fluxo-de-alunos');
    expect(previewCleaningMinutes(s, 'ESC')).toBe(roomsById.ESC.baseCleaningMinutes - 2);
    s = limpar(s, 'S1');
    s = confirmTravel(selectRoom(s, 'ESC'));
    expect(s.situation?.situationId).toBe('fluxo-de-alunos');
  });

  it('buscar a chave deixa a sala aberta: a volta é só limpar, sem situação', () => {
    let s = chooseAction(em(createInitialState(), 'S5', 'sala-trancada'), 'buscar-chave');
    expect(s.rooms.S5.status).toBe('pendente');
    expect(s.currentPosition).toBe(-2); // foi até a entrada
    s = confirmTravel(selectRoom(s, 'S5'));
    expect(s.phase).toBe('mapa');
    expect(s.rooms.S5.status).toBe('concluida');
  });
});

describe('custo pela distância', () => {
  it('a mesma ação custa mais longe do depósito', () => {
    const radio = situationsById['material-acabando'].actions.find((a) => a.id === 'radio')!;
    const espera = radio.effects.find((e) => e.type === 'eventTime')!;
    const custo = (roomId: string) => {
      const room = roomsById[roomId];
      const ctx: EffectContext = {
        room,
        roomState: createInitialState().rooms[roomId],
        charges: 2,
        position: room.corridorPosition,
        blockTargetId: null,
      };
      return espera.type === 'eventTime' ? evalTime(espera.amount, ctx) : 0;
    };
    // A escada fica a 63,5 m do depósito; a S5, bem mais perto.
    expect(custo('S5')).toBeCloseTo((roomsById.S5.corridorPosition - 8) / gameConfig.metersPerMinute + 1);
    expect(custo('ESC')).toBeCloseTo(63.5 / gameConfig.metersPerMinute + 1, 1);
    expect(custo('ESC')).toBeGreaterThan(custo('S5') * 2);
  });
});

describe('efeito regional', () => {
  it('varrer para o corredor encarece as vizinhas por fazer, e só elas', () => {
    let s = limpar(createInitialState(), 'S4'); // S4 já feita: não recebe
    s = chooseAction(em(s, 'S3', 'sala-suja'), 'varrer-corredor');
    expect(s.modifiers).toHaveLength(1);
    // S2/S8 ficam a 6,5 m da porta da S3 (porta no canto): dentro do raio.
    expect(s.modifiers[0].targets.sort()).toEqual(['S10', 'S2', 'S8', 'S9'].sort());
    expect(previewCleaningMinutes(s, 'S9')).toBe(roomsById.S9.baseCleaningMinutes + 2);
    expect(previewCleaningMinutes(s, 'S1')).toBe(roomsById.S1.baseCleaningMinutes);
  });

  it('a turma adianta as vizinhas só enquanto está no andar: quem sai da região perde', () => {
    let s = chooseAction(em(createInitialState(), 'S3', 'turma-ajuda'), 'preparar-vizinhas');
    expect(s.modifiers[0].targets).toContain('S9');
    expect(s.modifiers[0].until).not.toBeNull();
    // Fica na região: a sala da frente sai 2 min mais barata.
    const antes = s.cleaningMinutes;
    s = limpar(s, 'S9');
    expect(s.cleaningMinutes - antes).toBe(roomsById.S9.baseCleaningMinutes - 2);
    // Depois do prazo, o efeito some das que sobraram.
    for (const id of ['S6', 'S12', 'S5']) s = limpar(s, id);
    expect(previewCleaningMinutes(s, 'S2')).toBe(roomsById.S2.baseCleaningMinutes);
  });

  it('"deixar no fundo" some quando você já está no fundo', () => {
    const noMeio = em(createInitialState(), 'S3', 'entrega-de-material');
    const noFundo = em(createInitialState(), 'S1', 'entrega-de-material');
    const disponivel = (st: GameState) => {
      const room = roomsById[st.situation!.roomId];
      const acao = situationsById['entrega-de-material'].actions.find((a) => a.id === 'deixar-fundo')!;
      return actionAvailability(acao, {
        room,
        roomState: st.rooms[room.id],
        charges: st.charges,
        position: room.corridorPosition,
        blockTargetId: null,
        game: st,
      }).available;
    };
    expect(disponivel(noMeio)).toBe(true);
    expect(disponivel(noFundo)).toBe(false);
  });

  it('a enceradeira estacionada tem posição no corredor e vale nas salas daquele ponto', () => {
    const s = chooseAction(em(createInitialState(), 'S3', 'enceradeira-disponivel'), 'estacionar-fundo');
    expect(s.modifiers[0].targets.sort()).toEqual(['S2', 'S8']);
    expect(s.modifiers[0].equipment).toEqual({ label: 'A enceradeira', position: PONTOS.fundo });
    // Estacionada a partir de S2, a própria S2 não recebe: só a da frente.
    const deS2 = chooseAction(em(createInitialState(), 'S2', 'enceradeira-disponivel'), 'estacionar-fundo');
    expect(deS2.modifiers[0].targets).toEqual(['S8']);
  });

  it('pôr cavaletes na escada fecha S1 e S7 por um tempo', () => {
    const s = chooseAction(em(createInitialState(), 'ESC', 'fluxo-de-alunos'), 'cavaletes');
    expect(isSelectable(s, 'S1')).toBe(false);
    expect(isSelectable(s, 'S7')).toBe(false);
    expect(isSelectable(s, 'S2')).toBe(true);
  });

  it('esperar o intervalo cobra só até o próximo sinal, que acontece a cada 20 min', () => {
    const chegou = em(createInitialState(), 'ESC', 'fluxo-de-alunos');
    const agora = currentTotal(chegou);
    const s = chooseAction(chegou, 'esperar-intervalo');
    const espera = (20 - (agora % 20)) % 20;
    expect(s.eventMinutes - chegou.eventMinutes).toBeCloseTo(espera, 1);
  });
});

describe('sorteio só oferece situação com saída', () => {
  it('a enceradeira não aparece se nenhuma das três ações é possível naquele estado', () => {
    // S2 e S8 já feitas (não dá para estacionar), e só 1 carga (não dá para usar nem entregar).
    let s = createInitialState();
    s = {
      ...s,
      charges: 1,
      rooms: {
        ...s.rooms,
        S2: { ...s.rooms.S2, status: 'concluida' },
        S8: { ...s.rooms.S8, status: 'concluida' },
      },
    };
    const enceradeira = situationsById['enceradeira-disponivel'];
    expect(isEligible(enceradeira, s, roomsById.S3, s.rooms.S3, 0)).toBe(false);
  });
});

describe('informação', () => {
  it('perguntar aos alunos revela e fixa a situação das 2 salas mais próximas', () => {
    let s = chooseAction(em(createInitialState(), 'S3', 'turma-ajuda'), 'perguntar');
    const reveladas = Object.entries(s.rooms).filter(([, rs]) => rs.previewSituationId);
    expect(reveladas).toHaveLength(2);
    const [id, rs] = reveladas[0];
    expect(Math.abs(roomsById[id].corridorPosition - roomsById.S3.corridorPosition)).toBeLessThanOrEqual(7);
    s = confirmTravel(selectRoom(s, id));
    expect(s.situation?.situationId).toBe(rs.previewSituationId);
  });
});

describe('recursos no mapa', () => {
  it('material deixado no meio do corredor é recolhido por quem passa', () => {
    let s = createInitialState();
    s = chooseAction(em(s, 'WC-A', 'carrinho-da-manutencao'), 'levar-meio');
    expect(s.stashes).toEqual([expect.objectContaining({ position: PONTOS.meio, charges: 4 })]);
    s = { ...s, charges: 3 };
    s = limpar(s, 'S3'); // do banheiro até a S3: passa pela S4/S10, onde está a caixa
    expect(s.stashes).toHaveLength(0);
    expect(s.charges).toBe(3 + 4 - 1);
    expect(s.log.some((entry) => entry.title.includes('material recolhido'))).toBe(true);
  });

  it('com o carrinho quase cheio, pega o que cabe e o resto continua lá', () => {
    let s = chooseAction(em(createInitialState(), 'WC-A', 'carrinho-da-manutencao'), 'levar-meio');
    s = limpar(s, 'S3'); // carrinho com 8: cabem 2 dos 4
    expect(s.stashes).toEqual([expect.objectContaining({ position: PONTOS.meio, charges: 2 })]);
  });

  it('o que não cabe no carrinho fica no corredor, onde você está', () => {
    const s = chooseAction(em(createInitialState(), 'S3', 'entrega-de-material'), 'parar-estocar');
    // Carrinho: 10 − 1 + 6 → cabe só 1; sobram 5 em S3/S9.
    expect(s.charges).toBe(gameConfig.maxCharges);
    expect(s.stashes).toEqual([expect.objectContaining({ position: roomsById.S3.corridorPosition, charges: 5 })]);
  });

  it('ir ao depósito não recolhe estoque no caminho: a recarga encheria de qualquer jeito', () => {
    const estoque = { id: 'teste', label: 'Teste', position: PONTOS.meio, charges: 4 };
    let s: GameState = { ...createInitialState(), currentPosition: 65, charges: 2, stashes: [estoque] };
    s = confirmTravel(selectRoom(s, 'DEP-A')); // de 65 m a 8 m, passando pela caixa
    expect(s.charges).toBe(gameConfig.maxCharges);
    expect(s.stashes).toEqual([estoque]);
  });

  it('o rádio busca no estoque do corredor quando ele está mais perto que o depósito', () => {
    // Uma decisão anterior deixou 5 cargas no fundo (S2/S8).
    let s = chooseAction(em(createInitialState(), 'S5', 'entrega-de-material'), 'deixar-fundo');
    s = { ...s, charges: 2 };
    const chegou = em(s, 'S1', 'material-acabando'); // passa pelo fundo e recolhe 5
    const antes = { ...chegou, charges: 1, stashes: [{ id: 'fundo', label: 'Caixas da entrega', position: PONTOS.fundo, charges: 5 }] };
    const depois = chooseAction(antes, 'radio');
    // Da S1 até o estoque no fundo, + 1 min de chamada, em vez de ir até o depósito.
    const espera = (roomsById.S1.corridorPosition - PONTOS.fundo) / gameConfig.metersPerMinute + 1;
    expect(depois.eventMinutes - antes.eventMinutes).toBeCloseTo(espera, 1);
    expect(depois.stashes).toEqual([expect.objectContaining({ charges: 1 })]);
  });

  it('entregar a enceradeira a um colega: ele assume a sala mais distante do depósito', () => {
    const s = chooseAction(em(createInitialState(), 'S5', 'enceradeira-disponivel'), 'entregar-colega');
    const delegadas = Object.entries(s.rooms).filter(([, rs]) => rs.delegatedUntil);
    expect(delegadas).toHaveLength(1);
    expect(['S1', 'S7']).toContain(delegadas[0][0]);
  });

  it('a sala delegada fica fechada e é concluída sozinha quando o relógio chega', () => {
    let s = chooseAction(em(createInitialState(), 'S5', 'sala-suja'), 'equipe-noite');
    expect(s.rooms.S5.status).toBe('nao-iniciada');
    expect(isSelectable(s, 'S5')).toBe(false);
    const pronta = s.rooms.S5.delegatedUntil!;

    s = limpar(s, 'S11');
    expect(currentTotal(s)).toBeLessThan(pronta);
    expect(s.rooms.S5.status).not.toBe('concluida');

    for (const id of ['S4', 'S10', 'S3', 'S9', 'S2', 'S8']) s = limpar(s, id);
    expect(currentTotal(s)).toBeGreaterThanOrEqual(pronta);
    expect(s.rooms.S5.status).toBe('concluida');
    expect(s.log.some((entry) => entry.title.includes('concluída por um colega'))).toBe(true);
  });

  it('se só sobra a sala delegada, o jogador espera no corredor até ela ficar pronta', () => {
    let s = createInitialState();
    const rooms = { ...s.rooms };
    for (const id of Object.keys(rooms)) {
      if (roomsById[id].cleanable && id !== 'WC-A' && id !== 'WC-B') {
        rooms[id] = { ...rooms[id], status: 'concluida' };
      }
    }
    s = { ...s, rooms };
    s = chooseAction(em(s, 'WC-A', 'carrinho-da-manutencao'), 'outro-banheiro');
    expect(s.rooms['WC-B'].delegatedUntil).not.toBeNull();
    expect(mustWait(s)).toBe(true);
    s = waitInCorridor(s);
    expect(s.rooms['WC-B'].status).toBe('concluida');
  });
});

describe('modo de playtest', () => {
  it('?playtest=fase1 sorteia só as 8 situações do protótipo', () => {
    definirModoPlaytest('fase1', prototipoFase1);
    try {
      let s = createInitialState();
      const vistas = new Set<string>();
      for (const id of ['S6', 'S12', 'S5', 'S11', 'WC-A', 'S4', 'S10', 'ESC', 'S3', 'S9']) {
        s = confirmTravel(selectRoom(s, id));
        if (s.situation) {
          vistas.add(s.situation.situationId);
          s = { ...s, phase: 'mapa', situation: null };
        }
      }
      expect([...vistas].every((id) => prototipoFase1.includes(id))).toBe(true);
    } finally {
      definirModoPlaytest(null, null);
    }
  });
});
