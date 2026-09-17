/**
 * Parâmetros calibráveis da partida.
 *
 * Tudo que o grupo pode querer ajustar após os testes da oficina vive aqui.
 * Nenhum componente React deve conter um número de regra.
 */
export const gameConfig = {
  /** Semente fixa: todos os participantes recebem o mesmo cenário (decisão Q5). */
  seed: 20260916,

  /** Conversão de deslocamento em tempo: 1 minuto a cada N metros (decisão C1). */
  metersPerMinute: 5,

  /** Material: cargas iniciais e teto da recarga (decisão L4). */
  initialCharges: 10,
  maxCharges: 10,

  /** Minutos gastos ao reabastecer no depósito (decisão Q8). */
  refillMinutes: 4,

  /** Duração de um bloqueio temporário, em minutos de jogo (decisão Q16). */
  blockDurationMinutes: 25,

  /** Turno de referência: régua de eficiência, nunca condição de derrota (decisão L6). */
  referenceShiftMinutes: 140,

  /**
   * Menor deslocamento possível para visitar todos os objetivos, em metros.
   * Referência espacial mínima — não é "rota ótima", pois depósito, pendências
   * e decisões podem alterar o custo total (decisão Q12).
   */
  minimumSweepMeters: 70,

  /** Chave do histórico local de partidas (decisão Q12/L7). */
  historyStorageKey: 'operacao-limpeza:historico:v1',
  historyMaxEntries: 20,
} as const;
