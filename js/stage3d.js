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

  // Kamera & Parallax
  const CAMERA_PRESETS = {
    menu:   { x: 0, y: 0.2, z: 16.0, fov: 50 },
    l1:     { x: 0, y: 0.0, z: 11.2, fov: 48 },
    l2:     { x: 1.2, y: 0.8, z: 14.5, fov: 50 },
    l3:     { x: 0, y: 0.3, z: 15.0, fov: 50 },
    result: { x: 0, y: 1.5, z: 18.0, fov: 52 }
  };
  let currentCamPos = { x: 0, y: 0.2, z: 16.0 };
  let targetCamPos = { x: 0, y: 0.2, z: 16.0 };
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
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (isStar) {
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.3, 'rgba(230, 245, 255, 0.7)');
      grad.addColorStop(0.7, 'rgba(180, 210, 255, 0.2)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(127, 224, 195, 0.65)');
      grad.addColorStop(0.65, 'rgba(43, 76, 126, 0.25)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

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
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.2);
          vec3 base = color * 0.85;
          vec3 finalColor = mix(base, fresnelColor, fresnel * 0.75);
          gl_FragColor = vec4(finalColor, 0.92);
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
      size: 2.2,
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
      size: 1.8,
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
      const haloScale = 7.5 * finalOrbScale;
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

    // 4. Bintang Berkilau & Skydome Berputar Perlahan
    if (skyDome && !reduceMotion) {
      skyDome.rotation.y += 0.0003 * timeScale;
    }
    if (starsMesh && !reduceMotion) {
      starsMesh.rotation.y += 0.0005 * timeScale;
    }

    // 5. Interpolasi Kamera (Preset Mode + Parallax Mouse)
    const parallaxTargetX = reduceMotion ? 0 : mouse.targetX * 0.3;
    const parallaxTargetY = reduceMotion ? 0 : mouse.targetY * 0.2;
    mouse.x += (parallaxTargetX - mouse.x) * 0.05;
    mouse.y += (parallaxTargetY - mouse.y) * 0.05;

    currentCamPos.x += (targetCamPos.x - currentCamPos.x) * 0.05;
    currentCamPos.y += (targetCamPos.y - currentCamPos.y) * 0.05;
    currentCamPos.z += (targetCamPos.z - currentCamPos.z) * 0.05;

    camera.position.set(
      currentCamPos.x + mouse.x,
      currentCamPos.y + mouse.y,
      currentCamPos.z
    );
    camera.lookAt(0, 0, 0);

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
        const ambLight = new THREE.AmbientLight(0x222244, 1.2);
        const hemiLight = new THREE.HemisphereLight(0x2B4C7E, 0x16163A, 0.8);
        scene.add(ambLight);
        scene.add(hemiLight);

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
        orbLight = new THREE.PointLight(0x7FE0C3, 2.0, 25);
        orbGroup.add(orbLight);

        // Halo Cahaya Aditif Mengelilingi Orb
        const haloTex = createGlowTexture(false);
        haloMat = new THREE.SpriteMaterial({
          map: haloTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          color: 0x7FE0C3
        });
        haloSprite = new THREE.Sprite(haloMat);
        haloSprite.scale.set(7.5, 7.5, 1);
        orbGroup.add(haloSprite);

        scene.add(orbGroup);

        // 7. Partikel Pengorbit
        buildOrbitingParticles();

        // 8. Event Listeners
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
     */
    setLanterns(count) {
      // Siap untuk integrasi Fase 3D-2
    },

    /**
     * Mengatur kecerahan suasana (0..1).
     */
    setCalm(v) {
      if (!active || !scene) return;
      const clamped = Math.max(0, Math.min(1, v));
      scene.fog.density = 0.0035 - clamped * 0.0015;
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
      if (renderer && renderer.domElement && container) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    }
  };
})();
