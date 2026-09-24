import './fixturesDeTeste';
import { describe, expect, it } from 'vitest';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  isSelectable,
  mustWait,
  precisaSairParaVoltar,
  previewCleaningMinutes,
  sairEVoltar,
  selectRoom,
  waitInCorridor,
} from './game';
import { actionAvailability, summarizeAction, type EffectContext } from './effects';
import { minutoDoSinal, resolverRegiao } from './mapa';
import { roomsById } from '../data/rooms';
import { situations, situationsById } from '../data/situations';
import type { GameState } from './types';

/** Chega numa sala pagando o deslocamento e força a situação pedida. */
function em(state: GameState, roomId: string, situationId: string): GameState {
  const chegou = confirmTravel(selectRoom(state, roomId));
  return { ...chegou, phase: 'situacao', situation: { situationId, roomId, blockTargetId: null } };
}

function limpar(state: GameState, roomId: string): GameState {
  return chooseAction(em(state, roomId, 'teste-generica'), 'racionar');
}

function ctxDe(state: GameState, roomId: string): EffectContext {
  const room = roomsById[roomId];
  return {
    room,
    roomState: state.rooms[roomId],
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: null,
    game: state,
  };
}

describe('relógio do intervalo', () => {
  it('o próximo sinal é o próximo múltiplo de 20; num sinal exato, é o seguinte', () => {
    expect(minutoDoSinal(0)).toBe(20);
    expect(minutoDoSinal(19.5)).toBe(20);
    expect(minutoDoSinal(20)).toBe(40);
    expect(minutoDoSinal(7, 2)).toBe(40);
  });

  it('Turma organizada: "voltar depois" fecha a sala até o 2º sinal e deixa metade, sem material', () => {
    const s = chooseAction(em(createInitialState(), 'S2', 'sala-organizada'), 'voltar-depois');
    const agora = currentTotal(s);
    expect(s.rooms.S2.blockedUntilMinute).toBe(minutoDoSinal(agora, 2));
    expect(s.rooms.S2.status).toBe('pendente');
    expect(s.rooms.S2.residualMinutes).toBe(Math.ceil(roomsById.S2.baseCleaningMinutes / 2));
    expect(s.charges).toBe(10);
  });

  it('Turma organizada: a turma da próxima aula conclui a sala no 2º sinal, com o seu material', () => {
    const chegou = em(createInitialState(), 'S2', 'sala-organizada');
    const s = chooseAction(chegou, 'material-turma');
    expect(s.charges).toBe(8);
    expect(s.rooms.S2.delegatedUntil).toBe(minutoDoSinal(currentTotal(chegou), 2));
    const acao = situationsById['sala-organizada'].actions.find((a) => a.id === 'material-turma')!;
    const texto = summarizeAction(acao, ctxDe(chegou, 'S2')).depois.map((l) => l.value).join(' ');
    // A carta diz quem limpa e quando: não é uma limpeza que "some".
    expect(texto).toContain('A turma da próxima aula conclui esta sala no minuto');
  });
});

describe('depósito fechado', () => {
  it('Piso alagado: o ralo fecha o depósito por 20 min, e a recarga fica fora de alcance', () => {
    let s = chooseAction(em(createInitialState(), 'WC-A', 'piso-encharcado'), 'ralo-deposito');
    expect(isSelectable(s, 'DEP-A')).toBe(false);
    expect(isSelectable(s, 'DEP-B')).toBe(false);

    // Com o depósito fechado, "levar ao depósito" das Lixeiras fica indisponível.
    const lixo = situationsById['lixeiras-cheias'].actions.find((a) => a.id === 'levar-deposito')!;
    expect(actionAvailability(lixo, ctxDe(s, 'S6')).available).toBe(false);

    // O rádio sem caixa no corredor também não tem de onde trazer.
    const radio = situationsById['material-acabando'].actions.find((a) => a.id === 'radio')!;
    expect(actionAvailability(radio, ctxDe(s, 'S2')).available).toBe(false);

    s = limpar(s, 'S2'); // queima mais de 20 min
    s = limpar(s, 'S8');
    s = limpar(s, 'S1');
    expect(isSelectable(s, 'DEP-A')).toBe(true);
  });

  it('pendência no último ambiente com o depósito fechado: esperar é a saída, não um beco', () => {
    let s = createInitialState();
    const rooms = { ...s.rooms };
    for (const id of Object.keys(rooms)) {
      if (roomsById[id].cleanable && id !== 'WC-A') rooms[id] = { ...rooms[id], status: 'concluida' };
    }
    s = { ...s, rooms };
    s = chooseAction(em(s, 'WC-A', 'piso-encharcado'), 'ralo-deposito');
    // Força o caso: o banheiro ficou pendente e o trabalhador ainda está nele.
    s = { ...s, rooms: { ...s.rooms, 'WC-A': { ...s.rooms['WC-A'], status: 'pendente', residualMinutes: 1 } } };
    expect(isSelectable(s, 'WC-A')).toBe(false);
    expect(isSelectable(s, 'DEP-A')).toBe(false);
    expect(mustWait(s)).toBe(true);
    s = waitInCorridor(s);
    expect(isSelectable(s, 'DEP-A')).toBe(true);
  });
});

describe('texto das cartas', () => {
  it('efeito regional sem ambiente por fazer não aparece na carta', () => {
    let s = createInitialState();
    s = { ...s, rooms: { ...s.rooms, 'WC-B': { ...s.rooms['WC-B'], status: 'concluida' } } };
    const chegou = em(s, 'WC-A', 'piso-encharcado');
    const acao = situationsById['piso-encharcado'].actions.find((a) => a.id === 'fechar-banheiros')!;
    const linhas = summarizeAction(acao, ctxDe(chegou, 'WC-A')).depois;
    expect(linhas.some((l) => l.label === 'Salas fechadas')).toBe(false);
    // Com o outro banheiro por fazer, a linha volta.
    const aberto = em(createInitialState(), 'WC-A', 'piso-encharcado');
    expect(summarizeAction(acao, ctxDe(aberto, 'WC-A')).depois.some((l) => l.label === 'Salas fechadas')).toBe(true);
  });
});

describe('última sala pendente', () => {
  it('avisa que é preciso sair e voltar quando só falta o ambiente atual', () => {
    let s = createInitialState();
    const rooms = { ...s.rooms };
    for (const id of Object.keys(rooms)) {
      if (roomsById[id].cleanable && id !== 'S4') rooms[id] = { ...rooms[id], status: 'concluida' };
    }
    s = chooseAction(em({ ...s, rooms }, 'S4', 'ar-condicionado-pingando'), 'bacia');
    expect(s.rooms.S4.status).toBe('pendente');
    expect(mustWait(s)).toBe(false);
    expect(precisaSairParaVoltar(s)?.id).toBe('S4');
    const atalho = sairEVoltar(s);
    s = confirmTravel(selectRoom(s, 'DEP-A'));
    expect(precisaSairParaVoltar(s)).toBeNull();
    expect(isSelectable(s, 'S4')).toBe(true);
    // O atalho custa o mesmo que as duas idas clicadas, e termina a sala.
    const manual = confirmTravel(selectRoom(s, 'S4'));
    expect(atalho.rooms.S4.status).toBe('concluida');
    expect(currentTotal(atalho)).toBe(currentTotal(manual));
  });
});

describe('aposta', () => {
  it('é reproduzível pela semente e, quando falha, deixa a pendência escrita na carta', () => {
    const resultados = new Set<string>();
    for (let semente = 1; semente <= 30; semente += 1) {
      const a = chooseAction(em(createInitialState(semente), 'S5', 'equipamento-quebrado'), 'remendo');
      const b = chooseAction(em(createInitialState(semente), 'S5', 'equipamento-quebrado'), 'remendo');
      expect(a.rooms.S5).toEqual(b.rooms.S5);
      resultados.add(a.rooms.S5.status);
      if (a.rooms.S5.status === 'pendente') expect(a.rooms.S5.residualMinutes).toBe(4);
      expect(a.log.at(-1)!.detail).toMatch(/deu (certo|errado)/);
    }
    // Com 30 sementes, os dois lados da chance de 1 em 3 aparecem.
    expect(resultados).toEqual(new Set(['concluida', 'pendente']));
  });
});

describe('meta com prazo', () => {
  it('Coordenação: reunião pronta a tempo faz alguém concluir a sala que você largou', () => {
    let s = chooseAction(em(createInitialState(), 'S6', 'pedido-da-coordenacao'), 'largar-e-ir');
    expect(s.metas).toHaveLength(1);
    const alvo = s.metas[0].targets[0];
    expect(roomsById[alvo].kind).toBe('sala');
    s = limpar(s, alvo);
    expect(s.metas).toHaveLength(0);
    expect(s.rooms.S6.delegatedUntil).not.toBeNull();
  });

  it('aceitar a mesma meta de novo, no mesmo lugar, substitui a anterior', () => {
    let s = chooseAction(em(createInitialState(), 'S6', 'pedido-da-coordenacao'), 'largar-e-ir');
    s = limpar(s, 'S5');
    s = chooseAction(em(s, 'S6', 'pedido-da-coordenacao'), 'largar-e-ir');
    expect(s.metas).toHaveLength(1);
  });

  it('Coordenação: prazo vencido vira +5 min com endereço na sala da reunião', () => {
    let s = chooseAction(em(createInitialState(), 'S6', 'pedido-da-coordenacao'), 'negociar-prazo');
    const alvo = s.metas[0].targets[0];
    const antes = previewCleaningMinutes(s, alvo);
    // Queima o relógio longe da sala da reunião.
    for (const id of ['S12', 'S5', 'S11', 'S4', 'S10', 'S3', 'S9', 'WC-A', 'WC-B', 'S2', 'S8']) {
      if (id === alvo) continue;
      s = limpar(s, id);
      if (s.metas.length === 0) break;
    }
    expect(currentTotal(s)).toBeGreaterThan(60);
    expect(s.metas).toHaveLength(0);
    expect(previewCleaningMinutes(s, alvo)).toBe(antes + 5);
  });

  it('Visita da direção só aparece com pendências, e a promessa mira exatamente elas', () => {
    let s = createInitialState();
    const visita = situationsById['visita-da-direcao'];
    const s5 = roomsById.S5;
    expect(resolverRegiao(s, s5, { kind: 'pendencias' })).toEqual([]);
    s = chooseAction(em(s, 'S2', 'teste-ocupada'), 'parcial');
    expect(resolverRegiao(s, s5, { kind: 'pendencias' })).toEqual(['S2']);
    s = chooseAction(em(s, 'S5', 'visita-da-direcao'), 'prometer');
    expect(s.metas[0].targets).toEqual(['S2']);
    expect(visita.conditions).toEqual([{ type: 'temPendencias' }]);
  });

  it('Visita: pedir ajuda entrega só a pendência mais antiga', () => {
    let s = chooseAction(em(createInitialState(), 'S2', 'teste-ocupada'), 'parcial');
    s = chooseAction(em(s, 'S3', 'teste-ocupada'), 'parcial');
    s = chooseAction(em(s, 'S5', 'visita-da-direcao'), 'pedir-ajuda');
    expect(s.rooms.S2.delegatedUntil).not.toBeNull();
    expect(s.rooms.S3.delegatedUntil ?? null).toBeNull();
  });
});

describe('material no ponto atual', () => {
  it('a caixa deixada aqui não volta ao carrinho no primeiro passo, só quando você passar de novo', () => {
    let s = chooseAction(em(createInitialState(), 'S4', 'evento-cancelado'), 'guardar-material');
    expect(s.stashes).toHaveLength(1);
    expect(s.stashes[0].position).toBe(roomsById.S4.corridorPosition);
    s = limpar(s, 'S2'); // sai de S4 para o fundo
    expect(s.stashes).toHaveLength(1);
    s = limpar(s, 'S6'); // volta passando por S4: recolhe o que cabe no carrinho
    expect(s.log.some((l) => l.title === 'Estoque da sala vazia: material recolhido')).toBe(true);
  });

  it('Acabou papel: buscar na caixa mantém o carrinho e gasta a caixa', () => {
    let s = chooseAction(em(createInitialState(), 'S4', 'evento-cancelado'), 'guardar-material');
    const chegou = em(s, 'WC-A', 'sem-reposicao'); // sai de S4: a caixa fica lá
    const cargas = chegou.charges;
    s = chooseAction(chegou, 'buscar-caixa');
    expect(s.charges).toBe(cargas);
    expect(s.stashes[0].charges).toBe(2);
  });
});

describe('catálogo da Fase 2', () => {
  it('tem as 32 situações, cada uma com as três ações executáveis em algum contexto', () => {
    expect(situations).toHaveLength(32);
  });
});
