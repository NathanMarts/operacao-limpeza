import { roomsById } from '../data/rooms';
import { situationsById } from '../data/situations';
import { ESTRATEGIA_ETIQUETA, ESTRATEGIAS_POR_SITUACAO } from '../data/actionVisuals';
import type { HistoryEntry } from './history';
import type { DecisionRecord } from './types';

/**
 * Exportação do histórico local para planilha, para a análise pós-oficina.
 *
 * Formato pensado para o Excel em português: separador `;`, vírgula decimal e
 * BOM no início, senão os acentos e as colunas saem trocados ao abrir o
 * arquivo com duplo clique. O Google Sheets lê o mesmo arquivo sem ajuste.
 *
 * Duas tabelas, ligadas pela coluna "Partida": uma linha por partida e uma
 * linha por decisão. O resultado final diz quem foi melhor; as decisões dizem
 * por quê.
 */

const SEP = ';';
const BOM = '﻿';

function celula(valor: string | number | boolean): string {
  const texto =
    typeof valor === 'number'
      ? String(Math.round(valor * 10) / 10).replace('.', ',')
      : typeof valor === 'boolean'
        ? valor ? 'sim' : 'não'
        : valor;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function csv(cabecalho: string[], linhas: (string | number | boolean)[][]): string {
  return BOM + [cabecalho, ...linhas].map((linha) => linha.map(celula).join(SEP)).join('\r\n');
}

const dois = (n: number) => String(n).padStart(2, '0');
export const data = (ms: number) => {
  const d = new Date(ms);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const hora = (ms: number) => {
  const d = new Date(ms);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
};

/** Numera as partidas em ordem cronológica: a primeira jogada é a Partida 1. */
export function emOrdem(entries: HistoryEntry[]): { numero: number; entry: HistoryEntry }[] {
  return [...entries]
    .sort((a, b) => a.playedAt - b.playedAt)
    .map((entry, index) => ({ numero: index + 1, entry }));
}

/** Nome completo: o curto é "WC" para os dois banheiros e os confundiria. */
export const nomeAmbiente = (id: string) => roomsById[id]?.name ?? id;

/** Traduz os ids guardados para os textos do jogo; um id que sumiu do catálogo aparece cru. */
export function descreverDecisao(decisao: DecisionRecord) {
  const situacao = situationsById[decisao.situationId];
  const acao = situacao?.actions.find((a) => a.id === decisao.actionId);
  const estrategia = ESTRATEGIAS_POR_SITUACAO[decisao.situationId]?.[decisao.actionId];
  return {
    ambiente: nomeAmbiente(decisao.roomId),
    situacao: situacao?.title ?? decisao.situationId,
    acao: acao?.label ?? decisao.actionId,
    estrategia: estrategia ? ESTRATEGIA_ETIQUETA[estrategia] : '',
  };
}

export function partidasCsv(entries: HistoryEntry[]): string {
  return csv(
    ['Partida', 'Data', 'Hora', 'Concluídos', 'Total de ambientes', 'Pendentes', 'Não iniciados',
      'Completa', 'Minutos', 'Distância (m)', 'Decisões', 'Rota'],
    emOrdem(entries).map(({ numero, entry }) => [
      numero,
      data(entry.playedAt),
      hora(entry.playedAt),
      entry.concluidas,
      entry.totalObjectives,
      entry.pendentes,
      entry.naoIniciadas,
      entry.complete,
      entry.totalMinutes,
      entry.distanceTraveled,
      entry.decisions?.length ?? '',
      entry.route.map(nomeAmbiente).join(' > '),
    ]),
  );
}

export function decisoesCsv(entries: HistoryEntry[]): string {
  return csv(
    ['Partida', 'Data', 'Ordem', 'Minuto do turno', 'Cargas no carrinho', 'Ambiente',
      'Situação', 'Ação', 'Estratégia'],
    emOrdem(entries).flatMap(({ numero, entry }) =>
      (entry.decisions ?? []).map((decisao, index) => {
        const texto = descreverDecisao(decisao);
        return [
          numero,
          data(entry.playedAt),
          index + 1,
          decisao.minute,
          decisao.charges,
          texto.ambiente,
          texto.situacao,
          texto.acao,
          texto.estrategia,
        ];
      }),
    ),
  );
}
