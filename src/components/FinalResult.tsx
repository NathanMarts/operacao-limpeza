import { formatMinutes } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { Summary } from '../domain/game';
import type { GameState } from '../domain/types';
import type { HistoryEntry } from '../domain/history';
import { compareRuns } from '../domain/history';
import { ShiftBar } from './Panels';

type Props = {
  state: GameState;
  summary: Summary;
  history: HistoryEntry[];
  onRestart: () => void;
  onClearHistory: () => void;
};

export function FinalResult({ state, summary, history, onRestart, onClearHistory }: Props) {
  const completo = summary.concluidas.length === summary.totalObjectives;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-2xl font-bold text-slate-50">
          {completo ? 'Bloco limpo!' : 'Expediente encerrado'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {completo
            ? `Você concluiu os ${summary.totalObjectives} ambientes.`
            : `Você concluiu ${summary.concluidas.length} de ${summary.totalObjectives} ambientes.`}
        </p>

        {/* Totais separados, como pede a especificação */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Distância total" value={`${summary.distanceTraveled} m`} accent />
          <Metric label="Tempo de limpeza" value={`${formatMinutes(summary.cleaningMinutes)} min`} />
          <Metric label="Tempo de deslocamento" value={`${formatMinutes(summary.travelMinutes)} min`} />
          <Metric label="Tempo de eventos" value={`${formatMinutes(summary.eventMinutes)} min`} />
        </div>

        <div className="mt-3 rounded-xl border border-sky-800/60 bg-sky-500/10 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-300">Tempo total</span>
            <span className="text-2xl font-bold tabular-nums text-sky-300">
              {formatMinutes(summary.totalMinutes)} min
            </span>
          </div>
          <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
          <p className="mt-2 text-xs text-slate-400">
            Referência espacial mínima: <strong>{summary.minimumSweepMeters} m</strong> — o corredor
            percorrido uma única vez, sem voltas. Você percorreu{' '}
            <strong>{summary.distanceTraveled} m</strong>
            {summary.distanceTraveled > summary.minimumSweepMeters && (
              <>
                {' '}({summary.distanceTraveled - summary.minimumSweepMeters} m a mais ={' '}
                {formatMinutes(travelMinutes(summary.distanceTraveled - summary.minimumSweepMeters))}{' '}
                min). Idas ao depósito, pendências e decisões podem justificar parte dessa diferença.
              </>
            )}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <StatusList title="Concluídas" tone="emerald" rooms={summary.concluidas.map((r) => r.name)} />
          <StatusList title="Pendentes" tone="orange" rooms={summary.pendentes.map((r) => r.name)} />
          <StatusList title="Não iniciadas" tone="slate" rooms={summary.naoIniciadas.map((r) => r.name)} />
        </div>

        {/* Decomposição passo a passo */}
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-200">Decomposição da partida</h3>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 text-right font-medium">Desloc.</th>
                  <th className="px-3 py-2 text-right font-medium">Limpeza</th>
                  <th className="px-3 py-2 text-right font-medium">Eventos</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {state.log.map((entry) => (
                  <tr key={entry.index} className="text-slate-300">
                    <td className="px-3 py-1.5 text-slate-500">{entry.index}</td>
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{entry.title}</span>
                      <span className="block text-[11px] text-slate-500">{entry.detail}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-sky-400">
                      {entry.deltaDistance > 0 ? `${entry.deltaDistance} m` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {entry.deltaCleaning > 0 ? `${entry.deltaCleaning} min` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-orange-400">
                      {entry.deltaEvent + entry.deltaIdle > 0
                        ? `${formatMinutes(entry.deltaEvent + entry.deltaIdle)} min`
                        : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
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
              <h3 className="text-sm font-semibold text-slate-200">Partidas desta oficina</h3>
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-slate-500 underline hover:text-slate-300"
              >
                Limpar histórico
              </button>
            </div>
            <ol className="mt-2 space-y-1">
              {[...history].sort(compareRuns).map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs"
                >
                  <span className="w-5 text-slate-500">{index + 1}º</span>
                  <span className="font-medium text-slate-300">
                    {entry.concluidas}/{entry.totalObjectives}
                  </span>
                  {!entry.complete && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                      incompleta
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-slate-400">
                    {entry.distanceTraveled} m · {formatMinutes(entry.totalMinutes)} min
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onRestart}
            autoFocus
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Jogar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${accent ? 'text-sky-300' : 'text-slate-100'}`}>
        {value}
      </p>
    </div>
  );
}

function StatusList({ title, tone, rooms }: { title: string; tone: string; rooms: string[] }) {
  const ring =
    tone === 'emerald'
      ? 'border-emerald-800/60'
      : tone === 'orange'
        ? 'border-orange-800/60'
        : 'border-slate-800';
  return (
    <div className={`rounded-xl border ${ring} bg-slate-900/60 p-3`}>
      <h4 className="text-xs font-semibold text-slate-300">
        {title} <span className="text-slate-500">({rooms.length})</span>
      </h4>
      <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
        {rooms.length === 0 ? <li>—</li> : rooms.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </div>
  );
}
