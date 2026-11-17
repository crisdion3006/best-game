// NOVA SENTINEL — every tuning number, colour and wave in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 420,
  drag: 3.2,
  fireInterval: 0.14,
  bulletSpeed: 780,
  bulletDamage: 1,
  invulnerable: 2.0,
  bombs: 1,
  maxBombs: 3,
};

export const LIVES = 3;

export const STATION = {
  x: FIELD.width / 2,
  y: FIELD.height / 2,
  radius: 46,
  coreRadius: 26,
  maxHp: 100,
  regenPerWave: 12,
  repairAmount: 30,
};

export const BULLET = {
  playerRadius: 5,
  enemyRadius: 6,
  enemySpeed: 260,
};

/** Enemy kinds. */
export const KIND_DRONE = 0;
export const KIND_WEAVER = 1;
export const KIND_SPITTER = 2;
export const KIND_BRUTE = 3;
export const KIND_BOMBER = 4;
export const KIND_WARDEN = 5;

/** Per-kind tuning: hit points, speed, radius, score, colour and shape. */
export const ENEMY = {
  [KIND_DRONE]:   { hp: 1, speed: 130, radius: 13, score: 50,  color: '#ff2d95', name: 'Drone' },
  [KIND_WEAVER]:  { hp: 2, speed: 165, radius: 14, score: 100, color: '#fb923c', name: 'Weaver' },
  [KIND_SPITTER]: { hp: 2, speed: 105, radius: 15, score: 150, color: '#a78bfa', name: 'Spitter' },
  [KIND_BRUTE]:   { hp: 6, speed: 62,  radius: 26, score: 250, color: '#ef4444', name: 'Brute' },
  [KIND_BOMBER]:  { hp: 1, speed: 215, radius: 12, score: 100, color: '#facc15', name: 'Bomber' },
  [KIND_WARDEN]:  { hp: 130, speed: 48, radius: 58, score: 2000, color: '#f43f5e', name: 'Void Warden' },
};

/** Power-up kinds. */
export const POWER_SPREAD = 0;
export const POWER_RAPID = 1;
export const POWER_SHIELD = 2;
export const POWER_REPAIR = 3;
export const POWER_BOMB = 4;

export const POWERUP = {
  [POWER_SPREAD]: { color: '#22d3ee', label: 'SPREAD', seconds: 12 },
  [POWER_RAPID]:  { color: '#f0abfc', label: 'RAPID',  seconds: 12 },
  [POWER_SHIELD]: { color: '#4ade80', label: 'SHIELD', seconds: 10 },
  [POWER_REPAIR]: { color: '#fbbf24', label: 'REPAIR', seconds: 0 },
  [POWER_BOMB]:   { color: '#fb7185', label: 'BOMB +1', seconds: 0 },
};

/**
 * The ten waves. Each entry counts the enemies of that kind in the wave; the
 * Warden (boss) only appears in wave 10. Spawned in mixed order over the wave.
 */
export const WAVES = [
  { drones: 8,  weavers: 0, spitters: 0, brutes: 0, bombers: 0 },
  { drones: 10, weavers: 4, spitters: 0, brutes: 0, bombers: 0 },
  { drones: 10, weavers: 6, spitters: 3, brutes: 0, bombers: 2 },
  { drones: 12, weavers: 8, spitters: 4, brutes: 1, bombers: 3 },
  { drones: 12, weavers: 8, spitters: 6, brutes: 2, bombers: 4 },
  { drones: 14, weavers: 10, spitters: 6, brutes: 2, bombers: 5 },
  { drones: 14, weavers: 10, spitters: 8, brutes: 3, bombers: 6 },
  { drones: 16, weavers: 12, spitters: 8, brutes: 3, bombers: 7 },
  { drones: 18, weavers: 12, spitters: 10, brutes: 4, bombers: 8 },
  { drones: 6,  weavers: 4, spitters: 4, brutes: 2, bombers: 2, warden: true },
];
export const WAVE_COUNT = WAVES.length;

/** How many of each pool can exist at once; allocated once, at boot. */
export const POOL = { enemies: 48, playerBullets: 96, enemyBullets: 96, powerups: 12, particles: 420, texts: 24 };

export const PALETTE = {
  backdrop: '#04060f',
  skyTop: '#0a0f24',
  skyBottom: '#04060f',
  nebulaPurple: '#7b2ff7',
  nebulaTeal: '#00e5ff',
  nebulaMagenta: '#ff2d95',
  player: '#22d3ee',
  playerCore: '#ecfeff',
  stationCore: '#fbbf24',
  stationRing: '#22d3ee',
  bullet: '#a5f3fc',
  enemyBullet: '#ff5c8a',
  panel: 'rgba(10, 16, 34, 0.88)',
  panelEdge: 'rgba(103, 232, 249, 0.35)',
  text: '#eef2ff',
  muted: '#94a3b8',
  gold: '#fbbf24',
  danger: '#f43f5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'nova-sentinel.best';

/** Event flags a step returns, so the caller can play a sound or announce it. */
export const EVENT_SHOOT = 1;
export const EVENT_ENEMY_SHOOT = 2;
export const EVENT_KILL = 4;
export const EVENT_HIT = 8;
export const EVENT_STATION_HIT = 16;
export const EVENT_POWERUP = 32;
export const EVENT_WAVE_CLEAR = 64;
export const EVENT_WAVE_START = 128;
export const EVENT_BOSS = 256;
export const EVENT_BOMB = 512;
export const EVENT_SHIELD = 1024;
export const EVENT_OVER = 2048;
export const EVENT_WIN = 4096;
