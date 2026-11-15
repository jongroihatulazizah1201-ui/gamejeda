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
  let skyCanvas = null;
  let skyTexture = null;
  let currentSkyTop = new THREE.Color(0x0F2A3A);
  let currentSkyMid = new THREE.Color(0x2C6E7F);
  let currentSkyBottom = new THREE.Color(0xBFE8DC);
  let startSkyTop = new THREE.Color(0x0F2A3A);
  let startSkyMid = new THREE.Color(0x2C6E7F);
  let startSkyBottom = new THREE.Color(0xBFE8DC);
  let targetSkyTop = new THREE.Color(0x0F2A3A);
  let targetSkyMid = new THREE.Color(0x2C6E7F);
  let targetSkyBottom = new THREE.Color(0xBFE8DC);

  let isThemeTransitioning = false;
  let themeTransitionStart = 0;
  let themeTransitionDuration = 1200;
  let targetLanternColor = new THREE.Color(0xBFFFE9);
  let startLanternColor = new THREE.Color(0xBFFFE9);
  let currentLanternColor = new THREE.Color(0xBFFFE9);
  let targetParticleColor = new THREE.Color(0xD8F3EC);
  let startParticleColor = new THREE.Color(0xD8F3EC);
  let currentParticleColor = new THREE.Color(0xD8F3EC);
  let targetHemiSky = new THREE.Color(0x2C6E7F);
  let startHemiSky = new THREE.Color(0x2C6E7F);
  let targetHemiGround = new THREE.Color(0x0F2A3A);
  let startHemiGround = new THREE.Color(0x0F2A3A);

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

  // Elemen 3D Spesifik Tema (PRD Bagian 15.3 & Prompt R-4)
  let currentThemeName = 'embun';
  let embunGroup = null;
  let fajarGroup = null;
  let auroraGroup = null;

  // Data elemen Embun (kabut pagi, tetes embun jatuh, rumput bercahaya)
  let embunMistPlanes = [];
  let embunDewDrops = null;
  let embunDewData = [];
  let embunGrassTufts = [];

  // Data elemen Fajar (matahari terbit sinar radial, awan jingga, siluet burung)
  let fajarSunGroup = null;
  let fajarSunRays = null;
  let fajarClouds = [];
  let fajarBirds = [];

  // Data elemen Aurora (pita aurora sinus, bintang jatuh, kristal es melayang)
  let auroraRibbons = [];
  let auroraShootingStar = null;
  let auroraIceCrystals = [];

  // Data elemen Level 2: Misi Astronot (PRD Bagian 15.4 - Prompt R-5)
  const L2_ASTRONAUT_CONFIGS = [
    { index: 0, name: 'Penenang', cat: 'Cemas', color: 0x6EC6FF, x: -4.5, y: -3.2, z: 0.0 },
    { index: 1, name: 'Navigator', cat: 'Rencana', color: 0xFFB86B, x: -1.5, y: -3.2, z: 0.0 },
    { index: 2, name: 'Sahabat', cat: 'Menilai Diri', color: 0xB69CFF, x: 1.5, y: -3.2, z: 0.0 },
    { index: 3, name: 'Arsiparis', cat: 'Kenangan', color: 0xE6EEF7, x: 4.5, y: -3.2, z: 0.0 }
  ];
  let l2Group = null;
  let l2AstronautsGroup = null;
  let l2MonstersGroup = null;
  let l2BeamsGroup = null;
  let l2EffectsGroup = null;
  let l2Astronauts = [];
  let l2Monsters = [];
  let l2ActiveBeams = [];
  let l2Sparks = [];
  let l2PuffClouds = [];
  let raycaster = null;

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
    l2:     { x: 0,   y: 0.0,  z: 16.0, lookX: 0,   lookY: 0.0,  lookZ: 0 },
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
   * Mendukung pembaruan dinamis saat transisi tema (PRD Bagian 15.3).
   */
  function createSkyTexture() {
    skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#' + currentSkyTop.getHexString());
    grad.addColorStop(0.5, '#' + currentSkyMid.getHexString());
    grad.addColorStop(1.0, '#' + currentSkyBottom.getHexString());

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.generateMipmaps = false;
    skyTexture.minFilter = THREE.LinearFilter;
    return skyTexture;
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
   * Membuat tekstur kanvas prosedural lembut untuk kabut pagi (Embun).
   */
  function createMistTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 32, 0, 128, 32, 128);
    grad.addColorStop(0.0, 'rgba(191, 255, 233, 0.45)');
    grad.addColorStop(0.5, 'rgba(191, 232, 220, 0.22)');
    grad.addColorStop(1.0, 'rgba(191, 232, 220, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 64);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Membangun elemen 3D spesifik Tema Embun (PRD Bagian 15.3):
   * - Kabut pagi tipis yang bergerak
   * - Tetes embun bercahaya jatuh pelan
   * - Rumput bercahaya di pulau
   */
  function buildEmbunElements() {
    embunGroup = new THREE.Group();
    scene.add(embunGroup);

    // 1. Kabut Pagi Tipis (Moving Morning Mist)
    const mistTex = createMistTexture();
    const mistConfigs = [
      { x: -7.5, y: -8.5, z: -3.0, w: 22, h: 4.5, phase: 0.0 },
      { x:  0.0, y: -8.0, z: -1.8, w: 26, h: 5.0, phase: 1.8 },
      { x:  7.5, y: -8.5, z: -3.0, w: 22, h: 4.5, phase: 3.5 },
      { x:  0.0, y: -7.2, z: -12.0, w: 42, h: 6.5, phase: 0.8 }
    ];

    embunMistPlanes = [];
    mistConfigs.forEach(cfg => {
      const geo = new THREE.PlaneGeometry(cfg.w, cfg.h);
      const mat = new THREE.MeshBasicMaterial({
        map: mistTex,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI * 0.42;
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      embunGroup.add(mesh);
      embunMistPlanes.push({ mesh, baseX: cfg.x, baseY: cfg.y, phase: cfg.phase });
    });

    // 2. Tetes Embun Bercahaya Jatuh Pelan (Falling Glowing Dew Drops)
    const DEW_COUNT = 90;
    const dewGeo = new THREE.BufferGeometry();
    const dewPos = new Float32Array(DEW_COUNT * 3);
    embunDewData = [];

    for (let i = 0; i < DEW_COUNT; i++) {
      dewPos[i * 3] = (Math.random() - 0.5) * 36;
      dewPos[i * 3 + 1] = -9.0 + Math.random() * 22;
      dewPos[i * 3 + 2] = -12.0 + Math.random() * 20;
      embunDewData.push({
        speed: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        drift: 0.2 + Math.random() * 0.3
      });
    }
    dewGeo.setAttribute('position', new THREE.BufferAttribute(dewPos, 3));

    const dewMat = new THREE.PointsMaterial({
      size: 0.42,
      map: createGlowTexture(false),
      transparent: true,
      opacity: 0.75,
      color: 0xBFFFE9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    embunDewDrops = new THREE.Points(dewGeo, dewMat);
    embunGroup.add(embunDewDrops);

    // 3. Rumput Bercahaya di Kepulauan (Bioluminescent Island Grass)
    embunGrassTufts = [];
    const grassConeGeo = new THREE.ConeGeometry(0.06, 0.48, 4);
    islands.forEach((isl, iIdx) => {
      const tuftCount = 6;
      for (let t = 0; t < tuftCount; t++) {
        const tuftGroup = new THREE.Group();
        const angle = (t / tuftCount) * Math.PI * 2 + (iIdx * 0.5);
        const r = 1.3 + Math.random() * 0.9;
        const tx = Math.cos(angle) * r;
        const tz = Math.sin(angle) * r;

        // Tiap rumpun memiliki 3 bilah rumput
        for (let b = 0; b < 3; b++) {
          const bladeMat = new THREE.MeshBasicMaterial({
            color: 0x7FE0C3,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
          });
          const blade = new THREE.Mesh(grassConeGeo, bladeMat);
          blade.position.set((b - 1) * 0.08, 0.24, 0);
          blade.rotation.z = (b - 1) * 0.22 + (Math.random() - 0.5) * 0.15;
          blade.rotation.x = (Math.random() - 0.5) * 0.25;
          tuftGroup.add(blade);
        }

        tuftGroup.position.set(tx, 0.35, tz);
        isl.group.add(tuftGroup);
        embunGrassTufts.push({ mesh: tuftGroup, phase: Math.random() * Math.PI * 2 });
      }
    });
  }

  /**
   * Membangun elemen 3D spesifik Tema Fajar (PRD Bagian 15.3):
   * - Matahari terbit di cakrawala dengan sinar radial
   * - Awan jingga
   * - Siluet burung low poly melintas
   */
  function buildFajarElements() {
    fajarGroup = new THREE.Group();
    scene.add(fajarGroup);

    // 1. Matahari Terbit dengan Sinar Radial (Sunrise on Horizon with Radial Rays)
    fajarSunGroup = new THREE.Group();
    fajarSunGroup.position.set(0, -4.2, -42.0);

    const sunCoreGeo = new THREE.CircleGeometry(4.8, 32);
    const sunCoreMat = new THREE.MeshBasicMaterial({
      color: 0xFFF2BA,
      transparent: true,
      opacity: 0.95
    });
    const sunCore = new THREE.Mesh(sunCoreGeo, sunCoreMat);
    fajarSunGroup.add(sunCore);

    const sunHaloMat = new THREE.SpriteMaterial({
      map: createGlowTexture(false),
      color: 0xFFA866,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sunHalo = new THREE.Sprite(sunHaloMat);
    sunHalo.scale.set(28, 28, 1);
    fajarSunGroup.add(sunHalo);

    // 12 sinar radial emas
    fajarSunRays = new THREE.Group();
    const rayCount = 12;
    for (let k = 0; k < rayCount; k++) {
      const angle = k * (Math.PI * 2 / rayCount);
      const rayGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 3.5, 0,
        -1.4, 26.0, 0,
         1.4, 26.0, 0
      ]);
      rayGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0xFFD27A,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const rayMesh = new THREE.Mesh(rayGeo, rayMat);
      rayMesh.rotation.z = angle;
      fajarSunRays.add(rayMesh);
    }
    fajarSunGroup.add(fajarSunRays);
    fajarGroup.add(fajarSunGroup);

    // 2. Awan Jingga (Warm Dawn Clouds)
    fajarClouds = [];
    const dawnCloudConfigs = [
      { x: -16, y: -2.0, z: -32, scale: 1.4, color: 0xFF9E7A, speed: 0.12 },
      { x: -7,  y: -3.5, z: -36, scale: 1.8, color: 0xFFA07A, speed: 0.08 },
      { x:  8,  y: -3.2, z: -35, scale: 1.7, color: 0xFFC98B, speed: 0.10 },
      { x:  17, y: -1.8, z: -30, scale: 1.3, color: 0xE0735F, speed: 0.14 },
      { x:   0, y: -4.8, z: -38, scale: 2.2, color: 0xFF8A65, speed: 0.06 }
    ];

    dawnCloudConfigs.forEach((cfg, idx) => {
      const cGroup = new THREE.Group();
      const cloudMat = new THREE.MeshPhongMaterial({
        color: cfg.color,
        flatShading: true,
        shininess: 8,
        transparent: true,
        opacity: 0.88
      });

      const spherePuffs = [
        { x: 0, y: 0, z: 0, r: 1.1 },
        { x: -0.9, y: -0.2, z: 0.1, r: 0.85 },
        { x: 0.9, y: -0.15, z: -0.1, r: 0.9 },
        { x: -0.4, y: 0.5, z: 0.1, r: 0.75 },
        { x: 0.4, y: 0.45, z: -0.05, r: 0.7 }
      ];

      spherePuffs.forEach(p => {
        const puffGeo = new THREE.DodecahedronGeometry(p.r, 0);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(p.x, p.y, p.z);
        cGroup.add(puff);
      });

      cGroup.scale.set(cfg.scale, cfg.scale, cfg.scale);
      cGroup.position.set(cfg.x, cfg.y, cfg.z);
      fajarGroup.add(cGroup);
      fajarClouds.push({ group: cGroup, baseX: cfg.x, baseY: cfg.y, speed: cfg.speed, phase: idx * 1.2 });
    });

    // 3. Siluet Burung Low Poly Melintas (Low-Poly Flying Birds)
    fajarBirds = [];
    const birdConfigs = [
      { x: -28, y: 6.2, z: -22, offset: 0.0, speed: 3.4 },
      { x: -30, y: 7.0, z: -23, offset: 0.6, speed: 3.4 },
      { x: -32, y: 5.6, z: -21, offset: 1.2, speed: 3.4 },
      { x: -35, y: 6.8, z: -24, offset: 1.8, speed: 3.4 }
    ];

    birdConfigs.forEach(cfg => {
      const bGroup = new THREE.Group();
      const birdMat = new THREE.MeshBasicMaterial({
        color: 0x261330,
        side: THREE.DoubleSide
      });

      // Badan ramping
      const bodyGeo = new THREE.ConeGeometry(0.12, 0.7, 4);
      bodyGeo.rotateX(Math.PI * 0.5);
      const body = new THREE.Mesh(bodyGeo, birdMat);
      bGroup.add(body);

      // Sayap Kiri dengan pivot
      const pivotL = new THREE.Group();
      pivotL.position.set(-0.06, 0, 0);
      const wingLGeo = new THREE.BufferGeometry();
      const vL = new Float32Array([
        0, 0, 0,
        -0.85, 0, 0.28,
        -0.25, 0, -0.38
      ]);
      wingLGeo.setAttribute('position', new THREE.BufferAttribute(vL, 3));
      const wingL = new THREE.Mesh(wingLGeo, birdMat);
      pivotL.add(wingL);
      bGroup.add(pivotL);

      // Sayap Kanan dengan pivot
      const pivotR = new THREE.Group();
      pivotR.position.set(0.06, 0, 0);
      const wingRGeo = new THREE.BufferGeometry();
      const vR = new Float32Array([
        0, 0, 0,
        0.85, 0, 0.28,
        0.25, 0, -0.38
      ]);
      wingRGeo.setAttribute('position', new THREE.BufferAttribute(vR, 3));
      const wingR = new THREE.Mesh(wingRGeo, birdMat);
      pivotR.add(wingR);
      bGroup.add(pivotR);

      bGroup.position.set(cfg.x, cfg.y, cfg.z);
      fajarGroup.add(bGroup);
      fajarBirds.push({
        group: bGroup,
        pivotL: pivotL,
        pivotR: pivotR,
        offset: cfg.offset,
        speed: cfg.speed,
        baseY: cfg.y
      });
    });
  }

  /**
   * Membangun elemen 3D spesifik Tema Aurora (PRD Bagian 15.3):
   * - Pita aurora bergelombang dengan ShaderMaterial bergelombang sinus
   * - Bintang jatuh sesekali
   * - Kristal es melayang
   */
  function buildAuroraElements() {
    auroraGroup = new THREE.Group();
    scene.add(auroraGroup);

    // 1. Pita Aurora ShaderMaterial Bergelombang Sinus (Sine-Wave Aurora Ribbons)
    auroraRibbons = [];
    const ribbonConfigs = [
      { w: 72, h: 16, segX: 64, segY: 16, x: 0, y: 13.0, z: -36.0, rx: 0.22, ry: -0.08, speed: 0.75, freq: 0.09 },
      { w: 64, h: 14, segX: 56, segY: 14, x: 4, y: 15.5, z: -44.0, rx: 0.18, ry: 0.12, speed: 0.55, freq: 0.07 },
      { w: 58, h: 13, segX: 48, segY: 12, x: -6, y: 11.8, z: -28.0, rx: 0.28, ry: -0.04, speed: 0.90, freq: 0.11 }
    ];

    const vShader = `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uWaveFreq;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float w1 = sin(pos.x * uWaveFreq + uTime * uSpeed) * 3.2;
        float w2 = cos(pos.x * (uWaveFreq * 0.45) + uTime * (uSpeed * 0.55)) * 1.6;
        float w3 = sin(pos.y * 0.25 + uTime * (uSpeed * 0.4)) * 0.9;

        pos.z += w1 + w2;
        pos.y += sin(pos.x * (uWaveFreq * 0.65) + uTime * uSpeed) * 1.5 + w3;

        vWave = (w1 + w2) * 0.2;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fShader = `
      uniform vec3 uColorBottom;
      uniform vec3 uColorTop;
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        vec3 col = mix(uColorBottom, uColorTop, pow(vUv.y, 0.82));
        float curtain = sin(vUv.x * 48.0 + uTime * 0.75) * 0.15 + 0.85;
        float curtain2 = cos(vUv.x * 24.0 - uTime * 0.45) * 0.10 + 0.90;
        col *= curtain * curtain2;

        float edgeY = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
        float edgeX = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        float alpha = edgeY * edgeX * (0.68 + vWave * 0.15);

        gl_FragColor = vec4(col, alpha);
      }
    `;

    ribbonConfigs.forEach(cfg => {
      const geo = new THREE.PlaneGeometry(cfg.w, cfg.h, cfg.segX, cfg.segY);
      const mat = new THREE.ShaderMaterial({
        vertexShader: vShader,
        fragmentShader: fShader,
        uniforms: {
          uTime: { value: 0.0 },
          uSpeed: { value: cfg.speed },
          uWaveFreq: { value: cfg.freq },
          uColorBottom: { value: new THREE.Vector3(0.12, 0.96, 0.65) },
          uColorTop: { value: new THREE.Vector3(0.72, 0.35, 0.98) }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.rotation.x = cfg.rx;
      mesh.rotation.y = cfg.ry;
      auroraGroup.add(mesh);
      auroraRibbons.push(mesh);
    });

    // 2. Bintang Jatuh Sesekali (Shooting Stars / Meteors)
    const meteorGeo = new THREE.CylinderGeometry(0.04, 0.18, 3.8, 6);
    meteorGeo.rotateZ(Math.PI * 0.38);
    const meteorMat = new THREE.MeshBasicMaterial({
      color: 0xD6F8FF,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const meteorMesh = new THREE.Mesh(meteorGeo, meteorMat);
    meteorMesh.visible = false;
    auroraGroup.add(meteorMesh);

    auroraShootingStar = {
      mesh: meteorMesh,
      active: false,
      timer: 3.5,
      progress: 0.0,
      startX: 0,
      startY: 0,
      startZ: 0,
      vx: 0,
      vy: 0,
      vz: 0
    };

    // 3. Kristal Es Melayang (Floating Ice Crystals)
    auroraIceCrystals = [];
    const iceGeo = new THREE.OctahedronGeometry(0.32, 0);
    const iceMat = new THREE.MeshPhongMaterial({
      color: 0xD8F0FF,
      emissive: 0x3A5888,
      emissiveIntensity: 0.35,
      shininess: 35,
      flatShading: true,
      transparent: true,
      opacity: 0.75
    });

    for (let k = 0; k < 36; k++) {
      const mesh = new THREE.Mesh(iceGeo, iceMat);
      const ix = (Math.random() - 0.5) * 34;
      const iy = -6.0 + Math.random() * 17;
      const iz = -12.0 + Math.random() * 18;
      mesh.position.set(ix, iy, iz);
      auroraGroup.add(mesh);

      auroraIceCrystals.push({
        mesh: mesh,
        baseY: iy,
        phase: Math.random() * Math.PI * 2,
        rotSpeedX: 0.008 + Math.random() * 0.012,
        rotSpeedY: 0.012 + Math.random() * 0.016
      });
    }
  }

  /**
   * Mengatur visibilitas elemen 3D per tema dan penonaktifan saat Kurangi Gerakan aktif (BR-12).
   */
  function updateThemeElementsVisibility() {
    if (reduceMotion) {
      if (embunGroup) embunGroup.visible = false;
      if (fajarGroup) fajarGroup.visible = false;
      if (auroraGroup) auroraGroup.visible = false;
      embunGrassTufts.forEach(g => { if (g.mesh) g.mesh.visible = false; });
      return;
    }

    const theme = (currentThemeName || 'embun').toLowerCase();
    if (embunGroup) embunGroup.visible = (theme === 'embun');
    if (fajarGroup) fajarGroup.visible = (theme === 'fajar');
    if (auroraGroup) auroraGroup.visible = (theme === 'aurora');
    embunGrassTufts.forEach(g => { if (g.mesh) g.mesh.visible = (theme === 'embun'); });
  }

  /**
   * Menginisialisasi seluruh elemen tema 3D panggung.
   */
  function buildThemeElements() {
    buildEmbunElements();
    buildFajarElements();
    buildAuroraElements();
    updateThemeElementsVisibility();
  }

  // =========================================================================
  // SUB-PANGGUNG LEVEL 2: MISI ASTRONOT (PRD Bagian 15.4 - Three.js r128)
  // Koordinat Layar 1920x1080 -> Dunia 3D (screenToWorld) dengan Kamera Tetap
  // =========================================================================

  /**
   * Mengonversi koordinat layar 1920x1080 ke koordinat dunia 3D pada bidang Z = targetZ.
   * @param {number} screenX - Koordinat horizontal layar (0 s.d. 1920)
   * @param {number} screenY - Koordinat vertikal layar (0 s.d. 1080)
   * @param {number} targetZ - Kedalaman bidang Z (default: 0)
   * @returns {THREE.Vector3}
   */
  function screenToWorld(screenX, screenY, targetZ = 0) {
    if (!camera) return new THREE.Vector3(0, 0, targetZ);
    const ndcX = (screenX / 1920) * 2 - 1;
    const ndcY = -(screenY / 1080) * 2 + 1;
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    if (Math.abs(dir.z) > 0.00001) {
      const t = (targetZ - camera.position.z) / dir.z;
      return new THREE.Vector3(
        camera.position.x + dir.x * t,
        camera.position.y + dir.y * t,
        targetZ
      );
    }
    return new THREE.Vector3(0, 0, targetZ);
  }

  /**
   * Mengonversi koordinat dunia 3D kembali ke koordinat layar 1920x1080.
   * @param {THREE.Vector3} worldVec
   * @returns {{x: number, y: number}}
   */
  function worldToScreen(worldVec) {
    if (!camera) return { x: 960, y: 540 };
    const p = worldVec.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * 1920,
      y: (-(p.y * 0.5) + 0.5) * 1080
    };
  }

  /**
   * Helper menggambar persegi bersudut tumpul pada 2D Canvas.
   */
  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Membungkus teks pikiran ke dalam maksimal 2 baris (wrapWidth 360 px di layar / 720 px di kanvas 1024).
   */
  function wrapThoughtText(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || '').split(' ');
    const lines = [];
    let curLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const test = curLine ? (curLine + ' ' + word) : word;
      if (ctx.measureText(test).width > maxWidth) {
        if (curLine) lines.push(curLine);
        curLine = word;
        if (lines.length >= maxLines - 1) break;
      } else {
        curLine = test;
      }
    }
    if (curLine && lines.length < maxLines) lines.push(curLine);

    if (lines.length === maxLines) {
      let last = lines[maxLines - 1];
      if (words.length > 0 && lines.join(' ').length < text.length) {
        while (ctx.measureText(last + '...').width > maxWidth && last.length > 3) {
          last = last.slice(0, -1);
        }
        lines[maxLines - 1] = last.trim() + '...';
      }
    }
    return lines;
  }

  /**
   * Membuat Sprite kanvas label pikiran tajam (CanvasTexture 1024x256, ukuran layar tetap 400x104 px).
   * Teks Nunito 700 putih minimal 28 px (56 px pada kanvas 1024).
   */
  function createThoughtSprite(thought) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Panel kaca gelap pekat (alpha 0.95)
    ctx.fillStyle = 'rgba(16, 18, 48, 0.96)';
    drawRoundRect(ctx, 24, 16, 976, 224, 32);
    ctx.fill();

    // Border aksen lembut
    ctx.strokeStyle = '#7FE0C3';
    ctx.lineWidth = 6;
    drawRoundRect(ctx, 24, 16, 976, 224, 32);
    ctx.stroke();

    // Teks pikiran putih tajam (Nunito 700 bold, 56 px di kanvas = 28 px di layar 1920x1080)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapThoughtText(ctx, thought.text || '', 720, 2);
    if (lines.length === 1) {
      ctx.fillText(lines[0], 512, 128);
    } else if (lines.length >= 2) {
      ctx.fillText(lines[0], 512, 94);
      ctx.fillText(lines[1], 512, 162);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);

    // Skala 3D yang tepat sama dengan 400 x 104 px di layar
    const pLeft = screenToWorld(960 - 200, 540, 0);
    const pRight = screenToWorld(960 + 200, 540, 0);
    const pTop = screenToWorld(960, 540 - 52, 0);
    const pBottom = screenToWorld(960, 540 + 52, 0);

    const worldW = Math.abs(pRight.x - pLeft.x);
    const worldH = Math.abs(pTop.y - pBottom.y);
    sprite.scale.set(worldW, worldH, 1.0);

    return sprite;
  }

  /**
   * Membuat mesh model 3D satu Astronot tanpa CapsuleGeometry (Three.js r128).
   * Poin 4: Badan & strip berwarna jenis, visor gelap dengan tepi cahaya, moncong blaster, cincin kaki.
   */
  function createAstronautMesh(cfg) {
    const group = new THREE.Group();

    // Material badan berwarna sesuai jenis (Poin 4)
    const suitMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.35,
      metalness: 0.15
    });

    // Material strip aksen bercahaya
    const stripMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.color,
      emissiveIntensity: 0.65,
      roughness: 0.2
    });

    // Visor gelap mengilap metalik
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x080A14,
      metalness: 0.95,
      roughness: 0.05
    });

    // Tepi cahaya berwarna di sekeliling visor
    const visorRimMat = new THREE.MeshBasicMaterial({
      color: cfg.color
    });

    // 1. Badan silinder tengah (berwarna jenis)
    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.85, 16);
    const body = new THREE.Mesh(bodyGeo, suitMat);
    body.position.y = 0.0;
    group.add(body);

    // 2. Ujung atas & bawah badan (dua Sphere)
    const topCapGeo = new THREE.SphereGeometry(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const topCap = new THREE.Mesh(topCapGeo, suitMat);
    topCap.position.y = 0.425;
    group.add(topCap);

    const bottomCapGeo = new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const bottomCap = new THREE.Mesh(bottomCapGeo, suitMat);
    bottomCap.position.y = -0.425;
    group.add(bottomCap);

    // 3. Helm bulat
    const helmGeo = new THREE.SphereGeometry(0.40, 18, 14);
    const helm = new THREE.Mesh(helmGeo, suitMat);
    helm.position.y = 0.72;
    group.add(helm);

    // 4. Visor gelap dengan tepi cahaya berwarna
    const visorGeo = new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI, 0, Math.PI * 0.75);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.72, 0.14);
    visor.rotation.x = -Math.PI * 0.1;
    group.add(visor);

    const visorRimGeo = new THREE.TorusGeometry(0.34, 0.025, 8, 24, Math.PI);
    const visorRim = new THREE.Mesh(visorRimGeo, visorRimMat);
    visorRim.position.set(0, 0.72, 0.15);
    visorRim.rotation.x = -Math.PI * 0.1;
    group.add(visorRim);

    // 5. Strip aksen di dada & helm
    const chestStripGeo = new THREE.CylinderGeometry(0.33, 0.35, 0.14, 16);
    const chestStrip = new THREE.Mesh(chestStripGeo, stripMat);
    chestStrip.position.y = 0.12;
    group.add(chestStrip);

    const helmBandGeo = new THREE.TorusGeometry(0.41, 0.03, 8, 20);
    const helmBand = new THREE.Mesh(helmBandGeo, stripMat);
    helmBand.position.y = 0.72;
    helmBand.rotation.x = Math.PI * 0.5;
    group.add(helmBand);

    // 6. Ransel di punggung
    const packGeo = new THREE.BoxGeometry(0.40, 0.60, 0.22);
    const pack = new THREE.Mesh(packGeo, suitMat);
    pack.position.set(0, 0.12, -0.28);
    group.add(pack);

    // 7. Moncong Blaster (Laser Muzzle)
    const muzzleGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.22, 10);
    muzzleGeo.rotateX(Math.PI * 0.5);
    const muzzle = new THREE.Mesh(muzzleGeo, stripMat);
    muzzle.position.set(0, 0.85, 0.18);
    group.add(muzzle);

    // 8. Cincin cahaya seleksi di bawah kaki
    const selGeo = new THREE.RingGeometry(0.55, 0.72, 32);
    const selMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: (cfg.index === 0) ? 0.95 : 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const selRing = new THREE.Mesh(selGeo, selMat);
    selRing.rotation.x = -Math.PI * 0.5;
    selRing.position.y = -0.90;
    group.add(selRing);

    group.userData = {
      cfg: cfg,
      selRing: selRing,
      muzzle: muzzle,
      baseScale: 1.0,
      targetScale: (cfg.index === 0) ? 1.1 : 1.0,
      recoilZ: 0.0,
      targetRotZ: 0.0
    };

    // Skala awal
    const s = group.userData.targetScale;
    group.scale.set(s, s, s);

    return group;
  }

  /**
   * Membuat mesh monster gelembung pikiran di slot tetap.
   */
  function createMonsterMesh(thought, monsterId, slotPos) {
    const group = new THREE.Group();

    // 1. Badan monster icosahedron bersudut flat
    const bodyGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x4A4268,
      emissive: 0x241C3C,
      flatShading: true,
      shininess: 12
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.userData = { monsterId: monsterId };
    group.add(body);

    // 2. 8 Duri kerucut di sekeliling badan
    const spikeGeo = new THREE.ConeGeometry(0.14, 0.44, 5);
    spikeGeo.rotateX(Math.PI * 0.5);
    const spikeMat = new THREE.MeshPhongMaterial({
      color: 0x383056,
      flatShading: true
    });

    const spikeDirs = [
      new THREE.Vector3( 1,  0.5,  0).normalize(),
      new THREE.Vector3(-1,  0.5,  0).normalize(),
      new THREE.Vector3( 0,  1.0,  0.5).normalize(),
      new THREE.Vector3( 0, -0.9,  0.3).normalize(),
      new THREE.Vector3( 0.7, -0.5, 0.7).normalize(),
      new THREE.Vector3(-0.7, -0.5, 0.7).normalize(),
      new THREE.Vector3( 0.6,  0.6, -0.7).normalize(),
      new THREE.Vector3(-0.6,  0.6, -0.7).normalize()
    ];

    spikeDirs.forEach(dir => {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.copy(dir.clone().multiplyScalar(0.55));
      spike.lookAt(dir.clone().multiplyScalar(5));
      spike.userData = { monsterId: monsterId };
      group.add(spike);
    });

    // 3. Dua mata bulat mengamati
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xF0F4FF });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1A1428 });
    const eyeGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const pupilGeo = new THREE.SphereGeometry(0.06, 8, 8);

    const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eyeL.position.set(-0.20, 0.12, 0.50);
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.20, 0.12, 0.58);
    group.add(eyeL);
    group.add(pupilL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eyeR.position.set(0.20, 0.12, 0.50);
    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.20, 0.12, 0.58);
    group.add(eyeR);
    group.add(pupilR);

    // 4. Cangkang gelembung transparan
    const bubbleGeo = new THREE.SphereGeometry(0.92, 18, 14);
    const bubbleMat = new THREE.MeshPhongMaterial({
      color: 0x9B8CFF,
      transparent: true,
      opacity: 0.22,
      shininess: 38,
      depthWrite: false
    });
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubble.userData = { monsterId: monsterId };
    group.add(bubble);

    // 5. Label Teks Pikiran (Plat tetap 400x104 px di layar, jarak 8 px di bawah badan monster)
    const labelSprite = createThoughtSprite(thought);
    // Offset vertikal tepat 8 px di bawah badan monster:
    // my = slotPos.y - 48, label center = slotPos.y + 60 -> selisih -108 px di layar = -1.492 di dunia
    labelSprite.position.set(0, -1.492, 0.05);
    group.add(labelSprite);

    group.userData = {
      monsterId: monsterId,
      thought: thought,
      body: body,
      bubble: bubble,
      labelSprite: labelSprite,
      slotPos: slotPos,
      shake: 0.0,
      isSpawning: true,
      spawnTimer: 0.0,
      isDying: false,
      deathTimer: 0.0,
      hasFailed: false,
      phase: Math.random() * Math.PI * 2
    };

    return group;
  }

  /**
   * Membangun grup sub-panggung Level 2 di Three.js.
   * 4 Astronot diletakkan presisi pada x = [393, 771, 1149, 1527], y = 855 lewat screenToWorld.
   */
  function buildL2Scene() {
    l2Group = new THREE.Group();
    l2AstronautsGroup = new THREE.Group();
    l2MonstersGroup = new THREE.Group();
    l2BeamsGroup = new THREE.Group();
    l2EffectsGroup = new THREE.Group();

    l2Group.add(l2AstronautsGroup);
    l2Group.add(l2MonstersGroup);
    l2Group.add(l2BeamsGroup);
    l2Group.add(l2EffectsGroup);

    // 4 Koordinat layar astronot sesuai Poin 4 (x = 393, 771, 1149, 1527, y = 855)
    const astScreenPositions = [
      { index: 0, name: 'Penenang', cat: 'Cemas', color: 0x6EC6FF, sx: 393, sy: 855 },
      { index: 1, name: 'Navigator', cat: 'Rencana', color: 0xFFB86B, sx: 771, sy: 855 },
      { index: 2, name: 'Sahabat', cat: 'Menilai Diri', color: 0xB69CFF, sx: 1149, sy: 855 },
      { index: 3, name: 'Arsiparis', cat: 'Kenangan', color: 0xE6EEF7, sx: 1527, sy: 855 }
    ];

    l2Astronauts = [];
    astScreenPositions.forEach(cfg => {
      const aMesh = createAstronautMesh(cfg);
      const wPos = screenToWorld(cfg.sx, cfg.sy, 0);
      aMesh.position.copy(wPos);
      aMesh.userData.basePos = wPos.clone();
      aMesh.userData.sx = cfg.sx;
      aMesh.userData.sy = cfg.sy;

      l2AstronautsGroup.add(aMesh);
      l2Astronauts.push(aMesh);
    });

    l2Group.visible = false;
    scene.add(l2Group);
    raycaster = new THREE.Raycaster();
  }

  /**
   * Menyorot astronot aktif (Poin 4: skala 1.1 dan cincin cahaya di kaki).
   */
  function selectL2Astronaut(index) {
    l2Astronauts.forEach((a, i) => {
      const isSel = (i === index);
      a.userData.targetScale = isSel ? 1.1 : 1.0;
      if (a.userData.selRing) {
        a.userData.selRing.material.opacity = isSel ? 0.95 : 0.0;
      }
      if (!isSel) {
        a.userData.targetRotZ = 0.0;
      }
    });
  }

  /**
   * Mengarahkan astronot terpilih menghadap target di layar (Poin 8: rotasi s.d. 85 derajat ke kiri/kanan).
   */
  function aimL2Astronaut(astronautIndex, targetScreenX, targetScreenY) {
    const a = l2Astronauts[astronautIndex];
    if (!a) return;

    const dx = targetScreenX - a.userData.sx;
    const dy = targetScreenY - a.userData.sy; // Negatif karena target berada di atas
    const angleRad = Math.atan2(dx, -dy);
    const maxRad = (85 * Math.PI) / 180; // Maksimal 85 derajat
    const clamped = Math.max(-maxRad, Math.min(maxRad, angleRad));

    a.userData.targetRotZ = -clamped;
  }

  /**
   * Memunculkan monster pikiran 3D baru di salah satu dari 5 slot tetap (Poin 6).
   */
  function spawnL2Monster(thought, slotIndex, slotPos) {
    if (!l2MonstersGroup) return null;
    const monsterId = 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // Badan monster berada di slotPos.y - 48 px
    const bodyCenterScreen = { x: slotPos.x, y: slotPos.y - 48 };
    const mGroup = createMonsterMesh(thought, monsterId, bodyCenterScreen);

    const worldPos = screenToWorld(bodyCenterScreen.x, bodyCenterScreen.y, 0);
    mGroup.position.copy(worldPos);
    mGroup.userData.basePos = worldPos.clone();
    mGroup.userData.slotIndex = slotIndex;
    mGroup.scale.set(0.001, 0.001, 0.001); // Muncul membesar 0,5 detik

    l2MonstersGroup.add(mGroup);
    l2Monsters.push({
      id: monsterId,
      thought: thought,
      mesh: mGroup,
      userData: mGroup.userData,
      slotPos: bodyCenterScreen
    });

    return monsterId;
  }

  /**
   * Mendeteksi klik monster (Poin 9: lingkaran 100 px di sekitar badan DAN plat label 400x104 px).
   */
  function pickL2Monster(clientX, clientY) {
    if (!renderer || !l2Monsters || l2Monsters.length === 0) return null;

    let sx = clientX;
    let sy = clientY;
    let isVirtual = false;

    if (sx && typeof sx === 'object') {
      if (typeof sx.x === 'number' && typeof sx.y === 'number') {
        sy = sx.y;
        sx = sx.x;
        isVirtual = true;
      } else if (sx.event) {
        sy = (sx.event.clientY !== undefined) ? sx.event.clientY : sx.y;
        sx = (sx.event.clientX !== undefined) ? sx.event.clientX : sx.x;
      }
    }
    if (typeof sx !== 'number' || typeof sy !== 'number') return null;

    if (!isVirtual) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (sx <= window.innerWidth && sy <= window.innerHeight) {
          sx = ((sx - rect.left) / rect.width) * 1920;
          sy = ((sy - rect.top) / rect.height) * 1080;
        }
      }
    }

    for (let i = 0; i < l2Monsters.length; i++) {
      const m = l2Monsters[i];
      if (m.userData.isDying) continue;
      const bPos = m.slotPos; // { x, y }

      // 1. Lingkaran 100 px di sekitar badan monster
      const distBody = Math.hypot(sx - bPos.x, sy - bPos.y);
      if (distBody <= 100) {
        return m.id;
      }

      // 2. Plat label 400x104 px di bawah badan (jarak 8 px, center y = bPos.y + 108)
      const labelCenterY = bPos.y + 108;
      if (Math.abs(sx - bPos.x) <= 200 && Math.abs(sy - labelCenterY) <= 52) {
        return m.id;
      }
    }

    return null;
  }

  /**
   * Mengeluarkan monster tanpa tembakan (untuk tombol 'Tidak cocok' pada Mode Jurnal, BR-19).
   */
  function dismissL2Monster(monsterId) {
    const item = l2Monsters.find(m => m.id === monsterId && !m.userData.isDying);
    if (!item) return;
    item.userData.isDying = true;
    spawnL2CorrectEffects(item.mesh.position);
  }

  /**
   * Mengambil posisi layar monster untuk Phaser.
   */
  function getL2MonsterScreenPos(monsterId) {
    const item = l2Monsters.find(m => m.id === monsterId);
    if (!item) return null;
    return item.slotPos;
  }

  /**
   * Meluncurkan tembakan laser 180 derajat dari moncong astronot ke pusat monster (Poin 8).
   */
  function fireL2Beam(astronautIndex, monsterId, onResult) {
    const astronaut = l2Astronauts[astronautIndex];
    const monsterItem = l2Monsters.find(m => m.id === monsterId && !m.userData.isDying);
    if (!astronaut || !monsterItem) {
      if (typeof onResult === 'function') onResult({ correct: false });
      return false;
    }

    // Arahkan astronot menghadap target
    aimL2Astronaut(astronautIndex, monsterItem.slotPos.x, monsterItem.slotPos.y);

    // Posisi moncong astronot dalam koordinat dunia 3D
    const rotZ = astronaut.rotation.z;
    const muzzleOffset = new THREE.Vector3(-Math.sin(rotZ) * 0.85, Math.cos(rotZ) * 0.85, 0.18);
    const startPos = astronaut.position.clone().add(muzzleOffset);

    // Target pusat monster
    const targetPos = monsterItem.mesh.position.clone();

    // Sinar proyektil laser silinder tipis
    const dist = startPos.distanceTo(targetPos);
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, Math.min(2.4, dist * 0.35), 8);
    beamGeo.rotateX(Math.PI * 0.5);
    const beamMat = new THREE.MeshBasicMaterial({
      color: astronaut.userData.cfg.color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.copy(startPos);
    beamMesh.lookAt(targetPos);
    l2BeamsGroup.add(beamMesh);

    l2ActiveBeams.push({
      mesh: beamMesh,
      start: startPos,
      target: targetPos,
      cat: astronaut.userData.cfg.cat,
      monsterId: monsterId,
      progress: 0.0,
      duration: 0.35,
      onResult: onResult
    });

    return true;
  }

  /**
   * Memunculkan efek ledakan kilatan, awan, dan 20 partikel saat tembakan benar (Poin 8).
   */
  function spawnL2CorrectEffects(pos) {
    // 1. 20 partikel putih menyebar
    const PART_COUNT = 20;
    const partGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PART_COUNT * 3);
    const vels = [];

    for (let p = 0; p < PART_COUNT; p++) {
      positions[p * 3]     = pos.x;
      positions[p * 3 + 1] = pos.y;
      positions[p * 3 + 2] = pos.z;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const spd = 2.4 + Math.random() * 2.8;
      vels.push({
        vx: Math.sin(theta) * Math.cos(phi) * spd,
        vy: Math.cos(theta) * spd,
        vz: Math.sin(theta) * Math.sin(phi) * spd
      });
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.22,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sparksMesh = new THREE.Points(partGeo, partMat);
    l2EffectsGroup.add(sparksMesh);

    l2Sparks.push({
      mesh: sparksMesh,
      vels: vels,
      age: 0.0,
      maxAge: 0.65
    });

    // 2. Awan putih low poly naik dan memudar
    const cloudGrp = new THREE.Group();
    const puffGeo = new THREE.DodecahedronGeometry(0.38, 1);
    const puffMat = new THREE.MeshStandardMaterial({
      color: 0xF2F6FA,
      roughness: 0.8,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    });

    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(puffGeo, puffMat);
      puff.position.set(
        (Math.random() - 0.5) * 0.65,
        (Math.random() - 0.5) * 0.45,
        (Math.random() - 0.5) * 0.45
      );
      puff.scale.setScalar(0.7 + Math.random() * 0.6);
      cloudGrp.add(puff);
    }
    cloudGrp.position.copy(pos);
    l2EffectsGroup.add(cloudGrp);

    l2PuffClouds.push({
      group: cloudGrp,
      age: 0.0,
      maxAge: 1.1
    });
  }

  /**
   * Membersihkan seluruh elemen Level 2 dari memori WebGL.
   */
  function clearL2() {
    if (!l2Group) return;

    l2Monsters.forEach(m => {
      l2MonstersGroup.remove(m.mesh);
      if (m.userData.labelSprite && m.userData.labelSprite.material.map) {
        m.userData.labelSprite.material.map.dispose();
      }
    });
    l2Monsters = [];

    l2ActiveBeams.forEach(b => {
      l2BeamsGroup.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    });
    l2ActiveBeams = [];

    l2Sparks.forEach(s => {
      l2EffectsGroup.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    });
    l2Sparks = [];

    l2PuffClouds.forEach(c => {
      l2EffectsGroup.remove(c.group);
      c.group.children.forEach(ch => {
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
      });
    });
    l2PuffClouds = [];
  }

  /**
   * Memperbarui animasi Level 2 per frame (Poin 6: spawn 0,5s, goyang 12 px & miring 4 derajat, tembakan).
   */
  function updateL2(dt, timeScale) {
    if (!l2Group || !l2Group.visible) return;

    // 1. Pembaruan astronot (lerp rotasi bidik & skala halus)
    l2Astronauts.forEach(a => {
      const ud = a.userData;
      // Lerp skala terpilih (1.1) vs normal (1.0)
      const curS = a.scale.x;
      const newS = curS + (ud.targetScale - curS) * 0.15;
      a.scale.set(newS, newS, newS);

      // Lerp rotasi menghadap target bidik
      a.rotation.z += (ud.targetRotZ - a.rotation.z) * 0.18;
    });

    // 2. Pembaruan monster di slot tetap (Poin 6: goyang naik-turun 12 px, miring 4 derajat, tanpa geser horizontal)
    for (let m = l2Monsters.length - 1; m >= 0; m--) {
      const item = l2Monsters[m];
      const ud = item.userData;

      if (!ud.isDying) {
        // Animasi kemunculan membesar 0,5 detik
        if (ud.isSpawning) {
          ud.spawnTimer += dt * timeScale;
          const spProg = Math.min(1.0, ud.spawnTimer / 0.5);
          // Easing Sine.easeOut
          const curScale = Math.sin((spProg * Math.PI) / 2);
          item.mesh.scale.set(curScale, curScale, curScale);
          if (spProg >= 1.0) {
            ud.isSpawning = false;
          }
        } else {
          // Goyang kecil: naik-turun 12 px di layar (0.166 unit dunia)
          if (!reduceMotion) {
            const wobbleY = Math.sin(clockTime * 2.2 + ud.phase) * 0.166;
            item.mesh.position.y = ud.basePos.y + wobbleY;

            // Miring 4 derajat (0.0698 rad)
            const tiltZ = Math.sin(clockTime * 1.8 + ud.phase) * 0.0698;
            ud.body.rotation.z = tiltZ;
            ud.body.rotation.y += 0.012 * timeScale;
            ud.bubble.rotation.y -= 0.008 * timeScale;
          }
        }

        // Efek getaran saat tembakan salah
        if (ud.shake > 0) {
          item.mesh.position.x = ud.basePos.x + (Math.random() - 0.5) * ud.shake * 0.35;
          ud.shake -= dt * 1.8;
          if (ud.shake < 0) {
            ud.shake = 0;
            item.mesh.position.x = ud.basePos.x;
          }
        }
      } else {
        // Efek menyusut saat tembakan benar (0,4 detik)
        ud.deathTimer += dt * timeScale;
        const prog = Math.min(1.0, ud.deathTimer / 0.4);
        const sc = Math.max(0.001, 1.0 - prog);
        item.mesh.scale.set(sc, sc, sc);

        if (prog >= 1.0) {
          l2MonstersGroup.remove(item.mesh);
          if (ud.labelSprite && ud.labelSprite.material.map) {
            ud.labelSprite.material.map.dispose();
          }
          l2Monsters.splice(m, 1);
        }
      }
    }

    // 3. Pembaruan laser meluncur (0,35 detik durasi)
    for (let b = l2ActiveBeams.length - 1; b >= 0; b--) {
      const beam = l2ActiveBeams[b];
      beam.progress += (dt / beam.duration) * timeScale;

      const t = Math.min(1.0, beam.progress);
      beam.mesh.position.lerpVectors(beam.start, beam.target, t);

      if (beam.progress >= 1.0) {
        l2BeamsGroup.remove(beam.mesh);
        beam.mesh.geometry.dispose();
        beam.mesh.material.dispose();
        l2ActiveBeams.splice(b, 1);

        // Kilatan di pusat monster
        const targetMonster = l2Monsters.find(m => m.id === beam.monsterId);
        if (targetMonster && !targetMonster.userData.isDying) {
          const isCorrect = (beam.cat === targetMonster.userData.thought.cat);
          if (isCorrect) {
            targetMonster.userData.isDying = true;
            spawnL2CorrectEffects(targetMonster.mesh.position);
          } else {
            targetMonster.userData.shake = 0.40;
            targetMonster.userData.hasFailed = true;
          }

          if (typeof beam.onResult === 'function') {
            beam.onResult({ correct: isCorrect });
          }
        }
      }
    }

    // 4. Pembaruan partikel percikan
    for (let s = l2Sparks.length - 1; s >= 0; s--) {
      const sp = l2Sparks[s];
      sp.age += dt * timeScale;
      const prog = sp.age / sp.maxAge;
      const posAttr = sp.mesh.geometry.attributes.position;
      const arr = posAttr.array;

      for (let p = 0; p < sp.vels.length; p++) {
        arr[p * 3]     += sp.vels[p].vx * dt * timeScale;
        arr[p * 3 + 1] += sp.vels[p].vy * dt * timeScale;
        arr[p * 3 + 2] += sp.vels[p].vz * dt * timeScale;
      }
      posAttr.needsUpdate = true;
      sp.mesh.material.opacity = Math.max(0.0, 1.0 - prog);

      if (sp.age >= sp.maxAge) {
        l2EffectsGroup.remove(sp.mesh);
        l2Sparks.splice(s, 1);
      }
    }

    // 5. Pembaruan awan putih naik
    for (let c = l2PuffClouds.length - 1; c >= 0; c--) {
      const pc = l2PuffClouds[c];
      pc.age += dt * timeScale;
      const prog = pc.age / pc.maxAge;
      pc.group.position.y += dt * 1.6 * timeScale;
      const sc = 1.0 + prog * 0.4;
      pc.group.scale.set(sc, sc, sc);

      pc.group.children.forEach(child => {
        if (child.material) {
          child.material.opacity = Math.max(0.0, (1.0 - prog) * 0.92);
        }
      });

      if (pc.age >= pc.maxAge) {
        l2EffectsGroup.remove(pc.group);
        l2PuffClouds.splice(c, 1);
      }
    }
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

    // 10b. Pembaruan Transisi Silang Tema 1,2 Detik (PRD Bagian 15.3 & BR-16)
    if (isThemeTransitioning) {
      const elapsed = performance.now() - themeTransitionStart;
      const progress = Math.min(1.0, elapsed / themeTransitionDuration);
      // Easing gelombang sinus lembut (Sine in-out)
      const t = 0.5 - 0.5 * Math.cos(progress * Math.PI);

      currentSkyTop.lerpColors(startSkyTop, targetSkyTop, t);
      currentSkyMid.lerpColors(startSkyMid, targetSkyMid, t);
      currentSkyBottom.lerpColors(startSkyBottom, targetSkyBottom, t);

      if (skyCanvas && skyTexture) {
        const ctx = skyCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0.0, '#' + currentSkyTop.getHexString());
        grad.addColorStop(0.5, '#' + currentSkyMid.getHexString());
        grad.addColorStop(1.0, '#' + currentSkyBottom.getHexString());
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        skyTexture.needsUpdate = true;
      }

      currentLanternColor.lerpColors(startLanternColor, targetLanternColor, t);
      currentParticleColor.lerpColors(startParticleColor, targetParticleColor, t);

      // Perbarui warna lentera pulau
      islands.forEach(isl => {
        if (isl.lantern) {
          if (isl.lantern.light) isl.lantern.light.color.copy(currentLanternColor);
          if (isl.lantern.halo && isl.lantern.halo.material) isl.lantern.halo.material.color.copy(currentLanternColor);
          if (isl.lantern.mat) isl.lantern.mat.color.copy(currentLanternColor);
        }
      });

      // Perbarui partikel & bintang
      if (particlesMesh && particlesMesh.material) {
        particlesMesh.material.color.copy(currentParticleColor);
      }
      if (starsMesh && starsMesh.material) {
        starsMesh.material.color.copy(currentParticleColor);
      }

      // Perbarui pencahayaan langit & tanah
      if (hemiLight) {
        hemiLight.color.lerpColors(startHemiSky, targetHemiSky, t);
        hemiLight.groundColor.lerpColors(startHemiGround, targetHemiGround, t);
      }
      if (scene && scene.fog) {
        scene.fog.color.lerpColors(startSkyTop, targetSkyTop, t);
      }
      if (dirLight) {
        dirLight.color.lerpColors(startLanternColor, targetLanternColor, t);
      }

      if (progress >= 1.0) {
        isThemeTransitioning = false;
      }
    }

    // 10c. Pembaruan Animasi Elemen 3D Bertema (Prompt R-4)
    if (!reduceMotion) {
      // 1. Animasi Tema Embun (Kabut bergerak, tetes embun jatuh, rumput bergoyang)
      if (embunGroup && embunGroup.visible) {
        embunMistPlanes.forEach(m => {
          m.mesh.position.x = m.baseX + Math.sin(clockTime * 0.28 + m.phase) * 1.6;
          m.mesh.position.y = m.baseY + Math.cos(clockTime * 0.20 + m.phase) * 0.22;
        });

        if (embunDewDrops && embunDewDrops.geometry) {
          const posAttr = embunDewDrops.geometry.attributes.position;
          const posArr = posAttr.array;
          const count = embunDewData.length;
          for (let i = 0; i < count; i++) {
            const d = embunDewData[i];
            posArr[i * 3 + 1] -= (0.55 + d.speed * 0.45) * dt * timeScale;
            posArr[i * 3] += Math.sin(clockTime * 0.6 + d.phase) * (d.drift * 0.02);
            if (posArr[i * 3 + 1] < -9.8) {
              posArr[i * 3 + 1] = 13.0 + Math.random() * 2.5;
              posArr[i * 3] = (Math.random() - 0.5) * 36;
            }
          }
          posAttr.needsUpdate = true;
        }

        embunGrassTufts.forEach(g => {
          g.mesh.rotation.z = Math.sin(clockTime * 1.4 + g.phase) * 0.12;
          g.mesh.children.forEach(blade => {
            if (blade.material) {
              blade.material.opacity = 0.65 + 0.35 * Math.sin(clockTime * 1.8 + g.phase);
            }
          });
        });
      }

      // 2. Animasi Tema Fajar (Rotasi sinar matahari radial, awan jingga, burung mengepak)
      if (fajarGroup && fajarGroup.visible) {
        if (fajarSunRays) {
          fajarSunRays.rotation.z += 0.0006 * timeScale;
        }

        fajarClouds.forEach(c => {
          c.group.position.x = c.baseX + Math.sin(clockTime * c.speed + c.phase) * 1.8;
          c.group.position.y = c.baseY + Math.cos(clockTime * 0.3 + c.phase) * 0.18;
        });

        fajarBirds.forEach(b => {
          b.group.position.x += b.speed * dt * timeScale;
          b.group.position.y = b.baseY + Math.sin(clockTime * 2.2 + b.offset) * 0.25;

          const flap = Math.sin(clockTime * 5.2 + b.offset) * 0.45;
          b.pivotL.rotation.z = flap;
          b.pivotR.rotation.z = -flap;

          if (b.group.position.x > 32.0) {
            b.group.position.x = -32.0;
          }
        });
      }

      // 3. Animasi Tema Aurora (Pita aurora sinus, bintang jatuh, kristal es berputar)
      if (auroraGroup && auroraGroup.visible) {
        auroraRibbons.forEach(r => {
          if (r.material && r.material.uniforms && r.material.uniforms.uTime) {
            r.material.uniforms.uTime.value = clockTime;
          }
        });

        if (auroraShootingStar) {
          const s = auroraShootingStar;
          if (!s.active) {
            s.timer -= dt * timeScale;
            if (s.timer <= 0) {
              s.active = true;
              s.progress = 0.0;
              s.startX = -22.0 + Math.random() * 8.0;
              s.startY = 17.0 + Math.random() * 5.0;
              s.startZ = -32.0;
              s.vx = 38.0;
              s.vy = -24.0;
              s.vz = 5.0;
              s.mesh.position.set(s.startX, s.startY, s.startZ);
              s.mesh.visible = true;
            }
          } else {
            s.progress += dt * 1.4 * timeScale;
            s.mesh.position.x = s.startX + s.vx * s.progress;
            s.mesh.position.y = s.startY + s.vy * s.progress;
            s.mesh.position.z = s.startZ + s.vz * s.progress;

            const alpha = Math.sin(s.progress * Math.PI);
            s.mesh.material.opacity = Math.max(0.0, alpha * 0.95);

            if (s.progress >= 1.0) {
              s.active = false;
              s.mesh.visible = false;
              s.timer = 5.0 + Math.random() * 3.5;
            }
          }
        }

        auroraIceCrystals.forEach(k => {
          k.mesh.rotation.x += k.rotSpeedX * timeScale;
          k.mesh.rotation.y += k.rotSpeedY * timeScale;
          k.mesh.position.y = k.baseY + Math.sin(clockTime * 1.1 + k.phase) * 0.32;
        });
      }
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

    // 12b. Pembaruan Sub-panggung Level 2 Misi Astronot (Prompt R-5)
    if (l2Group && l2Group.visible) {
      updateL2(dt, timeScale);
    }

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

        // 8b. Elemen 3D Bertema (PRD Bagian 15.3: Embun, Fajar, Aurora - Prompt R-4)
        buildThemeElements();

        // 8c. Sub-panggung Level 2 Misi Astronot (PRD Bagian 15.4 - Prompt R-5)
        buildL2Scene();

        // 9. Event Listeners (Resize, Mouse Parallax, Tab Visibility)
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('mousemove', onMouseMove);
        document.addEventListener('visibilitychange', onVisibilityChange);

        active = true;
        isRunning = true;
        animFrameId = requestAnimationFrame(animate);

        const savedSkin = (window.JEDA && JEDA.State && JEDA.State.data && JEDA.State.data.skin) || 'embun';
        this.setTheme(savedSkin, 0);

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

      // Visibilitas sub-panggung Level 2 Misi Astronot (PRD Bagian 15.4)
      if (l2Group) {
        l2Group.visible = (mode === 'l2');
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
     * Mengganti palet warna Orb Napas sesuai skin aktif (PRD Bagian 14.2 G5 / Fase G-4).
     * @param {string} skinId - 'embun' | 'fajar' | 'aurora'
     */
    setSkin(skinId) {
      if (!skinId) return;
      const skins = (window.JEDA && JEDA.CFG && JEDA.CFG.SKINS) || {};
      const skin = skins[skinId] || skins.embun;
      if (!skin) return;

      const skinColor = new THREE.Color(skin.color);
      COLORS.good.copy(skinColor);

      // Perbarui target warna dan warna aktif seketika
      targetColor.copy(skinColor);
      if (currentColor) {
        currentColor.copy(skinColor);
      }

      if (orbShaderMat && orbShaderMat.uniforms && orbShaderMat.uniforms.color) {
        orbShaderMat.uniforms.color.value.copy(skinColor);
      }
      if (orbLight) {
        orbLight.color.copy(skinColor);
      }
      if (haloMat) {
        haloMat.color.copy(skinColor);
      }
      if (pulseRingMesh && pulseRingMesh.material) {
        pulseRingMesh.material.color.copy(skinColor);
      }
      if (particlesMesh && particlesMesh.material) {
        particlesMesh.material.color.copy(skinColor);
      }
    },

    /**
     * Menerapkan seluruh tema visual panggung 3D dengan transisi silang 1,2 detik (PRD Bagian 15.3 & BR-16).
     * Mengubah palet langit skydome, cahaya lentera kepulauan, partikel/bintang, dan pencahayaan global.
     * @param {string} themeName - 'embun' | 'fajar' | 'aurora'
     * @param {number} duration - Durasi transisi silang dalam ms (default 1200)
     */
    setTheme(themeName, duration = 1200) {
      if (!active) return;
      const themes = (window.JEDA && JEDA.THEMES) || {};
      const theme = themes[themeName] || themes.embun;
      if (!theme) return;

      const sky = theme.sky;
      targetSkyTop = new THREE.Color(sky.topHex);
      targetSkyMid = new THREE.Color(sky.midHex);
      targetSkyBottom = new THREE.Color(sky.bottomHex);
      targetLanternColor = new THREE.Color(theme.lanternHex);
      targetParticleColor = new THREE.Color(theme.particlesHex);
      targetHemiSky = new THREE.Color(theme.hemiSky);
      targetHemiGround = new THREE.Color(theme.hemiGround);

      // Selaraskan juga palet orb napas
      this.setSkin(theme.id);

      // Perbarui tema aktif dan visibilitas elemen 3D per tema (PRD 15.3 Prompt R-4)
      currentThemeName = theme.id;
      updateThemeElementsVisibility();

      if (duration <= 0) {
        currentSkyTop.copy(targetSkyTop);
        currentSkyMid.copy(targetSkyMid);
        currentSkyBottom.copy(targetSkyBottom);
        currentLanternColor.copy(targetLanternColor);
        currentParticleColor.copy(targetParticleColor);

        if (skyCanvas && skyTexture) {
          const ctx = skyCanvas.getContext('2d');
          const grad = ctx.createLinearGradient(0, 0, 0, 512);
          grad.addColorStop(0.0, '#' + currentSkyTop.getHexString());
          grad.addColorStop(0.5, '#' + currentSkyMid.getHexString());
          grad.addColorStop(1.0, '#' + currentSkyBottom.getHexString());
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 512, 512);
          skyTexture.needsUpdate = true;
        }

        islands.forEach(isl => {
          if (isl.lantern) {
            if (isl.lantern.light) isl.lantern.light.color.copy(targetLanternColor);
            if (isl.lantern.halo && isl.lantern.halo.material) isl.lantern.halo.material.color.copy(targetLanternColor);
            if (isl.lantern.mat) isl.lantern.mat.color.copy(targetLanternColor);
          }
        });

        if (particlesMesh && particlesMesh.material) particlesMesh.material.color.copy(targetParticleColor);
        if (starsMesh && starsMesh.material) starsMesh.material.color.copy(targetParticleColor);
        if (hemiLight) {
          hemiLight.color.copy(targetHemiSky);
          hemiLight.groundColor.copy(targetHemiGround);
        }
        if (scene && scene.fog) {
          scene.fog.color.copy(targetSkyTop);
        }
        if (dirLight) {
          dirLight.color.copy(targetLanternColor);
        }
        isThemeTransitioning = false;
        return;
      }

      startSkyTop = currentSkyTop.clone();
      startSkyMid = currentSkyMid.clone();
      startSkyBottom = currentSkyBottom.clone();
      startLanternColor = currentLanternColor.clone();
      startParticleColor = currentParticleColor.clone();
      if (hemiLight) {
        startHemiSky = hemiLight.color.clone();
        startHemiGround = hemiLight.groundColor.clone();
      }

      themeTransitionDuration = duration;
      themeTransitionStart = performance.now();
      isThemeTransitioning = true;
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
     * API Khusus Sub-panggung Level 2: Misi Astronot (PRD Bagian 15.4)
     */
    l2: {
      spawn: spawnL2Monster,
      pick: pickL2Monster,
      selectAstronaut: selectL2Astronaut,
      aim: aimL2Astronaut,
      fire: fireL2Beam,
      dismiss: dismissL2Monster,
      clear: clearL2,
      getMonsters: () => l2Monsters,
      getMonsterScreenPos: getL2MonsterScreenPos,
      isReady: () => !!(active && l2Group)
    },
    pick: pickL2Monster,

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
      updateThemeElementsVisibility();
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

      if (typeof clearL2 === 'function') clearL2();
      if (l2Group && scene) scene.remove(l2Group);

      if (embunGroup && scene) scene.remove(embunGroup);
      if (fajarGroup && scene) scene.remove(fajarGroup);
      if (auroraGroup && scene) scene.remove(auroraGroup);
      embunMistPlanes = [];
      embunDewData = [];
      embunGrassTufts = [];
      fajarClouds = [];
      fajarBirds = [];
      auroraRibbons = [];
      auroraIceCrystals = [];

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
