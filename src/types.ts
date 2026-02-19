export type Faction = 'HUMAN' | 'PIGEON';

export type TileType = 'EMPTY' | 'NEST' | 'PROP' | 'RESOURCE' | 'CHANCE' | 'SHOP' | 'OBSTACLE';

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
  // Specific paths: some tiles might only be walkable by pigeons (wires) or humans (floor)
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
  };
  ability: string;
}

export interface PlayerState {
  faction: Faction;
  classId: string;
  resources: number;
  position: Position;
  inventory: string[]; // 'Chappal', 'Broom', etc.
}

export interface GameState {
  phase: 'MENU' | 'SELECT_CLASS' | 'PLAYING' | 'GAME_OVER';
  turn: Faction;
  round: number;
  diceRoll: number | null;
  movesLeft: number;
  message: string;
  winner: Faction | null;
}

export const BALCONY_SIZE = 5; // 5x5 grid per balcony
export const NUM_BALCONIES = 4;

export const CLASSES: PlayerClass[] = [
  // Pigeons
  {
    id: 'guttersnipe',
    name: 'The Guttersnipe',
    description: 'Scrappy and fast. Born in the chaotic traffic signals.',
    faction: 'PIGEON',
    stats: { speed: 1, strength: 1, resourceGain: 0 },
    ability: 'Street Smarts: Can move diagonally.',
  },
  {
    id: 'chonk',
    name: 'The Chonk',
    description: 'Well-fed by the grandma next door. Absolute unit.',
    faction: 'PIGEON',
    stats: { speed: -1, strength: 3, resourceGain: 0 },
    ability: 'Heavy Sitter: Nests cost 1 less resource.',
  },
  // Humans
  {
    id: 'uncle',
    name: 'Morning Walk Uncle',
    description: 'Armed with a stick and righteous fury.',
    faction: 'HUMAN',
    stats: { speed: 0, strength: 2, resourceGain: 1 },
    ability: 'Loud Yell: Can scare pigeons away (push back 1 tile).',
  },
  {
    id: 'student',
    name: 'Stressed Student',
    description: 'Just wants quiet to study. Efficient but fragile.',
    faction: 'HUMAN',
    stats: { speed: 1, strength: 1, resourceGain: 2 },
    ability: 'All-Nighter: Can perform two actions in one turn.',
  }
];
