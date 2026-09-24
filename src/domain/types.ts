export type RoomId = string;
export type Side = 'top' | 'bottom';

/** Papel do ambiente. Só `sala` e `wc` são objetivos de limpeza (decisão Q2). */
export type RoomKind = 'sala' | 'wc' | 'deposito' | 'escada' | 'entrada';

/** Tom visual da sala. Puramente estético, mas declarado nos dados e não no SVG. */
export type RoomTone =
  | 'grande'
  | 'media'
  | 'pequena'
  | 'estreita'
  | 'banheiro'
  | 'tecnica'
  | 'escada'
  | 'entrada';

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
  /**
   * Ambiente desenhado DENTRO do envelope de outro, como o depósito dentro do
   * bloco do banheiro. Só afeta o desenho: o aninhado continua tendo porta e
   * posição próprias no corredor, e é um destino independente.
   */
  nestedIn?: RoomId;
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
  /**
   * Situação que ficou esperando quando a sala foi deixada para depois.
   * Na volta ela reaparece, em vez de um novo sorteio: adiar não pode virar
   * "trocar de problema pagando só o deslocamento".
   */
  deferredSituationId?: string | null;
  /**
   * Situação já conhecida antes de o jogador chegar (alguém contou o que está
   * acontecendo ali). Na chegada ela vale no lugar do sorteio.
   */
  previewSituationId?: string | null;
  /** Um colega conclui a sala sozinho neste minuto; até lá ela fica fechada. */
  delegatedUntil?: number | null;
};

/* ------------------------------------------------------------------ */
/* Recursos deixados no mapa                                           */
/* ------------------------------------------------------------------ */

/**
 * Minutos a mais (positivo) ou a menos (negativo) no próximo trabalho feito
 * em cada sala-alvo. Tem endereço: vale para aquelas salas, não para "as
 * próximas N" em qualquer lugar.
 */
export type RoomModifier = {
  id: string;
  label: string;
  minutes: number;
  /** Salas que ainda não receberam o efeito. */
  targets: RoomId[];
  /** Minuto em que o efeito some sozinho; `null` dura o turno todo. */
  until: number | null;
  /**
   * Objeto físico que causa o efeito, com posição no corredor — a enceradeira
   * estacionada, por exemplo. Desenhado no mapa, onde o jogador o vê.
   */
  equipment?: { label: string; position: number };
};

/** Material parado no corredor. Recolhido por quem passar por ali. */
export type Stash = {
  id: string;
  label: string;
  position: number;
  charges: number;
};

/**
 * Para onde apontam os efeitos regionais. Todos têm endereço no corredor —
 * nunca "as próximas N salas" onde quer que estejam.
 *
 * `frente`: a sala do outro lado, a 0 m. `raio`: as salas a até N m desta.
 * `ponto`: as salas de uma estação do corredor. `maisDistante`: a sala por
 * fazer mais longe do depósito.
 */
export type RegionTarget =
  | { kind: 'frente' }
  | { kind: 'raio'; meters: number }
  | { kind: 'ponto'; at: 'meio' | 'fundo' }
  | { kind: 'maisDistante' }
  /** As duas salas por fazer mais longe do depósito (um par do corredor). */
  | { kind: 'parMaisDistante' }
  /** A sala por fazer mais próxima que fica em outra estação do corredor. */
  | { kind: 'maisProximaOutraEstacao' }
  /** Ambientes nomeados, como a escada. */
  | { kind: 'salas'; ids: RoomId[] }
  /** Todos os ambientes por fazer de um tipo (as salas de aula, os banheiros). */
  | { kind: 'tipo'; tipo: RoomKind }
  /** Os ambientes que o jogador deixou pendentes ou adiados. */
  | { kind: 'pendencias' };

/** Uma meta com prazo: salas marcadas no mapa que precisam estar prontas até um minuto. */
export type Meta = {
  id: string;
  label: string;
  /** Sala em que a meta foi aceita; a recompensa é resolvida a partir dela. */
  origem: RoomId;
  targets: RoomId[];
  until: number;
  /** Delegação concedida se as salas ficarem prontas a tempo. */
  recompensa: { target: RegionTarget | 'origem'; label: string } | null;
  /** Minutos somados ao turno se o prazo passar. */
  penalidade: number;
  /** A penalidade vale por sala que ficou por fazer. */
  penalidadePorSala: boolean;
};

/* ------------------------------------------------------------------ */
/* Expressões de efeito — interpretadas pelo domínio (decisão Q15)      */
/* ------------------------------------------------------------------ */

export type TimeExpr =
  | { kind: 'base' }
  | { kind: 'halfBase' }
  | { kind: 'const'; value: number }
  | { kind: 'sum'; terms: TimeExpr[] }
  | { kind: 'diff'; left: TimeExpr; right: TimeExpr }
  /**
   * Minutos de caminhada daqui até um ponto do mapa, vezes `factor`.
   * `suprimento` é o ponto de material mais próximo: o depósito ou um estoque
   * deixado no corredor.
   */
  | { kind: 'distance'; to: 'deposito' | 'entrada' | 'suprimento' | 'banheiro' | 'estoque'; factor: number }
  /** Minutos até o próximo intervalo de aulas, que acontece a cada `every` min de turno. */
  | { kind: 'ateIntervalo'; every: number };

export type ChargeExpr =
  | { kind: 'roomCost' }
  | { kind: 'const'; value: number }
  | { kind: 'roomCostPlus'; value: number };

/** Bônus que vale para as PRÓXIMAS salas, não para a atual. */
export type BuffKind = 'tempo' | 'material';

export type ActiveBuff = {
  id: string;
  label: string;
  kind: BuffKind;
  /** Minutos (ou cargas) abatidos por sala trabalhada. */
  amount: number;
  /** Quantas salas ainda recebem o abatimento. */
  roomsLeft: number;
};

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
  | { type: 'moveTo'; target: 'deposito' | 'entrada' | 'escada' }
  /** `ateSinal`: fecha até o N-ésimo próximo sinal do intervalo, em vez de por `minutes`. */
  | { type: 'blockRoom'; target: 'self' | 'nearestOther'; minutes: number; ateSinal?: number }
  /** Libera um objetivo bloqueado. Capacidade genérica: qualquer situação pode
   *  melhorar a rota, não só a que a introduziu. */
  | { type: 'unblockRoom'; target: 'nearestBlocked' }
  | { type: 'gainCharges'; amount: number }
  | { type: 'grantBuff'; kind: BuffKind; label: string; amount: number; rooms: number }
  /**
   * Muda o custo das salas de uma região; `durationMinutes` faz o efeito
   * expirar. Com `equipment`, o efeito é um objeto físico parado ali.
   */
  | {
      type: 'modifyRooms';
      target: RegionTarget | 'self';
      minutes: number;
      label: string;
      durationMinutes?: number;
      equipment?: string;
    }
  /** Fecha as salas de uma região por um tempo. */
  | { type: 'blockRooms'; target: RegionTarget; minutes: number }
  /** Fecha o depósito: ninguém recarrega nem busca material lá por um tempo. */
  | { type: 'blockDeposito'; minutes: number }
  /** Deixa cargas num ponto do corredor, para recolher ao passar. `aqui` é a estação atual. */
  | { type: 'placeStash'; at: 'meio' | 'fundo' | 'aqui'; charges: number; label: string }
  /**
   * Um colega traz material do ponto mais próximo: depósito ou estoque no
   * corredor. Com `origem: 'estoque'`, só de uma caixa deixada no corredor.
   */
  | { type: 'fetchSupply'; amount: number; origem?: 'qualquer' | 'estoque' }
  /**
   * Um colega conclui as salas-alvo sozinho depois de `minutes`, ou no N-ésimo
   * próximo sinal do intervalo (`ateSinal`).
   */
  | {
      type: 'delegate';
      target: RegionTarget | 'self';
      minutes: number;
      label: string;
      ateSinal?: number;
      /** Quantas salas da região, no máximo (a pendência mais antiga, por exemplo). */
      limite?: number;
    }
  /** Revela e fixa a situação das salas: as `count` mais próximas, ou as de uma região. */
  | { type: 'revealSituations'; count: number; target?: RegionTarget }
  /**
   * Aposta com chance declarada na carta: 1 em `umEm` dá errado, e então valem
   * os efeitos de `seFalhar`. Sorteada com a semente da partida.
   */
  | { type: 'aposta'; umEm: number; label: string; seFalhar: Effect[] }
  /** Aceita uma meta com prazo sobre as salas de uma região. */
  | {
      type: 'addMeta';
      label: string;
      target: RegionTarget;
      minutes: number;
      recompensa: { target: RegionTarget | 'origem'; label: string } | null;
      penalidade: number;
      penalidadePorSala?: boolean;
    };

export type Requirement =
  | { type: 'minCharges'; amount: ChargeExpr }
  /** A região alcança ao menos uma sala por fazer. */
  | { type: 'regiaoComAlvo'; target: RegionTarget }
  /** A sala fica do lado da base em relação a um ponto do corredor. */
  | { type: 'antesDoPonto'; at: 'meio' | 'fundo' }
  /** O depósito está aberto. */
  | { type: 'depositoAcessivel' }
  /** Existe uma caixa de material no corredor. */
  | { type: 'temEstoque' }
  /** Existe algum ambiente fechado que possa ser liberado. */
  | { type: 'temBloqueada' };

export type SituationAction = {
  id: string;
  label: string;
  description: string;
  requires: Requirement[];
  effects: Effect[];
};

export type SituationCondition =
  | { type: 'chargesAtMost'; value: number }
  /** Só faz sentido oferecer "liberar" se existe algo bloqueado para liberar. */
  | { type: 'hasBlockedObjective' }
  | { type: 'chargesAtLeastRoomCost' }
  | { type: 'roomKindIsNot'; kind: RoomKind }
  | { type: 'hasOtherBlockableObjective' }
  /** Só longe do depósito: perto dele o jogador resolve andando até lá. */
  | { type: 'distanceFromDepotAtLeast'; meters: number }
  /** Existe ao menos um ambiente pendente ou adiado. */
  | { type: 'temPendencias' };

export type SituationDef = {
  id: string;
  title: string;
  prompt: string;
  /**
   * Tipos de ambiente em que esta situação faz sentido. Ausente = qualquer
   * ambiente limpável. Uma sala de aula, um banheiro e uma escada têm
   * problemas diferentes; misturar tudo tornava as situações genéricas.
   */
  appliesTo?: RoomKind[];
  /**
   * Situação geral que disputa o sorteio em pé de igualdade com as específicas.
   * Por padrão, uma específica do ambiente ganha de uma geral; quem marca isto
   * escapa dessa despriorização — é o caso das gerais que representam um estado
   * relevante da partida (carrinho baixo, falta de água), que precisam poder
   * aparecer justamente quando esse estado acontece.
   */
  competesWithScoped?: boolean;
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
  /** Alvo já resolvido de `unblockRoom`, para a carta dizer qual ambiente libera. */
  unblockTargetId?: RoomId | null;
};

/** Uma escolha feita numa carta de situação, guardada para análise posterior. */
export type DecisionRecord = {
  roomId: RoomId;
  situationId: string;
  actionId: string;
  /** Minuto do turno e carga do carrinho no momento da escolha, antes dos efeitos. */
  minute: number;
  charges: number;
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
  decisions: DecisionRecord[];
  /** Destino escolhido, aguardando confirmação. */
  pendingTargetId: RoomId | null;
  situation: ActiveSituation | null;
  /** Estado do gerador determinístico e do saco de situações (Q5/Q14). */
  /** Bônus diferidos em vigor, consumidos a cada sala trabalhada. */
  buffs: ActiveBuff[];
  /** Efeitos com endereço no mapa: bônus e penalidades de salas específicas. */
  modifiers: RoomModifier[];
  /** Material parado no corredor. */
  stashes: Stash[];
  /** Metas com prazo aceitas e ainda abertas. */
  metas: Meta[];
  rngState: number;
  bag: string[];
  lastSituationId: string | null;
};
