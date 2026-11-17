// Power-ups: dropped by brutes and by chance from any kill, drifting down
// until the player collects them. Each one does one clear thing.

import { FIELD, POOL, POWERUP, POWER_BOMB, POWER_RAPID, POWER_REPAIR, POWER_SHIELD, POWER_SPREAD } from './config.js';
import { pick } from './random.js';

const DROP_KINDS = [POWER_SPREAD, POWER_RAPID, POWER_SHIELD, POWER_REPAIR, POWER_BOMB];

export function createPowerupPool() {
  const powerups = [];
  for (let i = 0; i < POOL.powerups; i += 1) {
    powerups.push({ active: false, kind: POWER_SPREAD, x: 0, y: 0, vy: 55, t: 0 });
  }
  return powerups;
}

function freePowerup(powerups) {
  for (let i = 0; i < powerups.length; i += 1) if (!powerups[i].active) return powerups[i];
  return null;
}

/** Drop a power-up at (x, y); `kind` may be named or left to chance. */
export function spawnPowerup(powerups, x, y, random, kind = null) {
  const p = freePowerup(powerups);
  if (!p) return null;
  p.active = true;
  p.kind = kind === null ? pick(random, DROP_KINDS) : kind;
  p.x = Math.min(FIELD.width - 20, Math.max(20, x));
  p.y = y;
  p.vy = 55;
  p.t = 0;
  return p;
}

export function updatePowerups(powerups, dt) {
  for (let i = 0; i < powerups.length; i += 1) {
    const p = powerups[i];
    if (!p.active) continue;
    p.t += dt;
    p.y += p.vy * dt;
    if (p.y > FIELD.height + 20) p.active = false;
  }
}

/**
 * Apply a collected power-up to the player and the station. `now` is the
 * world's clock, for the timed ones. Returns a short label for the HUD toast.
 */
export function applyPowerup(state, kind, now) {
  const player = state.player;
  const def = POWERUP[kind];
  if (kind === POWER_SPREAD) player.spreadUntil = now + def.seconds;
  else if (kind === POWER_RAPID) player.rapidUntil = now + def.seconds;
  else if (kind === POWER_SHIELD) {
    player.shieldUntil = now + def.seconds;
    player.shieldHits = 1;
  } else if (kind === POWER_REPAIR) {
    state.station.hp = Math.min(state.station.maxHp, state.station.hp + 30);
    if (state.lives < 3) state.lives += 1;
  } else if (kind === POWER_BOMB) {
    player.bombs = Math.min(3, player.bombs + 1);
  }
  return def.label;
}
