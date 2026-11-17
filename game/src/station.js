// The Nova Relay: the glowing core at the field's centre that the raiders are
// trying to destroy. It has hit points, flashes when hurt, and slowly repairs
// itself between waves.

import { STATION } from './config.js';

export function createStation() {
  return {
    x: STATION.x,
    y: STATION.y,
    radius: STATION.radius,
    coreRadius: STATION.coreRadius,
    hp: STATION.maxHp,
    maxHp: STATION.maxHp,
    flash: 0,
  };
}

export function resetStation(station) {
  station.hp = station.maxHp;
  station.flash = 0;
}

/** Damage the station; returns true when it was destroyed. */
export function damageStation(station, amount) {
  station.hp = Math.max(0, station.hp - amount);
  station.flash = 0.3;
  return station.hp <= 0;
}

/** Mend the station between waves. */
export function repairStation(station, amount) {
  station.hp = Math.min(station.maxHp, station.hp + amount);
}

export function updateStation(station, dt) {
  if (station.flash > 0) station.flash -= dt;
}
