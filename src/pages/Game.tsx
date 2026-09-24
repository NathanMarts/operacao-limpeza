import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { duracaoCSS, usePresenca, useReducedMotion } from '../hooks/useMotion';
import { BuildingMap } from '../components/BuildingMap';
import { RoomConfirmDialog, SituationDialog } from '../components/Dialogs';
import { FinalResult } from '../components/FinalResult';
import { HistoryPanel } from '../components/HistoryPanel';
import {
  BuffPanel,
  GameHeader,
  Instructions,
  MapPanel,
  type GameTab,
  Legend,
  ObjectivePanel,
  SequencePanel,
  SummaryPanel,
  TipPanel,
} from '../components/Panels';
import { gameConfig } from '../data/gameConfig';
import { previewCleaningMinutes } from '../domain/game';
import { DEPOSITO_POSITION } from '../data/rooms';
import { formatMeters, formatMinutes } from '../domain/effects';
import { distanceBetween, travelMinutes } from '../domain/movement';
import type { RoomDef } from '../domain/types';

/**
 * Aviso do "saia e volte", com o atalho. O mapa já desenha a volta pelo
 * depósito; o aviso existe para quem não percebeu, e o botão faz as duas idas.
 */
function AvisoSaiaEVolte({ sala, compacto, onClick }: { sala: RoomDef; compacto: boolean; onClick: () => void }) {
  const metros = 2 * distanceBetween(sala.corridorPosition, DEPOSITO_POSITION);
  const minutos = travelMinutes(metros) + gameConfig.refillMinutes;
  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-warn/50 ${
        compacto ? 'mr-auto bg-panel px-3.5 py-2 shadow-lg' : 'mt-4 bg-warn/10 px-5 py-4'
      }`}
    >
      <Icon.mapa className="h-4 w-4 shrink-0 text-warn" aria-hidden />
      <p className={`min-w-0 flex-1 text-txt ${compacto ? 'text-[12.5px]' : 'text-[13.5px]'}`}>
        Falta só {sala.name}, onde você está. Para voltar a ela, é preciso sair: ir ao depósito e voltar
        ({formatMeters(metros)} m, cerca de {formatMinutes(minutos)} min com a recarga).
      </p>
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 rounded-md bg-warn font-semibold text-warn-ink transition-opacity hover:opacity-90 ${
          compacto ? 'px-3 py-1.5 text-[12.5px]' : 'px-5 py-2 text-[14px]'
        }`}
      >
        Ir ao depósito e voltar
      </button>
    </div>
  );
}
import { useCleaningGame } from '../hooks/useCleaningGame';
import { Icon } from '../components/icons';

export function Game() {
  const game = useCleaningGame();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<GameTab>('mapa');
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

  /**
   * Bloco inteiro limpo encerra o turno sozinho: não há mais o que decidir.
   * Espera a caminhada e mais um instante, para o último ambiente ficar verde
   * no mapa antes de o resultado cobrir tudo.
   */
  const terminou = state.phase === 'mapa' && game.complete && !caminhando;
  useEffect(() => {
    if (!terminou) return;
    const relogio = setTimeout(actions.finish, reduzido ? 0 : 900);
    return () => clearTimeout(relogio);
  }, [terminou, actions.finish, reduzido]);

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
            <div
              className={`relative overflow-hidden rounded-xl border border-line bg-map-bg p-4 ${
                /* Expandido, a faixa de baixo guarda os botões e alertas sem cobrir o desenho. */
                expandido ? 'pb-20' : ''
              }`}
            >
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

              {/*
                Com o mapa expandido a coluna da direita sai de cena e levaria
                as vantagens em vigor com ela — justamente o dado que explica
                por que uma limpeza não cobrou carga. O abatimento só existe no
                log, e o log só aparece na tela final, então sem isto o bônus
                fica invisível durante a partida inteira.

                Sobreposto, não no fluxo: em cima do mapa ele empurrava o
                desenho para baixo a cada vantagem ganha. Aqui mora na mesma
                faixa de cima que já é dos controles, e o desenho não se move.
              */}
              {expandido && (
                <div className="absolute left-4 top-4 z-10 w-[250px] space-y-3">
                  <MapPanel state={state} />
                  <BuffPanel buffs={state.buffs} />
                </div>
              )}

              {/* Mapa expandido: as colunas saem de cena, e Reiniciar e
                  Finalizar vêm junto, no canto inferior direito do mapa. */}
              {expandido && (
                <div className="absolute inset-x-4 bottom-8 z-10 flex items-end justify-end gap-2">
                  {/* Os alertas que ficariam abaixo do mapa sobem para esta
                      faixa, ao lado dos botões: expandido, o que está abaixo
                      do mapa sai da tela. */}
                  {game.precisaSair && (
                    <AvisoSaiaEVolte sala={game.precisaSair} compacto onClick={actions.sairEVoltar} />
                  )}
                  {game.needsWait && (
                    <div className="mr-auto flex min-w-0 items-center gap-3 rounded-lg border border-warn/50 bg-panel px-3.5 py-2 shadow-lg">
                      <Icon.bloqueada className="h-4 w-4 shrink-0 text-warn" aria-hidden />
                      <p className="min-w-0 text-[12.5px] text-txt">
                        Não há para onde ir agora: o que falta (e o depósito) está fechado.
                      </p>
                      <button
                        type="button"
                        onClick={actions.wait}
                        className="shrink-0 rounded-md bg-warn px-3 py-1.5 text-[12.5px] font-semibold text-warn-ink transition-opacity hover:opacity-90"
                      >
                        Aguardar no corredor
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={actions.restart}
                    className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2 text-[13px] font-medium text-txt shadow-lg transition-colors hover:bg-btn"
                  >
                    <Icon.reiniciar className="h-[15px] w-[15px]" aria-hidden /> Reiniciar
                  </button>
                  <button
                    type="button"
                    onClick={actions.finish}
                    disabled={state.route.length === 0}
                    className="flex items-center gap-2 rounded-lg border border-line bg-btn px-3.5 py-2 text-[13px] font-medium text-txt shadow-lg transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-txt-3 disabled:hover:bg-btn"
                  >
                    <Icon.finalizar className="h-[15px] w-[15px]" aria-hidden /> Finalizar limpeza
                  </button>
                </div>
              )}

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
          ) : tab === 'instrucoes' ? (
            <Instructions />
          ) : (
            <HistoryPanel history={game.history} onClear={actions.clearHistory} />
          )}

          {game.precisaSair && !expandido && (
            <AvisoSaiaEVolte sala={game.precisaSair} compacto={false} onClick={actions.sairEVoltar} />
          )}

          {game.needsWait && !expandido && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-warn/40 bg-warn/10 px-5 py-4">
              <Icon.bloqueada className="h-5 w-5 shrink-0 text-warn" aria-hidden />
              <p className="flex-1 text-[13.5px] text-txt">
                Não há para onde ir agora: os ambientes restantes (e o depósito) estão fechados.
                Aguardar no corredor adianta o relógio até o próximo liberar.
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
            <MapPanel state={state} />
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
          notas={previewVisivel.notas}
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
          summary={summary}
          history={game.history}
          onRestart={actions.restart}
          onShowHistory={() => {
            actions.restart();
            setTab('historico');
          }}
        />
      )}
    </div>
  );
}
