import { DEPOSITO_POSITION, ENTRANCE_POSITION, roomsById } from '../data/rooms';
import { gameConfig } from '../data/gameConfig';
import { distanceBetween, totalMinutes, travelMinutes } from './movement';
import {
  BANHEIRO_POSITION,
  ESCADA_POSITION,
  PONTOS,
  depositoFechado,
  minutoDoSinal,
  nomeDaPosicao,
  nomesDasSalas,
  resolverRegiao,
  salaDaFrente,
  suprimentoMaisProximo,
} from './mapa';
import type {
  ChargeExpr,
  Effect,
  GameState,
  RegionTarget,
  Requirement,
  RoomDef,
  RoomState,
  SituationAction,
  TimeExpr,
} from './types';

export type EffectContext = {
  room: RoomDef;
  roomState: RoomState;
  charges: number;
  /** Posição no instante em que a ação é resolvida (já dentro da sala). */
  position: number;
  /** Alvo resolvido de um bloqueio `nearestOther`, quando existir. */
  blockTargetId: string | null;
  /** Alvo resolvido de `unblockRoom`, quando existir. */
  unblockTargetId?: string | null;
  /**
   * A partida inteira, quando disponível. Efeitos com endereço no mapa (a sala
   * da frente, as vizinhas) só sabem quem alcançam olhando o estado.
   */
  game?: GameState;
};

/** Tempo base efetivo: o da planta mais a sujeira acumulada por adiamentos. */
export function effectiveBase(room: RoomDef, roomState: RoomState): number {
  return room.baseCleaningMinutes + roomState.extraDirtMinutes;
}

export function evalTime(expr: TimeExpr, ctx: EffectContext): number {
  const base = effectiveBase(ctx.room, ctx.roomState);
  switch (expr.kind) {
    case 'base':
      return base;
    case 'halfBase':
      return Math.ceil(base / 2);
    case 'const':
      return expr.value;
    case 'sum':
      return expr.terms.reduce((total, term) => total + evalTime(term, ctx), 0);
    case 'diff':
      return evalTime(expr.left, ctx) - evalTime(expr.right, ctx);
    case 'distance': {
      const metros = distanceBetween(ctx.position, posicaoDoAlvo(expr.to, ctx));
      return Math.round(travelMinutes(metros) * expr.factor * 10) / 10;
    }
    case 'ateIntervalo': {
      /* Sem a partida em mãos, a espera média; na partida, a espera real. */
      if (!ctx.game) return expr.every / 2;
      const agora = totalMinutes(ctx.game);
      return Math.round(((expr.every - (agora % expr.every)) % expr.every) * 10) / 10;
    }
  }
}

export function evalCharges(expr: ChargeExpr, ctx: EffectContext): number {
  switch (expr.kind) {
    case 'roomCost':
      return ctx.room.materialCost;
    case 'const':
      return expr.value;
    case 'roomCostPlus':
      return ctx.room.materialCost + expr.value;
  }
}

export function targetPosition(target: 'deposito' | 'entrada' | 'escada'): number {
  if (target === 'deposito') return DEPOSITO_POSITION;
  if (target === 'escada') return ESCADA_POSITION;
  return ENTRANCE_POSITION;
}

type AlvoDeDistancia = Extract<TimeExpr, { kind: 'distance' }>['to'];

/**
 * Onde fica o alvo de uma distância. Sem material alcançável (depósito fechado
 * e nenhuma caixa), a conta cai no depósito: a ação que depende disso já está
 * indisponível pelo requisito, e a carta ainda precisa de um número.
 */
function posicaoDoAlvo(to: AlvoDeDistancia, ctx: EffectContext): number {
  if (to === 'suprimento' || to === 'estoque') {
    const origem = to === 'estoque' ? 'estoque' : 'qualquer';
    return suprimentoMaisProximo(ctx.game, ctx.position, origem)?.position ?? DEPOSITO_POSITION;
  }
  if (to === 'banheiro') return BANHEIRO_POSITION;
  return targetPosition(to);
}

/** Algum ambiente por fazer está fechado agora e pode ser liberado? */
export function temAmbienteFechado(game: GameState, room: RoomDef): boolean {
  const agora = totalMinutes(game);
  return Object.entries(game.rooms).some(([id, rs]) => {
    const def = roomsById[id];
    if (!def?.cleanable || id === room.id) return false;
    if (rs.status === 'concluida' || rs.delegatedUntil) return false;
    return rs.blockedUntilMinute !== null && rs.blockedUntilMinute > agora;
  });
}

/* ------------------------------------------------------------------ */
/* Pré-condições                                                       */
/* ------------------------------------------------------------------ */

export type Availability = { available: true } | { available: false; reason: string };

function checkRequirement(requirement: Requirement, ctx: EffectContext): Availability {
  if (requirement.type === 'antesDoPonto') {
    return ctx.position < PONTOS[requirement.at]
      ? { available: true }
      : { available: false, reason: 'Você já está ali: a caixa seria recolhida na hora.' };
  }
  if (requirement.type === 'depositoAcessivel') {
    return ctx.game && depositoFechado(ctx.game)
      ? { available: false, reason: 'O depósito está fechado agora.' }
      : { available: true };
  }
  if (requirement.type === 'temEstoque') {
    return !ctx.game || ctx.game.stashes.some((stash) => stash.charges > 0)
      ? { available: true }
      : { available: false, reason: 'Não há nenhuma caixa de material no corredor.' };
  }
  if (requirement.type === 'temBloqueada') {
    return !ctx.game || temAmbienteFechado(ctx.game, ctx.room)
      ? { available: true }
      : { available: false, reason: 'Não há nenhum ambiente fechado para liberar.' };
  }
  if (requirement.type === 'regiaoComAlvo') {
    if (requirement.target.kind === 'frente' && !salaDaFrente(ctx.room)) {
      return { available: false, reason: 'Não há sala na frente desta.' };
    }
    /* Sem a partida em mãos não dá para saber; quem decide de verdade
       (chooseAction) sempre passa o estado. */
    if (!ctx.game) return { available: true };
    if (resolverRegiao(ctx.game, ctx.room, requirement.target).length === 0) {
      return { available: false, reason: `${REGIAO_GENERICA[requirement.target.kind]} já está resolvida.` };
    }
    return { available: true };
  }
  const needed = evalCharges(requirement.amount, ctx);
  if (ctx.charges >= needed) return { available: true };
  return {
    available: false,
    reason: `Precisa de ${needed} ${needed === 1 ? 'carga' : 'cargas'} — você tem ${ctx.charges}.`,
  };
}

/** Decisão L5: ação sem material fica desabilitada e explica o motivo. */
export function actionAvailability(action: SituationAction, ctx: EffectContext): Availability {
  for (const requirement of action.requires) {
    const result = checkRequirement(requirement, ctx);
    if (!result.available) return result;
  }
  /* O rádio só funciona se existe material alcançável: com o depósito fechado,
     sobram as caixas do corredor. Não é requisito escrito na carta porque vale
     para toda reposição, sempre. */
  for (const effect of action.effects) {
    if (effect.type === 'fetchSupply' && ctx.game) {
      if (!suprimentoMaisProximo(ctx.game, ctx.position, effect.origem ?? 'qualquer')) {
        return {
          available: false,
          reason:
            effect.origem === 'estoque'
              ? 'Não há nenhuma caixa de material no corredor.'
              : 'O depósito está fechado e não há caixa no corredor.',
        };
      }
    }
  }
  return { available: true };
}

/* ------------------------------------------------------------------ */
/* Descrição dos efeitos — transparência total (decisão Q10)           */
/* ------------------------------------------------------------------ */

export type EffectBadge = {
  text: string;
  /** Natureza do custo, para a UI colorir sem embutir regra. */
  tone: 'tempo' | 'material' | 'pendencia' | 'bloqueio' | 'deslocamento' | 'bom';
};

const plural = (value: number, one: string, many: string) => (value === 1 ? one : many);

const REGIAO_GENERICA: Record<RegionTarget['kind'], string> = {
  frente: 'A sala da frente',
  raio: 'As salas vizinhas',
  ponto: 'Aquele ponto do corredor',
  maisDistante: 'A sala mais distante',
  parMaisDistante: 'O par de salas mais distante',
  maisProximaOutraEstacao: 'A sala mais próxima em outra estação',
  salas: 'Aquele ambiente',
  tipo: 'Aqueles ambientes',
  pendencias: 'Suas pendências',
};

/** Minuto em que o efeito termina: por duração, ou no N-ésimo próximo sinal. */
function minutoFinal(ctx: EffectContext, minutes: number, ateSinal?: number): number | null {
  if (!ctx.game) return null;
  const agora = totalMinutes(ctx.game);
  return ateSinal ? minutoDoSinal(agora, ateSinal) : agora + minutes;
}

function textoPrazo(ctx: EffectContext, minutes: number, ateSinal?: number): string {
  const fim = minutoFinal(ctx, minutes, ateSinal);
  if (ateSinal) {
    const qual = ateSinal === 1 ? 'o próximo sinal' : `o ${ateSinal}º sinal`;
    return fim === null ? `até ${qual}` : `até ${qual} (minuto ${formatMinutes(fim)})`;
  }
  return fim === null ? `por ${minutes} min` : `por ${minutes} min (até o minuto ${formatMinutes(fim)})`;
}

/**
 * O efeito regional não alcança nenhum ambiente por fazer (ex.: o outro
 * banheiro já está limpo). Aí a carta não mostra a linha: dizer "sem efeito"
 * só confunde, e não há consequência nenhuma para o jogador pesar.
 */
function semAlvo(target: RegionTarget | 'self', ctx: EffectContext): boolean {
  return target !== 'self' && Boolean(ctx.game) && resolverRegiao(ctx.game!, ctx.room, target).length === 0;
}

/** Quantas salas o efeito alcança agora (1 quando não dá para saber). */
function quantosAlvos(target: RegionTarget | 'self', ctx: EffectContext): number {
  if (target === 'self' || !ctx.game) return 1;
  return resolverRegiao(ctx.game, ctx.room, target).length;
}

/** Salas alcançadas, quando a partida é conhecida; senão, a descrição genérica. */
function alvosDe(target: RegionTarget | 'self', ctx: EffectContext): string {
  if (target === 'self') return 'esta sala';
  if (!ctx.game) return REGIAO_GENERICA[target.kind].toLowerCase();
  const alvos = resolverRegiao(ctx.game, ctx.room, target);
  return alvos.length > 0 ? nomesDasSalas(alvos) : '';
}

/** Frase de um efeito regional, com os nomes das salas quando a partida é conhecida. */
function textoRegiao(effect: Extract<Effect, { type: 'modifyRooms' }>, ctx: EffectContext): string {
  const sinal = effect.minutes < 0 ? '−' : '+';
  const valor = `${sinal}${Math.abs(effect.minutes)} min`;
  const prazo = effect.durationMinutes ? ` nos próximos ${effect.durationMinutes} min` : '';
  const alvos = alvosDe(effect.target, ctx);
  if (!alvos) return 'só alcançaria ambientes já limpos: sem efeito';
  const onde = effect.equipment ? `${effect.equipment} fica em ${alvos}: ` : `${alvos}: `;
  const cada = quantosAlvos(effect.target, ctx) > 1 ? ' cada' : '';
  return `${onde}${valor}${cada}${prazo}`;
}

function textoBloqueioRegional(
  effect: Extract<Effect, { type: 'blockRooms' }>,
  ctx: EffectContext,
): string {
  const alvos = alvosDe(effect.target, ctx);
  const fechadas = quantosAlvos(effect.target, ctx) > 1 ? 'fechadas' : 'fechada';
  return alvos
    ? `${alvos} ${fechadas} ${textoPrazo(ctx, effect.minutes)}`
    : 'só fecharia ambientes já limpos: não atrapalha a rota';
}

function textoDelegacao(effect: Extract<Effect, { type: 'delegate' }>, ctx: EffectContext): string {
  const fim = minutoFinal(ctx, effect.minutes, effect.ateSinal);
  const quando =
    fim !== null
      ? `no minuto ${formatMinutes(fim)}`
      : effect.ateSinal
        ? `no ${effect.ateSinal}º sinal`
        : `em ${effect.minutes} min`;
  if (effect.target === 'self') return `${effect.label} conclui esta sala ${quando}; até lá ela fica fechada`;
  const ids = ctx.game ? resolverRegiao(ctx.game, ctx.room, effect.target).slice(0, effect.limite ?? Infinity) : [];
  const alvos = ids.length ? nomesDasSalas(ids) : REGIAO_GENERICA[effect.target.kind].toLowerCase();
  return `${effect.label} deixa ${alvos} ${ids.length > 1 ? 'prontas' : 'pronta'} ${quando}, sem você`;
}

function textoSuprimento(
  effect: Extract<Effect, { type: 'fetchSupply' }>,
  ctx: EffectContext,
): string {
  const ponto = suprimentoMaisProximo(ctx.game, ctx.position, effect.origem ?? 'qualquer');
  if (!ponto) return 'nenhum material alcançável agora';
  return ponto.stashId
    ? `+${effect.amount} cargas trazidas de "${ponto.label}", em ${nomeDaPosicao(ponto.position)}`
    : `+${effect.amount} cargas trazidas do depósito`;
}

function textoBloqueio(effect: Extract<Effect, { type: 'blockRoom' }>, ctx: EffectContext): string {
  const alvo =
    effect.target === 'self'
      ? 'esta sala'
      : ctx.blockTargetId
        ? roomsById[ctx.blockTargetId]?.shortName ?? 'outro ambiente'
        : 'outro ambiente';
  return `${alvo} fechada ${textoPrazo(ctx, effect.minutes, effect.ateSinal)}`;
}

function textoReveal(effect: Extract<Effect, { type: 'revealSituations' }>, ctx: EffectContext): string {
  if (!effect.target) return `você fica sabendo o que espera nas ${effect.count} salas por fazer mais próximas`;
  const alvos = alvosDe(effect.target, ctx);
  return alvos ? `você fica sabendo o que espera em ${alvos}` : 'nada por fazer ali para descobrir';
}

function textoAposta(effect: Extract<Effect, { type: 'aposta' }>): string {
  return `chance de 1 em ${effect.umEm}: ${effect.label}`;
}

function textoMeta(effect: Extract<Effect, { type: 'addMeta' }>, ctx: EffectContext): string {
  const alvos = alvosDe(effect.target, ctx) || REGIAO_GENERICA[effect.target.kind].toLowerCase();
  const prazo = ctx.game ? `até o minuto ${formatMinutes(totalMinutes(ctx.game) + effect.minutes)}` : `em ${effect.minutes} min`;
  const premio = effect.recompensa ? `; a tempo: ${effect.recompensa.label}` : '';
  const multa = effect.penalidadePorSala ? `+${effect.penalidade} min em cada uma` : `+${effect.penalidade} min lá`;
  const prontas = quantosAlvos(effect.target, ctx) > 1 ? 'prontas' : 'pronta';
  return `${alvos} ${prontas} ${prazo}${premio}; atrasou: ${multa}`;
}

/** Expressão de tempo em termos soltos, para explicar cada parcela na carta. */
function termosDe(expr: TimeExpr): TimeExpr[] {
  return expr.kind === 'sum' ? expr.terms.flatMap(termosDe) : [expr];
}

function textoEstoque(effect: Extract<Effect, { type: 'placeStash' }>): string {
  if (effect.at === 'aqui') {
    return `${effect.charges} cargas ficam nesta estação: pega quando passar de novo`;
  }
  const posicao = PONTOS[effect.at];
  return `${effect.charges} cargas ficam em ${nomeDaPosicao(posicao)} (${posicao} m): pega ao passar`;
}

export function describeEffect(effect: Effect, ctx: EffectContext): EffectBadge | null {
  switch (effect.type) {
    case 'cleanTime': {
      const minutes = evalTime(effect.amount, ctx);
      return { text: `+${minutes} min de limpeza`, tone: 'tempo' };
    }
    case 'eventTime': {
      const minutes = evalTime(effect.amount, ctx);
      return { text: `+${minutes} min extras`, tone: 'tempo' };
    }
    case 'spendCharges': {
      const amount = evalCharges(effect.amount, ctx);
      return { text: `−${amount} ${plural(amount, 'carga', 'cargas')}`, tone: 'material' };
    }
    case 'setCharges':
      return { text: 'o carrinho zera', tone: 'material' };
    case 'refill':
      return { text: `reabastece até ${gameConfig.maxCharges} cargas`, tone: 'bom' };
    case 'gainCharges':
      return { text: `+${effect.amount} ${plural(effect.amount, 'carga', 'cargas')}`, tone: 'bom' };
    case 'grantBuff':
      return {
        text:
          effect.kind === 'tempo'
            ? `−${effect.amount} min nas próximas ${effect.rooms} salas`
            : `−${effect.amount} carga nas próximas ${effect.rooms} salas`,
        tone: 'bom',
      };
    case 'completeRoom':
      return { text: 'conclui a sala', tone: 'bom' };
    case 'leavePending': {
      const minutes = evalTime(effect.residual, ctx);
      return { text: `deixa pendência: ${minutes} min + voltar aqui`, tone: 'pendencia' };
    }
    case 'leaveUnstarted':
      return { text: 'a sala continua suja', tone: 'pendencia' };
    case 'addDirt':
      return { text: `+${effect.minutes} min quando voltar`, tone: 'pendencia' };
    case 'moveTo': {
      const destination = targetPosition(effect.target);
      const meters = distanceBetween(ctx.position, destination);
      const label =
        effect.target === 'deposito' ? 'até o depósito' : effect.target === 'escada' ? 'até a escada' : 'até a entrada';
      return {
        text: `desloca ${label}: +${meters} m (+${formatMinutes(travelMinutes(meters))} min)`,
        tone: 'deslocamento',
      };
    }
    case 'unblockRoom': {
      /* Sem alvo, dizer "libera um ambiente" seria prometer o que não existe. */
      const name = ctx.unblockTargetId ? roomsById[ctx.unblockTargetId]?.shortName : null;
      return name
        ? { text: `libera ${name} agora`, tone: 'bom' }
        : { text: 'nada bloqueado para liberar agora', tone: 'tempo' };
    }
    case 'blockRoom':
      return { text: textoBloqueio(effect, ctx), tone: 'bloqueio' };
    case 'blockDeposito':
      return { text: `o depósito fecha ${textoPrazo(ctx, effect.minutes)}`, tone: 'bloqueio' };
    case 'aposta':
      return { text: textoAposta(effect), tone: 'pendencia' };
    case 'addMeta':
      return { text: textoMeta(effect, ctx), tone: 'pendencia' };
    case 'modifyRooms':
      if (semAlvo(effect.target, ctx)) return null;
      return { text: textoRegiao(effect, ctx), tone: effect.minutes < 0 ? 'bom' : 'pendencia' };
    case 'blockRooms':
      if (semAlvo(effect.target, ctx)) return null;
      return { text: textoBloqueioRegional(effect, ctx), tone: 'bloqueio' };
    case 'placeStash':
      return { text: textoEstoque(effect), tone: 'bom' };
    case 'fetchSupply':
      return { text: textoSuprimento(effect, ctx), tone: 'bom' };
    case 'delegate':
      return { text: textoDelegacao(effect, ctx), tone: 'bom' };
    case 'revealSituations':
      return { text: textoReveal(effect, ctx), tone: 'bom' };
  }
}

export function describeAction(action: SituationAction, ctx: EffectContext): EffectBadge[] {
  return action.effects
    .map((effect) => describeEffect(effect, ctx))
    .filter((badge): badge is EffectBadge => badge !== null);
}

/** Formata metros em padrão pt-BR. Posições podem ser fracionárias. */
export function formatMeters(value: number): string {
  return formatMinutes(value);
}

/** Formata minutos com no máximo uma casa decimal, em padrão pt-BR. */
export function formatMinutes(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');
}

/* ------------------------------------------------------------------ */
/* Resumo agrupado por categoria — usado pelas cartas de decisão        */
/* ------------------------------------------------------------------ */

/** Categoria da consequência. Escolher o ícone é papel da camada visual. */
export type ConsequenceKind =
  | 'tempo'
  | 'deslocamento'
  | 'material'
  | 'pendencia'
  | 'intocada'
  | 'sujeira'
  | 'bloqueio'
  | 'regiao'
  | 'estoque'
  | 'delegada';

export type ConsequenceLine = {
  kind: ConsequenceKind;
  label: string;
  value: string;
  /** Consequência futura a favor do jogador, para a carta não pintá-la de alerta. */
  bom?: boolean;
};

export type ActionSummary = {
  /** O que a escolha cobra imediatamente. */
  agora: ConsequenceLine[];
  /** O que a escolha deixa para o futuro — onde mora o trade-off. */
  depois: ConsequenceLine[];
  /** A sala fica fechada com esta ação? */
  conclui: boolean;
  /** Custo imediato somado, em minutos, para o selo da carta. */
  minutosAgora: number;
};

/**
 * Agrupa os efeitos em quatro categorias legíveis (tempo, deslocamento,
 * material, consequência futura) e separa AGORA de DEPOIS. É essa separação
 * que torna o trade-off visível de relance, em vez de virar contagem de selos.
 */
export function summarizeAction(action: SituationAction, ctx: EffectContext): ActionSummary {
  let minutos = 0;
  let metros = 0;
  let cargas = 0;
  let zeraCarrinho = false;
  let reabastece = false;
  let conclui = false;
  const depois: ConsequenceLine[] = [];
  const agora: ConsequenceLine[] = [];

  for (const effect of action.effects) {
    switch (effect.type) {
      case 'cleanTime':
      case 'eventTime':
        minutos += evalTime(effect.amount, ctx);
        /* O custo que depende da posição precisa dizer de onde vem, senão
           o jogador vê só um número e não percebe que o mapa decidiu. */
        for (const termo of termosDe(effect.amount)) {
          if (termo.kind === 'distance') {
            const metros = distanceBetween(ctx.position, posicaoDoAlvo(termo.to, ctx));
            const ponto = suprimentoMaisProximo(
              ctx.game,
              ctx.position,
              termo.to === 'estoque' ? 'estoque' : 'qualquer',
            );
            const onde =
              termo.to === 'deposito'
                ? 'do depósito'
                : termo.to === 'entrada'
                  ? 'da entrada'
                  : termo.to === 'banheiro'
                    ? 'da torneira dos banheiros'
                    : ponto?.stashId
                      ? `de "${ponto.label}"`
                      : 'do depósito';
            agora.push({
              kind: 'deslocamento',
              label: 'Distância',
              value: `${formatMeters(metros)} m ${onde}: espera de ${formatMinutes(evalTime(termo, ctx))} min`,
            });
          }
          if (termo.kind === 'ateIntervalo') {
            const espera = evalTime(termo, ctx);
            agora.push({
              kind: 'tempo',
              label: 'Intervalo',
              value: ctx.game
                ? `próximo sinal no minuto ${formatMinutes(totalMinutes(ctx.game) + espera)}: espera de ${formatMinutes(espera)} min`
                : `espera até o próximo intervalo (a cada ${termo.every} min)`,
            });
          }
        }
        break;
      case 'spendCharges':
        cargas += evalCharges(effect.amount, ctx);
        break;
      case 'setCharges':
        zeraCarrinho = true;
        break;
      case 'refill':
        reabastece = true;
        break;
      case 'gainCharges':
        cargas -= effect.amount;
        break;
      case 'grantBuff':
        depois.push({
          kind: effect.kind === 'tempo' ? 'tempo' : 'material',
          label: effect.label,
          /*
           * "até", e "ambiente" em vez de "sala".
           *
           * O abatimento de material é limitado pelo que o ambiente realmente
           * cobra: `Math.min(buff.amount, gasto)`. Uma sala custa 1 carga, e um
           * bônus de 2 abate 1 — a carta prometia 2 e entregava metade. O de
           * tempo é limitado pelos minutos restantes, que quase nunca ficam
           * abaixo do bônus, então ali o número segue exato.
           *
           * E o bônus vale para qualquer ambiente limpável, banheiro e escada
           * incluídos, não só para salas de aula. Os números continuam vindo do
           * efeito; nada aqui é fixo.
           */
          value:
            effect.kind === 'tempo'
              ? `−${effect.amount} min por ambiente, nos próximos ${effect.rooms}`
              : `−até ${effect.amount} ${plural(effect.amount, 'carga', 'cargas')} por ambiente, nos próximos ${effect.rooms}`,
        });
        break;
      case 'completeRoom':
        conclui = true;
        break;
      case 'moveTo':
        metros += distanceBetween(ctx.position, targetPosition(effect.target));
        break;
      case 'leavePending':
        depois.push({
          kind: 'pendencia',
          label: 'Pendência',
          value: `${evalTime(effect.residual, ctx)} min quando voltar aqui`,
        });
        break;
      case 'leaveUnstarted':
        depois.push({
          kind: 'intocada',
          label: 'Sala adiada',
          value: 'a mesma situação espera você na volta',
        });
        break;
      case 'blockRooms':
        if (semAlvo(effect.target, ctx)) break;
        depois.push({ kind: 'bloqueio', label: 'Salas fechadas', value: textoBloqueioRegional(effect, ctx) });
        break;
      case 'fetchSupply':
        cargas -= effect.amount;
        depois.push({ kind: 'estoque', label: 'Reposição', value: textoSuprimento(effect, ctx), bom: true });
        break;
      case 'revealSituations':
        depois.push({ kind: 'regiao', label: 'Informação', value: textoReveal(effect, ctx), bom: true });
        break;
      case 'blockDeposito':
        depois.push({
          kind: 'bloqueio',
          label: 'Depósito fechado',
          value: `sem recarga ${textoPrazo(ctx, effect.minutes)}`,
        });
        break;
      case 'aposta':
        depois.push({ kind: 'pendencia', label: 'Risco', value: textoAposta(effect) });
        break;
      case 'addMeta':
        depois.push({ kind: 'regiao', label: effect.label, value: textoMeta(effect, ctx) });
        break;
      case 'modifyRooms':
        if (semAlvo(effect.target, ctx)) break;
        depois.push({
          kind: 'regiao',
          label: effect.label,
          value: textoRegiao(effect, ctx),
          bom: effect.minutes < 0,
        });
        break;
      case 'placeStash':
        depois.push({ kind: 'estoque', label: effect.label, value: textoEstoque(effect), bom: true });
        break;
      case 'delegate':
        /* O texto já nomeia quem faz; o rótulo só diz o tipo de ajuda. */
        depois.push({ kind: 'delegada', label: 'Com ajuda', value: textoDelegacao(effect, ctx), bom: true });
        break;
      case 'addDirt':
        depois.push({
          kind: 'sujeira',
          label: 'Sujeira acumula',
          value: `+${effect.minutes} min na próxima visita`,
        });
        break;
      case 'unblockRoom': {
        const nome = ctx.unblockTargetId ? roomsById[ctx.unblockTargetId]?.shortName : null;
        depois.push({
          kind: 'bloqueio',
          label: nome ? 'Rota liberada' : 'Sem efeito na rota',
          value: nome
            ? `${nome} volta a ficar disponível`
            : 'nenhum ambiente está bloqueado agora',
        });
        break;
      }
      case 'blockRoom':
        depois.push({ kind: 'bloqueio', label: 'Bloqueio', value: textoBloqueio(effect, ctx) });
        break;
    }
  }

  if (minutos > 0) {
    agora.unshift({ kind: 'tempo', label: 'Tempo', value: `+${formatMinutes(minutos)} min` });
  }
  if (metros > 0) {
    agora.push({
      kind: 'deslocamento',
      label: 'Deslocamento',
      value: `+${formatMeters(metros)} m · ${formatMinutes(travelMinutes(metros))} min`,
    });
  }
  if (reabastece) {
    agora.push({ kind: 'material', label: 'Material', value: `reabastece até ${gameConfig.maxCharges}` });
  } else if (zeraCarrinho) {
    agora.push({ kind: 'material', label: 'Material', value: 'zera o carrinho' });
  } else if (cargas > 0) {
    agora.push({
      kind: 'material',
      label: 'Material',
      value: `−${cargas} ${cargas === 1 ? 'carga' : 'cargas'}`,
    });
  } else if (cargas < 0) {
    agora.push({
      kind: 'material',
      label: 'Material',
      value: `+${-cargas} ${cargas === -1 ? 'carga' : 'cargas'} no carrinho`,
    });
  } else {
    agora.push({ kind: 'material', label: 'Material', value: 'não gasta nada' });
  }

  return {
    agora,
    depois,
    conclui,
    minutosAgora: minutos + travelMinutes(metros),
  };
}
