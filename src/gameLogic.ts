import { Node, Faction } from './types';

export const generateMap = (): Node[] => {
  const nodes: Node[] = [];

  // --- 1. The 4 Big Balconies (Hubs) ---
  // Layout: Roughly a square in the middle
  const balconies = [
    { id: 'balcony-tl', x: 30, y: 30, label: 'Balcony 1' },
    { id: 'balcony-tr', x: 70, y: 30, label: 'Balcony 2' },
    { id: 'balcony-bl', x: 30, y: 70, label: 'Balcony 3' },
    { id: 'balcony-br', x: 70, y: 70, label: 'Balcony 4' },
  ];

  balconies.forEach(b => {
    nodes.push({
      id: b.id,
      type: 'BALCONY',
      x: b.x,
      y: b.y,
      connections: [],
      resource: false, // Balconies don't spawn resources, they are for building
      structures: [],
      maxStructures: 3
    });
  });

  // --- 2. Pigeon Wires (Inner Connections) ---
  // Connect TL-TR, TR-BR, BR-BL, BL-TL (Square) + Diagonals
  // We add "Wire Nodes" in between to make movement take steps
  
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
            connections: [prevId],
            resource: Math.random() > 0.3, // 70% chance of straw
            structures: [],
            maxStructures: 0 // Wires can't have structures
        });
        
        // Connect previous to this
        const prevNode = nodes.find(n => n.id === prevId)!;
        if (!prevNode.connections.includes(id)) prevNode.connections.push(id);

        prevId = id;
    }
    // Connect last wire node to target
    const lastNode = nodes.find(n => n.id === prevId)!;
    if (!lastNode.connections.includes(toId)) lastNode.connections.push(toId);
    const targetNode = nodes.find(n => n.id === toId)!;
    if (!targetNode.connections.includes(prevId)) targetNode.connections.push(prevId);
  };

  addWire('balcony-tl', 'balcony-tr', 2);
  addWire('balcony-tr', 'balcony-br', 2);
  addWire('balcony-br', 'balcony-bl', 2);
  addWire('balcony-bl', 'balcony-tl', 2);
  // Diagonal wires
  addWire('balcony-tl', 'balcony-br', 3);
  addWire('balcony-tr', 'balcony-bl', 3);

  // --- 3. Human Patrol Path (Outer Loop) ---
  // Circle around the balconies
  const patrolNodes = [
    { id: 'road-top', x: 50, y: 10 },
    { id: 'road-right', x: 90, y: 50 },
    { id: 'road-bottom', x: 50, y: 90 },
    { id: 'road-left', x: 10, y: 50 },
    // Corners
    { id: 'road-tl', x: 15, y: 15 },
    { id: 'road-tr', x: 85, y: 15 },
    { id: 'road-br', x: 85, y: 85 },
    { id: 'road-bl', x: 15, y: 85 },
  ];

  // The Van (Shop) is at road-top
  patrolNodes.forEach(p => {
      nodes.push({
          id: p.id,
          type: p.id === 'road-top' ? 'VAN' : 'ROAD',
          x: p.x,
          y: p.y,
          connections: [],
          resource: Math.random() > 0.5, // Money on the road
          structures: [],
          maxStructures: 1 // Roads can have spikes
      });
  });

  // Connect Patrol Path Ring
  const connect = (id1: string, id2: string) => {
      const n1 = nodes.find(n => n.id === id1)!;
      const n2 = nodes.find(n => n.id === id2)!;
      n1.connections.push(id2);
      n2.connections.push(id1);
  };

  connect('road-top', 'road-tr');
  connect('road-tr', 'road-right');
  connect('road-right', 'road-br');
  connect('road-br', 'road-bottom');
  connect('road-bottom', 'road-bl');
  connect('road-bl', 'road-left');
  connect('road-left', 'road-tl');
  connect('road-tl', 'road-top');

  // Connect Patrol Path to Balconies (Access Points)
  connect('road-tl', 'balcony-tl');
  connect('road-tr', 'balcony-tr');
  connect('road-br', 'balcony-br');
  connect('road-bl', 'balcony-bl');

  return nodes;
};

export const getValidMoves = (nodes: Node[], currentId: string, moves: number, faction: Faction): string[] => {
    // BFS to find all nodes exactly 'moves' steps away
    // Pigeons: Can use WIRE and BALCONY
    // Humans: Can use ROAD, VAN, and BALCONY
    
    const validTypes = faction === 'PIGEON' 
        ? ['WIRE', 'BALCONY'] 
        : ['ROAD', 'VAN', 'BALCONY'];

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
                    // We allow revisiting nodes in a path? Usually board games don't allow backtracking immediately, 
                    // but for simplicity let's just find reachable nodes at distance X.
                    // Actually, "must move exactly that number" usually implies a path of length X.
                    // Simple BFS for reachability:
                    nextLevel.add(neighborId);
                }
            }
        }
        currentLevel = Array.from(nextLevel);
    }
    
    return currentLevel;
};

export const getShortestPath = (nodes: Node[], startId: string, endId: string, faction: Faction): string[] => {
    // BFS for path reconstruction
    const validTypes = faction === 'PIGEON' ? ['WIRE', 'BALCONY'] : ['ROAD', 'VAN', 'BALCONY'];
    
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
                visited.add(neighborId);
                queue.push({ id: neighborId, path: [...path, neighborId] });
            }
        }
    }
    return [];
};
