import { useState } from 'react';
import { BuildingMap } from '../components/BuildingMap';
import { RoomConfirmDialog, SituationDialog } from '../components/Dialogs';
import { FinalResult } from '../components/FinalResult';
import {
  ActionLog,
  Card,
  GameHeader,
  Legend,
  ObjectivePanel,
  RoutePanel,
  SummaryPanel,
} from '../components/Panels';
import { gameConfig } from '../data/gameConfig';
import { previewCleaningMinutes } from '../domain/game';
import { useCleaningGame } from '../hooks/useCleaningGame';

export function Game() {
  const game = useCleaningGame();
  const [showRoute, setShowRoute] = useState(true);
  const { state, actions, preview, situationView, summary } = game;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <GameHeader
        totalMinutes={game.totalMinutes}
        distance={state.distanceTraveled}
        charges={state.charges}
      />

      <main className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:p-6">
        <aside className="space-y-4 lg:order-1">
          <ObjectivePanel />
          <Legend />
        </aside>

        <section className="space-y-3 lg:order-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Clique numa sala para ver o custo antes de decidir.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={showRoute}
                  onChange={(event) => setShowRoute(event.target.checked)}
                  className="accent-sky-500"
                />
                Mostrar trajeto
              </label>
            </div>
            <BuildingMap
              state={state}
              totalMinutes={game.totalMinutes}
              showRoute={showRoute}
              cleaningMinutesFor={(roomId) => previewCleaningMinutes(state, roomId)}
              minutesUntilFree={game.minutesUntilFree}
              onSelect={actions.select}
            />
          </div>

          {game.needsWait && (
            <div className="rounded-xl border border-amber-700/60 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">
                Todos os ambientes restantes estão temporariamente bloqueados.
              </p>
              <button
                type="button"
                onClick={actions.wait}
                className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Aguardar no corredor
              </button>
            </div>
          )}

          <ActionLog log={state.log} />
        </section>

        <aside className="space-y-4 lg:order-3">
          <RoutePanel state={state} />
          <SummaryPanel summary={summary} />

          <Card title="Dica" icon="💡">
            <p className="text-xs leading-relaxed">
              A ordem das salas muda o resultado. Voltar pelo corredor custa de verdade — o mesmo
              caminho é cobrado nos dois sentidos.
            </p>
          </Card>

          <div className="space-y-2">
            <button
              type="button"
              onClick={actions.restart}
              className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              ↻ Reiniciar partida
            </button>
            <button
              type="button"
              onClick={actions.finish}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              ⚑ Finalizar limpeza
            </button>
            {game.complete && (
              <p className="text-center text-xs text-emerald-400">
                Tudo limpo! Finalize para ver o resultado.
              </p>
            )}
          </div>
        </aside>
      </main>

      {state.phase === 'confirmacao' && preview && (
        <RoomConfirmDialog
          room={preview.room}
          roomState={preview.roomState}
          distance={preview.distance}
          cleaningMinutes={preview.cleaningMinutes}
          isReturn={preview.isReturn}
          isDeposito={preview.isDeposito}
          refillMinutes={gameConfig.refillMinutes}
          onConfirm={actions.confirm}
          onCancel={actions.cancel}
        />
      )}

      {state.phase === 'situacao' && situationView && (
        <SituationDialog
          situation={situationView.situation}
          room={situationView.room}
          cards={situationView.cards}
          onChoose={actions.choose}
        />
      )}

      {state.phase === 'final' && (
        <FinalResult
          state={state}
          summary={summary}
          history={game.history}
          onRestart={actions.restart}
          onClearHistory={actions.clearHistory}
        />
      )}
    </div>
  );
}
