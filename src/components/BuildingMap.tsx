import { useMemo } from 'react';
import { ENTRADA_DESENHO_M, buildingSpanMeters, desenhoDaPorta, rooms, roomsById } from '../data/rooms';
import type { GameState } from '../domain/types';
import { Room, type RoomGeometry, type RoomVisualState } from './Room';

/* Escala do desenho: metros → pixels. Mexer nos dados move o mapa junto. */
const PX_PER_METER = 11;
const STAIR_METERS = 13;
const MARGIN_X = 24;
const MARGIN_Y = 20;
const CORRIDOR_HEIGHT = 52;
const ROOM_DEPTH = 120;
const MAX_DEPTH = 1.3;

const toX = (meters: number) => MARGIN_X + (meters + STAIR_METERS) * PX_PER_METER;

/** Onde uma distância-até-a-entrada cai no desenho. Cresce para a esquerda. */
const xDaPosicao = (posicao: number) => toX(ENTRADA_DESENHO_M - posicao);

/* Faixas dentro do corredor, de cima para baixo: cota do trecho e trilha. */
const COTA_TEXT_Y = -1;
const COTA_LINE_Y = 6;
const TRAIL_Y = 17;

const CORRIDOR_X1 = toX(-STAIR_METERS) + 8;
const CORRIDOR_X2 = toX(ENTRADA_DESENHO_M);

const WIDTH = toX(buildingSpanMeters) + MARGIN_X;
const CENTER_Y = MARGIN_Y + ROOM_DEPTH * MAX_DEPTH + CORRIDOR_HEIGHT / 2;
const HEIGHT = CENTER_Y + CORRIDOR_HEIGHT / 2 + ROOM_DEPTH * MAX_DEPTH + MARGIN_Y;

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
  const posicoes = [...new Set(rooms.map((room) => room.corridorPosition))].sort((a, b) => a - b);
  const todas = [0, ...posicoes.filter((p) => p !== 0)];
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
  cleaningMinutesFor: (roomId: string) => number;
  minutesUntilFree: (roomId: string) => number;
  onSelect: (roomId: string) => void;
};

export function BuildingMap({
  state,
  totalMinutes,
  showRoute,
  cleaningMinutesFor,
  minutesUntilFree,
  onSelect,
}: Props) {
  const trail = useMemo(() => {
    const legs: { x1: number; x2: number; y: number; order: number }[] = [];
    const stops = new Map<number, number>();
    let position = 0;
    state.route.forEach((step, index) => {
      const room = roomsById[step.roomId];
      if (!room) return;
      const target = room.corridorPosition;
      if (target !== position) {
        legs.push({
          x1: xDaPosicao(position),
          x2: xDaPosicao(target),
          y: CENTER_Y + TRAIL_Y + ((index % 3) - 1) * 3,
          order: index,
        });
      }
      stops.set(xDaPosicao(target), index + 1);
      position = target;
    });
    return { legs, stops: [...stops].map(([x, order]) => ({ x, order })), total: state.route.length };
  }, [state.route]);

  const playerX = xDaPosicao(state.currentPosition);

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

      {/* Cotas de cada trecho, com seta, como no mockup */}
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
              {`${segmento.metros}m`}
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
          onSelect={onSelect}
        />
      ))}

      {/* ---- Trajeto percorrido ---- */}
      {showRoute && trail.legs.length > 0 && (
        <g pointerEvents="none">
          {trail.legs.map((leg) => (
            <line
              key={leg.order}
              x1={leg.x1}
              x2={leg.x2}
              y1={leg.y}
              y2={leg.y}
              stroke="#4f7df3"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.3 + 0.7 * ((leg.order + 1) / Math.max(1, trail.total))}
            />
          ))}
          {trail.stops.map((stop) => (
            <g key={stop.x}>
              <circle cx={stop.x} cy={CENTER_Y + TRAIL_Y} r={6} fill="#4f7df3" />
              <text
                x={stop.x}
                y={CENTER_Y + TRAIL_Y + 3}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="8"
                fontWeight="700"
                fill="#ffffff"
              >
                {stop.order}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* ---- Pino de posição atual, como no mockup ---- */}
      <g
        /* A ponta encosta logo acima do marco da posição atual. */
        transform={`translate(${playerX} ${CENTER_Y + COTA_LINE_Y - MARCO_RAIO - 1.5})`}
        style={{ transition: 'transform 400ms cubic-bezier(.4,0,.2,1)' }}
      >
        <path
          d="M 0 0 C -9 -10 -11 -14 -11 -19 a 11 11 0 0 1 22 0 c 0 5 -2 9 -11 19 z"
          fill="#4f7df3"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        <circle cy={-19} r={4} fill="#ffffff" />
      </g>
    </svg>
  );
}
