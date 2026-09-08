// A continuous route through ground, three exposed treads, and back to ground.
export const REST_DURATION = 4.5;
export const GROUND = -1.13;
export const START = { level: -1, x: -1.3, z: 3.25 };
const flights = [0.72, 0.62, 0.62, 0.58, 0.64, 0.66, 0.74];
const heights = [0.65, 0.52, 0.5, 0.32, 0.45, 0.48, 0.65];
const prepare = 0.16,
  recover = 0.2;
const holds = [0, 0, 0.65, 0, 0, 0, 0];
export const JOURNEY_DURATION = flights.reduce(
  (sum, f, i) => sum + f + prepare + recover + holds[i],
  0,
);
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
export function logoRoute(from = START, direction = 1) {
  const tread = (level, x) => ({ level, x: x * direction, z: 1.27 });
  return [
    from,
    tread(2, -0.22),
    tread(1, 0.14),
    tread(0, -0.18),
    tread(0, 0.28),
    tread(1, -0.1),
    tread(2, 0.24),
    { level: -1, x: direction * 1.3, z: 3.25 },
  ];
}
export function logoPose(time, route = logoRoute(), frames = frameLayout()) {
  const first = resolveAnchor(route[0], frames);
  const base = {
    ...first,
    scaleX: 1,
    scaleY: 1,
    tilt: 0,
    yaw: 0,
    jump: 0,
    phase: "ready",
    level: route[0].level,
    leg: 0,
  };
  if (time < 0) return base;
  let remaining = time;
  for (let i = 0; i < flights.length; i++) {
    const duration = prepare + flights[i] + recover + holds[i];
    if (remaining >= duration) {
      remaining -= duration;
      continue;
    }
    const a = resolveAnchor(route[i], frames),
      b = resolveAnchor(route[i + 1], frames);
    const direction = Math.sign(b.x - a.x) || 1;
    const p = { ...base, ...a, leg: i, level: route[i].level };
    if (remaining < prepare) {
      const u = remaining / prepare;
      p.scaleY = 1 - 0.14 * smooth(u);
      p.tilt = -direction * 0.035 * Math.sin(Math.PI * u) ** 2;
      p.phase = "anticipation";
    } else if (remaining < prepare + flights[i]) {
      const u = (remaining - prepare) / flights[i],
        travel = smooth(u);
      p.x = lerp(a.x, b.x, travel);
      p.z = lerp(a.z, b.z, travel);
      p.jump = 4 * heights[i] * u * (1 - u);
      p.y = lerp(a.y, b.y, travel) + p.jump;
      p.scaleY = 1 + 0.09 * Math.sin(Math.PI * u) - 0.14 * (1 - u) ** 10;
      p.tilt = -direction * 0.11 * Math.sin(2 * Math.PI * u);
      p.yaw = direction * 0.24 * Math.sin(Math.PI * u);
      p.phase = "airborne";
      p.level = -2;
    } else {
      Object.assign(p, b);
      p.level = route[i + 1].level;
      const u = Math.min(1, (remaining - prepare - flights[i]) / recover);
      p.scaleY = 1 - 0.17 * Math.sin(Math.PI * u) ** 2;
      p.phase = u < 1 ? "landing" : "looking";
      if (u === 1 && holds[i]) {
        const glance = (remaining - prepare - flights[i] - recover) / holds[i];
        p.yaw = 0.2 * Math.sin(Math.PI * glance) ** 2;
      }
    }
    p.scaleX = 1 / Math.sqrt(p.scaleY);
    return p;
  }
  const last = route.at(-1);
  return {
    ...base,
    ...resolveAnchor(last, frames),
    level: last.level,
    leg: flights.length,
    phase: "resting",
  };
}
