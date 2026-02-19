import { Tile, BALCONY_SIZE, NUM_BALCONIES, Faction } from './types';

export const generateBoard = (): Tile[] => {
  const tiles: Tile[] = [];
  
  // 4 Balconies arranged in a 2x2 grid layout logically, 
  // but we store them as a flat list of tiles with balconyId
  
  for (let b = 0; b < NUM_BALCONIES; b++) {
    for (let r = 0; r < BALCONY_SIZE; r++) {
      for (let c = 0; c < BALCONY_SIZE; c++) {
        const id = `b${b}-r${r}-c${c}`;
        let type: Tile['type'] = 'EMPTY';
        let allowedFactions: Faction[] = ['HUMAN', 'PIGEON'];
        let isWalkable = true;

        // Map Generation Logic (Procedural-ish)
        
        // Wires (Pigeon only paths) - usually on edges or crossing
        if (r === 0 || c === BALCONY_SIZE - 1) {
             // 30% chance of being a wire if on edge
             if (Math.random() > 0.7) {
                allowedFactions = ['PIGEON'];
             }
        }

        // Floor obstacles (Human blocked)
        if (Math.random() > 0.9) {
            type = 'OBSTACLE'; // Potted plant or AC unit
            isWalkable = false;
        }

        // Resources (Seeds for pigeons)
        if (type === 'EMPTY' && Math.random() > 0.85) {
            type = 'RESOURCE';
        }

        // Shop (Center of the map - conceptually between balconies)
        // Let's place shop tiles on the inner corners of the balconies
        // Balcony 0: bottom-right, 1: bottom-left, 2: top-right, 3: top-left
        const isInnerCorner = 
            (b === 0 && r === BALCONY_SIZE - 1 && c === BALCONY_SIZE - 1) ||
            (b === 1 && r === BALCONY_SIZE - 1 && c === 0) ||
            (b === 2 && r === 0 && c === BALCONY_SIZE - 1) ||
            (b === 3 && r === 0 && c === 0);
            
        if (isInnerCorner) {
            type = 'SHOP';
            allowedFactions = ['HUMAN']; // Only humans use shop
        }

        // Chance Tiles (Pigeon only)
        if (type === 'EMPTY' && Math.random() > 0.92) {
            type = 'CHANCE';
            allowedFactions = ['PIGEON'];
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

export const isValidMove = (current: Tile, target: Tile, faction: Faction, diceRoll: number): boolean => {
    // Basic adjacency check (Manhattan distance for simplicity in prototype, or pathfinding)
    // For this prototype, we'll just check if it's within 'diceRoll' distance and walkable
    // Real board game would be step-by-step, but for digital prototype, clicking destination is easier.
    
    // However, the prompt asks for "dice roll dictates how many steps".
    // So we should probably highlight valid moves.
    
    if (!target.isWalkable) return false;
    if (!target.allowedFactions.includes(faction)) return false;

    // Check if connected (same balcony or adjacent balcony connection)
    // Simplified: Allow movement between balconies if they are adjacent in the 2x2 grid
    // 0 1
    // 2 3
    const b1 = current.position.balconyId;
    const b2 = target.position.balconyId;
    
    const isAdjacentBalcony = 
        (b1 === 0 && (b2 === 1 || b2 === 2)) ||
        (b1 === 1 && (b2 === 0 || b2 === 3)) ||
        (b1 === 2 && (b2 === 0 || b2 === 3)) ||
        (b1 === 3 && (b2 === 1 || b2 === 2)) ||
        (b1 === b2);

    if (!isAdjacentBalcony) return false;

    // Distance check (simplified Manhattan for grid)
    // We need to account for balcony offsets to calculate true distance
    // Balcony offsets: 
    // 0: (0,0), 1: (0, 5), 2: (5, 0), 3: (5, 5)
    
    const getGlobalPos = (t: Tile) => {
        const bRow = Math.floor(t.position.balconyId / 2); // 0 or 1
        const bCol = t.position.balconyId % 2; // 0 or 1
        return {
            x: bCol * BALCONY_SIZE + t.position.col,
            y: bRow * BALCONY_SIZE + t.position.row
        };
    };

    const p1 = getGlobalPos(current);
    const p2 = getGlobalPos(target);
    
    const dist = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
    
    return dist <= diceRoll;
};
