/**
 * JEDA - Stage3D Engine (js/stage3d.js)
 * Panggung 3D mandiri menggunakan Three.js r128 sesuai PRD Bagian 13.
 * Mengelola langit senja prosedural, 600 bintang berkilau, orb napas 3D ber-fresnel,
 * 300 partikel pengorbit reaktif, serta transisi kamera sinematik.
 */
window.JEDA = window.JEDA || {};

JEDA.Stage3D = (function() {
  // State internal engine 3D
  let active = false;
  let container = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let animFrameId = null;

  // Objek panggung 3D
  let skyDome = null;
  let starsMesh = null;
  let starsAlphas = null;
  let orbGroup = null;
  let orbMesh = null;
  let orbShaderMat = null;
  let orbLight = null;
  let haloSprite = null;
  let haloMat = null;

  // Sistem partikel pengorbit
  const PARTICLE_COUNT = 300;
  let particlesMesh = null;
  let particlePositions = null;
  let particleData = []; // { radius, angle, speed, y, ySpeed, burstRadius }

  // Awan Low Poly & Taman Lentera (Fase 3D-2)
  let clouds = [];
  let islands = [];
  let targetLanternCount = 0;
  let ambLight = null;
  let currentCalm = 0.5;
  let targetCalm = 0.5;
  let clockTime = 0.0;

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

  // Kamera & Parallax (Preset Sesuai PRD Bagian 13.3)
  const CAMERA_PRESETS = {
    menu:   { x: 0,   y: 1.0,  z: 22.0, lookX: 0,   lookY: -0.5, lookZ: 0 },
    l1:     { x: 0,   y: 0.0,  z: 11.2, lookX: 0,   lookY: 0.0,  lookZ: 0 },
    l2:     { x: 3.5, y: 2.2,  z: 15.0, lookX: 1.5, lookY: 2.5,  lookZ: -2 },
    l3:     { x: 0,   y: -0.6, z: 16.5, lookX: 0,   lookY: -1.5, lookZ: 0 },
    result: { x: 0,   y: 2.2,  z: 24.0, lookX: 0,   lookY: -0.8, lookZ: 0 }
  };
  let currentCamPos = { x: 0, y: 1.0, z: 22.0 };
  let targetCamPos = { x: 0, y: 1.0, z: 22.0 };
  let currentLookAt = { x: 0, y: -0.5, z: 0 };
  let targetLookAt = { x: 0, y: -0.5, z: 0 };
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
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (isStar) {
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.2, 'rgba(215, 238, 255, 0.8)');
      grad.addColorStop(0.5, 'rgba(127, 224, 195, 0.25)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.65)');
      grad.addColorStop(0.3, 'rgba(127, 224, 195, 0.35)');
      grad.addColorStop(0.7, 'rgba(43, 76, 126, 0.10)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Inisialisasi Shader Material Fresnel untuk Orb 3D.
   */
  function createOrbShader() {
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
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
          vec3 base = color * 0.75;
          vec3 finalColor = mix(base, fresnelColor, fresnel * 0.82);
          float alpha = 0.75 + fresnel * 0.22;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending
    });
  }

  /**
   * Membangun 600 titik bintang di langit.
   */
  function buildStars() {
    const starCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    starsAlphas = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Distribusi setengah bola kubah langit
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.5; // Kubah atas
      const r = 160 + Math.random() * 40;

      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.85 + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starsAlphas[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starTexture = createGlowTexture(true);
    const material = new THREE.PointsMaterial({
      size: 1.1,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xEEF5FF
    });

    starsMesh = new THREE.Points(geometry, material);
    scene.add(starsMesh);
  }

  /**
   * Membangun 300 partikel pengorbit yang mengelilingi orb napas.
   */
  function buildOrbitingParticles() {
    const geometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleData = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 3.2 + Math.random() * 2.6;
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1);
      const y = (Math.random() - 0.5) * 2.8;
      const ySpeed = (Math.random() - 0.5) * 0.4;

      particleData.push({
        baseRadius: radius,
        currentRadius: radius,
        angle: angle,
        speed: speed,
        y: y,
        baseY: y,
        ySpeed: ySpeed,
        burstOffset: 0
      });

      particlePositions[i * 3 + 0] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleTexture = createGlowTexture(true);
    const material = new THREE.PointsMaterial({
      size: 0.12, // Partikel halus dan anggun berukuran presisi
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x7FE0C3
    });

    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);
  }

  /**
   * Membangun 8 awan low poly dari IcosahedronGeometry (PRD Bagian 13.3).
   */
  function buildClouds() {
    clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xEDF5FF,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
      roughness: 0.85,
      metalness: 0.05
    });

    // 8 awan dengan sebaran posisi dan ukuran berbeda
    const cloudConfigs = [
      { x: -14, y: 5.5, z: -8,  scale: 1.3, speed: 0.22, phase: 0.2 },
      { x: -7,  y: 4.2, z: -4,  scale: 1.0, speed: 0.30, phase: 1.5 },
      { x: 0,   y: 6.2, z: -10, scale: 1.5, speed: 0.18, phase: 2.8 },
      { x: 8,   y: 4.8, z: -5,  scale: 1.1, speed: 0.26, phase: 4.1 },
      { x: 15,  y: 5.8, z: -7,  scale: 1.4, speed: 0.20, phase: 5.3 },
      { x: -10, y: 2.5, z: 2,   scale: 0.9, speed: 0.35, phase: 3.2 },
      { x: 5,   y: 3.0, z: 1,   scale: 0.95, speed: 0.32, phase: 0.8 },
      { x: 12,  y: 2.2, z: 3,   scale: 0.85, speed: 0.38, phase: 2.1 }
    ];

    cloudConfigs.forEach((cfg) => {
      const group = new THREE.Group();

      // Tiap awan tersusun dari gabungan 4 icosahedron low poly flat-shaded
      const parts = [
        { r: 1.2, x: 0,     y: 0,     z: 0 },
        { r: 0.85, x: -1.0, y: -0.2,  z: 0.2 },
        { r: 0.9,  x: 1.1,  y: -0.15, z: -0.1 },
        { r: 0.7,  x: 0.3,  y: 0.65,  z: 0.1 }
      ];

      parts.forEach(p => {
        const geo = new THREE.IcosahedronGeometry(p.r, 0);
        const mesh = new THREE.Mesh(geo, cloudMat);
        mesh.position.set(p.x, p.y, p.z);
        group.add(mesh);
      });

      group.scale.set(cfg.scale, cfg.scale * 0.75, cfg.scale);
      group.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(group);

      clouds.push({
        group: group,
        baseX: cfg.x,
        baseY: cfg.y,
        baseZ: cfg.z,
        speed: cfg.speed,
        bobSpeed: 0.8 + Math.random() * 0.5,
        phase: cfg.phase
      });
    });
  }

  /**
   * Membangun 3 pulau melayang dengan lentera bercahaya (PRD Bagian 13.3).
   */
  function buildLanternIslands() {
    islands = [];

    // Konfigurasi 3 pulau: Kiri (Level 1), Tengah (Level 2), Kanan (Level 3)
    const islandConfigs = [
      { id: 1, x: -6.0, baseY: -3.0, z: 1.0,  coneR: 2.2, coneH: 3.2, phase: 0.0 },
      { id: 2, x: 0.0,  baseY: -4.0, z: -1.2, coneR: 2.6, coneH: 3.8, phase: 2.1 },
      { id: 3, x: 6.0,  baseY: -3.2, z: 1.2,  coneR: 2.3, coneH: 3.4, phase: 4.2 }
    ];

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1B2138,
      flatShading: true,
      roughness: 0.9
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2E4960,
      flatShading: true,
      roughness: 0.8
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x2A2E44,
      flatShading: true,
      roughness: 0.7
    });

    islandConfigs.forEach((cfg) => {
      const group = new THREE.Group();

      // 1. Kerucut terbalik (tanah bawah pulau)
      const coneGeo = new THREE.ConeGeometry(cfg.coneR, cfg.coneH, 7);
      const coneMesh = new THREE.Mesh(coneGeo, baseMat);
      coneMesh.rotation.x = Math.PI; // Membalik kerucut ke bawah
      coneMesh.position.y = -cfg.coneH / 2;
      group.add(coneMesh);

      // 2. Cakram atas (permukaan rumput pulau)
      const diskGeo = new THREE.CylinderGeometry(cfg.coneR * 1.06, cfg.coneR * 0.96, 0.45, 8);
      const diskMesh = new THREE.Mesh(diskGeo, grassMat);
      diskMesh.position.y = 0.22;
      group.add(diskMesh);

      // 3. Batuan kecil dekorasi
      const rockGeo = new THREE.DodecahedronGeometry(0.35, 0);
      const rockMesh = new THREE.Mesh(rockGeo, baseMat);
      rockMesh.position.set(-cfg.coneR * 0.45, 0.45, cfg.coneR * 0.3);
      group.add(rockMesh);

      // 4. Tiang lentera
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.1, 6);
      const poleMesh = new THREE.Mesh(poleGeo, woodMat);
      poleMesh.position.set(0, 0.75, 0);
      group.add(poleMesh);

      // 5. Bola lentera bercahaya (emissive bulb)
      const bulbGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0x444455,
        emissive: 0x7FE0C3,
        emissiveIntensity: 0.05, // Awalnya abu redup
        roughness: 0.2
      });
      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
      bulbMesh.position.set(0, 1.35, 0);
      group.add(bulbMesh);

      // 6. PointLight di dalam lentera
      const pLight = new THREE.PointLight(0x7FE0C3, 0.0, 9);
      pLight.position.set(0, 1.35, 0);
      group.add(pLight);

      // 7. Halo sprite lentera
      const haloTex = createGlowTexture(true);
      const haloMat = new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0x7FE0C3,
        opacity: 0.0
      });
      const halo = new THREE.Sprite(haloMat);
      halo.position.set(0, 1.35, 0);
      halo.scale.set(2.4, 2.4, 1);
      group.add(halo);

      group.position.set(cfg.x, cfg.baseY, cfg.z);
      scene.add(group);

      islands.push({
        id: cfg.id,
        group: group,
        baseY: cfg.baseY,
        phase: cfg.phase,
        lantern: {
          mesh: bulbMesh,
          mat: bulbMat,
          light: pLight,
          halo: halo,
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
   * Render loop utama Three.js.
   */
  function animate(timestamp) {
    if (!active) return;
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

    // 2. Interpolasi Skala Napas Orb
    breathScale += (targetBreathScale - breathScale) * 0.08;
    const finalOrbScale = breathScale + pulseEnergy * 0.3;
    if (orbGroup) {
      orbGroup.scale.set(finalOrbScale, finalOrbScale, finalOrbScale);
      orbGroup.rotation.y += 0.003 * timeScale;
    }
    if (haloSprite) {
      const haloScale = 4.8 * finalOrbScale;
      haloSprite.scale.set(haloScale, haloScale, 1);
    }

    // Redam pulse energy perlahan
    pulseEnergy = Math.max(0, pulseEnergy - dt * 2.2);

    // 3. Update Posisi Partikel Pengorbit
    if (particlesMesh && particlePositions) {
      const pos = particlesMesh.geometry.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleData[i];
        p.angle += p.speed * dt * (reduceMotion ? 0.3 : 1.0);
        p.y += p.ySpeed * dt;
        if (Math.abs(p.y - p.baseY) > 1.2) p.ySpeed *= -1;

        // Efek letupan (burst) saat pulse aktif
        p.currentRadius = (p.baseRadius * finalOrbScale * 1.1) + (pulseEnergy * 3.5);

        pos[i * 3 + 0] = Math.cos(p.angle) * p.currentRadius;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = Math.sin(p.angle) * p.currentRadius;
      }
      particlesMesh.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Update Awan Low Poly (Fase 3D-2)
    clockTime += dt;
    const cloudSpeedMul = (currentMode === 'l2') ? 2.5 : 1.0;
    if (!reduceMotion && clouds && clouds.length > 0) {
      clouds.forEach(c => {
        c.group.position.x += c.speed * dt * cloudSpeedMul * timeScale;
        if (c.group.position.x > 25) {
          c.group.position.x = -25;
        }
        c.group.position.y = c.baseY + Math.sin(clockTime * c.bobSpeed + c.phase) * 0.22;
      });
    }

    // 5. Update Taman Lentera 3 Pulau (Fase 3D-2)
    if (islands && islands.length > 0) {
      islands.forEach(isl => {
        // Naik-turun lembut (sin)
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

    // 6. Update Kecerahan Suasana (setCalm)
    currentCalm += (targetCalm - currentCalm) * 0.05;
    if (scene && scene.fog) {
      scene.fog.density = 0.0035 - currentCalm * 0.0015;
    }
    if (ambLight) {
      ambLight.intensity = 1.0 + currentCalm * 0.6;
    }

    // 7. Bintang Berkilau & Skydome Berputar Perlahan
    if (skyDome && !reduceMotion) {
      skyDome.rotation.y += 0.0003 * timeScale;
    }
    if (starsMesh && !reduceMotion) {
      starsMesh.rotation.y += 0.0005 * timeScale;
    }

    // 8. Interpolasi Kamera (Preset Mode + Parallax Mouse + Target LookAt)
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

    camera.position.set(
      currentCamPos.x + mouse.x,
      currentCamPos.y + mouse.y,
      currentCamPos.z
    );
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    renderer.render(scene, camera);
  }

  /**
   * Listener ukuran jendela (Window Resize).
   */
  function onWindowResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /**
   * Listener pergerakan mouse untuk efek parallax 3D.
   */
  function onMouseMove(e) {
    if (reduceMotion) return;
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    mouse.targetX = (e.clientX - halfW) / halfW;
    mouse.targetY = -(e.clientY - halfH) / halfH;
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

        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(CAMERA_PRESETS.menu.x, CAMERA_PRESETS.menu.y, CAMERA_PRESETS.menu.z);

        // 3. Pencahayaan Panggung
        ambLight = new THREE.AmbientLight(0x2B3456, 1.2);
        const hemiLight = new THREE.HemisphereLight(0x2B4C7E, 0x16163A, 0.85);
        scene.add(ambLight);
        scene.add(hemiLight);

        // Directional Light hangat untuk menonjolkan shading low poly pulau dan awan
        const dirLight = new THREE.DirectionalLight(0xE8A598, 0.7);
        dirLight.position.set(6, 14, 8);
        scene.add(dirLight);

        // 4. Langit Kubah Senja (Skydome)
        const skyGeo = new THREE.SphereGeometry(300, 32, 24);
        const skyMat = new THREE.MeshBasicMaterial({
          map: createSkyTexture(),
          side: THREE.BackSide,
          depthWrite: false
        });
        skyDome = new THREE.Mesh(skyGeo, skyMat);
        scene.add(skyDome);

        // 5. Taburan 600 Bintang
        buildStars();

        // 6. Orb Napas 3D Utama
        orbGroup = new THREE.Group();
        orbGroup.position.set(0, 0, 0);

        const orbGeo = new THREE.SphereGeometry(2.2, 64, 64);
        orbShaderMat = createOrbShader();
        orbMesh = new THREE.Mesh(orbGeo, orbShaderMat);
        orbGroup.add(orbMesh);

        // PointLight di dalam Orb
        orbLight = new THREE.PointLight(0x7FE0C3, 1.2, 22);
        orbGroup.add(orbLight);

        // Halo Cahaya Aditif Mengelilingi Orb
        const haloTex = createGlowTexture(false);
        haloMat = new THREE.SpriteMaterial({
          map: haloTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          color: 0x7FE0C3,
          opacity: 0.4
        });
        haloSprite = new THREE.Sprite(haloMat);
        haloSprite.scale.set(4.8, 4.8, 1);
        orbGroup.add(haloSprite);

        scene.add(orbGroup);

        // 7. Partikel Pengorbit
        buildOrbitingParticles();

        // 8. 8 Awan Low Poly (Fase 3D-2)
        buildClouds();

        // 9. Taman Lentera 3 Pulau Melayang (Fase 3D-2)
        buildLanternIslands();

        // 10. Event Listeners
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('mousemove', onMouseMove);

        active = true;
        animate();
        console.log('[Stage3D] Panggung 3D Three.js r128 berhasil diinisialisasi.');
        return true;
      } catch (err) {
        console.error('[Stage3D] Gagal menginisialisasi WebGL Three.js:', err);
        active = false;
        return false;
      }
    },

    /**
     * Mengatur sudut pandang kamera dan suasana berdasarkan scene aktif.
     * @param {string} mode - 'menu' | 'l1' | 'l2' | 'l3' | 'result'
     */
    setMode(mode) {
      if (!active) return;
      currentMode = mode;
      const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.menu;
      targetCamPos.x = preset.x;
      targetCamPos.y = preset.y;
      targetCamPos.z = preset.z;
      targetLookAt.x = preset.lookX !== undefined ? preset.lookX : 0;
      targetLookAt.y = preset.lookY !== undefined ? preset.lookY : 0;
      targetLookAt.z = preset.lookZ !== undefined ? preset.lookZ : 0;

      if (mode === 'menu') {
        targetBreathScale = 0.55;
        if (orbLight) orbLight.intensity = 0.7;
        if (haloMat) haloMat.opacity = 0.25;
        if (particlesMesh && particlesMesh.material) particlesMesh.material.opacity = 0.35;
      } else if (mode === 'l1') {
        targetBreathScale = 0.95;
        if (orbLight) orbLight.intensity = 1.4;
        if (haloMat) haloMat.opacity = 0.6;
        if (particlesMesh && particlesMesh.material) particlesMesh.material.opacity = 0.85;
      } else if (mode === 'l2') {
        // Level 2: Miring ke arah awan, orb lebih tenang
        targetBreathScale = 0.45;
        if (orbLight) orbLight.intensity = 0.5;
        if (haloMat) haloMat.opacity = 0.15;
        if (particlesMesh && particlesMesh.material) particlesMesh.material.opacity = 0.25;
      } else if (mode === 'l3') {
        // Level 3: Sudut rendah memperlihatkan taman dan lentera
        targetBreathScale = 0.45;
        if (orbLight) orbLight.intensity = 0.5;
        if (haloMat) haloMat.opacity = 0.15;
        if (particlesMesh && particlesMesh.material) particlesMesh.material.opacity = 0.25;
      } else if (mode === 'result') {
        // Result: Kamera mundur memperlihatkan seluruh taman lentera
        targetBreathScale = 0.7;
        if (orbLight) orbLight.intensity = 1.0;
        if (haloMat) haloMat.opacity = 0.4;
        if (particlesMesh && particlesMesh.material) particlesMesh.material.opacity = 0.6;
      }
    },

    /**
     * Mengatur ritme napas orb (skala membesar saat tarik napas, mengecil saat hembus).
     * @param {number} t - Nilai 0.0 (lepas/kempis) sampai 1.0 (penuh/mengembang)
     */
    setBreath(t) {
      if (!active) return;
      // Memetakan nilai 0..1 ke rentang skala 0.8 sampai 1.6
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
     * Memicu denyut dan semburan partikel saat peristiwa penting tercapai.
     * @param {number} intensity - 0.0 s.d. 1.0
     */
    pulse(intensity = 0.5) {
      if (!active) return;
      pulseEnergy = Math.min(1.0, pulseEnergy + intensity);
    },

    /**
     * Menyalakan n lentera taman terapung (Fase 3D-2).
     * @param {number} count - 0..3 lentera menyala
     */
    setLanterns(count) {
      if (!active) return;
      targetLanternCount = Math.max(0, Math.min(3, count));
      islands.forEach((isl, idx) => {
        const l = isl.lantern;
        if (idx < targetLanternCount) {
          l.targetEmissive = 2.0;
          l.targetLight = 1.6;
          l.targetHaloOpacity = 0.75;
        } else {
          l.targetEmissive = 0.05;
          l.targetLight = 0.0;
          l.targetHaloOpacity = 0.0;
        }
      });
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
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousemove', onMouseMove);
      clouds = [];
      islands = [];
      if (renderer && renderer.domElement && container) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    }
  };
})();

