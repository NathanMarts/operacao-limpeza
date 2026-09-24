/**
 * Gramática visual das cartas de decisão.
 *
 * A cor NÃO diz se a escolha é boa ou ruim — diz que TIPO DE ESTRATÉGIA ela é.
 * Duas cartas âmbar em situações diferentes querem dizer a mesma coisa: "esta
 * preserva material". É isso que torna a leitura ensinável numa oficina.
 *
 * Isto é camada de apresentação. Nada aqui entra no domínio: as ações, seus
 * custos, efeitos e ordem continuam definidos só em `situations.ts`.
 */
export type Estrategia =
  | 'imediata'
  | 'concluir'
  | 'economia'
  | 'futuro'
  | 'desvio'
  | 'bloqueio'
  | 'cooperacao'
  | 'adiar';

/**
 * Etiqueta de cada estratégia, exibida na tarja do canto da carta.
 *
 * Curta de propósito: ela aparece em caixa alta num espaço estreito, e é ela
 * que o leitor de tela anuncia — por isso o ícone e a imagem ao lado ficam
 * decorativos, para a estratégia não ser lida três vezes na mesma carta.
 */
export const ESTRATEGIA_ETIQUETA: Record<Estrategia, string> = {
  imediata: 'Ação rápida',
  concluir: 'Resolve agora',
  economia: 'Poupa material',
  futuro: 'Ganho futuro',
  desvio: 'Desvio na rota',
  bloqueio: 'Interdita',
  cooperacao: 'Com ajuda',
  adiar: 'Fica pendente',
};

/**
 * Estratégia de cada ação, por situação.
 *
 * Curado à mão, não derivado dos efeitos. A derivação automática erra
 * justamente onde importa: "Pegar de passagem" e "Pedir que tragam material"
 * ganham carga do mesmo jeito, mas uma é manter o fluxo e a outra é aceitar
 * ajuda. Invariante: as três ações de uma situação têm estratégias distintas,
 * senão a cor deixa de separar as opções — garantido por teste.
 */
export const ESTRATEGIAS_POR_SITUACAO: Record<string, Record<string, Estrategia>> = {
  'sala-suja': { 'forca-tarefa': 'concluir', 'varrer-corredor': 'imediata', 'equipe-noite': 'cooperacao' },
  'material-acabando': { radio: 'cooperacao', raspar: 'desvio', 'so-agua': 'economia' },
  'sala-em-uso': { correr: 'concluir', 'turma-na-frente': 'bloqueio', 'ceder-esta': 'adiar' },
  'lixeiras-cheias': { 'levar-deposito': 'desvio', acumular: 'imediata', 'coleta-radio': 'cooperacao' },
  'sala-trancada': { 'buscar-chave': 'desvio', 'pedir-chave': 'cooperacao', 'deixar-trancada': 'adiar' },
  'equipamento-quebrado': { trocar: 'desvio', improvisar: 'concluir', remendo: 'imediata' },

  'cadeiras-em-circulo': { reorganizar: 'concluir', 'empilhar-frente': 'bloqueio', 'equipe-desmonta': 'cooperacao' },
  'janela-aberta': { 'secar-tudo': 'concluir', 'fechar-secando': 'adiar', 'balde-banheiro': 'desvio' },
  'sala-organizada': { 'fechar-agora': 'imediata', 'voltar-depois': 'adiar', 'material-turma': 'cooperacao' },
  'turma-ajuda': { 'ajudar-aqui': 'cooperacao', 'preparar-vizinhas': 'futuro', perguntar: 'economia' },

  'vaso-entupido': { desentupir: 'concluir', 'chamar-manutencao': 'cooperacao', 'isolar-cabine': 'adiar' },
  'piso-encharcado': { 'secar-completo': 'concluir', 'fechar-banheiros': 'adiar', 'ralo-deposito': 'bloqueio' },
  'sem-reposicao': { 'repor-do-carrinho': 'imediata', 'buscar-caixa': 'desvio', 'usar-da-frente': 'economia' },
  'turno-da-manha': { conferir: 'imediata', 'ler-caderno': 'futuro', 'recolher-sobra': 'economia' },
  'carrinho-da-manutencao': { 'usar-deles': 'economia', 'levar-meio': 'futuro', 'outro-banheiro': 'cooperacao' },

  'escada-enlameada': { 'lavar-degraus': 'concluir', 'raspar-barro': 'imediata', 'levar-barro': 'desvio' },
  'poeira-de-obra': { 'varrer-e-pano': 'concluir', 'so-varrer': 'economia', 'porta-corta-fogo': 'futuro' },
  'fluxo-de-alunos': { cavaletes: 'bloqueio', 'esperar-intervalo': 'concluir', 'deixar-final': 'adiar' },
  'escada-ja-varrida': { 'so-pano': 'imediata', 'carrinho-apoio': 'economia', encerar: 'futuro' },

  'falta-de-agua': { racionar: 'concluir', 'ir-banheiros': 'desvio', 'religar-trecho': 'cooperacao' },
  'colega-de-turno': { 'ajuda-aqui': 'imediata', 'par-distante': 'cooperacao', 'trocar-carrinho': 'economia' },

  'enceradeira-disponivel': { 'usar-aqui': 'imediata', 'estacionar-fundo': 'futuro', 'entregar-colega': 'cooperacao' },
  'evento-cancelado': { 'limpar-agora': 'imediata', 'liberar-fechada': 'desvio', 'guardar-material': 'economia' },
  'sem-torneira-na-sala': { 'balde-grande': 'concluir', 'agua-da-frente': 'imediata', 'parte-seca': 'adiar' },
  'sala-de-prova': { silencio: 'concluir', 'fim-da-prova': 'adiar', 'troca-folhas': 'imediata' },
  'mural-do-semestre': { 'desmontar-tudo': 'concluir', 'descer-volume': 'desvio', 'forrar-escada': 'futuro' },
  'ar-condicionado-pingando': { 'esvaziar-bandeja': 'concluir', bacia: 'adiar', disjuntor: 'bloqueio' },

  'banheiro-reformado': { aproveitar: 'imediata', 'lavadora-escada': 'futuro', 'lavadora-aqui': 'economia' },

  'entrega-de-material': { 'pegar-passagem': 'imediata', 'deixar-fundo': 'futuro', 'parar-estocar': 'economia' },
  'carrinho-desorganizado': { organizar: 'futuro', 'pano-de-reserva': 'imediata', 'frascos-abertos': 'economia' },
  'visita-da-direcao': { prometer: 'futuro', 'mostrar-servico': 'concluir', 'pedir-ajuda': 'cooperacao' },
  'pedido-da-coordenacao': { 'largar-e-ir': 'desvio', 'negociar-prazo': 'concluir', recusar: 'imediata' },
};

/**
 * Estratégia de uma ação. Cai em `imediata` quando não há entrada — a carta
 * ainda desenha e o jogo continua. Quem cobra a tabela completa é o teste, não
 * a tela: faltar cor é problema de revisão, não motivo para derrubar a partida.
 */
export function estrategiaDaAcao(situationId: string, actionId: string): Estrategia {
  return ESTRATEGIAS_POR_SITUACAO[situationId]?.[actionId] ?? 'imediata';
}
