import type { ComponentType, ReactNode } from 'react';
import { Icon } from './icons';
import { formatMinutes } from '../domain/effects';
import { gameConfig } from '../data/gameConfig';
import { objectives } from '../data/rooms';
import type { GameState } from '../domain/types';
import type { Summary } from '../domain/game';

/* ------------------------------------------------------------------ */

export function Card({
  title,
  icon: Glyph,
  tone = 'text-accent',
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-txt">
        <Glyph className={`h-[18px] w-[18px] shrink-0 ${tone}`} />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho: marca, abas e as duas métricas em cards                  */
/* ------------------------------------------------------------------ */

export function GameHeader({
  totalMinutes,
  distance,
  charges,
  tab,
  onTab,
}: {
  totalMinutes: number;
  distance: number;
  charges: number;
  tab: 'mapa' | 'instrucoes';
  onTab: (next: 'mapa' | 'instrucoes') => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-4 bg-header px-5 py-3.5 sm:px-6">
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
          <Icon.marca className="h-6 w-6 text-accent" aria-hidden />
        </span>
        <div>
          <h1 className="text-[26px] font-bold leading-none tracking-tight text-txt">Operação Limpeza</h1>
          <p className="mt-1 text-[13px] text-txt-2">Planeje. Limpe. Otimize.</p>
        </div>
      </div>

      <nav className="order-3 flex w-full gap-1 rounded-xl border border-line bg-panel-2 p-1.5 md:order-none md:mx-auto md:w-auto">
        <Aba active={tab === 'mapa'} onClick={() => onTab('mapa')} icon={Icon.mapa}>
          Mapa
        </Aba>
        <Aba active={tab === 'instrucoes'} onClick={() => onTab('instrucoes')} icon={Icon.instrucoes}>
          Instruções
        </Aba>
      </nav>

      <div className="ml-auto flex flex-wrap gap-3">
        <MetricCard icon={Icon.tempo} label="Tempo total" value={`${formatMinutes(totalMinutes)} min`} />
        <MetricCard icon={Icon.distancia} label="Distância percorrida" value={`${distance} m`} />
        <MetricCard
          icon={Icon.material}
          label="Material"
          value={`${charges}/${gameConfig.maxCharges}`}
          alert={charges === 0}
        />
      </div>
    </header>
  );
}

function Aba({
  active,
  onClick,
  icon: Glyph,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[15px] font-medium transition-colors md:flex-none ${
        active ? 'bg-accent-soft text-txt' : 'text-txt-2 hover:text-txt'
      }`}
    >
      <Glyph className="h-[17px] w-[17px]" aria-hidden />
      {children}
    </button>
  );
}

function MetricCard({
  icon: Glyph,
  label,
  value,
  alert,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
        alert ? 'border-warn/50 bg-warn/10' : 'border-line bg-panel'
      }`}
    >
      <Glyph className={`h-8 w-8 shrink-0 ${alert ? 'text-warn' : 'text-txt-2'}`} aria-hidden />
      <div>
        <p className="text-[12px] leading-none text-txt-2">{label}</p>
        <p className={`mt-1 text-[21px] font-bold leading-none ${alert ? 'text-warn' : 'text-txt'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coluna da esquerda                                                  */
/* ------------------------------------------------------------------ */

export function ObjectivePanel() {
  return (
    <Card title="Objetivo" icon={Icon.objetivo} tone="text-warn">
      <p className="text-[13.5px] leading-relaxed text-txt-2">
        Limpar todas as salas do bloco no menor tempo possível, considerando deslocamento, tempo de
        limpeza e os eventos de cada sala.
      </p>
    </Card>
  );
}

const LEGENDA: [string, string][] = [
  ['#a6d6f9', 'Sala (grande)'],
  ['#f9d89c', 'Sala (média)'],
  ['#96e6cb', 'Sala (pequena)'],
  ['#4fb6a8', 'Sala (estreita)'],
  ['#c4b9f5', 'Banheiro / área técnica'],
  ['#f6e9ad', 'Escada'],
  ['#d5d4d4', 'Corredor'],
];

export function Legend() {
  return (
    <Card title="Legenda" icon={Icon.legenda}>
      <ul className="space-y-2">
        {LEGENDA.map(([color, label]) => (
          <li key={label} className="flex items-center gap-3 text-[13.5px] text-txt-2">
            <span className="h-4 w-6 rounded-[3px] border border-black/40" style={{ background: color }} />
            {label}
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12.5px] text-txt-3">
        <li className="flex items-center gap-2">
          <Selo cor="#34d399" icon={Icon.concluida} /> concluída
        </li>
        <li className="flex items-center gap-2">
          <Selo cor="#f0b429" icon={Icon.pendente} /> pendente, exige retorno
        </li>
        <li className="flex items-center gap-2">
          <Selo cor="#5b6472" icon={Icon.bloqueada} /> bloqueada por enquanto
        </li>
      </ul>
    </Card>
  );
}

function Selo({ cor, icon: Glyph }: { cor: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{ background: cor }}
      aria-hidden
    >
      <Glyph className="h-2.5 w-2.5 text-[#0b1822]" />
    </span>
  );
}

export function TipPanel() {
  return (
    <Card title="Dica" icon={Icon.dica} tone="text-warn">
      <p className="text-[13.5px] leading-relaxed text-txt-2">
        A ordem das salas, os eventos e o deslocamento fazem toda a diferença. Pense na sua
        estratégia!
      </p>
    </Card>
  );
}

export function QuoteBlock() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-[#12263a] via-[#0d1b2a] to-[#0a1520] p-5">
      <div className="absolute inset-0 opacity-25" aria-hidden>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#1b3550]" />
        <div className="absolute bottom-6 left-6 h-16 w-28 rounded-sm bg-[#25456a]" />
        <div className="absolute bottom-6 right-8 h-20 w-20 rounded-sm bg-[#1f3c5c]" />
      </div>
      <p className="relative mt-16 text-[14px] leading-snug text-txt-2">
        Pequenas decisões,
        <br />
        grandes resultados.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coluna da direita                                                   */
/* ------------------------------------------------------------------ */

export function SequencePanel({ state }: { state: GameState }) {
  const total = objectives.length;
  const linhas = Array.from({ length: total }, (_, index) => state.route[index] ?? null);
  const atual = state.route.length;

  return (
    <Card title="Sua sequência" icon={Icon.sequencia}>
      <ol className="space-y-1.5">
        {linhas.map((step, index) => {
          const ativo = index === atual - 1;
          return (
            <li
              key={index}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 ${
                ativo ? 'bg-row-active ring-1 ring-accent/50' : ''
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step ? 'bg-accent text-white' : 'bg-btn text-txt-3'
                }`}
              >
                {index + 1}
              </span>
              <span className={`flex-1 truncate text-[14px] ${step ? 'text-txt' : 'text-txt-3'}`}>
                {step ? step.roomName : '—'}
              </span>
              {step && (
                <span className="shrink-0 text-[12.5px] tabular-nums text-txt-2">
                  {step.distance} m
                  {step.purpose === 'retorno' && <span className="text-warn"> ↩</span>}
                  {step.purpose === 'deposito' && <span className="text-ok"> ⟳</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {state.route.length > total && (
        <p className="mt-2 text-center text-[12px] text-txt-3">
          + {state.route.length - total} paradas extras (retornos e recargas)
        </p>
      )}
    </Card>
  );
}

export function SummaryPanel({ summary }: { summary: Summary }) {
  const linhas: [string, string][] = [
    ['Salas limpas', `${summary.concluidas.length} / ${summary.totalObjectives}`],
    ['Tempo de limpeza', `${formatMinutes(summary.cleaningMinutes)} min`],
    ['Distância percorrida', `${summary.distanceTraveled} m`],
    ['Tempo de deslocamento', `${formatMinutes(summary.travelMinutes)} min`],
    ['Eventos (decisões)', `${formatMinutes(summary.eventMinutes)} min`],
  ];
  if (summary.pendentes.length > 0) {
    linhas.push(['Pendências', String(summary.pendentes.length)]);
  }
  if (summary.idleMinutes > 0) {
    linhas.push(['Tempo ocioso', `${formatMinutes(summary.idleMinutes)} min`]);
  }

  return (
    <Card title="Resumo atual" icon={Icon.resumo}>
      <dl className="space-y-2.5">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[13.5px] text-txt-2">{label}</dt>
            <dd className="text-[13.5px] font-semibold tabular-nums text-txt">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center gap-3 rounded-lg bg-total-box px-4 py-3">
        <Icon.tempo className="h-6 w-6 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-[12.5px] leading-none text-txt-2">Tempo total atual</p>
          <p className="mt-1 text-[22px] font-bold leading-none text-txt">
            {formatMinutes(summary.totalMinutes)} min
          </p>
        </div>
      </div>
      <ShiftBar total={summary.totalMinutes} reference={summary.referenceShiftMinutes} />
    </Card>
  );
}

export function ShiftBar({ total, reference }: { total: number; reference: number }) {
  const pct = Math.min(100, (total / reference) * 100);
  const over = total > reference;
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-btn">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-warn' : 'bg-ok'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11.5px] text-txt-3">
        Turno de referência: {reference} min
        {over && <span className="text-warn"> · ultrapassado</span>}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Instructions() {
  const material = objectives.reduce((total, room) => total + room.materialCost, 0);
  const itens: [string, string][] = [
    ['Escolha uma sala no mapa', 'Você vê a distância e o tempo de limpeza antes de confirmar.'],
    ['Confirme para ir', `A caminhada custa 1 min a cada ${gameConfig.metersPerMinute} m — e é cobrada na hora.`],
    ['Resolva a situação', 'Três formas de agir sobre o mesmo problema. Nenhuma é melhor em tudo.'],
    ['Cuide do material', `O carrinho leva ${gameConfig.maxCharges} cargas e limpar tudo custa ${material}. Parar no depósito é obrigatório — passar por ele não recarrega.`],
    ['Volte quando precisar', 'Pendências exigem retorno, e o caminho de volta é cobrado igual.'],
  ];

  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <h2 className="text-[19px] font-bold text-txt">Como jogar</h2>
      <ol className="mt-5 space-y-4">
        {itens.map(([titulo, texto], index) => (
          <li key={titulo} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-txt">
              {index + 1}
            </span>
            <div>
              <p className="text-[14.5px] font-semibold text-txt">{titulo}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-txt-2">{texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
