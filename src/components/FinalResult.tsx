import { useEffect, useRef } from 'react';
import { formatMeters, formatMinutes } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { Summary } from '../domain/game';
import { compareRuns, type HistoryEntry } from '../domain/history';
import { ShiftBar } from './Panels';
import { Icon } from './icons';
import type { ComponentType } from 'react';

type Props = {
  summary: Summary;
  history: HistoryEntry[];
  onRestart: () => void;
  onShowHistory: () => void;
};

/**
 * Resultado do turno: só os números que respondem "como fui?". O detalhe de
 * cada partida — rota, decisões, comparação com as outras — mora na aba
 * Histórico, que existe justamente para isso.
 */
export function FinalResult({ summary, history, onRestart, onShowHistory }: Props) {
  const completo = summary.concluidas.length === summary.totalObjectives;
  const excedente = summary.distanceTraveled - summary.minimumSweepMeters;
  const jogarNovamente = useRef<HTMLButtonElement>(null);

  /* Foco no botão principal sem rolar até ele: com `autoFocus` o navegador
     levava o modal para o rodapé e o jogador abria o resultado pelo fim. */
  useEffect(() => jogarNovamente.current?.focus({ preventScroll: true }), []);

  /* A partida recém-encerrada é a mais nova do histórico. */
  const posicao = history.length > 1 ? [...history].sort(compareRuns).findIndex((e) => e.id === history[0].id) + 1 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 sm:p-8">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-2xl border border-line bg-modal p-6 sm:p-7">
        <header>
          <p className="text-[13px] text-txt-2">{completo ? 'Turno concluído' : 'Turno encerrado'}</p>
          <h2 className="mt-1 text-[28px] font-bold leading-tight text-txt">
            {completo
              ? 'Bloco inteiro limpo!'
              : `${summary.concluidas.length} de ${summary.totalObjectives} ambientes concluídos`}
          </h2>
          {posicao > 0 && (
            <p className="mt-2 text-[14px] text-txt-2">
              {posicao === 1 ? (
                <strong className="text-ok">Sua melhor partida até agora!</strong>
              ) : (
                <>
                  <strong className="text-txt">{posicao}º lugar</strong> entre as {history.length} partidas deste
                  navegador.
                </>
              )}
            </p>
          )}
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric icon={Icon.tempo} label="Tempo total" value={`${formatMinutes(summary.totalMinutes)} min`} destaque />
          <Metric icon={Icon.distancia} label="Distância" value={`${formatMeters(summary.distanceTraveled)} m`} />
          <Metric
            icon={Icon.concluida}
            label="Ambientes concluídos"
            value={`${summary.concluidas.length}/${summary.totalObjectives}`}
          />
        </div>

        {!completo && (
          <p className="mt-3 text-[13px] text-txt-2">
            Ficaram para trás: {summary.pendentes.length} com pendência e {summary.naoIniciadas.length} não iniciados.
          </p>
        )}

        <div className="mt-4 rounded-xl border border-line bg-panel p-4">
          <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
          <p className="mt-3 text-[13px] leading-relaxed text-txt-2">
            {excedente > 0 ? (
              <>
                Você andou <strong className="text-txt">{formatMeters(excedente)} m</strong> a mais que o mínimo
                ({formatMeters(summary.minimumSweepMeters)} m), o equivalente a{' '}
                {formatMinutes(travelMinutes(excedente))} min de caminhada.
              </>
            ) : (
              <>Você percorreu o corredor uma única vez, sem voltas: o mínimo possível.</>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            ref={jogarNovamente}
            type="button"
            onClick={onRestart}
            className="rounded-xl bg-accent px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#6189f5]"
          >
            Jogar novamente
          </button>
          <button
            type="button"
            onClick={onShowHistory}
            className="flex items-center gap-2 rounded-xl border border-line bg-panel px-5 py-3 text-[14.5px] font-medium text-txt transition-colors hover:bg-btn"
          >
            <Icon.historico className="h-[17px] w-[17px]" aria-hidden />
            Ver histórico
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Glyph,
  label,
  value,
  destaque,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        destaque ? 'border-accent/40 bg-total-box' : 'border-line bg-panel'
      }`}
    >
      <Glyph className={`h-5 w-5 shrink-0 ${destaque ? 'text-accent' : 'text-txt-2'}`} aria-hidden />
      <div>
        <p className="text-[12px] leading-none text-txt-2">{label}</p>
        <p className="mt-1 text-[21px] font-bold leading-none tabular-nums text-txt">{value}</p>
      </div>
    </div>
  );
}
