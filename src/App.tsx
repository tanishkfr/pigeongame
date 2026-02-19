import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Bird, User, ShoppingBag, AlertTriangle, Home, Hammer, Footprints, ScrollText, Skull, ShieldBan, Zap } from 'lucide-react';
import { GameState, PlayerState, Tile, CLASSES, Faction, BALCONY_SIZE, NUM_BALCONIES, PlayerClass, LogEntry, MAX_ROUNDS, WINNING_NEST_COUNT } from './types';
import { generateBoard, getTileAt, isValidStep, isAdjacent, getPushTarget } from './gameLogic';

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
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
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
                {logs.length === 0 && <div className="text-gray-400 italic text-center mt-4">Game started...</div>}
            </div>
        </div>
    );
};

// --- Main Game Component ---

export default function Game() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'MENU',
    turn: 'PIGEON',
    round: 1,
    diceRoll: null,
    movesLeft: 0,
    actionPoints: 0,
    logs: [],
    winner: null
  });

  const [tiles, setTiles] = useState<Tile[]>([]);
  
  const [pigeonPlayer, setPigeonPlayer] = useState<PlayerState>({
    faction: 'PIGEON',
    classId: '',
    resources: 0,
    position: { balconyId: 0, row: 0, col: 0 },
    inventory: []
  });

  const [humanPlayer, setHumanPlayer] = useState<PlayerState>({
    faction: 'HUMAN',
    classId: '',
    resources: 5, 
    position: { balconyId: 3, row: 4, col: 4 },
    inventory: []
  });

  // --- Helpers ---

  const addLog = (text: string, faction: Faction = gameState.turn) => {
      setGameState(prev => ({
          ...prev,
          logs: [...prev.logs, { id: Math.random().toString(36), text, faction, round: prev.round }]
      }));
  };

  const getCurrentPlayer = () => gameState.turn === 'PIGEON' ? pigeonPlayer : humanPlayer;
  const getOtherPlayer = () => gameState.turn === 'PIGEON' ? humanPlayer : pigeonPlayer;
  const getCurrentClass = () => CLASSES.find(c => c.id === getCurrentPlayer().classId)!;
  
  const updateCurrentPlayer = (updates: Partial<PlayerState>) => {
      if (gameState.turn === 'PIGEON') setPigeonPlayer(prev => ({ ...prev, ...updates }));
      else setHumanPlayer(prev => ({ ...prev, ...updates }));
  };

  const updateOtherPlayer = (updates: Partial<PlayerState>) => {
      if (gameState.turn === 'PIGEON') setHumanPlayer(prev => ({ ...prev, ...updates }));
      else setPigeonPlayer(prev => ({ ...prev, ...updates }));
  };

  // --- Game Loop ---

  const startGame = (pigeonClass: string, humanClass: string) => {
    const newTiles = generateBoard();
    setTiles(newTiles);
    
    const startPigeon = newTiles.find(t => t.position.balconyId === 0 && t.position.row === 0 && t.position.col === 0);
    const startHuman = newTiles.find(t => t.position.balconyId === 3 && t.position.row === 4 && t.position.col === 4);
    
    setPigeonPlayer(prev => ({ ...prev, classId: pigeonClass, position: startPigeon!.position }));
    setHumanPlayer(prev => ({ ...prev, classId: humanClass, position: startHuman!.position }));
    
    setGameState({
      phase: 'ROLL',
      turn: 'PIGEON',
      round: 1,
      diceRoll: null,
      movesLeft: 0,
      actionPoints: 0,
      logs: [],
      winner: null
    });
    
    addLog("Game Started! Pigeons vs Humans.", 'PIGEON');
  };

  const rollDice = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const currentClass = getCurrentClass();
    const modifiedRoll = Math.max(1, roll + (currentClass.stats.speed || 0));

    setGameState(prev => ({
      ...prev,
      phase: 'MOVE',
      diceRoll: modifiedRoll,
      movesLeft: modifiedRoll,
      actionPoints: currentClass.stats.maxActions || 1
    }));
    
    addLog(`Rolled a ${roll} (${modifiedRoll} total).`, gameState.turn);
  };

  const handleMoveStep = (targetTile: Tile) => {
      if (gameState.phase !== 'MOVE' || gameState.movesLeft <= 0) return;

      const player = getCurrentPlayer();
      const currentTile = getTileAt(tiles, player.position.balconyId, player.position.row, player.position.col)!;
      const currentClass = getCurrentClass();
      const canMoveDiagonal = currentClass.id === 'guttersnipe';

      if (isValidStep(currentTile, targetTile, gameState.turn, canMoveDiagonal)) {
          // Move Player
          updateCurrentPlayer({ position: targetTile.position });
          
          // Handle Pickups
          if (targetTile.type === 'RESOURCE' && gameState.turn === 'PIGEON') {
              const bonus = currentClass.stats.resourceGain || 0;
              updateCurrentPlayer({ resources: player.resources + 1 + bonus });
              setTiles(prev => prev.map(t => t.id === targetTile.id ? { ...t, type: 'EMPTY' } : t));
              addLog(`Found seeds! (+${1 + bonus})`);
          } else if (targetTile.type === 'CHANCE' && gameState.turn === 'PIGEON') {
              // Simple chance logic
              const chance = Math.random();
              if (chance > 0.5) {
                  updateCurrentPlayer({ resources: player.resources + 2 });
                  addLog("Chance: Found a shiny coin! (+2 Res)");
              } else {
                  setGameState(prev => ({ ...prev, movesLeft: 0 })); // Trip
                  addLog("Chance: Tripped on a wire! Movement ends.");
              }
              setTiles(prev => prev.map(t => t.id === targetTile.id ? { ...t, type: 'EMPTY' } : t));
          }

          // Decrement Moves
          setGameState(prev => {
              const newMoves = prev.movesLeft - 1;
              return {
                  ...prev,
                  movesLeft: newMoves,
                  // Auto-transition to ACTION phase if out of moves
                  phase: newMoves === 0 ? 'ACTION' : 'MOVE'
              };
          });
      }
  };

  const skipMovement = () => {
      setGameState(prev => ({ ...prev, phase: 'ACTION', movesLeft: 0 }));
      addLog("Ended movement early.");
  };

  // --- Actions ---

  const performAction = (actionName: string, cost: number, effect: () => void) => {
      const player = getCurrentPlayer();
      if (gameState.actionPoints <= 0) {
          addLog("No action points left!");
          return;
      }
      if (player.resources < cost) {
          addLog(`Not enough resources! Need ${cost}.`);
          return;
      }

      updateCurrentPlayer({ resources: player.resources - cost });
      effect();
      
      setGameState(prev => ({
          ...prev,
          actionPoints: prev.actionPoints - 1
      }));
  };

  const buildStructure = () => {
      const player = getCurrentPlayer();
      const tile = getTileAt(tiles, player.position.balconyId, player.position.row, player.position.col)!;
      
      if (tile.type !== 'EMPTY') {
          addLog("Cannot build here!");
          return;
      }

      const currentClass = getCurrentClass();
      const isChonk = currentClass.id === 'chonk';
      const cost = (gameState.turn === 'PIGEON' && isChonk) ? 1 : 2;

      performAction(gameState.turn === 'PIGEON' ? "Build Nest" : "Place Prop", cost, () => {
          const newType = gameState.turn === 'PIGEON' ? 'NEST' : 'PROP';
          setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, type: newType, owner: gameState.turn } : t));
          addLog(gameState.turn === 'PIGEON' ? "Built a Nest!" : "Placed a Prop!");
          checkWinCondition();
      });
  };

  const destroyStructure = () => {
      const player = getCurrentPlayer();
      const currentTile = getTileAt(tiles, player.position.balconyId, player.position.row, player.position.col)!;
      
      // Find adjacent enemy structures
      const neighbors = tiles.filter(t => isAdjacent(player.position, t.position, true));
      const target = neighbors.find(t => 
          (gameState.turn === 'PIGEON' && t.type === 'PROP') || 
          (gameState.turn === 'HUMAN' && t.type === 'NEST')
      );

      if (!target) {
          addLog("Nothing nearby to destroy.");
          return;
      }

      performAction("Destroy", 2, () => {
          setTiles(prev => prev.map(t => t.id === target.id ? { ...t, type: 'EMPTY', owner: undefined } : t));
          addLog(`Destroyed ${target.type} at Balcony ${target.position.balconyId + 1}!`);
      });
  };

  const placeSpikes = () => {
      if (gameState.turn !== 'HUMAN') return;
      
      const player = getCurrentPlayer();
      const tile = getTileAt(tiles, player.position.balconyId, player.position.row, player.position.col)!;

      if (tile.type !== 'EMPTY') {
          addLog("Cannot place spikes here.");
          return;
      }

      performAction("Place Spikes", 1, () => {
          setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, type: 'SPIKES' } : t));
          addLog("Placed Spikes!");
      });
  };

  const useSpecialAbility = () => {
      const currentClass = getCurrentClass();
      
      if (currentClass.id === 'uncle') {
          // Push Pigeon
          const pigeon = getOtherPlayer(); // Human is current
          const human = getCurrentPlayer();
          
          if (pigeon.position.balconyId !== human.position.balconyId) {
              addLog("Pigeon is too far away to yell at!");
              return;
          }

          performAction("Loud Yell", 0, () => {
              const targetTile = getPushTarget(tiles, pigeon.position);
              if (targetTile) {
                  updateOtherPlayer({ position: targetTile.position });
                  addLog("Yelled at the pigeon! It flew away in fear.");
              } else {
                  addLog("Pigeon has nowhere to run!");
              }
          });
      } else {
          addLog("No active special ability for this class.");
      }
  };

  const checkWinCondition = () => {
      // We need to check AFTER state updates, but React state is async.
      // We'll calculate based on current tiles + pending change (not easy here).
      // Better to check in useEffect or just check based on the operation we just did.
      
      // For simplicity, we'll check next render or just check counts now assuming the update went through logic-wise
      // Actually, let's just do a quick count on the 'tiles' state which might be stale inside the function closure
      // but we can use a functional update or just wait for effect.
      // Let's use a useEffect for win condition.
  };

  useEffect(() => {
      if (gameState.phase === 'MENU' || gameState.phase === 'GAME_OVER') return;

      const nestCount = tiles.filter(t => t.type === 'NEST').length;
      
      if (nestCount >= WINNING_NEST_COUNT) {
          setGameState(prev => ({ ...prev, phase: 'GAME_OVER', winner: 'PIGEON' }));
      } else if (gameState.round > MAX_ROUNDS) {
          setGameState(prev => ({ ...prev, phase: 'GAME_OVER', winner: 'HUMAN' }));
      }
  }, [tiles, gameState.round]);


  const endTurn = () => {
    const nextTurn = gameState.turn === 'PIGEON' ? 'HUMAN' : 'PIGEON';
    let nextRound = gameState.round;
    
    if (nextTurn === 'PIGEON') {
        nextRound += 1;
        // Human Allowance
        setHumanPlayer(prev => ({ ...prev, resources: prev.resources + 2 }));
        addLog("Round End. Humans gain +2 Resources.");
    }

    setGameState(prev => ({
        ...prev,
        phase: 'ROLL',
        turn: nextTurn,
        round: nextRound,
        diceRoll: null,
        movesLeft: 0,
        actionPoints: 0
    }));
    addLog(`${nextTurn}'s Turn.`);
  };

  // --- Render Helpers ---

  if (gameState.phase === 'MENU') {
      return <Menu onStart={() => setGameState(prev => ({ ...prev, phase: 'SELECT_CLASS' }))} />;
  }

  if (gameState.phase === 'SELECT_CLASS') {
      return <ClassSelection onSelect={startGame} />;
  }

  if (gameState.phase === 'GAME_OVER') {
      return <GameOver winner={gameState.winner} onRestart={() => setGameState(prev => ({ ...prev, phase: 'MENU' }))} />;
  }

  const currentPlayer = getCurrentPlayer();
  const currentClass = getCurrentClass();

  return (
    <div className="min-h-screen bg-off-white text-teal-dark p-4 font-sans flex flex-col items-center overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-terracotta tracking-tighter uppercase hidden md:block">Kabootar vs Khiladi</h1>
            <div className="bg-white px-3 py-1 rounded-full border border-gray-300 text-xs font-bold shadow-sm">
                Round {gameState.round} / {MAX_ROUNDS}
            </div>
            <div className="bg-white px-3 py-1 rounded-full border border-gray-300 text-xs font-bold shadow-sm flex items-center gap-2">
                Nests: {tiles.filter(t => t.type === 'NEST').length} / {WINNING_NEST_COUNT}
            </div>
        </div>
        
        <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-lg border-2 shadow-sm flex items-center gap-2 transition-all ${gameState.turn === 'PIGEON' ? 'scale-110 border-terracotta bg-terracotta text-white' : 'bg-white border-gray-200 opacity-60'}`}>
                <Bird size={18} />
                <span className="font-bold">{pigeonPlayer.resources}</span>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 shadow-sm flex items-center gap-2 transition-all ${gameState.turn === 'HUMAN' ? 'scale-110 border-teal-dark bg-teal-dark text-white' : 'bg-white border-gray-200 opacity-60'}`}>
                <User size={18} />
                <span className="font-bold">{humanPlayer.resources}</span>
            </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl h-[calc(100vh-100px)]">
        
        {/* Board */}
        <div className="flex-1 bg-stone-200/50 p-4 lg:p-8 rounded-3xl border-4 border-stone-300 shadow-inner overflow-auto flex justify-center items-center relative">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="grid grid-cols-2 gap-8 relative z-10">
                {[0, 1, 2, 3].map(bId => (
                    <Balcony 
                        key={bId} 
                        id={bId} 
                        tiles={tiles} 
                        players={[pigeonPlayer, humanPlayer]} 
                        onTileClick={handleMoveStep}
                        highlight={gameState.phase === 'MOVE' ? (t) => isValidStep(getTileAt(tiles, currentPlayer.position.balconyId, currentPlayer.position.row, currentPlayer.position.col)!, t, gameState.turn, currentClass.id === 'guttersnipe') : undefined}
                    />
                ))}
            </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-96 flex flex-col gap-4 h-full">
            {/* Action Card */}
            <Card className="p-6 bg-white flex-1 flex flex-col relative overflow-hidden">
                {/* Turn Indicator Banner */}
                <div className={`absolute top-0 left-0 right-0 h-2 ${gameState.turn === 'PIGEON' ? 'bg-terracotta' : 'bg-teal-dark'}`} />
                
                <div className="flex justify-between items-start mb-4 mt-2">
                    <div>
                        <h2 className="text-2xl font-black flex items-center gap-2 text-gray-800">
                            {gameState.turn === 'PIGEON' ? <Bird className="text-terracotta" /> : <User className="text-teal-dark" />}
                            <span className="uppercase">{gameState.turn}</span>
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">{currentClass.name}</p>
                    </div>
                    {gameState.diceRoll && (
                        <div className="flex flex-col items-center">
                            <motion.div 
                                key={gameState.diceRoll}
                                initial={{ rotate: 180, scale: 0.5, opacity: 0 }}
                                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg"
                            >
                                {gameState.diceRoll}
                            </motion.div>
                            <span className="text-[10px] font-bold uppercase mt-1 text-gray-400">Roll</span>
                        </div>
                    )}
                </div>

                {/* Phase Controls */}
                <div className="flex-1 flex flex-col gap-3 justify-center">
                    {gameState.phase === 'ROLL' && (
                        <Button onClick={rollDice} size="lg" className="w-full py-8 text-xl flex flex-col items-center gap-2">
                            <Dice5 size={32} />
                            ROLL DICE
                        </Button>
                    )}

                    {gameState.phase === 'MOVE' && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
                                <p className="text-sm font-bold text-blue-800">Moves Left: {gameState.movesLeft}</p>
                                <p className="text-xs text-blue-600">Click adjacent tiles to move.</p>
                            </div>
                            <Button onClick={skipMovement} variant="outline" className="w-full">
                                Stop Moving
                            </Button>
                        </div>
                    )}

                    {gameState.phase === 'ACTION' && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 text-center text-xs font-bold text-gray-400 uppercase mb-1">
                                Action Points: {gameState.actionPoints}
                            </div>
                            
                            <Button onClick={buildStructure} variant="secondary" className="flex flex-col items-center gap-1 py-3">
                                {gameState.turn === 'PIGEON' ? <Home size={20} /> : <Hammer size={20} />}
                                <span className="text-xs">{gameState.turn === 'PIGEON' ? 'Build Nest' : 'Place Prop'}</span>
                                <span className="text-[10px] opacity-70">Cost: {currentClass.id === 'chonk' && gameState.turn === 'PIGEON' ? 1 : 2}</span>
                            </Button>

                            <Button onClick={destroyStructure} variant="outline" className="flex flex-col items-center gap-1 py-3 border-red-200 hover:bg-red-50 text-red-700">
                                <Skull size={20} />
                                <span className="text-xs">Destroy</span>
                                <span className="text-[10px] opacity-70">Cost: 2</span>
                            </Button>

                            {gameState.turn === 'HUMAN' && (
                                <Button onClick={placeSpikes} variant="outline" className="flex flex-col items-center gap-1 py-3">
                                    <ShieldBan size={20} />
                                    <span className="text-xs">Spikes</span>
                                    <span className="text-[10px] opacity-70">Cost: 1</span>
                                </Button>
                            )}

                            {currentClass.id === 'uncle' && (
                                <Button onClick={useSpecialAbility} variant="primary" className="flex flex-col items-center gap-1 py-3 bg-purple-600 border-purple-800 text-white">
                                    <Zap size={20} />
                                    <span className="text-xs">Yell</span>
                                    <span className="text-[10px] opacity-70">Free</span>
                                </Button>
                            )}
                            
                            <Button onClick={endTurn} className="col-span-2 mt-2 bg-gray-800 text-white hover:bg-black border-gray-900">
                                End Turn
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Log */}
            <ActionLog logs={gameState.logs} />
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

interface BalconyProps {
    id: number;
    tiles: Tile[];
    players: PlayerState[];
    onTileClick: (t: Tile) => void;
    highlight?: (t: Tile) => boolean;
}

const Balcony: React.FC<BalconyProps> = ({ id, tiles, players, onTileClick, highlight }) => {
    const balconyTiles = tiles.filter(t => t.position.balconyId === id);
    
    return (
        <div className="bg-white p-3 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] border-2 border-stone-100 relative">
            {/* Balcony Label */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-20">
                Balcony {id + 1}
            </div>
            
            <div className="grid grid-cols-5 gap-1.5">
                {balconyTiles.map(tile => {
                    const isPigeonHere = players[0].position.balconyId === id && players[0].position.row === tile.position.row && players[0].position.col === tile.position.col;
                    const isHumanHere = players[1].position.balconyId === id && players[1].position.row === tile.position.row && players[1].position.col === tile.position.col;
                    const isHighlighted = highlight ? highlight(tile) : false;

                    return (
                        <div 
                            key={tile.id}
                            onClick={() => onTileClick(tile)}
                            className={`
                                w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xs relative
                                transition-all duration-200
                                ${tile.type === 'EMPTY' ? 'bg-stone-50' : ''}
                                ${tile.type === 'OBSTACLE' ? 'bg-stone-800' : ''}
                                ${tile.type === 'RESOURCE' ? 'bg-yellow-50' : ''}
                                ${tile.type === 'CHANCE' ? 'bg-purple-50' : ''}
                                ${tile.type === 'SHOP' ? 'bg-blue-50' : ''}
                                ${tile.type === 'SPIKES' ? 'bg-red-50' : ''}
                                ${tile.type === 'NEST' ? 'bg-terracotta/10 border-2 border-terracotta' : ''}
                                ${tile.type === 'PROP' ? 'bg-teal-dark/10 border-2 border-teal-dark' : ''}
                                ${isHighlighted ? 'ring-4 ring-green-400 cursor-pointer hover:bg-green-50 scale-105 z-10' : ''}
                            `}
                        >
                            {/* Tile Content */}
                            {tile.type === 'RESOURCE' && <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full shadow-sm" />}
                            {tile.type === 'CHANCE' && <span className="text-purple-500 font-bold text-lg">?</span>}
                            {tile.type === 'SHOP' && <ShoppingBag size={16} className="text-blue-500" />}
                            {tile.type === 'SPIKES' && <AlertTriangle size={16} className="text-red-500" />}
                            {tile.type === 'OBSTACLE' && <div className="w-full h-full bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-stone-700 to-stone-900 opacity-80 rounded-md" />}
                            
                            {/* Structures */}
                            {tile.type === 'NEST' && <Home size={20} className="text-terracotta drop-shadow-md" />}
                            {tile.type === 'PROP' && <Hammer size={20} className="text-teal-dark drop-shadow-md" />}

                            {/* Players */}
                            <AnimatePresence>
                                {isPigeonHere && (
                                    <motion.div 
                                        layoutId="pigeon"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="absolute inset-0 flex items-center justify-center z-30"
                                    >
                                        <div className="bg-terracotta text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                                            <Bird size={20} />
                                        </div>
                                    </motion.div>
                                )}
                                {isHumanHere && (
                                    <motion.div 
                                        layoutId="human"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="absolute inset-0 flex items-center justify-center z-30"
                                    >
                                        <div className="bg-teal-dark text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                                            <User size={20} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Menu = ({ onStart }: { onStart: () => void }) => (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-100/50 to-transparent pointer-events-none" />
        <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="z-10"
        >
            <h1 className="text-6xl md:text-8xl font-black text-terracotta mb-4 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] tracking-tighter leading-none">
                KABOOTAR<br/>
                <span className="text-teal-dark text-4xl md:text-6xl">VS</span><br/>
                KHILADI
            </h1>
            <p className="text-xl mb-12 max-w-md mx-auto font-medium text-gray-600">The Battle for the Balcony.</p>
            <Button onClick={onStart} size="lg" className="text-2xl px-12 py-6 animate-bounce">PLAY GAME</Button>
        </motion.div>
    </div>
);

const ClassSelection = ({ onSelect }: { onSelect: (p: string, h: string) => void }) => {
    const [selectedPigeon, setSelectedPigeon] = useState(CLASSES[0].id);
    const [selectedHuman, setSelectedHuman] = useState(CLASSES[2].id);

    return (
        <div className="min-h-screen bg-off-white p-4 md:p-8 flex flex-col items-center overflow-auto">
            <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight">Select Your Fighters</h2>
            
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl mb-8">
                {/* Pigeon Selection */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-terracotta flex items-center gap-2 bg-white p-3 rounded-lg border-2 border-terracotta shadow-sm"><Bird /> Team Pigeon</h3>
                    <div className="grid gap-4">
                        {CLASSES.filter(c => c.faction === 'PIGEON').map(c => (
                            <div 
                                key={c.id}
                                onClick={() => setSelectedPigeon(c.id)}
                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedPigeon === c.id ? 'border-terracotta bg-terracotta text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : 'border-gray-200 bg-white hover:border-terracotta/50 text-gray-800'}`}
                            >
                                <div className="font-bold text-xl mb-1">{c.name}</div>
                                <div className={`text-sm mb-3 ${selectedPigeon === c.id ? 'text-white/90' : 'text-gray-500'}`}>{c.description}</div>
                                <div className={`text-xs font-mono p-2 rounded inline-block ${selectedPigeon === c.id ? 'bg-black/20' : 'bg-gray-100'}`}>
                                    Ability: {c.ability}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Human Selection */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-teal-dark flex items-center gap-2 bg-white p-3 rounded-lg border-2 border-teal-dark shadow-sm"><User /> Team Human</h3>
                    <div className="grid gap-4">
                        {CLASSES.filter(c => c.faction === 'HUMAN').map(c => (
                            <div 
                                key={c.id}
                                onClick={() => setSelectedHuman(c.id)}
                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedHuman === c.id ? 'border-teal-dark bg-teal-dark text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : 'border-gray-200 bg-white hover:border-teal-dark/50 text-gray-800'}`}
                            >
                                <div className="font-bold text-xl mb-1">{c.name}</div>
                                <div className={`text-sm mb-3 ${selectedHuman === c.id ? 'text-white/90' : 'text-gray-500'}`}>{c.description}</div>
                                <div className={`text-xs font-mono p-2 rounded inline-block ${selectedHuman === c.id ? 'bg-black/20' : 'bg-gray-100'}`}>
                                    Ability: {c.ability}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Button onClick={() => onSelect(selectedPigeon, selectedHuman)} size="lg" className="px-16 py-4 text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                START BATTLE
            </Button>
        </div>
    );
};

const GameOver = ({ winner, onRestart }: { winner: Faction | null, onRestart: () => void }) => (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-4 text-center">
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-12 rounded-3xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-2xl"
        >
            <h1 className="text-6xl font-black mb-6 uppercase">
                {winner === 'PIGEON' ? <span className="text-terracotta">Pigeons Win!</span> : <span className="text-teal-dark">Humans Win!</span>}
            </h1>
            <p className="text-2xl mb-8 font-medium text-gray-600">
                {winner === 'PIGEON' ? "The balcony is covered in nests. Coo coo!" : "The balcony is clean and peaceful. For now."}
            </p>
            <Button onClick={onRestart} size="lg" className="text-xl">PLAY AGAIN</Button>
        </motion.div>
    </div>
);
