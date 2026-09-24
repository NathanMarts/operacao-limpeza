import { useMemo, useState } from 'react';
import {
  DEPOSITO_POSITION,
  ENTRADA_DESENHO_M,
  ENTRANCE_POSITION,
  buildingSpanMeters,
  buildingStartMeters,
  desenhoDaPorta,
  rooms,
  roomsById,
} from '../data/rooms';
import { formatMeters, formatMinutes } from '../domain/effects';
import { modificadorDaSala, nomesDasSalas } from '../domain/mapa';
import enceradeiraIcone from '../assets/enceradeira-mapa.png';
import { precisaSairParaVoltar } from '../domain/game';
import { distanceBetween, travelMinutes } from '../domain/movement';
import type { GameState, LogEntry } from '../domain/types';
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
/* A prévia corre SOBRE a régua, no mesmo trilho do trajeto: é a mesma pergunta
   ("quanto tenho de andar?"), medida na mesma linha. O pontilhado e a cor de
   ação a distinguem do trecho já percorrido, que é sólido. */
const PREVIA_Y = COTA_LINE_Y;

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

/**
 * Consequência de uma decisão, ancorada no ambiente que a recebeu. Os valores
 * vêm do próprio LogEntry — os mesmos que a tela final usa para explicar o
 * total —, então não há número inventado aqui. Máximo de três: tempo, material
 * e deslocamento. Estado da sala não entra, porque o próprio ambiente já muda.
 */
type Delta = { texto: string; cor: string };

const COR_DELTA = {
  tempo: '#f0b429',
  material: '#4f7df3',
  deslocamento: '#93a7b8',
  bom: '#34d399',
  /* Mesmos hex já usados no mapa: o âmbar da pendência é o da hachura e do
     selo; o cinza-azulado do bloqueio é o --color-txt-2 do tema. Nenhuma cor
     nova entra aqui. Pendência/bloqueio nunca coexistem com tempo ou
     deslocamento numa mesma leva, então não há ambiguidade de moeda. */
  pendencia: '#f0b429',
  bloqueio: '#93a7b8',
} as const;

function deltasDoLog(entry: LogEntry | null): Delta[] {
  if (!entry) return [];
  const lista: Delta[] = [];

  const minutos = entry.deltaCleaning + entry.deltaEvent + entry.deltaIdle;
  if (minutos > 0) lista.push({ texto: `+${formatMinutes(minutos)} min`, cor: COR_DELTA.tempo });

  if (entry.deltaCharges < 0) {
    const n = -entry.deltaCharges;
    lista.push({ texto: `−${n} ${n === 1 ? 'carga' : 'cargas'}`, cor: COR_DELTA.material });
  } else if (entry.deltaCharges > 0) {
    lista.push({ texto: `+${entry.deltaCharges} cargas`, cor: COR_DELTA.bom });
  }

  if (entry.deltaDistance > 0 && lista.length < 3) {
    lista.push({ texto: `+${formatMeters(entry.deltaDistance)} m`, cor: COR_DELTA.deslocamento });
  }

  return lista.slice(0, 3);
}

/**
 * Abatimentos de bônus aplicados nesta ação.
 *
 * O domínio já os calcula e registra, mas só dentro de `LogEntry.detail`, como
 * prosa — e `deltaCharges` chega LÍQUIDO. Então uma limpeza inteiramente paga
 * por um bônus não produzia pílula nenhuma: o jogador via o material não
 * descer e não tinha como saber por quê. A tela final mostra o log; aqui o
 * abatimento precisa aparecer no instante em que acontece.
 *
 * Formato produzido pelo domínio: "<ação> · <bônus>: −<n> carga|cargas|min",
 * trechos separados por " · ". Ler daqui é apresentação: nenhum cálculo é
 * refeito, e o número exibido é exatamente o que o domínio abateu.
 */
function abatimentosDoLog(entry: LogEntry | null): Delta[] {
  if (!entry?.detail) return [];
  const achados: Delta[] = [];
  for (const trecho of entry.detail.split(' · ')) {
    const corte = trecho.indexOf(': −');
    if (corte < 0) continue;
    const resto = trecho.slice(corte + 3).trim();
    const espaco = resto.indexOf(' ');
    if (espaco < 0) continue;
    const valor = resto.slice(0, espaco);
    const unidade = resto.slice(espaco + 1);
    if (!Number.isFinite(Number(valor.replace(',', '.')))) continue;
    achados.push({
      texto:
        unidade === 'min'
          ? `${valor} min poupados`
          : `${valor} ${unidade} poupada${unidade === 'carga' ? '' : 's'}`,
      cor: COR_DELTA.bom,
    });
  }
  return achados;
}

/**
 * Feedback para as ações que não cobram nada agora e criam consequência
 * futura — adiar, pular, interditar, esperar. Elas não têm delta numérico, e
 * sem isto o jogador escolhia postergar e não recebia resposta nenhuma, que é
 * justamente a decisão mais importante do jogo.
 *
 * Todos os números vêm do estado real do ambiente depois da ação: residual da
 * pendência, minutos de bloqueio, sujeira acumulada. Nada é inventado, e nunca
 * aparece "+0 min". Uma pílula só.
 */
function consequenciaFutura(
  entry: LogEntry | null,
  state: GameState,
  minutosAteLiberar: (roomId: string) => number,
  totalAgora: number,
): Delta | null {
  if (!entry?.roomId) return null;
  const rs = state.rooms[entry.roomId];
  if (!rs) return null;

  if (rs.blockedUntilMinute !== null && rs.blockedUntilMinute > totalAgora) {
    const min = Math.ceil(minutosAteLiberar(entry.roomId));
    return { texto: `bloqueada ${min} min`, cor: COR_DELTA.bloqueio };
  }
  if (rs.status === 'pendente') {
    return { texto: `↩ voltar: ${rs.residualMinutes} min`, cor: COR_DELTA.pendencia };
  }
  if (rs.status === 'nao-iniciada' && rs.extraDirtMinutes > 0) {
    return { texto: `adiada: +${rs.extraDirtMinutes} min`, cor: COR_DELTA.pendencia };
  }
  if (rs.status === 'nao-iniciada') {
    return { texto: 'sala intocada', cor: COR_DELTA.deslocamento };
  }
  return null;
}

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
function TrailLeg({ leg, y, desenhando }: { leg: Leg; y: number; desenhando: boolean }) {
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
          {/* Enquanto o trabalhador caminha, a linha vai sendo traçada do
              ponto de partida até o destino — o trecho aparece na mesma
              velocidade do pino. Revendo um trecho antigo, ela já está lá. */}
          <line
            x1={leg.x1}
            x2={leg.x2}
            y1={y}
            y2={y}
            stroke={cor}
            strokeWidth={3}
            strokeLinecap="round"
            className={desenhando ? 'trilha-desenha' : undefined}
            style={
              desenhando
                ? ({
                    strokeDasharray: Math.abs(leg.x2 - leg.x1),
                    '--trilha-len': `${Math.abs(leg.x2 - leg.x1)}`,
                  } as React.CSSProperties)
                : undefined
            }
          />
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
  const roomState = state.rooms[roomId];
  /* O depósito também fecha (piso alagado escorrendo para o ralo dele). */
  if (room.kind === 'deposito' && roomState.blockedUntilMinute !== null && roomState.blockedUntilMinute > totalNow) {
    return 'bloqueada';
  }
  if (room.kind === 'deposito' || room.kind === 'entrada') return 'apoio';

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
  /** O trabalhador está atravessando o corredor agora. */
  caminhando?: boolean;
  /** Última entrada do log, de onde saem os deltas da decisão. */
  ultimoLog?: LogEntry | null;
};

export function BuildingMap({
  state,
  totalMinutes,
  showRoute,
  selectedStep,
  cleaningMinutesFor,
  minutesUntilFree,
  onSelect,
  caminhando = false,
  ultimoLog = null,
}: Props) {
  /* Ambiente sob o cursor: só ele recebe a prévia da rota. */
  const [emHover, setEmHover] = useState<string | null>(null);
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

/**
   * Prévia da rota: em vez de desenhar uma linha nova, acende o pedaço da
   * RÉGUA que o trabalhador vai cruzar até o ambiente sob o cursor — trechos,
   * setas, cotas e marcos. O badge mostra a soma, então o jogador vê de onde
   * vem o número: são aqueles trechos, somados.
   */
  const previa = useMemo(() => {
    if (!emHover || caminhando) return null;
    const room = roomsById[emHover];
    if (!room) return null;
    const metros = distanceBetween(state.currentPosition, room.corridorPosition);
    if (metros === 0) return null;
    const de = Math.min(state.currentPosition, room.corridorPosition);
    const ate = Math.max(state.currentPosition, room.corridorPosition);
    return {
      metros,
      de,
      ate,
      /* Um trecho conta se estiver inteiro dentro do intervalo; um marco
         conta se cair nele, pontas incluídas. */
      temTrecho: (inicio: number, fim: number) =>
        Math.min(inicio, fim) >= de && Math.max(inicio, fim) <= ate,
      temMarco: (posicao: number) => posicao >= de && posicao <= ate,
      meio: (xDaPosicao(de) + xDaPosicao(ate)) / 2,
    };
  }, [emHover, caminhando, state.currentPosition]);

  const deltas = useMemo(() => {
    const numericos = deltasDoLog(ultimoLog);
    const poupados = abatimentosDoLog(ultimoLog);
    if (poupados.length > 0) {
      /* O abatimento é o motivo desta pílula existir: ele não pode ser o
         pedaço descartado pelo limite de três. O deslocamento cede o lugar —
         ele já aparece na pílula do próprio trecho da trilha. */
      const semTrajeto = numericos.filter((d) => d.cor !== COR_DELTA.deslocamento);
      return [...semTrajeto, ...poupados].slice(0, 3);
    }
    if (numericos.length > 0) return numericos;
    const futura = consequenciaFutura(ultimoLog, state, minutesUntilFree, totalMinutes);
    return futura ? [futura] : [];
  }, [ultimoLog, state, minutesUntilFree, totalMinutes]);

  /* Só deslocamento: a pílula acaba quando o pino chega, antes de a cena
     da situação cobrir o mapa. */
  const soTrajeto =
    !!ultimoLog &&
    ultimoLog.deltaDistance > 0 &&
    ultimoLog.deltaCleaning + ultimoLog.deltaEvent + ultimoLog.deltaIdle === 0 &&
    ultimoLog.deltaCharges === 0;

  /**
   * Os deltas saem em FILEIRA horizontal, a 30px do corredor, centrados na
   * porta do ambiente.
   *
   * Em fileira a ordem é esquerda→direita, igual nas duas alas — uma pilha
   * vertical invertia a leitura na ala sul, porque lá ela cresce para baixo.
   * E 30px é a única faixa livre nos dois lados: o selo de estado ocupa 4–20px
   * (ele fica junto ao corredor nas salas da ala sul) e o nome da sala fica em
   * 60px. Assim as pílulas não cobrem nem um nem outro, em ambiente nenhum.
   */
  const ancora = useMemo(() => {
    if (!ultimoLog?.roomId) return null;
    const room = roomsById[ultimoLog.roomId];
    if (!room) return null;
    const paraBaixo = room.side === 'bottom';
    return {
      x: xDaPosicao(room.corridorPosition),
      y: CENTER_Y + (paraBaixo ? CORRIDOR_HEIGHT / 2 + 30 : -CORRIDOR_HEIGHT / 2 - 30),
    };
  }, [ultimoLog]);

  const precisaSair = precisaSairParaVoltar(state);
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
      {/* Durante a caminhada o bloco não aceita novo destino: o trabalhador
          está no corredor, não parado escolhendo. */}
      <g style={caminhando ? { pointerEvents: 'none' } : undefined}>
      {rooms.map((room) => (
        <Room
          key={room.id}
          room={room}
          roomState={state.rooms[room.id]}
          geometry={geometryFor(room)}
          visual={visualStateOf(state, room.id, totalMinutes)}
          minutesUntilFree={minutesUntilFree(room.id)}
          cleaningMinutes={cleaningMinutesFor(room.id)}
          modificador={room.cleanable ? modificadorDaSala(state, room.id) : 0}
          reservedDepth={FAIXA_ANINHADA[room.id] ?? 0}
          onSelect={onSelect}
          onHover={setEmHover}
        />
      ))}
      </g>

      {/* ---- Depósito com material baixo ----
          Anel lento em volta da porta do DEP quando o carrinho não tem mais o
          suficiente para o serviço. Sugere planejar a ida, sem piscar. */}
      {(state.charges <= 3 || precisaSair) && (
        <g pointerEvents="none">
          {[0, 1].map((i) => (
            <circle
              key={i}
              className="dep-anel"
              style={{ animationDelay: `${i * 1000}ms` }}
              cx={xDaPosicao(DEPOSITO_POSITION)}
              cy={CENTER_Y + COTA_LINE_Y}
              r={12}
              fill="none"
              stroke="#4f7df3"
              strokeWidth={1.75}
            />
          ))}
        </g>
      )}


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
        const noPercurso = previa?.temTrecho(segmento.inicio, segmento.fim) ?? false;
        return (
          <g className="regua-trecho" key={segmento.inicio} pointerEvents="none">
            <line
              x1={xInicio + sentido * (MARCO_RAIO + 3)}
              x2={xFim - sentido * (MARCO_RAIO + 6)}
              y1={CENTER_Y + COTA_LINE_Y}
              y2={CENTER_Y + COTA_LINE_Y}
              stroke={noPercurso ? '#2f6fe0' : '#8d8d8d'}
              strokeWidth={noPercurso ? 2 : 1}
            />
            <path
              d={`M ${xFim - sentido * (MARCO_RAIO + 1)} ${CENTER_Y + COTA_LINE_Y} l ${-sentido * 5} -3 l 0 6 z`}
              fill={noPercurso ? '#2f6fe0' : '#8d8d8d'}
            />
            <text
              x={meio}
              y={CENTER_Y + COTA_TEXT_Y}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="9"
              fontWeight={noPercurso ? 700 : 500}
              fill={noPercurso ? '#2f6fe0' : '#4d4d4d'}
            >
              {`${formatMeters(segmento.metros)}m`}
            </text>
          </g>
        );
      })}

      {/* ---- Marcos das distâncias ---- */}
      {MARCOS.map((metros) => {
        const noPercurso = previa?.temMarco(metros) ?? false;
        return (
          <circle
            className="regua-marco"
            key={metros}
            cx={xDaPosicao(metros)}
            cy={CENTER_Y + COTA_LINE_Y}
            r={noPercurso ? MARCO_RAIO + 0.75 : MARCO_RAIO}
            fill={noPercurso ? '#2f6fe0' : '#6f6f6f'}
            stroke="#d5d4d4"
            strokeWidth={1}
            pointerEvents="none"
          />
        );
      })}


      {/* ---- Última sala: saia e volte ----
          Só falta o ambiente em que o trabalhador está, e para voltar a ele é
          preciso sair. O mapa mostra a volta pelo depósito e quanto ela custa:
          o clique continua sendo no depósito, como em qualquer ida. */}
      {precisaSair && (() => {
        const xSala = xDaPosicao(precisaSair.corridorPosition);
        const xDep = xDaPosicao(DEPOSITO_POSITION);
        const y = CENTER_Y + CORRIDOR_HEIGHT / 2 - 7;
        const metros = 2 * distanceBetween(precisaSair.corridorPosition, DEPOSITO_POSITION);
        const meio = (xSala + xDep) / 2;
        const sentido = Math.sign(xDep - xSala) || 1;
        const texto = `↩ saia e volte · ${formatMeters(metros)} m · ${formatMinutes(travelMinutes(metros))} min`;
        const largura = texto.length * 5.2 + 16;
        const ySelo = precisaSair.side === 'top' ? CENTER_Y - CORRIDOR_HEIGHT / 2 + 9 : CENTER_Y + CORRIDOR_HEIGHT / 2 - 9;
        return (
          <g className="saia-e-volte" pointerEvents="none" aria-label={`Para voltar a ${precisaSair.name}, vá ao depósito e volte`}>
            <line x1={xSala} x2={xDep} y1={y} y2={y} stroke="#e08a1e" strokeWidth={1.75} strokeDasharray="5 4" />
            {/* Setas nas duas pontas: vai ao depósito e volta. */}
            <path d={`M ${xDep - sentido * 7} ${y - 4} L ${xDep} ${y} L ${xDep - sentido * 7} ${y + 4}`} fill="none" stroke="#e08a1e" strokeWidth={1.75} />
            <path d={`M ${xSala + sentido * 7} ${y - 4} L ${xSala} ${y} L ${xSala + sentido * 7} ${y + 4}`} fill="none" stroke="#e08a1e" strokeWidth={1.75} />
            <rect x={meio - largura / 2} y={y - 8} width={largura} height={16} rx={8} fill="#2a1a05" stroke="#e08a1e" strokeWidth={1} />
            <text x={meio} y={y + 3.5} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#ffc46b">
              {texto}
            </text>
            <circle cx={xSala} cy={ySelo} r={4} fill="#e08a1e" />
          </g>
        );
      })()}

      {/* ---- Material parado no corredor ----
          Caixa no ponto exato: quem passar por ali recolhe. É o recurso que
          uma decisão deixou no mapa, e ele precisa estar à vista para pesar
          na escolha da rota. */}
      {state.stashes.map((stash) => {
        const x = xDaPosicao(stash.position);
        return (
          <g key={stash.id} pointerEvents="none" aria-label={`${stash.label}: ${stash.charges} cargas no corredor`}>
            <rect x={x - 10} y={CENTER_Y - 24} width={20} height={14} rx={2} fill="#f0b429" stroke="#6b4a00" strokeWidth={1} />
            <line x1={x - 10} x2={x + 10} y1={CENTER_Y - 19.5} y2={CENTER_Y - 19.5} stroke="#6b4a00" strokeWidth={1} />
            <rect x={x + 12} y={CENTER_Y - 24} width={22} height={14} rx={7} fill="#0b1220" opacity={0.9} />
            <text x={x + 23} y={CENTER_Y - 14} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="800" fill="#f0b429">
              {`+${stash.charges}`}
            </text>
          </g>
        );
      })}

      {/* ---- Equipamento estacionado ----
          A máquina deixada num ponto do corredor (enceradeira, lavadora):
          objeto físico, à esquerda da caixa de material para as duas não se
          cobrirem. A etiqueta diz o efeito, e o mouse por cima diz o resto. */}
      {state.modifiers
        .filter((mod) => mod.equipment && mod.targets.length > 0)
        .map((mod) => {
          const x = xDaPosicao(mod.equipment!.position) - 26;
          const efeito = `${mod.minutes < 0 ? '−' : '+'}${Math.abs(mod.minutes)}`;
          const dica = `${mod.equipment!.label} estacionada aqui: ${nomesDasSalas(mod.targets)} ${efeito} min ${mod.targets.length > 1 ? 'cada' : ''}`.trim();
          return (
            <g key={mod.id} className="cursor-help" aria-label={dica}>
              <title>{dica}</title>
              <image href={enceradeiraIcone} x={x - 16} y={CENTER_Y - 44} width={40} height={40} />
            </g>
          );
        })}

      {/* ---- Prévia da rota no hover ----
          Antes de confirmar, o jogador vê quanto vai precisar andar. Pontilhado
          entre a posição atual e o destino, com distância e tempo de caminhada. */}
      {previa && (
        <g className="previa-rota" pointerEvents="none">
          <rect
            x={previa.meio - 34}
            y={CENTER_Y + PREVIA_Y - 7}
            width={68}
            height={14}
            rx={7}
            fill="#101a2b"
            stroke="#4f7df3"
            strokeWidth={1}
          />
          <text
            x={previa.meio}
            y={CENTER_Y + PREVIA_Y + 3.5}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="8.5"
            fontWeight="600"
            fill="#9dc0ff"
          >
            {`${formatMeters(previa.metros)} m · ${formatMinutes(travelMinutes(previa.metros))} min`}
          </text>
        </g>
      )}

      {/* ---- Trecho em exibição: o atual, ou o escolhido na sequência ---- */}
      {showRoute && legVisivel && (
        <TrailLeg
          /* A chave troca a cada parada, então a linha se desenha de novo em
             vez de reaproveitar a animação já terminada.

             O prefixo não é enfeite. O grupo dos deltas, logo abaixo, é irmão
             deste no <svg> e numera pelo log; as duas contagens começam em 1 e
             sobem juntas. Chaves iguais entre irmãos é comportamento indefinido
             no React: uma sobrescreve a outra no mapa de filhos antigos, a
             perdida nunca é marcada para remoção, e o trecho ficava desenhado
             na tela para sempre. */
          key={`trecho-${legVisivel.order}`}
          leg={legVisivel}
          y={CENTER_Y + TRAIL_Y}
          desenhando={caminhando && selectedStep === null}
        />
      )}

      {/* ---- Consequência da última ação, ancorada no ambiente ---- */}
      {deltas.length > 0 && ancora && (
        <g
          key={`delta-${ultimoLog?.index}`}
          className={soTrajeto ? 'delta-sobe-curto' : 'delta-sobe'}
          pointerEvents="none"
        >
          {(() => {
            /* Largura por conteúdo: "+8 min" não precisa do mesmo espaço que
               "↩ voltar: 6 min", e pílula fixa estourava as salas estreitas. */
            const VAO = 5;
            const larguras = deltas.map((d) => Math.max(46, d.texto.length * 5.6 + 16));
            const total = larguras.reduce((a, b) => a + b, 0) + VAO * (deltas.length - 1);
            let cursor = ancora.x - total / 2;
            return deltas.map((delta, i) => {
              const largura = larguras[i];
              const x = cursor;
              cursor += largura + VAO;
              return (
                <g key={delta.texto}>
                  <rect
                    x={x}
                    y={ancora.y - 8}
                    width={largura}
                    height={16}
                    rx={8}
                    fill="#0b1220"
                    opacity={0.92}
                  />
                  <text
                    x={x + largura / 2}
                    y={ancora.y + 3.5}
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                    fontSize="9.5"
                    fontWeight="700"
                    fill={delta.cor}
                  >
                    {delta.texto}
                  </text>
                </g>
              );
            });
          })()}
        </g>
      )}

      {/* ---- Pino de posição atual, do tileset ----
           Fica vermelho quando o carrinho zera: a mesma regra que desabilita a
           limpeza completa vira sinal no mapa, sem o jogador ter que conferir
           o contador no cabeçalho. */}
      <g
        /* A ponta encosta logo acima do marco da posição atual. */
        transform={`translate(${playerX} ${CENTER_Y + COTA_LINE_Y - pinoApoio - 1.5})`}
        style={{ transition: 'transform var(--dur-move) var(--ease-move)' }}
      >
        <PlayerPin variant={state.charges === 0 ? 'sem-material' : 'padrao'} />
      </g>
    </svg>
  );
}
