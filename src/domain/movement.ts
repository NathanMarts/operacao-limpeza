import { gameConfig } from '../data/gameConfig';

/**
 * Regra espacial do bloco: corredor único, sem atalhos.
 * deslocamento = |posiçãoAtual − posiçãoDestino|
 */
export function distanceBetween(from: number, to: number): number {
  return Math.abs(from - to);
}

/** Converte metros em minutos (1 min a cada `metersPerMinute` metros). */
export function travelMinutes(meters: number): number {
  return meters / gameConfig.metersPerMinute;
}

/** Tempo total da partida: limpeza + deslocamento + eventos + ocioso. */
export function totalMinutes(parts: {
  cleaningMinutes: number;
  distanceTraveled: number;
  eventMinutes: number;
  idleMinutes: number;
}): number {
  return (
    parts.cleaningMinutes +
    travelMinutes(parts.distanceTraveled) +
    parts.eventMinutes +
    parts.idleMinutes
  );
}
