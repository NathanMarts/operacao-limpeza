import { formatMinutes } from '../domain/effects';
import { gameConfig } from '../data/gameConfig';
import { objectives } from '../data/rooms';
import type { GameState, LogEntry } from '../domain/types';
import type { Summary } from '../domain/game';

export function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <div className="mt-3 text-sm text-slate-400">{children}</div>
    </section>
  );
}

export function GameHeader({
  totalMinutes,
  distance,
  charges,
}: {
  totalMinutes: number;
  distance: number;
  charges: number;
}) {
  const overShift = totalMinutes > gameConfig.referenceShiftMinutes;
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-800 bg-slate-900/60 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>🧹</span>
        <div>
          <h1 className="text-lg font-bold leading-tight text-slate-50">Operação Limpeza</h1>
          <p className="text-xs text-slate-500">Planeje. Limpe. Otimize.</p>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap gap-2">
        <Stat label="Tempo total" value={`${formatMinutes(totalMinutes)} min`} accent={overShift} />
        <Stat label="Distância percorrida" value={`${distance} m`} />
        <Stat label="Material" value={`${charges}/${gameConfig.maxCharges}`} accent={charges === 0} />
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-1.5 ${
        accent ? 'border-amber-600/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-base font-bold ${accent ? 'text-amber-300' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function RoutePanel({ state }: { state: GameState }) {
  const steps = state.route;
  return (
    <Card title="Sua sequência" icon="🧭">
      {steps.length === 0 ? (
        <p className="text-xs text-slate-500">Escolha a primeira sala no mapa.</p>
      ) : (
        <ol className="space-y-1.5">
          {steps.map((step, index) => (
            <li key={index} className="flex items-center gap-2 text-xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                {index + 1}
              </span>
              <span className="flex-1 truncate text-slate-300">
                {step.roomName}
                {step.purpose === 'retorno' && <span className="text-orange-400"> (retorno)</span>}
                {step.purpose === 'deposito' && <span className="text-emerald-400"> (recarga)</span>}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">{step.distance} m</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function SummaryPanel({ summary }: { summary: Summary }) {
  const rows: [string, string][] = [
    ['Salas concluídas', `${summary.concluidas.length} / ${summary.totalObjectives}`],
    ['Pendentes', String(summary.pendentes.length)],
    ['Tempo de limpeza', `${formatMinutes(summary.cleaningMinutes)} min`],
    ['Tempo de deslocamento', `${formatMinutes(summary.travelMinutes)} min`],
    ['Tempo de eventos', `${formatMinutes(summary.eventMinutes)} min`],
  ];
  if (summary.idleMinutes > 0) {
    rows.push(['Tempo ocioso', `${formatMinutes(summary.idleMinutes)} min`]);
  }

  return (
    <Card title="Resumo atual" icon="📊">
      <dl className="space-y-1.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="tabular-nums font-medium text-slate-300">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-lg bg-slate-800/70 p-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Tempo total</span>
          <span className="tabular-nums font-bold text-sky-300">
            {formatMinutes(summary.totalMinutes)} min
          </span>
        </div>
        <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
      </div>
    </Card>
  );
}

export function ShiftBar({ total, reference }: { total: number; reference: number }) {
  const pct = Math.min(100, (total / reference) * 100);
  const over = total > reference;
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        Turno de referência: {reference} min {over && <span className="text-amber-400">— ultrapassado</span>}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ActionLog({ log }: { log: LogEntry[] }) {
  if (log.length === 0) return null;
  return (
    <Card title="O que mudou o total" icon="🧾">
      <ol className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {[...log].reverse().map((entry) => (
          <li key={entry.index} className="border-l-2 border-slate-800 pl-2 text-xs">
            <p className="font-medium text-slate-300">{entry.title}</p>
            <p className="text-slate-500">{entry.detail}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] tabular-nums text-slate-600">
              {entry.deltaDistance > 0 && <span className="text-sky-400">+{entry.deltaDistance} m</span>}
              {entry.deltaCleaning > 0 && <span className="text-rose-400">+{entry.deltaCleaning} min limpeza</span>}
              {entry.deltaEvent > 0 && <span className="text-orange-400">+{entry.deltaEvent} min evento</span>}
              {entry.deltaIdle > 0 && <span className="text-slate-400">+{entry.deltaIdle} min ocioso</span>}
              {entry.deltaCharges !== 0 && (
                <span className="text-amber-400">
                  {entry.deltaCharges > 0 ? '+' : ''}
                  {entry.deltaCharges} cargas
                </span>
              )}
              <span>→ {formatMinutes(entry.totalAfter)} min</span>
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function Legend() {
  return (
    <Card title="Legenda" icon="🗺️">
      <ul className="space-y-1.5 text-xs">
        {[
          ['#bfe4f7', 'Sala grande'],
          ['#fbdfae', 'Sala média'],
          ['#b9ecd0', 'Sala pequena'],
          ['#6fc9b4', 'Sala estreita'],
          ['#4fb8a5', 'Banheiro'],
          ['#d8cdf0', 'Área técnica / depósito'],
          ['#fde9a9', 'Escada / entrada'],
        ].map(([color, label]) => (
          <li key={label} className="flex items-center gap-2">
            <span className="h-3 w-4 rounded-sm border border-slate-700" style={{ background: color }} />
            <span className="text-slate-400">{label}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
        <li>✓ concluída · hachura laranja = pendente · 🔒 = bloqueada temporariamente</li>
        <li>O ponto azul mostra onde você está no corredor.</li>
      </ul>
    </Card>
  );
}

export function ObjectivePanel() {
  const totalMaterial = objectives.reduce((total, room) => total + room.materialCost, 0);
  return (
    <Card title="Objetivo" icon="🎯">
      <p className="text-xs leading-relaxed">
        Limpar os {objectives.length} ambientes do bloco gastando o menor tempo total possível. O
        tempo soma limpeza, deslocamento e as consequências das suas decisões.
      </p>
      <ul className="mt-3 space-y-1 text-[11px] text-slate-500">
        <li>• Deslocamento: 1 min a cada {gameConfig.metersPerMinute} m percorridos.</li>
        <li>
          • O carrinho leva {gameConfig.maxCharges} cargas e limpar tudo consome {totalMaterial} —
          você vai precisar passar no depósito.
        </li>
        <li>• Passar pelo depósito não reabastece: é preciso ir até ele.</li>
      </ul>
    </Card>
  );
}
