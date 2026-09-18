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
  'sala-suja': { completa: 'concluir', rapida: 'imediata', adiar: 'adiar' },
  'material-acabando': { 'ir-deposito': 'desvio', economizar: 'economia', raspar: 'concluir' },
  'sala-em-uso': { priorizar: 'concluir', parcial: 'adiar', seguir: 'bloqueio' },
  'lixeiras-cheias': { 'levar-deposito': 'desvio', acumular: 'imediata', deixar: 'adiar' },
  'sala-trancada': { 'buscar-chave': 'desvio', 'pedir-chave': 'cooperacao', pular: 'bloqueio' },
  'equipamento-quebrado': { trocar: 'desvio', improvisar: 'concluir', 'meia-limpeza': 'adiar' },

  'cadeiras-em-circulo': { reorganizar: 'concluir', contornar: 'imediata', 'esperar-desmontar': 'bloqueio' },
  'janela-aberta': { 'secar-tudo': 'concluir', 'secar-essencial': 'adiar', arejar: 'bloqueio' },
  'sala-organizada': { 'fechar-rapido': 'imediata', caprichar: 'futuro', 'poupar-material': 'economia' },
  'turma-ajuda': { 'ajudar-aqui': 'cooperacao', 'buscar-material': 'economia', 'adiantar-proximas': 'futuro' },

  'vaso-entupido': { desentupir: 'concluir', 'isolar-cabine': 'adiar', 'chamar-manutencao': 'bloqueio' },
  'piso-encharcado': { 'secar-completo': 'concluir', 'rodo-rapido': 'adiar', 'fechar-secar': 'bloqueio' },
  'sem-reposicao': { 'repor-do-carrinho': 'imediata', 'ir-buscar': 'desvio', anotar: 'adiar' },
  'turno-da-manha': { conferir: 'imediata', 'recolher-sobra': 'economia', 'seguir-embalado': 'futuro' },
  'carrinho-da-manutencao': { 'usar-deles': 'economia', 'levar-sobra': 'futuro', 'combinar-apoio': 'cooperacao' },

  'escada-enlameada': { 'lavar-degraus': 'concluir', 'raspar-barro': 'adiar', 'sinalizar-secar': 'bloqueio' },
  'poeira-de-obra': { 'varrer-e-pano': 'concluir', 'so-varrer': 'economia', 'esperar-obra': 'adiar' },
  'fluxo-de-alunos': { interditar: 'concluir', 'entre-intervalos': 'imediata', 'voltar-depois': 'adiar' },
  'escada-ja-varrida': { 'so-pano': 'imediata', encerar: 'futuro', 'sem-material': 'economia' },

  'falta-de-agua': { racionar: 'concluir', 'limpeza-seca': 'adiar', 'esperar-agua': 'bloqueio' },
  'colega-de-turno': { 'ajuda-aqui': 'cooperacao', 'repor-carrinho': 'economia', 'adiantar-rota': 'futuro' },

  'enceradeira-disponivel': { 'usar-aqui': 'imediata', reservar: 'futuro', 'passar-colega': 'cooperacao' },
  'evento-cancelado': { 'limpar-agora': 'imediata', adiantar: 'futuro', 'assumir-o-que-ficou': 'economia' },
  'sem-torneira-na-sala': { 'duas-viagens': 'concluir', 'balde-grande': 'imediata', 'parte-seca': 'adiar' },
  'sala-de-prova': { contornar: 'imediata', 'mover-recolocar': 'concluir', corredores: 'adiar' },
  'mural-do-semestre': { 'desmontar-tudo': 'concluir', ensacar: 'imediata', 'descer-volume': 'desvio' },
  'ar-condicionado-pingando': { 'secar-desligar': 'concluir', bacia: 'adiar', sinalizar: 'bloqueio' },

  'banheiro-reformado': { aproveitar: 'imediata', 'a-fundo': 'futuro', 'sem-produto': 'economia' },

  'entrega-de-material': { 'parar-estocar': 'economia', 'pegar-passagem': 'imediata', 'deixar-colega': 'futuro' },
  'carrinho-desorganizado': { organizar: 'futuro', 'sem-repor': 'economia', 'pano-de-reserva': 'imediata' },
  'visita-da-direcao': { caprichar: 'futuro', 'fechar-antes': 'imediata', 'avisar-ala': 'cooperacao' },
  'pedido-da-coordenacao': { 'atender-agora': 'concluir', 'atender-no-fim': 'adiar', 'atender-em-outro': 'bloqueio' },
};

/**
 * Estratégia de uma ação. Cai em `imediata` quando não há entrada — a carta
 * ainda desenha e o jogo continua. Quem cobra a tabela completa é o teste, não
 * a tela: faltar cor é problema de revisão, não motivo para derrubar a partida.
 */
export function estrategiaDaAcao(situationId: string, actionId: string): Estrategia {
  return ESTRATEGIAS_POR_SITUACAO[situationId]?.[actionId] ?? 'imediata';
}
