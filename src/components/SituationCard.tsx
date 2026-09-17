import { formatMinutes, type ActionSummary, type Availability } from '../domain/effects';
import type { SituationAction } from '../domain/types';

/** Três paletas, como no mockup: vermelha, verde-água e âmbar. */
const PALETAS = [
  {
    borda: 'border-[#8b3b3f]',
    fundo: 'bg-[#271d27]',
    titulo: 'text-[#e88b8e]',
    selo: 'bg-[#4a2427] text-[#f0a9ab] ring-[#8b3b3f]',
    botao: 'bg-[#b25356] hover:bg-[#c25f62] text-white',
    icone: '⚠️',
  },
  {
    borda: 'border-[#2c7a63]',
    fundo: 'bg-[#11292b]',
    titulo: 'text-[#5fd3ae]',
    selo: 'bg-[#123a33] text-[#7fe0c0] ring-[#2c7a63]',
    botao: 'bg-[#32856c] hover:bg-[#3a9a7d] text-white',
    icone: '📦',
  },
  {
    borda: 'border-[#8a6a2e]',
    fundo: 'bg-[#232423]',
    titulo: 'text-[#e6bb62]',
    selo: 'bg-[#3b3116] text-[#f0cd84] ring-[#8a6a2e]',
    botao: 'bg-[#9d7b3f] hover:bg-[#b18c48] text-white',
    icone: '🧭',
  },
] as const;

type Props = {
  action: SituationAction;
  summary: ActionSummary;
  availability: Availability;
  index: number;
  onChoose: (actionId: string) => void;
};

export function SituationCard({ action, summary, availability, index, onChoose }: Props) {
  const paleta = PALETAS[index % PALETAS.length];
  const disabled = !availability.available;

  return (
    <div
      className={`flex flex-col rounded-xl border ${paleta.borda} ${paleta.fundo} p-4 transition-opacity ${
        disabled ? 'opacity-45' : ''
      }`}
    >
      <h4 className={`flex items-start gap-2.5 text-[14.5px] font-semibold leading-snug ${paleta.titulo}`}>
        <span className="text-[17px] leading-none" aria-hidden>
          {paleta.icone}
        </span>
        {action.label}
      </h4>

      <p className="mt-2.5 text-[13px] leading-relaxed text-txt-2">{action.description}</p>

      {/* Selo do custo imediato, como o "+4 min" do mockup */}
      <p
        className={`mt-3 self-start rounded-md px-3 py-1 text-[13px] font-semibold ring-1 ${paleta.selo}`}
      >
        {summary.minutosAgora > 0 ? `+ ${formatMinutes(summary.minutosAgora)} min` : 'sem custo agora'}
      </p>

      {/* Consequências agrupadas: o que cobra agora e o que fica para depois */}
      <ul className="mt-3 flex-1 space-y-1.5">
        {summary.agora
          .filter((line) => line.label !== 'Tempo')
          .map((line) => (
            <li key={line.label} className="flex items-center gap-2 text-[12.5px] text-txt-2">
              <span className="w-4 shrink-0 text-center" aria-hidden>
                {line.icon}
              </span>
              {line.value}
            </li>
          ))}
        {summary.depois.map((line) => (
          <li key={line.label} className="flex gap-2 text-[12.5px] text-warn">
            <span className="w-4 shrink-0 text-center" aria-hidden>
              {line.icon}
            </span>
            <span>{line.value}</span>
          </li>
        ))}
        {summary.depois.length === 0 && (
          <li className="flex items-center gap-2 text-[12.5px] text-ok">
            <span className="w-4 shrink-0 text-center" aria-hidden>
              ✓
            </span>
            Conclui a sala, sem pendência
          </li>
        )}
      </ul>

      {disabled && !availability.available && (
        <p className="mt-3 rounded-md bg-black/25 px-3 py-2 text-[12px] text-txt-2">{availability.reason}</p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChoose(action.id)}
        className={`mt-4 rounded-lg py-2.5 text-[14px] font-semibold transition-colors ${paleta.botao} disabled:cursor-not-allowed disabled:bg-btn disabled:text-txt-3`}
      >
        Escolher
      </button>
    </div>
  );
}
