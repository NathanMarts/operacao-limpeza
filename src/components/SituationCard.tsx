import { formatMinutes, type ActionSummary, type Availability } from '../domain/effects';
import type { SituationAction } from '../domain/types';
import { ConsequenceIcon, Icon } from './icons';

/** Três paletas, como no mockup: vermelha, verde-água e âmbar — em tons claros. */
const PALETAS = [
  {
    borda: 'border-[#e6b3b5]',
    fundo: 'bg-[#fdf3f3]',
    titulo: 'text-[#a33a3e]',
    selo: 'bg-[#fae2e3] text-[#93373a] ring-[#e6b3b5]',
    botao: 'bg-[#c0484c] hover:bg-[#ad3e42] text-white',
    icone: Icon.alerta,
  },
  {
    borda: 'border-[#a5dbc8]',
    fundo: 'bg-[#eefaf5]',
    titulo: 'text-[#12795a]',
    selo: 'bg-[#d6f2e7] text-[#0f6a4f] ring-[#a5dbc8]',
    botao: 'bg-[#189b71] hover:bg-[#158a65] text-white',
    icone: Icon.pacote,
  },
  {
    borda: 'border-[#e0c88e]',
    fundo: 'bg-[#fdf8ec]',
    titulo: 'text-[#8a6414]',
    selo: 'bg-[#f6ead0] text-[#7a5711] ring-[#e0c88e]',
    botao: 'bg-[#a8801f] hover:bg-[#96711a] text-white',
    icone: Icon.pessoa,
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
  const Glyph = paleta.icone;
  const disabled = !availability.available;

  return (
    <div
      className={`flex flex-col rounded-xl border ${paleta.borda} ${paleta.fundo} p-4 transition-opacity ${
        disabled ? 'opacity-45' : ''
      }`}
    >
      <h4 className={`flex items-center gap-2.5 text-[14.5px] font-semibold leading-snug ${paleta.titulo}`}>
        <Glyph className="h-[38px] w-[38px] shrink-0" aria-hidden />
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
              <ConsequenceIcon kind={line.kind} className="h-[15px] w-[15px] shrink-0" />
              {line.value}
            </li>
          ))}
        {summary.depois.map((line) => (
          <li key={line.label} className="flex gap-2 text-[12.5px] text-warn">
            <ConsequenceIcon kind={line.kind} className="mt-px h-[15px] w-[15px] shrink-0" />
            <span>{line.value}</span>
          </li>
        ))}
        {summary.depois.length === 0 && (
          <li className="flex items-center gap-2 text-[12.5px] text-ok">
            <Icon.concluida className="h-[15px] w-[15px] shrink-0" aria-hidden />
            Conclui a sala, sem pendência
          </li>
        )}
      </ul>

      {disabled && !availability.available && (
        <p className="mt-3 rounded-md bg-black/[0.06] px-3 py-2 text-[12px] text-txt-2">{availability.reason}</p>
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
