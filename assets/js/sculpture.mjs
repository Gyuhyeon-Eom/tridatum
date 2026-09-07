import * as THREE from "../vendor/three/three.module.min.js";

// Original three-layer solid. Geometry, lighting and motion are generated locally.
const host = document.querySelector("[data-sculpture]");
if (host) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    host.prepend(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
    camera.position.set(5.6, 4.4, 8.2);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.HemisphereLight(0xf6fff9, 0x294438, 3));
    const key = new THREE.DirectionalLight(0xf4fff9, 5);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb9e4d2, 4);
    rim.position.set(4, 2, -4);
    scene.add(rim);
    const front = new THREE.DirectionalLight(0xffffff, 1.4);
    front.position.set(1, -3, 5);
    scene.add(front);
    // A procedural studio environment gives the curved bevels broad reflected highlights.
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color("#406957");
    [
      [-4, 4, 2, 8, 4],
      [3, 2, 0, 3, 6],
      [0, 5, -4, 7, 2],
    ].forEach(([x, y, z, w, h]) => {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
        }),
      );
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      envScene.add(panel);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(envScene, 0.15);
    scene.environment = environment.texture;
    pmrem.dispose();
    function rectangle(path, size, r, clockwise = false) {
      const a = -size / 2,
        b = size / 2;
      path.moveTo(a + r, a);
      path.lineTo(b - r, a);
      path.quadraticCurveTo(b, a, b, a + r);
      path.lineTo(b, b - r);
      path.quadraticCurveTo(b, b, b - r, b);
      path.lineTo(a + r, b);
      path.quadraticCurveTo(a, b, a, b - r);
      path.lineTo(a, a + r);
      path.quadraticCurveTo(a, a, a + r, a);
      return path;
    }
    const shape = rectangle(new THREE.Shape(), 2.9, 0.46);
    shape.holes.push(rectangle(new THREE.Path(), 1.65, 0.35));
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.085,
      bevelThickness: 0.085,
      curveSegments: 16,
    });
    geometry.center();
    geometry.rotateX(-Math.PI / 2);
    const colors = ["#c1dfd0", "#559d7e", "#194b36"];
    const layers = colors.map((color, i) => {
      const material = new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.4,
        roughness: 0.23,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = (1 - i) * 0.71;
      mesh.rotation.y = (i - 1) * 0.16;
      group.add(mesh);
      return mesh;
    });
    // Recessed data marks travel with each solid layer.
    layers.forEach((layer, i) => {
      for (let j = 0; j < 4; j++) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.012, 0.14 + j * 0.028),
          new THREE.MeshStandardMaterial({
            color: i === 2 ? "#81b6a3" : "#2d624e",
            metalness: 0.3,
            roughness: 0.45,
          }),
        );
        mark.position.set(-0.25 + j * 0.16, 0.218, 1.16);
        layer.add(mark);
      }
    });
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.36, 1),
      new THREE.MeshPhysicalMaterial({
        color: "#a5d4be",
        metalness: 0.65,
        roughness: 0.18,
      }),
    );
    group.add(core);
    const shadow = document.createElement("div");
    shadow.className = "sculpture-shadow";
    host.append(shadow);
    let px = 0,
      py = 0,
      mode = 0,
      visible = true,
      raf = 0,
      last = 0,
      elapsed = 0;
    const hero = host.closest(".masthead");
    const controls = [...document.querySelectorAll("[data-sculpture-mode]")];
    function select(i) {
      mode = i;
      controls.forEach((b, j) =>
        b.setAttribute("aria-pressed", String(i === j)),
      );
      start();
    }
    controls.forEach((b) =>
      b.addEventListener("click", () =>
        select(Number(b.dataset.sculptureMode)),
      ),
    );
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = hero.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      start();
    });
    hero.addEventListener("pointerleave", () => {
      px = py = 0;
    });
    const progress = () =>
      Math.max(0, Math.min(1, scrollY / Math.max(hero.offsetHeight, 1)));
    function draw(now) {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (!reduced.matches) elapsed += dt;
      const p = progress(),
        slow = Math.sin(elapsed * 0.23);
      const factor = reduced.matches ? 1 : 1 - Math.exp(-dt * 5);
      const tilt = reduced.matches ? 0 : px * 0.34;
      group.rotation.y +=
        (mode * 0.55 + tilt + slow * 0.16 + p * 0.5 - group.rotation.y) *
        factor;
      group.rotation.z +=
        (-0.12 + (reduced.matches ? 0 : py * 0.12) - group.rotation.z) * factor;
      group.position.y = reduced.matches
        ? 0
        : Math.sin(elapsed * 0.65) * 0.05 - p * 0.12;
      layers.forEach((layer, i) => {
        const spread =
          0.71 + (mode === 1 ? 0.35 : mode === 2 ? 0.14 : 0) + p * 0.35;
        layer.position.y += ((1 - i) * spread - layer.position.y) * factor;
        layer.rotation.y +=
          ((i - 1) * (mode === 2 ? 0.65 : 0.16) - layer.rotation.y) * factor;
      });
      core.rotation.y = elapsed * 0.22;
      renderer.render(scene, camera);
      host.dataset.rendered = "true";
      if (visible && !document.hidden && !reduced.matches && p < 1.1)
        raf = requestAnimationFrame(draw);
    }
    function start() {
      if (!raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    }
    function resize() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      start();
    }
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) start();
        else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 },
    ).observe(hero);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else start();
    });
    reduced.addEventListener("change", () => {
      elapsed = 0;
      px = py = 0;
      start();
    });
    addEventListener(
      "scroll",
      () => {
        visible = progress() < 1;
        start();
      },
      { passive: true },
    );
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      host.removeAttribute("data-rendered");
    });
    renderer.domElement.addEventListener("webglcontextrestored", () =>
      location.reload(),
    );
    resize();
    start();
  } catch {
    renderer?.dispose();
    host.removeAttribute("data-rendered");
  }
}
