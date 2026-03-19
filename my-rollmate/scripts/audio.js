/**
 * MyRollmate – Audio Engine (audio.js)
 *
 * Registers the looping background-audio helpers as window-level functions
 * so they can be called from any module and from network-sync hooks.
 *
 * All sound paths are resolved via RollmateAssets (config.js).
 *
 * Loaded before: roll-logic.js, ui-handler.js, main.js
 */

// ── One-shot sound helper ─────────────────────────────────────────────────
function playRMSnd(src) {
  if (!src) return;
  const enabled =
    game.user.getFlag(RollmateFlags.scope, RollmateFlags.soundEnabled) ?? true;
  if (enabled === false) return;
  const vol = parseFloat(
    game.user.getFlag(RollmateFlags.scope, RollmateFlags.volume) ?? 1.0,
  );
  AudioHelper.play({ src, volume: vol, autoplay: true }, false);
}

// ── Looping audio helpers ─────────────────────────────────────────────────
// --- BACKGROUND AUDIO LOOPS ---
window.rmAudioLevitate = window.rmAudioLevitate || null;
window.rmAudioHeartbeat = window.rmAudioHeartbeat || null;

window.playLevitate = function () {
  if (window.rmAudioLevitate) return;
  let soundEnabled =
    game.user.getFlag(RollmateFlags.scope, "rollmateSoundEnabled") ?? true;
  if (!soundEnabled) return;
  let vol = game.user.getFlag(RollmateFlags.scope, "rollmateVolume") ?? 1.0;
  window.rmAudioLevitate = new Audio(`${RollmateAssets.sounds.levitate}`);
  window.rmAudioLevitate.volume = vol;
  window.rmAudioLevitate.loop = true;
  window.rmAudioLevitate
    .play()
    .catch((e) => console.log("Audio play prevented", e));
};
window.stopLevitate = function () {
  if (window.rmAudioLevitate) {
    window.rmAudioLevitate.pause();
    window.rmAudioLevitate = null;
  }
};

window.playHeartbeat = function () {
  if (window.rmAudioHeartbeat) return;
  let soundEnabled =
    game.user.getFlag(RollmateFlags.scope, "rollmateSoundEnabled") ?? true;
  if (!soundEnabled) return;
  let vol = game.user.getFlag(RollmateFlags.scope, "rollmateVolume") ?? 1.0;
  window.rmAudioHeartbeat = new Audio(`${RollmateAssets.sounds.heartbeat}`);
  window.rmAudioHeartbeat.volume = vol * 0.8;
  window.rmAudioHeartbeat.loop = true;
  window.rmAudioHeartbeat
    .play()
    .catch((e) => console.log("Audio play prevented", e));
};
window.stopHeartbeat = function () {
  if (window.rmAudioHeartbeat) {
    window.rmAudioHeartbeat.pause();
    window.rmAudioHeartbeat = null;
  }
};
