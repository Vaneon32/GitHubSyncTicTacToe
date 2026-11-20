export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type BoardState = CellValue[];
export type GameMode = 'pvp' | 'bot';
export type BotDifficulty = 'easy' | 'medium' | 'unbeatable';

export interface WinResult {
  winner: Player;
  line: [number, number, number];
}

export const WINNING_LINES: [number, number, number][] = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left col
  [1, 4, 7], // Middle col
  [2, 5, 8], // Right col
  [0, 4, 8], // Diagonal TL-BR
  [2, 4, 6], // Diagonal TR-BL
];

export function createEmptyBoard(): BoardState {
  return Array<CellValue>(9).fill(null);
}

export function calculateWinner(board: BoardState): WinResult | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first && first === board[b] && first === board[c]) {
      return { winner: first, line };
    }
  }
  return null;
}

export function isBoardFull(board: BoardState): boolean {
  return board.every((cell) => cell !== null);
}

export function getAvailableMoves(board: BoardState): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

function findImmediateWinningMove(board: BoardState, player: Player): number | null {
  const available = getAvailableMoves(board);
  for (const idx of available) {
    const next = [...board];
    next[idx] = player;
    if (calculateWinner(next)?.winner === player) {
      return idx;
    }
  }
  return null;
}

function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  botPlayer: Player,
  humanPlayer: Player,
  alpha: number,
  beta: number
): number {
  const win = calculateWinner(board);
  if (win) {
    return win.winner === botPlayer ? 10 - depth : depth - 10;
  }
  if (isBoardFull(board)) {
    return 0;
  }

  const available = getAvailableMoves(board);

  if (isMaximizing) {
    let best = -Infinity;
    for (const idx of available) {
      board[idx] = botPlayer;
      const score = minimax(board, depth + 1, false, botPlayer, humanPlayer, alpha, beta);
      board[idx] = null;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of available) {
      board[idx] = humanPlayer;
      const score = minimax(board, depth + 1, true, botPlayer, humanPlayer, alpha, beta);
      board[idx] = null;
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMoveMinimax(board: BoardState, botPlayer: Player): number {
  const humanPlayer: Player = botPlayer === 'X' ? 'O' : 'X';
  const available = getAvailableMoves(board);

  // Fast opening heuristic when board is completely empty
  if (available.length === 9) {
    const openings = [0, 2, 4, 6, 8];
    return openings[Math.floor(Math.random() * openings.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const idx of available) {
    const next = [...board];
    next[idx] = botPlayer;
    const score = minimax(next, 0, false, botPlayer, humanPlayer, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

export function chooseBotMove(
  board: BoardState,
  botPlayer: Player,
  difficulty: BotDifficulty
): number {
  const available = getAvailableMoves(board);
  if (available.length === 0) return -1;

  const humanPlayer: Player = botPlayer === 'X' ? 'O' : 'X';

  if (difficulty === 'easy') {
    // Mostly random, occasionally takes a winning move
    if (Math.random() < 0.35) {
      const winMove = findImmediateWinningMove(board, botPlayer);
      if (winMove !== null) return winMove;
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  if (difficulty === 'medium') {
    // Always takes immediate win or blocks immediate loss; otherwise 55% optimal, 45% random
    const winMove = findImmediateWinningMove(board, botPlayer);
    if (winMove !== null) return winMove;

    const blockMove = findImmediateWinningMove(board, humanPlayer);
    if (blockMove !== null) return blockMove;

    if (Math.random() < 0.55) {
      return getBestMoveMinimax(board, botPlayer);
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  return getBestMoveMinimax(board, botPlayer);
}
