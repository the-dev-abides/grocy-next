// PROTOTYPE. Throwaway. The scan feedback: a sound and a vibration.
//
// A browser plays sound only after a user gesture. `unlock` runs on the
// first tap on the page. A vibration needs the same gesture on Chrome.
let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

export function audioUnlocked() {
  return ctx?.state === 'running';
}

function tone(frequency: number, seconds: number, at = 0, type: OscillatorType = 'sine') {
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = 0.2;
  osc.connect(gain).connect(ctx.destination);
  const start = ctx.currentTime + at;
  osc.start(start);
  gain.gain.setValueAtTime(0.2, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.stop(start + seconds);
}

export function feedbackKnown() {
  tone(1320, 0.1);
  navigator.vibrate?.(40);
}

export function feedbackRepeat() {
  tone(1320, 0.06);
  tone(1760, 0.08, 0.07);
  navigator.vibrate?.(40);
}

export function feedbackUnknown() {
  tone(330, 0.18, 0, 'square');
  tone(330, 0.18, 0.24, 'square');
  navigator.vibrate?.([150, 80, 150]);
}
