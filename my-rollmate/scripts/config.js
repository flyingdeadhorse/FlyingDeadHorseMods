/**
 * MyRollmate - Configuration & Asset Paths
 *
 * Central registry for module identity, local asset paths, and
 * library paths. All other scripts import values from this namespace.
 *
 * Standard Edition – "MyArtist" customisation panel is locked.
 */

const ROLLMATE_ID = "my-rollmate";
const ROLLMATE_MODULE_PATH = `modules/${ROLLMATE_ID}`;

/** Set to true in the Premium edition config to unlock MyArtist. */
const ROLLMATE_IS_PREMIUM = false;

// ---------------------------------------------------------------------------
// Local asset paths – no external CDN references
// ---------------------------------------------------------------------------
const RollmateAssets = Object.freeze({
  sounds: {
    hover: `${ROLLMATE_MODULE_PATH}/assets/sounds/Hover.mp3`,
    click: `${ROLLMATE_MODULE_PATH}/assets/sounds/Klick.mp3`,
    reveal: `${ROLLMATE_MODULE_PATH}/assets/sounds/Reveal.mp3`,
    krit: `${ROLLMATE_MODULE_PATH}/assets/sounds/Krit.mp3`,
    fail: `${ROLLMATE_MODULE_PATH}/assets/sounds/Fail.mp3`,
    // Note: original source referenced Battlestart.mp3 + herz.mp3 (not present in this repo)
    battleStart: `${ROLLMATE_MODULE_PATH}/assets/sounds/Spin.mp3`,
    spawnDice: `${ROLLMATE_MODULE_PATH}/assets/sounds/SpawnDice.mp3`,
    goneDice: `${ROLLMATE_MODULE_PATH}/assets/sounds/GoneDice.mp3`,
    levitate: `${ROLLMATE_MODULE_PATH}/assets/sounds/levitate.mp3`,
    cardLand: `${ROLLMATE_MODULE_PATH}/assets/sounds/cardlegen.mp3`,
    heartbeat: `${ROLLMATE_MODULE_PATH}/assets/sounds/schwebend.mp3`,
    revealEx: `${ROLLMATE_MODULE_PATH}/assets/sounds/Enthullen.mp3`,
    flip: `${ROLLMATE_MODULE_PATH}/assets/sounds/Cardsound.mp3`,
    shuffle: `${ROLLMATE_MODULE_PATH}/assets/sounds/cards.mp3`,
    spin: `${ROLLMATE_MODULE_PATH}/assets/sounds/Spin.mp3`,
    spinWin: `${ROLLMATE_MODULE_PATH}/assets/sounds/SpinWin.mp3`,
    coin: `${ROLLMATE_MODULE_PATH}/assets/sounds/Coin.mp3`,
  },

  images: {
    woodTexture: `${ROLLMATE_MODULE_PATH}/assets/images/HOLZ.jpg`,
    fdhLogo: `${ROLLMATE_MODULE_PATH}/assets/images/FDH_Logo.png`,
    startIcon: `${ROLLMATE_MODULE_PATH}/assets/images/StartIcon.webp`,
    myArtist: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/MyArtist.png`,
    defaultBg: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/TableAdventurerVorschau.webp`,
    immersiveBg: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/TableAdventurerBackground.webp`,
    immersiveOverlay: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/TableAdventurerOverlay.webp`,
    immersiveOverlay2: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/TableAdventurerOverlay2.webp`,
    pf2Logo: `${ROLLMATE_MODULE_PATH}/assets/images/MyRollmate_PF2.png`,
    dnd5Logo: `${ROLLMATE_MODULE_PATH}/assets/images/MyRollmate_DnD5.png`,
    defaultCard: `${ROLLMATE_MODULE_PATH}/assets/images/Card.png`,
    card1: `${ROLLMATE_MODULE_PATH}/assets/images/Card1.webp`,
    card2: `${ROLLMATE_MODULE_PATH}/assets/images/Card2.webp`,
    card3: `${ROLLMATE_MODULE_PATH}/assets/images/Card3.webp`,
    card4: `${ROLLMATE_MODULE_PATH}/assets/images/Card4.webp`,
    card5: `${ROLLMATE_MODULE_PATH}/assets/images/Card5.webp`,
    card6: `${ROLLMATE_MODULE_PATH}/assets/images/Card6.webp`,
    // Artist background designs
    designStallion: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Flying Dead Horse - Stallion.webp`,
    designStars: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Call of the stars.webp`,
    designOculus: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Oculus.webp`,
    designWilderness: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Pure Wilderness.webp`,
    designPurple: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Purple Elegance.webp`,
    designSerpent: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Serpent of Blood.webp`,
    designStone: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Stone.webp`,
    designUndead: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/The Undead.webp`,
    designWarriors: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Warriors Within.webp`,
    designWood: `${ROLLMATE_MODULE_PATH}/assets/images/Designs/FlyingDeadHorse/Designs/Wooden Table.webp`,
  },

  lib: {
    threejs: `${ROLLMATE_MODULE_PATH}/lib/three.min.js`,
    cannonjs: `${ROLLMATE_MODULE_PATH}/lib/cannon.min.js`,
  },
});

// ---------------------------------------------------------------------------
// Foundry flag keys (stored as world-scope user / scene flags)
// ---------------------------------------------------------------------------
const RollmateFlags = Object.freeze({
  scope: "world",
  checkKey: "cinematicGroupCheck",
  resultKey: "cinematicRollResult",
  soundEnabled: "rollmateSoundEnabled",
  volume: "rollmateVolume",
  performance: "rollmatePerformance",
  launcherPos: "rollmateLauncherPos",
  // Artist / visual settings
  bgImg: "artistBgImg",
  glow: "artistGlow",
  border: "artistBorder",
  borderTrans: "artistBorderTrans",
  font: "artistFont",
  brightness: "artistBrightness",
  bgTrans: "artistBgTrans",
  cardImg: "artistCardImg",
  diceStyle: "artistDiceStyle",
  particleColor: "artistParticleColor",
  boardMode: "artistBoardMode",
});
