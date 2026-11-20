import React from 'react';
import { BoardState, Player } from '../utils/gameLogic';

interface BoardProps {
  board: BoardState;
  currentTurn: Player;
  winningLine: [number, number, number] | null;
  winner: Player | null;
  isDraw: boolean;
  isLocked: boolean;
  onCellClick: (index: number) => void;
}

const LINE_COORDS: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
  '0,1,2': { x1: 24, y1: 50, x2: 276, y2: 50 },
  '3,4,5': { x1: 24, y1: 150, x2: 276, y2: 150 },
  '6,7,8': { x1: 24, y1: 250, x2: 276, y2: 250 },
  '0,3,6': { x1: 50, y1: 24, x2: 50, y2: 276 },
  '1,4,7': { x1: 150, y1: 24, x2: 150, y2: 276 },
  '2,5,8': { x1: 250, y1: 24, x2: 250, y2: 276 },
  '0,4,8': { x1: 28, y1: 28, x2: 272, y2: 272 },
  '2,4,6': { x1: 272, y1: 28, x2: 28, y2: 272 },
};

function MarkX({ preview = false }: { preview?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={`w-11 h-11 sm:w-14 sm:h-14 ${preview ? 'opacity-20 scale-95 transition-all duration-150' : ''}`}
      aria-hidden="true"
    >
      <line
        x1="20"
        y1="20"
        x2="60"
        y2="60"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        style={{ '--stroke-len': '60' } as React.CSSProperties}
        className={preview ? '' : 'animate-draw-stroke'}
      />
      <line
        x1="60"
        y1="20"
        x2="20"
        y2="60"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        style={{ '--stroke-len': '60' } as React.CSSProperties}
        className={preview ? '' : 'animate-draw-stroke-delayed'}
      />
    </svg>
  );
}

function MarkO({ preview = false }: { preview?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={`w-11 h-11 sm:w-14 sm:h-14 ${preview ? 'opacity-20 scale-95 transition-all duration-150' : ''}`}
      aria-hidden="true"
    >
      <circle
        cx="40"
        cy="40"
        r="21"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ '--stroke-len': '135' } as React.CSSProperties}
        className={preview ? '' : 'animate-draw-stroke'}
      />
    </svg>
  );
}

export function Board({
  board,
  currentTurn,
  winningLine,
  winner,
  isDraw,
  isLocked,
  onCellClick,
}: BoardProps) {
  const winLineKey = winningLine ? winningLine.join(',') : null;
  const winCoords = winLineKey ? LINE_COORDS[winLineKey] : null;
  const gameEnded = winner !== null || isDraw;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') nextIndex = row * 3 + ((col + 1) % 3);
    else if (e.key === 'ArrowLeft') nextIndex = row * 3 + ((col + 2) % 3);
    else if (e.key === 'ArrowDown') nextIndex = ((row + 1) % 3) * 3 + col;
    else if (e.key === 'ArrowUp') nextIndex = ((row + 2) % 3) * 3 + col;

    if (nextIndex !== null) {
      e.preventDefault();
      const target = document.getElementById(`ttt-cell-${nextIndex}`);
      target?.focus();
    }
  };

  return (
    <div className="relative p-3 sm:p-4 bg-[#EAE7E0] rounded-2xl border border-[#DDD8CE] shadow-sm">
      <div
        role="grid"
        aria-label="Tic-Tac-Toe board"
        className="relative grid grid-cols-3 gap-2.5 sm:gap-3 w-[280px] h-[280px] sm:w-[348px] sm:h-[348px]"
      >
        {board.map((value, idx) => {
          const row = Math.floor(idx / 3) + 1;
          const col = (idx % 3) + 1;
          const isWinningCell = winningLine?.includes(idx) ?? false;
          const canPlay = value === null && !gameEnded && !isLocked;

          const markColor =
            value === 'X'
              ? 'text-[#1D4ED8]'
              : value === 'O'
                ? 'text-[#DC2626]'
                : currentTurn === 'X'
                  ? 'text-[#1D4ED8]'
                  : 'text-[#DC2626]';

          let cellSurface = 'bg-white border-[#E5E2DA]';
          if (isWinningCell) {
            cellSurface =
              winner === 'X'
                ? 'bg-[#EFF6FF] border-[#93C5FD]'
                : 'bg-[#FEF2F2] border-[#FCA5A5]';
          } else if (gameEnded && value !== null) {
            cellSurface = 'bg-[#FAFAF8] border-[#E5E2DA] opacity-70';
          } else if (canPlay) {
            cellSurface =
              'bg-white border-[#E5E2DA] hover:bg-[#FAF9F6] hover:border-[#CFC9BC] active:scale-[0.97]';
          }

          return (
            <button
              key={idx}
              id={`ttt-cell-${idx}`}
              type="button"
              role="gridcell"
              disabled={!canPlay && value !== null ? true : false}
              aria-disabled={!canPlay}
              aria-label={`Row ${row}, Column ${col}: ${value ? value : 'empty'}`}
              onClick={() => {
                if (canPlay) onCellClick(idx);
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`group relative flex items-center justify-center rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EAE7E0] select-none ${cellSurface} ${
                canPlay ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {value === 'X' && (
                <span className={markColor}>
                  <MarkX />
                </span>
              )}
              {value === 'O' && (
                <span className={markColor}>
                  <MarkO />
                </span>
              )}
              {canPlay && (
                <span
                  className={`pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 ${markColor}`}
                >
                  {currentTurn === 'X' ? <MarkX preview /> : <MarkO preview />}
                </span>
              )}
            </button>
          );
        })}

        {winCoords && winner && (
          <svg
            viewBox="0 0 300 300"
            className="pointer-events-none absolute inset-0 w-full h-full z-10"
            aria-hidden="true"
          >
            <line
              x1={winCoords.x1}
              y1={winCoords.y1}
              x2={winCoords.x2}
              y2={winCoords.y2}
              stroke={winner === 'X' ? '#1D4ED8' : '#DC2626'}
              strokeWidth="8"
              strokeLinecap="round"
              className="animate-win-line"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
