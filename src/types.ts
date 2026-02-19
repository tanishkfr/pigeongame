export type Faction = 'HUMAN' | 'PIGEON';

export type NodeType = 'BALCONY_ENTRY' | 'BALCONY_SLOT' | 'WIRE' | 'ROAD' | 'VAN' | 'PARK' | 'DUMPSTER' | 'ELEVATOR' | 'EVENT';

export interface Node {
  id: string;
  type: NodeType;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  connections: string[]; 
  resourceType?: 'STRAW' | 'TWIG' | 'COIN'; // For visual indicators or specific drops
  structure?: {
    type: 'NEST' | 'PROP' | 'SPIKES' | 'STICKY_TRAP';
    owner: Faction;
  };
  balconyId?: number; 
}

export interface PlayerClass {
  id: string;
  name: string;
  description: string;
  faction: Faction;
  stats: {
    speed: number;
    strength: number;
  };
  ability: string;
}

export interface Inventory {
  straw: number;
  twig: number;
  coins: number;
  vacuum?: {
    turnsLeft: number;
  };
}

export interface PlayerState {
  faction: Faction;
  classId: string;
  inventory: Inventory;
  currentNodeId: string;
  initiative: number;
}

export interface LogEntry {
  id: string;
  text: string;
  faction: Faction;
  round: number;
}

export type Phase = 'INITIATIVE' | 'ROLL' | 'MOVE' | 'ACTION' | 'ROUND_END' | 'GAME_OVER';

export interface GameState {
  phase: Phase;
  turnIndex: number; 
  round: number;
  diceRoll: number | null;
  movesLeft: number;
  hasActed: boolean; 
  logs: LogEntry[];
  winner: Faction | null;
}

export const MAX_ROUNDS = 20;
export const WINNING_NEST_COUNT_PER_BALCONY = 3;
export const VACUUM_COST = 5;
export const VACUUM_DURABILITY = 3;
export const PASSIVE_INCOME_HUMAN = 2;
export const NEST_COST_STRAW = 1;
export const NEST_COST_TWIG = 1;

export const CLASSES: PlayerClass[] = [
  {
    id: 'guttersnipe',
    name: 'The Guttersnipe',
    description: 'Scrappy and fast.',
    faction: 'PIGEON',
    stats: { speed: 1, strength: 1 },
    ability: 'Street Smarts: +1 Speed',
  },
  {
    id: 'chonk',
    name: 'The Chonk',
    description: 'Absolute unit.',
    faction: 'PIGEON',
    stats: { speed: -1, strength: 3 },
    ability: 'Heavy Sitter: Nests cost 1 less Straw.', // Adjusted ability
  },
  {
    id: 'uncle',
    name: 'Morning Walk Uncle',
    description: 'Armed with a stick.',
    faction: 'HUMAN',
    stats: { speed: 0, strength: 2 },
    ability: 'Pension: +1 Coin Passive Income',
  },
  {
    id: 'student',
    name: 'Stressed Student',
    description: 'Efficient but fragile.',
    faction: 'HUMAN',
    stats: { speed: 1, strength: 1 },
    ability: 'Scholarship: Start with +3 Coins',
  }
];
