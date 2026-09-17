import type { ReactNode } from 'react';
import { formatMinutes, type ActionSummary, type Availability } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { RoomDef, RoomState, SituationAction, SituationDef } from '../domain/types';
import { SituationCard } from './SituationCard';

function Overlay({
  children,
  labelledBy,
  wide,
}: {
  children: ReactNode;
  labelledBy: string;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-xl bg-surface ring-1 ring-hairline ${
          wide ? 'max-w-5xl' : 'max-w-lg'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type ConfirmProps = {
  room: RoomDef;
  roomState: RoomState;
  distance: number;
  cleaningMinutes: number;
  isReturn: boolean;
  isDeposito: boolean;
  refillMinutes: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Último ponto de arrependimento: depois daqui o deslocamento está pago. */
export function RoomConfirmDialog({
  room,
  roomState,
  distance,
  cleaningMinutes,
  isReturn,
  isDeposito,
  refillMinutes,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const minutosLimpeza = isDeposito ? refillMinutes : cleaningMinutes;
  const minutosViagem = travelMinutes(distance);

  return (
    <Overlay labelledBy="confirm-title">
      <div className="p-6">
        <span className="eyebrow">Próximo destino</span>
        <h3 id="confirm-title" className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink-hi">
          {room.name}
        </h3>

        {isReturn && (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] text-pending">
            <span aria-hidden>◐</span>
            <span>Retorno para fechar a pendência. Sem nova situação e sem gastar material.</span>
          </p>
        )}
        {isDeposito && (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] text-brass">
            <span aria-hidden>▤</span>
            <span>Parada de recarga. O carrinho volta cheio.</span>
          </p>
        )}

        <div className="mt-6 space-y-3">
          <Linha
            label="Caminhada até lá"
            value={`${distance} m`}
            detail={`${formatMinutes(minutosViagem)} min`}
            accent
          />
          <Linha
            label={isDeposito ? 'Recarga' : isReturn ? 'Serviço restante' : 'Limpeza prevista'}
            value={`${minutosLimpeza} min`}
            detail={
              !isDeposito && roomState.extraDirtMinutes > 0
                ? `inclui +${roomState.extraDirtMinutes} min de sujeira acumulada`
                : undefined
            }
          />
          <div className="rule-brass opacity-40" />
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Custo mínimo desta parada</span>
            <span className="data text-lg font-semibold text-ink-hi">
              {formatMinutes(minutosViagem + minutosLimpeza)} min
            </span>
          </div>
        </div>

        {!isDeposito && !isReturn && (
          <p className="mt-5 text-[11.5px] leading-relaxed text-ink-low">
            Ao confirmar, a caminhada já conta no seu tempo e você precisa resolver o que encontrar
            na sala. Ainda dá para escolher outro destino.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mid ring-1 ring-hairline transition-colors hover:bg-surface-2"
          >
            Ver outra sala
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="flex-1 rounded-md bg-player py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90"
          >
            Ir para lá
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Linha({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[12.5px] text-ink-mid">{label}</span>
      <span className="text-right">
        <span className={`data text-[15px] font-semibold ${accent ? 'text-player' : 'text-ink-hi'}`}>
          {value}
        </span>
        {detail && <span className="data block text-[11px] text-ink-low">{detail}</span>}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type SituationProps = {
  situation: SituationDef;
  room: RoomDef;
  cards: { action: SituationAction; summary: ActionSummary; availability: Availability }[];
  onChoose: (actionId: string) => void;
};

export function SituationDialog({ situation, room, cards, onChoose }: SituationProps) {
  return (
    <Overlay labelledBy="situation-title" wide>
      <div className="p-6 sm:p-7">
        <header className="max-w-2xl">
          <span className="eyebrow">Você chegou · {room.name}</span>
          <h3
            id="situation-title"
            className="mt-1.5 font-display text-[28px] font-bold leading-none tracking-tight text-ink-hi"
          >
            {situation.title}
          </h3>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-mid">{situation.prompt}</p>
        </header>

        <div className="my-6 rule-brass" />

        <p className="mb-4 text-[12px] text-ink-low">
          Três formas de resolver o mesmo problema. Compare o que cada uma cobra{' '}
          <span className="text-ink-mid">agora</span> com o que ela deixa para{' '}
          <span className="text-ink-mid">depois</span> — nenhuma é melhor em tudo.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <SituationCard
              key={card.action.id}
              action={card.action}
              summary={card.summary}
              availability={card.availability}
              onChoose={onChoose}
            />
          ))}
        </div>
      </div>
    </Overlay>
  );
}
