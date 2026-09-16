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
  previewCleaningMinutes,
  restart,
  selectRoom,
  summarize,
  waitInCorridor,
} from '../domain/game';
import { distanceBetween } from '../domain/movement';
import { roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
import { actionAvailability, describeAction, type EffectContext } from '../domain/effects';
import { bestRun, clearHistory, loadHistory, saveRun, type HistoryEntry } from '../domain/history';
import type { GameState } from '../domain/types';

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
        setHistory(saveRun(summarize(ended), ended.route.map((step) => step.roomId)));
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
    };
    return {
      situation,
      room,
      cards: situation.actions.map((action) => ({
        action,
        badges: describeAction(action, ctx),
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
    isSelectable: (roomId: string) => isSelectable(state, roomId),
    minutesUntilFree: (roomId: string) => minutesUntilFree(state, roomId),
  };
}
