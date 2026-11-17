// Bullet pools: the player's shots and the enemies' shots. Both are fixed pools
// allocated once, so firing never allocates.

import { BULLET, FIELD, POOL } from './config.js';

function makePool(size, radius) {
  const pool = [];
  for (let i = 0; i < size; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 1, radius });
  }
  return pool;
}

function fire(pool, x, y, angle, speed, damage) {
  for (let i = 0; i < pool.length; i += 1) {
    const b = pool[i];
    if (b.active) continue;
    b.active = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.damage = damage;
    return true;
  }
  return false;
}

function updatePool(pool, dt) {
  for (let i = 0; i < pool.length; i += 1) {
    const b = pool[i];
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) b.active = false;
  }
}

export function createBullets() {
  const playerBullets = makePool(POOL.playerBullets, BULLET.playerRadius);
  const enemyBullets = makePool(POOL.enemyBullets, BULLET.enemyRadius);
  return {
    playerBullets,
    enemyBullets,
    firePlayer(x, y, angle, speed, damage) {
      return fire(playerBullets, x, y, angle, speed, damage);
    },
    fireEnemy(x, y, angle, speed, damage) {
      return fire(enemyBullets, x, y, angle, speed, damage);
    },
    update(dt) {
      updatePool(playerBullets, dt);
      updatePool(enemyBullets, dt);
    },
    clear() {
      for (const b of playerBullets) b.active = false;
      for (const b of enemyBullets) b.active = false;
    },
  };
}
