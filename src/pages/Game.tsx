import { useState } from 'react';
import { BuildingMap } from '../components/BuildingMap';
import { RoomConfirmDialog, SituationDialog } from '../components/Dialogs';
import { FinalResult } from '../components/FinalResult';
import {
  GameHeader,
  Instructions,
  Legend,
  ObjectivePanel,
  SequencePanel,
  SummaryPanel,
  TipPanel,
} from '../components/Panels';
import { gameConfig } from '../data/gameConfig';
import { previewCleaningMinutes } from '../domain/game';
import { useCleaningGame } from '../hooks/useCleaningGame';
import { Icon } from '../components/icons';

export function Game() {
  const game = useCleaningGame();
  const [tab, setTab] = useState<'mapa' | 'instrucoes'>('mapa');
  const [showRoute, setShowRoute] = useState(true);
  /* Mapa expandido: esconde a coluna de apoio e devolve a largura ao desenho. */
  const [expandido, setExpandido] = useState(false);
  const { state, actions, preview, situationView, summary } = game;

  return (
    <div className="min-h-screen bg-bg">
      <GameHeader
        totalMinutes={game.totalMinutes}
        distance={state.distanceTraveled}
        charges={state.charges}
        tab={tab}
        onTab={setTab}
      />

      <main
        className={`mx-auto grid items-start gap-4 p-4 lg:p-5 ${
          expandido ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-[280px_minmax(0,1fr)_300px]'
        }`}
      >
        {/* Coluna esquerda: sai de cena quando o mapa é expandido */}
        {!expandido && (
          <aside className="space-y-4">
            <ObjectivePanel />
            <Legend />
            <TipPanel />
          </aside>
        )}

        {/* Centro */}
        <section className="min-w-0">
          {tab === 'mapa' ? (
            <div className="relative overflow-hidden rounded-xl border border-line bg-map-bg p-4">
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-[12.5px] text-txt-2">
                  <input
                    type="checkbox"
                    checked={showRoute}
                    onChange={(event) => setShowRoute(event.target.checked)}
                    className="h-3.5 w-3.5 accent-[#4f7df3]"
                  />
                  Trajeto
                </label>
                <button
                  type="button"
                  onClick={() => setExpandido((atual) => !atual)}
                  aria-pressed={expandido}
                  title={expandido ? 'Voltar ao layout completo' : 'Expandir o mapa'}
                  className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-[12.5px] text-txt-2 transition-colors hover:bg-btn hover:text-txt"
                >
                  {expandido ? (
                    <Icon.recolher className="h-[15px] w-[15px]" aria-hidden />
                  ) : (
                    <Icon.expandir className="h-[15px] w-[15px]" aria-hidden />
                  )}
                  {expandido ? 'Recolher' : 'Expandir'}
                </button>
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
          ) : (
            <Instructions />
          )}

          {game.needsWait && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-warn/40 bg-warn/10 px-5 py-4">
              <Icon.bloqueada className="h-5 w-5 shrink-0 text-warn" aria-hidden />
              <p className="flex-1 text-[13.5px] text-txt">
                Todos os ambientes restantes estão ocupados no momento. Aguardar no corredor adianta o
                relógio até o próximo liberar.
              </p>
              <button
                type="button"
                onClick={actions.wait}
                className="ml-auto rounded-lg bg-warn px-5 py-2 text-[14px] font-semibold text-[#2b1f02] transition-opacity hover:opacity-90"
              >
                Aguardar no corredor
              </button>
            </div>
          )}
        </section>

        {/* Coluna direita */}
        <aside className="space-y-4">
          <SequencePanel state={state} />
          <SummaryPanel summary={summary} />

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={actions.restart}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-panel py-3 text-[14.5px] font-medium text-txt transition-colors hover:bg-btn"
            >
              <Icon.reiniciar className="h-[17px] w-[17px]" aria-hidden /> Reiniciar
            </button>
            <button
              type="button"
              onClick={actions.finish}
              disabled={state.route.length === 0}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-btn py-3 text-[14.5px] font-medium text-txt transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-txt-3 disabled:hover:bg-btn"
            >
              <Icon.finalizar className="h-[17px] w-[17px]" aria-hidden /> Finalizar limpeza
            </button>
            {game.complete && (
              <p className="flex items-center justify-center gap-2 text-[13px] text-ok">
                <Icon.concluida className="h-4 w-4" aria-hidden />
                Bloco inteiro limpo! Finalize para ver o resultado.
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
          distance={state.route.at(-1)?.distance ?? 0}
          cleaningMinutes={previewCleaningMinutes(state, situationView.room.id)}
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
