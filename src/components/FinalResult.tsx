import { formatMinutes } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { Summary } from '../domain/game';
import type { GameState } from '../domain/types';
import { compareRuns, type HistoryEntry } from '../domain/history';
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
  const excedente = summary.distanceTraveled - summary.minimumSweepMeters;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg/92 p-4 backdrop-blur-md sm:p-8">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-xl bg-surface ring-1 ring-hairline">
        <header className="px-7 pt-7">
          <span className="eyebrow">{completo ? 'Turno concluído' : 'Turno encerrado'}</span>
          <h2 className="mt-2 font-display text-[32px] font-bold leading-none tracking-tight text-ink-hi">
            {completo ? 'Bloco inteiro limpo' : `${summary.concluidas.length} de ${summary.totalObjectives} ambientes`}
          </h2>

          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
            <Grande label="Tempo total" value={formatMinutes(summary.totalMinutes)} unit="min" />
            <Grande label="Distância" value={String(summary.distanceTraveled)} unit="m" accent />
            <div className="min-w-[220px] flex-1">
              <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
            </div>
          </div>
        </header>

        <div className="mx-7 my-6 rule-brass" />

        {/* Onde o tempo foi gasto */}
        <section className="px-7">
          <h3 className="eyebrow">Composição do tempo</h3>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-3">
            {[
              ['bg-ink-low', summary.cleaningMinutes],
              ['bg-player', summary.travelMinutes],
              ['bg-pending', summary.eventMinutes],
              ['bg-blocked', summary.idleMinutes],
            ].map(([tone, value], index) => (
              <div
                key={index}
                className={tone as string}
                style={{ width: `${((value as number) / summary.totalMinutes) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
            <Fatia tone="bg-ink-low" label="Limpeza" value={summary.cleaningMinutes} />
            <Fatia tone="bg-player" label="Deslocamento" value={summary.travelMinutes} />
            <Fatia tone="bg-pending" label="Decisões" value={summary.eventMinutes} />
            {summary.idleMinutes > 0 && (
              <Fatia tone="bg-blocked" label="Ocioso" value={summary.idleMinutes} />
            )}
          </div>

          <p className="mt-5 max-w-3xl text-[12.5px] leading-relaxed text-ink-mid">
            <span className="text-brass" aria-hidden>
              ◆
            </span>{' '}
            Referência espacial mínima:{' '}
            <strong className="data font-semibold text-ink-hi">{summary.minimumSweepMeters} m</strong>{' '}
            — o corredor percorrido uma vez só, sem voltas.
            {excedente > 0 && (
              <>
                {' '}
                Você andou{' '}
                <strong className="data font-semibold text-player">{excedente} m</strong> além disso,
                o equivalente a {formatMinutes(travelMinutes(excedente))} min. Idas ao depósito e
                retornos de pendência explicam parte desse excedente.
              </>
            )}
          </p>
        </section>

        {/* Situação de cada ambiente */}
        <section className="mt-7 px-7">
          <h3 className="eyebrow">Como ficou cada ambiente</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Grupo glyph="✓" tone="text-done" title="Concluídos" rooms={summary.concluidas.map((r) => r.name)} />
            <Grupo glyph="◐" tone="text-pending" title="Com pendência" rooms={summary.pendentes.map((r) => r.name)} />
            <Grupo glyph="◌" tone="text-ink-low" title="Não iniciados" rooms={summary.naoIniciadas.map((r) => r.name)} />
          </div>
        </section>

        {/* Decomposição passo a passo */}
        <section className="mt-7 px-7">
          <h3 className="eyebrow">Decomposição da partida</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-hairline">
                  {['', 'Ação', 'Desloc.', 'Limpeza', 'Decisões', 'Total'].map((header, index) => (
                    <th
                      key={header || index}
                      className={`data pb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-low ${
                        index >= 2 ? 'text-right' : ''
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.log.map((entry) => (
                  <tr key={entry.index} className="border-b border-hairline/50">
                    <td className="data py-2 pr-3 text-[10px] text-ink-low">{entry.index}</td>
                    <td className="py-2 pr-4">
                      <span className="text-ink-hi">{entry.title}</span>
                      <span className="block text-[11px] text-ink-low">{entry.detail}</span>
                    </td>
                    <td className="data py-2 text-right text-player">
                      {entry.deltaDistance > 0 ? `${entry.deltaDistance} m` : '·'}
                    </td>
                    <td className="data py-2 text-right text-ink-mid">
                      {entry.deltaCleaning > 0 ? `${entry.deltaCleaning}′` : '·'}
                    </td>
                    <td className="data py-2 text-right text-pending">
                      {entry.deltaEvent + entry.deltaIdle > 0
                        ? `${formatMinutes(entry.deltaEvent + entry.deltaIdle)}′`
                        : '·'}
                    </td>
                    <td className="data py-2 text-right font-semibold text-ink-hi">
                      {formatMinutes(entry.totalAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {history.length > 1 && (
          <section className="mt-7 px-7">
            <div className="flex items-baseline justify-between">
              <h3 className="eyebrow">Partidas desta oficina</h3>
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[11px] text-ink-low underline underline-offset-2 transition-colors hover:text-ink-mid"
              >
                limpar histórico
              </button>
            </div>
            <ol className="mt-3 space-y-1">
              {[...history].sort(compareRuns).map((entry, index) => (
                <li key={entry.id} className="flex items-center gap-4 border-b border-hairline/50 py-2 text-[12px]">
                  <span className="data w-6 text-[10px] text-ink-low">{index + 1}º</span>
                  <span className="data text-ink-hi">
                    {entry.concluidas}/{entry.totalObjectives}
                  </span>
                  {!entry.complete && (
                    <span className="data text-[10px] uppercase tracking-wider text-pending">incompleta</span>
                  )}
                  <span className="data ml-auto text-ink-mid">
                    {entry.distanceTraveled} m · {formatMinutes(entry.totalMinutes)} min
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="p-7">
          <button
            type="button"
            onClick={onRestart}
            autoFocus
            className="rounded-md bg-player px-7 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90"
          >
            Jogar de novo
          </button>
        </div>
      </div>
    </div>
  );
}

function Grande({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div>
      <p className="data text-[9px] uppercase tracking-[0.16em] text-ink-low">{label}</p>
      <p className={`data mt-1 text-[38px] font-semibold leading-none ${accent ? 'text-player' : 'text-ink-hi'}`}>
        {value}
        <span className="ml-1 text-[15px] font-normal text-ink-low">{unit}</span>
      </p>
    </div>
  );
}

function Fatia({ tone, label, value }: { tone: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2 text-[11.5px]">
      <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden />
      <span className="text-ink-low">{label}</span>
      <span className="data text-ink-mid">{formatMinutes(value)} min</span>
    </span>
  );
}

function Grupo({ glyph, tone, title, rooms }: { glyph: string; tone: string; title: string; rooms: string[] }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[12px] font-medium text-ink-mid">
        <span className={tone} aria-hidden>
          {glyph}
        </span>
        {title}
        <span className="data text-ink-low">{rooms.length}</span>
      </p>
      <ul className="mt-2 space-y-0.5 text-[11.5px] text-ink-low">
        {rooms.length === 0 ? <li>—</li> : rooms.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </div>
  );
}
