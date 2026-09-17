export type RoomId = string;
export type Side = 'top' | 'bottom';

/** Papel do ambiente. Só `sala` e `wc` são objetivos de limpeza (decisão Q2). */
export type RoomKind = 'sala' | 'wc' | 'deposito' | 'escada';

/** Tom visual da sala. Puramente estético, mas declarado nos dados e não no SVG. */
export type RoomTone = 'grande' | 'media' | 'pequena' | 'estreita' | 'banheiro' | 'tecnica' | 'escada';

export type RoomDef = {
  id: RoomId;
  name: string;
  shortName: string;
  kind: RoomKind;
  side: Side;
  tone: RoomTone;

  /** Posição da porta no corredor, em metros a partir da entrada. Usada no cálculo. */
  corridorPosition: number;
  /** Tempo base de limpeza, em minutos. */
  baseCleaningMinutes: number;
  /** Cargas de material consumidas por uma limpeza completa. */
  materialCost: number;
  /** É objetivo de limpeza? O depósito não é. */
  cleanable: boolean;

  /** Geometria em metros — o desenho deriva dos dados, nunca de pixels chutados. */
  spanStartMeters: number;
  spanWidthMeters: number;
  /** Profundidade relativa; > 1 reproduz a saliência da ala esquerda da planta. */
  depth: number;
  /** A caixa de escada atravessa o corredor, em vez de ficar de um lado só. */
  straddlesCorridor?: boolean;
};

export type RoomStatus = 'nao-iniciada' | 'pendente' | 'concluida';

export type RoomState = {
  status: RoomStatus;
  /** Minutos restantes quando a sala está pendente (decisão Q7). */
  residualMinutes: number;
  /** Sujeira acumulada por adiamentos; soma ao tempo base (situação 1C). */
  extraDirtMinutes: number;
  /** Minuto de jogo em que a sala volta a ficar disponível (decisão Q16). */
  blockedUntilMinute: number | null;
};

/* ------------------------------------------------------------------ */
/* Expressões de efeito — interpretadas pelo domínio (decisão Q15)      */
/* ------------------------------------------------------------------ */

export type TimeExpr =
  | { kind: 'base' }
  | { kind: 'halfBase' }
  | { kind: 'const'; value: number }
  | { kind: 'sum'; terms: TimeExpr[] }
  | { kind: 'diff'; left: TimeExpr; right: TimeExpr };

export type ChargeExpr =
  | { kind: 'roomCost' }
  | { kind: 'const'; value: number }
  | { kind: 'roomCostPlus'; value: number };

export type Effect =
  | { type: 'cleanTime'; amount: TimeExpr }
  | { type: 'eventTime'; amount: TimeExpr }
  | { type: 'spendCharges'; amount: ChargeExpr }
  | { type: 'setCharges'; value: number }
  | { type: 'refill' }
  | { type: 'completeRoom' }
  | { type: 'leavePending'; residual: TimeExpr }
  | { type: 'leaveUnstarted' }
  | { type: 'addDirt'; minutes: number }
  | { type: 'moveTo'; target: 'deposito' | 'entrada' }
  | { type: 'blockRoom'; target: 'self' | 'nearestOther'; minutes: number };

export type Requirement = { type: 'minCharges'; amount: ChargeExpr };

export type SituationAction = {
  id: string;
  label: string;
  description: string;
  requires: Requirement[];
  effects: Effect[];
};

export type SituationCondition =
  | { type: 'chargesAtMost'; value: number }
  | { type: 'chargesAtLeastRoomCost' }
  | { type: 'roomKindIsNot'; kind: RoomKind }
  | { type: 'hasOtherBlockableObjective' };

export type SituationDef = {
  id: string;
  title: string;
  prompt: string;
  /** Pré-condições de elegibilidade: situações incoerentes nunca são oferecidas (Q14). */
  conditions: SituationCondition[];
  actions: [SituationAction, SituationAction, SituationAction];
};

/* ------------------------------------------------------------------ */
/* Estado da partida                                                    */
/* ------------------------------------------------------------------ */

export type LogEntry = {
  index: number;
  roomId: RoomId | null;
  title: string;
  detail: string;
  deltaDistance: number;
  deltaCleaning: number;
  deltaEvent: number;
  deltaIdle: number;
  deltaCharges: number;
  totalAfter: number;
};

export type RouteStep = {
  roomId: RoomId;
  roomName: string;
  distance: number;
  /** 'limpeza' | 'retorno' (pendência) | 'deposito' */
  purpose: 'limpeza' | 'retorno' | 'deposito';
};

export type ActiveSituation = {
  situationId: string;
  roomId: RoomId;
  /** Alvo já resolvido do bloqueio `nearestOther`, para a carta poder anunciá-lo (C2). */
  blockTargetId: RoomId | null;
};

export type Phase = 'mapa' | 'confirmacao' | 'situacao' | 'final';

export type GameState = {
  phase: Phase;
  currentPosition: number;
  distanceTraveled: number;
  cleaningMinutes: number;
  eventMinutes: number;
  idleMinutes: number;
  charges: number;
  rooms: Record<RoomId, RoomState>;
  route: RouteStep[];
  log: LogEntry[];
  /** Destino escolhido, aguardando confirmação. */
  pendingTargetId: RoomId | null;
  situation: ActiveSituation | null;
  /** Estado do gerador determinístico e do saco de situações (Q5/Q14). */
  rngState: number;
  bag: string[];
  lastSituationId: string | null;
};
