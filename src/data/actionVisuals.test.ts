import { describe, expect, it } from 'vitest';
import { situations } from './situations';
import { ESTRATEGIA_ETIQUETA, ESTRATEGIAS_POR_SITUACAO, estrategiaDaAcao } from './actionVisuals';

/**
 * A gramática visual é curada à mão, então ela pode sair de sincronia com o
 * catálogo sem que nada quebre em tela — a carta só cairia no acento padrão.
 * Estes testes são o lugar que cobra a tabela.
 */
describe('gramática visual das cartas', () => {
  it('cobre toda ação do catálogo', () => {
    const semEstrategia = situations.flatMap((s) =>
      s.actions
        .filter((a) => ESTRATEGIAS_POR_SITUACAO[s.id]?.[a.id] === undefined)
        .map((a) => `${s.id}.${a.id}`),
    );
    expect(semEstrategia).toEqual([]);
  });

  it('não tem entrada órfã, que denunciaria id digitado errado', () => {
    const reais = new Set(situations.flatMap((s) => s.actions.map((a) => `${s.id}.${a.id}`)));
    const orfas = Object.entries(ESTRATEGIAS_POR_SITUACAO).flatMap(([sid, acoes]) =>
      Object.keys(acoes)
        .map((aid) => `${sid}.${aid}`)
        .filter((chave) => !reais.has(chave)),
    );
    expect(orfas).toEqual([]);
  });

  it('dá estratégias distintas às três ações de cada situação', () => {
    /* Duas cartas da mesma cor lado a lado apagariam justamente a distinção
       que a cor existe para mostrar. */
    const repetidas = situations
      .map((s) => ({
        id: s.id,
        cores: s.actions.map((a) => estrategiaDaAcao(s.id, a.id)),
      }))
      .filter(({ cores }) => new Set(cores).size !== cores.length);
    expect(repetidas).toEqual([]);
  });

  it('dá etiqueta a toda estratégia usada, para a tarja ter texto', () => {
    const usadas = new Set(Object.values(ESTRATEGIAS_POR_SITUACAO).flatMap((a) => Object.values(a)));
    for (const e of usadas) expect(ESTRATEGIA_ETIQUETA[e]).toBeTruthy();
  });
});
