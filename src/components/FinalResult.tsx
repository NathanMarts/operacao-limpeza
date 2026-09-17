import { formatMeters, formatMinutes } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { Summary } from '../domain/game';
import type { GameState } from '../domain/types';
import { compareRuns, type HistoryEntry } from '../domain/history';
import { ShiftBar } from './Panels';
import { Icon } from './icons';
import type { ComponentType } from 'react';

type Props = {
  state: GameState;
  summary: Summary;
  history: HistoryEntry[];
  onRestart: () => void;
  onClearHistory: () => void;
};

export function FinalResult({ state, summary, history, onRestart, onClearHistory }: Props) {
  const completo = summary.concluidas.length === summary.totalObjectives;
  const excedente = summary.distanceTraveled - summary.minimumSweepMeters;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 sm:p-8">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-line bg-modal p-6 sm:p-7">
        <header>
          <p className="text-[13px] text-txt-2">{completo ? 'Turno concluído' : 'Turno encerrado'}</p>
          <h2 className="mt-1 text-[28px] font-bold leading-tight text-txt">
            {completo
              ? 'Bloco inteiro limpo!'
              : `${summary.concluidas.length} de ${summary.totalObjectives} ambientes concluídos`}
          </h2>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Icon.tempo} label="Tempo total" value={`${formatMinutes(summary.totalMinutes)} min`} destaque />
          <Metric icon={Icon.distancia} label="Distância total" value={`${formatMeters(summary.distanceTraveled)} m`} />
          <Metric icon={Icon.limpeza} label="Tempo de limpeza" value={`${formatMinutes(summary.cleaningMinutes)} min`} />
          <Metric icon={Icon.decisoes} label="Tempo de decisões" value={`${formatMinutes(summary.eventMinutes)} min`} />
        </div>

        <div className="mt-4 rounded-xl border border-line bg-panel p-4">
          <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
          <p className="mt-3 text-[13px] leading-relaxed text-txt-2">
            Referência espacial mínima: <strong className="text-txt">{formatMeters(summary.minimumSweepMeters)} m</strong>{' '}
            — o corredor percorrido uma única vez, sem voltas.
            {excedente > 0 && (
              <>
                {' '}
                Você percorreu <strong className="text-txt">{formatMeters(excedente)} m</strong> a mais, o equivalente a{' '}
                {formatMinutes(travelMinutes(excedente))} min. Idas ao depósito e retornos de pendência
                explicam parte dessa diferença.
              </>
            )}
          </p>
        </div>

        <section className="mt-6">
          <h3 className="text-[15px] font-semibold text-txt">Como ficou cada ambiente</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Grupo cor="#34d399" icon={Icon.concluida} title="Concluídos" rooms={summary.concluidas.map((r) => r.name)} />
            <Grupo cor="#f0b429" icon={Icon.pendente} title="Com pendência" rooms={summary.pendentes.map((r) => r.name)} />
            <Grupo cor="#5b6472" icon={Icon.naoIniciada} title="Não iniciados" rooms={summary.naoIniciadas.map((r) => r.name)} />
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-[15px] font-semibold text-txt">Decomposição da partida</h3>
          <div className="scroll-slim mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead className="bg-panel text-txt-2">
                <tr>
                  {['#', 'Ação', 'Desloc.', 'Limpeza', 'Decisões', 'Total'].map((header, index) => (
                    <th key={header} className={`px-3 py-2 font-medium ${index >= 2 ? 'text-right' : ''}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.log.map((entry) => (
                  <tr key={entry.index}>
                    <td className="px-3 py-2 text-txt-3">{entry.index}</td>
                    <td className="px-3 py-2">
                      <span className="text-txt">{entry.title}</span>
                      <span className="block text-[12px] text-txt-3">{entry.detail}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-accent">
                      {entry.deltaDistance > 0 ? `${formatMeters(entry.deltaDistance)} m` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-txt-2">
                      {entry.deltaCleaning > 0 ? `${entry.deltaCleaning} min` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-warn">
                      {entry.deltaEvent + entry.deltaIdle > 0
                        ? `${formatMinutes(entry.deltaEvent + entry.deltaIdle)} min`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-txt">
                      {formatMinutes(entry.totalAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {history.length > 1 && (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-txt">Partidas desta oficina</h3>
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[12.5px] text-txt-3 underline underline-offset-2 hover:text-txt-2"
              >
                Limpar histórico
              </button>
            </div>
            <ol className="mt-3 space-y-1.5">
              {[...history].sort(compareRuns).map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2 text-[13px]"
                >
                  <span className="w-6 text-txt-3">{index + 1}º</span>
                  <span className="font-semibold text-txt">
                    {entry.concluidas}/{entry.totalObjectives}
                  </span>
                  {!entry.complete && (
                    <span className="rounded bg-warn/15 px-2 py-0.5 text-[11px] text-warn">incompleta</span>
                  )}
                  <span className="ml-auto tabular-nums text-txt-2">
                    {formatMeters(entry.distanceTraveled)} m · {formatMinutes(entry.totalMinutes)} min
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-7">
          <button
            type="button"
            onClick={onRestart}
            autoFocus
            className="rounded-xl bg-accent px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#6189f5]"
          >
            Jogar novamente
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

function Grupo({
  cor,
  icon: Glyph,
  title,
  rooms,
}: {
  cor: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  rooms: string[];
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-txt">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: cor }}
          aria-hidden
        >
          <Glyph className="h-3 w-3 text-[#0b1822]" />
        </span>
        {title}
        <span className="text-txt-3">({rooms.length})</span>
      </p>
      <ul className="mt-2 space-y-0.5 text-[12.5px] text-txt-2">
        {rooms.length === 0 ? <li className="text-txt-3">—</li> : rooms.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </div>
  );
}
