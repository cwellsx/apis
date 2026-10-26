export const beep = () => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle"; // softer than square, still “beep-like”
  osc.frequency.value = 750;

  // Start quiet, ramp up, then fade out
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01); // gentle attack
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.012); // soft decay

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15); // ~150 ms total
};
