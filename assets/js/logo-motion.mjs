// Random walks use only adjacent treads and continuous, surface-based landings.
export const GROUND = -1.13;
export const START = { level: -1, x: -1.3, z: 3.25 };
const levels = [-1, 2, 1, 0];
const smooth = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
export function frameLayout(mode = 0) {
  return [0, 1, 2].map((i) => ({
    x: 0,
    y: 0.2 + (2 - i) * (mode === 1 ? 0.18 : 0) - i * 0.54,
    z: (i - 1) * 1.12,
    yaw: (i - 1) * (mode === 2 ? 0.23 : 0.12),
  }));
}
export function resolveAnchor(anchor, frames = frameLayout()) {
  if (anchor.level === -1) return { x: anchor.x, y: GROUND, z: anchor.z };
  const f = frames[anchor.level],
    c = Math.cos(f.yaw),
    s = Math.sin(f.yaw);
  return {
    x: f.x + anchor.x * c + anchor.z * s,
    y: f.y + 0.216,
    z: f.z - anchor.x * s + anchor.z * c,
  };
}

export function nextHop(
  from = START,
  previousLevel = null,
  random = Math.random,
) {
  const rank = levels.indexOf(from.level);
  const choices = [rank - 1, rank + 1, rank]
    .filter((i) => i >= 0 && i < levels.length)
    .map((i) => ({
      level: levels[i],
      weight: i === rank ? 0.22 : levels[i] === previousLevel ? 0.45 : 1,
    }));
  let pick = random() * choices.reduce((sum, c) => sum + c.weight, 0);
  let level = choices.at(-1).level;
  for (const choice of choices) {
    pick -= choice.weight;
    if (pick < 0) {
      level = choice.level;
      break;
    }
  }
  let x;
  if (level === from.level) {
    // Move across the tread, never make a stationary hop or drift off its rim.
    x =
      level === -1
        ? (from.x > 0 ? -1 : 1) * (0.35 + random() * 0.6)
        : (from.x > 0 ? -1 : 1) * (0.2 + random() * 0.1);
  } else x = level === -1 ? (random() - 0.5) * 2.6 : (random() - 0.5) * 0.56;
  const to = { level, x, z: level === -1 ? 3.22 + random() * 0.08 : 1.27 };
  const a = resolveAnchor(from),
    b = resolveAnchor(to);
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const prepare = 0.13 + random() * 0.04,
    recover = 0.15 + random() * 0.04;
  const flight = 0.55 + Math.min(distance, 2.5) * 0.09 + random() * 0.06;
  const height = (from.level === to.level ? 0.3 : 0.5) + random() * 0.13;
  return {
    from,
    to,
    prepare,
    recover,
    flight,
    height,
    duration: prepare + flight + recover,
  };
}
export function standingPose(anchor, frames = frameLayout()) {
  return {
    ...resolveAnchor(anchor, frames),
    scaleX: 1,
    scaleY: 1,
    tilt: 0,
    yaw: 0,
    jump: 0,
    phase: "ready",
    level: anchor.level,
  };
}
export function logoPose(time, hop, frames = frameLayout()) {
  const p = standingPose(hop.from, frames);
  if (time < 0) return p;
  const a = resolveAnchor(hop.from, frames),
    b = resolveAnchor(hop.to, frames);
  const direction = Math.sign(b.x - a.x) || 1;
  if (time < hop.prepare) {
    const u = time / hop.prepare;
    p.scaleY = 1 - 0.14 * smooth(u);
    p.tilt = -direction * 0.035 * Math.sin(Math.PI * u) ** 2;
    p.phase = "anticipation";
  } else if (time < hop.prepare + hop.flight) {
    const u = (time - hop.prepare) / hop.flight,
      travel = smooth(u);
    p.x = lerp(a.x, b.x, travel);
    p.z = lerp(a.z, b.z, travel);
    p.jump = 4 * hop.height * u * (1 - u);
    p.y = lerp(a.y, b.y, travel) + p.jump;
    p.scaleY = 1 + 0.09 * Math.sin(Math.PI * u) - 0.14 * (1 - u) ** 10;
    p.tilt = -direction * 0.11 * Math.sin(2 * Math.PI * u);
    p.yaw = direction * 0.24 * Math.sin(Math.PI * u);
    p.phase = "airborne";
    p.level = -2;
  } else {
    Object.assign(p, b);
    p.level = hop.to.level;
    const u = Math.min(1, (time - hop.prepare - hop.flight) / hop.recover);
    p.scaleY = 1 - 0.17 * Math.sin(Math.PI * u) ** 2;
    p.phase = time < hop.duration ? "landing" : "landed";
  }
  p.scaleX = 1 / Math.sqrt(p.scaleY);
  return p;
}
