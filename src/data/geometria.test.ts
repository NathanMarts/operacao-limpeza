import { describe, expect, it } from 'vitest';
import { buildingSpanMeters, desenhoDaPorta, objectives, rooms } from './rooms';
import { gameConfig } from './gameConfig';

describe('geometria da planta', () => {
  it('a porta de cada sala fica dentro do corpo da sala', () => {
    for (const room of rooms) {
      const inicio = room.spanStartMeters;
      const fim = room.spanStartMeters + room.spanWidthMeters;
      // A porta é comparada na régua do DESENHO, não na distância até a entrada.
      const porta = desenhoDaPorta(room);
      expect(porta, `${room.id} tem a porta fora da sala`).toBeGreaterThanOrEqual(inicio);
      expect(porta, `${room.id} tem a porta fora da sala`).toBeLessThanOrEqual(fim);
    }
  });

  it('salas do mesmo lado não se sobrepõem', () => {
    for (const side of ['top', 'bottom'] as const) {
      const ordenadas = rooms
        .filter((room) => room.side === side)
        .sort((a, b) => a.spanStartMeters - b.spanStartMeters);

      for (let i = 1; i < ordenadas.length; i += 1) {
        const anterior = ordenadas[i - 1];
        const atual = ordenadas[i];
        const fimAnterior = anterior.spanStartMeters + anterior.spanWidthMeters;
        expect(atual.spanStartMeters, `${anterior.id} invade ${atual.id}`).toBeGreaterThanOrEqual(
          fimAnterior,
        );
      }
    }
  });

  it('a ala esquerda tem a saliência da planta e o resto é raso', () => {
    for (const id of ['S1', 'S2', 'S7', 'S8']) {
      expect(rooms.find((room) => room.id === id)!.depth).toBeGreaterThan(1);
    }
    for (const id of ['S3', 'S5', 'S6', 'WC-A']) {
      expect(rooms.find((room) => room.id === id)!.depth).toBeLessThanOrEqual(1);
    }
  });

  it('a organização espacial da planta é preservada', () => {
    const topo = rooms.filter((room) => room.side === 'top');
    const base = rooms.filter((room) => room.side === 'bottom');
    // 6 salas + 1 WC por ala; a caixa de escada é única e entra na contagem do topo.
    expect(topo.filter((room) => room.cleanable && room.kind !== 'escada')).toHaveLength(7);
    expect(base.filter((room) => room.cleanable)).toHaveLength(7);
    expect(rooms.filter((room) => room.kind === 'escada')).toHaveLength(1);

    // O turno começa a leste: os banheiros são o objetivo mais perto da entrada,
    // e o depósito vem logo depois deles.
    const maisPerto = Math.min(...objectives.map((room) => room.corridorPosition));
    expect(objectives.filter((room) => room.corridorPosition === maisPerto).every((room) => room.kind === 'wc')).toBe(true);

    const deposito = rooms.find((room) => room.kind === 'deposito')!;
    const banheiro = rooms.find((room) => room.kind === 'wc')!;
    expect(deposito.corridorPosition).toBeGreaterThan(banheiro.corridorPosition);
    expect(deposito.corridorPosition).toBeLessThan(
      Math.min(...rooms.filter((room) => room.kind === 'sala').map((room) => room.corridorPosition)),
    );
  });

  it('cada posição do corredor é compartilhada por exatamente duas salas opostas', () => {
    const porPosicao = new Map<number, string[]>();
    // A caixa de escada atravessa o corredor e não tem par do lado oposto.
    for (const room of rooms.filter((candidate) => !candidate.straddlesCorridor)) {
      porPosicao.set(room.corridorPosition, [...(porPosicao.get(room.corridorPosition) ?? []), room.id]);
    }
    for (const [posicao, ids] of porPosicao) {
      expect(ids, `posição ${posicao} tem ${ids.length} ambientes`).toHaveLength(2);
    }
  });

  it('a referência espacial mínima bate com a extensão real do corredor', () => {
    const maisLonge = Math.max(...objectives.map((room) => room.corridorPosition));
    expect(gameConfig.minimumSweepMeters).toBe(maisLonge);
    expect(buildingSpanMeters).toBeGreaterThan(maisLonge);
  });
});
