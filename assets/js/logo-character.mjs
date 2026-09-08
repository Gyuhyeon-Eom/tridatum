import * as THREE from "../vendor/three/three.module.min.js";

// The same centerlines as logo-symbol.svg, rounded into a soft tubular body.
// Four strokes preserve the interlocking t/d and both open spaces.
export function createLogoCharacter(material) {
  const group = new THREE.Group(),
    radius = 0.205;
  const point = (x, y) =>
    new THREE.Vector3((x - 32.5) * 0.052, (55 - y) * 0.052 + radius, 0);
  function stroke(curves, closed = false) {
    const path = new THREE.CurvePath();
    curves.forEach((c) => path.add(c));
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(path, 120, radius, 16, closed),
      material,
    );
    tube.castShadow = true;
    group.add(tube);
    if (!closed)
      for (const p of [path.getPoint(0), path.getPoint(1)]) {
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 20, 16),
          material,
        );
        cap.position.copy(p);
        cap.castShadow = true;
        group.add(cap);
      }
  }
  stroke([
    new THREE.LineCurve3(point(17, 14), point(17, 44)),
    new THREE.QuadraticBezierCurve3(
      point(17, 44),
      point(17, 55),
      point(27, 55),
    ),
    new THREE.LineCurve3(point(27, 55), point(29, 55)),
  ]);
  stroke([new THREE.LineCurve3(point(9, 28), point(32, 28))]);
  stroke([new THREE.LineCurve3(point(56, 14), point(56, 55))]);
  stroke(
    [
      new THREE.CubicBezierCurve3(
        point(56, 40),
        point(56, 21),
        point(30, 21),
        point(30, 40),
      ),
      new THREE.CubicBezierCurve3(
        point(30, 40),
        point(30, 59),
        point(56, 59),
        point(56, 40),
      ),
    ],
    true,
  );
  return group;
}
