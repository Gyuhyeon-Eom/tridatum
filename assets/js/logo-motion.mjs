// Time-based hops: anticipation, ballistic flight, contact and recovery.
export const JOURNEY_DURATION = 3.02;
export const REST_DURATION = 7;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (u) => u * u * (3 - 2 * u);
const flights = [0.68, 0.58, 0.56];
const heights = [0.83, 0.62, 0.4];
const prepare = 0.18;
const recover = 0.22;
export function logoPose(time, route = [0, -0.88, 0.82, 0]) {
  let remaining = Math.max(0, time);
  const pose = {
    x: route[0],
    y: 0,
    scaleX: 1,
    scaleY: 1,
    tilt: 0,
    yaw: 0,
    impact: 0,
    phase: "ready",
  };
  if (time < 0) return pose;
  for (let i = 0; i < 3; i++) {
    const duration = prepare + flights[i] + recover;
    if (remaining >= duration) {
      remaining -= duration;
      continue;
    }
    const direction = Math.sign(route[i + 1] - route[i]);
    pose.x = route[i];
    if (remaining < prepare) {
      const u = remaining / prepare;
      pose.scaleY = 1 - 0.14 * smooth(u);
      pose.tilt = -direction * 0.04 * Math.sin(Math.PI * u) ** 2;
      pose.phase = "anticipation";
    } else if (remaining < prepare + flights[i]) {
      const u = (remaining - prepare) / flights[i];
      pose.x = route[i] + (route[i + 1] - route[i]) * smooth(u);
      pose.y = 4 * heights[i] * u * (1 - u);
      pose.scaleY = 1 + 0.09 * Math.sin(Math.PI * u) - 0.14 * (1 - u) ** 10;
      pose.tilt = -direction * 0.13 * Math.sin(2 * Math.PI * u);
      pose.yaw = direction * 0.36 * Math.sin(Math.PI * u);
      pose.phase = "airborne";
    } else {
      const u = (remaining - prepare - flights[i]) / recover;
      pose.x = route[i + 1];
      pose.scaleY = 1 - 0.18 * Math.sin(Math.PI * u) ** 2;
      pose.impact = 1 - u;
      pose.phase = "landing";
    }
    pose.scaleX = 1 / Math.sqrt(pose.scaleY);
    return pose;
  }
  return { ...pose, x: clamp(route[3], -1, 1), phase: "resting" };
}
export function logoRoute(from = 0, target = 0, direction = 1) {
  return [
    clamp(from, -1, 1),
    -0.88 * direction,
    0.82 * direction,
    clamp(target, -1, 1),
  ];
}
