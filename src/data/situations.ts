import { gameConfig } from './gameConfig';
import type { SituationDef, TimeExpr } from '../domain/types';

const base: TimeExpr = { kind: 'base' };
const halfBase: TimeExpr = { kind: 'halfBase' };
const min = (value: number): TimeExpr => ({ kind: 'const', value });

/** Residual padrão de uma limpeza parcial: o que sobrou, mais um agravo. */
const residual = (extra: number): TimeExpr => ({
  kind: 'sum',
  terms: [{ kind: 'diff', left: base, right: halfBase }, min(extra)],
});

/**
 * Catálogo de situações (decisão Q13).
 *
 * Restrição espacial: cada ambiente tem UMA porta, que dá para o corredor.
 * Nenhuma ação pode supor passagem entre salas, sacada, porta dos fundos ou
 * qualquer rota que a planta não tenha — isso quebraria a regra do jogo, que é
 * justamente o corredor único.
 *
 * Escopo: `appliesTo` limita a situação aos tipos de ambiente em que ela faz
 * sentido. Sem `appliesTo`, vale para qualquer ambiente limpável. Uma sala de
 * aula, um banheiro e uma escada têm problemas diferentes.
 *
 * Invariante de projeto: para todo par de ações (X, Y) de uma mesma situação,
 * X é melhor que Y em ao menos uma moeda e pior em ao menos outra. As moedas
 * são: tempo agora, material, pendência (deslocamento futuro) e bloqueio
 * (liberdade de rota). Garantido pelo teste `situations.test.ts`.
 */
export const situations: SituationDef[] = [
  {
    id: 'sala-suja',
    appliesTo: ['sala'],
    title: 'Sala muito suja',
    prompt:
      'O ambiente está bem mais sujo do que o previsto na escala. Você precisa decidir como lidar com isso agora.',
    conditions: [],
    actions: [
      {
        id: 'completa',
        label: 'Limpeza completa',
        description: 'Faz o serviço inteiro agora e fecha a sala de uma vez.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'rapida',
        label: 'Limpeza rápida',
        description: 'Passa o essencial, gasta menos material e deixa o resto pendente.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'const', value: 1 } },
          { type: 'leavePending', residual: residual(2) },
        ],
      },
      {
        id: 'adiar',
        label: 'Adiar a sala',
        description: 'A sujeira acumula e a sala fica mais demorada depois.',
        requires: [],
        effects: [
          { type: 'addDirt', minutes: 3 },
          { type: 'leaveUnstarted' },
        ],
      },
    ],
  },

  {
    id: 'material-acabando',
    competesWithScoped: true,
    title: 'Material acabando',
    prompt:
      'O carrinho está quase vazio. O que sobra não dá para manter o ritmo até o fim da ala.',
    conditions: [{ type: 'chargesAtMost', value: 3 }],
    actions: [
      {
        id: 'ir-deposito',
        label: 'Interromper e ir ao depósito',
        description: 'Larga a sala como está e reabastece o carrinho até o teto.',
        requires: [],
        effects: [
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(4) },
          { type: 'refill' },
          { type: 'leaveUnstarted' },
        ],
      },
      {
        id: 'economizar',
        label: 'Economizar material',
        description: 'Limpa no braço, sem gastar carga nenhuma — mas demora bem mais.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(4) },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'raspar',
        label: 'Raspar a reserva',
        description: 'Usa tudo o que resta e fecha a sala no tempo normal. O carrinho zera.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'setCharges', value: 0 },
          { type: 'completeRoom' },
        ],
      },
    ],
  },

  {
    id: 'sala-em-uso',
    appliesTo: ['sala'],
    title: 'Sala será usada em breve',
    prompt:
      'Uma turma ocupa esta sala daqui a pouco. Dá para adiantar o serviço, fazer o mínimo ou sair da frente.',
    conditions: [],
    actions: [
      {
        id: 'priorizar',
        label: 'Priorizar e concluir',
        description: 'Fecha a sala antes da turma chegar, trabalhando sob pressão.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'parcial',
        label: 'Limpeza parcial',
        description: 'Faz o urgente e volta depois para terminar.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'const', value: 1 } },
          { type: 'leavePending', residual: residual(2) },
        ],
      },
      {
        id: 'seguir',
        label: 'Adiar e seguir a rota',
        description: 'A sala fica ocupada e indisponível por um tempo.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'lixeiras-cheias',
    appliesTo: ['sala', 'wc'],
    title: 'Lixeiras cheias',
    prompt: 'As lixeiras transbordaram. A limpeza em si é normal; o problema é o que fazer com o lixo.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'levar-deposito',
        label: 'Levar ao depósito agora',
        description: 'Fecha a sala e desce o lixo. Já que vai até lá, reabastece de graça.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(3) },
          { type: 'refill' },
        ],
      },
      {
        id: 'acumular',
        label: 'Acumular no carrinho',
        description: 'Fecha a sala sem desvio nenhum, gastando sacos a mais.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'deixar',
        label: 'Deixar o lixo para depois',
        description: 'A sala fica limpa, mas o lixo continua aí e exige uma volta rápida.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(3) },
        ],
      },
    ],
  },

  {
    id: 'sala-trancada',
    appliesTo: ['sala'],
    title: 'Sala trancada',
    prompt:
      'A porta está trancada. A chave principal ficou na secretaria, na entrada do bloco, e a cópia está com alguém que está usando outro ambiente.',
    conditions: [{ type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'buscar-chave',
        label: 'Buscar a chave na entrada',
        description: 'Volta até a entrada. A sala fica intocada e você, na ponta oeste.',
        requires: [],
        effects: [
          { type: 'moveTo', target: 'entrada' },
          { type: 'eventTime', amount: min(2) },
          { type: 'leaveUnstarted' },
        ],
      },
      {
        id: 'pedir-chave',
        label: 'Pedir a chave pelo rádio',
        description: 'Trazem a cópia até você. A sala de quem parou fica ocupada mais tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'blockRoom', target: 'nearestOther', minutes: gameConfig.blockDurationMinutes },
        ],
      },
      {
        id: 'pular',
        label: 'Pular esta sala',
        description: 'Não custa nada agora, mas a sala fica indisponível por um tempo.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'equipamento-quebrado',
    title: 'Equipamento quebrado',
    prompt: 'O rodo se partiu no meio do serviço. Dá para trocar, improvisar ou fazer só o essencial.',
    conditions: [],
    actions: [
      {
        id: 'trocar',
        label: 'Trocar no depósito',
        description: 'Busca equipamento novo e reabastece. A sala fica para depois.',
        requires: [],
        effects: [
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(4) },
          { type: 'refill' },
          { type: 'leaveUnstarted' },
        ],
      },
      {
        id: 'improvisar',
        label: 'Improvisar',
        description: 'Termina a sala com o que tem em mãos, gastando bem mais tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(5) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'meia-limpeza',
        label: 'Meia limpeza',
        description: 'Faz o que dá sem o equipamento. Sobra bastante coisa para a volta.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'const', value: 1 } },
          { type: 'leavePending', residual: residual(4) },
        ],
      },
    ],
  },
  /* ================================================================ */
  /* SALAS DE AULA                                                     */
  /* ================================================================ */

  {
    id: 'cadeiras-em-circulo',
    appliesTo: ['sala'],
    title: 'Sala usada em evento',
    prompt:
      'Teve dinâmica aqui: as cadeiras ficaram todas em círculo, no meio da sala, e o chão embaixo delas nem foi tocado.',
    conditions: [{ type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'reorganizar',
        label: 'Reorganizar e limpar',
        description: 'Recoloca as cadeiras em fileira e limpa a sala inteira.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(4) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'contornar',
        label: 'Limpar sem mexer nas cadeiras',
        description: 'Passa por baixo e em volta. Rende no tempo, mas gasta mais produto.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'esperar-desmontar',
        label: 'Pedir para desmontarem',
        description: 'Não custa nada agora, mas a sala fica ocupada até desfazerem o círculo.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'janela-aberta',
    appliesTo: ['sala'],
    title: 'Janela esquecida aberta',
    prompt:
      'Alguém saiu e deixou a janela aberta. Choveu de madrugada e entrou água: o piso perto da janela está encharcado.',
    conditions: [{ type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'secar-tudo',
        label: 'Secar e limpar tudo',
        description: 'Enxuga a água, seca o piso e conclui a sala.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(5) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'secar-essencial',
        label: 'Enxugar o essencial',
        description: 'Tira o excesso e fecha a janela. O resto seca sozinho.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(4) },
        ],
      },
      {
        id: 'arejar',
        label: 'Deixar arejar',
        description: 'Abre tudo e volta depois. Não custa nada agora, mas a sala fica secando.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'sala-organizada',
    appliesTo: ['sala'],
    title: 'Turma deixou a sala organizada',
    prompt:
      'A turma apagou o quadro, subiu as cadeiras e recolheu o lixo antes de sair. Metade do serviço já está feito — resta decidir o que fazer com o tempo que sobra.',
    conditions: [],
    actions: [
      {
        id: 'fechar-rapido',
        label: 'Aproveitar e fechar rápido',
        description: 'Passa o essencial e segue. O menor tempo possível aqui.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'caprichar',
        label: 'Caprichar e pegar embalo',
        description: 'Faz o serviço completo com calma e sai daqui no ritmo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Ritmo embalado', amount: 2, rooms: 2 },
        ],
      },
      {
        id: 'poupar-material',
        label: 'Fechar sem gastar material',
        description: 'Como está limpa, dá para fazer no braço e poupar o carrinho.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'completeRoom' },
        ],
      },
    ],
  },

  {
    id: 'turma-ajuda',
    appliesTo: ['sala'],
    title: 'Alunos se oferecem para ajudar',
    prompt:
      'Um grupo de alunos ficou na sala e se ofereceu para dar uma mão. Dá para usar essa ajuda de três formas diferentes.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'ajudar-aqui',
        label: 'Aceitar ajuda na limpeza',
        description: 'Com mais mãos, a sala sai pela metade do tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'buscar-material',
        label: 'Pedir que tragam material',
        description: 'Eles descem ao depósito por você e o carrinho enche.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'gainCharges', amount: 3 },
        ],
      },
      {
        id: 'adiantar-proximas',
        label: 'Pedir que adiantem as próximas',
        description: 'Eles vão subindo cadeiras nas salas seguintes enquanto você trabalha.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Cadeiras já subidas', amount: 2, rooms: 3 },
        ],
      },
    ],
  },

  /* ================================================================ */
  /* BANHEIROS                                                         */
  /* ================================================================ */

  {
    id: 'vaso-entupido',
    appliesTo: ['wc'],
    title: 'Vaso entupido',
    prompt:
      'Uma das cabines está entupida e já começou a transbordar no piso. Não dá para fingir que não viu.',
    conditions: [{ type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'desentupir',
        label: 'Desentupir agora',
        description: 'Resolve o entupimento e limpa tudo. Caro em tempo, mas fecha o banheiro.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(6) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'isolar-cabine',
        label: 'Isolar a cabine e limpar o resto',
        description: 'Fecha só aquela cabine e faz o restante. Sobra serviço pesado.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(6) },
        ],
      },
      {
        id: 'chamar-manutencao',
        label: 'Chamar a manutenção',
        description: 'Nada custa agora, mas o banheiro fica interditado até eles passarem.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'piso-encharcado',
    appliesTo: ['wc'],
    title: 'Piso alagado',
    prompt:
      'A válvula de uma descarga vazou a noite toda. O piso está com um dedo de água e escorregadio.',
    conditions: [{ type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'secar-completo',
        label: 'Rodar a água e secar',
        description: 'Empurra tudo para o ralo, seca e higieniza. Serviço completo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(5) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'rodo-rapido',
        label: 'Passar o rodo e voltar',
        description: 'Tira a água grossa com pouco material. O piso ainda pede atenção.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'const', value: 1 } },
          { type: 'leavePending', residual: residual(3) },
        ],
      },
      {
        id: 'fechar-secar',
        label: 'Fechar para secar',
        description: 'Interdita e deixa escoar sozinho. Sai da rota por um tempo.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'sem-reposicao',
    appliesTo: ['wc'],
    title: 'Acabou papel e sabonete',
    prompt:
      'Os dispensers estão vazios. Limpar sem repor é deixar o serviço pela metade, e a reposição pesada fica no depósito.',
    conditions: [],
    actions: [
      {
        id: 'repor-do-carrinho',
        label: 'Repor do carrinho',
        description: 'Usa a reserva que você carrega. Resolve na hora, com mais material.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'ir-buscar',
        label: 'Ir buscar no depósito',
        description: 'Deixa o banheiro como está e desce para reabastecer o carrinho inteiro.',
        requires: [],
        effects: [
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(3) },
          { type: 'refill' },
          { type: 'leaveUnstarted' },
        ],
      },
      {
        id: 'anotar',
        label: 'Limpar e anotar para depois',
        description: 'Limpeza normal; a reposição fica para uma segunda passada.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(3) },
        ],
      },
    ],
  },

  {
    id: 'turno-da-manha',
    appliesTo: ['wc'],
    title: 'O turno da manhã já passou aqui',
    prompt:
      'O banheiro foi higienizado de manhã e está em ordem. Sobrou material no armário e sobra tempo na sua escala.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'conferir',
        label: 'Só conferir e fechar',
        description: 'Uma passada de confirmação e segue. O menor tempo possível aqui.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'const', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'recolher-sobra',
        label: 'Recolher o material que sobrou',
        description: 'Separa e carrega a sobra do armário. Demora mais, mas enche o carrinho.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'gainCharges', amount: 3 },
        ],
      },
      {
        id: 'seguir-embalado',
        label: 'Fechar e seguir embalado',
        description: 'Trabalho leve aqui deixa você adiantado nos próximos ambientes.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Turno adiantado', amount: 2, rooms: 2 },
        ],
      },
    ],
  },

  {
    id: 'carrinho-da-manutencao',
    appliesTo: ['wc'],
    title: 'Carrinho da manutenção esquecido',
    prompt:
      'A equipe de manutenção deixou um carrinho com material aqui dentro. Dá para usar, levar ou apenas combinar apoio.',
    conditions: [],
    actions: [
      {
        id: 'usar-deles',
        label: 'Usar o material deles',
        description: 'Limpa o banheiro sem gastar uma carga sua.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'levar-sobra',
        label: 'Levar o que sobrou',
        description: 'Carrega a sobra e economiza material nos próximos ambientes.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'material', label: 'Sobra da manutenção', amount: 1, rooms: 3 },
        ],
      },
      {
        id: 'combinar-apoio',
        label: 'Combinar apoio com eles',
        description: 'Eles passam antes de você nos próximos ambientes e adiantam o serviço.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Apoio da manutenção', amount: 1, rooms: 3 },
        ],
      },
    ],
  },

  /* ================================================================ */
  /* ESCADA                                                            */
  /* ================================================================ */

  {
    id: 'escada-enlameada',
    appliesTo: ['escada'],
    title: 'Escada enlameada',
    prompt:
      'Choveu forte e todo mundo subiu com o pé sujo. Os degraus estão molhados e com barro seco nas quinas.',
    /* Sem guarda de propósito: a escada é o último objetivo do fluxo, e exigir
       "outro objetivo bloqueável" tornava esta situação inalcançável — 1
       aparição em 60 partidas simuladas. Com bloqueio de 10 min, o risco de
       ociosidade que a guarda continha deixou de existir. */
    conditions: [],
    actions: [
      {
        id: 'lavar-degraus',
        label: 'Lavar degrau por degrau',
        description: 'Esfrega tudo e seca. O serviço mais caro, mas encerra a escada.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(6) },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'raspar-barro',
        label: 'Raspar o barro e passar pano',
        description: 'Tira o grosso agora. O barro das quinas fica para a volta.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(4) },
        ],
      },
      {
        id: 'sinalizar-secar',
        label: 'Sinalizar e esperar secar',
        description: 'Coloca a placa e volta quando secar. Barro seco sai bem mais fácil.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'poeira-de-obra',
    appliesTo: ['escada'],
    title: 'Poeira de obra',
    prompt:
      'A reforma do bloco vizinho levantou pó fino, e ele assentou em todos os degraus e no corrimão.',
    conditions: [],
    actions: [
      {
        id: 'varrer-e-pano',
        label: 'Varrer e passar pano úmido',
        description: 'Tira o pó de verdade, inclusive o do corrimão. Serviço completo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(4) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'so-varrer',
        label: 'Só varrer a seco',
        description: 'Rápido e sem gastar material, mas o pó fino continua lá.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'leavePending', residual: residual(3) },
        ],
      },
      {
        id: 'esperar-obra',
        label: 'Esperar a obra parar',
        description: 'Limpar agora é trabalho perdido. Mas o pó continua assentando.',
        requires: [],
        effects: [
          { type: 'addDirt', minutes: 4 },
          { type: 'leaveUnstarted' },
        ],
      },
    ],
  },

  {
    id: 'fluxo-de-alunos',
    appliesTo: ['escada'],
    title: 'Fluxo constante na escada',
    prompt:
      'É troca de aula e não para de subir e descer gente. Trabalhar no meio do fluxo rende menos e é arriscado.',
    conditions: [],
    actions: [
      {
        id: 'interditar',
        label: 'Interditar um lado e limpar',
        description: 'Fecha metade da escada e faz tudo, com o fluxo atrapalhando.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'entre-intervalos',
        label: 'Limpar entre os intervalos',
        description: 'Aproveita as brechas. Sai no tempo normal, sobra um trecho.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(3) },
        ],
      },
      {
        id: 'voltar-depois',
        label: 'Voltar no fim do turno',
        description: 'Sem custo agora, mas a escada só acumula sujeira com o fluxo.',
        requires: [],
        effects: [
          { type: 'addDirt', minutes: 3 },
          { type: 'leaveUnstarted' },
        ],
      },
    ],
  },

  {
    id: 'escada-ja-varrida',
    appliesTo: ['escada'],
    title: 'A portaria já passou a vassoura',
    prompt:
      'O pessoal da portaria varreu a escada mais cedo. Está bem melhor do que o esperado — resta decidir até onde ir.',
    conditions: [],
    actions: [
      {
        id: 'so-pano',
        label: 'Só passar pano e fechar',
        description: 'Aproveita o que já foi feito e encerra rápido.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'encerar',
        label: 'Aproveitar e encerar',
        description: 'Com a escada limpa dá para encerar. Caro agora, rende depois.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Escada encerada', amount: 2, rooms: 2 },
        ],
      },
      {
        id: 'sem-material',
        label: 'Fechar sem gastar material',
        description: 'Como já está varrida, dá para terminar no braço e poupar o carrinho.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'completeRoom' },
        ],
      },
    ],
  },
  /* ================================================================ */
  /* QUALQUER AMBIENTE                                                 */
  /* ================================================================ */

  {
    id: 'falta-de-agua',
    competesWithScoped: true,
    title: 'Falta de água no bloco',
    prompt:
      'Fecharam o registro para um reparo. Não sai água nas torneiras, e o que você tem é o que está no balde.',
    conditions: [],
    actions: [
      {
        id: 'racionar',
        label: 'Racionar a água do balde',
        description: 'Faz o serviço inteiro medindo cada litro. Rende menos por minuto.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'limpeza-seca',
        label: 'Limpar a seco e molhar depois',
        description: 'Varre e tira o pó. A parte úmida espera a água voltar.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'const', value: 1 } },
          { type: 'leavePending', residual: residual(3) },
        ],
      },
      {
        id: 'esperar-agua',
        label: 'Esperar a água voltar',
        description: 'O ambiente fica fora da rota até o reparo terminar.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },

  {
    id: 'colega-de-turno',
    title: 'Colega de turno passa por aqui',
    prompt:
      'Um colega da equipe terminou a ala dele mais cedo e passou para oferecer ajuda. Ele tem tempo para uma coisa só.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'ajuda-aqui',
        label: 'Ajudar aqui, agora',
        description: 'Dois trabalhando no mesmo ambiente: sai pela metade do tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'repor-carrinho',
        label: 'Pedir que reponha seu carrinho',
        description: 'Ele desce ao depósito por você. O ambiente leva o tempo normal.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'gainCharges', amount: 3 },
        ],
      },
      {
        id: 'adiantar-rota',
        label: 'Pedir que adiante sua rota',
        description: 'Ele prepara os próximos ambientes enquanto você trabalha aqui.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Rota adiantada', amount: 2, rooms: 2 },
        ],
      },
    ],
  },
  /* ================================================================ */
  /* SALAS DE AULA — segunda leva                                      */
  /* ================================================================ */

  {
    id: 'enceradeira-disponivel',
    appliesTo: ['sala'],
    title: 'Enceradeira livre hoje',
    prompt:
      'A enceradeira do bloco está sem fila hoje. Ela rende muito mais que o rodo, mas você decide onde gastar esse rendimento.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'usar-aqui',
        label: 'Usar a enceradeira aqui',
        description: 'Metade do tempo nesta sala, ao custo de mais produto.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'reservar',
        label: 'Usar e deixar reservada',
        description: 'Tempo normal aqui, e a máquina fica no seu nome para as próximas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Enceradeira reservada', amount: 2, rooms: 3 },
        ],
      },
      {
        id: 'passar-colega',
        label: 'Passar a máquina ao colega',
        description: 'Ele devolve o favor em material para os próximos ambientes.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'material', label: 'Favor devolvido', amount: 1, rooms: 2 },
        ],
      },
    ],
  },

  {
    id: 'evento-cancelado',
    appliesTo: ['sala'],
    title: 'Evento cancelado',
    prompt:
      'O evento que ocupava esta sala foi cancelado em cima da hora. Ela vagou antes do previsto e o material que estava montado para o evento ficou aqui.',
    /**
     * Sem pré-condição de bloqueio: exigi-la deixava esta carta em 0,02
     * aparição por partida, porque bloqueios são curtos e um jogador racional
     * evita criá-los. Cada ação tem UM eixo principal — tempo agora, tempo
     * futuro, material — e o desbloqueio é bônus por cima da terceira, nunca a
     * razão dela existir.
     */
    conditions: [],
    actions: [
      {
        id: 'limpar-agora',
        label: 'Limpar agora que vagou',
        description: 'Sala vazia e sem ninguém atrapalhando: sai pela metade do tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'adiantar',
        label: 'Adiantar e ganhar folga',
        description: 'Trabalha no tempo normal e sai daqui adiantado na escala.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Folga na escala', amount: 2, rooms: 2 },
        ],
      },
      {
        id: 'assumir-o-que-ficou',
        label: 'Usar o material do evento',
        description: 'Usa a sobra da montagem, sem abrir carga. Libera o que está travado.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'completeRoom' },
          { type: 'unblockRoom', target: 'nearestBlocked' },
        ],
      },
    ],
  },

  {
    id: 'sem-torneira-na-sala',
    appliesTo: ['sala'],
    title: 'Sala sem torneira',
    prompt:
      'Esta sala não tem ponto de água. Tudo que molha precisa vir do corredor, e o balde não dá para o serviço inteiro.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'duas-viagens',
        label: 'Buscar água duas vezes',
        description: 'Serviço completo, pagando em tempo as idas até o corredor.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'balde-grande',
        label: 'Encher o balde grande',
        description: 'Uma viagem só, com mais produto diluído. Paga em material.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'parte-seca',
        label: 'Fazer só a parte seca',
        description: 'Varre e tira o pó com a água que tem. Paga em pendência.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(2) },
        ],
      },
    ],
  },

  {
    id: 'sala-de-prova',
    appliesTo: ['sala'],
    title: 'Sala preparada para prova',
    prompt:
      'As carteiras foram alinhadas e numeradas para uma avaliação. Mexer nelas significa ter de recolocar tudo no lugar exato.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'contornar',
        label: 'Contornar as carteiras',
        description: 'Não desfaz o alinhamento, mas alcançar tudo exige mais produto.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'mover-recolocar',
        label: 'Mover e recolocar tudo',
        description: 'Limpeza sem obstáculo, pagando o tempo de remontar a numeração.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'corredores',
        label: 'Limpar só entre as fileiras',
        description: 'Passa nos corredores da sala e deixa o resto para depois da prova.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: residual(0) },
        ],
      },
    ],
  },

  {
    id: 'mural-do-semestre',
    appliesTo: ['sala'],
    title: 'Murais de fim de semestre',
    prompt:
      'As paredes estão cobertas de cartazes e trabalhos do semestre. Tudo isso precisa sair, e o volume não cabe na lixeira da sala.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'desmontar-tudo',
        label: 'Desmontar tudo agora',
        description: 'Tira cartaz por cartaz. Paga em tempo, e encerra a sala.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'ensacar',
        label: 'Ensacar e levar no carrinho',
        description: 'Rápido, mas os sacos grandes consomem material a mais.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'descer-volume',
        label: 'Descer o volume ao depósito',
        description: 'Fecha a sala e leva tudo de uma vez. Paga em deslocamento, e reabastece.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(2) },
          { type: 'refill' },
        ],
      },
    ],
  },

  {
    id: 'ar-condicionado-pingando',
    appliesTo: ['sala'],
    title: 'Ar-condicionado pingando',
    prompt:
      'O aparelho está com a bandeja transbordando e pinga no piso sem parar. Limpar em volta não resolve: ele continua molhando.',
    conditions: [],
    actions: [
      {
        id: 'secar-desligar',
        label: 'Esvaziar a bandeja e desligar',
        description: 'Ataca a causa, seca e fecha a sala. O serviço mais caro em tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(4) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'bacia',
        label: 'Pôr uma bacia embaixo',
        description: 'Contém o gotejamento e limpa o resto. Sobra o piso de baixo do aparelho.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(3) },
        ],
      },
      {
        id: 'sinalizar',
        label: 'Só sinalizar e seguir',
        description: 'A poça cresce e a sala fica pior para a próxima visita.',
        requires: [],
        effects: [
          { type: 'addDirt', minutes: 4 },
          { type: 'leaveUnstarted' },
        ],
      },
    ],
  },

  /* ================================================================ */
  /* BANHEIROS — segunda leva                                          */
  /* ================================================================ */

  {
    id: 'banheiro-reformado',
    appliesTo: ['wc'],
    title: 'Banheiro recém-reformado',
    prompt:
      'Este banheiro saiu da reforma: louça nova, rejunte inteiro e nada de incrustação. Limpa bem mais fácil do que o outro.',
    conditions: [],
    actions: [
      {
        id: 'aproveitar',
        label: 'Aproveitar e fechar',
        description: 'Superfície nova não exige esforço: metade do tempo.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'a-fundo',
        label: 'Higienizar a fundo',
        description: 'Deixa o rejunte protegido e você sai daqui rendendo mais.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Rejunte protegido', amount: 2, rooms: 2 },
        ],
      },
      {
        id: 'sem-produto',
        label: 'Fechar sem gastar produto',
        description: 'Como está novo, água e pano bastam. Demora mais, poupa o carrinho.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'completeRoom' },
        ],
      },
    ],
  },

  /* ================================================================ */
  /* SALA + BANHEIRO — contextuais, não fazem sentido na escada        */
  /* ================================================================ */

  {
    id: 'entrega-de-material',
    appliesTo: ['sala', 'wc'],
    title: 'Entrega de material no andar',
    prompt:
      'O fornecedor deixou as caixas do mês aqui no andar, fora do depósito. Está tudo à mão — basta decidir quanto disso você aproveita agora.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'parar-estocar',
        label: 'Parar e estocar tudo',
        description: 'Organiza as caixas antes de limpar e rende material por várias salas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'material', label: 'Caixas do mês', amount: 2, rooms: 2 },
        ],
      },
      {
        id: 'pegar-passagem',
        label: 'Pegar de passagem',
        description: 'Leva o que cabe no carrinho e segue no tempo normal.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'gainCharges', amount: 2 },
        ],
      },
      {
        id: 'deixar-colega',
        label: 'Deixar organizado para o colega',
        description: 'Ele assume a estocagem e adianta o seu serviço nas próximas salas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Estoque assumido', amount: 2, rooms: 2 },
        ],
      },
    ],
  },

  {
    id: 'carrinho-desorganizado',
    appliesTo: ['sala', 'wc'],
    title: 'Carrinho desorganizado',
    prompt:
      'O carrinho ficou uma bagunça desde o começo do turno. Achar cada produto custa uma busca — e abrir carga nova gasta o que você devia estar poupando.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'organizar',
        label: 'Organizar o carrinho agora',
        description: 'Perde tempo aqui e ganha ritmo nas próximas salas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Carrinho organizado', amount: 1, rooms: 3 },
        ],
      },
      {
        id: 'sem-repor',
        label: 'Improvisar com o que está à mão',
        description: 'Usa o que está solto no carrinho. Poupa material, mas é o mais lento.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'pano-de-reserva',
        label: 'Usar o pano de reserva',
        description: 'Pega o primeiro que achar e resolve rápido, gastando material a mais.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
    ],
  },

  {
    id: 'visita-da-direcao',
    appliesTo: ['sala'],
    title: 'Visita da direção hoje',
    prompt:
      'A direção vai passar pelo bloco no fim da tarde. O que estiver impecável conta; o que estiver só razoável passa batido.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'caprichar',
        label: 'Caprichar neste ambiente',
        description: 'Deixa este impecável e a direção libera apoio para o resto da sua rota.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(2) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'tempo', label: 'Apoio da direção', amount: 2, rooms: 2 },
        ],
      },
      {
        id: 'fechar-antes',
        label: 'Fechar antes que cheguem',
        description: 'Prioriza velocidade: resolve pela metade do tempo e segue.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'avisar-ala',
        label: 'Avisar o colega da outra ala',
        description: 'Ele se prepara e divide o material extra que a direção liberou.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'grantBuff', kind: 'material', label: 'Material liberado', amount: 1, rooms: 2 },
        ],
      },
    ],
  },

  {
    id: 'pedido-da-coordenacao',
    title: 'Pedido da coordenação',
    prompt:
      'A coordenação pediu um serviço extra pequeno, fora da sua escala. Não tem como recusar — tem como escolher quando e onde pagar por ele.',
    conditions: [
      { type: 'chargesAtLeastRoomCost' },
      { type: 'hasOtherBlockableObjective' },
    ],
    actions: [
      {
        id: 'atender-agora',
        label: 'Atender agora',
        description: 'Resolve o pedido junto com a limpeza. Paga em tempo, aqui.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'atender-no-fim',
        label: 'Atender no fim do turno',
        description: 'Limpa normal e deixa o pedido pendente. Paga em uma volta até aqui.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: min(3) },
        ],
      },
      {
        id: 'atender-em-outro',
        label: 'Atender em outro ambiente',
        description: 'Fecha esta sala e resolve o pedido em outra, que fica ocupada.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'blockRoom', target: 'nearestOther', minutes: gameConfig.blockDurationMinutes },
        ],
      },
    ],
  },
];

export const situationsById: Record<string, SituationDef> = Object.fromEntries(
  situations.map((situation) => [situation.id, situation]),
);
