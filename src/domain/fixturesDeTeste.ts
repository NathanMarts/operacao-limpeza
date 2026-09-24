import { gameConfig } from '../data/gameConfig';
import { situationsById } from '../data/situations';
import type { SituationDef, TimeExpr } from './types';

/**
 * Situações de laboratório, só para os testes.
 *
 * São as versões antigas de seis cartas do catálogo, no molde "resolver /
 * parcial / adiar". Os testes de regra (pendência, bloqueio, bônus, depósito)
 * precisam de uma carta previsível que exercite UMA mecânica sem o resto; o
 * catálogo real mudou na Fase 2 e não deve ser refém desses testes.
 *
 * Ficam em `situationsById`, para `chooseAction` achá-las, mas nunca em
 * `situations`: o sorteio não as enxerga, e as regras do catálogo não as cobram.
 */
const base: TimeExpr = { kind: 'base' };
const halfBase: TimeExpr = { kind: 'halfBase' };
const min = (value: number): TimeExpr => ({ kind: 'const', value });
const residual = (extra: number): TimeExpr => ({
  kind: 'sum',
  terms: [{ kind: 'diff', left: base, right: halfBase }, min(extra)],
});

export const fixturesDeTeste: SituationDef[] = [
  {
    id: 'teste-generica',
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
          { type: 'leavePending', residual: residual(2) },
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
    id: 'teste-sujeira',
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

  {
    id: 'teste-ocupada',
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
          { type: 'leavePending', residual: residual(1) },
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
    id: 'teste-embalo',
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
    id: 'teste-bonus-material',
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
    id: 'teste-deposito',
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
];

for (const fixture of fixturesDeTeste) situationsById[fixture.id] = fixture;
