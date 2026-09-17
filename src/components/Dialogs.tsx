import { formatMinutes, type ActionSummary, type Availability } from '../domain/effects';
import { travelMinutes } from '../domain/movement';
import type { RoomDef, RoomState, SituationAction, SituationDef } from '../domain/types';
import { SituationCard } from './SituationCard';
import { Icon } from './icons';
import type { ComponentType } from 'react';

/** Miniatura da sala, igual ao card de prévia do mockup. */
function RoomThumb({ room }: { room: RoomDef }) {
  const TONE: Record<string, string> = {
    grande: '#a6d6f9',
    media: '#f9d89c',
    pequena: '#96e6cb',
    estreita: '#4fb6a8',
    banheiro: '#c4b9f5',
    tecnica: '#c9bdf3',
    escada: '#f6e9ad',
  };
  return (
    <svg viewBox="0 0 90 96" className="h-[136px] w-[1300px]" aria-hidden>
      <rect x="18" y="4" width="54" height="86" fill="#ffffff" />
      <rect x="18" y="4" width="54" height="86" fill={TONE[room.tone]} />
      <rect x="18" y="4" width="54" height="86" fill="none" stroke="#1e1e1e" strokeWidth="2" />
      <rect x="36" y="88" width="18" height="4" fill="#ffffff" />
      <path d="M 36 90 a 18 18 0 0 1 18 0" fill="none" stroke="#1e1e1e" strokeWidth="1" opacity="0.6" />
      <text
        x="45"
        y="50"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="14"
        fontWeight="700"
        fill="#16232b"
      >
        {room.shortName}
      </text>
    </svg>
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
  const minutos = isDeposito ? refillMinutes : cleaningMinutes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-modal p-6"
      >
        <div className="flex flex-col items-center rounded-xl bg-modal-card p-5">
          <RoomThumb room={room} />
          <p className="mt-3 text-[14px] text-txt-2">Você está indo para a</p>
          <p id="confirm-title" className="text-[22px] font-bold text-txt">
            {room.name}
          </p>

          <div className="mt-5 w-full space-y-4 border-t border-line pt-4">
            <Linha icon={Icon.distancia} label="Deslocamento" value={`+ ${distance} m`} detail={`${formatMinutes(travelMinutes(distance))} min de caminhada`} />
            <Linha
              icon={Icon.tempo}
              label={isDeposito ? 'Recarga do carrinho' : isReturn ? 'Serviço restante' : 'Tempo base de limpeza'}
              value={`${minutos} min`}
              detail={
                !isDeposito && roomState.extraDirtMinutes > 0
                  ? `inclui +${roomState.extraDirtMinutes} min de sujeira acumulada`
                  : undefined
              }
            />
          </div>
        </div>

        {isReturn && (
          <p className="mt-4 rounded-lg bg-warn/10 px-3 py-2 text-[12.5px] text-warn">
            Retorno de pendência: conclui direto, sem nova situação e sem gastar material.
          </p>
        )}
        {isDeposito && (
          <p className="mt-4 rounded-lg bg-ok/10 px-3 py-2 text-[12.5px] text-ok">
            Parada no depósito. O carrinho volta cheio.
          </p>
        )}
        {!isDeposito && !isReturn && (
          <p className="mt-4 text-[12.5px] leading-relaxed text-txt-3">
            Ao confirmar, a caminhada já conta no seu tempo e será preciso resolver a situação da sala.
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-line py-2.5 text-[14px] font-medium text-txt-2 transition-colors hover:bg-btn"
          >
            Escolher outra
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="flex-1 rounded-lg bg-accent py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#6189f5]"
          >
            Confirmar e ir
          </button>
        </div>
      </div>
    </div>
  );
}

function Linha({
  icon: Glyph,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Glyph className="h-7 w-7 shrink-0 text-txt-2" aria-hidden />
      <div>
        <p className="text-[12.5px] leading-none text-txt-2">{label}</p>
        <p className="mt-1 text-[19px] font-bold leading-none text-txt">{value}</p>
        {detail && <p className="mt-1 text-[11.5px] text-txt-3">{detail}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type SituationProps = {
  situation: SituationDef;
  room: RoomDef;
  distance: number;
  cleaningMinutes: number;
  cards: { action: SituationAction; summary: ActionSummary; availability: Availability }[];
  onChoose: (actionId: string) => void;
};

export function SituationDialog({
  situation,
  room,
  distance,
  cleaningMinutes,
  cards,
  onChoose,
}: SituationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="situation-title"
        className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-line bg-modal p-5 sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Prévia da sala, como no mockup */}
          <aside className="flex flex-col items-center rounded-xl bg-modal-card p-5">
            <RoomThumb room={room} />
            <p className="mt-3 text-center text-[13.5px] text-txt-2">Você está em</p>
            <p className="text-center text-[19px] font-bold text-txt">{room.name}</p>
            <div className="mt-5 w-full space-y-4 border-t border-line pt-4">
              <Linha icon={Icon.distancia} label="Deslocamento" value={`+ ${distance} m`} />
              <Linha icon={Icon.tempo} label="Tempo base de limpeza" value={`${cleaningMinutes} min`} />
            </div>
          </aside>

          <div>
            <h3 id="situation-title" className="text-[23px] font-bold leading-tight text-txt">
              {situation.title}
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-txt-2">{situation.prompt}</p>
            <p className="mt-1 text-[13px] text-txt-3">
              Escolha como agir. As três opções resolvem o mesmo problema de formas diferentes —
              nenhuma é melhor em tudo.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {cards.map((card, index) => (
                <SituationCard
                  key={card.action.id}
                  action={card.action}
                  summary={card.summary}
                  availability={card.availability}
                  index={index}
                  onChoose={onChoose}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
