import type { RoomDef, RoomState, RoomTone } from '../domain/types';

/** Cores da planta, amostradas de Prototipo/prototipo.png. */
const TONE: Record<RoomTone, string> = {
  grande: '#a6d6f9',
  media: '#f9d89c',
  pequena: '#96e6cb',
  estreita: '#4fb6a8',
  banheiro: '#c4b9f5',
  tecnica: '#c9bdf3',
  escada: '#f6e9ad',
  entrada: '#cfd8e3',
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
  /** Fração da profundidade tomada por um ambiente aninhado, junto ao corredor. */
  reservedDepth?: number;
  geometry: RoomGeometry;
  visual: RoomVisualState;
  minutesUntilFree: number;
  cleaningMinutes: number;
  onSelect: (roomId: string) => void;
  /** Avisa o mapa qual ambiente está sob o cursor, para a prévia da rota. */
  onHover?: (roomId: string | null) => void;
};

export function Room({
  room,
  roomState,
  geometry,
  visual,
  minutesUntilFree,
  cleaningMinutes,
  reservedDepth = 0,
  onSelect,
  onHover,
}: Props) {
  const interactive = visual === 'disponivel' || visual === 'pendente' || visual === 'apoio';
  const { x, y, width, height, doorX } = geometry;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const tall = height > 50;
  /* Faixa junto ao corredor tomada por um ambiente aninhado (ex.: o depósito
     dentro do banheiro). As cabines recuam para não invadi-la. */
  const reservada = reservedDepth * height;

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
      onMouseEnter={() => interactive && onHover?.(room.id)}
      onMouseLeave={() => interactive && onHover?.(null)}
      onFocus={() => interactive && onHover?.(room.id)}
      onBlur={() => interactive && onHover?.(null)}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(room.id);
        }
      }}
    >
      {/* Miolo branco: garante que o pastel apareça igual ao mockup */}
      <rect x={x} y={y} width={width} height={height} fill="#ffffff" />
      <rect
        className="mapa-sala-fundo"
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={fillOpacity}
      />

      {visual === 'pendente' && (
        <rect
          className="mapa-fade"
          x={x}
          y={y}
          width={width}
          height={height}
          fill="url(#hachura-pendente)"
          pointerEvents="none"
        />
      )}
      {visual === 'bloqueada' && (
        <rect
          className="mapa-fade"
          x={x}
          y={y}
          width={width}
          height={height}
          fill="url(#hachura-bloqueada)"
          pointerEvents="none"
        />
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

      {/* Entrada do bloco: o quadrado onde o turno começa. Sem pino próprio —
          quem marca a posição é o do jogador, que nasce exatamente aqui.
          Texto e seta ficam fora da faixa do corredor, para o pino não cobri-los. */}
      {room.kind === 'entrada' && (
        <g pointerEvents="none">
          <rect
            x={x + 8}
            y={y + 8}
            width={width - 16}
            height={height - 16}
            rx={3}
            fill="none"
            stroke="#4f7df3"
            strokeWidth={1.25}
            strokeDasharray="5 4"
            opacity={0.6}
          />
          <text
            x={cx}
            y={cy - 34}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#25405f"
          >
            INÍCIO
          </text>
          {/* Sentido do percurso: o bloco se estende para oeste */}
          <line
            x1={x + 20}
            x2={x + width - 20}
            y1={cy + 36}
            y2={cy + 36}
            stroke="#4f7df3"
            strokeWidth={1.25}
            opacity={0.55}
          />
          <path d={`M ${x + 14} ${cy + 36} l 8 -4 l 0 8 z`} fill="#4f7df3" opacity={0.7} />
        </g>
      )}

      {/* Caixa de escada: lance e contralance em volta de um núcleo central */}
      {room.kind === 'escada' && (
        <g pointerEvents="none">
          {(() => {
            const larguraNucleo = 30;
            const alturaNucleo = 34;
            const nx = x + larguraNucleo;
            const ny = y + alturaNucleo;
            const nLargura = width - larguraNucleo * 2;
            const nAltura = height - alturaNucleo * 2;
            const traco = { stroke: PAREDE, strokeWidth: 0.9, opacity: 0.5 } as const;
            return (
              <>
                {/* Lance lateral, oposto ao corredor */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`l${i}`}
                    x1={x}
                    x2={nx}
                    y1={ny + (nAltura / 6) * (i + 1)}
                    y2={ny + (nAltura / 6) * (i + 1)}
                    {...traco}
                  />
                ))}
                {/* Lances de topo e base */}
                {[y, ny + nAltura].map((inicioY, lado) =>
                  Array.from({ length: 5 }).map((_, i) => (
                    <line
                      key={`t${lado}-${i}`}
                      x1={nx + (nLargura / 5) * (i + 1)}
                      x2={nx + (nLargura / 5) * (i + 1)}
                      y1={inicioY}
                      y2={inicioY + alturaNucleo}
                      {...traco}
                    />
                  )),
                )}
                {/* Núcleo central */}
                <rect
                  x={nx}
                  y={ny}
                  width={nLargura}
                  height={nAltura}
                  rx={4}
                  fill="#ffffff"
                  fillOpacity={0.45}
                  stroke={PAREDE}
                  strokeWidth={1.5}
                />
                {/* Sentido de subida, contornando o núcleo até o patamar */}
                <path
                  d={`M ${x + larguraNucleo / 2} ${y + height - 12} L ${x + larguraNucleo / 2} ${y + 12} L ${nx + nLargura + 8} ${y + 12}`}
                  fill="none"
                  stroke={PAREDE}
                  strokeWidth={1.1}
                  opacity={0.6}
                />
                <path
                  d={`M ${nx + nLargura + 15} ${y + 12} l -7 -4 l 0 8 z`}
                  fill={PAREDE}
                  opacity={0.6}
                />
              </>
            );
          })()}
        </g>
      )}

      {/* Cabines dos banheiros, encostadas na parede oeste como no original */}
      {room.kind === 'wc' &&
        (() => {
          const bandaY = room.side === 'top' ? y : y + reservada;
          const bandaH = height - reservada;
          const passo = (bandaH - 12) / 3;
          return Array.from({ length: 3 }).map((_, index) => (
          <rect
            key={index}
            x={x + 5}
            y={bandaY + 6 + index * passo}
            width={15}
            height={passo - 4}
            fill="#48a39a"
            stroke={PAREDE}
            strokeWidth={1}
            pointerEvents="none"
          />
          ));
        })()}

      {/* Vão e folha da porta, exatamente na posição usada no cálculo */}
      {room.kind !== 'escada' && room.kind !== 'entrada' && (
      <>
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
      </>
      )}

      {/* Rótulo em duas linhas: nome e minutos, como no mockup */}
      {room.kind !== 'entrada' && (
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
      )}

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
        <g className="mapa-selo" pointerEvents="none">
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
        <g className="mapa-selo" pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#f0b429" />
          <path d={`M ${x + width - 12} ${y + 5} a 7 7 0 0 0 0 14 z`} fill="#4a2f02" />
        </g>
      )}
      {visual === 'bloqueada' && (
        <g className="mapa-selo" pointerEvents="none">
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
