import { DEPOSITO_POSITION, objectives, roomsById } from '../data/rooms';
import { distanceBetween, totalMinutes } from './movement';
import type { GameState, RegionTarget, RoomDef } from './types';

/** A torneira dos banheiros, na base. */
export const BANHEIRO_POSITION = 4;
/** A caixa de escada, na ponta do corredor. */
export const ESCADA_POSITION = 71;

/** Intervalo entre os sinais de aula, em minutos de turno. Um relógio só, para o jogo todo. */
export const MINUTOS_ENTRE_SINAIS = 20;

/**
 * Minuto do N-ésimo próximo sinal. Se o relógio está exatamente num sinal, o
 * "próximo" é o seguinte: o que acabou de tocar já passou.
 */
export function minutoDoSinal(agora: number, n = 1): number {
  const proximo = (Math.floor(agora / MINUTOS_ENTRE_SINAIS) + 1) * MINUTOS_ENTRE_SINAIS;
  return proximo + (n - 1) * MINUTOS_ENTRE_SINAIS;
}

/** Os dois lados do depósito (DEP-A, DEP-B) são o mesmo depósito, na mesma posição. */
export const DEPOSITOS = ['DEP-A', 'DEP-B'];

export function depositoFechado(state: GameState): boolean {
  const agora = totalMinutes(state);
  return DEPOSITOS.some((id) => {
    const until = state.rooms[id]?.blockedUntilMinute;
    return until != null && until > agora;
  });
}

/**
 * Regras do mapa como mecânica: onde ficam as coisas, e quais salas um efeito
 * alcança. Tudo é relativo à sala em que a decisão foi tomada — é isso que faz
 * a mesma carta valer diferente em S6 e em S1.
 */

/** Pontos do corredor usados como destino de recursos. */
export const PONTOS = {
  /** Estação de S4/S10: o meio do corredor. */
  meio: 44,
  /** Estação de S2/S8: o fundo, a região mais longe do depósito. */
  fundo: 53,
} as const;

/** Nome curto de uma posição do corredor, pelas salas que ficam nela. */
export function nomeDaPosicao(position: number): string {
  if (position === DEPOSITO_POSITION) return 'depósito';
  const nomes = objectives
    .filter((room) => room.corridorPosition === position)
    .map((room) => room.shortName);
  return nomes.length > 0 ? nomes.join('/') : `${position} m`;
}

const porFazer = (state: GameState, room: RoomDef) => {
  const roomState = state.rooms[room.id];
  return roomState.status !== 'concluida' && !roomState.delegatedUntil;
};

/** A sala do outro lado do corredor, na mesma posição — a 0 m daqui. */
export function salaDaFrente(room: RoomDef): RoomDef | null {
  return (
    objectives.find(
      (other) =>
        other.id !== room.id &&
        other.corridorPosition === room.corridorPosition &&
        other.kind === room.kind,
    ) ?? null
  );
}

/** Salas por fazer alcançadas por um efeito regional disparado em `room`. */
export function resolverRegiao(state: GameState, room: RoomDef, target: RegionTarget): string[] {
  switch (target.kind) {
    case 'frente': {
      const frente = salaDaFrente(room);
      return frente && porFazer(state, frente) ? [frente.id] : [];
    }
    case 'raio':
      return objectives
        .filter((other) => other.id !== room.id)
        .filter((other) => Math.abs(other.corridorPosition - room.corridorPosition) <= target.meters)
        .filter((other) => porFazer(state, other))
        .sort((a, b) => a.corridorPosition - b.corridorPosition)
        .map((other) => other.id);
    case 'ponto':
      return objectives
        .filter((other) => other.id !== room.id && other.corridorPosition === PONTOS[target.at])
        .filter((other) => porFazer(state, other))
        .map((other) => other.id);
    case 'maisDistante': {
      const alvo = salasPorFazerDoFundo(state, room)[0];
      return alvo ? [alvo.id] : [];
    }
    case 'parMaisDistante': {
      /* A estação por fazer mais distante do depósito, com as duas salas dela
         (ou a única que ainda falta ali). */
      const primeira = salasPorFazerDoFundo(state, room)[0];
      if (!primeira) return [];
      return objectives
        .filter((other) => other.id !== room.id && other.kind === 'sala')
        .filter((other) => other.corridorPosition === primeira.corridorPosition)
        .filter((other) => porFazer(state, other))
        .map((other) => other.id);
    }
    case 'maisProximaOutraEstacao': {
      const candidatas = objectives
        .filter((other) => other.corridorPosition !== room.corridorPosition)
        .filter((other) => porFazer(state, other))
        .sort(
          (a, b) =>
            Math.abs(a.corridorPosition - room.corridorPosition) -
              Math.abs(b.corridorPosition - room.corridorPosition) || a.id.localeCompare(b.id),
        );
      return candidatas.length > 0 ? [candidatas[0].id] : [];
    }
    case 'salas':
      return target.ids.filter((id) => id !== room.id && roomsById[id] && porFazer(state, roomsById[id]));
    case 'tipo':
      return objectives
        .filter((other) => other.id !== room.id && other.kind === target.tipo)
        .filter((other) => porFazer(state, other))
        .map((other) => other.id);
    case 'pendencias': {
      /* Da mais antiga para a mais nova: a ordem em que o jogador as deixou. */
      const quando = (id: string) => {
        const i = state.decisions.findIndex((d) => d.roomId === id);
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      return objectives
        .filter((other) => other.id !== room.id)
        .filter((other) => {
          const rs = state.rooms[other.id];
          if (rs.delegatedUntil) return false;
          return rs.status === 'pendente' || (rs.status === 'nao-iniciada' && Boolean(rs.deferredSituationId));
        })
        .map((other) => other.id)
        .sort((a, b) => quando(a) - quando(b));
    }
  }
}

/** Salas de aula por fazer, da mais longe do depósito para a mais perto. */
function salasPorFazerDoFundo(state: GameState, room: RoomDef): RoomDef[] {
  return objectives
    .filter((other) => other.id !== room.id && other.kind === 'sala')
    .filter((other) => porFazer(state, other))
    .sort(
      (a, b) =>
        distanceBetween(b.corridorPosition, DEPOSITO_POSITION) -
          distanceBetween(a.corridorPosition, DEPOSITO_POSITION) || a.id.localeCompare(b.id),
    );
}

/**
 * O ponto de material mais próximo de uma posição: o depósito ou um estoque
 * deixado no corredor. É o que liga "deixar material no fundo" a "o material
 * acabou no fundo": a caixa deixada antes vira o ponto de reposição.
 */
export function suprimentoMaisProximo(
  state: GameState | undefined,
  position: number,
  origem: 'qualquer' | 'estoque' = 'qualquer',
): { position: number; stashId: string | null; label: string } | null {
  /* Depósito fechado não entrega nada: sobram as caixas do corredor. */
  const depositoServe = origem === 'qualquer' && !(state && depositoFechado(state));
  let melhor: { position: number; stashId: string | null; label: string } | null = depositoServe
    ? { position: DEPOSITO_POSITION, stashId: null, label: 'depósito' }
    : null;
  for (const stash of state?.stashes ?? []) {
    if (stash.charges <= 0) continue;
    if (!melhor || distanceBetween(position, stash.position) < distanceBetween(position, melhor.position)) {
      melhor = { position: stash.position, stashId: stash.id, label: stash.label };
    }
  }
  return melhor;
}

/** Soma dos modificadores ainda válidos que apontam para esta sala. */
export function modificadorDaSala(state: GameState, roomId: string): number {
  const agora = totalMinutes(state);
  return state.modifiers
    .filter((mod) => mod.targets.includes(roomId))
    .filter((mod) => mod.until === null || mod.until > agora)
    .reduce((total, mod) => total + mod.minutes, 0);
}

/** Lista legível das salas de um efeito: "S9, S10". */
export function nomesDasSalas(ids: string[]): string {
  return ids.map((id) => roomsById[id]?.shortName ?? id).join(', ');
}
