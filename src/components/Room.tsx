import type { RoomDef, RoomState, RoomTone } from '../domain/types';
import escada from '../assets/escada-mapa.jpg';

/**
 * Ilustração do interior. Só a escada tem arte: nas salas, a ilustração
 * poluía o mapa, e a cor lisa por tipo (a da legenda) lê melhor.
 * `portaNaDireita`: a arte deixa livre o canto de baixo à direita, onde fica a
 * porta; com a porta à esquerda, ela é espelhada na horizontal.
 */
const ARTE: Partial<Record<RoomTone, { src: string; portaNaDireita?: boolean }>> = {
  escada: { src: escada },
};

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
/** Parede grossa, como numa planta de jogo: azul-marinho, com filete claro. */
const PAREDE_GROSSA = '#1f2a3a';
const ESPESSURA = 5;
/** Largura do vão da porta, em px. */
const VAO = 18;

/**
 * Folha de porta aberta a 90°, vista de cima: dobradiça em (hx, py), folha
 * entrando no ambiente (dirY) e arco tracejado até o outro batente (dirX).
 */
function folhaDePorta(hx: number, py: number, dirX: number, dirY: number, tamanho: number) {
  const ponta = py + dirY * tamanho;
  const sweep = dirX * dirY < 0 ? 1 : 0;
  return (
    <g pointerEvents="none">
      <path
        d={`M ${hx} ${ponta} A ${tamanho} ${tamanho} 0 0 ${sweep} ${hx + dirX * tamanho} ${py}`}
        fill="none"
        stroke="#5b4a3a"
        strokeWidth={0.9}
        strokeDasharray="2.2 1.8"
        opacity={0.75}
      />
      <rect
        x={dirX > 0 ? hx : hx - 3}
        y={dirY < 0 ? ponta : py}
        width={3}
        height={tamanho}
        rx={0.8}
        fill="#d08a45"
        stroke="#3b2410"
        strokeWidth={0.8}
      />
    </g>
  );
}

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
  /** Minutos a mais ou a menos deixados nesta sala por decisões em outras. */
  modificador?: number;
  onSelect: (roomId: string) => void;
  /** Avisa o mapa qual ambiente está sob o cursor, para a prévia da rota. */
  onHover?: (roomId: string | null) => void;
  /** Altura do corredor: escada e entrada o atravessam e deixam a parede aberta ali. */
  corredorAltura?: number;
};

export function Room({
  room,
  roomState,
  geometry,
  visual,
  minutesUntilFree,
  cleaningMinutes,
  modificador = 0,
  reservedDepth = 0,
  onSelect,
  onHover,
  corredorAltura = 52,
}: Props) {
  const interactive = visual === 'disponivel' || visual === 'pendente' || visual === 'apoio';
  const { x, y, width, height, doorX } = geometry;
  const cx = x + width / 2;
  const cy = y + height / 2;
  /* Centro do vão da porta: a posição do cálculo, afastada da parede vizinha
     o bastante para a folha não ficar embaixo dela (só desenho). */
  const portaX = Math.min(Math.max(doorX, x + ESPESSURA + VAO / 2), x + width - ESPESSURA - VAO / 2);
  /* No depósito, o rótulo se afasta da porta para a folha dela aparecer. */
  const xRotulo = room.kind === 'deposito' ? (doorX > cx ? x + 24 : x + width - 24) : cx;
  /* Rótulo no centro da parte maior: num bloco subdividido, a sala de trás. */
  const cyRotulo = room.subdivisao
    ? room.side === 'top'
      ? y + (height * (1 - room.subdivisao)) / 2
      : y + height * room.subdivisao + (height * (1 - room.subdivisao)) / 2
    : cy;
  const tall = height > 50;
  /* Faixa junto ao corredor tomada por um ambiente aninhado (ex.: o depósito
     dentro do banheiro). As cabines recuam para não invadi-la. */
  const reservada = reservedDepth * height;

  /* O estado muda saturação e contorno; a planta segue clara em todos eles. */
  const fill = TONE[room.tone];
  const arte = ARTE[room.tone];
  const fillOpacity = visual === 'concluida' ? 0.4 : visual === 'bloqueada' ? 0.3 : 1;
  const strokeWidth = visual === 'destino' ? 3 : visual === 'pendente' ? 2.5 : 1.75;
  /* Estado (destino, pendente, hover) numa linha por dentro da parede: a
     parede em si fica sempre igual, como numa planta. */
  const corEstado = visual === 'destino' ? '#4f7df3' : visual === 'pendente' ? '#e08a1e' : 'transparent';
  const inset = ESPESSURA / 2 + 1.5;

  /* Contorno da parede. Escada e entrada atravessam o corredor: o lado por
     onde ele entra fica aberto na altura do corredor. */
  const paredePath = (() => {
    if (!room.straddlesCorridor) return null;
    const abreDireita = room.kind === 'escada';
    const g1 = cy - corredorAltura / 2;
    const g2 = cy + corredorAltura / 2;
    const x0 = x;
    const x1 = x + width;
    const y0 = y;
    const y1 = y + height;
    return abreDireita
      ? `M ${x1} ${g1} V ${y0} H ${x0} V ${y1} H ${x1} V ${g2}`
      : `M ${x0} ${g1} V ${y0} H ${x1} V ${y1} H ${x0} V ${g2}`;
  })();
  const textoEscuro = visual === 'bloqueada' ? '#5b6472' : '#16232b';
  const delegada = Boolean(roomState.delegatedUntil) && visual !== 'concluida';
  const adiada = Boolean(roomState.deferredSituationId) && visual === 'disponivel';
  const revelada = Boolean(roomState.previewSituationId) && visual === 'disponivel';

  const aria =
    `${room.name}. ` +
    (visual === 'concluida'
      ? 'Concluída.'
      : visual === 'pendente'
        ? `Pendente, restam ${roomState.residualMinutes} minutos.`
        : delegada
          ? `Com um colega, pronta em cerca de ${Math.ceil(minutesUntilFree)} minutos.`
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
      {arte ? (
        <>
          <clipPath id={`arte-${room.id}`}>
            <rect x={x} y={y} width={width} height={height} />
          </clipPath>
          <image
            href={arte.src}
            x={x}
            y={y}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#arte-${room.id})`}
            transform={(() => {
              const espelhaX = arte.portaNaDireita && doorX < cx;
              const espelhaY = room.side === 'bottom';
              if (!espelhaX && !espelhaY) return undefined;
              return `matrix(${espelhaX ? -1 : 1} 0 0 ${espelhaY ? -1 : 1} ${espelhaX ? 2 * cx : 0} ${espelhaY ? 2 * cy : 0})`;
            })()}
            pointerEvents="none"
          />
          {/* Com ilustração, o estado vira um véu: claro quando concluída,
              escuro quando fechada. Disponível fica com a arte pura. */}
          {(visual === 'concluida' || visual === 'bloqueada') && (
            <rect
              className="mapa-sala-fundo"
              x={x}
              y={y}
              width={width}
              height={height}
              fill={visual === 'concluida' ? '#ffffff' : '#1e2733'}
              fillOpacity={visual === 'concluida' ? 0.55 : 0.4}
            />
          )}
        </>
      ) : (
        <rect
          className="mapa-sala-fundo"
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={fillOpacity}
        />
      )}

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

      {/* Parede grossa */}
      {paredePath ? (
        <path d={paredePath} fill="none" stroke={PAREDE_GROSSA} strokeWidth={ESPESSURA} strokeLinecap="square" pointerEvents="none" />
      ) : (
        <rect x={x} y={y} width={width} height={height} fill="none" stroke={PAREDE_GROSSA} strokeWidth={ESPESSURA} pointerEvents="none" />
      )}
      {/* Filete claro por dentro, que dá volume à parede */}
      {!paredePath && (
        <rect
          x={x + ESPESSURA / 2}
          y={y + ESPESSURA / 2}
          width={Math.max(0, width - ESPESSURA)}
          height={Math.max(0, height - ESPESSURA)}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.35}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      {/* Estado e hover: linha colorida por dentro da parede */}
      <rect
        className="mapa-alvo-parede"
        x={x + inset}
        y={y + inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        fill="none"
        stroke={corEstado}
        strokeWidth={strokeWidth}
        pointerEvents="none"
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
      {room.kind === 'escada' && !arte && (
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
      {room.kind === 'wc' && !arte &&
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

      {/* Bloco com duas salas na planta real (S1/S7): junto ao corredor, o PET
          à esquerda e um corredorzinho à direita, da largura da porta. A
          entrada pelo corredor é só uma abertura; a porta fica no fim do
          corredorzinho e dá na sala dos professores, atrás. No jogo, um
          objetivo só. */}
      {room.subdivisao && (() => {
        const fundoPET = height * room.subdivisao;
        const paredeCorredor = room.side === 'top' ? y + height : y;
        const yInterna = room.side === 'top' ? paredeCorredor - fundoPET : paredeCorredor + fundoPET;
        const xPassagem = portaX - VAO / 2 - 1;
        const larguraPassagem = x + width - xPassagem;
        const dentro = room.side === 'top' ? -1 : 1;
        return (
          <g pointerEvents="none">
            {/* O corredorzinho tem o piso do corredor: é passagem, não sala. */}
            <rect
              x={xPassagem}
              y={Math.min(paredeCorredor, yInterna)}
              width={larguraPassagem}
              height={fundoPET}
              fill="url(#piso-corredor)"
            />
            <g stroke={PAREDE_GROSSA} strokeWidth={ESPESSURA * 0.7}>
              {/* Fundo do PET */}
              <line x1={x} x2={xPassagem} y1={yInterna} y2={yInterna} />
              {/* Entre o PET e o corredorzinho */}
              <line x1={xPassagem} x2={xPassagem} y1={paredeCorredor} y2={yInterna} />
            </g>
            {/* A porta dos professores, no fim do corredorzinho */}
            {folhaDePorta(xPassagem + 1.5, yInterna, 1, dentro, Math.min(VAO, larguraPassagem - ESPESSURA))}
          </g>
        );
      })()}

      {/* Vão da porta no corredor, na posição usada no cálculo (só afastada o
          suficiente da parede vizinha para a folha não sumir embaixo dela). */}
      {room.kind !== 'escada' && room.kind !== 'entrada' && (
      <>
      <rect
        x={portaX - VAO / 2}
        y={room.side === 'top' ? y + height - ESPESSURA / 2 - 1 : y - ESPESSURA / 2 - 1}
        width={VAO}
        height={ESPESSURA + 2}
        fill="url(#piso-corredor)"
        pointerEvents="none"
      />
      {/* Folha aberta para dentro, com a dobradiça do lado da parede mais
          próxima. No bloco S1/S7 a entrada é só a abertura do corredorzinho.
          O depósito é raso: a folha dele é menor, para não cobrir o rótulo. */}
      {!room.subdivisao && (() => {
        const lado = doorX > cx + 1 ? 1 : -1;
        const paredeY = room.side === 'top' ? y + height : y;
        const dentro = room.side === 'top' ? -1 : 1;
        const tamanho = room.kind === 'deposito' ? 13 : VAO;
        return folhaDePorta(portaX + (VAO / 2) * lado, paredeY, -lado, dentro, tamanho);
      })()}
      </>
      )}

      {/* Plaquinha sob o rótulo: sobre a ilustração, texto solto não se lê. */}
      {arte && (
        <rect
          x={room.kind === 'deposito' ? xRotulo - 18 : cx - Math.min(32, width / 2 - 5)}
          y={room.kind === 'deposito' ? cy - 11 : tall ? cyRotulo - 16 : cyRotulo - 10}
          width={room.kind === 'deposito' ? 36 : Math.min(64, width - 10)}
          height={room.kind === 'deposito' ? 26 : tall ? 37 : 20}
          rx={8}
          fill="#ffffff"
          fillOpacity={0.88}
          stroke="#1e1e1e"
          strokeOpacity={0.15}
          pointerEvents="none"
        />
      )}

      {/* Rótulo em duas linhas: nome e minutos, como no mockup */}
      {room.kind !== 'entrada' && (
      <text
        x={xRotulo}
        y={tall ? cyRotulo - 1 : cyRotulo + 3}
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
          y={cyRotulo + 15}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fontWeight="500"
          fill={visual === 'pendente' ? '#8a5206' : '#3c4a57'}
          pointerEvents="none"
        >
          {visual === 'pendente'
            ? `restam ${cleaningMinutes} min`
            : delegada
              ? `colega · ~${Math.ceil(minutesUntilFree)} min`
              : visual === 'bloqueada'
                ? `~${Math.ceil(minutesUntilFree)} min`
                : adiada
                  ? `adiada · ${cleaningMinutes} min`
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
      {/* Efeito deixado aqui por uma decisão em outra sala: verde barateia,
          laranja encarece. É o que liga uma escolha ao resto da rota. */}
      {modificador !== 0 && visual !== 'concluida' && !delegada && (
        <g className="mapa-selo" pointerEvents="none">
          <rect
            x={x + 4}
            y={y + 4}
            width={modificador < 0 ? 24 : 24}
            height={15}
            rx={7.5}
            fill={modificador < 0 ? '#34d399' : '#f97316'}
          />
          <text
            x={x + 16}
            y={y + 15}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="9.5"
            fontWeight="800"
            fill={modificador < 0 ? '#06281c' : '#3a1602'}
          >
            {modificador < 0 ? `−${-modificador}` : `+${modificador}`}
          </text>
        </g>
      )}
      {delegada && (
        <g className="mapa-selo" pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#4f7df3" />
          <circle cx={x + width - 12} cy={y + 9.5} r={2.3} fill="#ffffff" />
          <path d={`M ${x + width - 16.5} ${y + 17} a 4.5 4 0 0 1 9 0 z`} fill="#ffffff" />
        </g>
      )}
      {adiada && (
        <g className="mapa-selo" pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#f0b429" />
          <text
            x={x + width - 12}
            y={y + 15.5}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="10"
            fontWeight="800"
            fill="#4a2f02"
          >
            !
          </text>
        </g>
      )}
      {revelada && (
        <g className="mapa-selo" pointerEvents="none">
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="#4f7df3" />
          <text
            x={x + width - 12}
            y={y + 15.5}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="10"
            fontWeight="800"
            fill="#ffffff"
          >
            i
          </text>
        </g>
      )}
      {visual === 'bloqueada' && !delegada && (
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
          x={xRotulo}
          y={cy + 11}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="7"
          fontWeight="600"
          fill="#4a3d6b"
          pointerEvents="none"
        >
          {visual === 'bloqueada' ? 'FECHADO' : 'RECARGA'}
        </text>
      )}
    </g>
  );
}
