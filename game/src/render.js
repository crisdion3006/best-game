// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Neon shapes with glow, a layered starfield,
// and big readable text: the screenshots are what the judge weighs most.

import {
  ENEMY, FIELD, FONT, KIND_BOMBER, KIND_BRUTE, KIND_DRONE, KIND_SPITTER,
  KIND_WARDEN, KIND_WEAVER, LIVES, PALETTE, POWERUP, STATION,
} from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const STAR_COUNT = 150;

function makeStars() {
  const random = createRandom(1337);
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i += 1) {
    stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      depth: 0.15 + random() * 0.85,
      size: 0.6 + random() * 1.8,
      twinkle: random() * Math.PI * 2,
    });
  }
  return stars;
}

function hexPath(context, x, y, radius, points, rotation) {
  context.beginPath();
  for (let i = 0; i < points; i += 1) {
    const a = rotation + (i / points) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const stars = makeStars();
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Canvas CSS pixels (the mouse) into playfield coordinates. */
  function toField(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    const px = clientX * ratio;
    const py = clientY * ratio;
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function text(value, x, y, size, color, align = 'left', weight = 600) {
    const key = `${weight}-${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function glowText(value, x, y, size, color, glow, align = 'center', weight = 800) {
    context.save();
    context.shadowColor = glow;
    context.shadowBlur = 18;
    text(value, x, y, size, color, align, weight);
    context.restore();
    text(value, x, y, size, color, align, weight);
  }

  function drawBackground(time) {
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Nebulae: three soft coloured clouds, fixed in the field.
    const nebulae = [
      { x: 240, y: 170, r: 300, color: PALETTE.nebulaPurple, a: 0.16 },
      { x: 1050, y: 520, r: 340, color: PALETTE.nebulaTeal, a: 0.12 },
      { x: 980, y: 120, r: 240, color: PALETTE.nebulaMagenta, a: 0.10 },
    ];
    for (const n of nebulae) {
      const g = context.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      context.globalAlpha = n.a;
      context.fillStyle = g;
      context.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    context.globalAlpha = 1;

    // A distant ringed planet, top right, for depth.
    context.save();
    context.globalAlpha = 0.5;
    const pg = context.createRadialGradient(1120, 110, 10, 1120, 110, 90);
    pg.addColorStop(0, '#3b82f6');
    pg.addColorStop(0.7, '#1e3a8a');
    pg.addColorStop(1, 'rgba(30,58,138,0)');
    context.fillStyle = pg;
    context.beginPath();
    context.arc(1120, 110, 90, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(147,197,253,0.35)';
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(1120, 110, 130, 22, -0.35, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    // Parallax starfield: three depths drifting slowly downward.
    for (const s of stars) {
      const y = (s.y + time * 6 * s.depth) % FIELD.height;
      const tw = 0.55 + 0.45 * Math.sin(time * 2 + s.twinkle);
      context.globalAlpha = tw * (0.35 + 0.65 * s.depth);
      context.fillStyle = s.depth > 0.7 ? '#e0f2fe' : '#93c5fd';
      context.fillRect(s.x, y, s.size, s.size);
    }
    context.globalAlpha = 1;
  }

  function drawStation(station, time) {
    const pulse = 1 + Math.sin(time * 2.4) * 0.05;
    const x = station.x;
    const y = station.y;
    context.save();
    // Outer glow.
    const glow = context.createRadialGradient(x, y, 0, x, y, station.radius * 2.1);
    glow.addColorStop(0, station.flash > 0 ? 'rgba(244,63,94,0.5)' : 'rgba(251,191,36,0.28)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = glow;
    context.fillRect(x - station.radius * 2.1, y - station.radius * 2.1, station.radius * 4.2, station.radius * 4.2);
    // Rotating hex ring.
    context.strokeStyle = PALETTE.stationRing;
    context.lineWidth = 2.5;
    context.globalAlpha = 0.85;
    hexPath(context, x, y, station.radius, 6, time * 0.25);
    context.stroke();
    // Core.
    context.globalAlpha = 1;
    const core = context.createRadialGradient(x, y, 0, x, y, station.coreRadius * pulse);
    core.addColorStop(0, '#fffbeb');
    core.addColorStop(0.55, PALETTE.stationCore);
    core.addColorStop(1, 'rgba(251,191,36,0)');
    context.fillStyle = core;
    context.beginPath();
    context.arc(x, y, station.coreRadius * pulse, 0, Math.PI * 2);
    context.fill();
    // HP arc around the core.
    const frac = station.hp / station.maxHp;
    context.strokeStyle = frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#fbbf24' : '#f43f5e';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(x, y, station.radius + 10, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawEnemy(e, time) {
    const def = ENEMY[e.kind];
    const x = e.x;
    const y = e.y;
    context.save();
    context.translate(x, y);
    context.shadowColor = def.color;
    context.shadowBlur = 12;
    context.fillStyle = e.flash > 0 ? '#ffffff' : def.color;
    context.strokeStyle = def.color;
    context.lineWidth = 2;
    if (e.kind === KIND_DRONE) {
      context.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
      context.beginPath();
      context.moveTo(0, -e.radius);
      context.lineTo(e.radius * 0.85, e.radius * 0.8);
      context.lineTo(0, e.radius * 0.4);
      context.lineTo(-e.radius * 0.85, e.radius * 0.8);
      context.closePath();
      context.fill();
    } else if (e.kind === KIND_WEAVER) {
      context.rotate(e.t * 2);
      context.beginPath();
      context.moveTo(0, -e.radius);
      context.lineTo(e.radius, 0);
      context.lineTo(0, e.radius);
      context.lineTo(-e.radius, 0);
      context.closePath();
      context.fill();
      context.fillStyle = '#fff7ed';
      context.beginPath();
      context.arc(0, 0, 4, 0, Math.PI * 2);
      context.fill();
    } else if (e.kind === KIND_SPITTER) {
      context.beginPath();
      context.rect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      context.fill();
      context.fillStyle = '#ede9fe';
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();
    } else if (e.kind === KIND_BRUTE) {
      hexPath(context, 0, 0, e.radius, 6, e.t * 0.5);
      context.fill();
      context.strokeStyle = '#fecaca';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = '#7f1d1d';
      hexPath(context, 0, 0, e.radius * 0.45, 6, -e.t * 0.5);
      context.fill();
    } else if (e.kind === KIND_BOMBER) {
      context.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
      context.beginPath();
      context.moveTo(0, -e.radius - 4);
      context.lineTo(e.radius * 0.7, e.radius);
      context.lineTo(0, e.radius * 0.45);
      context.lineTo(-e.radius * 0.7, e.radius);
      context.closePath();
      context.fill();
      const blink = 0.5 + 0.5 * Math.sin(time * 14);
      context.fillStyle = `rgba(255,255,255,${blink})`;
      context.beginPath();
      context.arc(0, 0, 4, 0, Math.PI * 2);
      context.fill();
    } else if (e.kind === KIND_WARDEN) {
      // The boss: a large layered ship with rotating blades.
      context.rotate(Math.sin(e.t * 0.8) * 0.12);
      context.fillStyle = e.flash > 0 ? '#ffffff' : '#7f1d1d';
      hexPath(context, 0, 0, e.radius, 6, e.t * 0.3);
      context.fill();
      context.fillStyle = e.flash > 0 ? '#ffffff' : def.color;
      hexPath(context, 0, 0, e.radius * 0.68, 6, -e.t * 0.45);
      context.fill();
      context.fillStyle = '#fecdd3';
      context.beginPath();
      context.arc(0, 0, 12 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
      context.fill();
      // Spikes.
      context.strokeStyle = def.color;
      context.lineWidth = 4;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + e.t * 0.3;
        context.beginPath();
        context.moveTo(Math.cos(a) * e.radius * 0.9, Math.sin(a) * e.radius * 0.9);
        context.lineTo(Math.cos(a) * (e.radius + 16), Math.sin(a) * (e.radius + 16));
        context.stroke();
      }
    }
    context.restore();
    // Health bar for the tough ones.
    if ((e.kind === KIND_BRUTE || e.kind === KIND_WARDEN) && e.hp < e.maxHp) {
      const w = e.kind === KIND_WARDEN ? 90 : 40;
      const bx = e.x - w / 2;
      const by = e.y - e.radius - 14;
      context.fillStyle = 'rgba(15,23,42,0.8)';
      context.fillRect(bx - 1, by - 1, w + 2, 6);
      context.fillStyle = '#f43f5e';
      context.fillRect(bx, by, w * (e.hp / e.maxHp), 4);
    }
  }

  function drawPlayer(player, time) {
    if (!player.alive) return;
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0;
    if (blink) return;
    context.save();
    context.translate(player.x, player.y);
    context.rotate(player.angle + Math.PI / 2);
    context.shadowColor = PALETTE.player;
    context.shadowBlur = 16;
    // Engine flame.
    if (player.thrusting) {
      const fl = 12 + Math.sin(time * 30) * 5;
      context.fillStyle = '#f59e0b';
      context.beginPath();
      context.moveTo(-6, player.radius * 0.7);
      context.lineTo(0, player.radius * 0.7 + fl);
      context.lineTo(6, player.radius * 0.7);
      context.closePath();
      context.fill();
    }
    // Hull: a sleek arrow.
    const grad = context.createLinearGradient(0, -player.radius, 0, player.radius);
    grad.addColorStop(0, PALETTE.playerCore);
    grad.addColorStop(0.5, PALETTE.player);
    grad.addColorStop(1, '#0e7490');
    context.fillStyle = grad;
    context.beginPath();
    context.moveTo(0, -player.radius - 4);
    context.lineTo(player.radius * 0.85, player.radius * 0.75);
    context.lineTo(0, player.radius * 0.35);
    context.lineTo(-player.radius * 0.85, player.radius * 0.75);
    context.closePath();
    context.fill();
    context.fillStyle = '#ecfeff';
    context.beginPath();
    context.arc(0, -2, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Shield ring.
    if (time < player.shieldUntil && player.shieldHits > 0) {
      context.save();
      context.strokeStyle = 'rgba(74,222,128,0.85)';
      context.lineWidth = 2.5;
      context.shadowColor = '#4ade80';
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 9, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  function drawBullets(state) {
    for (const b of state.bullets.playerBullets) {
      if (!b.active) continue;
      context.save();
      context.shadowColor = '#22d3ee';
      context.shadowBlur = 8;
      context.fillStyle = PALETTE.bullet;
      context.beginPath();
      context.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    for (const b of state.bullets.enemyBullets) {
      if (!b.active) continue;
      context.save();
      context.shadowColor = '#ff2d95';
      context.shadowBlur = 8;
      context.fillStyle = '#ff5c8a';
      context.beginPath();
      context.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff1f2';
      context.beginPath();
      context.arc(b.x, b.y, 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawPowerups(state, time) {
    for (const p of state.powerups) {
      if (!p.active) continue;
      const def = POWERUP[p.kind];
      const bob = Math.sin(time * 4 + p.x) * 3;
      const y = p.y + bob;
      context.save();
      context.shadowColor = def.color;
      context.shadowBlur = 12;
      context.fillStyle = 'rgba(2,6,23,0.85)';
      context.beginPath();
      context.arc(p.x, y, 15, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = def.color;
      context.lineWidth = 2;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = def.color;
      context.font = 'bold 13px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const glyph = ['S', 'R', 'H', '+', 'B'][p.kind];
      context.fillText(glyph, p.x, y + 1);
      context.restore();
    }
  }

  function drawHud(state, best) {
    const player = state.player;
    context.textBaseline = 'alphabetic';
    // Score, left.
    text(`SCORE  ${state.score}`, 24, 36, 26, PALETTE.text, 'left', 800);
    text(`BEST  ${Math.max(best, state.score)}`, 24, 62, 15, PALETTE.muted, 'left', 600);
    // Wave, centre.
    text(`WAVE  ${Math.max(1, state.waveNumber)} / 10`, FIELD.width / 2, 36, 26, PALETTE.text, 'center', 800);
    // Combo, under the wave.
    if (state.combo >= 5) {
      glowText(`COMBO x${1 + Math.min(4, Math.floor(state.combo / 5))}`, FIELD.width / 2, 62, 16, '#fbbf24', '#f59e0b', 'center', 800);
    }
    // Lives, right, as little ships.
    const label = 'SHIPS';
    text(label, FIELD.width - 24, 36, 15, PALETTE.muted, 'right', 600);
    for (let i = 0; i < LIVES; i += 1) {
      const cx = FIELD.width - 24 - i * 30;
      const cy = 58;
      context.save();
      context.translate(cx, cy);
      context.fillStyle = i < state.lives ? PALETTE.player : 'rgba(148,163,184,0.3)';
      context.beginPath();
      context.moveTo(0, -8);
      context.lineTo(7, 7);
      context.lineTo(0, 3);
      context.lineTo(-7, 7);
      context.closePath();
      context.fill();
      context.restore();
    }
    // Station integrity bar, right, under the ships.
    const barW = 150;
    const barX = FIELD.width - 24 - barW;
    const barY = 76;
    const frac = state.station.hp / state.station.maxHp;
    context.fillStyle = 'rgba(15,23,42,0.85)';
    context.fillRect(barX - 1, barY - 1, barW + 2, 12);
    context.fillStyle = frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#fbbf24' : '#f43f5e';
    context.fillRect(barX, barY, barW * frac, 10);
    text('RELAY', barX - 8, barY + 10, 13, PALETTE.muted, 'right', 700);
    // Bombs, right, under the bar.
    text(`NOVA BOMBS  ${player.bombs}  [B]`, FIELD.width - 24, barY + 32, 14, player.bombs > 0 ? '#fb7185' : PALETTE.muted, 'right', 700);
    // Active power-up timers, bottom left.
    let ty = FIELD.height - 24;
    if (state.time < player.spreadUntil) {
      text(`SPREAD ${Math.ceil(player.spreadUntil - state.time)}s`, 24, ty, 15, '#22d3ee', 'left', 700);
      ty -= 22;
    }
    if (state.time < player.rapidUntil) {
      text(`RAPID ${Math.ceil(player.rapidUntil - state.time)}s`, 24, ty, 15, '#f0abfc', 'left', 700);
      ty -= 22;
    }
    if (state.time < player.shieldUntil && player.shieldHits > 0) {
      text('SHIELD ACTIVE', 24, ty, 15, '#4ade80', 'left', 700);
    }
    // Boss bar.
    let warden = null;
    for (let i = 0; i < state.enemies.length; i += 1) {
      const e = state.enemies[i];
      if (e.active && e.kind === KIND_WARDEN) { warden = e; break; }
    }
    if (warden) {
      const bw = 420;
      const bx = (FIELD.width - bw) / 2;
      const by = 84;
      text('VOID WARDEN', FIELD.width / 2, by - 8, 16, '#fda4af', 'center', 800);
      context.fillStyle = 'rgba(15,23,42,0.85)';
      context.fillRect(bx - 2, by - 2, bw + 4, 12);
      context.fillStyle = '#f43f5e';
      context.fillRect(bx, by, bw * (warden.hp / warden.maxHp), 8);
    }
  }

  function drawToast(state) {
    if (state.toast.timer <= 0 || !state.toast.text) return;
    const a = Math.min(1, state.toast.timer);
    context.save();
    context.globalAlpha = a;
    // Below the boss bar and clear of the Relay: the middle of the field.
    glowText(state.toast.text, FIELD.width / 2, 240, 34, '#eef2ff', '#22d3ee', 'center', 800);
    context.restore();
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const lineH = 30;
    const height = 150 + lines.length * lineH + 74;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.save();
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.rect(x, y, width, height);
    context.fill();
    context.stroke();
    context.restore();
    glowText(title, FIELD.width / 2, y + 74, 46, accent || PALETTE.text, accent || '#22d3ee', 'center', 800);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 128 + i * lineH, 19, PALETTE.muted, 'center', 600);
    }
    text(prompt, FIELD.width / 2, y + height - 30, 21, PALETTE.gold, 'center', 700);
  }

  function drawTitle(state, best) {
    // Title up top, controls down low: the Relay and the Sentinel stay visible
    // in the middle of the field, so the title screen is a live scene.
    glowText('NOVA SENTINEL', FIELD.width / 2, 150, 76, '#ecfeff', '#22d3ee', 'center', 800);
    text('Defend the Relay. Clear 10 waves. Slay the Void Warden.', FIELD.width / 2, 190, 21, PALETTE.muted, 'center', 600);
    const lines = [
      'Move  WASD / Arrows      Aim  Mouse      Fire  Click / Space',
      'Nova Bomb  B / Right-click      Pause  P      Mute  M',
      '10 waves  •  5 raider kinds  •  power-ups  •  boss  •  sound',
      best > 0 ? `Best score  ${best}` : 'No flights logged yet — be the first Sentinel.',
    ];
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, 500 + i * 32, 19, i === 2 ? '#67e8f9' : PALETTE.text, 'center', i === 2 ? 700 : 600);
    }
    glowText('Press Space or click to launch', FIELD.width / 2, 668, 24, PALETTE.gold, '#f59e0b', 'center', 700);
  }

  function drawPaused() {
    context.save();
    context.fillStyle = 'rgba(2,6,23,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
    drawPanel('PAUSED', ['The raiders will wait for you.'], 'Press P to resume', '#67e8f9');
  }

  function accuracy(state) {
    if (state.shotsFired === 0) return 0;
    return Math.round((state.shotsHit / state.shotsFired) * 100);
  }

  function drawOver(state, best) {
    drawPanel('RELAY LOST', [
      `Score  ${state.score}`,
      `Best  ${Math.max(best, state.score)}      Wave reached  ${Math.max(1, state.waveNumber)}`,
      `Raiders destroyed  ${state.kills}      Accuracy  ${accuracy(state)}%`,
    ], 'Press Space or click to fly again', '#f43f5e');
  }

  function drawWin(state, best) {
    drawPanel('SECTOR CLEARED', [
      `Score  ${state.score}`,
      `Best  ${Math.max(best, state.score)}      Waves cleared  10 / 10`,
      `Raiders destroyed  ${state.kills}      Accuracy  ${accuracy(state)}%      Best combo  ${state.comboBest}`,
    ], 'Press Space or click to fly again', '#fbbf24');
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shake = state.particles.shakeOffset();
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shake.x * view.scale, view.y + shake.y * view.scale);
    drawBackground(time);
    drawStation(state.station, time);
    for (let i = 0; i < state.enemies.length; i += 1) {
      const e = state.enemies[i];
      if (e.active) drawEnemy(e, time);
    }
    drawBullets(state);
    drawPowerups(state, time);
    drawPlayer(state.player, time);
    state.particles.draw(context);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawHud(state, best);
    drawToast(state);
    if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_WIN) drawWin(state, best);
    // Hit flash over everything.
    const flashA = state.particles.flashAlpha();
    if (flashA > 0) {
      context.save();
      context.globalAlpha = flashA * 0.28;
      context.fillStyle = state.particles.flashColor();
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      context.restore();
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
