import { useMemo } from 'react';
import { buildingSpanMeters, rooms, roomsById } from '../data/rooms';
import { distanceBetween, travelMinutes } from '../domain/movement';
import { formatMinutes } from '../domain/effects';
import type { GameState } from '../domain/types';
import { Room, type RoomGeometry, type RoomVisualState } from './Room';

/* Escala do desenho: metros → pixels. Mexer nos dados move o mapa junto. */
const PX_PER_METER = 14;
const STAIR_METERS = 13;
const MARGIN_X = 26;
const CORRIDOR_HEIGHT = 64;
const ROOM_DEPTH = 100;
const MAX_DEPTH = 1.4;

const COTA_Y = 26;
const TOP_BAND = COTA_Y + 26;

const toX = (meters: number) => MARGIN_X + (meters + STAIR_METERS) * PX_PER_METER;

/** O corredor começa onde a escada termina — não passa por trás dela. */
const CORRIDOR_X1 = toX(-STAIR_METERS) + STAIR_METERS * PX_PER_METER - 14;
const CORRIDOR_X2 = toX(buildingSpanMeters);

const WIDTH = CORRIDOR_X2 + MARGIN_X;
const CENTER_Y = TOP_BAND + ROOM_DEPTH * MAX_DEPTH + CORRIDOR_HEIGHT / 2;
const RULER_Y = CENTER_Y + CORRIDOR_HEIGHT / 2 + ROOM_DEPTH * MAX_DEPTH + 28;
const HEIGHT = RULER_Y + 22;

/* Faixas dentro do corredor: o jogador em cima, a trilha percorrida embaixo. */
const PLAYER_Y = CENTER_Y - 11;
const TRAIL_Y = CENTER_Y + 15;

function geometryFor(room: (typeof rooms)[number]): RoomGeometry {
  const x = toX(room.spanStartMeters);
  const width = room.spanWidthMeters * PX_PER_METER;
  const height = ROOM_DEPTH * room.depth;
  const y =
    room.side === 'top' ? CENTER_Y - CORRIDOR_HEIGHT / 2 - height : CENTER_Y + CORRIDOR_HEIGHT / 2;
  return { x, y, width, height, doorX: toX(room.corridorPosition) };
}

function visualStateOf(state: GameState, roomId: string, totalNow: number): RoomVisualState {
  const room = roomsById[roomId];
  if (state.pendingTargetId === roomId || state.situation?.roomId === roomId) return 'destino';
  if (room.kind === 'deposito') return 'apoio';

  const roomState = state.rooms[roomId];
  if (roomState.status === 'concluida') return 'concluida';
  if (roomState.blockedUntilMinute !== null && roomState.blockedUntilMinute > totalNow) {
    return 'bloqueada';
  }
  if (roomState.status === 'pendente') return 'pendente';
  return 'disponivel';
}

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
  /**
   * Trilha percorrida: trechos mais recentes mais brilhantes, com pontos
   * numerados nas paradas. Vive na metade de baixo do corredor, longe do
   * marcador do jogador e da régua.
   */
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
          x1: toX(position),
          x2: toX(target),
          y: TRAIL_Y + ((index % 3) - 1) * 5,
          order: index,
        });
      }
      stops.set(toX(target), index + 1);
      position = target;
    });
    return { legs, stops: [...stops].map(([x, order]) => ({ x, order })), total: state.route.length };
  }, [state.route]);

  const playerX = toX(state.currentPosition);

  /* Elemento assinatura: a cota de arquitetura do trecho prestes a ser andado.
     Mostra a regra |posAtual − posDestino| no vocabulário da própria planta. */
  const destinoId = state.pendingTargetId ?? state.situation?.roomId ?? null;
  const cota = useMemo(() => {
    if (!destinoId) return null;
    const destino = roomsById[destinoId];
    const meters = distanceBetween(state.currentPosition, destino.corridorPosition);
    if (meters === 0) return null;
    const alvoX = toX(destino.corridorPosition);
    return {
      x1: Math.min(playerX, alvoX),
      x2: Math.max(playerX, alvoX),
      meters,
      mid: (playerX + alvoX) / 2,
    };
  }, [destinoId, state.currentPosition, playerX]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="Planta do bloco: corredor único com ambientes dos dois lados"
    >
      <defs>
        <pattern id="hatch-pendente" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#f59e0b" strokeWidth="1.6" opacity="0.32" />
        </pattern>
        <pattern id="hatch-bloqueada" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0,6 L6,0 M-1,1 L1,-1 M5,7 L7,5" stroke="#6b7a8f" strokeWidth="0.8" opacity="0.35" />
        </pattern>
        {/* userSpaceOnUse: um gradiente objectBoundingBox degenera numa linha horizontal. */}
        <linearGradient id="trilha" gradientUnits="userSpaceOnUse" x1={CORRIDOR_X1} x2={CORRIDOR_X2} y1={0} y2={0}>
          <stop offset="0%" stopColor="#5ea9ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8fc7ff" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* ---- Cota do próximo deslocamento (elemento assinatura) ---- */}
      {cota && (
        <g className="pointer-events-none">
          {[cota.x1, cota.x2].map((x) => (
            <line
              key={x}
              x1={x}
              x2={x}
              y1={COTA_Y + 5}
              y2={CENTER_Y - CORRIDOR_HEIGHT / 2}
              stroke="#5ea9ff"
              strokeWidth="0.75"
              strokeDasharray="2 4"
              opacity="0.35"
            />
          ))}
          <line x1={cota.x1} x2={cota.x2} y1={COTA_Y} y2={COTA_Y} stroke="#5ea9ff" strokeWidth="1.25" />
          <path d={`M ${cota.x1} ${COTA_Y} l 8 -3.5 l 0 7 z`} fill="#5ea9ff" />
          <path d={`M ${cota.x2} ${COTA_Y} l -8 -3.5 l 0 7 z`} fill="#5ea9ff" />
          <rect x={cota.mid - 48} y={COTA_Y - 11} width={96} height={22} rx={11} fill="#080b11" />
          <text
            x={cota.mid}
            y={COTA_Y + 4}
            textAnchor="middle"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="11"
            fontWeight="600"
            fill="#5ea9ff"
          >
            {cota.meters} m · {formatMinutes(travelMinutes(cota.meters))} min
          </text>
        </g>
      )}

      {/* ---- Corredor: um canal silencioso, só com hairlines em cima e embaixo ---- */}
      <rect
        x={CORRIDOR_X1}
        y={CENTER_Y - CORRIDOR_HEIGHT / 2}
        width={CORRIDOR_X2 - CORRIDOR_X1}
        height={CORRIDOR_HEIGHT}
        fill="#5ea9ff"
        fillOpacity={0.04}
      />
      {[CENTER_Y - CORRIDOR_HEIGHT / 2, CENTER_Y + CORRIDOR_HEIGHT / 2].map((y) => (
        <line key={y} x1={CORRIDOR_X1} x2={CORRIDOR_X2} y1={y} y2={y} stroke="#223046" strokeWidth={1.25} />
      ))}

      {/* ---- Escada, encostada na ponta oeste ---- */}
      <g>
        <rect
          x={toX(-STAIR_METERS) + 4}
          y={CENTER_Y - 48}
          width={STAIR_METERS * PX_PER_METER - 20}
          height={96}
          rx={2}
          fill="#c9a227"
          fillOpacity={0.08}
          stroke="rgba(201,162,39,0.4)"
          strokeWidth={1.25}
        />
        {Array.from({ length: 7 }).map((_, index) => (
          <line
            key={index}
            x1={toX(-STAIR_METERS) + 10}
            x2={toX(-STAIR_METERS) + STAIR_METERS * PX_PER_METER - 26}
            y1={CENTER_Y - 38 + index * 13}
            y2={CENTER_Y - 38 + index * 13}
            stroke="#c9a227"
            strokeWidth={0.75}
            opacity={0.3}
          />
        ))}
        <text
          x={toX(-STAIR_METERS) + (STAIR_METERS * PX_PER_METER - 16) / 2}
          y={CENTER_Y + 64}
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          fill="#8a7420"
        >
          ESCADA
        </text>
      </g>

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

      {/* ---- Trilha percorrida ---- */}
      {showRoute && trail.legs.length > 0 && (
        <g className="pointer-events-none">
          {trail.legs.map((leg) => (
            <line
              key={leg.order}
              x1={leg.x1}
              x2={leg.x2}
              y1={leg.y}
              y2={leg.y}
              stroke="url(#trilha)"
              strokeWidth={2.25}
              strokeLinecap="round"
              opacity={0.3 + 0.7 * ((leg.order + 1) / Math.max(1, trail.total))}
            />
          ))}
          {trail.stops.map((stop) => (
            <g key={stop.x}>
              <circle cx={stop.x} cy={TRAIL_Y} r={7} fill="#0f151e" stroke="#5ea9ff" strokeWidth={1} opacity={0.8} />
              <text
                x={stop.x}
                y={TRAIL_Y + 3}
                textAnchor="middle"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8"
                fill="#5ea9ff"
              >
                {stop.order}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* ---- Você está aqui ---- */}
      <g transform={`translate(${playerX} ${PLAYER_Y})`} style={{ transition: 'transform 420ms cubic-bezier(.4,0,.2,1)' }}>
        <circle r={13} fill="#5ea9ff" opacity={0.12} />
        <circle r={6.5} fill="#5ea9ff" />
        <circle r={2.25} fill="#080b11" />
      </g>

      {/* ---- Régua geral: a cota do prédio, fora do corredor ---- */}
      <g className="pointer-events-none">
        <line x1={toX(0)} x2={toX(buildingSpanMeters)} y1={RULER_Y} y2={RULER_Y} stroke="#2c3a52" strokeWidth={1} />
        {Array.from({ length: Math.floor(buildingSpanMeters / 10) + 1 }).map((_, index) => {
          const meters = index * 10;
          return (
            <g key={meters}>
              <line x1={toX(meters)} x2={toX(meters)} y1={RULER_Y - 5} y2={RULER_Y + 5} stroke="#2c3a52" strokeWidth={1} />
              <text
                x={toX(meters)}
                y={RULER_Y + 16}
                textAnchor="middle"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="9"
                fill={meters === 0 ? '#c9a227' : '#5d6d82'}
              >
                {meters === 0 ? 'ENTRADA' : `${meters} m`}
              </text>
            </g>
          );
        })}
      </g>

      {/* Marco zero, ligando a entrada ao corredor */}
      <line
        x1={toX(0)}
        x2={toX(0)}
        y1={CENTER_Y - CORRIDOR_HEIGHT / 2}
        y2={CENTER_Y + CORRIDOR_HEIGHT / 2}
        stroke="#c9a227"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.5}
      />
    </svg>
  );
}
