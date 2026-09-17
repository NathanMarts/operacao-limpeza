import { useMemo } from 'react';
import {
  ENTRADA_DESENHO_M,
  ENTRANCE_POSITION,
  buildingSpanMeters,
  buildingStartMeters,
  desenhoDaPorta,
  rooms,
  roomsById,
} from '../data/rooms';
import type { GameState } from '../domain/types';
import { formatMeters } from '../domain/effects';
import { PlayerPin } from './PlayerPin';
import { Room, type RoomGeometry, type RoomVisualState } from './Room';

/* Escala do desenho: metros → pixels. Mexer nos dados move o mapa junto. */
const PX_PER_METER = 11;
const MARGIN_X = 24;
const MARGIN_Y = 20;
const CORRIDOR_HEIGHT = 52;
/** Altura em pixels de um ambiente de profundidade 1 nos dados. */
const ROOM_DEPTH = 120;

/* A borda oeste do papel é a do ambiente mais a oeste — hoje a escada. Vem dos
   dados para que mudar as medidas dela não exija tocar em nada aqui. */
const toX = (meters: number) => MARGIN_X + (meters - buildingStartMeters) * PX_PER_METER;

/** Onde uma distância-até-a-entrada cai no desenho. Cresce para a esquerda. */
const xDaPosicao = (posicao: number) => toX(ENTRADA_DESENHO_M - posicao);

/* Faixas dentro do corredor, medidas a partir do eixo. A régua corre abaixo
   do eixo; subir ou descer os dois números move rótulo e linha juntos, e com
   eles o trajeto e o pino, que se penduram na mesma cota. */
const COTA_DESCIDA = 6;
const COTA_TEXT_Y = -1 + COTA_DESCIDA;
const COTA_LINE_Y = 6 + COTA_DESCIDA;
/* O trajeto corre SOBRE a régua do corredor: a linha azul cobre os trechos
   cinzas que você de fato caminhou, e os círculos cobrem os marcos. */
const TRAIL_Y = COTA_LINE_Y;
const TRAIL_DOT_R = 7.5;

/* O corredor nasce logo dentro da parede oeste e morre na entrada, a leste. */
const CORRIDOR_X1 = toX(buildingStartMeters) + 8;
const CORRIDOR_X2 = toX(buildingSpanMeters) - 8;

/** Quanto o desenho avança acima/abaixo do eixo do corredor, em pixels.
 *  Um ambiente que atravessa o corredor fica centrado; os demais partem da
 *  borda da faixa. O papel se ajusta sozinho ao maior deles. */
const avanco = (lado: 'top' | 'bottom') =>
  Math.max(
    CORRIDOR_HEIGHT / 2,
    ...rooms.map((room) => {
      const altura = ROOM_DEPTH * room.depth;
      if (room.straddlesCorridor) return altura / 2;
      return room.side === lado ? CORRIDOR_HEIGHT / 2 + altura : 0;
    }),
  );

const WIDTH = toX(buildingSpanMeters) + MARGIN_X;
const CENTER_Y = MARGIN_Y + avanco('top');
const HEIGHT = CENTER_Y + avanco('bottom') + MARGIN_Y;

/** Cor do trecho por natureza da parada — retorno e recarga se destacam. */
const COR_DO_TRECHO = {
  limpeza: '#4f7df3',
  retorno: '#f0b429',
  deposito: '#34d399',
} as const;

type Leg = {
  order: number;
  x1: number;
  x2: number;
  meters: number;
  purpose: keyof typeof COR_DO_TRECHO;
};

/**
 * Par de pegadas do tileset: sola arredondada e salto separado, os dois pés
 * escalonados. Desenhadas apontando para cima e giradas para o sentido da
 * caminhada, no lugar da seta que havia aqui.
 */
/** Um trecho do corredor, desenhado sobre a régua: origem vazada, seta de
 *  sentido, destino numerado no lugar do marco e a distância na pílula. */
function TrailLeg({ leg, y }: { leg: Leg; y: number }) {
  const cor = COR_DO_TRECHO[leg.purpose];
  const meio = (leg.x1 + leg.x2) / 2;
  const sentido = Math.sign(leg.x2 - leg.x1) || 1;
  const parado = leg.meters === 0;
  /* Seta na metade do trecho; pílula logo à frente dela, no sentido da caminhada. */
  const pilulaX = meio + 24 * sentido;

  return (
    <g pointerEvents="none">
      {!parado && (
        <>
          <line x1={leg.x1} x2={leg.x2} y1={y} y2={y} stroke={cor} strokeWidth={3} strokeLinecap="round" />
          <circle cx={leg.x1} cy={y} r={4.5} fill="#d5d4d4" stroke={cor} strokeWidth={2.5} />
          <path
            d={`M ${meio - 9 * sentido} ${y - 5} L ${meio} ${y} L ${meio - 9 * sentido} ${y + 5} Z`}
            fill={cor}
          />
          <rect
            x={pilulaX - 18}
            y={y - 7}
            width={36}
            height={14}
            rx={7}
            fill="#101a2b"
            stroke={cor}
            strokeWidth={1}
          />
          <text
            x={pilulaX}
            y={y + 3.5}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="9"
            fontWeight="600"
            fill={cor}
          >
            {formatMeters(leg.meters)} m
          </text>
        </>
      )}
      <circle cx={leg.x2} cy={y} r={TRAIL_DOT_R} fill={cor} stroke="#d5d4d4" strokeWidth={1.5} />
      <text
        x={leg.x2}
        y={y + 3}
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="9"
        fontWeight="700"
        fill="#ffffff"
      >
      {leg.order}
      </text>
    </g>
  );
}

function geometryFor(room: (typeof rooms)[number]): RoomGeometry {
  const x = toX(room.spanStartMeters);
  const width = room.spanWidthMeters * PX_PER_METER;
  const height = ROOM_DEPTH * room.depth;
  const doorX = toX(desenhoDaPorta(room));

  /* A caixa de escada não fica de um lado do corredor: ela o atravessa. */
  if (room.straddlesCorridor) {
    return { x, y: CENTER_Y - height / 2, width, height, doorX };
  }

  const y =
    room.side === 'top' ? CENTER_Y - CORRIDOR_HEIGHT / 2 - height : CENTER_Y + CORRIDOR_HEIGHT / 2;
  return { x, y, width, height, doorX };
}

/** Profundidade tomada por um ambiente aninhado dentro de cada envelope. */
const FAIXA_ANINHADA: Record<string, number> = rooms.reduce((mapa, room) => {
  if (room.nestedIn) mapa[room.nestedIn] = Math.max(mapa[room.nestedIn] ?? 0, room.depth);
  return mapa;
}, {} as Record<string, number>);

function visualStateOf(state: GameState, roomId: string, totalNow: number): RoomVisualState {
  const room = roomsById[roomId];
  if (state.pendingTargetId === roomId || state.situation?.roomId === roomId) return 'destino';
  if (room.kind === 'deposito' || room.kind === 'entrada') return 'apoio';

  const roomState = state.rooms[roomId];
  if (roomState.status === 'concluida') return 'concluida';
  if (roomState.blockedUntilMinute !== null && roomState.blockedUntilMinute > totalNow) {
    return 'bloqueada';
  }
  if (roomState.status === 'pendente') return 'pendente';
  return 'disponivel';
}

/** Trechos entre portas consecutivas, rotulados no corredor como no mockup. */
const SEGMENTOS = (() => {
  /* A origem entra no conjunto e tudo é ordenado junto: prender o zero na
     frente quebrava a régua assim que a entrada deixou de estar em 0. */
  const todas = [
    ...new Set([ENTRANCE_POSITION, ...rooms.map((room) => room.corridorPosition)]),
  ].sort((a, b) => a - b);
  return todas.slice(0, -1).map((inicio, index) => ({
    inicio,
    fim: todas[index + 1],
    metros: todas[index + 1] - inicio,
  }));
})();

/** Cada posição medida do corredor vira uma marca — o trecho fica entre duas. */
const MARCOS = [SEGMENTOS[0].inicio, ...SEGMENTOS.map((segmento) => segmento.fim)];
const MARCO_RAIO = 3.5;

type Props = {
  state: GameState;
  totalMinutes: number;
  showRoute: boolean;
  /** Índice do trecho a exibir. `null` mostra o trecho atual (o último feito). */
  selectedStep: number | null;
  cleaningMinutesFor: (roomId: string) => number;
  minutesUntilFree: (roomId: string) => number;
  onSelect: (roomId: string) => void;
};

export function BuildingMap({
  state,
  totalMinutes,
  showRoute,
  selectedStep,
  cleaningMinutesFor,
  minutesUntilFree,
  onSelect,
}: Props) {
  /**
   * Um trecho por parada da rota. Só um aparece de cada vez — o atual por
   * padrão, ou o escolhido na lista de sequência. Desenhar todos empilhados
   * escondia justamente as idas e voltas que o jogo quer tornar visíveis.
   */
  const legs = useMemo(() => {
    let position = 0;
    return state.route.map((step, index) => {
      const target = roomsById[step.roomId]?.corridorPosition ?? position;
      const leg = {
        order: index + 1,
        x1: xDaPosicao(position),
        x2: xDaPosicao(target),
        meters: step.distance,
        purpose: step.purpose,
      };
      position = target;
      return leg;
    });
  }, [state.route]);

  const legVisivel =
    legs.length === 0
      ? null
      : (legs[selectedStep ?? legs.length - 1] ?? legs[legs.length - 1]);

  const playerX = xDaPosicao(state.currentPosition);
  /* O pino encosta no marco — ou no topo do círculo do trecho, quando ele está
     desenhado justamente sob os pés do jogador. */
  const pinoApoio =
    showRoute && legVisivel && legVisivel.x2 === playerX ? TRAIL_DOT_R : MARCO_RAIO;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="Planta do bloco: corredor central com ambientes dos dois lados"
    >
      <defs>
        <pattern id="hachura-pendente" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#b9750a" strokeWidth="2.5" opacity="0.35" />
        </pattern>
        <pattern id="hachura-bloqueada" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0,7 L7,0" stroke="#3b4756" strokeWidth="1" opacity="0.5" />
        </pattern>
        <pattern id="degraus" width="10" height="11" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="10" y2="0" stroke="#1e1e1e" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>

      {/* ---- Corredor: faixa cinza clara, a única rota do bloco ---- */}
      <rect
        x={CORRIDOR_X1}
        y={CENTER_Y - CORRIDOR_HEIGHT / 2}
        width={CORRIDOR_X2 - CORRIDOR_X1}
        height={CORRIDOR_HEIGHT}
        fill="#d5d4d4"
        stroke="#1e1e1e"
        strokeWidth={1.75}
      />

      {/* ---- Ambientes ---- */}
      {rooms.map((room) => (
        <Room
          key={room.id}
          room={room}
          roomState={state.rooms[room.id]}
          geometry={geometryFor(room)}
          visual={visualStateOf(state, room.id, totalMinutes)}
          minutesUntilFree={minutesUntilFree(room.id)}
          cleaningMinutes={cleaningMinutesFor(room.id)}
          reservedDepth={FAIXA_ANINHADA[room.id] ?? 0}
          onSelect={onSelect}
        />
      ))}

      {/* ---- Régua do corredor ----
           Vem DEPOIS dos ambientes de propósito: a caixa de escada e o quadro
           da entrada atravessam o corredor e, desenhados por cima, comiam o
           marco da ponta oeste e a cota junto à entrada. */}
      {SEGMENTOS.map((segmento) => {
        const xInicio = xDaPosicao(segmento.inicio);
        const xFim = xDaPosicao(segmento.fim);
        /* A entrada fica a leste: afastar-se dela corre para a esquerda. */
        const sentido = Math.sign(xFim - xInicio);
        const meio = (xInicio + xFim) / 2;
        return (
          <g key={segmento.inicio} pointerEvents="none">
            <line
              x1={xInicio + sentido * (MARCO_RAIO + 3)}
              x2={xFim - sentido * (MARCO_RAIO + 6)}
              y1={CENTER_Y + COTA_LINE_Y}
              y2={CENTER_Y + COTA_LINE_Y}
              stroke="#8d8d8d"
              strokeWidth={1}
            />
            <path
              d={`M ${xFim - sentido * (MARCO_RAIO + 1)} ${CENTER_Y + COTA_LINE_Y} l ${-sentido * 5} -3 l 0 6 z`}
              fill="#8d8d8d"
            />
            <text
              x={meio}
              y={CENTER_Y + COTA_TEXT_Y}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="9"
              fontWeight="500"
              fill="#4d4d4d"
            >
              {`${formatMeters(segmento.metros)}m`}
            </text>
          </g>
        );
      })}

      {/* ---- Marcos das distâncias ---- */}
      {MARCOS.map((metros) => (
        <circle
          key={metros}
          cx={xDaPosicao(metros)}
          cy={CENTER_Y + COTA_LINE_Y}
          r={MARCO_RAIO}
          fill="#6f6f6f"
          stroke="#d5d4d4"
          strokeWidth={1}
          pointerEvents="none"
        />
      ))}


      {/* ---- Trecho em exibição: o atual, ou o escolhido na sequência ---- */}
      {showRoute && legVisivel && <TrailLeg leg={legVisivel} y={CENTER_Y + TRAIL_Y} />}

      {/* ---- Pino de posição atual, do tileset ----
           Fica vermelho quando o carrinho zera: a mesma regra que desabilita a
           limpeza completa vira sinal no mapa, sem o jogador ter que conferir
           o contador no cabeçalho. */}
      <g
        /* A ponta encosta logo acima do marco da posição atual. */
        transform={`translate(${playerX} ${CENTER_Y + COTA_LINE_Y - pinoApoio - 1.5})`}
        style={{ transition: 'transform 400ms cubic-bezier(.4,0,.2,1)' }}
      >
        <PlayerPin variant={state.charges === 0 ? 'sem-material' : 'padrao'} />
      </g>
    </svg>
  );
}
