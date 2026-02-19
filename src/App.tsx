import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Bird, User, ShoppingBag, Home, Hammer, Skull, Zap, MapPin, Wind } from 'lucide-react';
import { GameState, PlayerState, Node, CLASSES, Faction, PlayerClass, LogEntry, MAX_ROUNDS, WINNING_NEST_COUNT_PER_BALCONY, VACUUM_COST, VACUUM_DURABILITY } from './types';
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

  // --- Helpers ---

  const addLog = (text: string, faction: Faction) => {
      setGameState(prev => ({
          ...prev,
          logs: [...prev.logs, { id: Math.random().toString(36), text, faction, round: prev.round }]
      }));
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
      if (gameState.phase !== 'MOVE' || !validMoveTargets.includes(nodeId)) return;

      // Animate movement along path
      const path = getShortestPath(nodes, currentPlayer.currentNodeId, nodeId, currentPlayer.faction);
      
      // Simulate step-by-step movement (visual only for now, logic is instant)
      // In a real game we'd await each step. For prototype, we jump but collect resources.
      
      let collected = 0;
      let newNodes = [...nodes];
      
      // Check resources along path (excluding start)
      path.slice(1).forEach(stepId => {
          const n = newNodes.find(n => n.id === stepId)!;
          if (n.resource && currentPlayer.faction === 'PIGEON') {
              collected++;
              n.resource = false; // Consume
          }
      });

      if (collected > 0) {
          addLog(`Collected ${collected} straw/seeds along the way.`, currentPlayer.faction);
      }

      const newPlayers = [...players];
      newPlayers[gameState.turnIndex].currentNodeId = nodeId;
      newPlayers[gameState.turnIndex].resources += collected;
      setPlayers(newPlayers);
      setNodes(newNodes);
      setValidMoveTargets([]);

      setGameState(prev => ({
          ...prev,
          phase: 'ACTION',
          movesLeft: 0
      }));
  };

  const performAction = (actionName: string, cost: number, effect: () => void) => {
      if (gameState.hasActed) {
          addLog("Already acted this turn!", currentPlayer.faction);
          return;
      }
      if (currentPlayer.resources < cost) {
          addLog(`Need ${cost} resources.`, currentPlayer.faction);
          return;
      }

      const newPlayers = [...players];
      newPlayers[gameState.turnIndex].resources -= cost;
      setPlayers(newPlayers);
      
      effect();
      
      setGameState(prev => ({ ...prev, hasActed: true }));
      addLog(actionName, currentPlayer.faction);
  };

  const buildNest = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') { addLog("Must be in a balcony slot!", currentPlayer.faction); return; }
      if (node.structure) { addLog("Space occupied!", currentPlayer.faction); return; }

      const cls = CLASSES.find(c => c.id === currentPlayer.classId)!;
      const cost = cls.id === 'chonk' ? 1 : 2;

      performAction("Built Nest", cost, () => {
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: { type: 'NEST', owner: 'PIGEON' } } : n));
          checkWin();
      });
  };

  const placeProp = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') { addLog("Must be in a balcony slot!", currentPlayer.faction); return; }
      if (node.structure) { addLog("Space occupied!", currentPlayer.faction); return; }

      performAction("Placed Prop", 2, () => {
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: { type: 'PROP', owner: 'HUMAN' } } : n));
      });
  };

  const buyVacuum = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'VAN') return;
      
      performAction("Bought Vacuum", VACUUM_COST, () => {
          const newPlayers = [...players];
          newPlayers[gameState.turnIndex].inventory.vacuum = { turnsLeft: VACUUM_DURABILITY };
          setPlayers(newPlayers);
      });
  };

  const destroyNest = () => {
      const node = nodes.find(n => n.id === currentPlayer.currentNodeId)!;
      if (node.type !== 'BALCONY_SLOT') return;
      if (node.structure?.type !== 'NEST') { addLog("No nest here.", currentPlayer.faction); return; }

      if (!currentPlayer.inventory.vacuum) {
          addLog("Need Vacuum Cleaner to destroy nests!", currentPlayer.faction);
          return;
      }

      performAction("Vacuumed Nest", 0, () => {
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, structure: undefined } : n));
          
          // Reduce durability
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

      performAction("Placed Spikes", 1, () => {
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
      
      // Handle Vacuum Shelf-Life (Decrement at end of Human turn)
      const newPlayers = [...players];
      if (currentPlayer.faction === 'HUMAN' && currentPlayer.inventory.vacuum) {
          currentPlayer.inventory.vacuum.turnsLeft--;
          if (currentPlayer.inventory.vacuum.turnsLeft <= 0) {
              delete currentPlayer.inventory.vacuum;
              addLog("Vacuum rental expired!", 'HUMAN');
          }
      }
      
      if (nextIndex === 0) { 
          nextRound++;
          // Passive Income
          newPlayers.forEach(p => {
              p.resources += 1;
              const cls = CLASSES.find(c => c.id === p.classId)!;
              if (cls.stats.resourceGain > 0) p.resources += cls.stats.resourceGain;
          });
          setPlayers(newPlayers);
          addLog("Round End. Passive Income distributed.", 'HUMAN');
      } else {
          setPlayers(newPlayers); // Update players if no round change (for vacuum)
      }

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
            {[0, 1, 2, 3].map(id => {
                // Hardcoded positions based on generateMap logic for simplicity
                const positions = [
                    { left: '15%', top: '15%', width: '30%', height: '30%' }, // TL (approx)
                    { left: '55%', top: '15%', width: '30%', height: '30%' }, // TR
                    { left: '15%', top: '55%', width: '30%', height: '30%' }, // BL
                    { left: '55%', top: '55%', width: '30%', height: '30%' }, // BR
                ];
                return (
                    <div key={id} className="absolute bg-white/50 border-2 border-stone-400 rounded-3xl" style={positions[id]}>
                        <span className="absolute -top-3 left-4 bg-stone-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">Balcony {id + 1}</span>
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
                
                return (
                    <motion.div
                        key={node.id}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center
                            ${isEntry ? 'w-8 h-8 rounded-full bg-stone-300 border-2 border-stone-500' : ''}
                            ${isSlot ? 'w-10 h-10 rounded-md bg-white border-2 border-stone-300 shadow-sm' : ''}
                            ${isVan ? 'w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-500 shadow-md' : ''}
                            ${node.type === 'WIRE' ? 'w-3 h-3 rounded-full bg-black' : ''}
                            ${node.type === 'ROAD' ? 'w-6 h-6 rounded-full bg-stone-400' : ''}
                            ${isTarget ? 'ring-4 ring-green-400 cursor-pointer z-20 scale-110' : ''}
                        `}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        onClick={() => handleNodeClick(node.id)}
                        whileHover={isTarget ? { scale: 1.2 } : {}}
                    >
                        {isVan && <ShoppingBag size={16} className="text-blue-600" />}
                        {node.resource && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse absolute z-10" />}
                        
                        {/* Structures */}
                        {node.structure && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {node.structure.type === 'NEST' && <Home className="text-terracotta w-6 h-6" />}
                                {node.structure.type === 'PROP' && <Hammer className="text-teal-dark w-6 h-6" />}
                                {node.structure.type === 'SPIKES' && <Skull className="text-gray-600 w-6 h-6" />}
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
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-30
                                ${p.faction === 'PIGEON' ? 'bg-terracotta text-white' : 'bg-teal-dark text-white'}
                            `}
                            initial={false}
                            animate={{ left: `${node.x}%`, top: `${node.y}%` }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        >
                            {p.faction === 'PIGEON' ? <Bird size={20} /> : <User size={20} />}
                        </motion.div>
                    );
                })}
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
                                    <Button onClick={buildNest} className="col-span-2">Build Nest (2)</Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={placeProp}>Place Prop (2)</Button>
                                    <Button onClick={buyVacuum} variant="secondary">Buy Vacuum (5)</Button>
                                    <Button onClick={destroyNest} variant="outline" className="col-span-2 text-red-600 border-red-200">Vacuum Nest</Button>
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
