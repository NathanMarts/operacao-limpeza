/**
 * Pino do jogador, redesenhado em SVG a partir de Prototipo/tileset.png.
 *
 * A arte de referência é um PNG com fundo chapado (alpha ~252 em volta dos
 * pinos), então recortá-la traria um retângulo escuro para cima do corredor
 * claro. Aqui ela vira vetor: escala sem serrilhar, acompanha o tema e mantém
 * o mapa desenhado em vez de colado como imagem.
 *
 * Cores amostradas do tileset.
 */
type Cores = {
  corpo: string;
  halo: string;
  face: string;
  metal: string;
  balde: string;
  cabo: string;
  cabeca: string;
};

const PALETA: Record<'padrao' | 'semMaterial', Cores> = {
  padrao: {
    corpo: '#2889f2',
    halo: '#2e93fd',
    face: '#153460',
    metal: '#a0b9e8',
    balde: '#fece51',
    cabo: '#69acf8',
    cabeca: '#afccf7',
  },
  semMaterial: {
    corpo: '#c4444a',
    halo: '#f4665f',
    face: '#1c222f',
    metal: '#525f7b',
    balde: '#525f7b',
    cabo: '#525f7b',
    cabeca: '#525f7b',
  },
};

export type PinVariant = 'padrao' | 'sem-material';

/* Geometria: ponta em (0,0), disco centrado em (0, DISCO_Y). */
const RAIO = 13;
const DISCO_Y = -22.5;
const FACE = 10;

const GOTA =
  `M 0 0 C -10.6 -11.8 -${RAIO} -16.6 -${RAIO} ${DISCO_Y} ` +
  `a ${RAIO} ${RAIO} 0 0 1 ${RAIO * 2} 0 ` +
  `c 0 5.9 -2.4 10.7 -${RAIO} ${-DISCO_Y} z`;

/** Carrinho de limpeza: rodinha, haste em T, balde e rodo. */
function Carrinho({ cor, completo }: { cor: Cores; completo: boolean }) {
  return (
    <g>
      {/* Haste em T e rodinha, à esquerda */}
      <rect x={-5.4} y={-6.2} width={1.7} height={10.2} rx={0.85} fill={cor.metal} />
      <rect x={-6.8} y={-7} width={5.2} height={1.7} rx={0.85} fill={cor.metal} />
      <circle cx={-4.6} cy={5.4} r={2.3} fill={cor.metal} />
      <circle cx={-4.6} cy={5.4} r={0.85} fill={cor.face} />
      {/* Balde, ocupando o centro como na arte */}
      <rect x={-2.4} y={-2.4} width={8.6} height={6.6} rx={1.1} fill={cor.balde} />

      {completo ? (
        <>
          {/* Cabo desce por cima do balde e termina na cabeça, abaixo dele */}
          <line x1={5.8} y1={-7.2} x2={3} y2={4.4} stroke={cor.cabo} strokeWidth={2} strokeLinecap="round" />
          <path d="M 0.8 7 L 5.2 7 L 4.4 4.4 L 1.6 4.4 Z" fill={cor.cabeca} />
        </>
      ) : (
        /* Sem material: só o cabo solto, sem a cabeça — o carrinho está vazio */
        <line x1={5.8} y1={-7.2} x2={4.2} y2={-2.6} stroke={cor.cabo} strokeWidth={2} strokeLinecap="round" />
      )}
    </g>
  );
}

/** Selo de proibido, como na arte da variante vermelha. */
function SeloProibido({ cor }: { cor: Cores }) {
  return (
    <g>
      <circle cx={3.8} cy={3.6} r={5} fill={cor.face} />
      <circle cx={3.8} cy={3.6} r={3.9} fill="none" stroke={cor.halo} strokeWidth={1.7} />
      <line x1={1.1} y1={6.3} x2={6.5} y2={0.9} stroke={cor.halo} strokeWidth={1.7} strokeLinecap="round" />
    </g>
  );
}

export function PlayerPin({ variant }: { variant: PinVariant }) {
  const semMaterial = variant === 'sem-material';
  const cor = semMaterial ? PALETA.semMaterial : PALETA.padrao;

  return (
    <g>
      {/* Gota: halo por fora, corpo por dentro */}
      <path d={GOTA} fill={cor.corpo} stroke={cor.halo} strokeWidth={2.2} strokeLinejoin="round" />
      {/* Face escura onde o ícone vive */}
      <circle cx={0} cy={DISCO_Y} r={FACE} fill={cor.face} />
      <g transform={`translate(0 ${DISCO_Y})`}>
        <Carrinho cor={cor} completo={!semMaterial} />
        {semMaterial && <SeloProibido cor={PALETA.semMaterial} />}
      </g>
    </g>
  );
}
