import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Bird, User, ShoppingBag, AlertTriangle, Home, Hammer } from 'lucide-react';
import { GameState, PlayerState, Tile, CLASSES, Faction, BALCONY_SIZE, NUM_BALCONIES, PlayerClass } from './types';
import { generateBoard, getTileAt, isValidMove } from './gameLogic';

// --- Components ---

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-md border-2 border-black/5 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, disabled, children, className = '', variant = 'primary' }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-bold transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-terracotta text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black",
    secondary: "bg-turmeric text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black",
    outline: "bg-transparent border-2 border-black text-black hover:bg-black/5"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </button>
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
    message: 'Welcome to Balcony Wars!',
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
    resources: 5, // Humans start with some allowance
    position: { balconyId: 3, row: 4, col: 4 },
    inventory: []
  });

  // --- Initialization ---

  const startGame = (pigeonClass: string, humanClass: string) => {
    const newTiles = generateBoard();
    setTiles(newTiles);
    
    // Set starting positions
    const startPigeon = newTiles.find(t => t.position.balconyId === 0 && t.position.row === 0 && t.position.col === 0);
    const startHuman = newTiles.find(t => t.position.balconyId === 3 && t.position.row === 4 && t.position.col === 4);
    
    setPigeonPlayer(prev => ({ ...prev, classId: pigeonClass, position: startPigeon!.position }));
    setHumanPlayer(prev => ({ ...prev, classId: humanClass, position: startHuman!.position }));
    
    setGameState({
      phase: 'PLAYING',
      turn: 'PIGEON',
      round: 1,
      diceRoll: null,
      movesLeft: 0,
      message: "Pigeon's Turn! Roll the dice.",
      winner: null
    });
  };

  // --- Actions ---

  const rollDice = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    
    // Apply class modifiers
    const currentPlayer = gameState.turn === 'PIGEON' ? pigeonPlayer : humanPlayer;
    const currentClass = CLASSES.find(c => c.id === currentPlayer.classId);
    const modifiedRoll = Math.max(1, roll + (currentClass?.stats.speed || 0));

    setGameState(prev => ({
      ...prev,
      diceRoll: modifiedRoll,
      movesLeft: modifiedRoll,
      message: `Rolled a ${roll} (${modifiedRoll} with modifiers)! Move or Act.`
    }));
  };

  const handleTileClick = (tile: Tile) => {
    if (gameState.movesLeft <= 0) return;

    const currentPlayer = gameState.turn === 'PIGEON' ? pigeonPlayer : humanPlayer;
    const currentTile = getTileAt(tiles, currentPlayer.position.balconyId, currentPlayer.position.row, currentPlayer.position.col);
    
    if (!currentTile) return;

    // Simple movement logic: Teleport if within range (for prototype simplicity)
    // In a real game, you'd move tile by tile.
    if (isValidMove(currentTile, tile, gameState.turn, gameState.movesLeft)) {
        // Move player
        if (gameState.turn === 'PIGEON') {
            setPigeonPlayer(prev => ({ ...prev, position: tile.position }));
        } else {
            setHumanPlayer(prev => ({ ...prev, position: tile.position }));
        }

        // Handle Tile Effects
        if (tile.type === 'RESOURCE' && gameState.turn === 'PIGEON') {
            setPigeonPlayer(prev => ({ ...prev, resources: prev.resources + 1 }));
            setGameState(prev => ({ ...prev, message: "Found a seed! +1 Resource" }));
            // Consume resource
            const newTiles = tiles.map(t => t.id === tile.id ? { ...t, type: 'EMPTY' as const } : t);
            setTiles(newTiles);
        } else if (tile.type === 'CHANCE' && gameState.turn === 'PIGEON') {
             const effects = [
                 { msg: "Found a shiny wrapper! +2 Resources", action: () => setPigeonPlayer(p => ({...p, resources: p.resources + 2})) },
                 { msg: "Scared by a cat! Lose turn.", action: () => endTurn() }, // Immediate end turn
                 { msg: "Tailwind! +2 Moves next turn.", action: () => {} }
             ];
             const effect = effects[Math.floor(Math.random() * effects.length)];
             setGameState(prev => ({ ...prev, message: `Chance: ${effect.msg}` }));
             effect.action();
        } else if (tile.type === 'SHOP' && gameState.turn === 'HUMAN') {
             setGameState(prev => ({ ...prev, message: "Welcome to the Shop! Buy tools?" }));
        }

        // Decrement moves (simplified: 1 click = move completed for this prototype turn)
        // In a full game, we'd deduct distance.
        setGameState(prev => ({ ...prev, movesLeft: 0 }));
    } else {
        setGameState(prev => ({ ...prev, message: "Cannot move there!" }));
    }
  };

  const buildStructure = () => {
      const currentPlayer = gameState.turn === 'PIGEON' ? pigeonPlayer : humanPlayer;
      const currentTile = getTileAt(tiles, currentPlayer.position.balconyId, currentPlayer.position.row, currentPlayer.position.col);
      
      if (!currentTile || currentTile.type !== 'EMPTY') {
          setGameState(prev => ({ ...prev, message: "Cannot build here!" }));
          return;
      }

      const cost = 2; // Base cost
      if (currentPlayer.resources >= cost) {
          if (gameState.turn === 'PIGEON') {
              setPigeonPlayer(prev => ({ ...prev, resources: prev.resources - cost }));
              const newTiles = tiles.map(t => t.id === currentTile.id ? { ...t, type: 'NEST' as const, owner: 'PIGEON' as const } : t);
              setTiles(newTiles);
              setGameState(prev => ({ ...prev, message: "Nest built! Coo coo." }));
          } else {
              setHumanPlayer(prev => ({ ...prev, resources: prev.resources - cost }));
              const newTiles = tiles.map(t => t.id === currentTile.id ? { ...t, type: 'PROP' as const, owner: 'HUMAN' as const } : t);
              setTiles(newTiles);
              setGameState(prev => ({ ...prev, message: "Prop placed! Take that, birds." }));
          }
      } else {
          setGameState(prev => ({ ...prev, message: "Not enough resources!" }));
      }
  };

  const endTurn = () => {
    const nextTurn = gameState.turn === 'PIGEON' ? 'HUMAN' : 'PIGEON';
    let nextRound = gameState.round;
    
    if (nextTurn === 'PIGEON') {
        nextRound += 1;
        // Human gets allowance at end of round (before pigeon starts next)
        setHumanPlayer(prev => ({ ...prev, resources: prev.resources + 2 }));
    }

    setGameState(prev => ({
        ...prev,
        turn: nextTurn,
        round: nextRound,
        diceRoll: null,
        movesLeft: 0,
        message: `${nextTurn === 'PIGEON' ? "Pigeon" : "Human"}'s Turn!`
    }));
  };

  // --- Render Helpers ---

  if (gameState.phase === 'MENU') {
      return <Menu onStart={() => setGameState(prev => ({ ...prev, phase: 'SELECT_CLASS' }))} />;
  }

  if (gameState.phase === 'SELECT_CLASS') {
      return <ClassSelection onSelect={startGame} />;
  }

  return (
    <div className="min-h-screen bg-off-white text-teal-dark p-4 font-sans flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-terracotta tracking-tighter uppercase">Kabootar vs Khiladi</h1>
        <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-black shadow-sm flex items-center gap-2">
                <Bird className="text-terracotta" />
                <span className="font-bold">{pigeonPlayer.resources} Seeds</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-black shadow-sm flex items-center gap-2">
                <User className="text-teal-dark" />
                <span className="font-bold">{humanPlayer.resources} Rupees</span>
            </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        
        {/* Board */}
        <div className="flex-1 flex justify-center items-center bg-sage/20 p-8 rounded-3xl border-4 border-dashed border-sage/50">
            <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(bId => (
                    <Balcony 
                        key={bId} 
                        id={bId} 
                        tiles={tiles} 
                        players={[pigeonPlayer, humanPlayer]} 
                        onTileClick={handleTileClick}
                        checkMove={(t) => {
                            if (gameState.diceRoll === null) return false;
                            const currentPlayer = gameState.turn === 'PIGEON' ? pigeonPlayer : humanPlayer;
                            const currentTile = getTileAt(tiles, currentPlayer.position.balconyId, currentPlayer.position.row, currentPlayer.position.col);
                            if (!currentTile) return false;
                            return isValidMove(currentTile, t, gameState.turn, gameState.diceRoll);
                        }}
                    />
                ))}
            </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
            <Card className="p-6 bg-white">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {gameState.turn === 'PIGEON' ? <Bird /> : <User />}
                    {gameState.turn}'s Turn
                </h2>
                <p className="text-sm text-gray-500 mb-4">Round {gameState.round}</p>
                
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4 text-sm font-medium">
                    {gameState.message}
                </div>

                {!gameState.diceRoll ? (
                    <Button onClick={rollDice} className="w-full py-4 text-lg flex justify-center items-center gap-2">
                        <Dice5 /> Roll Dice
                    </Button>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="text-center font-mono text-4xl font-bold mb-4 text-terracotta">
                            {gameState.diceRoll}
                        </div>
                        <Button onClick={buildStructure} variant="secondary" className="w-full flex justify-center items-center gap-2">
                            {gameState.turn === 'PIGEON' ? <Home size={18} /> : <ShoppingBag size={18} />}
                            {gameState.turn === 'PIGEON' ? 'Build Nest (2)' : 'Place Prop (2)'}
                        </Button>
                        <Button onClick={endTurn} variant="outline" className="w-full mt-2">
                            End Turn
                        </Button>
                    </div>
                )}
            </Card>

            <Card className="p-4 bg-chai/10">
                <h3 className="font-bold text-sm uppercase tracking-wider mb-2 opacity-70">Legend</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-terracotta rounded-full"></div> Pigeon Nest</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-teal-dark rounded-full"></div> Human Prop</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Resource</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-400 rounded-full"></div> Chance</div>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

const Menu = ({ onStart }: { onStart: () => void }) => (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-6xl font-black text-terracotta mb-4 drop-shadow-lg">KABOOTAR<br/><span className="text-teal-dark text-4xl">VS</span><br/>KHILADI</h1>
        <p className="text-xl mb-8 max-w-md font-medium text-gray-600">The Battle for the Balcony begins now. Choose your side, claim your space.</p>
        <Button onClick={onStart} className="text-2xl px-12 py-6">PLAY GAME</Button>
    </div>
);

const ClassSelection = ({ onSelect }: { onSelect: (p: string, h: string) => void }) => {
    const [selectedPigeon, setSelectedPigeon] = useState(CLASSES[0].id);
    const [selectedHuman, setSelectedHuman] = useState(CLASSES[2].id);

    return (
        <div className="min-h-screen bg-off-white p-8 flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-8">Select Your Fighters</h2>
            
            <div className="grid md:grid-cols-2 gap-12 w-full max-w-5xl">
                {/* Pigeon Selection */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-terracotta flex items-center gap-2"><Bird /> Team Pigeon</h3>
                    <div className="grid gap-4">
                        {CLASSES.filter(c => c.faction === 'PIGEON').map(c => (
                            <div 
                                key={c.id}
                                onClick={() => setSelectedPigeon(c.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPigeon === c.id ? 'border-terracotta bg-terracotta/10 shadow-lg scale-105' : 'border-gray-200 bg-white hover:border-terracotta/50'}`}
                            >
                                <div className="font-bold text-lg">{c.name}</div>
                                <div className="text-sm text-gray-600 mb-2">{c.description}</div>
                                <div className="text-xs font-mono bg-white/50 p-2 rounded">
                                    Ability: {c.ability}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Human Selection */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-teal-dark flex items-center gap-2"><User /> Team Human</h3>
                    <div className="grid gap-4">
                        {CLASSES.filter(c => c.faction === 'HUMAN').map(c => (
                            <div 
                                key={c.id}
                                onClick={() => setSelectedHuman(c.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedHuman === c.id ? 'border-teal-dark bg-teal-dark/10 shadow-lg scale-105' : 'border-gray-200 bg-white hover:border-teal-dark/50'}`}
                            >
                                <div className="font-bold text-lg">{c.name}</div>
                                <div className="text-sm text-gray-600 mb-2">{c.description}</div>
                                <div className="text-xs font-mono bg-white/50 p-2 rounded">
                                    Ability: {c.ability}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Button onClick={() => onSelect(selectedPigeon, selectedHuman)} className="mt-12 px-12 py-4 text-xl">
                START BATTLE
            </Button>
        </div>
    );
};

// ... imports

interface BalconyProps {
    id: number;
    tiles: Tile[];
    players: PlayerState[];
    onTileClick: (t: Tile) => void;
    checkMove: (t: Tile) => boolean;
}

const Balcony: React.FC<BalconyProps> = ({ id, tiles, players, onTileClick, checkMove }) => {
    const balconyTiles = tiles.filter(t => t.position.balconyId === id);
    
    return (
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 relative">
            {/* Balcony Label */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sage text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Balcony {id + 1}
            </div>
            
            <div className="grid grid-cols-5 gap-1">
                {balconyTiles.map(tile => {
                    const isPigeonHere = players[0].position.balconyId === id && players[0].position.row === tile.position.row && players[0].position.col === tile.position.col;
                    const isHumanHere = players[1].position.balconyId === id && players[1].position.row === tile.position.row && players[1].position.col === tile.position.col;
                    const valid = checkMove(tile);

                    return (
                        <div 
                            key={tile.id}
                            onClick={() => onTileClick(tile)}
                            className={`
                                w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center text-xs relative
                                transition-all duration-200
                                ${tile.type === 'EMPTY' ? 'bg-gray-100' : ''}
                                ${tile.type === 'OBSTACLE' ? 'bg-gray-800' : ''}
                                ${tile.type === 'RESOURCE' ? 'bg-yellow-100' : ''}
                                ${tile.type === 'CHANCE' ? 'bg-purple-100' : ''}
                                ${tile.type === 'SHOP' ? 'bg-blue-100' : ''}
                                ${tile.type === 'NEST' ? 'bg-terracotta/20 border-2 border-terracotta' : ''}
                                ${tile.type === 'PROP' ? 'bg-teal-dark/20 border-2 border-teal-dark' : ''}
                                ${valid ? 'ring-2 ring-green-400 cursor-pointer hover:bg-green-50' : ''}
                            `}
                        >
                            {/* Tile Content */}
                            {tile.type === 'RESOURCE' && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
                            {tile.type === 'CHANCE' && <span className="text-purple-500 font-bold">?</span>}
                            {tile.type === 'SHOP' && <ShoppingBag size={12} className="text-blue-500" />}
                            {tile.type === 'OBSTACLE' && <div className="w-full h-full bg-stripes-gray opacity-20" />}
                            
                            {/* Structures */}
                            {tile.type === 'NEST' && <div className="absolute inset-0 flex items-center justify-center opacity-50"><Home size={16} className="text-terracotta" /></div>}
                            {tile.type === 'PROP' && <div className="absolute inset-0 flex items-center justify-center opacity-50"><Hammer size={16} className="text-teal-dark" /></div>}

                            {/* Players */}
                            <AnimatePresence>
                                {isPigeonHere && (
                                    <motion.div 
                                        layoutId="pigeon"
                                        className="absolute inset-0 flex items-center justify-center z-10"
                                    >
                                        <div className="bg-terracotta text-white p-1 rounded-full shadow-lg border border-white">
                                            <Bird size={16} />
                                        </div>
                                    </motion.div>
                                )}
                                {isHumanHere && (
                                    <motion.div 
                                        layoutId="human"
                                        className="absolute inset-0 flex items-center justify-center z-10"
                                    >
                                        <div className="bg-teal-dark text-white p-1 rounded-full shadow-lg border border-white">
                                            <User size={16} />
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
