import type { ReactNode } from 'react';
import { formatMinutes } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { RoomDef, RoomState, SituationDef } from '../domain/types';
import { SituationCard } from './SituationCard';
import type { EffectBadge, Availability } from '../domain/effects';
import type { SituationAction } from '../domain/types';

function Overlay({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
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

/** Último ponto em que dá para desistir: depois daqui o deslocamento é cobrado. */
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
  return (
    <Overlay labelledBy="confirm-title">
      <div className="sm:flex sm:items-start sm:gap-6">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Você está indo para</p>
          <h3 id="confirm-title" className="mt-1 text-2xl font-bold text-slate-50">
            {room.name}
          </h3>
          {isReturn && (
            <p className="mt-2 inline-block rounded-md bg-orange-500/15 px-2 py-1 text-xs font-medium text-orange-200 ring-1 ring-orange-500/30">
              Retorno para resolver pendência — sem nova situação e sem gasto de material
            </p>
          )}
          {isDeposito && (
            <p className="mt-2 inline-block rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/30">
              Parada no depósito para reabastecer o carrinho
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">Deslocamento</dt>
              <dd className="mt-0.5 text-lg font-semibold text-sky-300">+{distance} m</dd>
              <dd className="text-xs text-slate-500">
                {formatMinutes(travelMinutes(distance))} min de caminhada
              </dd>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">
                {isDeposito ? 'Reabastecimento' : isReturn ? 'Serviço restante' : 'Tempo base de limpeza'}
              </dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-100">
                {isDeposito ? refillMinutes : cleaningMinutes} min
              </dd>
              {!isDeposito && roomState.extraDirtMinutes > 0 && (
                <dd className="text-xs text-amber-300">
                  inclui +{roomState.extraDirtMinutes} min de sujeira acumulada
                </dd>
              )}
            </div>
          </dl>

          {!isDeposito && !isReturn && (
            <p className="mt-4 text-xs text-slate-500">
              Ao confirmar, o deslocamento é cobrado e você precisará resolver a situação da sala.
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Escolher outra
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Confirmar e ir
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */

type SituationProps = {
  situation: SituationDef;
  room: RoomDef;
  cards: { action: SituationAction; badges: EffectBadge[]; availability: Availability }[];
  onChoose: (actionId: string) => void;
};

export function SituationDialog({ situation, room, cards, onChoose }: SituationProps) {
  return (
    <Overlay labelledBy="situation-title">
      <p className="text-xs uppercase tracking-wide text-slate-500">{room.name}</p>
      <h3 id="situation-title" className="mt-1 text-2xl font-bold text-slate-50">
        {situation.title}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{situation.prompt}</p>
      <p className="mt-3 text-xs text-slate-500">
        Escolha como agir. As três opções resolvem o mesmo problema de formas diferentes — nenhuma
        é melhor em tudo.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <SituationCard
            key={card.action.id}
            action={card.action}
            badges={card.badges}
            availability={card.availability}
            onChoose={onChoose}
          />
        ))}
      </div>
    </Overlay>
  );
}
