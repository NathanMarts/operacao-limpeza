import type { RoomDef, RoomState, RoomTone } from '../domain/types';

/** Paleta por tom, espelhando a legenda da planta. */
const TONE_FILL: Record<RoomTone, string> = {
  grande: '#bfe4f7',
  media: '#fbdfae',
  pequena: '#b9ecd0',
  estreita: '#6fc9b4',
  banheiro: '#4fb8a5',
  tecnica: '#d8cdf0',
};

export type RoomVisualState = 'disponivel' | 'selecionada' | 'concluida' | 'pendente' | 'bloqueada' | 'apoio';

export type RoomGeometry = { x: number; y: number; width: number; height: number; doorX: number };

type Props = {
  room: RoomDef;
  roomState: RoomState;
  geometry: RoomGeometry;
  visual: RoomVisualState;
  minutesUntilFree: number;
  cleaningMinutes: number;
  onSelect: (roomId: string) => void;
};

export function Room({
  room,
  roomState,
  geometry,
  visual,
  minutesUntilFree,
  cleaningMinutes,
  onSelect,
}: Props) {
  const interactive = visual === 'disponivel' || visual === 'pendente' || visual === 'apoio';
  const fill = TONE_FILL[room.tone];

  const opacity = visual === 'concluida' ? 0.28 : visual === 'bloqueada' ? 0.35 : 1;
  const stroke =
    visual === 'selecionada'
      ? '#3b82f6'
      : visual === 'pendente'
        ? '#f59e0b'
        : visual === 'concluida'
          ? '#22c55e'
          : '#1e293b';
  const strokeWidth = visual === 'selecionada' ? 4 : visual === 'pendente' ? 3 : 1.5;

  const label = room.shortName;
  const centerX = geometry.x + geometry.width / 2;
  const centerY = geometry.y + geometry.height / 2;

  return (
    <g
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${room.name}${interactive ? '' : ' (indisponível)'}`}
      aria-disabled={!interactive}
      className={interactive ? 'cursor-pointer outline-none' : 'cursor-not-allowed'}
      onClick={() => interactive && onSelect(room.id)}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(room.id);
        }
      }}
    >
      <rect
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        rx={3}
        fill={fill}
        fillOpacity={opacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className={interactive ? 'transition-[stroke,fill-opacity] hover:stroke-sky-400' : ''}
      />

      {/* Hachura da pendência */}
      {visual === 'pendente' && (
        <rect
          x={geometry.x}
          y={geometry.y}
          width={geometry.width}
          height={geometry.height}
          rx={3}
          fill="url(#hachura-pendente)"
          pointerEvents="none"
        />
      )}

      {/* Porta: marca a posição lógica usada no cálculo de deslocamento */}
      <rect
        x={geometry.doorX - 5}
        y={room.side === 'top' ? geometry.y + geometry.height - 3 : geometry.y}
        width={10}
        height={3}
        fill="#0f172a"
        opacity={0.55}
        pointerEvents="none"
      />

      <text
        x={centerX}
        y={centerY - (geometry.height > 44 ? 6 : 0)}
        textAnchor="middle"
        className="fill-slate-900 text-[13px] font-semibold"
        pointerEvents="none"
        opacity={visual === 'concluida' ? 0.6 : 1}
      >
        {label}
      </text>

      {geometry.height > 44 && room.cleanable && (
        <text
          x={centerX}
          y={centerY + 11}
          textAnchor="middle"
          className="fill-slate-700 text-[10px]"
          pointerEvents="none"
          opacity={visual === 'concluida' ? 0.6 : 1}
        >
          {visual === 'pendente' ? `resta ${roomState.residualMinutes} min` : `${cleaningMinutes} min`}
        </text>
      )}

      {visual === 'concluida' && (
        <text x={centerX} y={geometry.y + 15} textAnchor="middle" className="text-[13px]" pointerEvents="none">
          ✓
        </text>
      )}

      {visual === 'bloqueada' && (
        <text
          x={centerX}
          y={centerY + 14}
          textAnchor="middle"
          className="fill-slate-100 text-[9px] font-medium"
          pointerEvents="none"
        >
          🔒 ~{Math.ceil(minutesUntilFree)} min
        </text>
      )}
    </g>
  );
}
