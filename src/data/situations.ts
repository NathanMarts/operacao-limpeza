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
 * Invariante de projeto: para todo par de ações (X, Y) de uma mesma situação,
 * X é melhor que Y em ao menos uma moeda e pior em ao menos outra. As moedas
 * são: tempo agora, material, pendência (deslocamento futuro) e bloqueio
 * (liberdade de rota). Garantido pelo teste `situations.test.ts`.
 */
export const situations: SituationDef[] = [
  {
    id: 'sala-suja',
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
        description: 'Não gasta nada agora, mas a sujeira acumula e a sala fica mais demorada depois.',
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
        description: 'Não gasta nada agora, mas a sala fica ocupada e indisponível por um tempo.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: 25 },
        ],
      },
    ],
  },

  {
    id: 'lixeiras-cheias',
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
    title: 'Sala trancada',
    prompt:
      'A porta está trancada. A chave principal ficou na secretaria, na entrada do bloco, e a cópia está com alguém que está usando outro ambiente.',
    conditions: [{ type: 'roomKindIsNot', kind: 'wc' }, { type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'buscar-chave',
        label: 'Buscar a chave na entrada',
        description: 'Volta até a entrada. A sala continua intocada e você fica lá na ponta oeste.',
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
        description:
          'Alguém interrompe o que está fazendo e traz a cópia até você. A sala que essa pessoa estava usando fica ocupada mais tempo por causa da interrupção.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'blockRoom', target: 'nearestOther', minutes: 25 },
        ],
      },
      {
        id: 'pular',
        label: 'Pular esta sala',
        description: 'Não custa nada agora, mas a sala fica indisponível por um tempo.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'blockRoom', target: 'self', minutes: 25 },
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
        description: 'Vai buscar equipamento novo e aproveita para reabastecer. A sala fica para depois.',
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
];

export const situationsById: Record<string, SituationDef> = Object.fromEntries(
  situations.map((situation) => [situation.id, situation]),
);
