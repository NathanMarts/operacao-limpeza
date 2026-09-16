import type { EffectBadge, Availability } from '../domain/effects';
import type { SituationAction } from '../domain/types';

const BADGE_STYLE: Record<EffectBadge['tone'], string> = {
  tempo: 'bg-rose-500/15 text-rose-200 ring-rose-500/30',
  material: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  pendencia: 'bg-orange-500/15 text-orange-200 ring-orange-500/30',
  bloqueio: 'bg-violet-500/15 text-violet-200 ring-violet-500/30',
  deslocamento: 'bg-sky-500/15 text-sky-200 ring-sky-500/30',
  bom: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
};

type Props = {
  action: SituationAction;
  badges: EffectBadge[];
  availability: Availability;
  onChoose: (actionId: string) => void;
};

export function SituationCard({ action, badges, availability, onChoose }: Props) {
  const disabled = !availability.available;

  return (
    <div
      className={`flex flex-col rounded-xl border p-4 transition ${
        disabled
          ? 'border-slate-800 bg-slate-900/40 opacity-60'
          : 'border-slate-700 bg-slate-900/80 hover:border-sky-600'
      }`}
    >
      <h4 className="text-sm font-semibold text-slate-100">{action.label}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{action.description}</p>

      {/* Transparência total: todo efeito, imediato ou futuro, aparece antes da escolha. */}
      <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
        {badges.map((badge, index) => (
          <li
            key={index}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${BADGE_STYLE[badge.tone]}`}
          >
            {badge.text}
          </li>
        ))}
      </ul>

      {disabled && !availability.available && (
        <p className="mt-3 rounded-md bg-slate-800/70 px-2 py-1.5 text-[11px] text-slate-400">
          {availability.reason}
        </p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChoose(action.id)}
        className="mt-3 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        Escolher
      </button>
    </div>
  );
}
