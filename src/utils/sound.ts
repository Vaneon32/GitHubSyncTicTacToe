let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.08,
  delaySec = 0
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Audio playback is optional; ignore browser restriction errors
  }
}

export function playMoveSound(player: 'X' | 'O', enabled: boolean): void {
  if (!enabled) return;
  if (player === 'X') {
    playTone(520, 0.08, 'triangle', 0.075);
  } else {
    playTone(415, 0.09, 'sine', 0.08);
  }
}

export function playWinSound(enabled: boolean): void {
  if (!enabled) return;
  playTone(523.25, 0.14, 'triangle', 0.07, 0);
  playTone(659.25, 0.14, 'triangle', 0.07, 0.08);
  playTone(783.99, 0.24, 'triangle', 0.08, 0.16);
}

export function playDrawSound(enabled: boolean): void {
  if (!enabled) return;
  playTone(349.23, 0.12, 'sine', 0.06, 0);
  playTone(311.13, 0.18, 'sine', 0.055, 0.1);
}
