// Escena 3D de la portada: un abanico de páginas web flotando sobre un mar que reacciona al cursor.
(function () {
  const NetM = (window.NetM = window.NetM || {});
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

  // Estado de la pieza 3D en cada sección (inicio, servicios, nosotros, filosofia, contacto).
  // En "nosotros" el texto ocupa los dos lados: las páginas se alejan y quedan tras un velo.
  // x es una fracción de la mitad del ancho visible; así se adapta a cualquier pantalla.
  // open separa las páginas del abanico como si se abriera una baraja.
  const SCENE_STATES = {
    wide: [
      { x: 0.6, y: 0.55, z: -0.6, s: 0.8, amp: 0.05, open: 1, dim: 1, veil: 0, sea: -1.3 },
      { x: 0.42, y: -0.1, z: -2.4, s: 1.15, amp: 0.09, open: 1.9, dim: 0.6, veil: 0, sea: 2.1 },
      { x: 0.1, y: 0.1, z: -3, s: 0.9, amp: 0.05, open: 1.2, dim: 0.45, veil: 0.75, sea: 2.4 },
      { x: -0.66, y: 0, z: 0, s: 0.84, amp: 0.035, open: 0.75, dim: 0.85, veil: 0, sea: 2.6 },
      { x: 0.54, y: 0, z: -1.2, s: 1, amp: 0.07, open: 1.4, dim: 0.8, veil: 0, sea: 3.4 }
    ],
    narrow: [
      { x: 0, y: 1.05, z: 0, s: 0.62, amp: 0.05, open: 1, dim: 0.85, veil: 0.12, sea: -1.1 },
      { x: 0, y: 0, z: -2.4, s: 1, amp: 0.09, open: 1.9, dim: 0.5, veil: 0.3, sea: 2.1 },
      { x: 0, y: 0.6, z: -3, s: 0.8, amp: 0.05, open: 1.2, dim: 0.45, veil: 0.8, sea: 2.4 },
      { x: 0.6, y: 0.9, z: -2.2, s: 0.8, amp: 0.035, open: 0.75, dim: 0.5, veil: 0.72, sea: 2.6 },
      { x: 0, y: 0.2, z: -2.4, s: 0.95, amp: 0.07, open: 1.4, dim: 0.5, veil: 0.72, sea: 3.4 }
    ]
  };
  const WIDE_SCENE_MIN_WIDTH = 1024;
  const WIDE_SCENE_MIN_ASPECT = 1.45;
  const SECTION_IDS = ['inicio', 'servicios', 'nosotros', 'filosofia', 'contacto'];
  // Zona del mar que se simula, en coordenadas de la superficie: el tramo cercano a la cámara.
  const SIM_ORIGIN = [-13, -21];
  const SIM_SIZE = [26, 20];
  const SIM_STEP = 1 / 60;
  const SIM_MAX_STEPS = 3;
  const SIM_IDLE_SECONDS = 8;
  const WAKE_RADIUS = 0.17;
  const WAKE_MAX_STRENGTH = 0.07;
  const WAKE_PER_UNIT = 0.26;
  const WAKE_SLOPE_GAIN = 2.4;
  const SPLASH_RADIUS = 0.42;
  const SPLASH_STRENGTH = 0.11;
  const SEA_TILT = 0.085;
  // Cuánto crece el oleaje cuando el mar pasa por encima de la cámara.
  const UNDER_WAVE_BOOST = 1.3;
  const SEA_ANGLE = -Math.PI / 2 + SEA_TILT;
  const SECTION_HOLD = 0.45;
  const CAMERA_Z = 6;
  const CAMERA_FOV = 35;
  const DIVE_DEPTH = 5.2;
  const SLOW_FRAME_MS = 34;
  const SLOW_FRAME_LIMIT = 90;
  const PAGE_SIZE = [2.3, 1.58];
  const PAGE_TEXTURE_SIZE = [1024, 704];
  // Desplazamiento de cada página respecto a la anterior: el abanico sube hacia la derecha y hacia el fondo.
  const PAGE_STEP = [0.42, 0.3, -0.55];
  // Gota sobre una página: segundos que dura, velocidad del frente, anillos por unidad y altura.
  const RIPPLE_LIFE = 3.2;
  const RIPPLE_SPEED = 0.9;
  const RIPPLE_FREQUENCY = 26;
  const RIPPLE_HEIGHT = 0.07;
  const IDLE_DROP_STRENGTH = 0.55;
  // Fracción de pantalla bajada a partir de la que se oculta el aviso "Pulsa".
  const HINT_MAX_SCROLL = 0.3;

  const prefersReducedMotion = () => NetM.prefersReducedMotion;

  function createEnvironment(THREE, renderer) {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0x0c2f4a, side: THREE.BackSide })
    ));
    const addPanel = (color, power, width, height, position) => {
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      panel.position.set(...position);
      panel.lookAt(0, 0, 0);
      envScene.add(panel);
    };
    addPanel(0xe6fbff, 9, 9, 2.2, [0, 11, 4]);
    addPanel(0x4fe3e0, 9, 2, 16, [-12, 1, 5]);
    addPanel(0x9a5cff, 12, 2.6, 13, [12, -2, 3]);
    addPanel(0x2a7dff, 7, 12, 1.6, [0, -11, 2]);
    addPanel(0xe6fbff, 2.5, 7, 1, [2, 3, 13]);
    addPanel(0x1f7f96, 1.3, 18, 18, [-7, -5, 13]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const texture = pmrem.fromScene(envScene, 0.025).texture;
    pmrem.dispose();
    return texture;
  }

  // ── Páginas ──────────────────────────────────────────────────────────────
  // Maquetas de web en coordenadas 0-1 de la página: [x, y, ancho, alto, tipo].
  const PAGE_LAYOUTS = [
    [[0.07, 0.2, 0.42, 0.075, 'title'], [0.07, 0.31, 0.32, 0.075, 'title'], [0.07, 0.44, 0.38, 0.025, 'text'], [0.07, 0.49, 0.3, 0.025, 'text'],
      [0.07, 0.58, 0.17, 0.065, 'button'], [0.55, 0.2, 0.38, 0.45, 'image'], [0.07, 0.75, 0.26, 0.17, 'card'], [0.37, 0.75, 0.26, 0.17, 'card'], [0.67, 0.75, 0.26, 0.17, 'card']],
    [[0.07, 0.2, 0.86, 0.3, 'image'], [0.07, 0.56, 0.5, 0.07, 'title'], [0.07, 0.67, 0.6, 0.025, 'text'], [0.07, 0.72, 0.45, 0.025, 'text'], [0.74, 0.58, 0.19, 0.07, 'button'], [0.07, 0.8, 0.86, 0.11, 'card']],
    [[0.07, 0.2, 0.27, 0.34, 'image'], [0.37, 0.2, 0.27, 0.34, 'image'], [0.67, 0.2, 0.27, 0.34, 'image'], [0.07, 0.6, 0.2, 0.04, 'title'], [0.37, 0.6, 0.2, 0.04, 'title'],
      [0.67, 0.6, 0.2, 0.04, 'title'], [0.07, 0.67, 0.14, 0.05, 'button'], [0.37, 0.67, 0.14, 0.05, 'button'], [0.67, 0.67, 0.14, 0.05, 'button'], [0.07, 0.8, 0.86, 0.11, 'card']],
    [[0.2, 0.22, 0.6, 0.09, 'title'], [0.28, 0.35, 0.44, 0.03, 'text'], [0.41, 0.43, 0.18, 0.07, 'button'], [0.07, 0.58, 0.41, 0.33, 'image'], [0.52, 0.58, 0.41, 0.15, 'card'], [0.52, 0.76, 0.41, 0.15, 'card']]
  ];
  const ACCENTS = ['#3b5bff', '#63e6d9', '#4f6bff', '#a97bff'];

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  // Dibuja la maqueta dos veces: en color (lo que se ve) y en luz (lo que brilla en la oscuridad).
  function drawPage(ctx, glow, layout, accent) {
    const [W, H] = PAGE_TEXTURE_SIZE;
    const radius = 34;
    const body = ctx.createLinearGradient(0, 0, W, H);
    body.addColorStop(0, '#16324f');
    body.addColorStop(1, '#0a1a31');
    roundRect(ctx, 0, 0, W, H, radius);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(200, 240, 245, 0.35)';
    ctx.stroke();
    roundRect(glow, 0, 0, W, H, radius);
    glow.fillStyle = '#000';
    glow.fill();

    // Barra del navegador: tres puntos y la dirección.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, 0, W, 78);
    ['#63e6d9', '#4fb8f0', '#a97bff'].forEach((color, index) => {
      [ctx, glow].forEach((target) => {
        target.fillStyle = color;
        target.beginPath();
        target.arc(46 + index * 34, 39, 10, 0, Math.PI * 2);
        target.fill();
      });
    });
    roundRect(ctx, 170, 22, W * 0.48, 34, 17);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    layout.forEach(([x, y, w, h, kind]) => {
      const box = [x * W, y * H, w * W, h * H];
      if (kind === 'image') {
        const fill = ctx.createLinearGradient(box[0], box[1], box[0] + box[2], box[1] + box[3]);
        fill.addColorStop(0, accent);
        fill.addColorStop(1, '#a97bff');
        roundRect(ctx, ...box, 18);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.globalAlpha = 1;
        roundRect(glow, ...box, 18);
        glow.globalAlpha = 0.18;
        glow.fillStyle = fill;
        glow.fill();
        glow.globalAlpha = 1;
      } else if (kind === 'button') {
        [ctx, glow].forEach((target) => {
          roundRect(target, ...box, box[3] / 2);
          target.fillStyle = accent;
          target.fill();
        });
      } else {
        roundRect(ctx, ...box, kind === 'card' ? 16 : box[3] / 2);
        ctx.fillStyle = kind === 'title' ? 'rgba(230, 244, 246, 0.85)' : kind === 'text' ? 'rgba(169, 188, 199, 0.55)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        if (kind === 'title') {
          roundRect(glow, ...box, box[3] / 2);
          glow.fillStyle = 'rgba(230, 244, 246, 0.16)';
          glow.fill();
        }
      }
    });
  }

  function createPageTextures(THREE, index) {
    const make = () => {
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = PAGE_TEXTURE_SIZE;
      return canvas;
    };
    const colorCanvas = make();
    const glowCanvas = make();
    drawPage(colorCanvas.getContext('2d'), glowCanvas.getContext('2d'), PAGE_LAYOUTS[index % PAGE_LAYOUTS.length], ACCENTS[index % ACCENTS.length]);
    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const emissiveMap = new THREE.CanvasTexture(glowCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    return { map, emissiveMap };
  }

  // Cada página se ondula como una hoja: desplaza los vértices en z y recalcula la normal por diferencias finitas.
  function createPage(THREE, envMap, isNarrow, uniforms, index) {
    const { map, emissiveMap } = createPageTextures(THREE, index);
    const material = new THREE.MeshStandardMaterial({
      map, emissiveMap, envMap,
      emissive: 0xffffff, emissiveIntensity: 1.25,
      metalness: 0.55, roughness: 0.24,
      alphaTest: 0.5, side: THREE.DoubleSide
    });
    const phase = { value: index * 1.7 };
    // Gota: x, y en coordenadas de la página, instante en que cae y fuerza.
    const drop = { value: new THREE.Vector4(0, 0, -100, 0) };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uAmp = uniforms.uAmp;
      shader.uniforms.uPhase = phase;
      shader.uniforms.uDrop = drop;
      shader.vertexShader = `
        uniform float uTime;
        uniform float uAmp;
        uniform float uPhase;
        uniform vec4 uDrop;
        varying float vRipple;
        float sheet(vec2 p) {
          float t = uTime + uPhase;
          return (sin(p.x * 1.5 + t * 0.7) * 0.6 + sin(p.y * 2.2 - t * 0.55) * 0.4 + sin((p.x + p.y) * 3.1 + t * 1.05) * 0.22) * uAmp * 2.4
            - p.x * p.x * 0.05;
        }
        // Anillos que se abren desde donde cae la gota y se apagan al alejarse, como en el agua.
        float ripple(vec2 p) {
          float age = uTime - uDrop.z;
          if (age < 0.0 || age > ${RIPPLE_LIFE.toFixed(1)}) return 0.0;
          float d = length(p - uDrop.xy);
          float behind = age * ${RIPPLE_SPEED.toFixed(2)} - d;
          if (behind < 0.0) return 0.0;
          float envelope = smoothstep(0.0, 0.05, behind) * exp(-behind * 2.6) * exp(-age * 1.1) / (1.0 + d * 2.5);
          return sin(behind * ${RIPPLE_FREQUENCY.toFixed(1)}) * envelope * uDrop.w * ${RIPPLE_HEIGHT.toFixed(3)};
        }
        float surface(vec2 p) { return sheet(p) + ripple(p); }
      ` + shader.vertexShader
        .replace('#include <beginnormal_vertex>', `
          float zHere = surface(position.xy);
          float dzdx = (surface(position.xy + vec2(0.01, 0.0)) - zHere) / 0.01;
          float dzdy = (surface(position.xy + vec2(0.0, 0.01)) - zHere) / 0.01;
          vec3 objectNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
          vRipple = abs(ripple(position.xy)) / ${RIPPLE_HEIGHT.toFixed(3)};
        `)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.xy, position.z + zHere);');
      shader.fragmentShader = 'varying float vRipple;\n' + shader.fragmentShader
        .replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(0.39, 0.9, 0.85) * min(vRipple * 1.6, 1.0);
        `);
    };
    const segments = isNarrow ? [48, 34] : [96, 66];
    const page = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_SIZE[0], PAGE_SIZE[1], segments[0], segments[1]), material);
    page.userData.index = index;
    page.userData.drop = drop.value;
    return page;
  }

  function createPages(THREE, envMap, isNarrow, uniforms) {
    const group = new THREE.Group();
    const count = 4;
    for (let i = 0; i < count; i += 1) {
      const page = createPage(THREE, envMap, isNarrow, uniforms, i);
      page.userData.slot = i - (count - 1) / 2;
      page.renderOrder = i;
      group.add(page);
    }
    return group;
  }

  // Coloca las páginas en abanico; con open mayor que 1 se separan más, como una baraja que se abre.
  function layoutPages(group, open, time) {
    group.children.forEach((page) => {
      const slot = page.userData.slot;
      page.position.set(slot * PAGE_STEP[0] * open, slot * PAGE_STEP[1] * open + Math.sin(time * 0.6 + slot) * 0.04, slot * PAGE_STEP[2] * open);
      page.rotation.set(0, slot * -0.07 * open, slot * 0.035 * open);
    });
  }

  function createDust(THREE, isNarrow, uniforms) {
    const count = isNarrow ? 700 : 1800;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, -5 + Math.random() * 7], i * 3);
      seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: `
        attribute vec3 aSeed;
        uniform float uTime, uScale, uDim, uStir, uEnergy, uUnder;
        uniform vec2 uPointer;
        varying float vAlpha;
        varying float vTint;
        void main() {
          vec3 p = position;
          p.y = mod(position.y + 4.5 + uTime * (0.03 + 0.08 * aSeed.y), 9.0) - 4.5;
          p.x += sin(uTime * 0.25 + aSeed.x * 40.0) * 0.28 + uStir * (aSeed.z - 0.5) * 0.6;
          vec2 away = p.xy - uPointer;
          float dist = length(away);
          float near = exp(-dist * dist * 0.38);
          vec2 outward = away / (dist + 0.001);
          p.xy += outward * near * (1.1 + uEnergy * 1.7) + vec2(-outward.y, outward.x) * near * (0.3 + uEnergy * 0.9);
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = (0.7 + 2.0 * aSeed.z * aSeed.z) * (1.0 + near * 0.9) * uScale / -view.z;
          vTint = aSeed.x;
          vAlpha = min((0.2 + 0.7 * aSeed.y) * (1.0 + near * 1.6), 1.0) * (1.0 - smoothstep(3.2, 4.5, abs(p.y))) * uDim * (1.0 - uUnder * 0.8);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vTint;
        void main() {
          float glow = 1.0 - smoothstep(0.05, 0.5, length(gl_PointCoord - 0.5));
          vec3 color = vTint < 0.75 ? vec3(0.39, 0.9, 0.85) : vec3(0.66, 0.48, 1.0);
          gl_FragColor = vec4(color, glow * vAlpha);
        }
      `
    });
    return new THREE.Points(geometry, material);
  }

  // Ecuación de ondas en la tarjeta gráfica: cada punto del agua tira de sus vecinos, de modo que
  // las ondas se propagan, se cruzan y se apagan solas. El cursor empuja el agua a lo largo de su recorrido.
  function createWaterSim(THREE, renderer, isNarrow) {
    const canRenderToFloat = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    if (!canRenderToFloat) return null;
    const width = isNarrow ? 256 : 512;
    const height = Math.round(width * SIM_SIZE[1] / SIM_SIZE[0]);
    const targetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false
    };
    let current = new THREE.WebGLRenderTarget(width, height, targetOptions);
    let next = new THREE.WebGLRenderTarget(width, height, targetOptions);
    const uniforms = {
      uState: { value: null },
      uTexel: { value: new THREE.Vector2(1 / width, 1 / height) },
      uSize: { value: new THREE.Vector2(SIM_SIZE[0], SIM_SIZE[1]) },
      uDropA: { value: new THREE.Vector2() },
      uDropB: { value: new THREE.Vector2() },
      uRadius: { value: 1 },
      uStrength: { value: 0 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uState;
        uniform vec2 uTexel, uSize, uDropA, uDropB;
        uniform float uRadius, uStrength;
        varying vec2 vUv;
        void main() {
          vec4 state = texture2D(uState, vUv);
          float neighbours = 0.25 * (
            texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r + texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r +
            texture2D(uState, vUv + vec2(0.0, uTexel.y)).r + texture2D(uState, vUv - vec2(0.0, uTexel.y)).r
          );
          state.g += (neighbours - state.r) * 1.9;
          state.g *= 0.993;
          state.r = (state.r + state.g) * 0.9985;
          // Los bordes absorben las ondas para que no reboten en un límite invisible.
          vec2 edge = min(vUv, 1.0 - vUv);
          float absorb = mix(0.9, 1.0, smoothstep(0.0, 0.07, min(edge.x, edge.y)));
          state.rg *= absorb;
          if (uStrength > 0.0) {
            vec2 p = vUv * uSize;
            vec2 segment = uDropB - uDropA;
            float along = clamp(dot(p - uDropA, segment) / max(dot(segment, segment), 0.0001), 0.0, 1.0);
            float amount = max(1.0 - length(p - uDropA - segment * along) / uRadius, 0.0);
            state.r -= uStrength * (0.5 - 0.5 * cos(amount * 3.14159265));
          }
          gl_FragColor = state;
        }
      `
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    [current, next].forEach((target) => {
      renderer.setRenderTarget(target);
      renderer.clear();
    });
    renderer.setRenderTarget(null);

    const runStep = () => {
      uniforms.uState.value = current.texture;
      renderer.setRenderTarget(next);
      renderer.render(scene, camera);
      [current, next] = [next, current];
    };
    let accumulator = 0;
    let quietTime = SIM_IDLE_SECONDS;
    return {
      get texture() { return current.texture; },
      cell: new THREE.Vector2(SIM_SIZE[0] / width, SIM_SIZE[1] / height),
      setDrop(from, to, radius, strength) {
        uniforms.uDropA.value.copy(from);
        uniforms.uDropB.value.copy(to);
        uniforms.uRadius.value = radius;
        uniforms.uStrength.value = strength;
        quietTime = 0;
      },
      advance(dt) {
        quietTime += dt;
        if (quietTime > SIM_IDLE_SECONDS) return;
        accumulator += dt;
        let steps = Math.min(Math.floor(accumulator / SIM_STEP), SIM_MAX_STEPS);
        accumulator = Math.min(accumulator - steps * SIM_STEP, SIM_STEP);
        if (uniforms.uStrength.value > 0 && steps === 0) steps = 1;
        for (let i = 0; i < steps; i += 1) {
          runStep();
          uniforms.uStrength.value = 0;
        }
        renderer.setRenderTarget(null);
      }
    };
  }

  // Oleaje de fondo compartido por los dos shaders: las olas largas avanzan más despacio, como en mar abierto.
  const SEA_WAVES_GLSL = `
    uniform float uTime, uWaveGain;
    void addWave(inout vec3 sum, vec2 p, vec2 direction, float frequency, float amplitude, float speed) {
      float phase = dot(p, direction) * frequency + uTime * speed;
      sum.x += amplitude * uWaveGain * sin(phase);
      sum.yz += amplitude * uWaveGain * frequency * cos(phase) * direction;
    }
    vec2 warp(vec2 p) {
      return p + 0.6 * vec2(sin(p.y * 0.21 + uTime * 0.07), sin(p.x * 0.17 - uTime * 0.06));
    }
    vec3 swell(vec2 p) {
      vec3 sum = vec3(0.0);
      addWave(sum, p, vec2(0.38, 0.925), 0.55, 0.12, 0.33);
      addWave(sum, p, vec2(-0.62, 0.785), 0.85, 0.07, 0.42);
      addWave(sum, p, vec2(0.83, 0.558), 1.4, 0.035, 0.53);
      return sum;
    }
  `;

  // Mar en 3D: la forma se calcula por vértice; la luz, por píxel y con las ondas de la simulación.
  function createSea(THREE, isNarrow, uniforms) {
    const segments = isNarrow ? 90 : 190;
    const geometry = new THREE.PlaneGeometry(64, 46, segments, segments);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      uniforms,
      vertexShader: SEA_WAVES_GLSL + `
        varying vec3 vWorld;
        varying vec2 vSeaPosition;
        void main() {
          vec2 p = position.xy;
          vSeaPosition = p;
          vec4 world = modelMatrix * vec4(p, swell(warp(p)).x, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: SEA_WAVES_GLSL + `
        const float UNDER_REFLECTION = 0.38;
        uniform float uDim, uFade, uSimGain;
        uniform vec2 uTilt, uSimOrigin, uSimSize, uSimCell;
        uniform sampler2D uSim;
        varying vec3 vWorld;
        varying vec2 vSeaPosition;
        vec2 simSlope() {
          vec2 uv = (vSeaPosition - uSimOrigin) / uSimSize;
          vec2 texel = uSimCell / uSimSize;
          vec2 slope = vec2(
            texture2D(uSim, uv + vec2(texel.x, 0.0)).r - texture2D(uSim, uv - vec2(texel.x, 0.0)).r,
            texture2D(uSim, uv + vec2(0.0, texel.y)).r - texture2D(uSim, uv - vec2(0.0, texel.y)).r
          ) / (2.0 * uSimCell);
          vec2 edge = min(uv, 1.0 - uv);
          return slope * smoothstep(0.0, 0.05, min(edge.x, edge.y)) * uSimGain;
        }
        void main() {
          vec3 toCamera = cameraPosition - vWorld;
          float dist = length(toCamera);
          vec3 V = toCamera / dist;
          vec2 q = warp(vSeaPosition);
          vec3 big = swell(q);
          // Rizado fino del agua; a lo lejos se difumina para que no parpadee.
          vec3 fine = vec3(0.0);
          addWave(fine, q, vec2(-0.25, 0.968), 2.6, 0.02, 0.73);
          addWave(fine, q, vec2(0.95, -0.312), 4.1, 0.012, 0.91);
          addWave(fine, q, vec2(0.5, 0.866), 6.7, 0.007, 1.16);
          addWave(fine, q, vec2(-0.8, 0.6), 10.3, 0.0034, 1.44);
          addWave(fine, q, vec2(0.28, -0.96), 15.7, 0.0017, 1.78);
          vec2 wake = simSlope();
          vec2 slope = big.yz + fine.yz / (1.0 + dist * 0.09) + wake / (1.0 + dist * 0.03);
          vec3 localNormal = normalize(vec3(-slope, 1.0));
          vec3 waterNormal = vec3(localNormal.x, uTilt.x * localNormal.y - uTilt.y * localNormal.z, uTilt.y * localNormal.y + uTilt.x * localNormal.z);
          vec3 planeNormal = vec3(0.0, -uTilt.y, uTilt.x);
          bool isAbove = dot(planeNormal, V) > 0.0;
          // Desde abajo se refleja la mirada en el plano del agua: las ondas se ven igual que el mar del principio.
          if (!isAbove) V = reflect(V, planeNormal);
          vec3 N = waterNormal;
          float facing = max(dot(N, V), 0.0);
          // Casi todo lo que se ve es el cielo reflejado, como en el agua real.
          float fresnel = 0.025 + 0.975 * pow(1.0 - facing, 5.0);
          vec3 R = reflect(-V, N);
          vec3 sky = mix(vec3(0.2, 0.46, 0.6), vec3(0.02, 0.07, 0.15), smoothstep(0.0, 0.42, R.y));
          vec3 moon = normalize(vec3(-0.34, 0.26, -1.0));
          float moonAlign = max(dot(R, moon), 0.0);
          sky += vec3(0.55, 0.8, 0.9) * pow(moonAlign, 70.0) * 0.3 + vec3(0.9, 0.98, 1.0) * pow(moonAlign, 900.0) * 7.0;
          vec3 body = vec3(0.006, 0.035, 0.07) + vec3(0.01, 0.07, 0.085) * smoothstep(-0.15, 0.25, big.x);
          // Las ondas inclinan la superficie y atrapan el reflejo del cielo.
          // Desde abajo la mirada llega muy rasante; se rebaja el reflejo para conservar el azul marino del mar.
          float reflection = (fresnel + length(wake) * 2.2) * (isAbove ? 1.0 : UNDER_REFLECTION);
          vec3 color = mix(body, sky, min(reflection, 1.0));
          gl_FragColor = vec4(color * uDim, 0.96 * (1.0 - smoothstep(9.0, 34.0, dist)) * uFade);
        }
      `
    });
    const sea = new THREE.Mesh(geometry, material);
    sea.rotation.x = SEA_ANGLE;
    sea.position.z = -14;
    sea.frustumCulled = false;
    return sea;
  }

  // La pieza solo cabe junto al texto en pantallas panorámicas; en el resto va detrás, con velo.
  function pickSceneStates() {
    const isWide = innerWidth >= WIDE_SCENE_MIN_WIDTH && innerWidth / innerHeight >= WIDE_SCENE_MIN_ASPECT;
    return isWide ? SCENE_STATES.wide : SCENE_STATES.narrow;
  }

  function smoothstep01(t) { return t * t * (3 - 2 * t); }

  function sampleStates(states, anchors, scrollPosition) {
    if (scrollPosition <= anchors[0]) return states[0];
    for (let i = 0; i < anchors.length - 1; i += 1) {
      if (scrollPosition <= anchors[i + 1]) {
        const span = Math.max(anchors[i + 1] - anchors[i], 1);
        const progress = (scrollPosition - anchors[i]) / span;
        const t = smoothstep01(Math.max((progress - SECTION_HOLD) / (1 - SECTION_HOLD), 0));
        const from = states[i];
        const to = states[i + 1];
        return Object.fromEntries(Object.keys(from).map((key) => [key, from[key] + (to[key] - from[key]) * t]));
      }
    }
    return states[states.length - 1];
  }

  function computeAnchors() {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    return SECTION_IDS.map((id, index) => {
      if (index === 0) return 0;
      const top = document.getElementById(id).getBoundingClientRect().top + scrollY;
      return Math.min(top - innerHeight * 0.4, maxScroll);
    });
  }

  async function initScene() {
    const canvas = NetM.$('#scene');
    const veil = NetM.$('#scene-veil');
    let THREE;
    let renderer;
    try {
      THREE = await import(THREE_URL);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('Escena 3D no disponible; se usa el fondo estático.', error);
      return;
    }

    const isNarrowAtStart = innerWidth < 768;
    let pixelRatio = Math.min(devicePixelRatio, isNarrowAtStart ? 1.5 : 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 40);
    camera.position.z = CAMERA_Z;

    const pageUniforms = { uTime: { value: 0 }, uAmp: { value: 0.05 } };
    const sharedUniforms = {
      uTime: pageUniforms.uTime,
      uScale: { value: 12 * pixelRatio },
      uDim: { value: 1 },
      uStir: { value: 0 },
      uEnergy: { value: 0 },
      uUnder: { value: 0 },
      uPointer: { value: new THREE.Vector2(100, 100) }
    };
    const waterSim = prefersReducedMotion() ? null : createWaterSim(THREE, renderer, isNarrowAtStart);
    const seaUniforms = {
      uTime: pageUniforms.uTime,
      uDim: sharedUniforms.uDim,
      uFade: { value: 1 },
      uWaveGain: { value: 1 },
      uTilt: { value: new THREE.Vector2(Math.cos(SEA_ANGLE), Math.sin(SEA_ANGLE)) },
      uSim: { value: null },
      uSimGain: { value: waterSim ? WAKE_SLOPE_GAIN : 0 },
      uSimOrigin: { value: new THREE.Vector2(SIM_ORIGIN[0], SIM_ORIGIN[1]) },
      uSimSize: { value: new THREE.Vector2(SIM_SIZE[0], SIM_SIZE[1]) },
      uSimCell: { value: waterSim ? waterSim.cell : new THREE.Vector2(1, 1) }
    };
    const pages = createPages(THREE, createEnvironment(THREE, renderer), isNarrowAtStart, pageUniforms);
    const dust = createDust(THREE, isNarrowAtStart, sharedUniforms);
    const sea = createSea(THREE, isNarrowAtStart, seaUniforms);
    const lamp = new THREE.PointLight(0x8fe8ff, 24, 12, 2);
    dust.renderOrder = 10;
    scene.add(sea, pages, dust, lamp);
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const seaPlane = new THREE.Plane();
    const seaNormal = new THREE.Vector3();
    const seaHit = new THREE.Vector3();
    const wakeFrom = new THREE.Vector2();
    const wakeTo = new THREE.Vector2();
    let hasWakeStart = false;
    let isSplashPending = false;
    let hasPointer = false;
    let pointerEnergy = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let dive = 0;
    let diveTarget = 0;

    let anchors = computeAnchors();
    let states = pickSceneStates();
    let halfWidth = 1;
    let halfHeight = 1;
    const current = { ...states[0] };
    const pointer = { x: 0.3, y: 0.2 };
    const easedPointer = { x: 0.3, y: 0.2 };
    let lastScrollY = scrollY;
    let scrollEnergy = 0;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * CAMERA_Z;
      halfWidth = halfHeight * camera.aspect;
      states = pickSceneStates();
      anchors = computeAnchors();
    };

    // Lleva el cursor a la superficie y empuja el agua a lo largo del recorrido de este fotograma.
    const pushWater = () => {
      if (!waterSim || !hasPointer) return;
      sea.updateMatrixWorld();
      seaNormal.set(0, 0, 1).transformDirection(sea.matrixWorld);
      seaPlane.setFromNormalAndCoplanarPoint(seaNormal, sea.position);
      raycaster.setFromCamera(pointerNdc.set(pointer.x, pointer.y), camera);
      const hit = raycaster.ray.intersectPlane(seaPlane, seaHit);
      if (!hit) {
        hasWakeStart = false;
        return;
      }
      sea.worldToLocal(hit);
      wakeTo.set(hit.x - SIM_ORIGIN[0], hit.y - SIM_ORIGIN[1]);
      const isInside = wakeTo.x > 0 && wakeTo.y > 0 && wakeTo.x < SIM_SIZE[0] && wakeTo.y < SIM_SIZE[1];
      if (!isInside) {
        hasWakeStart = false;
        return;
      }
      if (isSplashPending) {
        waterSim.setDrop(wakeTo, wakeTo, SPLASH_RADIUS, SPLASH_STRENGTH);
      } else if (hasWakeStart) {
        const travel = wakeFrom.distanceTo(wakeTo);
        if (travel > 0.002) waterSim.setDrop(wakeFrom, wakeTo, WAKE_RADIUS, Math.min(travel * WAKE_PER_UNIT, WAKE_MAX_STRENGTH));
      }
      isSplashPending = false;
      hasWakeStart = true;
      wakeFrom.copy(wakeTo);
    };

    // El aviso "Pulsa" sigue al centro de la página delantera y solo se ve en la portada.
    const hint = NetM.$('#pages-hint');
    const hintPoint = new THREE.Vector3();
    const placeHint = () => {
      if (!hint) return;
      pages.children[0].getWorldPosition(hintPoint).project(camera);
      const x = (hintPoint.x + 1) / 2 * canvas.clientWidth;
      const y = (1 - hintPoint.y) / 2 * canvas.clientHeight;
      hint.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      hint.classList.toggle('is-away', scrollY > innerHeight * HINT_MAX_SCROLL || dive > 0.01);
    };

    let sceneTime = 0;
    const dropOnPage = (page, uv, strength) => {
      page.userData.drop.set((uv.x - 0.5) * PAGE_SIZE[0], (uv.y - 0.5) * PAGE_SIZE[1], sceneTime, strength);
    };

    const applyFrame = (dt, time) => {
      sceneTime = time;
      const target = sampleStates(states, anchors, scrollY);
      const follow = prefersReducedMotion() ? 1 : 1 - Math.exp(-dt * 3.5);
      Object.keys(current).forEach((key) => { current[key] += (target[key] - current[key]) * follow; });
      const pointerFollow = 1 - Math.exp(-dt * 4);
      easedPointer.x += (pointer.x - easedPointer.x) * pointerFollow;
      easedPointer.y += (pointer.y - easedPointer.y) * pointerFollow;
      dive += (diveTarget - dive) * (1 - Math.exp(-dt * 2.6));

      const scrollDelta = Math.abs(scrollY - lastScrollY);
      lastScrollY = scrollY;
      scrollEnergy += (Math.min(scrollDelta * 0.0016, 0.09) - scrollEnergy) * (1 - Math.exp(-dt * 5));

      const pointerTravel = hasPointer ? Math.hypot(pointer.x - lastPointerX, pointer.y - lastPointerY) : 0;
      lastPointerX = pointer.x;
      lastPointerY = pointer.y;
      pointerEnergy += (Math.min(pointerTravel / Math.max(dt, 0.001) * 0.22, 1) - pointerEnergy) * (1 - Math.exp(-dt * 2.5));

      const scrollTurn = scrollY * 0.0011;
      const settle = 1 - dive;
      pages.position.set((current.x * halfWidth + easedPointer.x * 0.22) * settle, (current.y + easedPointer.y * 0.16) * settle, current.z);
      pages.scale.setScalar(current.s);
      // Las páginas miran casi siempre de frente: giran con el cursor, pero nunca enseñan la espalda.
      pages.rotation.set(
        -0.08 + easedPointer.y * -0.32 + Math.sin(time * 0.3) * 0.04,
        (-0.38 + easedPointer.x * 0.5 + Math.sin(time * 0.21) * 0.08 + Math.sin(scrollTurn) * 0.3) * settle,
        0.04 * Math.sin(time * 0.17)
      );
      layoutPages(pages, current.open + scrollEnergy * 4 + dive * 1.5, time);
      pages.children.forEach((page) => { page.material.envMapIntensity = 1.2 * current.dim; });
      camera.position.z = CAMERA_Z - dive * DIVE_DEPTH;
      veil.style.opacity = current.veil.toFixed(3);
      pageUniforms.uTime.value = time;
      pageUniforms.uAmp.value = current.amp + scrollEnergy;

      const pointerX = easedPointer.x * halfWidth;
      const pointerY = easedPointer.y * halfHeight;
      lamp.position.set(pointerX, pointerY, 2.8);
      lamp.intensity = 24 * current.dim * (1 + pointerEnergy * 1.6);
      sea.position.y = current.sea;
      // El mar solo se ve al principio, por debajo de la cámara: al bajar se apaga mientras sube hacia ella
      // y ya no vuelve a aparecer por encima; reaparece solo si se vuelve a subir hasta el inicio.
      seaUniforms.uFade.value = current.sea < 0 ? THREE.MathUtils.smoothstep(-current.sea, 0.15, 0.7) : 0;
      sea.visible = seaUniforms.uFade.value > 0.002;
      sharedUniforms.uUnder.value = THREE.MathUtils.smoothstep(current.sea, 0.1, 1.2);
      sharedUniforms.uEnergy.value = pointerEnergy;
      seaUniforms.uWaveGain.value = 1 + sharedUniforms.uUnder.value * UNDER_WAVE_BOOST;
      if (waterSim) seaUniforms.uSimGain.value = WAKE_SLOPE_GAIN * (1 - sharedUniforms.uUnder.value * 0.55);
      pushWater();
      if (waterSim) {
        waterSim.advance(dt);
        seaUniforms.uSim.value = waterSim.texture;
      }
      dust.rotation.y = scrollTurn * 0.15;
      sharedUniforms.uDim.value = 0.45 + 0.55 * current.dim;
      sharedUniforms.uStir.value = scrollEnergy * 12 + dive * 3;
      sharedUniforms.uPointer.value.set(pointerX, pointerY);
      renderer.render(scene, camera);
      placeHint();
    };

    addEventListener('pointerdown', () => { isSplashPending = true; }, { passive: true });
    addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', () => canvas.classList.remove('is-ready'));
    canvas.addEventListener('webglcontextrestored', () => canvas.classList.add('is-ready'));
    if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', () => { anchors = computeAnchors(); });
    if (document.fonts) document.fonts.ready.then(() => { anchors = computeAnchors(); });
    resize();

    // La cámara se lanza hacia las páginas mientras la tarjeta pulsada llena la pantalla.
    NetM.sceneDive = (isDiving) => { diveTarget = isDiving ? 1 : 0; };
    // Para el selector AdSense: qué página 3D hay en ese punto de la pantalla y gotas sobre ellas.
    const pageHitAt = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointerNdc, camera);
      return raycaster.intersectObjects(pages.children, false)[0] || null;
    };
    NetM.scenePagesAt = (clientX, clientY) => Boolean(pageHitAt(clientX, clientY));
    NetM.sceneDropAt = (clientX, clientY, strength = 1) => {
      const hit = pageHitAt(clientX, clientY);
      if (hit && !prefersReducedMotion()) dropOnPage(hit.object, hit.uv, strength);
      return Boolean(hit);
    };
    NetM.sceneDropRandom = (strength = IDLE_DROP_STRENGTH) => {
      if (prefersReducedMotion()) return;
      const uv = new THREE.Vector2(0.25 + Math.random() * 0.5, 0.3 + Math.random() * 0.45);
      dropOnPage(pages.children[0], uv, strength);
    };

    if (prefersReducedMotion()) {
      // Sin movimiento autónomo: la pieza solo se recoloca al hacer scroll.
      const renderStill = () => requestAnimationFrame(() => applyFrame(1, 0));
      addEventListener('scroll', renderStill, { passive: true });
      addEventListener('resize', renderStill);
      applyFrame(1, 0);
    } else {
      addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / innerWidth) * 2 - 1;
        pointer.y = -((event.clientY / innerHeight) * 2 - 1);
        if (!hasPointer) {
          hasPointer = true;
          lastPointerX = pointer.x;
          lastPointerY = pointer.y;
        }
      }, { passive: true });

      let previous = performance.now();
      let slowFrames = 0;
      const loop = (now) => {
        const elapsedMs = now - previous;
        previous = now;
        applyFrame(Math.min(Math.max(elapsedMs, 1) / 1000, 0.05), now / 1000);
        slowFrames = elapsedMs > SLOW_FRAME_MS && elapsedMs < 500 ? slowFrames + 1 : Math.max(slowFrames - 1, 0);
        if (slowFrames > SLOW_FRAME_LIMIT && pixelRatio > 1) {
          // Equipo justo: baja resolución antes que perder fluidez.
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          sharedUniforms.uScale.value = 12;
          resize();
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    canvas.classList.add('is-ready');
    const note = NetM.$('#scene-note');
    if (note) note.classList.remove('hidden');
  }

  NetM.initScene = initScene;
})();
