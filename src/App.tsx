import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Bird, User, ShoppingBag, Home, Hammer, Skull, Zap, MapPin, Wind, TreePine, Trash2, ArrowUpFromLine, AlertCircle } from 'lucide-react';
import { GameState, PlayerState, Node, CLASSES, Faction, PlayerClass, LogEntry, MAX_ROUNDS, WINNING_NEST_COUNT_PER_BALCONY, VACUUM_COST, VACUUM_DURABILITY, PASSIVE_INCOME_HUMAN, NEST_COST_STRAW, NEST_COST_TWIG } from './types';
import { generateMap, getValidMoves, getShortestPath } from './gameLogic';

// --- Components ---

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] border border-stone-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, disabled, children, className = '', variant = 'primary', size = 'md' }: any) => {
  const baseStyle = "rounded-lg font-bold transform transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  
  const sizes = {
      sm: "px-2 py-1 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-lg"
  };

  const variants = {
    primary: "bg-terracotta text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black hover:bg-terracotta/90",
    secondary: "bg-turmeric text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black hover:bg-turmeric/90",
    outline: "bg-white border-2 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 shadow-none active:translate-y-0"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizes[size as keyof typeof sizes]} ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </button>
  );
};

const ActionLog = ({ logs }: { logs: LogEntry[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [logs]);

    return (
        <div className="bg-stone-100 rounded-lg border-2 border-stone-300 p-2 h-48 overflow-y-auto font-mono text-xs" ref={scrollRef}>
            <div className="flex flex-col gap-1">
                {logs.map((log) => (
                    <div key={log.id} className={`p-1 rounded border-l-2 pl-2 ${log.faction === 'PIGEON' ? 'border-terracotta bg-terracotta/5' : 'border-teal-dark bg-teal-dark/5'}`}>
                        <span className="opacity-50 mr-2">R{log.round}</span>
                        {log.text}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Game Component ---

export default function Game() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'INITIATIVE',
    turnIndex: 0,
    round: 1,
    diceRoll: null,
    movesLeft: 0,
    hasActed: false,
    logs: [],
    winner: null
  });

  const [nodes, setNodes] = useState<Node[]>([]);
  
  const [players, setPlayers] = useState<PlayerState[]>([
    { faction: 'PIGEON', classId: '', resources: 0, currentNodeId: 'balcony-0-entry', inventory: {}, initiative: 0 },
    { faction: 'HUMAN', classId: '', resources: 5, currentNodeId: 'road-bottom', inventory: {}, initiative: 0 }
  ]);

  const [validMoveTargets, setValidMoveTargets] = useState<string[]>([]);
  const [floatingText, setFloatingText] = useState<{ id: string, text: string, x: number, y: number }[]>([]);

  // --- Helpers ---

  // Deep copy helper to avoid state mutation
  const deepCopyPlayers = (currentPlayers: PlayerState[]): PlayerState[] => {
      return currentPlayers.map(p => ({
          ...p,
          inventory: {
              ...p.inventory,
              vacuum: p.inventory.vacuum ? { ...p.inventory.vacuum } : undefined
          }
      }));
  };

  const addLog = (text: string, faction: Faction) => {
      setGameState(prev => ({
          ...prev,
          logs: [...prev.logs, { id: Math.random().toString(36), text, faction, round: prev.round }]
      }));
  };

  const showFloatingText = (text: string, nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const id = Math.random().toString(36);
      setFloatingText(prev => [...prev, { id, text, x: node.x, y: node.y }]);
      setTimeout(() => {
          setFloatingText(prev => prev.filter(ft => ft.id !== id));
      }, 1500);
  };

  const handleEvent = (node: Node, player: PlayerState) => {
      const roll = Math.random();
      if (player.faction === 'PIGEON') {
          if (roll > 0.5) {
              player.inventory.straw++;
              player.inventory.twig++;
              showFloatingText("Lucky Find!", node.id);
              addLog("Event: Found discarded nest materials!", 'PIGEON');
          } else {
              addLog("Event: Just a nice view.", 'PIGEON');
          }
      } else {
          if (roll > 0.7) {
              player.inventory.coins = Math.max(0, player.inventory.coins - 1);
              showFloatingText("-1 Coin", node.id);
              addLog("Event: Dropped a coin!", 'HUMAN');
          } else {
              addLog("Event: Quiet patrol.", 'HUMAN');
          }
      }
  };

  const currentPlayer = players[gameState.turnIndex];
  const currentClass = CLASSES.find(c => c.id === currentPlayer.classId);

  // --- Game Loop ---

  const startGame = (pigeonClass: string, humanClass: string) => {
    const map = generateMap();
    setNodes(map);
    
    setPlayers([
        { faction: 'PIGEON', classId: pigeonClass, resources: 0, currentNodeId: 'balcony-0-entry', inventory: {}, initiative: 0 },
        { faction: 'HUMAN', classId: humanClass, resources: 5, currentNodeId: 'road-bottom', inventory: {}, initiative: 0 }
    ]);
    
    setGameState({
      phase: 'INITIATIVE',
      turnIndex: 0,
      round: 1,
      diceRoll: null,
      movesLeft: 0,
      hasActed: false,
      logs: [],
      winner: null
    });
    
    addLog("Game Started! Rolling for Initiative...", 'PIGEON');
  };

  const rollInitiative = () => {
      const p1Roll = Math.floor(Math.random() * 6) + 1;
      const p2Roll = Math.floor(Math.random() * 6) + 1;
      
      const newPlayers = [...players];
      newPlayers[0].initiative = p1Roll;
      newPlayers[1].initiative = p2Roll;
      setPlayers(newPlayers);

      addLog(`Pigeon rolled ${p1Roll}, Human rolled ${p2Roll}`, 'PIGEON');

      if (p1Roll === p2Roll) {
          addLog("Tie! Re-rolling...", 'PIGEON');
          return;
      }

      const winnerIndex = p1Roll > p2Roll ? 0 : 1;
      setGameState(prev => ({
          ...prev,
          phase: 'ROLL',
          turnIndex: winnerIndex
      }));
      addLog(`${newPlayers[winnerIndex].faction} goes first!`, newPlayers[winnerIndex].faction);
  };

  const rollDice = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const cls = CLASSES.find(c => c.id === currentPlayer.classId)!;
    const modifiedRoll = Math.max(1, roll + (cls.stats.speed || 0));

    setGameState(prev => ({
      ...prev,
      phase: 'MOVE',
      diceRoll: modifiedRoll,
      movesLeft: modifiedRoll
    }));
    
    addLog(`Rolled a ${roll} (${modifiedRoll} total).`, currentPlayer.faction);

    // Calculate valid moves
    const targets = getValidMoves(nodes, currentPlayer.currentNodeId, modifiedRoll, currentPlayer.faction);
    setValidMoveTargets(targets);
    
    if (targets.length === 0) {
        addLog("No valid moves! Turn skipped.", currentPlayer.faction);
        endTurn();
    }
  };

  const handleNodeClick = async (nodeId: string) => {
      // Special: Elevator Teleport (Human only, during MOVE, if on Elevator)
      if (gameState.phase === 'MOVE' && currentPlayer.faction === 'HUMAN') {
          const currentNode = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
          const targetNode = nodes.find(n => n.id === nodeId)!;
          
          if (currentNode.type === 'ELEVATOR' && targetNode.type === 'ELEVATOR' && currentNode.id !== targetNode.id) {
              if (currentPlayer.inventory.coins >= 1) {
                  // Teleport
                  const newPlayers = [...players];
                  newPlayers[gameState.turnIndex].inventory.coins -= 1;
                  newPlayers[gameState.turnIndex].currentNodeId = nodeId;
                  setPlayers(newPlayers);
                  
                  showFloatingText("-1 Coin (Elevator)", nodeId);
                  addLog("Used Elevator!", 'HUMAN');
                  
                  // Recalculate moves from new location
                  const targets = getValidMoves(nodes, nodeId, gameState.movesLeft, currentPlayer.faction);
                  setValidMoveTargets(targets);
                  return;
              } else {
                  addLog("Need 1 Coin for Elevator.", 'HUMAN');
              }
          }
      }

      if (gameState.phase !== 'MOVE' || !validMoveTargets.includes(nodeId)) return;

      // Animate movement along path
      const path = getShortestPath(nodes, currentPlayer.currentNodeId, nodeId, currentPlayer.faction);
      
      let newPlayers = [...players];
      let newNodes = [...nodes];
      let player = newPlayers[gameState.turnIndex];
      let collectedLog: string[] = [];

      // Walk path
      path.slice(1).forEach(stepId => {
          const n = nodes.find(n => n.id === stepId)!;
          
          // Sticky Trap Check (Pigeon only)
          if (player.faction === 'PIGEON' && n.structure?.type === 'STICKY_TRAP') {
              addLog("Stepped on Sticky Trap! Movement stopped.", 'PIGEON');
              showFloatingText("TRAPPED!", n.id);
              // Destroy trap
              n.structure = undefined;
              // Stop movement here
              player.currentNodeId = stepId;
              setGameState(prev => ({ ...prev, movesLeft: 0 }));
              // Force end of loop by setting nodeId to current step
              nodeId = stepId; 
              return; 
          }

          // Resource Collection
          if (player.faction === 'HUMAN' && n.resourceType === 'COIN') {
              player.inventory.coins++;
              showFloatingText("+1 Coin", n.id);
              collectedLog.push("Coin");
              // Consume coin (update node in local state for this move, will be committed at end)
              const nodeIndex = newNodes.findIndex(node => node.id === n.id);
              if (nodeIndex !== -1) {
                  newNodes[nodeIndex] = { ...newNodes[nodeIndex], resourceType: undefined };
              }
          }

          // Events
          if (n.type === 'EVENT' && stepId === nodeId) { // Only trigger event if ending turn on it
              handleEvent(n, player);
          }
      });

      if (collectedLog.length > 0) {
          addLog(`Collected: ${collectedLog.join(', ')}`, player.faction);
      }

      player.currentNodeId = nodeId;
      setPlayers(newPlayers);
      setNodes(newNodes);
      setValidMoveTargets([]);

      setGameState(prev => ({
          ...prev,
          phase: 'ACTION',
          movesLeft: 0
      }));
  };

  const placeStickyTrap = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') { addLog("Must be in a balcony slot!", currentPlayer.faction); return; }
      if (node.structure) { addLog("Space occupied!", currentPlayer.faction); return; }

      if (currentPlayer.inventory.coins < 2) {
          addLog("Need 2 Coins.", currentPlayer.faction);
          return;
      }

      performAction("Placed Sticky Trap", () => {
          const newPlayers = [...players];
          newPlayers[gameState.turnIndex].inventory.coins -= 2;
          setPlayers(newPlayers);
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: { type: 'STICKY_TRAP', owner: 'HUMAN' } } : n));
      });
  };

  const gatherResources = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      
      if (node.type === 'DUMPSTER') {
          performAction("Gathered Straw", () => {
              const newPlayers = deepCopyPlayers(players);
              newPlayers[gameState.turnIndex].inventory.straw += 2;
              setPlayers(newPlayers);
              showFloatingText("+2 Straw", node.id);
          });
      } else if (node.type === 'PARK') {
          performAction("Gathered Twigs", () => {
              const newPlayers = deepCopyPlayers(players);
              newPlayers[gameState.turnIndex].inventory.twig += 2;
              setPlayers(newPlayers);
              showFloatingText("+2 Twigs", node.id);
          });
      }
  };

  const performAction = (actionName: string, effect: () => void) => {
      if (gameState.hasActed) {
          addLog("Already acted this turn!", currentPlayer.faction);
          return;
      }
      
      effect();
      
      setGameState(prev => ({ ...prev, hasActed: true }));
      addLog(actionName, currentPlayer.faction);
  };

  const buildNest = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') { addLog("Must be in a balcony slot!", currentPlayer.faction); return; }
      if (node.structure) { addLog("Space occupied!", currentPlayer.faction); return; }

      const cls = CLASSES.find(c => c.id === currentPlayer.classId)!;
      const strawCost = cls.id === 'chonk' ? 0 : NEST_COST_STRAW;
      const twigCost = NEST_COST_TWIG;

      if (currentPlayer.inventory.straw < strawCost || currentPlayer.inventory.twig < twigCost) {
          addLog(`Need ${strawCost} Straw, ${twigCost} Twig.`, currentPlayer.faction);
          return;
      }

      performAction("Built Nest", () => {
          const newPlayers = [...players];
          newPlayers[gameState.turnIndex].inventory.straw -= strawCost;
          newPlayers[gameState.turnIndex].inventory.twig -= twigCost;
          setPlayers(newPlayers);

          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: { type: 'NEST', owner: 'PIGEON' } } : n));
          checkWin();
      });
  };

  const placeProp = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') { addLog("Must be in a balcony slot!", currentPlayer.faction); return; }
      if (node.structure) { addLog("Space occupied!", currentPlayer.faction); return; }

      if (currentPlayer.inventory.coins < 2) {
          addLog("Need 2 Coins.", currentPlayer.faction);
          return;
      }

      performAction("Placed Prop", () => {
          const newPlayers = [...players];
          newPlayers[gameState.turnIndex].inventory.coins -= 2;
          setPlayers(newPlayers);
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: { type: 'PROP', owner: 'HUMAN' } } : n));
      });
  };

  const buyVacuum = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'VAN') return;
      
      if (currentPlayer.inventory.coins < VACUUM_COST) {
          addLog(`Need ${VACUUM_COST} Coins.`, currentPlayer.faction);
          return;
      }

      performAction("Bought Vacuum", () => {
          const newPlayers = [...players];
          newPlayers[gameState.turnIndex].inventory.coins -= VACUUM_COST;
          newPlayers[gameState.turnIndex].inventory.vacuum = { turnsLeft: VACUUM_DURABILITY };
          setPlayers(newPlayers);
      });
  };

  const destroyNest = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') return;
      if (node.structure?.type !== 'NEST') { addLog("No nest here.", currentPlayer.faction); return; }

      if (!currentPlayer.inventory.vacuum) {
          addLog("Need Vacuum Cleaner!", currentPlayer.faction);
          return;
      }

      performAction("Vacuumed Nest", () => {
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: undefined } : n));
          
          const newPlayers = [...players];
          const vac = newPlayers[gameState.turnIndex].inventory.vacuum!;
          vac.turnsLeft--;
          if (vac.turnsLeft <= 0) {
              delete newPlayers[gameState.turnIndex].inventory.vacuum;
              addLog("Vacuum broke!", currentPlayer.faction);
          }
          setPlayers(newPlayers);
      });
  };

  const placeSpikes = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') { addLog("Must be in a balcony slot!", currentPlayer.faction); return; }
      if (node.structure) { addLog("Space occupied!", currentPlayer.faction); return; }

      if (currentPlayer.inventory.coins < 1) {
          addLog("Need 1 Coin.", currentPlayer.faction);
          return;
      }

      performAction("Placed Spikes", () => {
          const newPlayers = [...players];
          newPlayers[gameState.turnIndex].inventory.coins -= 1;
          setPlayers(newPlayers);
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: { type: 'SPIKES', owner: 'HUMAN' } } : n));
      });
  };

  const checkWin = () => {
      // Check if any balcony has 3 nests
      // Group nodes by balconyId
      const balconyCounts: Record<number, number> = {};
      nodes.forEach(n => {
          if (n.type === 'BALCONY_SLOT' && n.structure?.type === 'NEST' && n.balconyId !== undefined) {
              balconyCounts[n.balconyId] = (balconyCounts[n.balconyId] || 0) + 1;
          }
      });
      
      if (Object.values(balconyCounts).some(count => count >= 3)) {
          setGameState(prev => ({ ...prev, phase: 'GAME_OVER', winner: 'PIGEON' }));
      }
  };

  const endTurn = () => {
      const nextIndex = (gameState.turnIndex + 1) % 2;
      let nextRound = gameState.round;
      
      const newPlayers = deepCopyPlayers(players);
      
      // Human Vacuum Decay
      if (currentPlayer.faction === 'HUMAN' && currentPlayer.inventory.vacuum) {
          const humanPlayer = newPlayers.find(p => p.faction === 'HUMAN');
          if (humanPlayer && humanPlayer.inventory.vacuum) {
              humanPlayer.inventory.vacuum.turnsLeft--;
              if (humanPlayer.inventory.vacuum.turnsLeft <= 0) {
                  delete humanPlayer.inventory.vacuum;
                  addLog("Vacuum rental expired!", 'HUMAN');
              }
          }
      }
      
      if (nextIndex === 0) { 
          nextRound++;
          // Passive Income - HUMAN ONLY
          const human = newPlayers.find(p => p.faction === 'HUMAN')!;
          const hClass = CLASSES.find(c => c.id === human.classId)!;
          let income = PASSIVE_INCOME_HUMAN;
          if (hClass.id === 'uncle') income += 1;
          
          human.inventory.coins += income;
          addLog(`Round End. Human gets +${income} Coins.`, 'HUMAN');
      }

      setPlayers(newPlayers);

      if (nextRound > MAX_ROUNDS) {
          setGameState(prev => ({ ...prev, phase: 'GAME_OVER', winner: 'HUMAN' }));
          return;
      }

      setGameState(prev => ({
          ...prev,
          phase: 'ROLL',
          turnIndex: nextIndex,
          round: nextRound,
          diceRoll: null,
          movesLeft: 0,
          hasActed: false
      }));
  };

  // --- Render Helpers ---

  if (gameState.phase === 'INITIATIVE') {
      return (
          <div className="min-h-screen bg-off-white flex flex-col items-center justify-center">
              <h1 className="text-4xl font-black text-terracotta mb-8">Roll for Initiative</h1>
              <div className="flex gap-8">
                  <div className="text-center">
                      <Bird size={64} className="text-terracotta mx-auto mb-4" />
                      <div className="text-2xl font-bold">{players[0].initiative || '-'}</div>
                  </div>
                  <div className="text-center">
                      <User size={64} className="text-teal-dark mx-auto mb-4" />
                      <div className="text-2xl font-bold">{players[1].initiative || '-'}</div>
                  </div>
              </div>
              <Button onClick={rollInitiative} size="lg" className="mt-8">ROLL</Button>
          </div>
      );
  }
  
  if (gameState.phase === 'GAME_OVER') {
      return (
          <div className="min-h-screen bg-off-white flex flex-col items-center justify-center text-center">
              <h1 className="text-6xl font-black mb-4">{gameState.winner} WINS!</h1>
              <Button onClick={() => window.location.reload()} size="lg">Play Again</Button>
          </div>
      );
  }
  
  if (!currentClass) return <ClassSelection onSelect={startGame} />;

  return (
    <div className="min-h-screen bg-off-white text-teal-dark p-4 font-sans flex flex-col items-center overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black text-terracotta uppercase">Kabootar vs Khiladi</h1>
        <div className="flex gap-4">
            {players.map((p, i) => (
                <div key={i} className={`px-4 py-2 rounded-lg border-2 shadow-sm flex items-center gap-2 transition-all ${gameState.turnIndex === i ? 'scale-110 border-black ring-2 ring-yellow-400' : 'opacity-60'}`}>
                    {p.faction === 'PIGEON' ? <Bird /> : <User />}
                    <span className="font-bold">{p.resources}</span>
                    {p.inventory.vacuum && <Wind size={16} className="text-blue-500" />}
                </div>
            ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl h-[calc(100vh-100px)]">
        
        {/* Map */}
        <div className="flex-1 bg-stone-200 rounded-3xl border-4 border-stone-300 shadow-inner relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {/* Balcony Containers (Visual) */}
            {Array.from(new Set(nodes.map(n => n.balconyId).filter(id => id !== undefined))).map(id => {
                const balconyNodes = nodes.filter(n => n.balconyId === id);
                if (balconyNodes.length === 0) return null;

                const minX = Math.min(...balconyNodes.map(n => n.x));
                const maxX = Math.max(...balconyNodes.map(n => n.x));
                const minY = Math.min(...balconyNodes.map(n => n.y));
                const maxY = Math.max(...balconyNodes.map(n => n.y));

                // Add padding
                const left = minX - 4;
                const top = minY - 4;
                const width = (maxX - minX) + 8;
                const height = (maxY - minY) + 8;

                return (
                    <div key={id} className="absolute bg-white/50 border-2 border-stone-400 rounded-3xl" 
                        style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`
                        }}>
                        <span className="absolute -top-3 left-4 bg-stone-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">Apt {Math.floor((id as number)/2) + 1}0{(id as number)%2 + 1}</span>
                    </div>
                );
            })}

            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {nodes.map(node => 
                    node.connections.map(targetId => {
                        const target = nodes.find(n => n.id === targetId)!;
                        if (node.id > target.id) return null;
                        
                        const isWire = node.type === 'WIRE' || target.type === 'WIRE';
                        const isBalconyPath = node.type.includes('BALCONY') && target.type.includes('BALCONY');
                        
                        return (
                            <line 
                                key={`${node.id}-${target.id}`}
                                x1={`${node.x}%`} y1={`${node.y}%`}
                                x2={`${target.x}%`} y2={`${target.y}%`}
                                stroke={isWire ? "black" : isBalconyPath ? "#d6d3d1" : "#666"}
                                strokeWidth={isWire ? "2" : isBalconyPath ? "12" : "8"}
                                strokeLinecap="round"
                                className={isBalconyPath ? "" : "opacity-50"}
                            />
                        );
                    })
                )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
                const isTarget = validMoveTargets.includes(node.id);
                const isEntry = node.type === 'BALCONY_ENTRY';
                const isSlot = node.type === 'BALCONY_SLOT';
                const isVan = node.type === 'VAN';
                const isPark = node.type === 'PARK';
                const isDumpster = node.type === 'DUMPSTER';
                const isElevator = node.type === 'ELEVATOR';
                const isEvent = node.type === 'EVENT';
                
                return (
                    <motion.div
                        key={node.id}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center
                            ${isEntry ? 'w-6 h-6 rounded-full bg-stone-300 border-2 border-stone-500' : ''}
                            ${isSlot ? 'w-8 h-8 rounded-md bg-white border-2 border-stone-300 shadow-sm' : ''}
                            ${isVan ? 'w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-500 shadow-md' : ''}
                            ${isPark ? 'w-10 h-10 rounded-full bg-green-100 border-2 border-green-600' : ''}
                            ${isDumpster ? 'w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-600' : ''}
                            ${isElevator ? 'w-8 h-8 rounded bg-gray-700 border-2 border-gray-900 text-white' : ''}
                            ${isEvent ? 'w-4 h-4 rounded-full bg-purple-500 animate-pulse' : ''}
                            ${node.type === 'WIRE' ? 'w-2 h-2 rounded-full bg-black' : ''}
                            ${node.type === 'ROAD' ? 'w-4 h-4 rounded-full bg-stone-400' : ''}
                            ${isTarget ? 'ring-4 ring-green-400 cursor-pointer z-20 scale-125' : ''}
                        `}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        onClick={() => handleNodeClick(node.id)}
                        whileHover={isTarget ? { scale: 1.2 } : {}}
                    >
                        {isVan && <ShoppingBag size={16} className="text-blue-600" />}
                        {isPark && <TreePine size={20} className="text-green-700" />}
                        {isDumpster && <Trash2 size={20} className="text-amber-700" />}
                        {isElevator && <ArrowUpFromLine size={16} />}
                        {isEvent && <AlertCircle size={10} className="text-white" />}
                        
                        {/* Structures */}
                        {node.structure && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {node.structure.type === 'NEST' && <Home className="text-terracotta w-5 h-5" />}
                                {node.structure.type === 'PROP' && <Hammer className="text-teal-dark w-5 h-5" />}
                                {node.structure.type === 'SPIKES' && <Skull className="text-gray-600 w-5 h-5" />}
                                {node.structure.type === 'STICKY_TRAP' && <div className="w-5 h-5 bg-yellow-400 rounded-full opacity-80 border border-yellow-600" />}
                            </div>
                        )}
                    </motion.div>
                );
            })}

            {/* Players */}
            <AnimatePresence>
                {players.map(p => {
                    const node = nodes.find(n => n.id === p.currentNodeId);
                    if (!node) return null;
                    return (
                        <motion.div
                            key={p.faction}
                            layoutId={p.faction}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-30
                                ${p.faction === 'PIGEON' ? 'bg-terracotta text-white' : 'bg-teal-dark text-white'}
                            `}
                            initial={false}
                            animate={{ left: `${node.x}%`, top: `${node.y}%` }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        >
                            {p.faction === 'PIGEON' ? <Bird size={16} /> : <User size={16} />}
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Floating Text */}
            <AnimatePresence>
                {floatingText.map(ft => (
                    <motion.div
                        key={ft.id}
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: -30 }}
                        exit={{ opacity: 0 }}
                        className="absolute text-xs font-bold text-black bg-white px-2 py-1 rounded shadow-md pointer-events-none z-50"
                        style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
                    >
                        {ft.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
            <Card className="p-6 bg-white flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black uppercase flex items-center gap-2">
                        {currentPlayer.faction === 'PIGEON' ? <Bird className="text-terracotta" /> : <User className="text-teal-dark" />}
                        {currentPlayer.faction} Turn
                    </h2>
                    {gameState.diceRoll && <div className="text-2xl font-mono font-bold">{gameState.diceRoll}</div>}
                </div>

                <div className="flex-1 space-y-3">
                    {gameState.phase === 'ROLL' && (
                        <Button onClick={rollDice} size="lg" className="w-full py-8">ROLL DICE</Button>
                    )}
                    
                    {gameState.phase === 'MOVE' && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg text-blue-800 font-bold">
                            Select a highlighted node to move {gameState.movesLeft} steps.
                        </div>
                    )}

                    {gameState.phase === 'ACTION' && (
                        <div className="grid grid-cols-2 gap-2">
                            {currentPlayer.faction === 'PIGEON' ? (
                                <>
                                    {nodes.find(n => n.id === currentPlayer.currentNodeId)?.type === 'DUMPSTER' && (
                                        <Button onClick={gatherResources} className="col-span-2 bg-amber-600 hover:bg-amber-700">Gather Straw (+2)</Button>
                                    )}
                                    {nodes.find(n => n.id === currentPlayer.currentNodeId)?.type === 'PARK' && (
                                        <Button onClick={gatherResources} className="col-span-2 bg-green-600 hover:bg-green-700">Gather Twigs (+2)</Button>
                                    )}
                                    <Button onClick={buildNest} className="col-span-2">Build Nest (2)</Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={placeProp}>Place Prop (2)</Button>
                                    <Button onClick={buyVacuum} variant="secondary">Buy Vacuum (5)</Button>
                                    <Button onClick={destroyNest} variant="outline" className="col-span-2 text-red-600 border-red-200">Vacuum Nest</Button>
                                    <Button onClick={placeSpikes} variant="outline" className="flex flex-col items-center">
                                        <span>Place Spikes</span>
                                        <span className="text-[10px] opacity-80">1 Coin</span>
                                    </Button>
                                    <Button onClick={placeStickyTrap} variant="outline" className="flex flex-col items-center">
                                        <span>Sticky Trap</span>
                                        <span className="text-[10px] opacity-80">2 Coins</span>
                                    </Button>
                                </>
                            )}
                            <Button onClick={endTurn} variant="ghost" className="col-span-2">End Turn</Button>
                        </div>
                    )}
                </div>
            </Card>
            <ActionLog logs={gameState.logs} />
        </div>
      </div>
    </div>
  );
}

const ClassSelection = ({ onSelect }: { onSelect: (p: string, h: string) => void }) => {
    const [selectedPigeon, setSelectedPigeon] = useState(CLASSES[0].id);
    const [selectedHuman, setSelectedHuman] = useState(CLASSES[2].id);

    return (
        <div className="min-h-screen bg-off-white p-8 flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold mb-8">CHOOSE YOUR FIGHTER</h2>
            <div className="flex gap-8 mb-8">
                <div className="space-y-2">
                    {CLASSES.filter(c => c.faction === 'PIGEON').map(c => (
                        <div key={c.id} onClick={() => setSelectedPigeon(c.id)} className={`p-4 border-2 rounded-lg cursor-pointer ${selectedPigeon === c.id ? 'border-terracotta bg-terracotta/10' : 'bg-white'}`}>
                            <div className="font-bold">{c.name}</div>
                            <div className="text-xs">{c.ability}</div>
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    {CLASSES.filter(c => c.faction === 'HUMAN').map(c => (
                        <div key={c.id} onClick={() => setSelectedHuman(c.id)} className={`p-4 border-2 rounded-lg cursor-pointer ${selectedHuman === c.id ? 'border-teal-dark bg-teal-dark/10' : 'bg-white'}`}>
                            <div className="font-bold">{c.name}</div>
                            <div className="text-xs">{c.ability}</div>
                        </div>
                    ))}
                </div>
            </div>
            <Button onClick={() => onSelect(selectedPigeon, selectedHuman)} size="lg">START GAME</Button>
        </div>
    );
};
