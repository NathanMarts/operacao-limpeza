/**
 * Ferramenta de inspeção: rasteriza o mapa SVG num PNG para conferência visual
 * fora do navegador. Não faz parte do jogo — é o "olhar no espelho" do desenho.
 *
 *   pnpm exec vite-node scripts/preview-map.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import { BuildingMap } from '../src/components/BuildingMap';
import {
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  previewCleaningMinutes,
  minutesUntilFree,
  selectRoom,
} from '../src/domain/game';
import type { GameState } from '../src/domain/types';

/* As classes Tailwind não existem fora do navegador: traduz para atributos SVG. */
const CLASS_TO_ATTRS: [RegExp, string][] = [
  [/text-\[(\d+(?:\.\d+)?)px\]/, 'font-size="$1"'],
];

function inlineStyles(svg: string): string {
  return svg.replace(/class="([^"]*)"/g, (_match, classes: string) => {
    const attrs: string[] = [];
    const mono = classes.includes('data');
    attrs.push(`font-family="${mono ? 'IBM Plex Mono, monospace' : 'Space Grotesk, sans-serif'}"`);
    if (classes.includes('font-semibold')) attrs.push('font-weight="600"');
    if (classes.includes('font-bold')) attrs.push('font-weight="700"');
    for (const [pattern, replacement] of CLASS_TO_ATTRS) {
      const found = classes.match(pattern);
      if (found) attrs.push(replacement.replace('$1', found[1]));
    }
    return attrs.join(' ');
  });
}

function render(state: GameState, name: string) {
  const markup = renderToStaticMarkup(
    createElement(BuildingMap, {
      state,
      totalMinutes: currentTotal(state),
      showRoute: true,
      cleaningMinutesFor: (roomId: string) => previewCleaningMinutes(state, roomId),
      minutesUntilFree: (roomId: string) => minutesUntilFree(state, roomId),
      onSelect: () => {},
    }),
  );

  const svg = inlineStyles(markup).replace(
    '<svg ',
    '<svg xmlns="http://www.w3.org/2000/svg" ',
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1400 }, background: '#e6ecf3' }).render().asPng();
  mkdirSync('preview', { recursive: true });
  writeFileSync(`preview/${name}.png`, png);
  console.log(`preview/${name}.png`);
}

/* Cenário 1: partida limpa, nada acontecido ainda. */
render(createInitialState(), 'mapa-inicial');

/* Cenário 2: meio de jogo com concluídas, pendência, bloqueio, idas e voltas. */
let state = createInitialState();
const roteiro: [string, string][] = [
  ['S1', 'completa'],
  ['S7', 'rapida'],
  ['WC-A', 'completa'],
  ['S3', 'seguir'],
  ['S11', 'completa'],
];
for (const [roomId, actionId] of roteiro) {
  state = confirmTravel(selectRoom(state, roomId));
  if (state.phase === 'situacao' && state.situation) {
    const escolhida =
      state.situation.situationId === 'sala-suja'
        ? actionId === 'seguir'
          ? 'adiar'
          : actionId
        : state.situation.situationId === 'sala-em-uso'
          ? actionId === 'completa'
            ? 'priorizar'
            : actionId === 'rapida'
              ? 'parcial'
              : 'seguir'
          : state.situation.situationId === 'equipamento-quebrado'
            ? actionId === 'completa'
              ? 'improvisar'
              : 'meia-limpeza'
            : state.situation.situationId === 'lixeiras-cheias'
              ? actionId === 'rapida'
                ? 'deixar'
                : 'acumular'
              : state.situation.situationId === 'sala-trancada'
                ? actionId === 'seguir'
                  ? 'pular'
                  : 'sala-vizinha'
                : 'economizar';
    state = chooseAction(state, escolhida);
  }
}

/* Cenário 3: com destino selecionado, para ver a cota dimensional. */
render(state, 'mapa-meio-jogo');
render(selectRoom(state, 'S6'), 'mapa-com-cota');
