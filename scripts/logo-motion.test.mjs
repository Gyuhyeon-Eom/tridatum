import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  logoPose,
  logoRoute,
  JOURNEY_DURATION,
  frameLayout,
  resolveAnchor,
  GROUND,
} from "../assets/js/logo-motion.mjs";
import { createLogoCharacter } from "../assets/js/logo-character.mjs";
import * as THREE from "../assets/vendor/three/three.module.min.js";

test("routes climb all three treads and return to the ground without position jumps", () => {
  for (const mode of [0, 1, 2])
    for (const direction of [-1, 1]) {
      const frames = frameLayout(mode);
      const route = logoRoute(
        { level: -1, x: -direction * 1.3, z: 3.25 },
        direction,
      );
      let prev = logoPose(0, route, frames);
      const landings = [];
      for (let t = 0; t <= JOURNEY_DURATION + 0.02; t += 0.002) {
        const p = logoPose(t, route, frames);
        for (const key of [
          "x",
          "y",
          "z",
          "scaleX",
          "scaleY",
          "tilt",
          "yaw",
          "jump",
        ])
          assert(Number.isFinite(p[key]));
        assert(p.y >= GROUND && p.y < 2);
        assert(Math.abs(p.x) < 2 && Math.abs(p.z) < 3.5);
        assert(p.scaleY >= 0.82 && p.scaleY <= 1.1);
        for (const key of ["x", "y", "z", "scaleY"])
          assert(
            Math.abs(p[key] - prev[key]) < 0.03,
            `${key} changes continuously`,
          );
        if (p.phase === "landing" && prev.phase === "airborne")
          landings.push(p.level);
        if (p.phase === "landing" || p.phase === "looking") {
          const anchor = resolveAnchor(route[p.leg + 1], frames);
          assert.equal(p.y, anchor.y, "every landing touches its own tread");
        }
        prev = p;
      }
      assert.deepEqual(landings, [2, 1, 0, 0, 1, 2, -1]);
      const rest = logoPose(JOURNEY_DURATION + 1, route, frames);
      assert.equal(rest.y, GROUND);
      assert.equal(rest.x, direction * 1.3);
      assert.equal(rest.scaleY, 1);
      assert.equal(rest.phase, "resting");
      const next = logoPose(0, logoRoute(route.at(-1), -direction), frames);
      for (const key of ["x", "y", "z"])
        assert.equal(
          next[key],
          rest[key],
          "repeated routes share the same ground contact",
        );
    }
});
test("the rounded character keeps the brand centerlines and both open spaces", () => {
  const svg = readFileSync(
    new URL("../assets/img/logo-symbol.svg", import.meta.url),
    "utf8",
  );
  assert(svg.includes("M17 14v30q0 11 10 11h2M9 28h23"));
  assert(svg.includes("M56 20v35m0-12c0-15-22-15-22 0s22 15 22 0"));
  const material = new THREE.MeshBasicMaterial();
  const accent = new THREE.MeshBasicMaterial({ color: "#eed500" });
  const character = createLogoCharacter(material, accent);
  const dot = character.getObjectByName("brand-dot");
  assert.equal(dot.material, accent);
  assert(dot.position.y > 2.4);
  assert(svg.includes('cx="56" cy="12" r="3.65" fill="#eed500"'));
  character.updateMatrixWorld(true);
  const cast = (x, y) =>
    new THREE.Raycaster(
      new THREE.Vector3((x - 32.5) * 0.052, (55 - y) * 0.052 + 0.205, 4),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(character, true);
  assert.equal(cast(45, 43).length, 0, "the d counter remains open");
  assert.equal(cast(23, 40).length, 0, "the t/d gap remains open");
  assert(cast(17, 20).length > 0, "the t stem is solid");
  assert(cast(56, 25).length > 0, "the d stem is solid");
  character.traverse((o) => {
    if (o.geometry) {
      assert(
        [...o.geometry.getAttribute("position").array].every(Number.isFinite),
      );
      o.geometry.dispose();
    }
  });
  material.dispose();
  accent.dispose();
});
