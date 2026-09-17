import { useState } from 'react';
import { BuildingMap } from '../components/BuildingMap';
import { RoomConfirmDialog, SituationDialog } from '../components/Dialogs';
import { FinalResult } from '../components/FinalResult';
import {
  Briefing,
  GameHeader,
  MapLegend,
  ProgressPanel,
  TurnJournal,
} from '../components/Panels';
import { gameConfig } from '../data/gameConfig';
import { previewCleaningMinutes } from '../domain/game';
import { useCleaningGame } from '../hooks/useCleaningGame';

export function Game() {
  const game = useCleaningGame();
  const [showRoute, setShowRoute] = useState(true);
  const { state, actions, preview, situationView, summary } = game;

  return (
    <div className="relative min-h-screen">
      <GameHeader
        totalMinutes={game.totalMinutes}
        distance={state.distanceTraveled}
        charges={state.charges}
      />

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <Briefing />

        {/* O mapa é o herói: largura total, moldura de prancheta. */}
        <section className="mt-5 overflow-hidden rounded-xl bg-surface ring-1 ring-hairline">
          <div className="flex items-center justify-between px-5 pt-4">
            <div>
              <span className="eyebrow">Planta do bloco</span>
              <p className="mt-0.5 text-[12px] text-ink-low">
                {state.phase === 'mapa'
                  ? 'Clique num ambiente para ver o custo antes de decidir.'
                  : 'Resolvendo a parada atual…'}
              </p>
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 text-[11.5px] text-ink-mid">
              <input
                type="checkbox"
                checked={showRoute}
                onChange={(event) => setShowRoute(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#5ea9ff]"
              />
              Trajeto
            </label>
          </div>

          <div className="px-3 pb-2 pt-1">
            <BuildingMap
              state={state}
              totalMinutes={game.totalMinutes}
              showRoute={showRoute}
              cleaningMinutesFor={(roomId) => previewCleaningMinutes(state, roomId)}
              minutesUntilFree={game.minutesUntilFree}
              onSelect={actions.select}
            />
          </div>

          <MapLegend />
        </section>

        {game.needsWait && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-surface-2 px-5 py-4 ring-1 ring-pending/30">
            <p className="text-[13px] text-ink-mid">
              <span className="mr-2 text-pending" aria-hidden>
                🔒
              </span>
              Tudo que resta está ocupado no momento. Esperar no corredor adianta o relógio até o
              próximo ambiente liberar.
            </p>
            <button
              type="button"
              onClick={actions.wait}
              className="ml-auto rounded-md bg-pending px-5 py-2 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90"
            >
              Aguardar
            </button>
          </div>
        )}

        {/* Narrativa da partida à esquerda, números à direita. */}
        <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl bg-surface/60 p-5 ring-1 ring-hairline lg:order-1">
            <TurnJournal state={state} />
          </div>

          <aside className="lg:order-2">
            <ProgressPanel summary={summary} />

            <div className="my-5 rule-brass opacity-50" />

            <p className="text-[12px] leading-relaxed text-ink-low">
              <span className="text-brass" aria-hidden>
                ◆
              </span>{' '}
              A ordem das salas muda o resultado. Voltar pelo corredor custa de verdade — o mesmo
              caminho é cobrado nos dois sentidos.
            </p>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={actions.finish}
                className="w-full rounded-md bg-surface-3 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-hi transition-colors hover:bg-player hover:text-bg"
              >
                Encerrar turno
              </button>
              <button
                type="button"
                onClick={actions.restart}
                className="w-full rounded-md py-2 font-display text-[11.5px] font-medium text-ink-low transition-colors hover:text-ink-mid"
              >
                Recomeçar do zero
              </button>
            </div>

            {game.complete && (
              <p className="mt-4 flex items-center gap-2 text-[12px] text-done">
                <span aria-hidden>✓</span>
                Bloco inteiro limpo. Encerre para ver o resultado.
              </p>
            )}
          </aside>
        </div>
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
