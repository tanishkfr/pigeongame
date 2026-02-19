export type Faction = 'HUMAN' | 'PIGEON';

export type TileType = 'EMPTY' | 'NEST' | 'PROP' | 'RESOURCE' | 'CHANCE' | 'SHOP' | 'OBSTACLE' | 'SPIKES';

export interface Position {
  balconyId: number;
  row: number;
  col: number;
}

export interface Tile {
  id: string;
  type: TileType;
  owner?: Faction;
  position: Position;
  isWalkable: boolean;
  allowedFactions: Faction[]; 
}

export interface PlayerClass {
  id: string;
  name: string;
  description: string;
  faction: Faction;
  stats: {
    speed: number; // Modifier to dice roll
    strength: number; // Cost to remove enemy structures
    resourceGain: number; // Extra resources per pickup/round
    maxActions: number; // Actions per turn
  };
  ability: string;
}

export interface PlayerState {
  faction: Faction;
  classId: string;
  resources: number;
  position: Position;
  inventory: string[];
}

export interface LogEntry {
  id: string;
  text: string;
  faction: Faction;
  round: number;
}

export type Phase = 'ROLL' | 'MOVE' | 'ACTION' | 'GAME_OVER';

export interface GameState {
  phase: Phase;
  turn: Faction;
  round: number;
  diceRoll: number | null;
  movesLeft: number;
  actionPoints: number;
  logs: LogEntry[];
  winner: Faction | null;
}

export const BALCONY_SIZE = 5;
export const NUM_BALCONIES = 4;
export const MAX_ROUNDS = 15;
export const WINNING_NEST_COUNT = 3;

export const CLASSES: PlayerClass[] = [
  // Pigeons
  {
    id: 'guttersnipe',
    name: 'The Guttersnipe',
    description: 'Scrappy and fast. Born in the chaotic traffic signals.',
    faction: 'PIGEON',
    stats: { speed: 1, strength: 1, resourceGain: 0, maxActions: 1 },
    ability: 'Street Smarts: Can move diagonally.',
  },
  {
    id: 'chonk',
    name: 'The Chonk',
    description: 'Well-fed by the grandma next door. Absolute unit.',
    faction: 'PIGEON',
    stats: { speed: -1, strength: 3, resourceGain: 0, maxActions: 1 },
    ability: 'Heavy Sitter: Nests cost 1 resource instead of 2.',
  },
  // Humans
  {
    id: 'uncle',
    name: 'Morning Walk Uncle',
    description: 'Armed with a stick and righteous fury.',
    faction: 'HUMAN',
    stats: { speed: 0, strength: 2, resourceGain: 1, maxActions: 1 },
    ability: 'Loud Yell: Can push pigeons back 2 tiles.',
  },
  {
    id: 'student',
    name: 'Stressed Student',
    description: 'Just wants quiet to study. Efficient but fragile.',
    faction: 'HUMAN',
    stats: { speed: 1, strength: 1, resourceGain: 2, maxActions: 2 },
    ability: 'All-Nighter: Can perform two actions in one turn.',
  }
];
