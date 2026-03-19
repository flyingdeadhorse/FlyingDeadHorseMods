/**
 * MyRollmate – 3D Dice Engine (3d-engine.js)
 *
 * Loads Three.js and Cannon.js from the local lib/ directory, then sets
 * up the WebGL rendering context, physics world, and dice-throw logic.
 *
 * Exposes:
 *   window.setupGlobal3DEngine          – initialise the 3D scene
 *   window.createWebGLParticleExplosion – spawn particle effects
 *   window.initWebGLDiceFunc            – create / throw a d20 for an actor
 *
 * Loaded before: main.js
 */

// =========================================================================
// --- WEBGL 3D DICE ENGINE (PERFECT PHYSICS, NORMALIZED THROW) ---
// =========================================================================

function getD20TargetQuaternion(number, geometry) {
  const faceIdx = number - 1;
  const posAttr = geometry.attributes.position;
  const vA = new THREE.Vector3(
    posAttr.getX(faceIdx * 3),
    posAttr.getY(faceIdx * 3),
    posAttr.getZ(faceIdx * 3),
  );
  const vB = new THREE.Vector3(
    posAttr.getX(faceIdx * 3 + 1),
    posAttr.getY(faceIdx * 3 + 1),
    posAttr.getZ(faceIdx * 3 + 1),
  );
  const vC = new THREE.Vector3(
    posAttr.getX(faceIdx * 3 + 2),
    posAttr.getY(faceIdx * 3 + 2),
    posAttr.getZ(faceIdx * 3 + 2),
  );

  const cb = new THREE.Vector3().subVectors(vC, vB);
  const ab = new THREE.Vector3().subVectors(vA, vB);
  const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();

  const targetZ = new THREE.Vector3(0, 0, 1);
  const q1 = new THREE.Quaternion().setFromUnitVectors(normal, targetZ);

  const center = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3);
  let upVec = new THREE.Vector3().subVectors(vC, center).normalize();

  upVec.applyQuaternion(q1);
  upVec.z = 0;
  upVec.normalize();

  const angle = Math.atan2(upVec.x, upVec.y);
  const q2 = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -angle,
  );

  return q2.multiply(q1);
}

function setupGlobal3DEngine() {
  if (window.rm3DEngine) return window.rm3DEngine;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const scene = new THREE.Scene();

  // Fixierte 3D Perspektive
  const camera = new THREE.PerspectiveCamera(35, w / h, 1, 5000);
  camera.position.set(0, -800, 1600);
  camera.lookAt(0, -100, 0);

  // PERFORMANCE: UHD & Antialias
  let useAntialias = _rmCtx().userPerf === "max";
  let pixelRatio =
    _rmCtx().userPerf === "min"
      ? 0.75
      : _rmCtx().userPerf === "mid"
        ? 1.0
        : window.devicePixelRatio || 2;

  const renderer = new THREE.WebGLRenderer({
    antialias: useAntialias,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = _rmCtx().userPerf !== "min";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.domElement.id = "rm-global-3d-canvas";
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.pointerEvents = "none";
  renderer.domElement.style.zIndex = "9999999"; // IMMER ganz oben!
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);

  // PERFORMANCE: UHD Schatten
  let shadowSize =
    _rmCtx().userPerf === "min"
      ? 512
      : _rmCtx().userPerf === "mid"
        ? 2048
        : 4096;

  // Lichtposition angepasst, damit der Schatten scharf unter dem Würfel liegt
  dirLight.position.set(200, -200, 1000);
  if (_rmCtx().userPerf !== "min") {
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = shadowSize;
    dirLight.shadow.mapSize.height = shadowSize;
    dirLight.shadow.camera.left = -w;
    dirLight.shadow.camera.right = w;
    dirLight.shadow.camera.top = h;
    dirLight.shadow.camera.bottom = -h;
    dirLight.shadow.camera.near = 100;
    dirLight.shadow.camera.far = 3000;
    dirLight.shadow.bias = -0.0005; // Verhindert Schatten-Artefakte
  }
  scene.add(dirLight);

  // Physik-Welt - ECHTE Gravitation nach unten (-Z im XY Plane)
  const world = new CANNON.World();
  world.gravity.set(0, 0, -5000); // Etwas höhere Gravitation für sattes Liegen
  world.broadphase = new CANNON.NaiveBroadphase();

  const floorMat = new CANNON.Material("floorMat");
  const diceMat = new CANNON.Material("diceMat");
  const wallMat = new CANNON.Material("wallMat");

  // Überarbeitete, lebhafte Physik (weiteres Rollen, realistischer Bounce, mehr Reibung auf Boden für Stopp)
  world.addContactMaterial(
    new CANNON.ContactMaterial(floorMat, diceMat, {
      friction: 0.5,
      restitution: 0.45,
    }),
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(wallMat, diceMat, {
      friction: 0.3,
      restitution: 0.7,
    }),
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(diceMat, diceMat, {
      friction: 0.3,
      restitution: 0.4,
    }),
  );

  const isImmersive = document.querySelector(".board-mode-immersive") !== null;
  const tiltAngle = isImmersive ? (15 * Math.PI) / 180 : 0;

  // Unsichtbarer Boden für echte Schatten (Genau auf Z=0)
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 3, h * 3),
    new THREE.ShadowMaterial({ opacity: 0.6 }),
  ); // Schatten dunkler
  if (_rmCtx().userPerf !== "min") floorMesh.receiveShadow = true;
  floorMesh.rotation.x = -tiltAngle;
  // Minimal nach unten setzen, um Z-Fighting zu vermeiden, aber Schatten nah zu halten
  floorMesh.position.z = -1;
  scene.add(floorMesh);

  // PHYSIK BODEN KOMPLETT FLACH LASSEN, damit die Würfel überall liegen bleiben
  const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: floorMat,
  });
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), 0); // 0 anstatt -tiltAngle verhindert das Abrutschen nach oben/unten!
  world.addBody(floorBody);

  // Unsichtbare Wände (Begrenzungen dynamisch, abhängig von Modus / Zeichnung)
  const wallThickness = 100;
  const leftWall = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(wallThickness / 2, h, 800)),
    material: wallMat,
  });
  world.addBody(leftWall);
  const rightWall = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(wallThickness / 2, h, 800)),
    material: wallMat,
  });
  world.addBody(rightWall);
  const topWall = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(w, wallThickness / 2, 800)),
    material: wallMat,
  });
  world.addBody(topWall);
  const bottomWall = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(w, wallThickness / 2, 800)),
    material: wallMat,
  });
  world.addBody(bottomWall);

  window.rm3DEngine = {
    scene,
    camera,
    renderer,
    world,
    diceMat,
    activeDice: {},
    explosions: [],
    tiltAngle,
  };

  let lastTime = performance.now();
  function animate() {
    if (!document.getElementById("rm-global-3d-canvas")) {
      window.rm3DEngine = null;
      return;
    }
    requestAnimationFrame(animate);
    const time = performance.now();
    const dt = Math.min((time - lastTime) / 1000, 0.1); // FPS Cap Preventer
    lastTime = time;

    const isImm = document.querySelector(".board-mode-immersive") !== null;

    // DYNAMISCHE WÄNDE (Classic vs Fixed Immersive Bounds)
    let cx = 0,
      cy = 0,
      boxW = window.innerWidth,
      boxH = window.innerHeight;

    if (isImm) {
      // Hardcoded bounds für Immersive Mode
      boxW = 1203;
      boxH = 591;
      cx = 255 + 1203 / 2 - window.innerWidth / 2;
      cy = -(231 + 591 / 2 - window.innerHeight / 2);
    } else {
      // Classic Mode: Exakt der Rand des Popups!
      const winEl = document.querySelector(".cc-window");
      if (winEl) {
        const rect = winEl.getBoundingClientRect();
        cx = rect.left + rect.width / 2 - window.innerWidth / 2;
        cy = -(rect.top + rect.height / 2 - window.innerHeight / 2);
        boxW = rect.width;
        boxH = rect.height;
      }
    }

    leftWall.position.set(cx - boxW / 2 - wallThickness / 2, cy, 250);
    rightWall.position.set(cx + boxW / 2 + wallThickness / 2, cy, 250);
    topWall.position.set(cx, cy + boxH / 2 + wallThickness / 2, 250);
    bottomWall.position.set(cx, cy - boxH / 2 - wallThickness / 2, 250);

    world.step(1 / 60, dt, 3); // Präzise Physic-Steps

    for (let id in window.rm3DEngine.activeDice) {
      let d = window.rm3DEngine.activeDice[id];
      if (d && d.mesh) {
        d.time += dt;

        let visualScale = 1;
        if (window.rm3DEngine.tiltAngle > 0) {
          visualScale = 1 - d.mesh.position.y / 2500;
          visualScale = Math.max(0.6, Math.min(visualScale, 1.4));
        }
        d.mesh.scale.set(visualScale, visualScale, visualScale);

        let speed = d.body ? d.body.velocity.length() : 0;
        let aSpeed = d.body ? d.body.angularVelocity.length() : 0;

        // Seamless Settling: Sanftes Eindrehen am Ende (inklusive Schatten Fixierung)
        if (
          !d.isSettling &&
          d.time > 1.0 &&
          speed < 120 &&
          aSpeed < 10 &&
          d.result
        ) {
          d.isSettling = true;
          world.removeBody(d.body);

          d.startPos = d.mesh.position.clone();
          d.startQuat = d.mesh.quaternion.clone();
          d.targetQuat = getD20TargetQuaternion(d.result, d.geo);

          d.targetPos = d.startPos.clone();
          // Leichtes Weiterrutschen
          d.targetPos.x += d.body.velocity.x * 0.3;
          d.targetPos.y += d.body.velocity.y * 0.3;

          // FIX: Z exakt auf den Würfel-Radius (40) zwingen, damit er nicht schwebt!
          d.targetPos.z = 40;

          d.settleProgress = 0;

          // SCHATTEN FIXIERUNG
          if (_rmCtx().userPerf !== "min") {
            d.mesh.castShadow = false; // Hauptmesh wirft ab jetzt keinen Schatten mehr, damit er nicht rotiert
            d.shadowProxy = new THREE.Mesh(
              d.geo,
              new THREE.MeshBasicMaterial({
                colorWrite: false,
                depthWrite: false,
              }),
            );
            d.shadowProxy.position.copy(d.startPos);
            d.shadowProxy.quaternion.copy(d.startQuat);
            d.shadowProxy.scale.copy(d.mesh.scale);
            d.shadowProxy.castShadow = true;
            window.rm3DEngine.scene.add(d.shadowProxy);
          }
        }

        if (d.isSettling) {
          if (d.settleProgress < 1) {
            d.settleProgress += dt * 2.0; // Schnelleres Settlen für Snappiness (~0.5s)
            if (d.settleProgress > 1) d.settleProgress = 1;

            let ease =
              (Math.sin(d.settleProgress * Math.PI - Math.PI / 2) + 1) / 2;

            d.mesh.position.lerpVectors(d.startPos, d.targetPos, ease);
            d.mesh.quaternion.slerpQuaternions(d.startQuat, d.targetQuat, ease);

            // Proxy nachziehen (aber ohne Rotation)
            if (d.shadowProxy) {
              d.shadowProxy.position.copy(d.mesh.position);
            }
          } else {
            // Wenn fertig, zwinge ihn hart auf den Boden (Z=40)
            d.mesh.position.z = 40;
            if (d.shadowProxy) d.shadowProxy.position.z = 40;
          }
        } else if (d.body) {
          d.mesh.position.copy(d.body.position);
          d.mesh.quaternion.copy(d.body.quaternion);
        }
      }
    }

    for (let i = window.rm3DEngine.explosions.length - 1; i >= 0; i--) {
      let ex = window.rm3DEngine.explosions[i];
      ex.age++;

      const positions = ex.points.geometry.attributes.position.array;
      for (let p = 0; p < positions.length; p += 3) {
        positions[p] += ex.vels[p / 3].x * dt;
        positions[p + 1] += ex.vels[p / 3].y * dt;
        positions[p + 2] += ex.vels[p / 3].z * dt;
        ex.vels[p / 3].x *= 0.9;
        ex.vels[p / 3].y *= 0.9;
      }
      ex.points.geometry.attributes.position.needsUpdate = true;

      let progress = ex.age / ex.maxAge;
      ex.mat.opacity = 1 - Math.pow(progress, 2);
      ex.light.intensity = ex.baseIntensity * (1 - progress);

      if (ex.age >= ex.maxAge) {
        scene.remove(ex.points);
        scene.remove(ex.light);
        ex.points.geometry.dispose();
        ex.mat.dispose();
        window.rm3DEngine.explosions.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener(
    "resize",
    () => {
      if (!window.rm3DEngine) return;
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    },
    { passive: true },
  );

  return window.rm3DEngine;
}

function createWebGLParticleExplosion(engine, x, y, z = 20) {
  if (_rmCtx().userPerf === "min") return;

  const colorObj = new THREE.Color(_rmCtx().userParticleColor);
  const colorHex = colorObj.getHex();

  const particleCount = _rmCtx().userPerf === "mid" ? 12 : 30;

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(particleCount * 3);
  const vels = [];
  for (let i = 0; i < particleCount; i++) {
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    vels.push({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800,
      z: Math.random() * 400 + 100,
    });
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);

  const mat = new THREE.PointsMaterial({
    color: colorHex,
    size: 12,
    map: tex,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  engine.scene.add(points);

  const light = new THREE.PointLight(colorHex, 8, 500);
  light.position.set(x, y, z + 50);
  engine.scene.add(light);

  engine.explosions.push({
    points,
    vels,
    mat,
    light,
    baseIntensity: 8,
    age: 0,
    maxAge: 45,
  });
}

// --- GLOBAL QUEUE SYSTEM FOR THROWING DICE (0.5s Verzögerung) ---
window.rmThrowQueue = window.rmThrowQueue || [];
window.rmIsThrowing = window.rmIsThrowing || false;

function processThrowQueue() {
  if (window.rmThrowQueue.length === 0) {
    window.rmIsThrowing = false;
    return;
  }
  window.rmIsThrowing = true;
  const nextThrow = window.rmThrowQueue.shift();
  nextThrow();
  setTimeout(processThrowQueue, 500); // 0.5 Sekunden warten bis der nächste spawnt
}

function enqueueThrow(throwFn) {
  window.rmThrowQueue.push(throwFn);
  if (!window.rmIsThrowing) processThrowQueue();
}

// --- WEBGL DICE INITIALIZATION (UHD TEXTURES & CUSTOM STYLES) ---
function initWebGLDice(actorId) {
  const engine = setupGlobal3DEngine();
  let isRolling = false;

  // --- ÄNDERUNG FÜR DEN TESTWURF ---
  let actor = game.actors.get(actorId);
  let isTestRoll = actorId === "test_dice_001";

  if (isTestRoll) {
    // Fake Actor erzeugen, damit er in der Logik unten als 'pc' (also MyDesign) erkannt wird.
    actor = { hasPlayerOwner: true, id: "test_dice_001" };
  } else if (!actor) {
    return;
  }
  // ---------------------------------

  // --- WÜRFEL DESIGN NACH GESINNUNG/TYP ERMITTELN ---
  let diceType = "pc"; // Standard: MyDesign
  if (!actor.hasPlayerOwner) {
    let disposition = 0; // 0 = Neutral
    // Versuche Disposition über das Token auf der aktuellen Szene zu finden
    const token = canvas.tokens.placeables.find((t) => t.actor?.id === actorId);
    if (token) {
      disposition = token.document.disposition;
    }
    if (disposition === -1) {
      diceType = "enemy";
    } else {
      diceType = "neutral";
    }
  }

  const diceRadius = 40;
  const diceGeo = new THREE.IcosahedronGeometry(diceRadius, 0);

  const uvAttr = diceGeo.attributes.uv;
  if (uvAttr) {
    for (let i = 0; i < uvAttr.count; i += 3) {
      uvAttr.setXY(i, 0, 0);
      uvAttr.setXY(i + 1, 1, 0);
      uvAttr.setXY(i + 2, 0.5, 1);
    }
    uvAttr.needsUpdate = true;
  }

  const materials = [];
  const canvasSize =
    _rmCtx().userPerf === "min"
      ? 256
      : _rmCtx().userPerf === "mid"
        ? 512
        : 1024;
  const bumpPixels =
    _rmCtx().userPerf === "min"
      ? 2000
      : _rmCtx().userPerf === "mid"
        ? 5000
        : 10000;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = canvasSize;
  bumpCanvas.height = canvasSize;
  const bCtx = bumpCanvas.getContext("2d");
  bCtx.fillStyle = "#888";
  bCtx.fillRect(0, 0, canvasSize, canvasSize);
  for (let p = 0; p < bumpPixels; p++) {
    bCtx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    bCtx.fillRect(Math.random() * canvasSize, Math.random() * canvasSize, 4, 4);
  }
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.anisotropy = engine.renderer.capabilities.getMaxAnisotropy();

  const drawNoise = (ctx, size, density, color, alpha) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < density; i++) {
      ctx.fillRect(
        Math.random() * size,
        Math.random() * size,
        Math.random() * 5,
        Math.random() * 5,
      );
    }
    ctx.globalAlpha = 1.0;
  };

  for (let i = 1; i <= 20; i++) {
    const c = document.createElement("canvas");
    c.width = canvasSize;
    c.height = canvasSize;
    const ctx = c.getContext("2d");
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    let fontName = _rmCtx().userFont.split(",")[0] || "Arial";
    let fontSize = Math.floor(canvasSize * 0.38);

    if (diceType === "enemy") {
      // FEINDE: Dunkelrot / Blut
      ctx.fillStyle = "#4a0000";
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      drawNoise(ctx, canvasSize, bumpPixels, "#8a0303", 0.5); // Blutstruktur
      drawNoise(ctx, canvasSize, bumpPixels / 2, "#2b0000", 0.6); // Dunkle Flecken
      ctx.strokeStyle = "#1a0000";
      ctx.lineWidth = canvasSize * 0.05;
      ctx.strokeRect(0, 0, canvasSize, canvasSize);

      ctx.font = "bold " + fontSize + "px " + fontName;
      ctx.fillStyle = "#000000";
      ctx.shadowColor = "rgba(255,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(i.toString(), canvasSize / 2, canvasSize * 0.62);
    } else if (diceType === "neutral") {
      // NEUTRALE: Violett / Struktur
      ctx.fillStyle = "#4b0082";
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      drawNoise(ctx, canvasSize, bumpPixels, "#6a0dad", 0.5);
      drawNoise(ctx, canvasSize, bumpPixels / 2, "#2e004f", 0.6);
      ctx.strokeStyle = "#1e0033";
      ctx.lineWidth = canvasSize * 0.05;
      ctx.strokeRect(0, 0, canvasSize, canvasSize);

      ctx.font = "bold " + fontSize + "px " + fontName;
      ctx.fillStyle = "#e6e6fa";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillText(i.toString(), canvasSize / 2, canvasSize * 0.62);
    } else {
      // SPIELERCHARAKTERE (PC): MyDesign
      if (_rmCtx().userDiceStyle === "stone") {
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        drawNoise(ctx, canvasSize, bumpPixels / 2, "#111111", 0.4);
        drawNoise(ctx, canvasSize, bumpPixels / 2, "#666666", 0.3);
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = canvasSize * 0.08;
        ctx.strokeRect(0, 0, canvasSize, canvasSize);

        ctx.font = "bold " + fontSize + "px " + fontName;
        ctx.fillStyle = "#dcdcdc";
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillText(i.toString(), canvasSize / 2, canvasSize * 0.62);
      } else if (_rmCtx().userDiceStyle === "wood") {
        if (window.rmWoodTextureImg) {
          ctx.drawImage(window.rmWoodTextureImg, 0, 0, canvasSize, canvasSize);
        } else {
          ctx.fillStyle = "#7a4b2a";
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.fillStyle = "#4a2c16";
          ctx.globalAlpha = 0.5;
          for (let w = 0; w < 80; w++) {
            ctx.fillRect(
              0,
              Math.random() * canvasSize,
              canvasSize,
              Math.random() * 15 + 2,
            );
          }
          ctx.globalAlpha = 1.0;
        }
        ctx.strokeStyle = "#3d2311";
        ctx.lineWidth = canvasSize * 0.03;
        ctx.strokeRect(0, 0, canvasSize, canvasSize);

        ctx.font = "bold " + fontSize + "px " + fontName;
        ctx.fillStyle = "#1a0b04";
        ctx.shadowColor = "rgba(255,255,255,0.4)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(i.toString(), canvasSize / 2, canvasSize * 0.62);
      } else {
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        drawNoise(ctx, canvasSize, bumpPixels * 0.75, "#333333", 0.4);
        drawNoise(ctx, canvasSize, bumpPixels * 0.35, "#000000", 0.8);
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = canvasSize * 0.02;
        ctx.strokeRect(0, 0, canvasSize, canvasSize);

        ctx.font = "bold " + fontSize + "px " + fontName;
        ctx.fillStyle = "#e6e6e6";
        ctx.shadowColor = "rgba(255,255,255,0.6)";
        ctx.shadowBlur = 12;
        ctx.fillText(i.toString(), canvasSize / 2, canvasSize * 0.62);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = engine.renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;

    let matProps = { map: tex, flatShading: true };

    if (diceType === "enemy") {
      matProps.roughness = 0.8;
      matProps.metalness = 0.1;
      if (_rmCtx().userPerf !== "min") {
        matProps.bumpMap = bumpTex;
        matProps.bumpScale = 4.0;
      }
    } else if (diceType === "neutral") {
      matProps.roughness = 0.7;
      matProps.metalness = 0.2;
      if (_rmCtx().userPerf !== "min") {
        matProps.bumpMap = bumpTex;
        matProps.bumpScale = 3.0;
      }
    } else {
      // PC Designs
      if (_rmCtx().userDiceStyle === "stone") {
        matProps.roughness = 0.9;
        matProps.metalness = 0.05;
        if (_rmCtx().userPerf !== "min") {
          matProps.bumpMap = bumpTex;
          matProps.bumpScale = 6.0;
        }
      } else if (_rmCtx().userDiceStyle === "wood") {
        matProps.roughness = 0.85;
        matProps.metalness = 0.0;
      } else {
        matProps.roughness = 0.6;
        matProps.metalness = 0.5;
        if (_rmCtx().userPerf !== "min") {
          matProps.bumpMap = bumpTex;
          matProps.bumpScale = 2.0;
        }
      }
    }
    materials.push(new THREE.MeshStandardMaterial(matProps));
  }

  diceGeo.clearGroups();
  for (let i = 0; i < 20; i++) {
    diceGeo.addGroup(i * 3, 3, i);
  }

  const diceMesh = new THREE.Mesh(diceGeo, materials);
  if (_rmCtx().userPerf !== "min") {
    diceMesh.castShadow = true;
    diceMesh.receiveShadow = true;
  }

  const positionAttr = diceGeo.attributes.position;
  const vertices = [];
  const faces = [];
  for (let i = 0; i < positionAttr.count; i++) {
    vertices.push(
      new CANNON.Vec3(
        positionAttr.getX(i),
        positionAttr.getY(i),
        positionAttr.getZ(i),
      ),
    );
  }
  for (let i = 0; i < positionAttr.count; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  const diceBody = new CANNON.Body({
    mass: 300,
    shape: new CANNON.ConvexPolyhedron(vertices, faces),
    material: engine.diceMat,
    linearDamping: 0.01,
    angularDamping: 0.01,
  });

  // Wir initialisieren das Würfel-Objekt SOFORT, damit "setResult" greifen kann
  // auch wenn der tatsächliche Wurf in der Queue verzögert wird.
  window.rmActive3DDice[actorId] = {
    resultToSet: null,
    throw: () => {
      if (isRolling) return;
      isRolling = true;

      // Der eigentliche Wurf wird gequeued, um Spam zu vermeiden (0,5s Delay)
      enqueueThrow(() => {
        const isImm = document.querySelector(".board-mode-immersive") !== null;
        let startX = 0,
          startY = 0;

        if (isImm) {
          // Hardcoded bounds Immersive Mode
          const cx = 255 + 1203 / 2 - window.innerWidth / 2;
          const cy = -(231 + 591 / 2 - window.innerHeight / 2);
          startX = cx + (Math.random() - 0.5) * (1203 * 0.6);
          startY = cy + (Math.random() - 0.5) * (591 * 0.6);
        } else {
          const winEl = document.querySelector(".cc-window");
          if (winEl) {
            const rect = winEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2 - window.innerWidth / 2;
            const cy = -(rect.top + rect.height / 2 - window.innerHeight / 2);
            startX = cx + (Math.random() - 0.5) * (rect.width * 0.6);
            startY = cy + (Math.random() - 0.5) * (rect.height * 0.6);
          } else {
            startX = (Math.random() - 0.5) * (window.innerWidth * 0.6);
            startY = (Math.random() - 0.5) * (window.innerHeight * 0.6);
          }
        }

        let spawnZ = 100;

        // Impuls
        let vX = (Math.random() - 0.5) * 4500;
        let vY = (Math.random() - 0.5) * 4500;
        let vZ = 1000 + Math.random() * 1500;

        createWebGLParticleExplosion(engine, startX, startY, spawnZ);
        playRMSnd(`${RollmateAssets.sounds.spawnDice}`);

        engine.scene.add(diceMesh);
        engine.world.addBody(diceBody);

        engine.activeDice[actorId] = {
          mesh: diceMesh,
          body: diceBody,
          geo: diceGeo,
          isSettling: false,
          time: 0,
          result: window.rmActive3DDice[actorId].resultToSet, // Falls Result schon vor dem Spawnen ankam
          isRolling: true,
          shadowProxy: null,
        };

        diceBody.position.set(startX, startY, spawnZ);
        diceBody.velocity.set(vX, vY, vZ);

        diceBody.angularVelocity.set(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
        );
      });
    },
    setResult: (num) => {
      window.rmActive3DDice[actorId].resultToSet = num;
      if (engine.activeDice[actorId]) engine.activeDice[actorId].result = num;
    },
    stop: () => {
      if (engine.activeDice[actorId]) {
        let d = engine.activeDice[actorId];
        if (d.body && !d.isSettling) engine.world.removeBody(d.body);
        d.isSettling = true;

        let pos = d.mesh.position;
        playRMSnd(`${RollmateAssets.sounds.goneDice}`);
        createWebGLParticleExplosion(engine, pos.x, pos.y, pos.z + 20);

        engine.scene.remove(d.mesh);
        if (d.shadowProxy) engine.scene.remove(d.shadowProxy);
        delete engine.activeDice[actorId];
      }
    },
  };
}

// --- GLOABAL VERFÜGBAR MACHEN FÜR NETZWERK-SYNC ---
window.initWebGLDiceFunc = initWebGLDice;
// ==========================================
// --- PERFORM ROLL ---
// ==========================================
