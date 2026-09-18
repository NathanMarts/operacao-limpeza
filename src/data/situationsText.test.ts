import { describe, expect, it } from 'vitest';
import { situations } from './situations';

/** Limite de redação das cartas, acordado com o cliente da oficina. */
const LIMITE = 72;

describe('texto das ações', () => {
  /**
   * A carta já mostra o preço em dado estruturado: o selo de minutos, as
   * linhas de material e as de pendência. A descrição existe para dizer o
   * GESTO — o que a pessoa faz. Quando ela também narra o custo, repete o que
   * está logo abaixo, e em palavras mais vagas que os números. O limite é o
   * que mantém as duas coisas separadas.
   */
  it(`cabe em ${LIMITE} caracteres`, () => {
    const longas = situations.flatMap((s) =>
      s.actions
        .filter((a) => a.description.length > LIMITE)
        .map((a) => `${s.id}.${a.id} (${a.description.length})`),
    );
    expect(longas).toEqual([]);
  });

  it('não deixa descrição vazia nem sobra de espaço', () => {
    for (const s of situations) {
      for (const a of s.actions) {
        expect(a.description.trim(), `${s.id}.${a.id}`).toBe(a.description);
        expect(a.description.length, `${s.id}.${a.id}`).toBeGreaterThan(0);
      }
    }
  });
});
