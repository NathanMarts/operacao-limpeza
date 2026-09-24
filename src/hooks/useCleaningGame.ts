import { useCallback, useMemo, useRef, useState } from 'react';
import {
  cancelSelection,
  chooseAction,
  confirmTravel,
  createInitialState,
  currentTotal,
  finishShift,
  isComplete,
  isSelectable,
  minutesUntilFree,
  mustWait,
  precisaSairParaVoltar,
  previewCleaningMinutes,
  restart,
  sairEVoltar,
  selectRoom,
  summarize,
  waitInCorridor,
} from '../domain/game';
import { distanceBetween } from '../domain/movement';
import { roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
import { actionAvailability, summarizeAction, type EffectContext } from '../domain/effects';
import { bestRun, clearHistory, loadHistory, saveRun, type HistoryEntry } from '../domain/history';
import { nomeDaPosicao } from '../domain/mapa';
import type { GameState } from '../domain/types';

/**
 * O que decisões anteriores deixaram nesta sala. Sem isto, o número muda no
 * mapa mas o jogador não liga a mudança à escolha que a causou.
 */
function notasDaSala(state: GameState, roomId: string): string[] {
  const roomState = state.rooms[roomId];
  const notas: string[] = [];
  if (roomState.deferredSituationId) {
    const titulo = situationsById[roomState.deferredSituationId]?.title;
    notas.push(`Você deixou esta sala para depois: "${titulo}" continua esperando aqui.`);
  }
  if (roomState.previewSituationId) {
    const titulo = situationsById[roomState.previewSituationId]?.title;
    notas.push(`Os alunos contaram o que espera aqui: "${titulo}".`);
  }
  for (const mod of state.modifiers) {
    if (!mod.targets.includes(roomId)) continue;
    if (mod.until !== null && mod.until <= currentTotal(state)) continue;
    const sinal = mod.minutes < 0 ? '−' : '+';
    notas.push(`${mod.label}: ${sinal}${Math.abs(mod.minutes)} min nesta sala.`);
  }
  if (roomState.status !== 'pendente' && state.charges < roomsById[roomId].materialCost && roomsById[roomId].cleanable) {
    notas.push(`Seu carrinho tem ${state.charges} de ${roomsById[roomId].materialCost} cargas: talvez não dê para resolver esta sala.`);
  }
  const noCaminho = state.stashes.filter((stash) => {
    const de = Math.min(state.currentPosition, roomsById[roomId].corridorPosition);
    const ate = Math.max(state.currentPosition, roomsById[roomId].corridorPosition);
    return stash.position >= de && stash.position <= ate && roomsById[roomId].kind !== 'deposito';
  });
  for (const stash of noCaminho) {
    notas.push(`No caminho: ${stash.label} em ${nomeDaPosicao(stash.position)} (+${stash.charges} cargas).`);
  }
  return notas;
}

/**
 * Única fonte de verdade da partida. O hook não contém regra: só orquestra as
 * funções puras de `domain/` e guarda o histórico local.
 */
export function useCleaningGame() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const savedRef = useRef(false);

  const finish = useCallback(() => {
    setState((current) => {
      if (current.phase === 'final') return current;
      const ended = finishShift(current);
      if (!savedRef.current) {
        savedRef.current = true;
        setHistory(
          saveRun(summarize(ended), ended.route.map((step) => step.roomId), ended.decisions),
        );
      }
      return ended;
    });
  }, []);

  const actions = useMemo(
    () => ({
      select: (roomId: string) => setState((current) => selectRoom(current, roomId)),
      cancel: () => setState(cancelSelection),
      confirm: () =>
        setState((current) => {
          const next = confirmTravel(current);
          return next.phase === 'mapa' && isComplete(next) ? next : next;
        }),
      choose: (actionId: string) => setState((current) => chooseAction(current, actionId)),
      wait: () => setState(waitInCorridor),
      sairEVoltar: () => setState(sairEVoltar),
      finish,
      restart: () => {
        savedRef.current = false;
        setState(restart());
      },
      clearHistory: () => {
        clearHistory();
        setHistory([]);
      },
    }),
    [finish],
  );

  /** Prévia mostrada no modal de confirmação, antes do ponto de não-retorno. */
  const preview = useMemo(() => {
    if (!state.pendingTargetId) return null;
    const room = roomsById[state.pendingTargetId];
    const roomState = state.rooms[room.id];
    return {
      room,
      roomState,
      distance: distanceBetween(state.currentPosition, room.corridorPosition),
      cleaningMinutes: previewCleaningMinutes(state, room.id),
      isReturn: roomState.status === 'pendente',
      isDeposito: room.kind === 'deposito',
      notas: notasDaSala(state, room.id),
    };
  }, [state]);

  /** Cartas da situação já com seus efeitos descritos e disponibilidade resolvida. */
  const situationView = useMemo(() => {
    if (!state.situation) return null;
    const situation = situationsById[state.situation.situationId];
    const room = roomsById[state.situation.roomId];
    const ctx: EffectContext = {
      room,
      roomState: state.rooms[room.id],
      charges: state.charges,
      position: room.corridorPosition,
      blockTargetId: state.situation.blockTargetId,
      /* Sem estes dois a carta não sabia qual sala seria liberada, nem quais
         salas um efeito regional alcança: mostrava promessas genéricas. */
      unblockTargetId: state.situation.unblockTargetId ?? null,
      game: state,
    };
    return {
      situation,
      room,
      cards: situation.actions.map((action) => ({
        action,
        summary: summarizeAction(action, ctx),
        availability: actionAvailability(action, ctx),
      })),
    };
  }, [state]);

  return {
    state,
    actions,
    preview,
    situationView,
    history,
    best: bestRun(history),
    totalMinutes: currentTotal(state),
    summary: summarize(state),
    complete: isComplete(state),
    needsWait: mustWait(state),
    precisaSair: precisaSairParaVoltar(state),
    isSelectable: (roomId: string) => isSelectable(state, roomId),
    minutesUntilFree: (roomId: string) => minutesUntilFree(state, roomId),
  };
}
