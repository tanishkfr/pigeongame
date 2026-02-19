import { Tile, BALCONY_SIZE, NUM_BALCONIES, Faction, Position } from './types';

export const generateBoard = (): Tile[] => {
  const tiles: Tile[] = [];
  
  for (let b = 0; b < NUM_BALCONIES; b++) {
    for (let r = 0; r < BALCONY_SIZE; r++) {
      for (let c = 0; c < BALCONY_SIZE; c++) {
        const id = `b${b}-r${r}-c${c}`;
        let type: Tile['type'] = 'EMPTY';
        let allowedFactions: Faction[] = ['HUMAN', 'PIGEON'];
        let isWalkable = true;

        // Wires (Pigeon only paths) - edges
        if (r === 0 || c === BALCONY_SIZE - 1) {
             if (Math.random() > 0.6) {
                // Visual distinction handled in UI, logic here
                // We'll keep them walkable by humans for gameplay flow unless strictly wire
                // But let's say wires are strictly pigeon
                // allowedFactions = ['PIGEON']; 
             }
        }

        // Obstacles
        if (Math.random() > 0.92) {
            type = 'OBSTACLE';
            isWalkable = false;
        }

        // Resources
        if (type === 'EMPTY' && Math.random() > 0.88) {
            type = 'RESOURCE';
        }

        // Shop (Inner corners)
        const isInnerCorner = 
            (b === 0 && r === BALCONY_SIZE - 1 && c === BALCONY_SIZE - 1) ||
            (b === 1 && r === BALCONY_SIZE - 1 && c === 0) ||
            (b === 2 && r === 0 && c === BALCONY_SIZE - 1) ||
            (b === 3 && r === 0 && c === 0);
            
        if (isInnerCorner) {
            type = 'SHOP';
        }

        // Chance Tiles
        if (type === 'EMPTY' && Math.random() > 0.95) {
            type = 'CHANCE';
        }

        tiles.push({
          id,
          type,
          position: { balconyId: b, row: r, col: c },
          isWalkable,
          allowedFactions,
          owner: undefined
        });
      }
    }
  }
  return tiles;
};

export const getTileAt = (tiles: Tile[], balconyId: number, row: number, col: number) => {
  return tiles.find(t => t.position.balconyId === balconyId && t.position.row === row && t.position.col === col);
};

// Check if two positions are adjacent (including balcony connections)
export const isAdjacent = (p1: Position, p2: Position, allowDiagonal: boolean = false): boolean => {
    if (p1.balconyId === p2.balconyId) {
        const dRow = Math.abs(p1.row - p2.row);
        const dCol = Math.abs(p1.col - p2.col);
        if (allowDiagonal) {
            return dRow <= 1 && dCol <= 1 && (dRow + dCol > 0);
        }
        return (dRow + dCol === 1);
    }

    // Balcony connections (2x2 grid)
    // 0 1
    // 2 3
    // Connections happen at specific edges.
    // Simplified: If they are logically adjacent balconies, check if they are on the connecting edge.
    // For prototype feel, let's just allow movement between adjacent balconies if you are on the edge row/col.
    
    // This logic is a bit complex for a quick prototype, let's simplify:
    // If balconies are adjacent, and Manhattan distance of global coords is 1.
    
    const getGlobalPos = (p: Position) => {
        const bRow = Math.floor(p.balconyId / 2);
        const bCol = p.balconyId % 2;
        return {
            x: bCol * BALCONY_SIZE + p.col,
            y: bRow * BALCONY_SIZE + p.row
        };
    };

    const gp1 = getGlobalPos(p1);
    const gp2 = getGlobalPos(p2);
    
    const dist = Math.abs(gp1.x - gp2.x) + Math.abs(gp1.y - gp2.y);
    // Note: This global pos logic puts balconies flush against each other.
    // So (0, 4) in B0 is adjacent to (0, 0) in B1 if we consider them touching.
    // B0 (row 0..4, col 0..4). B1 (row 0..4, col 0..4) -> Global B1 starts at x=5.
    // B0(0,4) -> x=4. B1(0,0) -> x=5. Dist = 1. Correct.
    
    if (allowDiagonal) {
         const dx = Math.abs(gp1.x - gp2.x);
         const dy = Math.abs(gp1.y - gp2.y);
         return dx <= 1 && dy <= 1 && (dx + dy > 0);
    }

    return dist === 1;
};

export const isValidStep = (current: Tile, target: Tile, faction: Faction, allowDiagonal: boolean): boolean => {
    if (!target.isWalkable) return false;
    if (target.type === 'SPIKES' && faction === 'PIGEON') return false; // Spikes block pigeons
    // if (!target.allowedFactions.includes(faction)) return false; // Strict faction paths disabled for fun flow

    return isAdjacent(current.position, target.position, allowDiagonal);
};

export const getPushTarget = (tiles: Tile[], pigeonPos: Position): Tile | null => {
    // Push logic: Try to push away from center or just random adjacent empty tile
    // For Uncle ability.
    // Simple implementation: Push to a random valid adjacent tile that isn't the current one.
    // Ideally push "backwards" but "backwards" is relative.
    // Let's push to a neighbor that increases distance from center of map?
    // Or just any empty neighbor.
    
    const neighbors = tiles.filter(t => isAdjacent(pigeonPos, t.position, true) && t.isWalkable && t.type !== 'OBSTACLE');
    if (neighbors.length === 0) return null;
    return neighbors[Math.floor(Math.random() * neighbors.length)];
};
