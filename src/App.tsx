import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, RotateCcw, Users, Volume2, VolumeX } from 'lucide-react';
import { Board } from './components/Board';
import {
  BoardState,
  BotDifficulty,
  calculateWinner,
  chooseBotMove,
  createEmptyBoard,
  GameMode,
  isBoardFull,
  Player,
} from './utils/gameLogic';
import { playDrawSound, playMoveSound, playWinSound } from './utils/sound';

interface ScoreBoard {
  X: number;
  O: number;
  draws: number;
}

export default function App() {
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard());
  const [currentTurn, setCurrentTurn] = useState<Player>('X');
  const [startingPlayer, setStartingPlayer] = useState<Player>('X');
  const [mode, setMode] = useState<GameMode>('bot');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [humanMark, setHumanMark] = useState<Player>('X');
  const [scores, setScores] = useState<ScoreBoard>({ X: 0, O: 0, draws: 0 });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  const botTimerRef = useRef<number | null>(null);
  const scoredRoundRef = useRef<boolean>(false);

  const winResult = calculateWinner(board);
  const winner = winResult?.winner ?? null;
  const winningLine = winResult?.line ?? null;
  const isDraw = !winner && isBoardFull(board);
  const isRoundOver = winner !== null || isDraw;

  const botMark: Player = humanMark === 'X' ? 'O' : 'X';

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    setIsBotThinking(false);
  }, []);

  const startNewRound = useCallback(
    (nextStarter?: Player) => {
      clearBotTimer();
      scoredRoundRef.current = false;
      const starter = nextStarter ?? (startingPlayer === 'X' ? 'O' : 'X');
      setStartingPlayer(starter);
      setBoard(createEmptyBoard());
      setCurrentTurn(starter);
    },
    [clearBotTimer, startingPlayer]
  );

  const resetAll = useCallback(
    (newStarter: Player = 'X') => {
      clearBotTimer();
      scoredRoundRef.current = false;
      setStartingPlayer(newStarter);
      setBoard(createEmptyBoard());
      setCurrentTurn(newStarter);
      setScores({ X: 0, O: 0, draws: 0 });
    },
    [clearBotTimer]
  );

  const applyMove = useCallback(
    (index: number, player: Player) => {
      setBoard((prev) => {
        if (prev[index] !== null) return prev;
        const next = [...prev];
        next[index] = player;

        const nextWin = calculateWinner(next);
        const nextDraw = !nextWin && isBoardFull(next);

        if (nextWin) {
          playWinSound(soundEnabled);
        } else if (nextDraw) {
          playDrawSound(soundEnabled);
        } else {
          playMoveSound(player, soundEnabled);
        }

        return next;
      });
      setCurrentTurn(player === 'X' ? 'O' : 'X');
    },
    [soundEnabled]
  );

  // Record round score once when a round finishes
  useEffect(() => {
    if (!isRoundOver || scoredRoundRef.current) return;
    scoredRoundRef.current = true;

    if (winner) {
      setScores((prev) => ({
        ...prev,
        [winner]: prev[winner] + 1,
      }));
    } else if (isDraw) {
      setScores((prev) => ({
        ...prev,
        draws: prev.draws + 1,
      }));
    }
  }, [isRoundOver, winner, isDraw]);

  // Trigger Bot move automatically when it's the Bot's turn
  useEffect(() => {
    if (mode !== 'bot' || isRoundOver || currentTurn !== botMark) {
      return;
    }

    setIsBotThinking(true);
    const delayMs = 380;

    botTimerRef.current = window.setTimeout(() => {
      botTimerRef.current = null;
      const moveIdx = chooseBotMove(board, botMark, difficulty);
      setIsBotThinking(false);
      if (moveIdx !== -1) {
        applyMove(moveIdx, botMark);
      }
    }, delayMs);

    return () => {
      if (botTimerRef.current !== null) {
        window.clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
    };
  }, [mode, isRoundOver, currentTurn, botMark, board, difficulty, applyMove]);

  // Keyboard shortcut: 'R' starts a new round when round is over or board has moves
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
        startNewRound();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startNewRound]);

  const handleCellClick = (index: number) => {
    if (isRoundOver || isBotThinking) return;
    if (mode === 'bot' && currentTurn !== humanMark) return;
    if (board[index] !== null) return;
    applyMove(index, currentTurn);
  };

  const handleModeChange = (nextMode: GameMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetAll('X');
  };

  const handleDifficultyChange = (nextDiff: BotDifficulty) => {
    if (nextDiff === difficulty) return;
    setDifficulty(nextDiff);
    startNewRound('X');
  };

  const handleMarkSideChange = (nextHumanMark: Player) => {
    if (nextHumanMark === humanMark) return;
    setHumanMark(nextHumanMark);
    resetAll('X');
  };

  const labelX = mode === 'bot' ? (humanMark === 'X' ? 'You (X)' : 'Bot (X)') : 'Player X';
  const labelO = mode === 'bot' ? (humanMark === 'O' ? 'You (O)' : 'Bot (O)') : 'Player O';

  const getStatusText = () => {
    if (winner) {
      if (mode === 'bot') {
        return winner === humanMark ? `You win as ${winner}` : `Bot wins as ${winner}`;
      }
      return `Player ${winner} wins`;
    }
    if (isDraw) {
      return 'Draw round';
    }
    if (mode === 'bot' && currentTurn === botMark) {
      return `Bot (${botMark}) is thinking...`;
    }
    if (mode === 'bot') {
      return `Your turn (${humanMark})`;
    }
    return `Player ${currentTurn} turn`;
  };

  const hasAnyMoves = board.some((c) => c !== null);
  const hasScores = scores.X > 0 || scores.O > 0 || scores.draws > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0] text-[#18191C]">
      {/* Top Bar */}
      <header className="w-full border-b border-[#E5E2DA] bg-[#F5F4F0]/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-6">
          <h1
            className="text-xl font-bold tracking-tight text-[#18191C] whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tic-Tac-Toe
          </h1>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#52555E] hover:text-[#18191C] bg-white border border-[#E5E2DA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C]"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          {/* Controls Strip: Mode & Options */}
          <section
            aria-label="Game settings"
            className="w-full flex flex-col gap-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Mode Segmented Control */}
              <div
                role="group"
                aria-label="Opponent mode"
                className="inline-flex items-center p-1 bg-[#EAE7E0] rounded-lg border border-[#DDD8CE]"
              >
                <button
                  type="button"
                  onClick={() => handleModeChange('bot')}
                  aria-pressed={mode === 'bot'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C] ${
                    mode === 'bot'
                      ? 'bg-white text-[#18191C] shadow-xs'
                      : 'text-[#5A5D66] hover:text-[#18191C]'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>vs Bot</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('pvp')}
                  aria-pressed={mode === 'pvp'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C] ${
                    mode === 'pvp'
                      ? 'bg-white text-[#18191C] shadow-xs'
                      : 'text-[#5A5D66] hover:text-[#18191C]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2 Players</span>
                </button>
              </div>

              {/* Bot Difficulty Segmented Control */}
              {mode === 'bot' && (
                <div
                  role="group"
                  aria-label="Bot difficulty"
                  className="inline-flex items-center p-1 bg-[#EAE7E0] rounded-lg border border-[#DDD8CE]"
                >
                  {(['easy', 'medium', 'unbeatable'] as BotDifficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleDifficultyChange(level)}
                      aria-pressed={difficulty === level}
                      className={`px-2.5 py-1.5 text-xs font-medium capitalize rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C] ${
                        difficulty === level
                          ? 'bg-white text-[#18191C] shadow-xs'
                          : 'text-[#5A5D66] hover:text-[#18191C]'
                      }`}
                    >
                      {level === 'unbeatable' ? 'Hard' : level}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {mode === 'bot' && (
              <div className="flex items-center justify-between text-xs text-[#5A5D66] px-0.5">
                <span>Play as</span>
                <div
                  role="group"
                  aria-label="Choose your mark"
                  className="inline-flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => handleMarkSideChange('X')}
                    aria-pressed={humanMark === 'X'}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      humanMark === 'X'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                        : 'bg-white text-[#5A5D66] border-[#E5E2DA] hover:text-[#18191C]'
                    }`}
                  >
                    X (Blue)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkSideChange('O')}
                    aria-pressed={humanMark === 'O'}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      humanMark === 'O'
                        ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                        : 'bg-white text-[#5A5D66] border-[#E5E2DA] hover:text-[#18191C]'
                    }`}
                  >
                    O (Red)
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Scoreboard */}
          <section
            aria-label="Scoreboard"
            className="w-full grid grid-cols-3 gap-2.5"
          >
            <div
              className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl border transition-colors ${
                !isRoundOver && currentTurn === 'X'
                  ? 'bg-white border-[#93C5FD]'
                  : 'bg-white border-[#E5E2DA]'
              }`}
            >
              <span className="text-xs font-medium text-[#1D4ED8] truncate max-w-full">
                {labelX}
              </span>
              <span
                className="mt-0.5 text-2xl font-bold text-[#18191C] tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {scores.X}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-3 px-3 rounded-xl bg-white border border-[#E5E2DA]">
              <span className="text-xs font-medium text-[#5A5D66]">Draws</span>
              <span
                className="mt-0.5 text-2xl font-bold text-[#18191C] tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {scores.draws}
              </span>
            </div>

            <div
              className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl border transition-colors ${
                !isRoundOver && currentTurn === 'O'
                  ? 'bg-white border-[#FCA5A5]'
                  : 'bg-white border-[#E5E2DA]'
              }`}
            >
              <span className="text-xs font-medium text-[#DC2626] truncate max-w-full">
                {labelO}
              </span>
              <span
                className="mt-0.5 text-2xl font-bold text-[#18191C] tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {scores.O}
              </span>
            </div>
          </section>

          {/* Turn & Result Status */}
          <div
            role="status"
            aria-live="polite"
            className="w-full flex items-center justify-between px-1"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  winner === 'X'
                    ? 'text-[#1D4ED8]'
                    : winner === 'O'
                      ? 'text-[#DC2626]'
                      : 'text-[#18191C]'
                }`}
              >
                {getStatusText()}
              </span>
            </div>
            <span className="text-xs text-[#6B6E78]">
              {startingPlayer} starts
            </span>
          </div>

          {/* 3x3 Board */}
          <Board
            board={board}
            currentTurn={currentTurn}
            winningLine={winningLine}
            winner={winner}
            isDraw={isDraw}
            isLocked={isBotThinking || (mode === 'bot' && currentTurn !== humanMark)}
            onCellClick={handleCellClick}
          />

          {/* Bottom Actions */}
          <div className="w-full flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => startNewRound()}
              disabled={!hasAnyMoves && !isRoundOver}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F4F0] ${
                isRoundOver
                  ? 'bg-[#18191C] text-white hover:bg-[#2C2E33] cursor-pointer shadow-xs'
                  : hasAnyMoves
                    ? 'bg-white text-[#18191C] border border-[#DDD8CE] hover:bg-[#FAF9F6] cursor-pointer'
                    : 'bg-white/60 text-[#9CA0AA] border border-[#E5E2DA] cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isRoundOver ? 'Play Again' : 'Restart Round'}</span>
            </button>

            {hasScores && (
              <button
                type="button"
                onClick={() => resetAll('X')}
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-[#5A5D66] hover:text-[#18191C] bg-white border border-[#E5E2DA] rounded-xl hover:bg-[#FAF9F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C]"
              >
                Reset Scores
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
