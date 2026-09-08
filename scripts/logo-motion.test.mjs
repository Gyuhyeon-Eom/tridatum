import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  logoPose,
  logoRoute,
  JOURNEY_DURATION,
} from "../assets/js/logo-motion.mjs";
import { createLogoCharacter } from "../assets/js/logo-character.mjs";
import * as THREE from "../assets/vendor/three/three.module.min.js";

test("all trajectories stay above the floor, remain bounded and settle at their destination", () => {
  for (const target of [-0.85, 0, 0.85])
    for (const direction of [-1, 1]) {
      const route = logoRoute(0.8, target, direction);
      let prev = logoPose(0, route);
      for (let t = 0; t <= JOURNEY_DURATION + 0.02; t += 0.002) {
        const p = logoPose(t, route);
        for (const key of [
          "x",
          "y",
          "scaleX",
          "scaleY",
          "tilt",
          "yaw",
          "impact",
        ])
          assert(Number.isFinite(p[key]));
        assert(p.y >= 0 && p.y < 0.84);
        assert(Math.abs(p.x) <= 1);
        assert(p.scaleY >= 0.81 && p.scaleY <= 1.1);
        assert(
          Math.abs(p.x - prev.x) < 0.02,
          "horizontal movement is continuous",
        );
        assert(
          Math.abs(p.y - prev.y) < 0.02,
          "contact does not teleport vertically",
        );
        assert(
          Math.abs(p.scaleY - prev.scaleY) < 0.02,
          "squash/stretch is continuous",
        );
        prev = p;
      }
      const rest = logoPose(JOURNEY_DURATION + 1, route);
      assert.equal(rest.x, target);
      assert.equal(rest.y, 0);
      assert.equal(rest.scaleY, 1);
      assert.equal(rest.phase, "resting");
    }
});
test("the rounded character keeps the brand centerlines and both open spaces", () => {
  const svg = readFileSync(
    new URL("../assets/img/logo-symbol.svg", import.meta.url),
    "utf8",
  );
  assert(svg.includes("M17 14v30q0 11 10 11h2M9 28h23"));
  assert(svg.includes("M56 14v41m0-15c0-19-26-19-26 0s26 19 26 0"));
  const material = new THREE.MeshBasicMaterial();
  const character = createLogoCharacter(material);
  character.updateMatrixWorld(true);
  const cast = (x, y) =>
    new THREE.Raycaster(
      new THREE.Vector3((x - 32.5) * 0.052, (55 - y) * 0.052 + 0.205, 4),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(character, true);
  assert.equal(cast(43, 40).length, 0, "the d counter remains open");
  assert.equal(cast(23, 40).length, 0, "the t/d gap remains open");
  assert(cast(17, 20).length > 0, "the t stem is solid");
  assert(cast(56, 20).length > 0, "the d stem is solid");
  character.traverse((o) => {
    if (o.geometry) {
      assert(
        [...o.geometry.getAttribute("position").array].every(Number.isFinite),
      );
      o.geometry.dispose();
    }
  });
  material.dispose();
});
