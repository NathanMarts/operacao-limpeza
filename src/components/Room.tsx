import type { RoomDef, RoomState, RoomTone } from '../domain/types';

/**
 * Tom do ambiente: aparece como uma lavagem discreta, só o bastante para o
 * desenho ler como planta. Saturação forte fica reservada para ESTADO.
 */
const TONE: Record<RoomTone, string> = {
  grande: '#5eb0e8',
  media: '#e8a668',
  pequena: '#5fc99a',
  estreita: '#3fa896',
  banheiro: '#37988c',
  tecnica: '#9d8ce0',
};

export type RoomVisualState =
  | 'disponivel'
  | 'destino'
  | 'concluida'
  | 'pendente'
  | 'bloqueada'
  | 'apoio';

export type RoomGeometry = { x: number; y: number; width: number; height: number; doorX: number };

/** Glifo de estado: o mapa não depende só de cor para ser lido. */
const GLYPH: Partial<Record<RoomVisualState, string>> = {
  concluida: '✓',
  pendente: '◐',
  bloqueada: '🔒',
};

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
  const tone = TONE[room.tone];

  const stateStroke: Record<RoomVisualState, string> = {
    disponivel: 'rgba(147,163,184,0.45)',
    destino: '#5ea9ff',
    concluida: 'rgba(52,211,153,0.55)',
    pendente: '#f59e0b',
    bloqueada: 'rgba(107,122,143,0.4)',
    apoio: 'rgba(201,162,39,0.5)',
  };

  const fillOpacity =
    visual === 'concluida' ? 0.07 : visual === 'bloqueada' ? 0.05 : visual === 'apoio' ? 0.08 : 0.2;

  const cx = geometry.x + geometry.width / 2;
  const cy = geometry.y + geometry.height / 2;
  const glyph = GLYPH[visual];
  const tall = geometry.height > 52;

  return (
    <g
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        `${room.name}. ` +
        (visual === 'concluida'
          ? 'Concluída.'
          : visual === 'pendente'
            ? `Pendente, restam ${roomState.residualMinutes} minutos.`
            : visual === 'bloqueada'
              ? `Bloqueada por cerca de ${Math.ceil(minutesUntilFree)} minutos.`
              : visual === 'apoio'
                ? 'Depósito, parada de reabastecimento.'
                : `Disponível, ${cleaningMinutes} minutos de limpeza.`)
      }
      aria-disabled={!interactive}
      className={interactive ? 'cursor-pointer' : 'cursor-not-allowed'}
      onClick={() => interactive && onSelect(room.id)}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(room.id);
        }
      }}
    >
      {/* Base sólida: sem ela o tom a baixa opacidade some no fundo quase preto
          e a planta vira um bloco de buracos escuros. */}
      <rect
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        rx={2}
        fill="#0f151e"
      />

      {/* Corpo do ambiente */}
      <rect
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        rx={2}
        fill={tone}
        fillOpacity={fillOpacity}
        stroke={stateStroke[visual]}
        strokeWidth={visual === 'destino' ? 2.5 : 1.25}
        strokeDasharray={visual === 'apoio' ? '5 3' : undefined}
        className="transition-all duration-200"
      />

      {/* Hachura de arquitetura: pendente = meio traço, bloqueada = trama cruzada */}
      {visual === 'pendente' && (
        <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={2} fill="url(#hatch-pendente)" pointerEvents="none" />
      )}
      {visual === 'bloqueada' && (
        <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={2} fill="url(#hatch-bloqueada)" pointerEvents="none" />
      )}

      {/* Realce do destino escolhido */}
      {visual === 'destino' && (
        <rect
          x={geometry.x - 3}
          y={geometry.y - 3}
          width={geometry.width + 6}
          height={geometry.height + 6}
          rx={4}
          fill="none"
          stroke="#5ea9ff"
          strokeWidth={1}
          strokeDasharray="3 3"
          className="destino-pulse"
          pointerEvents="none"
        />
      )}

      {/* Vão da porta: a posição lógica usada no cálculo de deslocamento */}
      <rect
        x={geometry.doorX - 7}
        y={room.side === 'top' ? geometry.y + geometry.height - 2 : geometry.y}
        width={14}
        height={2}
        fill="#080b11"
        pointerEvents="none"
      />
      <path
        d={
          room.side === 'top'
            ? `M ${geometry.doorX - 7} ${geometry.y + geometry.height - 1} a 14 14 0 0 1 14 0`
            : `M ${geometry.doorX - 7} ${geometry.y + 1} a 14 14 0 0 0 14 0`
        }
        fill="none"
        stroke={stateStroke[visual]}
        strokeWidth={0.75}
        opacity={0.55}
        pointerEvents="none"
      />

      {/* Rótulo */}
      <text
        x={cx}
        y={cy - (tall ? 5 : 3)}
        textAnchor="middle"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="13"
        fontWeight="600"
        pointerEvents="none"
        fill={visual === 'concluida' || visual === 'bloqueada' ? '#6b7a8f' : '#e9eff7'}
      >
        {room.shortName}
      </text>

      {tall && room.cleanable && visual !== 'bloqueada' && (
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          pointerEvents="none"
          fill={visual === 'pendente' ? '#f59e0b' : visual === 'concluida' ? '#4b5a6d' : '#93a3b8'}
        >
          {visual === 'pendente' ? `restam ${roomState.residualMinutes}′` : `${cleaningMinutes}′`}
        </text>
      )}

      {tall && visual === 'bloqueada' && (
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          pointerEvents="none"
          fill="#8b98a8"
        >
          ~{Math.ceil(minutesUntilFree)}′
        </text>
      )}

      {/* Glifo de estado, ancorado no canto — legível sem depender de cor */}
      {glyph && (
        <text
          x={geometry.x + geometry.width - 7}
          y={room.side === 'top' ? geometry.y + 14 : geometry.y + geometry.height - 6}
          textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontSize="11"
          pointerEvents="none"
          fill={visual === 'concluida' ? '#34d399' : visual === 'pendente' ? '#f59e0b' : '#6b7a8f'}
        >
          {glyph}
        </text>
      )}

      {/* Depósito: marcado como apoio, nunca como objetivo */}
      {visual === 'apoio' && (
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="8"
          letterSpacing="0.08em"
          pointerEvents="none"
          fill="#c9a227"
        >
          RECARGA
        </text>
      )}
    </g>
  );
}
