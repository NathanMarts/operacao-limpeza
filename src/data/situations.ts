import { gameConfig } from './gameConfig';
import type { ChargeExpr, Effect, RegionTarget, Requirement, SituationDef, TimeExpr } from '../domain/types';

const base: TimeExpr = { kind: 'base' };
const halfBase: TimeExpr = { kind: 'halfBase' };
const min = (value: number): TimeExpr => ({ kind: 'const', value });

const baseMais = (value: number): TimeExpr => ({ kind: 'sum', terms: [base, min(value)] });
const baseMenos = (value: number): TimeExpr => ({ kind: 'diff', left: base, right: min(value) });
/** Espera pela distância real até um ponto do mapa (5 m por minuto). */
const distancia = (to: Extract<TimeExpr, { kind: 'distance' }>['to'], factor = 1): TimeExpr => ({
  kind: 'distance',
  to,
  factor,
});

const R: ChargeExpr = { kind: 'roomCost' };
const Rmais = (value: number): ChargeExpr => ({ kind: 'roomCostPlus', value });
const cargas = (value: number): ChargeExpr => ({ kind: 'const', value });
const precisa = (amount: ChargeExpr): Requirement => ({ type: 'minCharges', amount });

/** Limpar e fechar: o miolo de quase toda ação que conclui a sala. */
const conclui = (tempo: TimeExpr, gasto: ChargeExpr): Effect[] => [
  { type: 'cleanTime', amount: tempo },
  { type: 'spendCharges', amount: gasto },
  { type: 'completeRoom' },
];

/* Endereços fixos do mapa, usados por mais de uma carta. */
const FUNDO: RegionTarget = { kind: 'salas', ids: ['S1', 'S7', 'S2', 'S8'] };
const PATAMAR: RegionTarget = { kind: 'salas', ids: ['S1', 'S7'] };
const ESCADA: RegionTarget = { kind: 'salas', ids: ['ESC'] };

/** O corte de água do bloco: vale para as salas de aula, não para os banheiros. */
const SEM_AGUA: Effect = {
  type: 'modifyRooms',
  target: { kind: 'tipo', tipo: 'sala' },
  minutes: 2,
  label: 'Sem água',
  durationMinutes: 20,
};


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
  /* 1. Fase 1 */
  {
    id: 'sala-suja',
    appliesTo: ['sala'],
    title: 'Sala muito suja',
    prompt:
      'O ambiente está bem mais sujo do que o previsto. A sujeira pode sair com você, ir para as salas vizinhas ou esperar a equipe da noite.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'forca-tarefa',
        label: 'Força-tarefa',
        description: 'Faz tudo agora, com produto extra, e fecha a sala.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'varrer-corredor',
        label: 'Varrer para o corredor',
        description: 'Fecha rápido e empurra a sujeira para as salas ao lado.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'modifyRooms', target: { kind: 'raio', meters: 10 }, minutes: 2, label: 'Sujeira espalhada' },
        ],
      },
      {
        id: 'equipe-noite',
        label: 'Chamar a equipe da noite',
        description: 'Separa o material para a equipe pesada; a sala fica pronta bem depois.',
        requires: [{ type: 'minCharges', amount: { kind: 'const', value: 3 } }],
        effects: [
          { type: 'eventTime', amount: min(3) },
          { type: 'spendCharges', amount: { kind: 'const', value: 3 } },
          { type: 'delegate', target: 'self', minutes: 60, label: 'Equipe da noite' },
        ],
      },
    ],
  },

  /* 2. Fase 1 */
  {
    id: 'material-acabando',
    competesWithScoped: true,
    title: 'Material acabando',
    prompt:
      'O carrinho está quase vazio. Quanto mais longe do material você está (o depósito ou uma caixa deixada no corredor), mais caro fica resolver isso.',
    conditions: [
      { type: 'chargesAtMost', value: 3 },
      { type: 'distanceFromDepotAtLeast', meters: 15 },
    ],
    actions: [
      {
        id: 'radio',
        label: 'Pedir reposição pelo rádio',
        description: 'Um colega traz 4 cargas do ponto de material mais próximo.',
        requires: [],
        effects: [
          { type: 'eventTime', amount: { kind: 'sum', terms: [{ kind: 'distance', to: 'suprimento', factor: 1 }, min(1)] } },
          { type: 'fetchSupply', amount: 4 },
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'raspar',
        label: 'Raspar o fundo',
        description: 'Usa tudo o que sobrou aqui. A próxima parada terá de ser o depósito.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'setCharges', value: 0 },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'so-agua',
        label: 'Limpar só com água',
        description: 'Não gasta produto, mas leva bem mais tempo.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(4) },
          { type: 'completeRoom' },
        ],
      },
    ],
  },

  /* 3. Fase 2 */
  {
    id: 'sala-em-uso',
    appliesTo: ['sala'],
    title: 'Sala será usada em breve',
    prompt:
      'Uma turma precisa de uma sala deste par daqui a pouco, por 25 min. O professor aceita esta ou a da frente.',
    conditions: [],
    actions: [
      {
        id: 'correr',
        label: 'Correr antes da turma',
        description: 'Limpa sob pressão e entrega esta sala pronta. Nada fecha.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(2), R)],
      },
      {
        id: 'turma-na-frente',
        label: 'Mandar a turma para a sala da frente',
        description: 'Limpa com calma aqui; a sala da frente fica ocupada 25 min.',
        requires: [precisa(R)],
        effects: [...conclui(base, R), { type: 'blockRooms', target: { kind: 'frente' }, minutes: 25 }],
      },
      {
        id: 'ceder-esta',
        label: 'Ceder esta sala e seguir',
        description: 'A turma fica aqui; a sala vazia mais próxima rende mais por 10 min.',
        requires: [],
        effects: [
          { type: 'leavePending', residual: baseMais(2) },
          { type: 'blockRoom', target: 'self', minutes: 25 },
          {
            type: 'modifyRooms',
            target: { kind: 'maisProximaOutraEstacao' },
            minutes: -3,
            label: 'Sala desocupada',
            durationMinutes: 10,
          },
        ],
      },
    ],
  },

  /* 4. Fase 2 */
  {
    id: 'lixeiras-cheias',
    appliesTo: ['sala', 'wc'],
    title: 'Lixeiras cheias',
    prompt: 'As lixeiras transbordaram. A limpeza em si é normal; o lixo precisa sair daqui de algum jeito.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'levar-deposito',
        label: 'Levar ao depósito e recarregar',
        description: 'Fecha a sala e desce com os sacos. Lá, enche o carrinho.',
        requires: [precisa(R), { type: 'depositoAcessivel' }],
        effects: [
          ...conclui(base, R),
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(2) },
          { type: 'refill' },
        ],
      },
      {
        id: 'acumular',
        label: 'Compactar no carrinho',
        description: 'Fecha a sala sem desvio, levando os sacos: uma carga a mais.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(base, Rmais(1))],
      },
      {
        id: 'coleta-radio',
        label: 'Chamar a coleta pelo rádio',
        description: 'Alguém vem do depósito buscar o lixo: a espera depende da distância.',
        requires: [precisa(R)],
        effects: [
          { type: 'eventTime', amount: distancia('deposito') },
          ...conclui(base, R),
        ],
      },
    ],
  },

  /* 5. Fase 1 */
  {
    id: 'sala-trancada',
    appliesTo: ['sala'],
    title: 'Sala trancada',
    prompt:
      'A porta está trancada. A chave principal ficou na portaria, na entrada do bloco, e a cópia está com alguém que está usando outro ambiente.',
    conditions: [{ type: 'hasOtherBlockableObjective' }],
    actions: [
      {
        id: 'buscar-chave',
        label: 'Buscar a chave na entrada',
        description: 'Vai até a portaria; na volta a sala está aberta e é só limpar.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'moveTo', target: 'entrada' },
          { type: 'eventTime', amount: min(1) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'leavePending', residual: base },
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
        id: 'deixar-trancada',
        label: 'Deixar para depois',
        description: 'Segue a rota. A sala continua trancada esperando você.',
        requires: [],
        effects: [{ type: 'leaveUnstarted' }],
      },
    ],
  },

  /* 6. Fase 2 */
  {
    id: 'equipamento-quebrado',
    appliesTo: ['sala', 'wc', 'escada'],
    title: 'Equipamento quebrado',
    prompt:
      'O rodo quebrou no meio do serviço. Dá para buscar outro, terminar na mão ou arriscar um remendo. Quanto mais longe do depósito, mais cara fica uma volta.',
    conditions: [],
    actions: [
      {
        id: 'trocar',
        label: 'Buscar outro no depósito',
        description: 'Vai trocar o rodo e recarrega. Esta sala espera a sua volta.',
        requires: [{ type: 'depositoAcessivel' }],
        effects: [
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(2) },
          { type: 'refill' },
          { type: 'leavePending', residual: base },
        ],
      },
      {
        id: 'improvisar',
        label: 'Improvisar à mão',
        description: 'Termina com pano e balde: demora mais, mas é certo.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(baseMais(3), Rmais(1))],
      },
      {
        id: 'remendo',
        label: 'Seguir com o remendo',
        description: 'Prende com fita e segue. 1 em 3: solta, e sobra uma volta de 4 min.',
        requires: [precisa(R)],
        effects: [
          ...conclui(base, R),
          {
            type: 'aposta',
            umEm: 3,
            label: 'o remendo solta e a sala pede uma volta de 4 min',
            seFalhar: [{ type: 'leavePending', residual: min(4) }],
          },
        ],
      },
    ],
  },

  /* 7. Fase 2 */
  {
    id: 'cadeiras-em-circulo',
    appliesTo: ['sala'],
    title: 'Sala usada em evento',
    prompt:
      'Teve evento aqui: as cadeiras ficaram em círculo no meio da sala. Elas precisam ir para algum lugar antes da limpeza.',
    conditions: [],
    actions: [
      {
        id: 'reorganizar',
        label: 'Reorganizar sozinho',
        description: 'Recoloca as cadeiras em fileira e limpa a sala inteira.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(4), R)],
      },
      {
        id: 'empilhar-frente',
        label: 'Empilhar na sala da frente',
        description: 'Leva as cadeiras para o outro lado: a frente fica fechada 15 min.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(1), R), { type: 'blockRooms', target: { kind: 'frente' }, minutes: 15 }],
      },
      {
        id: 'equipe-desmonta',
        label: 'Chamar a equipe do evento',
        description: 'Desmontam: −1 min aqui e −2 na frente; as duas fecham 12 min.',
        requires: [],
        effects: [
          { type: 'leavePending', residual: baseMenos(1) },
          { type: 'blockRoom', target: 'self', minutes: 12 },
          { type: 'modifyRooms', target: { kind: 'frente' }, minutes: -2, label: 'Par desmontado' },
          { type: 'blockRooms', target: { kind: 'frente' }, minutes: 12 },
        ],
      },
    ],
  },

  /* 8. Fase 2 */
  {
    id: 'janela-aberta',
    appliesTo: ['sala'],
    title: 'Janela esquecida aberta',
    prompt:
      'Choveu dentro da sala. O piso está molhado, mas seca sozinho se você der tempo. A torneira mais perto fica nos banheiros, na base.',
    conditions: [],
    actions: [
      {
        id: 'secar-tudo',
        label: 'Secar tudo com panos extras',
        description: 'Resolve de uma vez, gastando uma carga a mais.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(baseMais(3), Rmais(1))],
      },
      {
        id: 'fechar-secando',
        label: 'Fechar a janela e deixar secar',
        description: 'Faz metade agora. A sala seca fechada 12 min; depois, faltam 3 min.',
        requires: [precisa(R)],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: R },
          { type: 'leavePending', residual: min(3) },
          { type: 'blockRoom', target: 'self', minutes: 12 },
        ],
      },
      {
        id: 'balde-banheiro',
        label: 'Levar a água até o banheiro',
        description: 'Recolhe a água no balde e esvazia no banheiro, lá na base.',
        requires: [precisa(R)],
        effects: [{ type: 'eventTime', amount: distancia('banheiro') }, ...conclui(base, R)],
      },
    ],
  },

  /* 9. Fase 2 */
  {
    id: 'sala-organizada',
    appliesTo: ['sala'],
    title: 'Turma deixou a sala organizada',
    prompt:
      'A turma deixou tudo arrumado. A próxima aula aqui começa no próximo sinal e termina no sinal seguinte. O relógio decide quando a sala fica livre.',
    conditions: [],
    actions: [
      {
        id: 'fechar-agora',
        label: 'Fechar agora, antes da aula',
        description: 'A sala já está arrumada: metade do tempo, com o material normal.',
        requires: [precisa(R)],
        effects: [...conclui(halfBase, R)],
      },
      {
        id: 'voltar-depois',
        label: 'Voltar depois da aula',
        description: 'Sala ocupada até o 2º sinal; na volta, metade do tempo e sem material.',
        requires: [],
        effects: [
          { type: 'leavePending', residual: halfBase },
          { type: 'blockRoom', target: 'self', minutes: 0, ateSinal: 2 },
        ],
      },
      {
        id: 'material-turma',
        label: 'Deixar o material com a turma',
        description: 'A turma limpa no fim da aula, com o seu material (+1). Você não volta.',
        requires: [precisa(Rmais(1))],
        effects: [
          { type: 'eventTime', amount: min(1) },
          { type: 'spendCharges', amount: Rmais(1) },
          { type: 'delegate', target: 'self', minutes: 0, ateSinal: 2, label: 'A turma da próxima aula' },
        ],
      },
    ],
  },

  /* 10. Fase 1 */
  {
    id: 'turma-ajuda',
    appliesTo: ['sala'],
    title: 'Alunos se oferecem para ajudar',
    prompt:
      'A turma que está saindo quer ajudar. Eles podem dividir esta sala, adiantar as salas ao lado enquanto ainda estão no andar, ou contar o que está acontecendo por perto.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'ajudar-aqui',
        label: 'Aceitar ajuda aqui',
        description: 'Dividem a sala com o material deles: metade do tempo, sem gastar o seu.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'preparar-vizinhas',
        label: 'Pedir que preparem as salas ao lado',
        description: 'A turma adianta as vizinhas, mas só enquanto está no andar (12 min).',
        requires: [
          { type: 'minCharges', amount: { kind: 'roomCost' } },
          { type: 'regiaoComAlvo', target: { kind: 'raio', meters: 10 } },
        ],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          {
            type: 'modifyRooms',
            target: { kind: 'raio', meters: 10 },
            minutes: -2,
            label: 'Turma adiantou',
            durationMinutes: 12,
          },
        ],
      },
      {
        id: 'perguntar',
        label: 'Perguntar o que vem pela frente',
        description: 'Os alunos contam o que está acontecendo nas 2 salas mais próximas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'revealSituations', count: 2 },
        ],
      },
    ],
  },

  /* 11. Fase 2 */
  {
    id: 'vaso-entupido',
    appliesTo: ['wc'],
    title: 'Vaso entupido',
    prompt:
      'Uma das cabines entupiu. A manutenção atende no horário dela; o depósito fica aqui do lado.',
    conditions: [],
    actions: [
      {
        id: 'desentupir',
        label: 'Desentupir você mesmo',
        description: 'Resolve na hora. Caro em tempo, mas fecha o banheiro.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(4), R)],
      },
      {
        id: 'chamar-manutencao',
        label: 'Chamar a manutenção',
        description: 'Espera o rádio e separa o material: fica pronto em 50 min.',
        requires: [precisa(R)],
        effects: [
          { type: 'eventTime', amount: min(5) },
          { type: 'spendCharges', amount: R },
          { type: 'delegate', target: 'self', minutes: 50, label: 'A manutenção' },
        ],
      },
      {
        id: 'isolar-cabine',
        label: 'Interditar a cabine',
        description: 'Limpa o resto com 1 carga; a cabine espera a volta (1 min).',
        requires: [precisa(cargas(1))],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: cargas(1) },
          { type: 'leavePending', residual: min(1) },
        ],
      },
    ],
  },

  /* 12. Fase 2 */
  {
    id: 'piso-encharcado',
    appliesTo: ['wc'],
    title: 'Piso alagado',
    prompt:
      'A água escorre pelo piso e tem que ir para algum lugar: ficar nos banheiros ou descer pelo ralo do depósito.',
    conditions: [],
    actions: [
      {
        id: 'secar-completo',
        label: 'Secar tudo',
        description: 'Rodo, pano e balde: resolve aqui sem mexer na base.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(3), R)],
      },
      {
        id: 'fechar-banheiros',
        label: 'Rodo e fechar os banheiros',
        description: 'Os dois banheiros ficam fechados 15 min secando; depois, 1 min aqui.',
        requires: [precisa(R)],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: R },
          { type: 'leavePending', residual: min(1) },
          { type: 'blockRoom', target: 'self', minutes: 15 },
          { type: 'blockRooms', target: { kind: 'tipo', tipo: 'wc' }, minutes: 15 },
        ],
      },
      {
        id: 'ralo-deposito',
        label: 'Puxar a água para o ralo do depósito',
        description: 'Conclui aqui, mas o depósito fica fechado 20 min: sem recarga.',
        requires: [precisa(R)],
        effects: [...conclui(base, R), { type: 'blockDeposito', minutes: 20 }],
      },
    ],
  },

  /* 13. Fase 2 */
  {
    id: 'sem-reposicao',
    appliesTo: ['wc'],
    title: 'Acabou papel e sabonete',
    prompt:
      'Acabou a reposição. Dá para repor do carrinho, buscar numa caixa deixada no corredor ou usar a do outro banheiro.',
    conditions: [],
    actions: [
      {
        id: 'repor-do-carrinho',
        label: 'Repor do carrinho',
        description: 'Procura no carrinho (+1 min) e usa uma carga a mais que o normal.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(baseMais(1), Rmais(1))],
      },
      {
        id: 'buscar-caixa',
        label: 'Buscar na caixa do corredor',
        description: 'A caixa do corredor tem papel e sabonete: gasta 2 dela, não do carrinho.',
        requires: [precisa(R), { type: 'temEstoque' }],
        effects: [
          { type: 'eventTime', amount: distancia('estoque') },
          ...conclui(base, R),
          { type: 'fetchSupply', amount: 2, origem: 'estoque' },
        ],
      },
      {
        id: 'usar-da-frente',
        label: 'Usar a reposição do outro banheiro',
        description: 'Conclui com 1 carga; o banheiro da frente fica +2 min.',
        requires: [precisa(cargas(1))],
        effects: [
          ...conclui(base, cargas(1)),
          { type: 'modifyRooms', target: { kind: 'frente' }, minutes: 2, label: 'Sem reposição' },
        ],
      },
    ],
  },

  /* 14. Fase 2 */
  {
    id: 'turno-da-manha',
    appliesTo: ['wc'],
    title: 'O turno da manhã já passou aqui',
    prompt:
      'O turno anterior deixou material e um caderno de ocorrências sobre o bloco, inclusive sobre as salas do fundo.',
    conditions: [],
    actions: [
      {
        id: 'conferir',
        label: 'Só conferir',
        description: 'Confere e fecha: metade do tempo e só 1 carga.',
        requires: [precisa(cargas(1))],
        effects: [...conclui(halfBase, cargas(1))],
      },
      {
        id: 'ler-caderno',
        label: 'Ler o caderno de ocorrências',
        description: 'Revela o que espera em S1, S7, S2 e S8, as salas do fundo.',
        requires: [precisa(R), { type: 'regiaoComAlvo', target: FUNDO }],
        effects: [
          { type: 'eventTime', amount: min(2) },
          ...conclui(base, R),
          { type: 'revealSituations', count: 4, target: FUNDO },
        ],
      },
      {
        id: 'recolher-sobra',
        label: 'Recolher o material da manhã',
        description: '+3 cargas; o que não couber no carrinho fica aqui no chão.',
        requires: [precisa(R)],
        effects: [{ type: 'eventTime', amount: min(2) }, ...conclui(base, R), { type: 'gainCharges', amount: 3 }],
      },
    ],
  },

  /* 15. Fase 1 */
  {
    id: 'carrinho-da-manutencao',
    appliesTo: ['wc'],
    title: 'Carrinho da manutenção esquecido',
    prompt:
      'A manutenção deixou um carrinho abastecido aqui. Dá para usar, mandar para outro ponto do corredor ou negociar com a equipe.',
    conditions: [],
    actions: [
      {
        id: 'usar-deles',
        label: 'Usar o material deles',
        description: 'Limpa com o carrinho deles e poupa o seu.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'levar-meio',
        label: 'Pedir o carrinho no meio do corredor',
        description: 'A manutenção estaciona o carrinho em S4/S10, com 4 cargas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'eventTime', amount: min(2) },
          { type: 'completeRoom' },
          { type: 'placeStash', at: 'meio', charges: 4, label: 'Carrinho da manutenção' },
        ],
      },
      {
        id: 'outro-banheiro',
        label: 'Combinar o outro banheiro',
        description: 'A manutenção assume o banheiro da frente; ele fica pronto depois.',
        requires: [
          { type: 'minCharges', amount: { kind: 'roomCost' } },
          { type: 'regiaoComAlvo', target: { kind: 'frente' } },
        ],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'eventTime', amount: min(2) },
          { type: 'completeRoom' },
          { type: 'delegate', target: { kind: 'frente' }, minutes: 20, label: 'Manutenção' },
        ],
      },
    ],
  },

  /* 16. Fase 2 */
  {
    id: 'escada-enlameada',
    appliesTo: ['escada'],
    title: 'Escada enlameada',
    prompt:
      'Barro nos degraus. A escada é a ponta do corredor, a 63,5 m do depósito: de onde você veio muda o custo.',
    conditions: [],
    actions: [
      {
        id: 'lavar-degraus',
        label: 'Lavar degrau por degrau',
        description: 'Resolve tudo aqui, com uma carga a mais.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(baseMais(3), Rmais(1))],
      },
      {
        id: 'raspar-barro',
        label: 'Raspar e seguir',
        description: 'Tira o grosso (2 min a menos). O barro vai no sapato: S1 e S7 +3 min.',
        requires: [precisa(R)],
        effects: [
          ...conclui(baseMenos(2), R),
          { type: 'modifyRooms', target: PATAMAR, minutes: 3, label: 'Barro no sapato' },
        ],
      },
      {
        id: 'levar-barro',
        label: 'Levar o barro ao depósito',
        description: 'Ensaca, desce até o depósito e recarrega lá.',
        requires: [precisa(R), { type: 'depositoAcessivel' }],
        effects: [
          ...conclui(halfBase, R),
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(2) },
          { type: 'refill' },
        ],
      },
    ],
  },

  /* 17. Fase 2 */
  {
    id: 'poeira-de-obra',
    appliesTo: ['escada'],
    title: 'Poeira de obra',
    prompt:
      'A obra ao lado solta poeira. Fechando a porta corta-fogo, o corredor do fundo fica protegido por um tempo.',
    conditions: [],
    actions: [
      {
        id: 'varrer-e-pano',
        label: 'Varrer e passar pano',
        description: 'Limpa a escada completa.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(3), R)],
      },
      {
        id: 'so-varrer',
        label: 'Só varrer',
        description: 'Não gasta material aqui; a poeira volta e pede 3 min na volta.',
        requires: [],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'leavePending', residual: min(3) },
        ],
      },
      {
        id: 'porta-corta-fogo',
        label: 'Fechar a porta e fazer o fundo agora',
        description: 'S1, S7, S2 e S8 ficam 2 min mais rápidas por 20 min. A escada espera.',
        requires: [{ type: 'regiaoComAlvo', target: FUNDO }],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'modifyRooms', target: FUNDO, minutes: -2, label: 'Fundo protegido', durationMinutes: 20 },
        ],
      },
    ],
  },

  /* 18. Fase 1 */
  {
    id: 'fluxo-de-alunos',
    appliesTo: ['escada'],
    title: 'Fluxo constante na escada',
    prompt:
      'Alunos sobem e descem sem parar. Dá para desviar o movimento para o fundo do corredor, esperar o intervalo ou deixar a escada para o fim da rota.',
    conditions: [],
    actions: [
      {
        id: 'cavaletes',
        label: 'Pôr cavaletes e limpar',
        description: 'Controla o fluxo: os alunos passam por S1 e S7, que ficam fechadas.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'eventTime', amount: min(1) },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'blockRooms', target: { kind: 'raio', meters: 7 }, minutes: 12 },
        ],
      },
      {
        id: 'esperar-intervalo',
        label: 'Esperar o sinal do intervalo',
        description: 'No intervalo a escada esvazia: espera o sinal e limpa com calma.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'eventTime', amount: { kind: 'ateIntervalo', every: 20 } },
          { type: 'cleanTime', amount: { kind: 'diff', left: base, right: min(2) } },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'deixar-final',
        label: 'Deixar a escada para o final',
        description: 'Segue a rota. Mais tarde o movimento cai e a escada rende mais.',
        requires: [],
        effects: [
          { type: 'leaveUnstarted' },
          { type: 'modifyRooms', target: 'self', minutes: -2, label: 'Escada mais vazia' },
        ],
      },
    ],
  },

  /* 19. Fase 2 */
  {
    id: 'escada-ja-varrida',
    appliesTo: ['escada'],
    title: 'A portaria já passou a vassoura',
    prompt:
      'O porteiro varreu a escada e tem um carrinho de apoio. Aqui é o ponto mais longe do depósito.',
    conditions: [],
    actions: [
      {
        id: 'so-pano',
        label: 'Só o pano',
        description: 'A escada já está varrida: passa o pano e fecha, 2 min a menos.',
        requires: [precisa(R)],
        effects: [...conclui(baseMenos(2), R)],
      },
      {
        id: 'carrinho-apoio',
        label: 'Pedir o carrinho de apoio',
        description: 'O porteiro empresta 4 cargas; o que não couber fica aqui.',
        requires: [precisa(R)],
        effects: [{ type: 'eventTime', amount: min(3) }, ...conclui(base, R), { type: 'gainCharges', amount: 4 }],
      },
      {
        id: 'encerar',
        label: 'Encerar o patamar',
        description: 'Encera o acesso às salas do fundo: S1 e S7 ficam −2 min.',
        requires: [precisa(Rmais(1)), { type: 'regiaoComAlvo', target: PATAMAR }],
        effects: [
          ...conclui(baseMais(2), Rmais(1)),
          { type: 'modifyRooms', target: PATAMAR, minutes: -2, label: 'Patamar encerado' },
        ],
      },
    ],
  },

  /* 20. Fase 2 */
  {
    id: 'falta-de-agua',
    appliesTo: ['sala', 'escada'],
    title: 'Falta de água no bloco',
    prompt:
      'A água do bloco foi cortada por 20 min: toda sala por fazer custa +2 min. Os banheiros têm caixa-d’água própria.',
    conditions: [],
    actions: [
      {
        id: 'racionar',
        label: 'Racionar o balde',
        description: 'Limpa aqui com o que tem e segue.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(2), R), SEM_AGUA],
      },
      {
        id: 'ir-banheiros',
        label: 'Deixar esta e fazer os banheiros',
        description: 'Separa o material daqui e vira para os banheiros; esta espera, +2 min.',
        requires: [precisa(R), { type: 'regiaoComAlvo', target: { kind: 'tipo', tipo: 'wc' } }],
        effects: [{ type: 'spendCharges', amount: R }, { type: 'leavePending', residual: baseMais(2) }, SEM_AGUA],
      },
      {
        id: 'religar-trecho',
        label: 'Pedir que religuem este trecho',
        description: 'Espera 5 min: as salas a até 10 m daqui ficam sem o +2.',
        requires: [precisa(R)],
        effects: [
          { type: 'eventTime', amount: min(5) },
          ...conclui(base, R),
          SEM_AGUA,
          {
            type: 'modifyRooms',
            target: { kind: 'raio', meters: 10 },
            minutes: -2,
            label: 'Trecho religado',
            durationMinutes: 20,
          },
        ],
      },
    ],
  },

  /* 21. Fase 2 */
  {
    id: 'colega-de-turno',
    appliesTo: ['sala', 'wc', 'escada'],
    title: 'Colega de turno passa por aqui',
    prompt:
      'Um colega terminou a ala dele e está livre. Ele pode ajudar aqui, pegar o fundo ou trocar de carrinho com você.',
    conditions: [],
    actions: [
      {
        id: 'ajuda-aqui',
        label: 'Ajuda aqui',
        description: 'Dividem esta sala: metade do tempo.',
        requires: [precisa(R)],
        effects: [...conclui(halfBase, R)],
      },
      {
        id: 'par-distante',
        label: 'Passar a ele o par mais distante',
        description: 'Ele leva 2 cargas e faz as salas mais longe do depósito em 30 min.',
        requires: [precisa(Rmais(2)), { type: 'regiaoComAlvo', target: { kind: 'parMaisDistante' } }],
        effects: [
          ...conclui(base, Rmais(2)),
          { type: 'delegate', target: { kind: 'parMaisDistante' }, minutes: 30, label: 'O colega' },
        ],
      },
      {
        id: 'trocar-carrinho',
        label: 'Trocar de carrinho com ele',
        description: 'Termina aqui e sai com o carrinho dele, que está cheio.',
        requires: [precisa(R)],
        effects: [...conclui(base, R), { type: 'refill' }],
      },
    ],
  },

  /* 22. Fase 1 */
  {
    id: 'enceradeira-disponivel',
    appliesTo: ['sala'],
    title: 'Enceradeira livre hoje',
    prompt:
      'A enceradeira do bloco está livre. Ela pode ser usada aqui, ficar estacionada nas salas grandes do fundo ou ir com um colega.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'usar-aqui',
        label: 'Usar aqui',
        description: 'Encera esta sala em metade do tempo, gastando mais produto.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } }],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'completeRoom' },
        ],
      },
      {
        id: 'estacionar-fundo',
        label: 'Deixar a máquina em S2/S8',
        description: 'A enceradeira fica nas salas grandes do fundo: −3 min em cada.',
        requires: [
          { type: 'minCharges', amount: { kind: 'roomCost' } },
          { type: 'regiaoComAlvo', target: { kind: 'ponto', at: 'fundo' } },
        ],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          {
            type: 'modifyRooms',
            target: { kind: 'ponto', at: 'fundo' },
            minutes: -3,
            label: 'Enceradeira estacionada',
            equipment: 'A enceradeira',
          },
        ],
      },
      {
        id: 'entregar-colega',
        label: 'Entregar a um colega',
        description: 'Um colega leva a máquina e encera a sala mais distante do depósito.',
        requires: [
          { type: 'minCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'regiaoComAlvo', target: { kind: 'maisDistante' } },
        ],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCostPlus', value: 1 } },
          { type: 'eventTime', amount: min(1) },
          { type: 'completeRoom' },
          { type: 'delegate', target: { kind: 'maisDistante' }, minutes: 35, label: 'Colega com a enceradeira' },
        ],
      },
    ],
  },

  /* 23. Fase 2 */
  {
    id: 'evento-cancelado',
    appliesTo: ['sala'],
    title: 'Evento cancelado',
    prompt:
      'O evento desta sala foi cancelado. Ela está vazia, a equipe do evento ficou livre e a coordenação oferece guardar coisas aqui.',
    conditions: [],
    actions: [
      {
        id: 'limpar-agora',
        label: 'Limpar agora que vagou',
        description: 'A sala está vazia: 1 min a menos.',
        requires: [precisa(R)],
        effects: [...conclui(baseMenos(1), R)],
      },
      {
        id: 'liberar-fechada',
        label: 'Liberar o ambiente fechado',
        description: 'A equipe desocupa o ambiente fechado mais próximo e traz material.',
        requires: [{ type: 'temBloqueada' }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'completeRoom' },
          { type: 'unblockRoom', target: 'nearestBlocked' },
        ],
      },
      {
        id: 'guardar-material',
        label: 'Guardar material aqui',
        description: 'O almoxarifado deixa 4 cargas nesta estação, para a próxima passada.',
        requires: [precisa(R)],
        effects: [
          { type: 'eventTime', amount: min(2) },
          ...conclui(base, R),
          { type: 'placeStash', at: 'aqui', charges: 4, label: 'Estoque da sala vazia' },
        ],
      },
    ],
  },

  /* 24. Fase 2 */
  {
    id: 'sem-torneira-na-sala',
    appliesTo: ['sala'],
    title: 'Sala sem torneira',
    prompt: 'Esta sala não tem torneira; a sala da frente tem. Pegar água lá molha o chão dela.',
    conditions: [],
    actions: [
      {
        id: 'balde-grande',
        label: 'Encher o balde grande',
        description: 'Uma viagem só, com mais produto.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(base, Rmais(1))],
      },
      {
        id: 'agua-da-frente',
        label: 'Pegar água na sala da frente',
        description: 'Sem material extra. Se a frente estiver por fazer, fica +2 min lá.',
        requires: [precisa(R)],
        effects: [
          ...conclui(baseMais(1), R),
          { type: 'modifyRooms', target: { kind: 'frente' }, minutes: 2, label: 'Chão molhado' },
        ],
      },
      {
        id: 'parte-seca',
        label: 'Parte seca agora, úmida na volta',
        description: 'Metade agora; o pano fica para quando passar de novo (2 min).',
        requires: [precisa(R)],
        effects: [
          { type: 'cleanTime', amount: halfBase },
          { type: 'spendCharges', amount: R },
          { type: 'leavePending', residual: min(2) },
        ],
      },
    ],
  },

  /* 25. Fase 2 */
  {
    id: 'sala-de-prova',
    appliesTo: ['sala'],
    title: 'Sala preparada para prova',
    prompt:
      'Uma prova está em andamento e acaba no próximo sinal. Dá para limpar em silêncio, esperar o sinal ou arriscar.',
    conditions: [],
    actions: [
      {
        id: 'silencio',
        label: 'Limpar em silêncio',
        description: 'Contorna as carteiras com cuidado: mais tempo e mais produto.',
        requires: [precisa(Rmais(1))],
        effects: [...conclui(baseMais(2), Rmais(1))],
      },
      {
        id: 'fim-da-prova',
        label: 'Voltar no fim da prova',
        description: 'Sala fechada até o próximo sinal; na volta, 2 min a menos.',
        requires: [],
        effects: [
          { type: 'leavePending', residual: baseMenos(2) },
          { type: 'blockRoom', target: 'self', minutes: 0, ateSinal: 1 },
        ],
      },
      {
        id: 'troca-folhas',
        label: 'Entrar na troca de folhas',
        description: 'Conclui agora, se der. 1 em 3: o fiscal pede para você sair.',
        requires: [precisa(R)],
        effects: [
          ...conclui(base, R),
          {
            type: 'aposta',
            umEm: 3,
            label: 'o fiscal pede para sair: +2 min e metade da sala na volta',
            seFalhar: [
              { type: 'eventTime', amount: min(2) },
              { type: 'leavePending', residual: halfBase },
            ],
          },
        ],
      },
    ],
  },

  /* 26. Fase 2 */
  {
    id: 'mural-do-semestre',
    appliesTo: ['sala'],
    title: 'Murais de fim de semestre',
    prompt:
      'Os murais precisam sair. Os painéis são volumosos, e o papel serve para forrar o chão da escada.',
    conditions: [],
    actions: [
      {
        id: 'desmontar-tudo',
        label: 'Desmontar e deixar ensacado',
        description: 'Desmonta aqui e deixa tudo pronto para a coleta.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(3), R)],
      },
      {
        id: 'descer-volume',
        label: 'Descer o volume ao depósito',
        description: 'Leva os painéis ao depósito e recarrega lá.',
        requires: [precisa(R), { type: 'depositoAcessivel' }],
        effects: [
          ...conclui(base, R),
          { type: 'moveTo', target: 'deposito' },
          { type: 'eventTime', amount: min(2) },
          { type: 'refill' },
        ],
      },
      {
        id: 'forrar-escada',
        label: 'Levar o papel para a escada',
        description: 'Forra o chão da escada: −3 min lá. Você termina na escada.',
        requires: [precisa(R), { type: 'regiaoComAlvo', target: ESCADA }],
        effects: [
          ...conclui(base, R),
          { type: 'moveTo', target: 'escada' },
          { type: 'modifyRooms', target: ESCADA, minutes: -3, label: 'Escada forrada' },
        ],
      },
    ],
  },

  /* 27. Fase 2 */
  {
    id: 'ar-condicionado-pingando',
    appliesTo: ['sala'],
    title: 'Ar-condicionado pingando',
    prompt:
      'O aparelho pinga no piso. O disjuntor dele corta a energia de um trecho inteiro do corredor.',
    conditions: [],
    actions: [
      {
        id: 'esvaziar-bandeja',
        label: 'Esvaziar a bandeja e desligar',
        description: 'Resolve este aparelho sem mexer em mais nada.',
        requires: [precisa(R)],
        effects: [...conclui(baseMais(3), R)],
      },
      {
        id: 'bacia',
        label: 'Bacia embaixo e voltar',
        description: 'Conclui quase tudo; a bacia pede uma volta de 2 min.',
        requires: [precisa(R)],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: R },
          { type: 'leavePending', residual: min(2) },
        ],
      },
      {
        id: 'disjuntor',
        label: 'Desligar o disjuntor do trecho',
        description: 'Conclui no tempo normal; as salas a até 10 m ficam sem luz 10 min.',
        requires: [precisa(R)],
        effects: [...conclui(base, R), { type: 'blockRooms', target: { kind: 'raio', meters: 10 }, minutes: 10 }],
      },
    ],
  },

  /* 28. Fase 2 */
  {
    id: 'banheiro-reformado',
    appliesTo: ['wc'],
    title: 'Banheiro recém-reformado',
    prompt:
      'A reforma deixou uma lavadora de piso nova aqui. Ela pode ficar na base ou subir para a escada, onde o piso é pior.',
    conditions: [],
    actions: [
      {
        id: 'aproveitar',
        label: 'Aproveitar e fechar',
        description: 'O banheiro está novo: metade do tempo.',
        requires: [precisa(R)],
        effects: [...conclui(halfBase, R)],
      },
      {
        id: 'lavadora-escada',
        label: 'Mandar a lavadora para a escada',
        description: 'A manutenção sobe a máquina: a escada fica −4 min.',
        requires: [precisa(R), { type: 'regiaoComAlvo', target: ESCADA }],
        effects: [
          { type: 'eventTime', amount: min(2) },
          ...conclui(base, R),
          { type: 'modifyRooms', target: ESCADA, minutes: -4, label: 'Lavadora', equipment: 'A lavadora' },
        ],
      },
      {
        id: 'lavadora-aqui',
        label: 'Usar a lavadora aqui e na frente',
        description: 'Gasta só 1 carga aqui, e o outro banheiro fica −2 min.',
        requires: [precisa(cargas(1))],
        effects: [
          ...conclui(base, cargas(1)),
          { type: 'modifyRooms', target: { kind: 'frente' }, minutes: -2, label: 'Lavadora', equipment: 'A lavadora' },
        ],
      },
    ],
  },

  /* 29. Fase 1 */
  {
    id: 'entrega-de-material',
    appliesTo: ['sala', 'wc'],
    title: 'Entrega de material no andar',
    prompt:
      'O almoxarifado está descarregando caixas no corredor. Dá para pegar um pouco, estocar agora ou mandar deixar mais adiante.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'pegar-passagem',
        label: 'Pegar de passagem',
        description: 'Pega umas caixas sem parar o serviço.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'completeRoom' },
          { type: 'gainCharges', amount: 2 },
        ],
      },
      {
        id: 'deixar-fundo',
        label: 'Pedir que deixem no fundo',
        description: 'As caixas ficam em S2/S8 com 5 cargas; você pega ao passar.',
        requires: [
          { type: 'minCharges', amount: { kind: 'roomCost' } },
          /* No fundo, a caixa seria recolhida assim que você saísse: vira um
             "pegar de passagem" mais caro, e não uma escolha. */
          { type: 'antesDoPonto', at: 'fundo' },
        ],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'eventTime', amount: min(1) },
          { type: 'completeRoom' },
          { type: 'placeStash', at: 'fundo', charges: 5, label: 'Caixas da entrega' },
        ],
      },
      {
        id: 'parar-estocar',
        label: 'Parar e estocar tudo',
        description: 'Descarrega com calma e sai com o carrinho reforçado.',
        requires: [{ type: 'minCharges', amount: { kind: 'roomCost' } }],
        effects: [
          { type: 'cleanTime', amount: base },
          { type: 'spendCharges', amount: { kind: 'roomCost' } },
          { type: 'eventTime', amount: min(2) },
          { type: 'completeRoom' },
          { type: 'gainCharges', amount: 6 },
        ],
      },
    ],
  },

  /* 30. Fase 2 */
  {
    id: 'carrinho-desorganizado',
    appliesTo: ['sala', 'wc'],
    title: 'Carrinho desorganizado',
    prompt:
      'O carrinho está uma bagunça. Arrumar custa tempo, e o que sobrar pode ficar guardado aqui. Material vale mais longe do depósito.',
    conditions: [{ type: 'chargesAtLeastRoomCost' }],
    actions: [
      {
        id: 'organizar',
        label: 'Arrumar agora',
        description: 'Leva 3 min a mais; a sobra vira uma caixa de 2 cargas aqui.',
        requires: [precisa(R)],
        effects: [
          ...conclui(baseMais(3), R),
          { type: 'placeStash', at: 'aqui', charges: 2, label: 'Sobra do carrinho' },
        ],
      },
      {
        id: 'pano-de-reserva',
        label: 'Usar o pano de reserva',
        description: 'Rápido, gastando duas cargas a mais.',
        requires: [precisa(Rmais(2))],
        effects: [...conclui(halfBase, Rmais(2))],
      },
      {
        id: 'frascos-abertos',
        label: 'Gastar os frascos abertos',
        description: 'Não tira carga do carrinho, mas achar tudo leva 2 min.',
        requires: [],
        effects: [{ type: 'cleanTime', amount: baseMais(2) }, { type: 'completeRoom' }],
      },
    ],
  },

  /* 31. Fase 2 */
  {
    id: 'visita-da-direcao',
    appliesTo: ['sala'],
    title: 'Visita da direção hoje',
    prompt:
      'A direção passou no bloco e quer saber das salas que você deixou para depois.',
    conditions: [{ type: 'temPendencias' }],
    actions: [
      {
        id: 'prometer',
        label: 'Prometer as pendências em 20 min',
        description: 'A tempo, um colega faz a sala mais distante. Atrasou: +3 min em cada.',
        requires: [precisa(R)],
        effects: [
          ...conclui(base, R),
          {
            type: 'addMeta',
            label: 'Promessa à direção',
            target: { kind: 'pendencias' },
            minutes: 20,
            recompensa: { target: { kind: 'maisDistante' }, label: 'um colega da direção limpa a sala mais distante' },
            penalidade: 3,
            penalidadePorSala: true,
          },
        ],
      },
      {
        id: 'mostrar-servico',
        label: 'Mostrar o serviço feito',
        description: 'A direção conta o que espera nas salas mais longe do depósito.',
        requires: [precisa(R), { type: 'regiaoComAlvo', target: { kind: 'parMaisDistante' } }],
        effects: [
          { type: 'eventTime', amount: min(2) },
          ...conclui(base, R),
          { type: 'revealSituations', count: 2, target: { kind: 'parMaisDistante' } },
        ],
      },
      {
        id: 'pedir-ajuda',
        label: 'Explicar e pedir ajuda',
        description: 'Leva 3 min; a pendência mais antiga vai para um colega.',
        requires: [precisa(R)],
        effects: [
          { type: 'eventTime', amount: min(3) },
          ...conclui(base, R),
          { type: 'delegate', target: { kind: 'pendencias' }, limite: 1, minutes: 15, label: 'Colega' },
        ],
      },
    ],
  },

  /* 32. Fase 2 */
  {
    id: 'pedido-da-coordenacao',
    appliesTo: ['sala', 'wc', 'escada'],
    title: 'Pedido da coordenação',
    prompt:
      'A coordenação marcou uma reunião daqui a 30 min na sala por fazer mais longe do depósito, e pede que ela esteja pronta.',
    conditions: [],
    actions: [
      {
        id: 'largar-e-ir',
        label: 'Largar tudo e ir para lá',
        description: 'Deixa esta; se a sala da reunião ficar pronta a tempo, limpam esta.',
        requires: [{ type: 'regiaoComAlvo', target: { kind: 'maisDistante' } }],
        effects: [
          { type: 'leaveUnstarted' },
          {
            type: 'addMeta',
            label: 'Sala da reunião',
            target: { kind: 'maisDistante' },
            minutes: 30,
            recompensa: { target: 'origem', label: 'a coordenação limpa esta sala' },
            penalidade: 5,
          },
        ],
      },
      {
        id: 'negociar-prazo',
        label: 'Negociar mais prazo',
        description: 'Conclui aqui. A reunião passa para daqui a 60 min, sem recompensa.',
        requires: [precisa(R), { type: 'regiaoComAlvo', target: { kind: 'maisDistante' } }],
        effects: [
          { type: 'eventTime', amount: min(3) },
          ...conclui(base, R),
          {
            type: 'addMeta',
            label: 'Sala da reunião',
            target: { kind: 'maisDistante' },
            minutes: 60,
            recompensa: null,
            penalidade: 5,
          },
        ],
      },
      {
        id: 'recusar',
        label: 'Recusar e seguir',
        description: 'Conclui aqui. A reunião acontece e suja a sala dela: +3 min lá.',
        requires: [precisa(R)],
        effects: [
          ...conclui(base, R),
          { type: 'modifyRooms', target: { kind: 'maisDistante' }, minutes: 3, label: 'Reunião' },
        ],
      },
    ],
  },
];

/** As 8 situações do protótipo da Fase 1: o que o modo de playtest sorteia. */
export const prototipoFase1 = [
  'sala-suja',
  'material-acabando',
  'sala-trancada',
  'turma-ajuda',
  'carrinho-da-manutencao',
  'fluxo-de-alunos',
  'enceradeira-disponivel',
  'entrega-de-material',
];

export const situationsById: Record<string, SituationDef> = Object.fromEntries(
  situations.map((situation) => [situation.id, situation]),
);
