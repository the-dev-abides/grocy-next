// The scan feedback of the spec: a short high tone and a short vibration for a known product, two low tones and a long vibration for an unknown code, a two-tone for a repeat scan. Chrome plays no sound before the first tap on the page, so the page unlocks the audio on the first pointer or key event. There is no one-time tap screen.

// The frame colour shows for 0.7 seconds. The banner shows for about 2
// seconds, 3 seconds for an unknown code.
export const FLASH_MS = 700;
const BANNER_MS = 1800;
const UNKNOWN_BANNER_MS = 3000;

export type FeedbackKind = 'known' | 'repeat' | 'unknown';

const GAIN = 0.2;
const SILENT_GAIN = 0.001;

const state: { audioContext: AudioContext | null } = { audioContext: null };

export function unlockAudio(): void {
  state.audioContext ??= new AudioContext();
  if (state.audioContext.state === 'suspended') {
    void state.audioContext.resume();
  }
}

export function isAudioUnlocked(): boolean {
  return state.audioContext?.state === 'running';
}

function tone(
  frequency: number,
  seconds: number,
  delaySeconds = 0,
  type: OscillatorType = 'sine',
): void {
  const audioContext = state.audioContext;
  if (audioContext?.state !== 'running') {
    return;
  }
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain).connect(audioContext.destination);
  const startAt = audioContext.currentTime + delaySeconds;
  gain.gain.setValueAtTime(GAIN, startAt);
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, startAt + seconds);
  oscillator.start(startAt);
  oscillator.stop(startAt + seconds);
}

function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

function playKnown(): void {
  tone(1320, 0.1);
  vibrate(40);
}

function playRepeat(): void {
  tone(1320, 0.06);
  tone(1760, 0.08, 0.07);
  vibrate(40);
}

function playUnknown(): void {
  tone(330, 0.18, 0, 'square');
  tone(330, 0.18, 0.24, 'square');
  vibrate([150, 80, 150]);
}

// This function plays the sound and the vibration of one scan outcome.
export function playFeedback(kind: FeedbackKind): void {
  if (kind === 'known') {
    playKnown();
  } else if (kind === 'repeat') {
    playRepeat();
  } else {
    playUnknown();
  }
}

// The time that the banner of one outcome stays on the screen.
export function bannerMs(kind: FeedbackKind): number {
  return kind === 'unknown' ? UNKNOWN_BANNER_MS : BANNER_MS;
}
