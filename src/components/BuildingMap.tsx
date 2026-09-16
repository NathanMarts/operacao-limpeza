import { useMemo } from 'react';
import { buildingSpanMeters, rooms } from '../data/rooms';
import type { GameState } from '../domain/types';
import { Room, type RoomGeometry, type RoomVisualState } from './Room';

/* Escala do desenho: metros → pixels. Alterar posições nos dados move o mapa. */
const PX_PER_METER = 13;
const STAIR_METERS = 13;
const MARGIN_X = 26;
const CORRIDOR_HEIGHT = 54;
const ROOM_DEPTH = 96;
const MAX_DEPTH = 1.4;

const toX = (meters: number) => MARGIN_X + (meters + STAIR_METERS) * PX_PER_METER;

const WIDTH = toX(buildingSpanMeters) + MARGIN_X;
const CENTER_Y = MARGIN_X + ROOM_DEPTH * MAX_DEPTH + CORRIDOR_HEIGHT / 2;
const HEIGHT = CENTER_Y + ROOM_DEPTH * MAX_DEPTH + MARGIN_X;

function geometryFor(room: (typeof rooms)[number]): RoomGeometry {
  const x = toX(room.spanStartMeters);
  const width = room.spanWidthMeters * PX_PER_METER;
  const height = ROOM_DEPTH * room.depth;
  const y =
    room.side === 'top'
      ? CENTER_Y - CORRIDOR_HEIGHT / 2 - height
      : CENTER_Y + CORRIDOR_HEIGHT / 2;
  return { x, y, width, height, doorX: toX(room.corridorPosition) };
}

function visualStateOf(
  state: GameState,
  roomId: string,
  totalNow: number,
): RoomVisualState {
  const room = rooms.find((candidate) => candidate.id === roomId)!;
  if (room.kind === 'deposito') return 'apoio';
  if (state.pendingTargetId === roomId || state.situation?.roomId === roomId) return 'selecionada';

  const roomState = state.rooms[roomId];
  if (roomState.status === 'concluida') return 'concluida';
  const blocked = roomState.blockedUntilMinute !== null && roomState.blockedUntilMinute > totalNow;
  if (blocked) return 'bloqueada';
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
  /** Trajeto: cada trecho ganha um deslocamento vertical próprio, para que idas
   *  e voltas apareçam empilhadas em vez de se sobreporem numa linha só. */
  const routeLines = useMemo(() => {
    const lines: { x1: number; x2: number; y: number; index: number }[] = [];
    let position = 0;
    state.route.forEach((step, index) => {
      const room = rooms.find((candidate) => candidate.id === step.roomId);
      if (!room) return;
      const target = room.corridorPosition;
      if (target !== position) {
        const offset = ((index % 5) - 2) * 6;
        lines.push({ x1: toX(position), x2: toX(target), y: CENTER_Y + offset, index });
      }
      position = target;
    });
    return lines;
  }, [state.route]);

  const playerX = toX(state.currentPosition);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="Planta do bloco: corredor central com salas dos dois lados"
    >
      <defs>
        <pattern id="hachura-pendente" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#b45309" strokeWidth="3" opacity="0.5" />
        </pattern>
        <marker id="seta-rota" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="#38bdf8" />
        </marker>
      </defs>

      {/* Corredor: única rota do bloco, sem atalhos */}
      <rect
        x={toX(-STAIR_METERS)}
        y={CENTER_Y - CORRIDOR_HEIGHT / 2}
        width={toX(buildingSpanMeters) - toX(-STAIR_METERS)}
        height={CORRIDOR_HEIGHT}
        fill="#e2e8f0"
        fillOpacity={0.9}
        stroke="#1e293b"
        strokeWidth={1.5}
      />

      {/* Escada / entrada, à esquerda como na planta */}
      <rect
        x={toX(-STAIR_METERS) + 4}
        y={CENTER_Y - 42}
        width={STAIR_METERS * PX_PER_METER - 16}
        height={84}
        rx={3}
        fill="#fde9a9"
        stroke="#1e293b"
        strokeWidth={1.5}
      />
      {Array.from({ length: 6 }).map((_, index) => (
        <line
          key={index}
          x1={toX(-STAIR_METERS) + 10}
          x2={toX(-STAIR_METERS) + STAIR_METERS * PX_PER_METER - 22}
          y1={CENTER_Y - 32 + index * 13}
          y2={CENTER_Y - 32 + index * 13}
          stroke="#a16207"
          strokeWidth={1}
          opacity={0.6}
        />
      ))}

      {/* Réguas de distância ao longo do corredor */}
      {Array.from({ length: Math.floor(buildingSpanMeters / 10) + 1 }).map((_, index) => {
        const meters = index * 10;
        return (
          <g key={meters}>
            <line
              x1={toX(meters)}
              x2={toX(meters)}
              y1={CENTER_Y - CORRIDOR_HEIGHT / 2}
              y2={CENTER_Y - CORRIDOR_HEIGHT / 2 + 7}
              stroke="#64748b"
              strokeWidth={1}
            />
            <text x={toX(meters)} y={CENTER_Y - CORRIDOR_HEIGHT / 2 + 19} textAnchor="middle" className="fill-slate-500 text-[9px]">
              {meters} m
            </text>
          </g>
        );
      })}

      {/* Trajeto percorrido */}
      {showRoute &&
        routeLines.map((line) => (
          <line
            key={line.index}
            x1={line.x1}
            x2={line.x2}
            y1={line.y}
            y2={line.y}
            stroke="#38bdf8"
            strokeWidth={2}
            opacity={0.65}
            markerEnd="url(#seta-rota)"
          />
        ))}

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

      {/* Marcador da entrada (posição 0) */}
      <line
        x1={toX(0)}
        x2={toX(0)}
        y1={CENTER_Y - CORRIDOR_HEIGHT / 2}
        y2={CENTER_Y + CORRIDOR_HEIGHT / 2}
        stroke="#0f172a"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text x={toX(0) + 6} y={CENTER_Y + CORRIDOR_HEIGHT / 2 - 7} className="fill-slate-600 text-[10px] font-medium">
        ENTRADA (0 m)
      </text>

      {/* Posição atual do jogador */}
      <g transform={`translate(${playerX}, ${CENTER_Y})`} style={{ transition: 'transform 300ms' }}>
        <circle r={10} fill="#2563eb" stroke="#fff" strokeWidth={2.5} />
        <circle r={3.5} fill="#fff" />
      </g>
    </svg>
  );
}
