import { Fragment, useState } from 'react';
import { formatMeters, formatMinutes } from '../domain/effects';
import type { HistoryEntry } from '../domain/history';
import { data, decisoesCsv, descreverDecisao, emOrdem, hora, partidasCsv } from '../domain/exportHistory';
import { Icon } from './icons';

/** Nome com data e hora, para arquivos de computadores diferentes não se sobrescreverem. */
function baixarCsv(nome: string, conteudo: string) {
  const agora = new Date();
  const d = (n: number) => String(n).padStart(2, '0');
  const carimbo = `${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}_${d(agora.getHours())}h${d(agora.getMinutes())}`;
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `operacao-limpeza_${nome}_${carimbo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ExportButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg border border-line bg-btn px-3.5 py-2 text-[13px] font-semibold text-txt transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-txt-3 disabled:hover:border-line"
    >
      <Icon.baixar className="h-[15px] w-[15px]" aria-hidden />
      {label}
    </button>
  );
}

/**
 * Aba de histórico: as partidas salvas neste navegador e a exportação para
 * planilha, que é como os resultados da oficina saem daqui para a análise.
 * Fica fora da tela final de propósito: o facilitador exporta quando quiser,
 * sem precisar encerrar uma partida.
 */
export function HistoryPanel({ history, onClear }: { history: HistoryEntry[]; onClear: () => void }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const partidas = emOrdem(history).reverse();
  const vazio = history.length === 0;
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div>
          <h2 className="text-[19px] font-bold text-txt">Histórico de partidas</h2>
          <p className="mt-1 text-[13px] text-txt-2">
            {vazio
              ? 'Nenhuma partida salva neste navegador ainda.'
              : `${plural(history.length, 'partida salva', 'partidas salvas')} neste navegador. Elas só existem aqui: exporte antes de limpar os dados de navegação.`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ExportButton
            label="Baixar partidas"
            disabled={vazio}
            onClick={() => baixarCsv('partidas', partidasCsv(history))}
          />
          <ExportButton
            label="Baixar decisões"
            disabled={vazio}
            onClick={() => baixarCsv('decisoes', decisoesCsv(history))}
          />
        </div>
      </div>

      {!vazio && (
        <div className="scroll-slim mt-5 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-panel-2 text-txt-2">
              <tr>
                {['Partida', 'Data', 'Concluídos', 'Pendentes', 'Tempo', 'Distância', 'Decisões', ''].map(
                  (header, index) => (
                    <th
                      key={header || index}
                      className={`px-3 py-2 font-medium ${index >= 2 && index <= 6 ? 'text-right' : ''}`}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {partidas.map(({ numero, entry }) => {
                const decisoes = entry.decisions ?? [];
                const expandida = aberta === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => decisoes.length > 0 && setAberta(expandida ? null : entry.id)}
                      className={decisoes.length > 0 ? 'cursor-pointer hover:bg-panel-2' : ''}
                    >
                      <td className="px-3 py-2 font-semibold text-txt">{numero}</td>
                      <td className="px-3 py-2 tabular-nums text-txt-2">
                        {data(entry.playedAt)} {hora(entry.playedAt)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className="font-semibold text-txt">
                          {entry.concluidas}/{entry.totalObjectives}
                        </span>
                        {entry.complete && <Icon.concluida className="ml-1.5 inline h-3.5 w-3.5 text-ok" aria-label="completa" />}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-txt-2">{entry.pendentes}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-txt">{formatMinutes(entry.totalMinutes)} min</td>
                      <td className="px-3 py-2 text-right tabular-nums text-txt-2">{formatMeters(entry.distanceTraveled)} m</td>
                      <td className="px-3 py-2 text-right tabular-nums text-txt-2">
                        {entry.decisions ? decisoes.length : '—'}
                      </td>
                      <td className="w-10 px-3 py-2 text-right">
                        {decisoes.length > 0 && (
                          <button
                            type="button"
                            aria-expanded={expandida}
                            aria-label={`${expandida ? 'Fechar' : 'Ver'} decisões da partida ${numero}`}
                            className="text-txt-3 hover:text-txt"
                          >
                            <Icon.abrirLinha
                              className={`h-4 w-4 transition-transform ${expandida ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandida && (
                      <tr className="bg-panel-2">
                        <td colSpan={8} className="px-3 pb-3 pt-1">
                          <ol className="space-y-1">
                            {decisoes.map((decisao, index) => {
                              const texto = descreverDecisao(decisao);
                              return (
                                <li key={index} className="flex flex-wrap items-baseline gap-x-3 text-[12.5px]">
                                  <span className="w-16 whitespace-nowrap tabular-nums text-txt-3">{formatMinutes(decisao.minute)} min</span>
                                  <span className="w-28 text-txt-2">{texto.ambiente}</span>
                                  <span className="text-txt-2">{texto.situacao}</span>
                                  <span className="text-txt-3">→</span>
                                  <span className="font-medium text-txt">{texto.acao}</span>
                                  {texto.estrategia && (
                                    <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-txt-2">
                                      {texto.estrategia}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!vazio && (
        <div className="mt-4 flex items-center justify-end gap-3 text-[12.5px]">
          {confirmandoLimpeza ? (
            <>
              <span className="text-warn">
                Apagar {plural(history.length, 'partida', 'partidas')}? Isso não pode ser desfeito.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirmandoLimpeza(false);
                }}
                className="font-semibold text-warn underline underline-offset-2"
              >
                Apagar
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoLimpeza(false)}
                className="text-txt-2 underline underline-offset-2"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoLimpeza(true)}
              className="text-txt-3 underline underline-offset-2 hover:text-txt-2"
            >
              Limpar histórico
            </button>
          )}
        </div>
      )}
    </div>
  );
}
