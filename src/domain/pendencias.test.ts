import { describe, expect, it } from 'vitest';
import { situations } from '../data/situations';
import { objectives } from '../data/rooms';
import { actionAvailability, evalCharges, evalTime, type EffectContext } from './effects';
import { createInitialState } from './game';
import type { SituationAction } from './types';

/**
 * Invariante das ações que deixam pendência.
 *
 * O teste de não-dominância de `situations.test.ts` mede o eixo de tempo pelos
 * minutos IMEDIATOS. Isso deixa passar uma classe inteira: uma limpeza parcial
 * de 3 min que deixa 4 min de resíduo custa os mesmos 7 min de trabalho que a
 * irmã que fez tudo de uma vez — e ainda cobra a viagem de volta, que a regra
 * "uma volta exige ter saído" tornou obrigatória. Empatar já é perder.
 *
 * Aqui o eixo de tempo é `agora + resíduo`, e a exigência é: contra cada irmã
 * que conclui o ambiente pagando SÓ em tempo e material, a pendência precisa
 * ganhar estritamente em um dos dois. Irmãs que bloqueiam, se deslocam ou
 * concedem bônus pagam noutro eixo, então ficam fora da comparação.
 */

const perfil = (a: SituationAction, ctx: EffectContext) => {
  let minutos = 0;
  let cargas = 0;
  let residual = 0;
  let conclui = false;
  let outroEixo = false;
  for (const efeito of a.effects) {
    switch (efeito.type) {
      case 'cleanTime':
      case 'eventTime':
        minutos += evalTime(efeito.amount, ctx);
        break;
      case 'spendCharges':
        cargas += evalCharges(efeito.amount, ctx);
        break;
      case 'leavePending':
        residual = evalTime(efeito.residual, ctx);
        break;
      case 'completeRoom':
        conclui = true;
        break;
      default:
        /* Bloqueio, deslocamento, sujeira, bônus, recarga: outra moeda. */
        outroEixo = true;
    }
  }
  return { total: minutos + residual, cargas, conclui, outroEixo, pendura: residual > 0 };
};

/** Pares dominados que já existiam e estão fora do escopo corrigido. */
const CONHECIDOS = [
  /* parte-seca e duas-viagens custam base+2 e uma carga em toda sala: resíduo
     min(2) igual ao eventTime min(2) da irmã. Mesma identidade aritmética das
     cinco corrigidas; não entrou no lote porque a análise comparou apenas com
     a irmã mais barata (balde-grande), contra quem parte-seca ganha material. */
  'sem-torneira-na-sala.parte-seca vs duas-viagens',
];

function dominadas(): string[] {
  const inicial = createInitialState();
  const pares = new Set<string>();
  for (const situacao of situations) {
    const ambientes = objectives.filter(
      (room) => !situacao.appliesTo || situacao.appliesTo.includes(room.kind as never),
    );
    for (const room of ambientes) {
      const ctx: EffectContext = {
        room,
        roomState: inicial.rooms[room.id],
        charges: 10,
        position: room.corridorPosition,
        blockTargetId: 'S4',
      };
      const disponiveis = situacao.actions.filter((a) => actionAvailability(a, ctx).available);
      for (const acao of disponiveis) {
        const pa = perfil(acao, ctx);
        if (!pa.pendura) continue;
        for (const irma of disponiveis) {
          if (irma.id === acao.id) continue;
          const pb = perfil(irma, ctx);
          if (!pb.conclui || pb.outroEixo) continue;
          if (pa.total < pb.total || pa.cargas < pb.cargas) continue;
          pares.add(`${situacao.id}.${acao.id} vs ${irma.id}`);
        }
      }
    }
  }
  return [...pares].sort();
}

describe('ações que deixam pendência', () => {
  it('ganham em tempo total ou em material contra cada irmã que conclui', () => {
    const novas = dominadas().filter((par) => !CONHECIDOS.includes(par));
    expect(novas).toEqual([]);
  });

  it('não carrega exceção que já foi corrigida', () => {
    /* Sem isto a lista de conhecidos envelheceria em silêncio: uma carta
       corrigida continuaria dispensada da regra para sempre. */
    const atuais = dominadas();
    expect(CONHECIDOS.filter((par) => !atuais.includes(par))).toEqual([]);
  });
});
