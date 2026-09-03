/**
 * scene.js
 * Owns the WebGL layer only. Takes scroll progress from main.js and moves
 * the camera through the systems graph defined in content.js. Never reads
 * the DOM for content — the canvas layer is decorative/narrative, the DOM
 * layer (index.html) is the complete, accessible source of the content.
 */
import * as THREE from './vendor/three.module.min.js';
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/postprocessing/OutputPass.js';
import { SECTIONS, NODES, EDGES, PULSE_ROUTES } from './content.js';

const KIND_COLOR = {
  core: 0xeceef2,
  infra: 0x4e8cff,
  ai: 0x63d9c9,
  integration: 0x8b93a1,
  learning: 0x4e8cff,
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class SystemsScene {
  constructor(canvas, { reducedMotion = false, lowPower = false } = {}) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.lowPower = lowPower;
    this.progress = { index: 0, local: 0 };
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.clock = new THREE.Clock();
    this.disposed = false;

    this._buildRenderer();
    this._buildScene();
    this._buildComposer();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _buildRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    const pr = this.lowPower ? Math.min(1.3, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x0a0c10, 1);
    this.renderer = renderer;
  }

  _buildScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.028);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(...SECTIONS[0].cluster.pos);

    // ---- nodes -----------------------------------------------------------
    const nodeIndex = new Map();
    NODES.forEach((n, i) => nodeIndex.set(n.id, i));

    const nodeGroup = new THREE.Group();
    const geomByKind = new THREE.SphereGeometry(1, 12, 12);
    Object.keys(KIND_COLOR).forEach((kind) => {
      const nodesOfKind = NODES.filter((n) => n.kind === kind);
      if (!nodesOfKind.length) return;
      const mat = new THREE.MeshBasicMaterial({ color: KIND_COLOR[kind], transparent: true, opacity: 0.9 });
      const inst = new THREE.InstancedMesh(geomByKind, mat, nodesOfKind.length);
      const dummy = new THREE.Object3D();
      nodesOfKind.forEach((n, i) => {
        dummy.position.set(...n.pos);
        const s = (n.size || 0.8) * 0.11;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      nodeGroup.add(inst);
    });

    // node glow halos (sprites) for the core + cluster anchors, kept sparse for perf
    const haloTexture = this._makeHaloTexture();
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture, color: 0x4e8cff, transparent: true, opacity: 0.22,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    NODES.filter((n) => n.size >= 1.05).forEach((n) => {
      const sprite = new THREE.Sprite(haloMat.clone());
      sprite.position.set(...n.pos);
      const s = (n.size || 1) * 1.5;
      sprite.scale.set(s, s, 1);
      nodeGroup.add(sprite);
    });

    scene.add(nodeGroup);

    // ---- edges (static hairlines) -----------------------------------------
    const edgePositions = [];
    EDGES.forEach(([a, b]) => {
      const na = NODES[nodeIndex.get(a)];
      const nb = NODES[nodeIndex.get(b)];
      if (!na || !nb) return;
      edgePositions.push(...na.pos, ...nb.pos);
    });
    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2c3342, transparent: true, opacity: 0.5 });
    const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
    scene.add(edgeLines);

    // ---- animated pulses along named routes --------------------------------
    const routePaths = PULSE_ROUTES.map((route) => route.map((id) => {
      const n = NODES[nodeIndex.get(id)];
      return new THREE.Vector3(...n.pos);
    }));
    const pulseGeom = new THREE.SphereGeometry(1, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x4e8cff, transparent: true, opacity: 0.95 });
    const pulses = routePaths.map((path, i) => {
      const mesh = new THREE.Mesh(pulseGeom, pulseMat.clone());
      mesh.scale.setScalar(0.11);
      mesh.userData.path = path;
      mesh.userData.speed = 0.14 + (i % 3) * 0.04;
      mesh.userData.offset = i * 0.37;
      mesh.userData.color1 = new THREE.Color(0x4e8cff);
      mesh.userData.color2 = new THREE.Color(0x63d9c9);
      scene.add(mesh);
      return mesh;
    });

    // ---- ambient particulate (very sparse, restrained) ----------------------
    const particleCount = this.lowPower ? 90 : 220;
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 70;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.Float32BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x39404e, size: 0.06, transparent: true, opacity: 0.55, sizeAttenuation: true });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // ---- lighting (minimal, unlit materials mostly, this is just ambience) --
    scene.add(new THREE.AmbientLight(0x334155, 0.6));

    this.scene = scene;
    this.camera = camera;
    this.nodeGroup = nodeGroup;
    this.edgeLines = edgeLines;
    this.pulses = pulses;
    this.particles = particles;
    this._lookCurrent = new THREE.Vector3(...SECTIONS[0].cluster.look);
    this._posVec = new THREE.Vector3();
    this._lookVec = new THREE.Vector3();
  }

  _makeHaloTexture() {
    const size = 128;
    const cnv = document.createElement('canvas');
    cnv.width = size; cnv.height = size;
    const ctx = cnv.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cnv);
    return tex;
  }

  _buildComposer() {
    const renderer = this.renderer;
    const c = new EffectComposer(renderer);
    c.addPass(new RenderPass(this.scene, this.camera));
    if (!this.lowPower) {
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.42, // strength — restrained
        0.55, // radius
        0.78  // threshold — only bright signal elements bloom
      );
      c.addPass(bloom);
      this.bloom = bloom;
    }
    c.addPass(new OutputPass());
    c.setSize(window.innerWidth, window.innerHeight);
    this.composer = c;
  }

  setProgress(index, local) {
    this.progress.index = index;
    this.progress.local = local;
  }

  setPointer(nx, ny) {
    // nx, ny in [-1, 1]
    this.pointer.tx = nx;
    this.pointer.ty = ny;
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    if (this.bloom) this.bloom.setSize(w, h);
  }

  _updateCamera(dt, elapsed) {
    const i = Math.min(this.progress.index, SECTIONS.length - 2 >= 0 ? SECTIONS.length - 1 : 0);
    const a = SECTIONS[Math.min(i, SECTIONS.length - 1)].cluster;
    const bIndex = Math.min(i + 1, SECTIONS.length - 1);
    const b = SECTIONS[bIndex].cluster;
    const t = easeInOutCubic(this.progress.local);

    this._posVec.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t
    );
    this._lookVec.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t
    );
    const fov = a.fov + (b.fov - a.fov) * t;

    if (!this.reducedMotion) {
      // gentle idle bob
      this._posVec.x += Math.sin(elapsed * 0.18) * 0.18;
      this._posVec.y += Math.cos(elapsed * 0.15) * 0.12;

      // mouse parallax (already zeroed for coarse pointers by main.js)
      this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.04;
      this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.04;
      this._posVec.x += this.pointer.x * 0.6;
      this._posVec.y += -this.pointer.y * 0.4;
    }

    this.camera.position.copy(this._posVec);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this._lookVec);
  }

  _updatePulses(elapsed) {
    this.pulses.forEach((mesh) => {
      const path = mesh.userData.path;
      if (path.length < 2) return;
      const segCount = path.length - 1;
      const raw = (elapsed * mesh.userData.speed + mesh.userData.offset) % 1;
      const segF = raw * segCount;
      const seg = Math.min(Math.floor(segF), segCount - 1);
      const segT = segF - seg;
      mesh.position.lerpVectors(path[seg], path[seg + 1], segT);
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 6 + mesh.userData.offset * 10);
      mesh.material.opacity = this.reducedMotion ? 0.9 : 0.65 + 0.3 * pulse;
    });
  }

  start() {
    const loop = () => {
      if (this.disposed) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.getElapsedTime();
      this._updateCamera(dt, elapsed);
      if (!this.reducedMotion) {
        this._updatePulses(elapsed);
        this.nodeGroup.rotation.y = Math.sin(elapsed * 0.02) * 0.02;
        this.particles.rotation.y = elapsed * 0.004;
      }
      this.composer.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  dispose() {
    this.disposed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}
