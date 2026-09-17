import {
  BarChart3,
  Check,
  Circle,
  CircleAlert,
  CircleDashed,
  Clock,
  Compass,
  Flag,
  Footprints,
  Lightbulb,
  ListOrdered,
  Lock,
  Maximize2,
  Minimize2,
  Map,
  MapPin,
  Package,
  Palette,
  RotateCcw,
  Scale,
  SprayCan,
  Target,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { ConsequenceKind } from '../domain/effects';

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
