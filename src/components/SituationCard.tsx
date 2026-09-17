import { formatMinutes, type ActionSummary, type Availability } from '../domain/effects';
import type { SituationAction } from '../domain/types';

type Props = {
  action: SituationAction;
  summary: ActionSummary;
  availability: Availability;
  onChoose: (actionId: string) => void;
};

/**
 * Carta de decisão. A estrutura encarna o trade-off: AGORA em cima, DEPOIS
 * embaixo, separados por uma régua. Se a metade de baixo está vazia, a escolha
 * resolve tudo de imediato; se está cheia, você está comprando tempo a crédito.
 */
export function SituationCard({ action, summary, availability, onChoose }: Props) {
  const disabled = !availability.available;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-lg transition-all duration-200 ${
        disabled
          ? 'bg-surface/60 opacity-50'
          : 'bg-surface-2 ring-1 ring-hairline hover:-translate-y-0.5 hover:ring-player/60'
      }`}
    >
      {/* Cabeçalho: nome da decisão e o preço imediato em destaque */}
      <div className="px-5 pt-5 pb-4">
        <h4 className="font-display text-[17px] font-bold leading-tight tracking-tight text-ink-hi">
          {action.label}
        </h4>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-mid">{action.description}</p>
      </div>

      {/* AGORA */}
      <div className="px-5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Agora</span>
          <span className="data text-[15px] font-semibold text-ink-hi">
            {summary.minutosAgora > 0 ? `+${formatMinutes(summary.minutosAgora)} min` : 'sem custo'}
          </span>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {summary.agora.map((line) => (
            <li key={line.label} className="flex items-center gap-2.5 text-[12px]">
              <span className="w-3.5 shrink-0 text-center text-ink-low" aria-hidden>
                {line.icon}
              </span>
              <span className="text-ink-low">{line.label}</span>
              <span className="data ml-auto text-ink-mid">{line.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-5 my-4 rule-brass opacity-50" />

      {/* DEPOIS — é aqui que mora o custo escondido de cada estratégia */}
      <div className="flex-1 px-5">
        <span className="eyebrow">Depois</span>
        {summary.depois.length === 0 ? (
          <p className="mt-2.5 flex items-center gap-2 text-[12px] text-done">
            <span aria-hidden>✓</span>
            <span>Nada pendente. A sala fica fechada.</span>
          </p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {summary.depois.map((line) => (
              <li key={line.label} className="flex gap-2.5 text-[12px]">
                <span className="w-3.5 shrink-0 text-center text-pending" aria-hidden>
                  {line.icon}
                </span>
                <span className="text-ink-mid">
                  <span className="text-ink-low">{line.label}: </span>
                  {line.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {disabled && !availability.available && (
        <p className="mx-5 mt-4 rounded bg-surface-3 px-3 py-2 text-[11.5px] text-ink-mid">
          {availability.reason}
        </p>
      )}

      <div className="p-5 pt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose(action.id)}
          className="w-full rounded-md bg-surface-3 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mid transition-colors duration-150 group-hover:bg-player group-hover:text-bg disabled:bg-surface disabled:text-ink-low disabled:group-hover:bg-surface disabled:group-hover:text-ink-low"
        >
          Escolher
        </button>
      </div>
    </div>
  );
}
