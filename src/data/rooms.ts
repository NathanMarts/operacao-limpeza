import type { RoomDef } from '../domain/types';

/**
 * Planta do bloco — corredor único, salas dos dois lados (decisão Q2).
 *
 * `corridorPosition` é a posição da porta em metros a partir da entrada e é o
 * ÚNICO valor usado no cálculo de deslocamento. `spanStartMeters` /
 * `spanWidthMeters` / `depth` descrevem o desenho, também em metros, para que o
 * mapa não possa mentir sobre a distância: recalibrar as posições move o desenho.
 */
/**
 * A porta da entrada fica 2 m ALÉM do fim do corredor, dentro do quadro de
 * acesso — espelhando a caixa de escada na outra ponta. Como é daqui que o
 * turno começa, este é o zero da régua do jogo: toda distância é medida a
 * partir deste ponto, e ele é negativo apenas na régua do DESENHO.
 */
export const ENTRANCE_POSITION = -2;
export const DEPOSITO_POSITION = 8;

/**
 * O jogo começa na ponta LESTE do corredor, ao lado dos banheiros.
 * `corridorPosition` é a distância até essa entrada, e cresce para oeste.
 * O desenho, porém, corre da esquerda para a direita — esta constante converte
 * um no outro, e é a única ponte entre a régua do jogo e a do papel.
 */
export const ENTRADA_DESENHO_M = 70;

export const desenhoDaPorta = (room: { corridorPosition: number }): number =>
  ENTRADA_DESENHO_M - room.corridorPosition;

export const rooms: RoomDef[] = [
  // ----- Acesso -------------------------------------------------------
  /**
   * CAIXA DE ESCADA — as medidas abaixo controlam o desenho por inteiro.
   * Tudo em metros; o mapa se redimensiona sozinho a partir daqui.
   *
   *   spanStartMeters  borda OESTE da caixa. Mais negativo = escada mais para
   *                    fora do bloco. É também a borda esquerda do papel: o
   *                    SVG acompanha e não corta.
   *   spanWidthMeters  largura no eixo do corredor (oeste para leste).
   *   depth            altura vertical, em múltiplos de 120 px. Como a escada
   *                    atravessa o corredor (straddlesCorridor: true), ela
   *                    fica CENTRADA no eixo: metade acima, metade abaixo.
   *
   * Exemplo — escada mais larga e mais rasa:
   *   spanStartMeters: -18, spanWidthMeters: 18, depth: 0.9
   *
   * corridorPosition é outra coisa: é a porta no corredor e entra no cálculo
   * de deslocamento. Mudar as medidas do desenho NÃO altera distância alguma.
   */
  {
    id: 'ESC', name: 'Caixa de escada', shortName: 'ESC', kind: 'escada', side: 'top', tone: 'escada',
    /* 71.5, e não 70: a escada fica ALÉM do fim do corredor, não na parede dele.
       Assim o marco da régua cai dentro da caixa amarela, que é onde o
       funcionário de fato para — e o desenho continua derivado do dado. */
    corridorPosition: 71.5, baseCleaningMinutes: 7, materialCost: 1, cleanable: true,
    spanStartMeters: -9, spanWidthMeters: 9, depth: 1.2, straddlesCorridor: true,
  },

  {
    id: 'ENT', name: 'Entrada do bloco', shortName: 'INÍCIO', kind: 'entrada', side: 'top', tone: 'entrada',
    corridorPosition: ENTRANCE_POSITION, baseCleaningMinutes: 0, materialCost: 0, cleanable: false,
    spanStartMeters: 68.2, spanWidthMeters: 7.8, depth: 0.95, straddlesCorridor: true,
  },

  // ----- Ala superior -------------------------------------------------
  {
    id: 'S1', name: 'Sala 1', shortName: 'S1', kind: 'sala', side: 'top', tone: 'tecnica',
    corridorPosition: 65, baseCleaningMinutes: 5, materialCost: 1, cleanable: true,
    spanStartMeters: 0, spanWidthMeters: 8, depth: 1.3,
  },
  {
    id: 'S2', name: 'Sala 2', shortName: 'S2', kind: 'sala', side: 'top', tone: 'grande',
    corridorPosition: 55, baseCleaningMinutes: 8, materialCost: 1, cleanable: true,
    spanStartMeters: 8, spanWidthMeters: 14, depth: 1.3,
  },
  {
    id: 'S3', name: 'Sala 3', shortName: 'S3', kind: 'sala', side: 'top', tone: 'estreita',
    corridorPosition: 45, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 22, spanWidthMeters: 6, depth: 1,
  },
  {
    id: 'S4', name: 'Sala 4', shortName: 'S4', kind: 'sala', side: 'top', tone: 'estreita',
    corridorPosition: 38, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 28, spanWidthMeters: 7, depth: 1,
  },
  {
    id: 'S5', name: 'Sala 5', shortName: 'S5', kind: 'sala', side: 'top', tone: 'pequena',
    corridorPosition: 28, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 35, spanWidthMeters: 13, depth: 1,
  },
  {
    id: 'S6', name: 'Sala 6', shortName: 'S6', kind: 'sala', side: 'top', tone: 'media',
    corridorPosition: 18, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 48, spanWidthMeters: 12.2, depth: 1,
  },
  /**
   * PONTA LESTE — na planta real o banheiro é um bloco único encostado em
   * S6/S12, e o depósito é uma subsala DENTRO desse envelope: encostado na
   * mesma parede oeste, de frente para o corredor, com PORTA PRÓPRIA (por isso
   * mantém corridorPosition próprio). As cabines ficam atrás dele, na mesma
   * faixa oeste, e a antessala do banheiro ocupa a porção leste.
   * Medidas tiradas de docs/planta da faculdade.png: a sala laranja é bem mais
   * LARGA que o bloco do banheiro, e o depósito ocupa ~63% da largura desse
   * bloco e ~34% da profundidade, na faixa colada ao corredor.
   */
  {
    id: 'WC-A', name: 'Banheiro norte', shortName: 'WC', kind: 'wc', side: 'top', tone: 'banheiro',
    corridorPosition: 4, baseCleaningMinutes: 3, materialCost: 2, cleanable: true,
    spanStartMeters: 60.2, spanWidthMeters: 8, depth: 1,
  },
  {
    id: 'DEP-A', name: 'Depósito (ala norte)', shortName: 'DEP', kind: 'deposito', side: 'top', tone: 'tecnica',
    corridorPosition: DEPOSITO_POSITION, baseCleaningMinutes: 0, materialCost: 0, cleanable: false,
    spanStartMeters: 60.2, spanWidthMeters: 5, depth: 0.34, nestedIn: 'WC-A',
  },

  // ----- Ala inferior -------------------------------------------------
  {
    id: 'S7', name: 'Sala 7', shortName: 'S7', kind: 'sala', side: 'bottom', tone: 'tecnica',
    corridorPosition: 65, baseCleaningMinutes: 5, materialCost: 1, cleanable: true,
    spanStartMeters: 0, spanWidthMeters: 8, depth: 1.3,
  },
  {
    id: 'S8', name: 'Sala 8', shortName: 'S8', kind: 'sala', side: 'bottom', tone: 'grande',
    corridorPosition: 55, baseCleaningMinutes: 8, materialCost: 1, cleanable: true,
    spanStartMeters: 8, spanWidthMeters: 14, depth: 1.3,
  },
  {
    id: 'S9', name: 'Sala 9', shortName: 'S9', kind: 'sala', side: 'bottom', tone: 'estreita',
    corridorPosition: 45, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 22, spanWidthMeters: 6, depth: 1,
  },
  {
    id: 'S10', name: 'Sala 10', shortName: 'S10', kind: 'sala', side: 'bottom', tone: 'estreita',
    corridorPosition: 38, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 28, spanWidthMeters: 7, depth: 1,
  },
  {
    id: 'S11', name: 'Sala 11', shortName: 'S11', kind: 'sala', side: 'bottom', tone: 'pequena',
    corridorPosition: 28, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 35, spanWidthMeters: 13, depth: 1,
  },
  {
    id: 'S12', name: 'Sala 12', shortName: 'S12', kind: 'sala', side: 'bottom', tone: 'media',
    corridorPosition: 18, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 48, spanWidthMeters: 12.2, depth: 1,
  },
  {
    id: 'WC-B', name: 'Banheiro sul', shortName: 'WC', kind: 'wc', side: 'bottom', tone: 'banheiro',
    corridorPosition: 4, baseCleaningMinutes: 3, materialCost: 2, cleanable: true,
    spanStartMeters: 60.2, spanWidthMeters: 8, depth: 1,
  },
  {
    id: 'DEP-B', name: 'Depósito (ala sul)', shortName: 'DEP', kind: 'deposito', side: 'bottom', tone: 'tecnica',
    corridorPosition: DEPOSITO_POSITION, baseCleaningMinutes: 0, materialCost: 0, cleanable: false,
    spanStartMeters: 60.2, spanWidthMeters: 5, depth: 0.34, nestedIn: 'WC-B',
  },
];

export const roomsById: Record<string, RoomDef> = Object.fromEntries(
  rooms.map((room) => [room.id, room]),
);

/** Os 14 objetivos de limpeza: 12 salas + 2 banheiros. */
export const objectives: RoomDef[] = rooms.filter((room) => room.cleanable);

/** Extensão do prédio em metros, usada para dimensionar o SVG. */
/** Borda OESTE do desenho, em metros — normalmente a ponta da caixa de escada. */
export const buildingStartMeters = Math.min(...rooms.map((room) => room.spanStartMeters));

export const buildingSpanMeters = Math.max(
  ...rooms.map((room) => room.spanStartMeters + room.spanWidthMeters),
);
