import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { duracaoCSS, usePresenca, useReducedMotion } from '../hooks/useMotion';
import { BuildingMap } from '../components/BuildingMap';
import { RoomConfirmDialog, SituationDialog } from '../components/Dialogs';
import { FinalResult } from '../components/FinalResult';
import {
  BuffPanel,
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
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<'mapa' | 'instrucoes'>('mapa');
  const [showRoute, setShowRoute] = useState(true);
  /* Mapa expandido: esconde a coluna de apoio e devolve a largura ao desenho. */
  const [expandido, setExpandido] = useState(false);
  /* Trecho em exibição; `null` acompanha o trecho atual. */
  const [stepVisivel, setStepVisivel] = useState<number | null>(null);
  /**
   * O trabalhador está atravessando o corredor. Enquanto isto durar, o mapa
   * segue visível, o pino caminha, o trecho se desenha — e a situação do
   * ambiente espera. Sem esta pausa, a animação do pino existia mas era coberta
   * pelo modal antes de qualquer quadro aparecer.
   */
  const [caminhando, setCaminhando] = useState(false);
  const reduzido = useReducedMotion();
  const paradasAntes = useRef(0);
  const { state, actions, preview, situationView, summary } = game;

  /**
   * Uma parada nova significa que houve deslocamento: dá tempo de vê-lo.
   *
   * O ajuste acontece DURANTE a renderização, não num efeito. O domínio troca
   * de fase e cresce a rota no mesmo update; um efeito só marcaria a caminhada
   * no commit seguinte, e nesse quadro do meio a cena da situação já se dava
   * por liberada — ela montava, saía animada e voltava. Atualizar aqui faz o
   * React refazer esta renderização antes de pintar qualquer coisa.
   *
   * A comparação é por diferença, não por "cresceu": reiniciar a partida zera
   * a rota, e sem ressincronizar a referência a próxima viagem não contaria.
   */
  const paradas = state.route.length;
  if (paradas !== paradasAntes.current) {
    const andou = paradas > paradasAntes.current;
    paradasAntes.current = paradas;
    if (andou && !reduzido) setCaminhando(true);
  }

  /**
   * Presença visual das duas cenas. O domínio muda de fase na hora; a casca
   * fica mais 180ms para sair animada. Como `preview` e `situationView` viram
   * nulos junto com a fase, guardo o último valor para a saída ter o que
   * desenhar — é estado de apresentação, não de jogo.
   */
  const cenaConfirmacao = usePresenca(state.phase === 'confirmacao' && !!preview);
  const cenaSituacao = usePresenca(state.phase === 'situacao' && !!situationView && !caminhando);
  const ultimoPreview = useRef(preview);
  const ultimaSituacao = useRef(situationView);
  if (preview) ultimoPreview.current = preview;
  if (situationView) ultimaSituacao.current = situationView;
  const previewVisivel = preview ?? ultimoPreview.current;
  const situacaoVisivel = situationView ?? ultimaSituacao.current;

  /* Andar de novo volta a exibir o trecho atual em vez de congelar no passado. */
  useEffect(() => setStepVisivel(null), [state.route.length]);

  /* Relógio da caminhada. Depende também do número de paradas: sem isso, uma
     segunda viagem começada antes do fim da primeira herdaria o tempo que
     sobrou dela, em vez de ganhar o seu. */
  useEffect(() => {
    if (!caminhando) return;
    /* Um pouco mais que a duração do movimento: o pino chega e assenta antes
       de a situação do ambiente entrar. */
    const espera = duracaoCSS('--dur-move', 520) + 60;
    const relogio = setTimeout(() => setCaminhando(false), espera);
    return () => clearTimeout(relogio);
  }, [caminhando, paradas]);

  return (
    <div className="min-h-screen bg-bg">
      <GameHeader
        totalMinutes={game.totalMinutes}
        distance={state.distanceTraveled}
        charges={state.charges}
        tab={tab}
        onTab={setTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main
        className={`mx-auto grid items-start gap-4 p-4 lg:p-5 ${
          expandido ? 'lg:grid-cols-[minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)_300px]'
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
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
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
                selectedStep={stepVisivel}
                caminhando={caminhando}
                ultimoLog={state.log.at(-1) ?? null}
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
                className="ml-auto rounded-lg bg-warn px-5 py-2 text-[14px] font-semibold text-warn-ink transition-opacity hover:opacity-90"
              >
                Aguardar no corredor
              </button>
            </div>
          )}
        </section>

        {/* Coluna direita: sai de cena junto com a esquerda quando o mapa é
            expandido. Reiniciar e Finalizar moram aqui, mas o botão Recolher
            fica no canto do próprio mapa, então continuam a um clique. */}
        {!expandido && (
          <aside className="space-y-4">
            <BuffPanel buffs={state.buffs} />
            <SequencePanel state={state} selectedStep={stepVisivel} onSelectStep={setStepVisivel} />
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
        )}
      </main>

      {cenaConfirmacao.presente && previewVisivel && (
        <RoomConfirmDialog
          room={previewVisivel.room}
          roomState={previewVisivel.roomState}
          distance={previewVisivel.distance}
          cleaningMinutes={previewVisivel.cleaningMinutes}
          isReturn={previewVisivel.isReturn}
          isDeposito={previewVisivel.isDeposito}
          refillMinutes={gameConfig.refillMinutes}
          saindo={cenaConfirmacao.saindo}
          onConfirm={actions.confirm}
          onCancel={actions.cancel}
        />
      )}

      {cenaSituacao.presente && situacaoVisivel && (
        <SituationDialog
          situation={situacaoVisivel.situation}
          room={situacaoVisivel.room}
          distance={state.route.at(-1)?.distance ?? 0}
          cleaningMinutes={previewCleaningMinutes(state, situacaoVisivel.room.id)}
          cards={situacaoVisivel.cards}
          saindo={cenaSituacao.saindo}
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
