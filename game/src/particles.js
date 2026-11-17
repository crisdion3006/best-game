// Particles, floating score text, screen shake and hit flashes. One pool,
// allocated once at boot, reused for every burst so a frame allocates nothing
// after the game starts.

import { POOL } from './config.js';

export function createParticles() {
  const parts = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0, shrink: true });
  }
  const texts = [];
  for (let i = 0; i < POOL.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 18 });
  }
  let shakeTime = 0;
  let shakeMag = 0;
  let flashTime = 0;
  let flashColor = '#ff2d55';

  function freePart() {
    for (let i = 0; i < parts.length; i += 1) if (!parts[i].active) return parts[i];
    return parts[0];
  }

  function spawn(x, y, vx, vy, life, size, color, drag = 2.5) {
    const p = freePart();
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.drag = drag;
    p.shrink = true;
  }

  return {
    /** A radial burst of sparks. */
    burst(x, y, color, count, speed, life = 0.6, size = 3) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8), color);
      }
    },
    /** A short engine trail puff behind a moving ship. */
    trail(x, y, color, vx, vy) {
      spawn(x, y, vx + (Math.random() - 0.5) * 30, vy + (Math.random() - 0.5) * 30, 0.35, 2.5, color, 3);
    },
    /** A ring of sparks, for shield pops and bomb blasts. */
    ring(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5, 3, color, 1.2);
      }
    },
    addText(x, y, text, color, size = 18) {
      let slot = null;
      for (let i = 0; i < texts.length; i += 1) if (!texts[i].active) { slot = texts[i]; break; }
      if (!slot) slot = texts[0];
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.life = 0.9;
      slot.maxLife = 0.9;
      slot.text = text;
      slot.color = color;
      slot.size = size;
    },
    shake(magnitude) {
      shakeMag = Math.max(shakeMag, magnitude);
      shakeTime = Math.max(shakeTime, 0.35);
    },
    flash(color) {
      flashColor = color;
      flashTime = 0.22;
    },
    shakeOffset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const m = shakeMag * (shakeTime / 0.35);
      return { x: (Math.random() - 0.5) * 2 * m, y: (Math.random() - 0.5) * 2 * m };
    },
    flashAlpha() {
      return flashTime > 0 ? flashTime / 0.22 : 0;
    },
    flashColor() {
      return flashColor;
    },
    update(dt) {
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = 0; i < texts.length; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) t.active = false;
      }
      if (shakeTime > 0) {
        shakeTime -= dt;
        if (shakeTime <= 0) shakeMag = 0;
      }
      if (flashTime > 0) flashTime -= dt;
    },
    draw(context) {
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        if (!p.active) continue;
        const a = p.life / p.maxLife;
        context.globalAlpha = a;
        context.fillStyle = p.color;
        const s = p.shrink ? p.size * (0.4 + 0.6 * a) : p.size;
        context.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      context.globalAlpha = 1;
      for (let i = 0; i < texts.length; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        context.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.6);
        context.font = `bold ${t.size}px system-ui, sans-serif`;
        context.textAlign = 'center';
        context.fillStyle = t.color;
        context.fillText(t.text, t.x, t.y);
      }
      context.globalAlpha = 1;
    },
  };
}
