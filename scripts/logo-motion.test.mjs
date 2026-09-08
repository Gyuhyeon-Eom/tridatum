import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  logoPose,
  nextHop,
  START,
  frameLayout,
  resolveAnchor,
  GROUND,
} from "../assets/js/logo-motion.mjs";
import { createLogoCharacter } from "../assets/js/logo-character.mjs";
import * as THREE from "../assets/vendor/three/three.module.min.js";

test("random hops stay on adjacent treads and join continuously without resting", () => {
  const levels = [-1, 2, 1, 0];
  for (const mode of [0, 1, 2])
    for (const seed of [8, 92, 517, 9001]) {
      let state = seed;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const frames = frameLayout(mode),
        visited = new Set(),
        destinations = new Set(),
        timings = new Set();
      let hop = nextHop(START, null, random);
      for (let n = 0; n < 120; n++) {
        assert(
          Math.abs(
            levels.indexOf(hop.from.level) - levels.indexOf(hop.to.level),
          ) <= 1,
          "no jump skips a tread",
        );
        assert(
          hop.duration < 1.3 && hop.duration > 0.8,
          "each landing immediately starts another short hop",
        );
        const a = resolveAnchor(hop.from, frames),
          b = resolveAnchor(hop.to, frames);
        assert(
          Math.hypot(b.x - a.x, b.z - a.z) > 0.2,
          "each hop moves to a different location",
        );
        let prev = logoPose(0, hop, frames);
        for (let t = 0; t <= hop.duration; t += 0.006) {
          const p = logoPose(t, hop, frames);
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
          assert(Math.abs(p.x) < 2 && p.z < 3.5 && p.z > -0.1);
          for (const key of ["x", "y", "z", "scaleY"])
            assert(
              Math.abs(p[key] - prev[key]) < 0.08,
              `${key} remains continuous`,
            );
          if (p.phase === "landing")
            assert.equal(p.y, b.y, "landing is on the selected surface");
          prev = p;
        }
        const end = logoPose(hop.duration, hop, frames);
        assert.equal(end.phase, "landed");
        for (const key of ["x", "y", "z"]) assert.equal(end[key], b[key]);
        visited.add(hop.to.level);
        destinations.add(hop.to.x.toFixed(3));
        timings.add(hop.flight.toFixed(3));
        const next = nextHop(hop.to, hop.from.level, random);
        const start = logoPose(0, next, frames);
        for (const key of ["x", "y", "z", "scaleY"])
          assert.equal(
            start[key],
            end[key],
            "new random destinations never teleport the character",
          );
        hop = next;
      }
      assert.equal(visited.size, 4, "ground and all three frames are reached");
      assert(
        destinations.size > 50 && timings.size > 30,
        "both destinations and pace vary",
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
