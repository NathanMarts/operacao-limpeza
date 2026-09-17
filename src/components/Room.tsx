import type { RoomDef, RoomState, RoomTone } from '../domain/types';

/** Cores da planta, amostradas de Prototipo/prototipo.png. */
const TONE: Record<RoomTone, string> = {
  grande: '#a6d6f9',
  media: '#f9d89c',
  pequena: '#96e6cb',
  estreita: '#4fb6a8',
  banheiro: '#c4b9f5',
  tecnica: '#c9bdf3',
};

const PAREDE = '#1e1e1e';

export type RoomVisualState =
  | 'disponivel'
  | 'destino'
  | 'concluida'
  | 'pendente'
  | 'bloqueada'
  | 'apoio';

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
  const { x, y, width, height, doorX } = geometry;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const tall = height > 50;

  /* O estado muda saturação e contorno; a planta segue clara em todos eles. */
  const fill = TONE[room.tone];
  const fillOpacity = visual === 'concluida' ? 0.4 : visual === 'bloqueada' ? 0.3 : 1;
  const stroke = visual === 'destino' ? '#4f7df3' : visual === 'pendente' ? '#e08a1e' : PAREDE;
  const strokeWidth = visual === 'destino' ? 3 : visual === 'pendente' ? 2.5 : 1.75;
  const textoEscuro = visual === 'bloqueada' ? '#5b6472' : '#16232b';

  const aria =
    `${room.name}. ` +
    (visual === 'concluida'
      ? 'Concluída.'
      : visual === 'pendente'
        ? `Pendente, restam ${roomState.residualMinutes} minutos.`
        : visual === 'bloqueada'
          ? `Bloqueada por cerca de ${Math.ceil(minutesUntilFree)} minutos.`
          : visual === 'apoio'
            ? 'Depósito, parada de reabastecimento.'
            : `Disponível, ${cleaningMinutes} minutos de limpeza.`);

  return (
    <g
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={aria}
      aria-disabled={!interactive}
      className={interactive ? 'mapa-alvo cursor-pointer' : 'cursor-not-allowed'}
      onClick={() => interactive && onSelect(room.id)}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(room.id);
        }
      }}
    >
      {/* Miolo branco: garante que o pastel apareça igual ao mockup */}
      <rect x={x} y={y} width={width} height={height} fill="#ffffff" />
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={fillOpacity} />

      {visual === 'pendente' && (
        <rect x={x} y={y} width={width} height={height} fill="url(#hachura-pendente)" pointerEvents="none" />
      )}
      {visual === 'bloqueada' && (
        <rect x={x} y={y} width={width} height={height} fill="url(#hachura-bloqueada)" pointerEvents="none" />
      )}

      {interactive && (
        <rect
          className="mapa-alvo-brilho"
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#4f7df3"
          opacity={0}
        />
      )}

      <rect
        className="mapa-alvo-parede"
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />

      {/* Cabines dos banheiros, como no desenho original */}
      {room.kind === 'wc' &&
        Array.from({ length: 3 }).map((_, index) => (
          <rect
            key={index}
            x={x + 5}
            y={y + 6 + index * ((height - 12) / 3)}
            width={15}
            height={(height - 12) / 3 - 4}
            fill="#48a39a"
            stroke={PAREDE}
            strokeWidth={1}
            pointerEvents="none"
          />
        ))}

      {/* Vão e folha da porta, exatamente na posição usada no cálculo */}
      <rect
        x={doorX - 9}
        y={room.side === 'top' ? y + height - strokeWidth / 2 - 1 : y - strokeWidth / 2 - 1}
        width={18}
        height={strokeWidth + 2}
        fill="#ffffff"
        pointerEvents="none"
      />
      <path
        d={
          room.side === 'top'
            ? `M ${doorX - 9} ${y + height} a 18 18 0 0 1 18 0`
            : `M ${doorX - 9} ${y} a 18 18 0 0 0 18 0`
        }
        fill="none"
        stroke={PAREDE}
        strokeWidth={1}
        opacity={0.65}
        pointerEvents="none"
      />

      {/* Rótulo em duas linhas: nome e minutos, como no mockup */}
      <text
        x={cx}
        y={tall ? cy - 1 : cy + 3}
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize={room.kind === 'deposito' ? 9 : 13}
        fontWeight="700"
        fill={textoEscuro}
        pointerEvents="none"
      >
        {room.shortName}
      </text>

      {tall && room.cleanable && (
        <text
          x={cx}
          y={cy + 15}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fontWeight="500"
          fill={visual === 'pendente' ? '#8a5206' : '#3c4a57'}
          pointerEvents="none"
        >
          {visual === 'pendente'
            ? `restam ${roomState.residualMinutes} min`
            : visual === 'bloqueada'
              ? `~${Math.ceil(minutesUntilFree)} min`
              : `${cleaningMinutes} min`}
        </text>
      )}

      {/* Selos de estado: legíveis sem depender de cor */}
      {visual === 'concluida' && (
        <g pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#34d399" />
          <path
            d={`M ${x + width - 16} ${y + 12} l 3 3.5 l 6 -7`}
            fill="none"
            stroke="#06281c"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {visual === 'pendente' && (
        <g pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#f0b429" />
          <path d={`M ${x + width - 12} ${y + 5} a 7 7 0 0 0 0 14 z`} fill="#4a2f02" />
        </g>
      )}
      {visual === 'bloqueada' && (
        <g pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#5b6472" />
          <rect x={x + width - 16} y={y + 11} width={8} height={6} rx={1} fill="#e8edf2" />
          <path
            d={`M ${x + width - 14.5} ${y + 11} v -2.5 a 2.5 2.5 0 0 1 5 0 v 2.5`}
            fill="none"
            stroke="#e8edf2"
            strokeWidth={1.5}
          />
        </g>
      )}

      {room.kind === 'deposito' && (
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="7"
          fontWeight="600"
          fill="#4a3d6b"
          pointerEvents="none"
        >
          RECARGA
        </text>
      )}
    </g>
  );
}
