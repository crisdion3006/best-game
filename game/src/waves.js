// The ten waves. A wave announces itself, spawns its raiders in a mixed
// order over a few seconds, and ends when the last one is destroyed; the
// station mends a little and the next wave begins. Wave 10 is the Void Warden.

import {
  EVENT_BOSS, EVENT_WAVE_CLEAR, EVENT_WAVE_START, KIND_BOMBER, KIND_BRUTE,
  KIND_DRONE, KIND_SPITTER, KIND_WARDEN, KIND_WEAVER, WAVES, WAVE_COUNT,
} from './config.js';
import { spawnAtEdge, spawnWarden } from './enemies.js';

const ANNOUNCE_SECONDS = 2.2;
const BREATHER_SECONDS = 3.0;
const SPAWN_INTERVAL = 0.55;

const KIND_ORDER = [KIND_DRONE, KIND_WEAVER, KIND_SPITTER, KIND_BRUTE, KIND_BOMBER];

function buildQueue(waveDef, random) {
  const queue = [];
  for (const kind of KIND_ORDER) {
    const key = kind === KIND_DRONE ? 'drones' : kind === KIND_WEAVER ? 'weavers' : kind === KIND_SPITTER ? 'spitters' : kind === KIND_BRUTE ? 'brutes' : 'bombers';
    const count = waveDef[key] || 0;
    for (let i = 0; i < count; i += 1) queue.push(kind);
  }
  // Shuffle so the kinds arrive mixed.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  return queue;
}

export function createWave() {
  return {
    index: 0,
    phase: 'idle',
    timer: 0,
    queue: [],
    spawnTimer: 0,
    spawned: 0,
    total: 0,
    wardenSpawned: false,
  };
}

export function resetWave(wave) {
  wave.index = 0;
  wave.phase = 'idle';
  wave.timer = 0;
  wave.queue = [];
  wave.spawnTimer = 0;
  wave.spawned = 0;
  wave.total = 0;
  wave.wardenSpawned = false;
}

/** Begin wave `index` (1-based). Returns EVENT_WAVE_START. */
export function startWave(state, index, random) {
  const wave = state.wave;
  const def = WAVES[index - 1];
  wave.index = index;
  wave.phase = 'announce';
  wave.timer = ANNOUNCE_SECONDS;
  wave.queue = buildQueue(def, random);
  wave.spawnTimer = 0.4;
  wave.spawned = 0;
  wave.total = wave.queue.length + (def.warden ? 1 : 0);
  wave.wardenSpawned = false;
  state.waveNumber = index;
  return EVENT_WAVE_START;
}

/**
 * Advance the wave flow one step. Spawns raiders, and when the queue is empty
 * and nothing is left alive, clears the wave. Returns event flags.
 */
export function updateWave(state, dt, random) {
  const wave = state.wave;
  let events = 0;
  if (wave.phase === 'idle' || wave.phase === 'done') return 0;
  wave.timer -= dt;

  if (wave.phase === 'announce') {
    if (wave.timer <= 0) wave.phase = 'active';
    return 0;
  }
  if (wave.phase === 'breather') {
    if (wave.timer <= 0) {
      if (wave.index >= WAVE_COUNT) {
        wave.phase = 'done';
      } else {
        events |= startWave(state, wave.index + 1, random);
      }
    }
    return events;
  }

  // Active: spawn from the queue, then the Warden on wave 10.
  const def = WAVES[wave.index - 1];
  if (wave.queue.length > 0) {
    wave.spawnTimer -= dt;
    if (wave.spawnTimer <= 0) {
      wave.spawnTimer = SPAWN_INTERVAL;
      const kind = wave.queue.shift();
      const hpScale = 1 + (wave.index - 1) * 0.08;
      spawnAtEdge(state.enemies, kind, random, hpScale);
      wave.spawned += 1;
    }
  } else if (def.warden && !wave.wardenSpawned) {
    wave.wardenSpawned = true;
    events |= spawnWarden(state);
  }

  // Cleared when nothing is left to spawn and nothing is alive.
  let alive = 0;
  for (let i = 0; i < state.enemies.length; i += 1) if (state.enemies[i].active) alive += 1;
  if (wave.queue.length === 0 && alive === 0 && (wave.wardenSpawned || !def.warden)) {
    wave.phase = 'breather';
    wave.timer = BREATHER_SECONDS;
    events |= EVENT_WAVE_CLEAR;
  }
  return events;
}

/** True while a wave is being fought (not announcing or resting). */
export function waveActive(wave) {
  return wave.phase === 'active';
}

/** The Warden enemy, when it is on the field. */
export function wardenAlive(state) {
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    if (e.active && e.kind === KIND_WARDEN) return e;
  }
  return null;
}
