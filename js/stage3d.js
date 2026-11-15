/**
 * JEDA - Stage3D Engine (js/stage3d.js)
 * Panggung 3D mandiri menggunakan Three.js r128 sesuai PRD Bagian 13.
 * Mengelola langit senja prosedural, 600 bintang berkilau, orb napas 3D ber-fresnel,
 * 300 partikel pengorbit reaktif, awan low poly, taman pulau terapung dengan lentera,
 * serta animasi dan umpan balik sinematik sesuai Tabel 13.4 PRD.
 */
window.JEDA = window.JEDA || {};

JEDA.Stage3D = (function() {
  // State internal engine 3D
  let active = false;
  let isRunning = false;
  let container = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let animFrameId = null;

  // Objek panggung 3D
  let skyDome = null;
  let starsMesh = null;
  let orbGroup = null;
  let orbMesh = null;
  let orbShaderMat = null;
  let orbLight = null;
  let haloSprite = null;
  let haloMat = null;
  let pulseRingMesh = null; // Cincin cahaya menyebar (Napas Pas L1)

  // Sistem partikel pengorbit
  const PARTICLE_COUNT = 300;
  let particlesMesh = null;
  let particlePositions = null;
  let particleData = []; // { radius, angle, speed, y, ySpeed, burstRadius }

  // Awan Low Poly & Taman Lentera (Fase 3D-2 & 3D-3)
  let clouds = [];
  let spawnedClouds = []; // Awan baru muncul saat gelembung benar (L2)
  let islands = [];
  let lanternBeams = []; // Sinar naik lentera saat lulus level
  let targetLanternCount = 0;
  let ambLight = null;
  let hemiLight = null;
  let dirLight = null;
  let currentCalm = 0.5;
  let targetCalm = 0.5;
  let clockTime = 0.0;

  // Efek Tabel 13.4
  let ringScale = 1.0;
  let ringOpacity = 0.0;
  let distractionDim = 0.0;
  let distractionTimer = null;
  let panicActive = false;
  let panicCamOffset = 0.0;
  let panicDimVal = 1.0;
  let panicTimer = null;
  let isCelebrating = false;
  let celebrateTimer = null;
  let celebrateOrbitAngle = 0.0;

  // Kontrol warna & napas
  const COLORS = {
    good: new THREE.Color(0x7FE0C3), // Calm teal
    warn: new THREE.Color(0xF4B266), // Amber
    off:  new THREE.Color(0xFF8FA3)  // Soft red/pink
  };
  let currentColor = new THREE.Color(0x7FE0C3);
  let targetColor = new THREE.Color(0x7FE0C3);
  let breathScale = 1.0;
  let targetBreathScale = 1.0;
  let pulseEnergy = 0.0;
  let timeScale = 1.0;
  let reduceMotion = false;

  // Kamera & Parallax (Preset Sesuai PRD Bagian 13.3 - Komposisi Simetris)
  const CAMERA_PRESETS = {
    menu:   { x: 0,   y: 0.6,  z: 22.5, lookX: 0,   lookY: -1.0, lookZ: 0 },
    l1:     { x: 0,   y: 0.0,  z: 11.2, lookX: 0,   lookY: 0.0,  lookZ: 0 },
    l2:     { x: 3.5, y: 2.2,  z: 15.0, lookX: 1.5, lookY: 2.5,  lookZ: -2 },
    l3:     { x: 0,   y: -1.0, z: 17.0, lookX: 0,   lookY: -2.0, lookZ: 0 },
    result: { x: 0,   y: 1.6,  z: 24.5, lookX: 0,   lookY: -1.0, lookZ: 0 }
  };
  let currentCamPos = { x: 0, y: 0.6, z: 22.5 };
  let targetCamPos = { x: 0, y: 0.6, z: 22.5 };
  let currentLookAt = { x: 0, y: -1.0, z: 0 };
  let targetLookAt = { x: 0, y: -1.0, z: 0 };
  let currentOrbPos = { x: 0, y: 8.5, z: -4.0 };
  let targetOrbPos = { x: 0, y: 8.5, z: -4.0 };
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let currentMode = 'menu';

  /**
   * Membuat tekstur kanvas prosedural gradasi senja untuk skydome.
   */
  function createSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#16163A'); // Atas gelap
    grad.addColorStop(0.5, '#2B4C7E'); // Tengah biru senja
    grad.addColorStop(0.85, '#B87288'); // Transisi ungu lembayung
    grad.addColorStop(1.0, '#E8A598'); // Bawah cakrawala hangat

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Membuat tekstur kanvas radial untuk halo cahaya orb dan bintang.
   */
  function createGlowTexture(isStar = false) {
    const canvas = document.createElement('canvas');
    const size = isStar ? 64 : 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;

    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    if (isStar) {
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.3, 'rgba(220, 240, 255, 0.7)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    } else {
      // Halo orb napas
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.2, 'rgba(127, 224, 195, 0.55)');
      grad.addColorStop(0.55, 'rgba(127, 224, 195, 0.18)');
      grad.addColorStop(1.0, 'rgba(127, 224, 195, 0.0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * ShaderMaterial khusus untuk cahaya tepi (Fresnel rim lighting) pada Orb Napas.
   */
  function createFresnelMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: currentColor },
        fresnelColor: { value: new THREE.Color(0xFFFFFF) },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 fresnelColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          // Perhitungan sudut fresnel
          float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
          fresnel = pow(fresnel, 2.5);

          // Campur warna inti dan kilau tepi
          vec3 finalColor = mix(color, fresnelColor, fresnel * 0.75);
          float alpha = 0.88 + fresnel * 0.12;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide
    });
  }

  /**
   * Membangun 600 bintang berkilau lembut di latar langit.
   */
  function buildStars() {
    const STAR_COUNT = 600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const alphas = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Sebar bintang pada bola berjari-jari 120-140 unit
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 120 + Math.random() * 20;

      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.85 + 5; // Lebih banyak di langit atas
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      alphas[i] = 0.2 + Math.random() * 0.8;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starTex = createGlowTexture(true);
    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      map: starTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    starsMesh = new THREE.Points(starGeo, starMat);
    scene.add(starsMesh);
  }

  /**
   * Membangun 300 partikel pengorbit reaktif mengitari orb napas.
   */
  function buildOrbitingParticles() {
    const geo = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleData = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 2.2 + Math.random() * 2.6;
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.25 + Math.random() * 0.55) * (Math.random() < 0.5 ? 1 : -1);
      const y = (Math.random() - 0.5) * 2.4;
      const ySpeed = (Math.random() - 0.5) * 0.2;

      particleData.push({
        baseRadius: radius,
        currentRadius: radius,
        angle: angle,
        speed: speed,
        baseY: y,
        y: y,
        ySpeed: ySpeed
      });

      particlePositions[i * 3 + 0] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const pTex = createGlowTexture(true);
    const pMat = new THREE.PointsMaterial({
      size: 0.12, // Titik bintang berkilau lembut dan halus
      map: pTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: currentColor,
      opacity: 0.75
    });

    particlesMesh = new THREE.Points(geo, pMat);
    particlesMesh.visible = false; // Nonaktif di menu/checkin secara default (hanya untuk L1 & Result)
    scene.add(particlesMesh);
  }

  /**
   * Membangun formasi awan low poly organik yang membingkai langit kiri & kanan secara simetris (PRD 13.3).
   * Area tengah (x: -8 s.d. +8) dibiarkan bersih terbuka untuk pemandangan bulan & teks game.
   */
  function buildClouds() {
    clouds = [];
    const cloudMat = new THREE.MeshPhongMaterial({
      color: 0xF4F7FA,
      flatShading: true,
      shininess: 8,
      transparent: true,
      opacity: 0.80
    });

    // 8 formasi awan yang membingkai langit kiri & kanan secara simetris & lapang
    const cloudConfigs = [
      // Sisi Kiri Langit (melayang tenang pada rentang x = -26 s.d. -8)
      { x: -18, y: 5.8, z: -12, scale: 1.4, speed: 0.35, minX: -26, maxX: -8 },
      { x: -12, y: 7.4, z: -15, scale: 1.6, speed: 0.28, minX: -24, maxX: -8 },
      { x: -15, y: 4.2, z: -10, scale: 1.2, speed: 0.42, minX: -22, maxX: -8 },
      { x: -22, y: 6.4, z:  -8, scale: 1.1, speed: 0.30, minX: -28, maxX: -9 },
      // Sisi Kanan Langit (Simetris membingkai pada rentang x = +8 s.d. +26)
      { x:  18, y: 5.8, z: -12, scale: 1.4, speed: 0.35, minX: 8, maxX: 26 },
      { x:  12, y: 7.4, z: -15, scale: 1.6, speed: 0.28, minX: 8, maxX: 24 },
      { x:  15, y: 4.2, z: -10, scale: 1.2, speed: 0.42, minX: 8, maxX: 22 },
      { x:  22, y: 6.4, z:  -8, scale: 1.1, speed: 0.30, minX: 9, maxX: 28 }
    ];

    cloudConfigs.forEach((cfg, idx) => {
      const group = new THREE.Group();

      // Struktur awan berundak lembut (Icosahedron 1-subdivision bernuansa organik)
      const mainRadius = 0.9 * cfg.scale;
      const mainGeo = new THREE.IcosahedronGeometry(mainRadius, 1);
      const mainMesh = new THREE.Mesh(mainGeo, cloudMat);
      group.add(mainMesh);

      const flankOffsets = [
        { x: -0.75 * cfg.scale, y: -0.15 * cfg.scale, z:  0.2 * cfg.scale, r: 0.65 },
        { x:  0.75 * cfg.scale, y: -0.10 * cfg.scale, z: -0.2 * cfg.scale, r: 0.65 },
        { x: -0.25 * cfg.scale, y:  0.35 * cfg.scale, z: -0.1 * cfg.scale, r: 0.55 },
        { x:  0.25 * cfg.scale, y: -0.20 * cfg.scale, z:  0.25 * cfg.scale, r: 0.50 }
      ];
      flankOffsets.forEach(fo => {
        const pGeo = new THREE.IcosahedronGeometry(fo.r * cfg.scale, 1);
        const pMesh = new THREE.Mesh(pGeo, cloudMat);
        pMesh.position.set(fo.x, fo.y, fo.z);
        group.add(pMesh);
      });

      group.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(group);

      clouds.push({
        group: group,
        baseY: cfg.y,
        speed: cfg.speed,
        phase: idx * 0.8,
        bobSpeed: 0.45 + (idx % 3) * 0.15,
        minX: cfg.minX,
        maxX: cfg.maxX
      });
    });
  }

  /**
   * Membangun taman 3 pulau melayang dengan simetri sempurna di horizon bawah (PRD 13.3).
   * Pucuk lentera berada di bawah garis teks sehingga tidak pernah bertabrakan (collision-free).
   */
  function buildLanternIslands() {
    islands = [];

    const rockMat = new THREE.MeshPhongMaterial({ color: 0x3E4C5E, flatShading: true, shininess: 5 });
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x486B65, flatShading: true, shininess: 5 });
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x2A2338, shininess: 5 });
    const haloTex = createGlowTexture(false);

    // Konfigurasi 3 pulau terapung yang 100% simetris & seimbang di horizon bawah
    const islandConfigs = [
      { x: -7.6, y: -9.5, z: -2.2, radius: 2.5, height: 3.4, phase: 0.0, side: -1 },  // Kiri (Level 1)
      { x:  0.0, y: -8.8, z: -1.0, radius: 2.9, height: 3.8, phase: 1.5, side: 0 },   // Tengah (Level 2)
      { x:  7.6, y: -9.5, z: -2.2, radius: 2.5, height: 3.4, phase: 3.0, side: 1 }   // Kanan (Level 3)
    ];

    islandConfigs.forEach((cfg, idx) => {
      const islandGroup = new THREE.Group();

      // 1. Kerucut terbalik dasar pulau (Cone terbalik)
      const coneGeo = new THREE.ConeGeometry(cfg.radius, cfg.height, 7);
      coneGeo.rotateX(Math.PI);
      const coneMesh = new THREE.Mesh(coneGeo, rockMat);
      coneMesh.position.y = -cfg.height / 2;
      islandGroup.add(coneMesh);

      // 2. Cakram permukaan pulau (Cylinder)
      const topGeo = new THREE.CylinderGeometry(cfg.radius * 1.05, cfg.radius * 0.95, 0.45, 8);
      const topMesh = new THREE.Mesh(topGeo, grassMat);
      topMesh.position.y = 0.2;
      islandGroup.add(topMesh);

      // 3. Batuan hiasan di atas pulau (diletakkan simetris di sisi luar)
      const rockGeo = new THREE.IcosahedronGeometry(0.35, 0);
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      const rockX = cfg.side === 0 ? -cfg.radius * 0.45 : (cfg.side * cfg.radius * 0.45);
      rockMesh.position.set(rockX, 0.45, cfg.radius * 0.2);
      islandGroup.add(rockMesh);

      // 4. Tiang Lentera Kayu (berdiri tegak di pusat pulau x=0, z=0)
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6);
      const poleMesh = new THREE.Mesh(poleGeo, woodMat);
      poleMesh.position.set(0, 1.0, 0);
      islandGroup.add(poleMesh);

      // 5. Lentera (Bola Emisif tepat di pucuk tiang pusat)
      const bulbGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        emissive: 0xF4D06F,
        emissiveIntensity: 0.05,
        roughness: 0.3
      });
      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
      bulbMesh.position.set(0, 1.8, 0);
      islandGroup.add(bulbMesh);

      // 6. PointLight di dalam lentera
      const bulbLight = new THREE.PointLight(0xF4D06F, 0.0, 14);
      bulbLight.position.set(0, 1.8, 0);
      islandGroup.add(bulbLight);

      // 7. Halo aditif lentera
      const haloMatLantern = new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xF4D06F,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const lanternHalo = new THREE.Sprite(haloMatLantern);
      lanternHalo.position.set(0, 1.8, 0);
      lanternHalo.scale.set(3.2, 3.2, 1.0);
      islandGroup.add(lanternHalo);

      islandGroup.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(islandGroup);

      islands.push({
        group: islandGroup,
        baseY: cfg.y,
        phase: cfg.phase,
        lantern: {
          mat: bulbMat,
          light: bulbLight,
          halo: lanternHalo,
          currentEmissive: 0.05,
          targetEmissive: 0.05,
          currentLight: 0.0,
          targetLight: 0.0,
          haloOpacity: 0.0,
          targetHaloOpacity: 0.0
        }
      });
    });
  }

  /**
   * Memunculkan sinar vertikal naik saat lentera baru menyala (Tabel 13.4).
   */
  function spawnLanternBeam(island) {
    if (!island || reduceMotion || !scene) return;
    const geo = new THREE.CylinderGeometry(0.08, 0.45, 4.0, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xF4D06F,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(geo, mat);
    const pos = island.group.position;
    beam.position.set(pos.x, pos.y + 2.0, pos.z);
    scene.add(beam);

    lanternBeams.push({
      mesh: beam,
      age: 0,
      maxAge: 1.4
    });
  }

  /**
   * Render loop utama Three.js.
   */
  function animate(timestamp) {
    if (!active || !isRunning) return;
    animFrameId = requestAnimationFrame(animate);

    if (document.hidden) return; // Hentikan render saat tab tidak aktif

    const dt = 0.016 * timeScale;

    // 1. Interpolasi Halus Warna Orb & Partikel
    currentColor.lerp(targetColor, 0.08);
    if (orbShaderMat) {
      orbShaderMat.uniforms.color.value.copy(currentColor);
    }
    if (orbLight) {
      orbLight.color.copy(currentColor);
    }
    if (haloMat) {
      haloMat.color.copy(currentColor);
    }
    if (particlesMesh) {
      particlesMesh.material.color.copy(currentColor);
    }

    // 2. Interpolasi Skala Napas Orb & Posisi Berdasarkan Mode (Harmonisasi UI/UX)
    currentOrbPos.x += (targetOrbPos.x - currentOrbPos.x) * 0.05;
    currentOrbPos.y += (targetOrbPos.y - currentOrbPos.y) * 0.05;
    currentOrbPos.z += (targetOrbPos.z - currentOrbPos.z) * 0.05;

    breathScale += (targetBreathScale - breathScale) * 0.08;
    const finalOrbScale = breathScale + pulseEnergy * 0.3;
    if (orbGroup) {
      orbGroup.position.set(currentOrbPos.x, currentOrbPos.y, currentOrbPos.z);
      orbGroup.scale.set(finalOrbScale, finalOrbScale, finalOrbScale);
      if (!reduceMotion) {
        orbGroup.rotation.y += 0.003 * timeScale;
      }
    }
    if (particlesMesh) {
      particlesMesh.position.set(currentOrbPos.x, currentOrbPos.y, currentOrbPos.z);
    }
    if (haloSprite) {
      const haloScale = 4.8 * finalOrbScale;
      haloSprite.scale.set(haloScale, haloScale, 1);
    }

    // Perhitungan redup distraksi (BR-03: meredup 60% selama 0.5 detik)
    const dimMultiplier = distractionDim > 0 ? 0.35 : 1.0;
    if (orbLight) {
      orbLight.intensity = (1.4 + (finalOrbScale - 0.8) * 1.5) * dimMultiplier;
    }
    if (haloMat) {
      haloMat.opacity = (0.5 * finalOrbScale) * dimMultiplier;
    }

    // 3. Efek Cincin Cahaya Menyebar (Napas Pas L1 - Tabel 13.4)
    if (pulseRingMesh && pulseRingMesh.visible && !reduceMotion) {
      ringScale += dt * 3.4;
      ringOpacity = Math.max(0, ringOpacity - dt * 1.15);
      pulseRingMesh.scale.set(ringScale, ringScale, 1.0);
      pulseRingMesh.material.opacity = ringOpacity;
      if (ringOpacity <= 0.01) {
        pulseRingMesh.visible = false;
      }
    }

    // Redam pulse energy perlahan
    pulseEnergy = Math.max(0, pulseEnergy - dt * 2.2);

    // 4. Update Posisi Partikel Pengorbit (Semburan & Kurangi Gerakan)
    if (particlesMesh && particlePositions) {
      const pos = particlesMesh.geometry.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleData[i];
        if (!reduceMotion) {
          p.angle += p.speed * dt * timeScale;
          p.y += p.ySpeed * dt * timeScale;
          if (Math.abs(p.y - p.baseY) > 1.2) p.ySpeed *= -1;
          p.currentRadius = (p.baseRadius * finalOrbScale * 1.1) + (pulseEnergy * 4.2);
        } else {
          // Kurangi gerakan: partikel tidak bergerak melayang
          p.currentRadius = p.baseRadius * finalOrbScale * 1.0;
        }

        pos[i * 3 + 0] = Math.cos(p.angle) * p.currentRadius;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = Math.sin(p.angle) * p.currentRadius;
      }
      particlesMesh.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Update Awan Low Poly (Fase 3D-2)
    clockTime += dt;
    const cloudSpeedMul = (currentMode === 'l2') ? 2.5 : 1.0;
    if (!reduceMotion && clouds && clouds.length > 0) {
      clouds.forEach(c => {
        c.group.position.x += c.speed * dt * cloudSpeedMul * timeScale;
        if (c.maxX && c.group.position.x > c.maxX) {
          c.group.position.x = c.minX;
        } else if (!c.maxX && c.group.position.x > 25) {
          c.group.position.x = -25;
        }
        c.group.position.y = c.baseY + Math.sin(clockTime * c.bobSpeed + c.phase) * 0.22;
      });
    }

    // 6. Update Awan Baru Muncul (Gelembung Benar L2 - Tabel 13.4)
    for (let i = spawnedClouds.length - 1; i >= 0; i--) {
      const sc = spawnedClouds[i];
      sc.age += dt * timeScale;
      if (!reduceMotion) {
        sc.group.position.x += sc.speed * dt * timeScale;
      }
      let alpha = 0.85;
      if (sc.age < 0.8) {
        const prog = sc.age / 0.8;
        alpha = prog * 0.85;
        const scale = 0.1 + prog * 0.9;
        sc.group.scale.set(scale, scale, scale);
      } else if (sc.age > sc.maxAge - 1.5) {
        const prog = (sc.maxAge - sc.age) / 1.5;
        alpha = Math.max(0, prog * 0.85);
      }
      sc.group.children.forEach(ch => {
        if (ch.material) ch.material.opacity = alpha;
      });
      if (sc.age >= sc.maxAge) {
        scene.remove(sc.group);
        sc.group.children.forEach(ch => {
          if (ch.geometry) ch.geometry.dispose();
          if (ch.material) ch.material.dispose();
        });
        spawnedClouds.splice(i, 1);
      }
    }

    // 7. Update Sinar Naik Lentera (Lulus Level - Tabel 13.4)
    for (let i = lanternBeams.length - 1; i >= 0; i--) {
      const lb = lanternBeams[i];
      lb.age += dt;
      lb.mesh.position.y += dt * 2.2; // Sinar bergerak naik
      const prog = lb.age / lb.maxAge;
      lb.mesh.material.opacity = Math.max(0, (1.0 - prog) * 0.85);
      lb.mesh.scale.set(1.0 + prog * 0.6, 1.0 + prog * 1.2, 1.0 + prog * 0.6);
      if (lb.age >= lb.maxAge) {
        scene.remove(lb.mesh);
        lb.mesh.geometry.dispose();
        lb.mesh.material.dispose();
        lanternBeams.splice(i, 1);
      }
    }

    // 8. Update Taman Lentera 3 Pulau (Fase 3D-2)
    if (islands && islands.length > 0) {
      islands.forEach(isl => {
        if (!reduceMotion) {
          isl.group.position.y = isl.baseY + Math.sin(clockTime * 1.2 + isl.phase) * 0.22;
        }

        // Animasi transisi emisif 0 ke 2 selama 1.2 detik (dt * 1.8)
        const l = isl.lantern;
        const lerpSpeed = dt * 1.8;
        l.currentEmissive += (l.targetEmissive - l.currentEmissive) * Math.min(1.0, lerpSpeed);
        l.currentLight += (l.targetLight - l.currentLight) * Math.min(1.0, lerpSpeed);
        l.haloOpacity += (l.targetHaloOpacity - l.haloOpacity) * Math.min(1.0, lerpSpeed);

        l.mat.emissiveIntensity = l.currentEmissive;
        l.light.intensity = l.currentLight;
        l.halo.material.opacity = l.haloOpacity;
      });
    }

    // 9. Update Panik Klik (BR-05: Suasana Meredup, Kamera Mundur Sedikit)
    if (panicActive) {
      panicCamOffset += (2.2 - panicCamOffset) * 0.08;
      panicDimVal += (0.42 - panicDimVal) * 0.08;
    } else {
      panicCamOffset += (0.0 - panicCamOffset) * 0.04;
      panicDimVal += (1.0 - panicDimVal) * 0.04;
    }

    // 10. Update Kecerahan Suasana (setCalm + Panik)
    currentCalm += (targetCalm - currentCalm) * 0.05;
    if (scene && scene.fog) {
      scene.fog.density = (0.0035 - currentCalm * 0.0015) / Math.max(0.2, panicDimVal);
    }
    if (ambLight) {
      ambLight.intensity = (1.0 + currentCalm * 0.6) * panicDimVal;
    }
    if (hemiLight) {
      hemiLight.intensity = 0.5 * panicDimVal;
    }

    // 11. Bintang Berkilau & Skydome Berputar Perlahan
    if (skyDome && !reduceMotion) {
      skyDome.rotation.y += 0.0003 * timeScale;
    }
    if (starsMesh && !reduceMotion) {
      starsMesh.rotation.y += 0.0005 * timeScale;
    }

    // 12. Rotasi Kamera Pelan Saat Perayaan Lulus Level (Tabel 13.4)
    if (isCelebrating && !reduceMotion) {
      celebrateOrbitAngle += dt * 0.18;
    } else if (celebrateOrbitAngle > 0.005) {
      celebrateOrbitAngle *= 0.96;
    }

    // 13. Interpolasi Kamera (Preset Mode + Parallax Mouse + Target LookAt + Panik Offset)
    const parallaxTargetX = reduceMotion ? 0 : mouse.targetX * 0.3;
    const parallaxTargetY = reduceMotion ? 0 : mouse.targetY * 0.2;
    mouse.x += (parallaxTargetX - mouse.x) * 0.05;
    mouse.y += (parallaxTargetY - mouse.y) * 0.05;

    currentCamPos.x += (targetCamPos.x - currentCamPos.x) * 0.045;
    currentCamPos.y += (targetCamPos.y - currentCamPos.y) * 0.045;
    currentCamPos.z += (targetCamPos.z - currentCamPos.z) * 0.045;

    currentLookAt.x += (targetLookAt.x - currentLookAt.x) * 0.045;
    currentLookAt.y += (targetLookAt.y - currentLookAt.y) * 0.045;
    currentLookAt.z += (targetLookAt.z - currentLookAt.z) * 0.045;

    const effCamZ = currentCamPos.z + panicCamOffset;
    const cosOrb = Math.cos(celebrateOrbitAngle);
    const sinOrb = Math.sin(celebrateOrbitAngle);

    camera.position.set(
      (currentCamPos.x + mouse.x) * cosOrb - effCamZ * sinOrb * 0.15,
      currentCamPos.y + mouse.y,
      effCamZ * cosOrb + (currentCamPos.x + mouse.x) * sinOrb * 0.15
    );
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    renderer.render(scene, camera);
  }

  /**
   * Listener ukuran jendela (Window Resize & Fullscreen).
   * Menyesuaikan aspek rasio & FOV dinamis agar komposisi 3 pulau & rembulan tidak bergeser ('meceng').
   */
  function onWindowResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    camera.aspect = aspect;

    // Pertahankan bidang pandang horizontal (horizontal FOV) tetap stabil di semua rasio layar
    // Basis 16:9 dengan FOV vertikal 50 -> tan(25 deg) * (16 / 9) = ~0.8288
    if (aspect < (16 / 9)) {
      const targetHalfFovRad = Math.atan(0.8288 / aspect);
      camera.fov = targetHalfFovRad * 2 * (180 / Math.PI);
    } else {
      camera.fov = 50;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /**
   * Listener pergerakan mouse untuk Parallax lembut (maksimal 0.3 unit).
   */
  function onMouseMove(e) {
    if (reduceMotion) return;
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    mouse.targetX = (e.clientX - halfW) / halfW;
    mouse.targetY = -(e.clientY - halfH) / halfH;
  }

  /**
   * Listener status visibilitas tab: hentikan render loop saat tab tersembunyi.
   */
  function onVisibilityChange() {
    if (document.hidden) {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      isRunning = false;
    } else {
      if (!isRunning && active) {
        isRunning = true;
        animFrameId = requestAnimationFrame(animate);
      }
    }
  }

  // API Publik JEDA.Stage3D
  return {
    /**
     * Inisialisasi engine Three.js pada elemen DOM induk.
     */
    init(parentEl) {
      try {
        if (!window.THREE) {
          console.warn('[Stage3D] Three.js belum dimuat.');
          return false;
        }

        container = parentEl;

        // Baca preferensi kurangi gerakan awal jika sudah tersimpan di State
        if (window.JEDA && JEDA.State && JEDA.State.data && JEDA.State.data.settings) {
          reduceMotion = !!JEDA.State.data.settings.reduceMotion;
        }

        // 1. WebGL Renderer Transparan
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0); // Background sepenuhnya transparan
        container.appendChild(renderer.domElement);

        // 2. Scene & Kamera Perspektif
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x16163A, 0.0035);

        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(currentCamPos.x, currentCamPos.y, currentCamPos.z);
        camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

        // 3. Pencahayaan Panggung (Ambient, Hemisphere, Directional lembut)
        ambLight = new THREE.AmbientLight(0xFFFFFF, 1.3);
        scene.add(ambLight);

        hemiLight = new THREE.HemisphereLight(0x7FE0C3, 0x16163A, 0.5);
        scene.add(hemiLight);

        dirLight = new THREE.DirectionalLight(0xE8A598, 0.85);
        dirLight.position.set(5, 12, 10);
        scene.add(dirLight);

        // 4. Skydome Gradasi Senja
        const skyGeo = new THREE.SphereGeometry(180, 32, 24);
        const skyTex = createSkyTexture();
        const skyMat = new THREE.MeshBasicMaterial({
          map: skyTex,
          side: THREE.BackSide,
          depthWrite: false
        });
        skyDome = new THREE.Mesh(skyGeo, skyMat);
        scene.add(skyDome);

        // 5. Bintang Latar
        buildStars();

        // 6. Orb Napas 3D Mandiri (Fresnel + Halo + PointLight)
        orbGroup = new THREE.Group();
        orbGroup.position.set(0, 0, 0);

        // Geometri Inti Orb 64x64
        const orbGeo = new THREE.SphereGeometry(1.6, 64, 64);
        orbShaderMat = createFresnelMaterial();
        orbMesh = new THREE.Mesh(orbGeo, orbShaderMat);
        orbGroup.add(orbMesh);

        // PointLight di dalam Orb
        orbLight = new THREE.PointLight(0x7FE0C3, 1.2, 22);
        orbGroup.add(orbLight);

        // Halo Cahaya Aditif Mengelilingi Orb
        const haloTex = createGlowTexture(false);
        haloMat = new THREE.SpriteMaterial({
          map: haloTex,
          color: currentColor,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        haloSprite = new THREE.Sprite(haloMat);
        haloSprite.scale.set(4.8, 4.8, 1);
        orbGroup.add(haloSprite);

        // Cincin Cahaya Menyebar (Napas Pas L1)
        const ringGeo = new THREE.RingGeometry(0.95, 1.15, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x7FE0C3,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        pulseRingMesh = new THREE.Mesh(ringGeo, ringMat);
        pulseRingMesh.rotation.x = Math.PI * 0.1;
        pulseRingMesh.visible = false;
        orbGroup.add(pulseRingMesh);

        scene.add(orbGroup);

        // 7. Partikel Pengorbit
        buildOrbitingParticles();

        // 8. Awan Low Poly & Kepulauan Lentera (Fase 3D-2)
        buildClouds();
        buildLanternIslands();

        // 9. Event Listeners (Resize, Mouse Parallax, Tab Visibility)
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('mousemove', onMouseMove);
        document.addEventListener('visibilitychange', onVisibilityChange);

        active = true;
        isRunning = true;
        animFrameId = requestAnimationFrame(animate);

        console.log('[Stage3D] Panggung 3D Three.js r128 berhasil diinisialisasi.');
        return true;
      } catch (err) {
        console.error('[Stage3D] Gagal inisialisasi WebGL:', err);
        active = false;
        isRunning = false;
        return false;
      }
    },

    /**
     * Berpindah mode kamera & suasana: 'menu' | 'l1' | 'l2' | 'l3' | 'result'.
     */
    setMode(mode) {
      if (!active) return;
      currentMode = mode;
      const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.menu;

      targetCamPos = { x: preset.x, y: preset.y, z: preset.z };
      targetLookAt = { x: preset.lookX, y: preset.lookY, z: preset.lookZ };

      if (mode === 'menu') {
        targetOrbPos = { x: 0, y: 8.5, z: -4.0 }; // Melayang anggun tinggi di langit sebagai bulan lembut yang tenang
        targetBreathScale = 0.40;
        if (orbLight) orbLight.intensity = 0.35;
        if (haloMat) haloMat.opacity = 0.12;
        if (particlesMesh) particlesMesh.visible = false; // Bersih dari partikel saat di menu/checkin
      } else if (mode === 'l1') {
        targetOrbPos = { x: 0, y: 0.0, z: 0.0 }; // Di pusat layar untuk latihan napas
        targetBreathScale = 0.95;
        if (orbLight) orbLight.intensity = 1.4;
        if (haloMat) haloMat.opacity = 0.6;
        if (particlesMesh) {
          particlesMesh.visible = true;
          if (particlesMesh.material) particlesMesh.material.opacity = 0.85;
        }
      } else if (mode === 'l2') {
        targetOrbPos = { x: 3.5, y: 6.0, z: -5.0 }; // Tenang melayang di kejauhan langit
        targetBreathScale = 0.45;
        if (orbLight) orbLight.intensity = 0.4;
        if (haloMat) haloMat.opacity = 0.12;
        if (particlesMesh) particlesMesh.visible = false;
      } else if (mode === 'l3') {
        targetOrbPos = { x: 0, y: 4.5, z: -3.0 }; // Di atas taman kepulauan lentera
        targetBreathScale = 0.45;
        if (orbLight) orbLight.intensity = 0.4;
        if (haloMat) haloMat.opacity = 0.12;
        if (particlesMesh) particlesMesh.visible = false;
      } else if (mode === 'result') {
        targetOrbPos = { x: 0, y: 6.0, z: -2.5 }; // Menerangi seluruh taman lentera secara simetris
        targetBreathScale = 0.65;
        if (orbLight) orbLight.intensity = 0.9;
        if (haloMat) haloMat.opacity = 0.35;
        if (particlesMesh) {
          particlesMesh.visible = true;
          if (particlesMesh.material) particlesMesh.material.opacity = 0.55;
        }
      }
    },

    /**
     * Mengatur skala napas orb: t bernilai 0.0 (kempis) s.d. 1.0 (mengembang).
     */
    setBreath(t) {
      if (!active) return;
      const clampedT = Math.max(0, Math.min(1, t));
      targetBreathScale = 0.8 + clampedT * 0.8;
      if (orbLight) {
        orbLight.intensity = 1.4 + clampedT * 1.5;
      }
    },

    /**
     * Mengatur warna cahaya orb napas.
     * @param {string} state - 'good' (tenang/tepat), 'warn' (meleset), 'off' (distraksi)
     */
    setSync(state) {
      if (!active) return;
      if (COLORS[state]) {
        targetColor.copy(COLORS[state]);
      }
    },

    /**
     * Memicu cincin cahaya menyebar saat napas pas di L1 (Tabel 13.4).
     */
    triggerBreathRing() {
      if (!active || reduceMotion) return;
      ringScale = 1.0;
      ringOpacity = 0.85;
      if (pulseRingMesh) {
        pulseRingMesh.visible = true;
        pulseRingMesh.scale.set(1.0, 1.0, 1.0);
        pulseRingMesh.material.opacity = 0.85;
        pulseRingMesh.material.color.copy(currentColor);
      }
    },

    /**
     * Memicu kedipan merah muda dan redup 0,5 detik saat notifikasi palsu diklik (BR-03, Tabel 13.4).
     */
    flashDistraction() {
      if (!active) return;
      targetColor.copy(COLORS.off);
      currentColor.copy(COLORS.off);
      distractionDim = 1.0;
      if (distractionTimer) clearTimeout(distractionTimer);
      distractionTimer = setTimeout(() => {
        targetColor.copy(COLORS.good);
        distractionDim = 0.0;
      }, 500);
    },

    /**
     * Memicu denyut dan semburan partikel saat peristiwa penting tercapai.
     * @param {number} intensity - 0.0 s.d. 1.0
     */
    pulse(intensity = 0.5) {
      if (!active) return;
      pulseEnergy = Math.min(1.0, pulseEnergy + intensity);
    },

    /**
     * Memunculkan awan baru mekar di langit saat gelembung pikiran benar (L2 - Tabel 13.4).
     */
    spawnCloud() {
      if (!active || reduceMotion || !scene) return;
      const cluster = new THREE.Group();
      const count = 3;
      for (let i = 0; i < count; i++) {
        const r = 0.6 + Math.random() * 0.4;
        const geo = new THREE.IcosahedronGeometry(r, 0);
        const mat = new THREE.MeshPhongMaterial({
          color: 0xF2F5F8,
          flatShading: true,
          shininess: 10,
          transparent: true,
          opacity: 0.0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.8
        );
        cluster.add(mesh);
      }
      cluster.position.set(
        -5 + Math.random() * 3,
        2.2 + Math.random() * 2.5,
        -3 + Math.random() * 3
      );
      cluster.scale.set(0.1, 0.1, 0.1);
      scene.add(cluster);

      spawnedClouds.push({
        group: cluster,
        age: 0,
        maxAge: 7.0,
        speed: 0.8 + Math.random() * 0.6
      });
    },

    /**
     * Memicu reaksi panik klik (BR-05: Suasana meredup, kamera mundur sedikit).
     */
    triggerPanic() {
      if (!active) return;
      panicActive = true;
      if (panicTimer) clearTimeout(panicTimer);
      panicTimer = setTimeout(() => {
        panicActive = false;
      }, 1600);
    },

    /**
     * Merayakan kelulusan level: kamera berputar pelan selama beberapa detik (Tabel 13.4).
     */
    celebratePass() {
      if (!active || reduceMotion) return;
      isCelebrating = true;
      if (celebrateTimer) clearTimeout(celebrateTimer);
      celebrateTimer = setTimeout(() => {
        isCelebrating = false;
      }, 4000);
    },

    /**
     * Menyalakan n lentera taman terapung (Fase 3D-2 & 3D-3).
     * @param {number} count - 0..3 lentera menyala
     */
    setLanterns(count) {
      if (!active) return;
      const previousCount = targetLanternCount;
      targetLanternCount = Math.max(0, Math.min(3, count));

      islands.forEach((isl, idx) => {
        const l = isl.lantern;
        if (idx < targetLanternCount) {
          l.targetEmissive = 2.0;
          l.targetLight = 1.6;
          l.targetHaloOpacity = 0.75;
          // Munculkan sinar naik pada lentera yang baru saja menyala
          if (idx >= previousCount) {
            spawnLanternBeam(isl);
          }
        } else {
          l.targetEmissive = 0.05;
          l.targetLight = 0.0;
          l.targetHaloOpacity = 0.0;
        }
      });
    },

    /**
     * Meningkatkan intensitas cahaya lentera 50% lebih terang (PRD 14.2 G3 Badai Berhasil).
     * @param {number} idx - Indeks pulau/lentera (0 untuk Level 1)
     */
    boostLantern(idx = 0) {
      if (!active || !islands || !islands[idx]) return;
      const isl = islands[idx];
      const l = isl.lantern;
      l.targetEmissive = 3.0; // 50% lebih terang dari normal (2.0)
      l.targetLight = 2.4;    // 50% lebih terang dari normal (1.6)
      l.targetHaloOpacity = 1.0;
      spawnLanternBeam(isl);
    },

    /**
     * Mengatur kecerahan suasana (0..1) (Fase 3D-2).
     * @param {number} v - 0.0 s.d. 1.0
     */
    setCalm(v) {
      if (!active) return;
      targetCalm = Math.max(0.0, Math.min(1.0, v));
    },

    /**
     * Membekukan / melambatkan gerak 3D untuk langkah S di STOP (PRD 13.4).
     */
    freeze(on) {
      if (!active) return;
      timeScale = on ? 0.1 : 1.0;
    },

    /**
     * Mengaktifkan/menonaktifkan mode kurangi gerakan (BR-12).
     */
    setReduceMotion(on) {
      reduceMotion = !!on;
      if (reduceMotion) {
        mouse.targetX = 0;
        mouse.targetY = 0;
        mouse.x = 0;
        mouse.y = 0;
        isCelebrating = false;
        celebrateOrbitAngle = 0.0;
      }
    },

    /**
     * Memeriksa apakah engine 3D sedang aktif berjalan.
     */
    isActive() {
      return active;
    },

    /**
     * Membersihkan seluruh resource WebGL saat game ditutup.
     */
    destroy() {
      active = false;
      isRunning = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (distractionTimer) clearTimeout(distractionTimer);
      if (panicTimer) clearTimeout(panicTimer);
      if (celebrateTimer) clearTimeout(celebrateTimer);

      clouds = [];
      spawnedClouds = [];
      islands = [];
      lanternBeams = [];
      if (renderer && renderer.domElement && container) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    }
  };
})();
