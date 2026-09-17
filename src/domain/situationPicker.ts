import { situations, situationsById } from '../data/situations';
import { objectives } from '../data/rooms';
import { actionAvailability, type EffectContext } from './effects';
import { shuffle } from './rng';
import { distanceBetween } from './movement';
import type { GameState, RoomDef, RoomState, SituationCondition, SituationDef } from './types';

/**
 * Objetivo elegível para receber um bloqueio: ainda não concluído, diferente da
 * sala atual e não bloqueado no momento (decisão C2).
 */
export function findNearestBlockable(
  state: GameState,
  currentRoom: RoomDef,
  totalNow: number,
): string | null {
  const candidates = objectives
    .filter((room) => room.id !== currentRoom.id)
    .filter((room) => {
      const roomState = state.rooms[room.id];
      if (roomState.status === 'concluida') return false;
      return roomState.blockedUntilMinute === null || roomState.blockedUntilMinute <= totalNow;
    });

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDistance = distanceBetween(currentRoom.corridorPosition, best.corridorPosition);
  for (const room of candidates.slice(1)) {
    const distance = distanceBetween(currentRoom.corridorPosition, room.corridorPosition);
    // Empate favorece o vizinho imediato (mesma posição, lado oposto) e depois o id.
    if (distance < bestDistance || (distance === bestDistance && room.id < best.id)) {
      best = room;
      bestDistance = distance;
    }
  }
  return best.id;
}

/**
 * Objetivo bloqueado mais próximo — alvo de `unblockRoom`. Espelha
 * `findNearestBlockable`, mas procura o que está travado em vez do que pode
 * ser travado.
 */
export function findNearestBlocked(
  state: GameState,
  currentRoom: RoomDef,
  totalNow: number,
): string | null {
  const candidates = objectives
    .filter((room) => room.id !== currentRoom.id)
    .filter((room) => {
      const roomState = state.rooms[room.id];
      if (roomState.status === 'concluida') return false;
      return roomState.blockedUntilMinute !== null && roomState.blockedUntilMinute > totalNow;
    });

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDistance = distanceBetween(currentRoom.corridorPosition, best.corridorPosition);
  for (const room of candidates.slice(1)) {
    const distance = distanceBetween(currentRoom.corridorPosition, room.corridorPosition);
    if (distance < bestDistance || (distance === bestDistance && room.id < best.id)) {
      best = room;
      bestDistance = distance;
    }
  }
  return best.id;
}

function conditionHolds(
  condition: SituationCondition,
  state: GameState,
  room: RoomDef,
  totalNow: number,
): boolean {
  switch (condition.type) {
    case 'chargesAtMost':
      return state.charges <= condition.value;
    case 'chargesAtLeastRoomCost':
      return state.charges >= room.materialCost;
    case 'roomKindIsNot':
      return room.kind !== condition.kind;
    case 'hasOtherBlockableObjective':
      return findNearestBlockable(state, room, totalNow) !== null;
    case 'hasBlockedObjective':
      return findNearestBlocked(state, room, totalNow) !== null;
  }
}

/**
 * Uma situação só é oferecida se todas as suas pré-condições valem E se ao menos
 * uma de suas três ações é executável no estado atual — a segunda regra é a
 * trava que impede um beco sem saída depois do ponto de não-retorno (Q11/Q14).
 */
export function isEligible(
  situation: SituationDef,
  state: GameState,
  room: RoomDef,
  roomState: RoomState,
  totalNow: number,
): boolean {
  /* Escopo por tipo de ambiente: sala, banheiro e escada têm problemas
     próprios, e uma situação fora de contexto quebra a verossimilhança. */
  if (situation.appliesTo && !situation.appliesTo.includes(room.kind)) return false;

  const conditionsOk = situation.conditions.every((condition) =>
    conditionHolds(condition, state, room, totalNow),
  );
  if (!conditionsOk) return false;

  const ctx: EffectContext = {
    room,
    roomState,
    charges: state.charges,
    position: room.corridorPosition,
    blockTargetId: null,
  };
  return situation.actions.some((action) => actionAvailability(action, ctx).available);
}

/**
 * Saco embaralhado com semente fixa (decisão Q14): percorre o saco procurando a
 * primeira situação elegível e diferente da anterior; reabastece e reembaralha
 * quando esgota. Determinístico dado `rngState`.
 */
export function drawSituation(
  state: GameState,
  room: RoomDef,
  roomState: RoomState,
  totalNow: number,
): { situationId: string; bag: string[]; rngState: number } | null {
  let bag = [...state.bag];
  let rngState = state.rngState;
  const allIds = situations.map((situation) => situation.id);

  // Duas passadas: a primeira evita repetir a situação anterior; a segunda aceita.
  for (const allowRepeat of [false, true]) {
    for (let refill = 0; refill < 3; refill += 1) {
      if (bag.length === 0) {
        const reshuffled = shuffle(allIds, rngState);
        bag = reshuffled.items;
        rngState = reshuffled.state;
      }
      const elegivel = (id: string) => {
        if (!allowRepeat && id === state.lastSituationId) return false;
        return isEligible(situationsById[id], state, room, roomState, totalNow);
      };

      /* Conteúdo específico do ambiente ganha de uma geral quando as duas
         estão elegíveis — sem isso as gerais monopolizam o sorteio, já que são
         elegíveis em todos os ambientes. Gerais marcadas com
         `competesWithScoped` não sofrem a despriorização. A ordem dentro de
         cada faixa continua sendo a do saco, então o sorteio segue
         determinístico pela semente. */
      const prioritario = (id: string) => {
        const situation = situationsById[id];
        return Boolean(situation.appliesTo) || Boolean(situation.competesWithScoped);
      };

      let index = bag.findIndex((id) => prioritario(id) && elegivel(id));
      if (index < 0) index = bag.findIndex((id) => elegivel(id));
      if (index >= 0) {
        const [situationId] = bag.splice(index, 1);
        return { situationId, bag, rngState };
      }
      // Nenhuma situação do saco serve aqui: descarta e sorteia um saco novo.
      bag = [];
    }
  }
  return null;
}
