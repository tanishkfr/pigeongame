export type Faction = 'HUMAN' | 'PIGEON';

export type NodeType = 'BALCONY' | 'WIRE' | 'ROAD' | 'VAN';

export interface Node {
  id: string;
  type: NodeType;
  x: number; // Percentage 0-100 for responsive layout
  y: number; // Percentage 0-100
  connections: string[]; // IDs of connected nodes
  resource?: boolean; // Does it have straw/currency?
  structures: {
    type: 'NEST' | 'PROP' | 'SPIKES';
    owner: Faction;
  }[];
  maxStructures: number;
}

export interface PlayerClass {
  id: string;
  name: string;
  description: string;
  faction: Faction;
  stats: {
    speed: number;
    strength: number;
    resourceGain: number;
  };
  ability: string;
}

export interface PlayerState {
  faction: Faction;
  classId: string;
  resources: number;
  currentNodeId: string;
  inventory: {
    vacuum?: {
      turnsLeft: number;
    };
  };
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
  turnIndex: number; // 0 or 1 (index in players array)
  round: number;
  diceRoll: number | null;
  movesLeft: number;
  hasActed: boolean; // Humans limited to 1 action
  logs: LogEntry[];
  winner: Faction | null;
}

export const MAX_ROUNDS = 20;
export const WINNING_NEST_COUNT_PER_BALCONY = 3;
export const VACUUM_COST = 5;
export const VACUUM_DURABILITY = 3;

export const CLASSES: PlayerClass[] = [
  {
    id: 'guttersnipe',
    name: 'The Guttersnipe',
    description: 'Scrappy and fast.',
    faction: 'PIGEON',
    stats: { speed: 1, strength: 1, resourceGain: 0 },
    ability: 'Street Smarts: +1 Speed',
  },
  {
    id: 'chonk',
    name: 'The Chonk',
    description: 'Absolute unit.',
    faction: 'PIGEON',
    stats: { speed: -1, strength: 3, resourceGain: 0 },
    ability: 'Heavy Sitter: Nests cost 1 less.',
  },
  {
    id: 'uncle',
    name: 'Morning Walk Uncle',
    description: 'Armed with a stick.',
    faction: 'HUMAN',
    stats: { speed: 0, strength: 2, resourceGain: 1 },
    ability: 'Pension: +1 Passive Income',
  },
  {
    id: 'student',
    name: 'Stressed Student',
    description: 'Efficient but fragile.',
    faction: 'HUMAN',
    stats: { speed: 1, strength: 1, resourceGain: 2 },
    ability: 'Scholarship: Start with +3 Money',
  }
];
