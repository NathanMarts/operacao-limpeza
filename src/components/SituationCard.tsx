import { useState, type CSSProperties } from "react";
import {
  formatMinutes,
  type ActionSummary,
  type Availability,
} from "../domain/effects";
import type { SituationAction } from "../domain/types";
import { useTilt3D } from "../hooks/useMotion";
import cardBack from "../assets/card-back-web.png";
import { ESTRATEGIA_ETIQUETA, estrategiaDaAcao } from "../data/actionVisuals";
import {
  ConsequenceIcon,
  ESTRATEGIA_ICON,
  ESTRATEGIA_IMAGEM,
  Icon,
} from "./icons";

type Props = {
  action: SituationAction;
  /** A estratégia é lida pelo par (situação, ação): o mesmo id de ação pode
   *  significar coisas diferentes em situações diferentes. */
  situationId: string;
  summary: ActionSummary;
  availability: Availability;
  index: number;
  /** Carta que o jogador acabou de marcar. */
  escolhida?: boolean;
  /** Outra carta foi marcada: esta recua para a escolha ficar evidente. */
  recuada?: boolean;
  onChoose: (actionId: string) => void;
};

export function SituationCard({
  action,
  situationId,
  summary,
  availability,
  index,
  escolhida,
  recuada,
  onChoose,
}: Props) {
  /**
   * Ícone e cor vêm da ESTRATÉGIA da ação, não da posição dela na fileira.
   * Antes eram três paletas fixas por índice, o que dizia apenas "primeira,
   * segunda, terceira". Agora dizem o que a decisão é — e a mesma situação
   * pode ter três cores sem relação entre si, porque são três estratégias.
   */
  const estrategia = estrategiaDaAcao(situationId, action.id);
  const Glyph = ESTRATEGIA_ICON[estrategia];
  const disabled = !availability.available;
  /* A carta chega de costas; só depois de virada ela responde ao cursor.
     Inclinar no meio da virada disputaria com o próprio gesto de revelar. */
  const [revelada, setRevelada] = useState(false);
  const tilt = useTilt3D(revelada && !disabled && !escolhida && !recuada);

  return (
    <div
      className="carta-palco"
      style={
        {
          "--acento": `var(--color-estrat-${estrategia})`,
          "--acento-btn": `var(--color-estrat-${estrategia}-btn)`,
        } as CSSProperties
      }
    >
      <div
        className="carta-giro"
        data-revelada={revelada ? "sim" : "nao"}
        /* Espera o modal entrar e então vira UMA DE CADA VEZ: o atraso de
           cada carta é a virada inteira da anterior, não uma fração dela. */
        style={{
          animationDelay: `calc(var(--dur-cena) + var(--dur-flip) * ${index})`,
        }}
        onAnimationEnd={(evento) => {
          /* Animações dos filhos também sobem até aqui: só a virada conta. */
          if (evento.animationName.includes("carta-vira")) setRevelada(true);
        }}
      >
        <div className="carta-verso" aria-hidden>
          <img src={cardBack} alt="" />
        </div>

        <div
          /**
           * Enquanto as três estão em comparação, nada se move: só a opacidade
           * muda, nunca a largura, a ordem ou a posição horizontal. Depois da
           * escolha, a marcada acende e as outras recuam, para o jogador ver o
           * que decidiu.
           */
          className={`carta-frente carta-acento carta-3d relative flex h-full flex-col rounded-xl border p-4 overflow-hidden ${
            disabled ? "opacity-45" : ""
          } ${recuada ? "opacity-30" : ""} ${escolhida ? "ring-2 ring-txt/70" : ""}`}
          ref={tilt.ref}
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
        >
            <div className="absolute top-2 left-2 flex h-9.5 w-9.5 items-center justify-center rounded-full border-4 carta-glifo p-6">
              <Glyph className="text-white h-8 w-8 shrink-0" aria-hidden />
            </div>
            <div className="carta-action absolute top-0 right-0 px-3 py-2 rounded-bl-md">
              <p className="text-[12px] text-white font-bold uppercase">
                {ESTRATEGIA_ETIQUETA[estrategia]}
              </p>
            </div>
            <div className="flex-1 rounded-md overflow-hidden">
              <img
                src={ESTRATEGIA_IMAGEM[estrategia]}
                alt=""
                className="h-[74px] w-full object-cover"
              />
            </div>
            <h4 className="carta-titulo mt-2 flex items-center gap-2.5 text-[14.5px] font-semibold leading-snug">
              {action.label}
            </h4>

            <p className="text-[13px] leading-relaxed text-txt-2">
              {action.description}
            </p>

            {/* Selo do custo imediato, como o "+4 min" do mockup */}
            <span className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-txt-2">
              <Icon.tempo className="carta-titulo" aria-hidden />
              <p className="carta-selo self-start rounded-md px-3 py-1 text-[13px] font-semibold">
                {summary.minutosAgora > 0
                  ? `+ ${formatMinutes(summary.minutosAgora)} min`
                  : "sem custo agora"}
              </p>
            </span>

            {/* Consequências agrupadas: o que cobra agora e o que fica para depois */}
            <ul className="mt-3 flex-1 space-y-1.5">
              {summary.agora
                .filter((line) => line.label !== "Tempo")
                .map((line) => (
                  <li
                    key={line.label}
                    className="flex items-center gap-2 text-[12.5px] text-txt-2"
                  >
                    <ConsequenceIcon
                      kind={line.kind}
                      className="h-[15px] w-[15px] shrink-0"
                    />
                    {line.value}
                  </li>
                ))}
              {summary.depois.map((line) => (
                <li
                  key={line.label}
                  className={`flex gap-2 text-[12.5px] ${line.bom ? "text-ok" : "text-warn"}`}
                >
                  <ConsequenceIcon
                    kind={line.kind}
                    className="mt-px h-[15px] w-[15px] shrink-0"
                  />
                  <span>{line.value}</span>
                </li>
              ))}
              {summary.depois.length === 0 && (
                <li className="flex items-center gap-2 text-[12.5px] text-ok">
                  <Icon.concluida
                    className="h-[15px] w-[15px] shrink-0"
                    aria-hidden
                  />
                  Conclui a sala, sem pendência
                </li>
              )}
            </ul>

            {disabled && !availability.available && (
              <p className="mt-3 rounded-md bg-carta-nota px-3 py-2 text-[12px] text-txt-2">
                {availability.reason}
              </p>
            )}

            <button
              type="button"
              disabled={disabled || recuada || escolhida}
              onClick={() => onChoose(action.id)}
              className="carta-botao mt-4 rounded-lg py-2.5 text-[14px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-btn disabled:text-txt-3"
            >
              Escolher
            </button>
        </div>
      </div>
    </div>
  );
}
