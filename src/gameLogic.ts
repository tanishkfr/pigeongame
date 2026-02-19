import { Node, Faction } from './types';

export const generateMap = (): Node[] => {
  const nodes: Node[] = [];

  // --- 1. Balconies (6 Units: 2 Columns x 3 Rows) ---
  // Left Col: 0 (Top), 2 (Mid), 4 (Bot)
  // Right Col: 1 (Top), 3 (Mid), 5 (Bot)
  
  const balconies = [
    { id: 0, label: 'Apt 101', entryX: 25, entryY: 20, dirX: -1, dirY: -0.5 },
    { id: 1, label: 'Apt 102', entryX: 75, entryY: 20, dirX: 1, dirY: -0.5 },
    { id: 2, label: 'Apt 201', entryX: 25, entryY: 50, dirX: -1, dirY: 0 },
    { id: 3, label: 'Apt 202', entryX: 75, entryY: 50, dirX: 1, dirY: 0 },
    { id: 4, label: 'Apt 301', entryX: 25, entryY: 80, dirX: -1, dirY: 0.5 },
    { id: 5, label: 'Apt 302', entryX: 75, entryY: 80, dirX: 1, dirY: 0.5 },
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

      // Slot Nodes (Branching Path)
      // Entry -> Slot 1 -> Slot 2
      // Entry -> Slot 3 -> Slot 4
      // Entry -> Slot 5
      
      const slot1 = `balcony-${b.id}-slot-1`;
      const slot2 = `balcony-${b.id}-slot-2`;
      const slot3 = `balcony-${b.id}-slot-3`;
      const slot4 = `balcony-${b.id}-slot-4`;
      const slot5 = `balcony-${b.id}-slot-5`;

      const createSlot = (id: string, x: number, y: number, connections: string[]) => {
          nodes.push({
              id,
              type: 'BALCONY_SLOT',
              x,
              y,
              connections,
              balconyId: b.id
          });
          // Connect back
          connections.forEach(connId => {
              const conn = nodes.find(n => n.id === connId);
              if (conn && !conn.connections.includes(id)) conn.connections.push(id);
          });
      };

      // Layout logic: spread out from entry
      createSlot(slot1, b.entryX + (b.dirX * 5), b.entryY - 5, [entryId]);
      createSlot(slot2, b.entryX + (b.dirX * 10), b.entryY - 5, [slot1]);
      
      createSlot(slot3, b.entryX + (b.dirX * 5), b.entryY + 5, [entryId]);
      createSlot(slot4, b.entryX + (b.dirX * 10), b.entryY + 5, [slot3]);

      createSlot(slot5, b.entryX + (b.dirX * 8), b.entryY, [entryId]);
  });

  const entryIds = balconies.map(b => `balcony-${b.id}-entry`);

  // --- 2. Special Resource Hubs ---
  // Dumpster (Straw) - Top Left
  nodes.push({
      id: 'dumpster',
      type: 'DUMPSTER',
      x: 10, y: 10,
      connections: [],
      resourceType: 'STRAW'
  });

  // Park (Twigs) - Bottom Right
  nodes.push({
      id: 'park',
      type: 'PARK',
      x: 90, y: 90,
      connections: [],
      resourceType: 'TWIG'
  });

  // --- 3. Pigeon Wires (Connecting Balconies & Resources) ---
  const addWire = (fromId: string, toId: string, steps: number) => {
    let prevId = fromId;
    const fromNode = nodes.find(n => n.id === fromId)!;
    const toNode = nodes.find(n => n.id === toId)!;

    for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        const x = fromNode.x + (toNode.x - fromNode.x) * t;
        const y = fromNode.y + (toNode.y - fromNode.y) * t;
        const id = `wire-${fromId}-${toId}-${i}`;
        
        // Chance for Event on wire (higher chance now)
        const isEvent = Math.random() > 0.8;
        
        nodes.push({
            id,
            type: isEvent ? 'EVENT' : 'WIRE',
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

  // Connect Dumpster to Top Balconies
  addWire('dumpster', entryIds[0], 2);
  addWire('dumpster', entryIds[1], 4); // Long wire across top

  // Connect Park to Bottom Balconies
  addWire('park', entryIds[5], 2);
  addWire('park', entryIds[4], 4); // Long wire across bottom

  // Vertical Connections (Left Wing)
  addWire(entryIds[0], entryIds[2], 2);
  addWire(entryIds[2], entryIds[4], 2);
  
  // Vertical Connections (Right Wing)
  addWire(entryIds[1], entryIds[3], 2);
  addWire(entryIds[3], entryIds[5], 2);

  // Cross Connections (Zig Zag)
  addWire(entryIds[0], entryIds[3], 3);
  addWire(entryIds[2], entryIds[5], 3);
  addWire(entryIds[4], entryIds[1], 5); // Long diagonal

  // --- 4. Human Patrol Path (Outer Loop with Elevators) ---
  const patrolNodes = [
    { id: 'elevator-tl', x: 5, y: 5, type: 'ELEVATOR' },
    { id: 'road-top', x: 50, y: 5, type: 'ROAD' },
    { id: 'elevator-tr', x: 95, y: 5, type: 'ELEVATOR' },
    { id: 'road-right', x: 95, y: 50, type: 'ROAD' },
    { id: 'elevator-br', x: 95, y: 95, type: 'ELEVATOR' },
    { id: 'road-bottom', x: 50, y: 95, type: 'ROAD' },
    { id: 'elevator-bl', x: 5, y: 95, type: 'ELEVATOR' },
    { id: 'van-bl', x: 5, y: 80, type: 'VAN' }, // Van near BL elevator
    { id: 'road-left', x: 5, y: 50, type: 'ROAD' },
  ];

  patrolNodes.forEach(p => {
      nodes.push({
          id: p.id,
          type: p.type as any,
          x: p.x,
          y: p.y,
          connections: [],
          // Chance for coin on road
          resourceType: (p.type === 'ROAD' && Math.random() > 0.6) ? 'COIN' : undefined
      });
  });

  const connect = (id1: string, id2: string) => {
      const n1 = nodes.find(n => n.id === id1)!;
      const n2 = nodes.find(n => n.id === id2)!;
      n1.connections.push(id2);
      n2.connections.push(id1);
  };

  // Ring
  connect('elevator-tl', 'road-top');
  connect('road-top', 'elevator-tr');
  connect('elevator-tr', 'road-right');
  connect('road-right', 'elevator-br');
  connect('elevator-br', 'road-bottom');
  connect('road-bottom', 'elevator-bl');
  connect('elevator-bl', 'van-bl');
  connect('van-bl', 'road-left');
  connect('road-left', 'elevator-tl');

  // Connect to Balcony Entries (Access Points)
  // Humans access balconies from nearest road points
  connect('road-left', entryIds[2]); // Left Road -> Mid Left Balcony
  connect('road-right', entryIds[3]); // Right Road -> Mid Right Balcony
  connect('elevator-tl', entryIds[0]);
  connect('elevator-tr', entryIds[1]);
  connect('elevator-bl', entryIds[4]);
  connect('elevator-br', entryIds[5]);

  return nodes;
};

export const getValidMoves = (nodes: Node[], currentId: string, moves: number, faction: Faction): string[] => {
    const validTypes = faction === 'PIGEON' 
        ? ['WIRE', 'BALCONY_ENTRY', 'BALCONY_SLOT', 'PARK', 'DUMPSTER', 'EVENT'] 
        : ['ROAD', 'VAN', 'BALCONY_ENTRY', 'BALCONY_SLOT', 'ELEVATOR', 'EVENT'];

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
        ? ['WIRE', 'BALCONY_ENTRY', 'BALCONY_SLOT', 'PARK', 'DUMPSTER', 'EVENT'] 
        : ['ROAD', 'VAN', 'BALCONY_ENTRY', 'BALCONY_SLOT', 'ELEVATOR', 'EVENT'];
    
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
