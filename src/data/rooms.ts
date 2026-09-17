import type { RoomDef } from '../domain/types';

/**
 * Planta do bloco — corredor único, salas dos dois lados (decisão Q2).
 *
 * `corridorPosition` é a posição da porta em metros a partir da entrada e é o
 * ÚNICO valor usado no cálculo de deslocamento. `spanStartMeters` /
 * `spanWidthMeters` / `depth` descrevem o desenho, também em metros, para que o
 * mapa não possa mentir sobre a distância: recalibrar as posições move o desenho.
 */
export const ENTRANCE_POSITION = 0;
export const DEPOSITO_POSITION = 58;

export const rooms: RoomDef[] = [
  // ----- Ala superior -------------------------------------------------
  {
    id: 'S1', name: 'Sala 1', shortName: 'S1', kind: 'sala', side: 'top', tone: 'tecnica',
    corridorPosition: 5, baseCleaningMinutes: 5, materialCost: 1, cleanable: true,
    spanStartMeters: 0, spanWidthMeters: 10, depth: 1.3,
  },
  {
    id: 'S2', name: 'Sala 2', shortName: 'S2', kind: 'sala', side: 'top', tone: 'grande',
    corridorPosition: 15, baseCleaningMinutes: 8, materialCost: 1, cleanable: true,
    spanStartMeters: 10, spanWidthMeters: 12, depth: 1.3,
  },
  {
    id: 'S3', name: 'Sala 3', shortName: 'S3', kind: 'sala', side: 'top', tone: 'estreita',
    corridorPosition: 25, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 22, spanWidthMeters: 6, depth: 1,
  },
  {
    id: 'S4', name: 'Sala 4', shortName: 'S4', kind: 'sala', side: 'top', tone: 'estreita',
    corridorPosition: 32, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 28, spanWidthMeters: 7, depth: 1,
  },
  {
    id: 'S5', name: 'Sala 5', shortName: 'S5', kind: 'sala', side: 'top', tone: 'pequena',
    corridorPosition: 42, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 35, spanWidthMeters: 13, depth: 1,
  },
  {
    id: 'S6', name: 'Sala 6', shortName: 'S6', kind: 'sala', side: 'top', tone: 'media',
    corridorPosition: 52, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 48, spanWidthMeters: 8, depth: 1,
  },
  {
    id: 'DEP-A', name: 'Depósito (ala norte)', shortName: 'DEP', kind: 'deposito', side: 'top', tone: 'tecnica',
    corridorPosition: DEPOSITO_POSITION, baseCleaningMinutes: 0, materialCost: 0, cleanable: false,
    spanStartMeters: 56, spanWidthMeters: 4, depth: 0.45,
  },
  {
    id: 'WC-A', name: 'Banheiro norte', shortName: 'WC', kind: 'wc', side: 'top', tone: 'banheiro',
    corridorPosition: 62, baseCleaningMinutes: 3, materialCost: 2, cleanable: true,
    spanStartMeters: 60, spanWidthMeters: 8.2, depth: 1,
  },

  // ----- Ala inferior -------------------------------------------------
  {
    id: 'S7', name: 'Sala 7', shortName: 'S7', kind: 'sala', side: 'bottom', tone: 'tecnica',
    corridorPosition: 5, baseCleaningMinutes: 5, materialCost: 1, cleanable: true,
    spanStartMeters: 0, spanWidthMeters: 10, depth: 1.3,
  },
  {
    id: 'S8', name: 'Sala 8', shortName: 'S8', kind: 'sala', side: 'bottom', tone: 'grande',
    corridorPosition: 15, baseCleaningMinutes: 8, materialCost: 1, cleanable: true,
    spanStartMeters: 10, spanWidthMeters: 12, depth: 1.3,
  },
  {
    id: 'S9', name: 'Sala 9', shortName: 'S9', kind: 'sala', side: 'bottom', tone: 'estreita',
    corridorPosition: 25, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 22, spanWidthMeters: 6, depth: 1,
  },
  {
    id: 'S10', name: 'Sala 10', shortName: 'S10', kind: 'sala', side: 'bottom', tone: 'estreita',
    corridorPosition: 32, baseCleaningMinutes: 4, materialCost: 1, cleanable: true,
    spanStartMeters: 28, spanWidthMeters: 7, depth: 1,
  },
  {
    id: 'S11', name: 'Sala 11', shortName: 'S11', kind: 'sala', side: 'bottom', tone: 'pequena',
    corridorPosition: 42, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 35, spanWidthMeters: 13, depth: 1,
  },
  {
    id: 'S12', name: 'Sala 12', shortName: 'S12', kind: 'sala', side: 'bottom', tone: 'media',
    corridorPosition: 52, baseCleaningMinutes: 6, materialCost: 1, cleanable: true,
    spanStartMeters: 48, spanWidthMeters: 8, depth: 1,
  },
  {
    id: 'DEP-B', name: 'Depósito (ala sul)', shortName: 'DEP', kind: 'deposito', side: 'bottom', tone: 'tecnica',
    corridorPosition: DEPOSITO_POSITION, baseCleaningMinutes: 0, materialCost: 0, cleanable: false,
    spanStartMeters: 56, spanWidthMeters: 4, depth: 0.45,
  },
  {
    id: 'WC-B', name: 'Banheiro sul', shortName: 'WC', kind: 'wc', side: 'bottom', tone: 'banheiro',
    corridorPosition: 62, baseCleaningMinutes: 3, materialCost: 2, cleanable: true,
    spanStartMeters: 60, spanWidthMeters: 8.2, depth: 1,
  },
];

export const roomsById: Record<string, RoomDef> = Object.fromEntries(
  rooms.map((room) => [room.id, room]),
);

/** Os 14 objetivos de limpeza: 12 salas + 2 banheiros. */
export const objectives: RoomDef[] = rooms.filter((room) => room.cleanable);

/** Extensão do prédio em metros, usada para dimensionar o SVG. */
export const buildingSpanMeters = Math.max(
  ...rooms.map((room) => room.spanStartMeters + room.spanWidthMeters),
);
