import { formatMinutes } from '../domain/effects';
import { gameConfig } from '../data/gameConfig';
import { objectives } from '../data/rooms';
import type { GameState, LogEntry } from '../domain/types';
import type { Summary } from '../domain/game';

/* ------------------------------------------------------------------ */
/* Cabeçalho compacto: marca à esquerda, métricas da partida à direita  */
/* ------------------------------------------------------------------ */

export function GameHeader({
  totalMinutes,
  distance,
  charges,
}: {
  totalMinutes: number;
  distance: number;
  charges: number;
}) {
  return (
    <header className="relative z-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-hairline px-5 py-3.5 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="font-display text-lg leading-none text-brass" aria-hidden>
          ▤
        </span>
        <div>
          <h1 className="font-display text-[15px] font-bold leading-none tracking-tight text-ink-hi">
            Operação Limpeza
          </h1>
          <p className="data mt-1 text-[9px] uppercase tracking-[0.18em] text-ink-low">
            Planeje · Limpe · Otimize
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-6 sm:gap-8">
        <Metrica icon="⏱" label="Tempo" value={formatMinutes(totalMinutes)} unit="min" />
        <Metrica icon="📍" label="Distância" value={String(distance)} unit="m" />
        <Metrica
          icon="🧽"
          label="Material"
          value={String(charges)}
          unit={`/${gameConfig.maxCharges}`}
          alert={charges === 0}
        />
      </div>
    </header>
  );
}

function Metrica({
  icon,
  label,
  value,
  unit,
  alert,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] opacity-50" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="data text-[9px] uppercase tracking-[0.16em] text-ink-low">{label}</p>
        <p className={`data text-[17px] font-semibold leading-tight ${alert ? 'text-pending' : 'text-ink-hi'}`}>
          {value}
          <span className="ml-0.5 text-[11px] font-normal text-ink-low">{unit}</span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Briefing: objetivo e regras em uma tira, não num card               */
/* ------------------------------------------------------------------ */

export function Briefing() {
  const material = objectives.reduce((total, room) => total + room.materialCost, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-2 px-1 text-[12px] text-ink-low">
      <p className="text-ink-mid">
        Limpe os <strong className="font-semibold text-ink-hi">{objectives.length} ambientes</strong> no
        menor tempo total.
      </p>
      <Regra>1 min a cada {gameConfig.metersPerMinute} m percorridos</Regra>
      <Regra>
        carrinho leva {gameConfig.maxCharges}, limpar tudo custa {material}
      </Regra>
      <Regra>passar pelo depósito não recarrega — é preciso parar nele</Regra>
    </div>
  );
}

function Regra({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-brass-dim" aria-hidden>
        ◆
      </span>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Legenda: pertence ao desenho, então mora no rodapé do mapa          */
/* ------------------------------------------------------------------ */

export function MapLegend() {
  const estados: [string, string, string][] = [
    ['✓', 'concluída', 'text-done'],
    ['◐', 'pendente', 'text-pending'],
    ['🔒', 'bloqueada', 'text-blocked'],
    ['▤', 'depósito', 'text-brass'],
    ['●', 'você', 'text-player'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline px-5 py-3 text-[11px]">
      {estados.map(([glyph, label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-ink-low">
          <span className={color} aria-hidden>
            {glyph}
          </span>
          {label}
        </span>
      ))}
      <span className="ml-auto data text-[10px] text-ink-low">
        números do corredor em metros a partir da entrada
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diário do turno: rota e consequências na mesma narrativa            */
/* ------------------------------------------------------------------ */

type Beat = { stop: number; roomName: string; entries: LogEntry[] };

/** Agrupa o log por parada, para ler "sala → caminhada → situação → consequência". */
function toBeats(state: GameState): Beat[] {
  const beats: Beat[] = [];
  for (const entry of state.log) {
    const isArrival = entry.title.startsWith('Deslocamento');
    if (isArrival || beats.length === 0) {
      beats.push({
        stop: beats.length + 1,
        roomName: entry.roomId ? entry.title.replace('Deslocamento até ', '') : 'Corredor',
        entries: [entry],
      });
    } else {
      beats[beats.length - 1].entries.push(entry);
    }
  }
  return beats;
}

export function TurnJournal({ state }: { state: GameState }) {
  const beats = toBeats(state);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">Diário do turno</h2>
        <span className="data text-[10px] text-ink-low">{state.route.length} paradas</span>
      </div>

      {beats.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-ink-low">
          Escolha um ambiente no mapa para começar. Cada decisão vai aparecer aqui com o que ela
          custou.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {[...beats].reverse().map((beat) => (
            <li key={beat.stop} className="relative flex gap-4 pb-5 last:pb-0">
              {/* Linha do tempo */}
              <div className="flex flex-col items-center">
                <span className="data flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-player ring-1 ring-hairline">
                  {beat.stop}
                </span>
                <span className="mt-1 w-px flex-1 bg-hairline" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-display text-[13px] font-semibold text-ink-hi">{beat.roomName}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {beat.entries.map((entry) => (
                    <li key={entry.index} className="text-[12px] leading-snug">
                      <span className="text-ink-mid">{entry.detail}</span>
                      <span className="data ml-2 whitespace-nowrap text-[11px]">
                        {entry.deltaDistance > 0 && (
                          <span className="text-player">+{entry.deltaDistance} m </span>
                        )}
                        {entry.deltaCleaning > 0 && (
                          <span className="text-ink-low">+{entry.deltaCleaning}′ </span>
                        )}
                        {entry.deltaEvent > 0 && (
                          <span className="text-pending">+{entry.deltaEvent}′ </span>
                        )}
                        {entry.deltaIdle > 0 && (
                          <span className="text-blocked">+{entry.deltaIdle}′ ocioso </span>
                        )}
                        {entry.deltaCharges !== 0 && (
                          <span className="text-brass">
                            {entry.deltaCharges > 0 ? '+' : ''}
                            {entry.deltaCharges} carga{Math.abs(entry.deltaCharges) === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="data mt-1.5 text-[10px] text-ink-low">
                  total → {formatMinutes(beat.entries[beat.entries.length - 1].totalAfter)} min
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Resumo da partida                                                   */
/* ------------------------------------------------------------------ */

export function ProgressPanel({ summary }: { summary: Summary }) {
  const feitos = summary.concluidas.length;

  return (
    <section>
      <h2 className="eyebrow">Progresso</h2>

      <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-tight text-ink-hi">
        {feitos}
        <span className="text-[18px] font-medium text-ink-low">/{summary.totalObjectives}</span>
      </p>
      <p className="mt-1 text-[11.5px] text-ink-low">ambientes concluídos</p>

      {/* Progresso por ambiente, cada traço é um objetivo */}
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: summary.totalObjectives }).map((_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full ${
              index < feitos
                ? 'bg-done'
                : index < feitos + summary.pendentes.length
                  ? 'bg-pending'
                  : 'bg-surface-3'
            }`}
          />
        ))}
      </div>
      {summary.pendentes.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-pending">
          <span aria-hidden>◐</span>
          {summary.pendentes.length} com pendência
        </p>
      )}

      <div className="my-5 rule-brass opacity-50" />

      <h2 className="eyebrow">De onde vem o tempo</h2>
      <dl className="mt-3 space-y-2">
        <Parcela label="Limpeza" value={summary.cleaningMinutes} total={summary.totalMinutes} tone="bg-ink-low" />
        <Parcela label="Deslocamento" value={summary.travelMinutes} total={summary.totalMinutes} tone="bg-player" />
        <Parcela label="Decisões" value={summary.eventMinutes} total={summary.totalMinutes} tone="bg-pending" />
        {summary.idleMinutes > 0 && (
          <Parcela label="Ocioso" value={summary.idleMinutes} total={summary.totalMinutes} tone="bg-blocked" />
        )}
      </dl>

      <div className="mt-5 flex items-baseline justify-between">
        <span className="text-[12px] text-ink-mid">Tempo total</span>
        <span className="data text-xl font-semibold text-ink-hi">
          {formatMinutes(summary.totalMinutes)} min
        </span>
      </div>
      <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
    </section>
  );
}

function Parcela({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11.5px]">
        <dt className="text-ink-low">{label}</dt>
        <dd className="data text-ink-mid">{formatMinutes(value)} min</dd>
      </div>
      <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ShiftBar({ total, reference }: { total: number; reference: number }) {
  const pct = Math.min(100, (total / reference) * 100);
  const over = total > reference;
  return (
    <div className="mt-2.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-pending' : 'bg-done'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="data mt-1.5 text-[10px] text-ink-low">
        turno de referência {reference} min
        {over && <span className="text-pending"> · ultrapassado</span>}
      </p>
    </div>
  );
}
