import * as THREE from "../vendor/three/three.module.min.js";
import { createLogoCharacter } from "./logo-character.mjs?v=20260908b2";
import {
  logoPose,
  logoRoute,
  JOURNEY_DURATION,
  REST_DURATION,
  frameLayout,
} from "./logo-motion.mjs?v=20260908b2";

const host = document.querySelector("[data-sculpture]");
if (host) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const controls = document.querySelector(".sculpture-controls");
  const modes = [...document.querySelectorAll("[data-sculpture-mode]")];
  let mode = 0;
  const pause = document.querySelector("[data-logo-pause]");
  const trigger = document.querySelector("[data-logo-jump]");
  let renderer,
    observer,
    resizeObserver,
    environment,
    disposed = false;
  let raf = 0,
    last = 0,
    elapsed = -1.25,
    visible = false,
    paused = false,
    lost = false;
  let route = logoRoute(),
    direction = 1,
    pointer = 0,
    look = 0,
    queuedTarget = null;
  let currentPose = logoPose(-1),
    lastUi = "",
    frameKey = "",
    dirty = true;
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function ui() {
    const key = [reduced.matches, lost, paused, currentPose.phase].join(":");
    if (key === lastUi) return;
    lastUi = key;
    const staticOnly = reduced.matches || lost;
    controls.hidden = trigger.hidden = staticOnly;
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute(
      "aria-label",
      paused ? "td 로고 모션 재생" : "td 로고 모션 일시정지",
    );
    pause.querySelector("[data-pause-label]").textContent = paused
      ? "재생하기"
      : "멈추기";
    host.dataset.motion = lost
      ? "fallback"
      : reduced.matches
        ? "reduced"
        : paused
          ? "paused"
          : currentPose.phase;
  }
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 40);
    camera.position.set(5, 4.4, 8.5);
    camera.lookAt(0, 0.25, 0.5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 4.3);
    key.position.set(-3, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -4,
      right: 4,
      top: 5,
      bottom: -3,
      near: 0.1,
      far: 20,
    });
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    key.shadow.bias = -0.0001;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 3.5);
    rim.position.set(4, 3, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 1);
    fill.position.set(1, 0, 6);
    scene.add(fill);

    function studioEnvironment() {
      environment?.dispose();
      const studio = new THREE.Scene();
      studio.background = new THREE.Color("#777777");
      for (const [x, y, z, w, h] of [
        [-4, 4, 3, 6, 4],
        [4, 2, 0, 3, 6],
        [0, 5, -4, 7, 2],
      ]) {
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          }),
        );
        panel.position.set(x, y, z);
        panel.lookAt(0, 0, 0);
        studio.add(panel);
      }
      const generator = new THREE.PMREMGenerator(renderer);
      environment = generator.fromScene(studio, 0.035);
      scene.environment = environment.texture;
      generator.dispose();
      studio.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    studioEnvironment();
    // Offset the original frames into exposed treads. The character follows
    // world-space landing anchors across all three levels and the ground.
    function rectangle(path, size, r) {
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
    const frame = rectangle(new THREE.Shape(), 2.9, 0.46);
    frame.holes.push(rectangle(new THREE.Path(), 1.65, 0.35));
    const frameGeometry = new THREE.ExtrudeGeometry(frame, {
      depth: 0.26,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.085,
      bevelThickness: 0.085,
      curveSegments: 16,
    });
    frameGeometry.center();
    frameGeometry.rotateX(-Math.PI / 2);
    const stack = new THREE.Group();
    scene.add(stack);
    const initialFrames = frameLayout();
    const layers = ["#eeeeee", "#8d8d8d", "#161616"].map((color, i) => {
      const layer = new THREE.Mesh(
        frameGeometry,
        new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0.25,
          roughness: 0.32,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
          envMapIntensity: 0.8,
        }),
      );
      const f = initialFrames[i];
      layer.position.set(f.x, f.y, f.z);
      layer.rotation.y = f.yaw;
      layer.castShadow = layer.receiveShadow = true;
      stack.add(layer);
      const print = document.createElement("canvas");
      print.width = 512;
      print.height = 128;
      const c = print.getContext("2d");
      c.font = "500 66px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = i === 2 ? "#ffffff" : "#333333";
      c.fillText(["DATA", "MODEL", "SYSTEM"][i], 256, 64);
      const map = new THREE.CanvasTexture(print);
      map.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.78, 0.195),
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          depthWrite: false,
        }),
      );
      label.position.set(0, 0, 1.541);
      layer.add(label);
      return layer;
    });
    const material = new THREE.MeshPhysicalMaterial({
      color: "#101113",
      metalness: 0.02,
      roughness: 0.3,
      clearcoat: 0.32,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.6,
    });
    const accentMaterial = new THREE.MeshPhysicalMaterial({
      color: "#f5db00",
      roughness: 0.32,
      metalness: 0.02,
      clearcoat: 0.3,
    });
    const character = createLogoCharacter(material, accentMaterial);
    const halfWidth = 1.43,
      characterScale = 0.49;
    const body = new THREE.Group();
    body.add(character);
    scene.add(body);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.07 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.13;
    floor.receiveShadow = true;
    scene.add(floor);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,.3)");
    gradient.addColorStop(0.45, "rgba(0,0,0,.12)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(canvas);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 7),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.115;
    scene.add(shadow);
    function begin(target = 0, schedule = true) {
      // Complete the current landing before accepting another destination.
      // Rapid clicks never reset an airborne body onto the floor.
      if (elapsed >= 0 && elapsed < JOURNEY_DURATION) {
        queuedTarget = target;
        return;
      }
      const travelDirection = target ? Math.sign(target) : direction;
      const from = elapsed < 0 ? route[0] : route.at(-1);
      route = logoRoute(from, travelDirection);
      direction = -travelDirection;
      elapsed = 0;
      queuedTarget = null;
      paused = false;
      ui();
      if (schedule) start();
    }
    function draw(now) {
      raf = 0;
      if (disposed || lost || !visible || document.hidden) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (!paused && !reduced.matches) elapsed += dt;
      if (!paused && !reduced.matches && elapsed >= JOURNEY_DURATION) {
        if (queuedTarget !== null) begin(queuedTarget, false);
        else if (elapsed >= JOURNEY_DURATION + REST_DURATION) begin(0, false);
      }
      const settle = reduced.matches ? 1 : paused ? 0 : 1 - Math.exp(-dt * 5);
      const targetFrames = frameLayout(mode);
      layers.forEach((layer, i) => {
        const target = targetFrames[i];
        layer.position.y += (target.y - layer.position.y) * settle;
        layer.rotation.y += (target.yaw - layer.rotation.y) * settle;
      });
      const liveFrames = layers.map((l) => ({
        x: l.position.x,
        y: l.position.y,
        z: l.position.z,
        yaw: l.rotation.y,
      }));
      currentPose = reduced.matches
        ? logoPose(-1, [{ level: 0, x: 0, z: 1.27 }], liveFrames)
        : logoPose(elapsed, route, liveFrames);
      const p = currentPose;
      if (!paused && !reduced.matches)
        look += (pointer * 0.1 - look) * (1 - Math.exp(-dt * 7));
      if (reduced.matches) look = 0;
      body.scale.set(
        p.scaleX * characterScale,
        p.scaleY * characterScale,
        p.scaleX * characterScale,
      );
      body.rotation.set(0, 0.42 + p.yaw + look, p.tilt);
      // The pivot is on the floor; compensate for the low corner while rocking.
      body.position.set(
        p.x,
        p.y +
          Math.abs(Math.sin(p.tilt)) * halfWidth * p.scaleX * characterScale,
        p.z,
      );
      shadow.material.opacity = 0.65;
      const nextFrame = [
        p.x,
        p.y,
        p.z,
        p.scaleY,
        p.tilt,
        p.yaw,
        look,
        ...layers.flatMap((l) => [l.position.y, l.rotation.y]),
      ]
        .map((v) => v.toFixed(4))
        .join("|");
      if (dirty || frameKey !== nextFrame) {
        renderer.render(scene, camera);
        frameKey = nextFrame;
        dirty = false;
      }
      host.dataset.rendered = "true";
      host.dataset.level = String(p.level);
      host.dataset.leg = String(p.leg);
      ui();
      if (!paused && !reduced.matches && visible && !document.hidden)
        raf = requestAnimationFrame(draw);
    }
    function start() {
      if (!raf && !disposed && !lost && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    }
    function resize() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height || disposed || lost) return;
      dirty = true;
      renderer.setSize(width, height);
      const aspect = width / height;
      const vertical = Math.max(5.8, 7.2 / aspect);
      camera.left = (-vertical * aspect) / 2;
      camera.right = (vertical * aspect) / 2;
      camera.top = vertical / 2;
      camera.bottom = -vertical / 2;
      camera.updateProjectionMatrix();
      start();
    }
    modes.forEach((button, i) =>
      button.addEventListener("click", () => {
        mode = i;
        modes.forEach((b, j) =>
          b.setAttribute("aria-pressed", String(i === j)),
        );
        paused = false;
        begin(0);
        ui();
        start();
      }),
    );
    trigger.addEventListener("click", (e) => {
      if (reduced.matches) return;
      const r = trigger.getBoundingClientRect();
      const target = e.detail
        ? Math.max(
            -0.85,
            Math.min(0.85, ((e.clientX - r.left) / r.width - 0.5) * 2),
          )
        : 0;
      if (paused) {
        paused = false;
        ui();
        start();
      }
      begin(target);
    });
    trigger.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = trigger.getBoundingClientRect();
      pointer = (e.clientX - r.left) / r.width - 0.5;
      start();
    });
    trigger.addEventListener("pointerleave", () => {
      pointer = 0;
      start();
    });
    pause.addEventListener("click", () => {
      paused = !paused;
      ui();
      if (paused) stop();
      else start();
    });
    reduced.addEventListener("change", () => {
      stop();
      elapsed = -1.25;
      route = logoRoute();
      currentPose = logoPose(-1);
      look = pointer = 0;
      queuedTarget = null;
      ui();
      start();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    observer.observe(host);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      lost = true;
      stop();
      host.removeAttribute("data-rendered");
      ui();
    });
    renderer.domElement.addEventListener("webglcontextrestored", () => {
      lost = false;
      studioEnvironment();
      resize();
      ui();
      start();
    });
    addEventListener("pagehide", (e) => {
      stop();
      if (e.persisted) return;
      disposed = true;
      observer.disconnect();
      resizeObserver.disconnect();
      environment.dispose();
      shadowTexture.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          m?.map?.dispose();
          m?.dispose();
        });
      });
      renderer.dispose();
    });
    addEventListener("pageshow", () => start());
    resize();
  } catch {
    stop();
    observer?.disconnect();
    resizeObserver?.disconnect();
    environment?.dispose();
    renderer?.dispose();
    host.removeAttribute("data-rendered");
    host.dataset.motion = "fallback";
    controls.hidden = trigger.hidden = true;
  }
}
