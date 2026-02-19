import { Node, Faction } from './types';

export const generateMap = (): Node[] => {
  const nodes: Node[] = [];

  // --- 1. Balconies (Entry + Slots) ---
  // We'll define 4 balcony areas.
  // Entry is the interaction point for Wires/Roads.
  // Slots extend from the Entry.
  
  const balconies = [
    { id: 0, label: 'Balcony 1', entryX: 35, entryY: 35, dirX: -1, dirY: -1 }, // TL, slots go up-left
    { id: 1, label: 'Balcony 2', entryX: 65, entryY: 35, dirX: 1, dirY: -1 },  // TR, slots go up-right
    { id: 2, label: 'Balcony 3', entryX: 35, entryY: 65, dirX: -1, dirY: 1 },  // BL, slots go down-left
    { id: 3, label: 'Balcony 4', entryX: 65, entryY: 65, dirX: 1, dirY: 1 },   // BR, slots go down-right
  ];

  balconies.forEach(b => {
      const entryId = `balcony-${b.id}-entry`;
      
      // Entry Node
      nodes.push({
          id: entryId,
          type: 'BALCONY_ENTRY',
          x: b.entryX,
          y: b.entryY,
          connections: [],
          balconyId: b.id
      });

      // Slot Nodes (Path of 3)
      let prevId = entryId;
      for (let i = 1; i <= 3; i++) {
          const slotId = `balcony-${b.id}-slot-${i}`;
          const slotX = b.entryX + (b.dirX * i * 6); // 6% spacing
          const slotY = b.entryY + (b.dirY * i * 6);
          
          nodes.push({
              id: slotId,
              type: 'BALCONY_SLOT',
              x: slotX,
              y: slotY,
              connections: [prevId],
              balconyId: b.id
          });
          
          // Connect prev to this
          const prevNode = nodes.find(n => n.id === prevId)!;
          prevNode.connections.push(slotId);
          
          prevId = slotId;
      }
  });

  // --- 2. Pigeon Wires (Connect Entries) ---
  // Connect Entries in a square + diagonals
  const entryIds = balconies.map(b => `balcony-${b.id}-entry`);
  
  const addWire = (fromId: string, toId: string, steps: number) => {
    let prevId = fromId;
    const fromNode = nodes.find(n => n.id === fromId)!;
    const toNode = nodes.find(n => n.id === toId)!;

    for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        const x = fromNode.x + (toNode.x - fromNode.x) * t;
        const y = fromNode.y + (toNode.y - fromNode.y) * t;
        const id = `wire-${fromId}-${toId}-${i}`;
        
        nodes.push({
            id,
            type: 'WIRE',
            x,
            y,
            connections: [prevId]
        });
        
        const prevNode = nodes.find(n => n.id === prevId)!;
        if (!prevNode.connections.includes(id)) prevNode.connections.push(id);
        prevId = id;
    }
    
    const lastNode = nodes.find(n => n.id === prevId)!;
    if (!lastNode.connections.includes(toId)) lastNode.connections.push(toId);
    const targetNode = nodes.find(n => n.id === toId)!;
    if (!targetNode.connections.includes(prevId)) targetNode.connections.push(prevId);
  };

  addWire(entryIds[0], entryIds[1], 2); // TL-TR
  addWire(entryIds[1], entryIds[3], 2); // TR-BR
  addWire(entryIds[3], entryIds[2], 2); // BR-BL
  addWire(entryIds[2], entryIds[0], 2); // BL-TL
  addWire(entryIds[0], entryIds[3], 3); // TL-BR
  addWire(entryIds[1], entryIds[2], 3); // TR-BL

  // --- 3. Patrol Path (Connects to Entries) ---
  const patrolNodes = [
    { id: 'road-top', x: 50, y: 10 },
    { id: 'road-right', x: 90, y: 50 },
    { id: 'road-bottom', x: 50, y: 90 },
    { id: 'road-left', x: 10, y: 50 },
    { id: 'road-tl', x: 15, y: 15 },
    { id: 'road-tr', x: 85, y: 15 },
    { id: 'road-br', x: 85, y: 85 },
    { id: 'road-bl', x: 15, y: 85 },
  ];

  patrolNodes.forEach(p => {
      nodes.push({
          id: p.id,
          type: p.id === 'road-top' ? 'VAN' : 'ROAD',
          x: p.x,
          y: p.y,
          connections: [],
          resourceType: (p.id === 'road-top' || p.id === 'road-bottom' || p.id === 'road-left' || p.id === 'road-right') ? undefined : 'COIN'
      });
  });

  const connect = (id1: string, id2: string) => {
      const n1 = nodes.find(n => n.id === id1)!;
      const n2 = nodes.find(n => n.id === id2)!;
      n1.connections.push(id2);
      n2.connections.push(id1);
  };

  // Ring
  connect('road-top', 'road-tr');
  connect('road-tr', 'road-right');
  connect('road-right', 'road-br');
  connect('road-br', 'road-bottom');
  connect('road-bottom', 'road-bl');
  connect('road-bl', 'road-left');
  connect('road-left', 'road-tl');
  connect('road-tl', 'road-top');

  // Connect to Balcony Entries
  connect('road-tl', entryIds[0]);
  connect('road-tr', entryIds[1]);
  connect('road-bl', entryIds[2]);
  connect('road-br', entryIds[3]);

  return nodes;
};

export const getValidMoves = (nodes: Node[], currentId: string, moves: number, faction: Faction): string[] => {
    const validTypes = faction === 'PIGEON' 
        ? ['WIRE', 'BALCONY_ENTRY', 'BALCONY_SLOT'] 
        : ['ROAD', 'VAN', 'BALCONY_ENTRY', 'BALCONY_SLOT'];

    let currentLevel = [currentId];
    const visited = new Set<string>();
    visited.add(currentId);

    for (let i = 0; i < moves; i++) {
        const nextLevel = new Set<string>();
        for (const nodeId of currentLevel) {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) continue;
            
            for (const neighborId of node.connections) {
                const neighbor = nodes.find(n => n.id === neighborId);
                if (neighbor && validTypes.includes(neighbor.type)) {
                    // Check for Spikes blocking Pigeons
                    if (faction === 'PIGEON' && neighbor.structure?.type === 'SPIKES') {
                        continue; // Blocked
                    }
                    nextLevel.add(neighborId);
                }
            }
        }
        currentLevel = Array.from(nextLevel);
    }
    
    return currentLevel;
};

export const getShortestPath = (nodes: Node[], startId: string, endId: string, faction: Faction): string[] => {
    const validTypes = faction === 'PIGEON' 
        ? ['WIRE', 'BALCONY_ENTRY', 'BALCONY_SLOT'] 
        : ['ROAD', 'VAN', 'BALCONY_ENTRY', 'BALCONY_SLOT'];
    
    const queue: { id: string, path: string[] }[] = [{ id: startId, path: [startId] }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
        const { id, path } = queue.shift()!;
        if (id === endId) return path;

        const node = nodes.find(n => n.id === id);
        if (!node) continue;

        for (const neighborId of node.connections) {
            const neighbor = nodes.find(n => n.id === neighborId);
            if (neighbor && validTypes.includes(neighbor.type) && !visited.has(neighborId)) {
                // Check Spikes
                if (faction === 'PIGEON' && neighbor.structure?.type === 'SPIKES') continue;

                visited.add(neighborId);
                queue.push({ id: neighborId, path: [...path, neighborId] });
            }
        }
    }
    return [];
};
