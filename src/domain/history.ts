import { gameConfig } from '../data/gameConfig';
import type { Summary } from './game';

export type HistoryEntry = {
  id: string;
  playedAt: number;
  concluidas: number;
  totalObjectives: number;
  pendentes: number;
  naoIniciadas: number;
  distanceTraveled: number;
  totalMinutes: number;
  complete: boolean;
  route: string[];
};

/**
 * Ordenação do recorde (decisão L7): mais objetivos concluídos vence sempre;
 * o tempo só desempata. Sem isso, encerrar a partida no primeiro minuto com
 * zero salas seria o "melhor" resultado possível.
 */
export function compareRuns(a: HistoryEntry, b: HistoryEntry): number {
  if (a.concluidas !== b.concluidas) return b.concluidas - a.concluidas;
  return a.totalMinutes - b.totalMinutes;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(gameConfig.historyStorageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(summary: Summary, route: string[]): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    playedAt: Date.now(),
    concluidas: summary.concluidas.length,
    totalObjectives: summary.totalObjectives,
    pendentes: summary.pendentes.length,
    naoIniciadas: summary.naoIniciadas.length,
    distanceTraveled: summary.distanceTraveled,
    totalMinutes: summary.totalMinutes,
    complete: summary.concluidas.length === summary.totalObjectives,
    route,
  };
  const next = [entry, ...loadHistory()].slice(0, gameConfig.historyMaxEntries);
  try {
    localStorage.setItem(gameConfig.historyStorageKey, JSON.stringify(next));
  } catch {
    /* modo privado ou storage cheio: a partida atual continua válida */
  }
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(gameConfig.historyStorageKey);
  } catch {
    /* nada a fazer */
  }
}

export function bestRun(entries: HistoryEntry[]): HistoryEntry | null {
  if (entries.length === 0) return null;
  return [...entries].sort(compareRuns)[0];
}
