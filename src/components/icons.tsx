import {
  Ban,
  BarChart3,
  Check,
  Circle,
  CircleCheck,
  CircleAlert,
  CircleDashed,
  Clock,
  Compass,
  Flag,
  Footprints,
  Handshake,
  Hourglass,
  Lightbulb,
  ListOrdered,
  Lock,
  Maximize2,
  Minimize2,
  Map,
  MapPin,
  Moon,
  Package,
  Palette,
  PiggyBank,
  RotateCcw,
  Scale,
  Signpost,
  Sparkles,
  SprayCan,
  Sun,
  Target,
  TrendingUp,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ConsequenceKind } from '../domain/effects';
import type { Estrategia } from '../data/actionVisuals';
import acaoImediata from '../assets/acao-imediata.png';
import ajudaCooperacao from '../assets/ajuda-cooperacao.png';
import beneficioFuturo from '../assets/beneficio-futuro.png';
import bloqueioInterdicao from '../assets/bloqueio-interdicao.png';
import concluirResolver from '../assets/concluir-resolver.png';
import deslocamentoDesvio from '../assets/deslocamento-desvio.png';
import economizarMaterial from '../assets/economizar-material.png';
import esperarAdiar from '../assets/esperar-adiar.png';

/**
 * Único lugar que traduz significado em ícone. Os componentes pedem por papel
 * ("tempo", "material"), nunca pelo nome do desenho — trocar a biblioteca é
 * mexer só aqui.
 */
export const Icon = {
  marca: SprayCan,
  mapa: Map,
  instrucoes: Compass,
  tempo: Clock,
  distancia: Footprints,
  material: Package,
  objetivo: Target,
  legenda: Palette,
  dica: Lightbulb,
  sequencia: ListOrdered,
  resumo: BarChart3,
  expandir: Maximize2,
  recolher: Minimize2,
  reiniciar: RotateCcw,
  bonus: Sparkles,
  claro: Sun,
  escuro: Moon,
  finalizar: Flag,
  limpeza: SprayCan,
  decisoes: Scale,
  concluida: Check,
  pendente: CircleDashed,
  bloqueada: Lock,
  naoIniciada: Circle,
  alerta: CircleAlert,
  pessoa: UserRound,
  pacote: Package,
} satisfies Record<string, LucideIcon>;

/**
 * Ícone de cada estratégia de decisão. Um desenho por estratégia, de
 * propósito: é a repetição entre situações diferentes que ensina a gramática —
 * ver a ampulheta e já saber que aquela carta empurra trabalho para depois.
 */
export const ESTRATEGIA_ICON: Record<Estrategia, LucideIcon> = {
  imediata: Zap,
  concluir: CircleCheck,
  economia: PiggyBank,
  futuro: TrendingUp,
  desvio: Signpost,
  bloqueio: Ban,
  cooperacao: Handshake,
  adiar: Hourglass,
};

/**
 * Tarja ilustrada de cada estratégia. Fica aqui pelo mesmo motivo dos ícones:
 * o componente pede pelo papel, nunca pelo caminho do arquivo.
 */
export const ESTRATEGIA_IMAGEM: Record<Estrategia, string> = {
  imediata: acaoImediata,
  concluir: concluirResolver,
  economia: economizarMaterial,
  futuro: beneficioFuturo,
  desvio: deslocamentoDesvio,
  bloqueio: bloqueioInterdicao,
  cooperacao: ajudaCooperacao,
  adiar: esperarAdiar,
};

/** Ícone de cada categoria de consequência das cartas de decisão. */
const CONSEQUENCE_ICON: Record<ConsequenceKind, LucideIcon> = {
  tempo: Clock,
  deslocamento: MapPin,
  material: Package,
  pendencia: CircleDashed,
  intocada: Circle,
  sujeira: TrendingUp,
  bloqueio: Lock,
};

export function ConsequenceIcon({
  kind,
  className,
}: {
  kind: ConsequenceKind;
  className?: string;
}) {
  const Component = CONSEQUENCE_ICON[kind];
  return <Component className={className} aria-hidden strokeWidth={2} />;
}
