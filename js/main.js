/**
 * main.js
 * Application shell. Renders repeatable DOM (nav, rail, stack groups,
 * project cards) from content.js, wires up scroll-driven state, and
 * (if available) boots the WebGL scene. The page is fully readable and
 * navigable with this script disabled from the point content is server-
 * rendered in index.html; this file adds the interactive/cinematic layer.
 *
 * Architecture:
 *  content.js  -> data only
 *  scene.js    -> WebGL only, takes {sectionIndex, localT} and pointer input
 *  main.js     -> DOM, scroll math, a11y, and gluing the two together
 */
import { SECTIONS, STACK_GROUPS, PROJECTS, COPY } from './content.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const isSmallViewport = window.matchMedia('(max-width: 640px)').matches;

/* ---------------------------------------------------------------------- */
/* 1. RENDER REPEATABLE CONTENT                                            */
/* ---------------------------------------------------------------------- */
function renderNav() {
  const primaryList = document.getElementById('primary-nav-list');
  const mobileList = document.getElementById('mobile-nav-list');
  const railList = document.getElementById('chapter-rail-list');

  SECTIONS.forEach((s) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.textContent = s.nav;
    a.dataset.navFor = s.id;
    li.appendChild(a);
    primaryList.appendChild(li);

    const mLi = document.createElement('li');
    const mA = document.createElement('a');
    mA.href = `#${s.id}`;
    mA.dataset.navFor = s.id;
    const coord = document.createElement('span');
    coord.className = 'coord';
    coord.textContent = `N.${s.number}`;
    mA.appendChild(coord);
    mA.appendChild(document.createTextNode(s.label));
    mLi.appendChild(mA);
    mobileList.appendChild(mLi);

    const rLi = document.createElement('li');
    rLi.dataset.railFor = s.id;
    rLi.title = s.label;
    railList.appendChild(rLi);
  });
}

function renderStackGroups() {
  const wrap = document.getElementById('stack-groups');
  STACK_GROUPS.forEach((group) => {
    const div = document.createElement('div');
    div.className = 'stack-group';
    const h3 = document.createElement('h3');
    h3.textContent = group.title;
    const ul = document.createElement('ul');
    group.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    div.appendChild(h3);
    div.appendChild(ul);
    wrap.appendChild(div);
  });
}

function renderProjects() {
  const wrap = document.getElementById('project-list');
  PROJECTS.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    if (idx === 0) card.classList.add('is-open');

    const bodyId = `project-body-${idx}`;
    card.innerHTML = `
      <div class="project-head" role="button" tabindex="0" aria-expanded="${idx === 0}" aria-controls="${bodyId}">
        <span class="project-number">${p.number}</span>
        <h3 class="project-title">${p.title}</h3>
        <span class="project-toggle" aria-hidden="true">+</span>
      </div>
      <div class="project-body" id="${bodyId}">
        <div>
          <dl class="project-grid">
            <div class="project-field span-2"><dt>Problem</dt><dd>${p.problem}</dd></div>
            <div class="project-field span-2"><dt>Solution</dt><dd>${p.solution}</dd></div>
            <div class="project-field span-2"><dt>Architecture</dt><dd>${p.architecture}</dd></div>
            <div class="project-field span-2"><dt>Technologies</dt><dd><div class="tech-tags">${p.technologies.map((t) => `<span>${t}</span>`).join('')}</div></dd></div>
            <div class="project-field span-2"><dt>Result</dt><dd>${p.result}</dd></div>
          </dl>
        </div>
      </div>
    `;
    const head = card.querySelector('.project-head');
    const toggle = () => {
      const open = card.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(open));
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    wrap.appendChild(card);
  });
}

function renderManifesto() {
  document.getElementById('manifesto').textContent = COPY.manifesto.join('\n');
}

/* ---------------------------------------------------------------------- */
/* 2. WORD-BY-WORD REVEAL                                                  */
/* ---------------------------------------------------------------------- */
function wrapWords(el) {
  // Preserve child element structure (e.g. <br>, <span class="display-tag">)
  // by walking child nodes and wrapping only text runs.
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const words = child.textContent.split(/(\s+)/).filter((w) => w.length);
        const frag = document.createDocumentFragment();
        words.forEach((w) => {
          if (/^\s+$/.test(w)) {
            frag.appendChild(document.createTextNode(w));
          } else {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            frag.appendChild(span);
          }
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
}

function initReveals() {
  const targets = document.querySelectorAll('[data-reveal-words]');
  targets.forEach((el) => {
    if (el.textContent.trim().length) wrapWords(el);
  });
  if (prefersReducedMotion) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });
  targets.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------------- */
/* 3. SCROLL-DRIVEN SECTION PROGRESS                                       */
/* ---------------------------------------------------------------------- */
class ScrollDirector {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.sections = SECTIONS.map((s) => document.getElementById(s.id));
    this.bounds = [];
    this.ticking = false;
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this.measure();
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);
  }

  measure() {
    this.bounds = this.sections.map((el) => el.offsetTop);
    this.docBottom = document.documentElement.scrollHeight - window.innerHeight;
  }

  _onResize() { this.measure(); this._update(); }

  _onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => { this._update(); this.ticking = false; });
  }

  _update() {
    const y = window.scrollY;
    let index = 0;
    for (let i = 0; i < this.bounds.length; i++) {
      if (y >= this.bounds[i]) index = i;
    }
    const nextIndex = Math.min(index + 1, this.bounds.length - 1);
    const start = this.bounds[index];
    const end = index === this.bounds.length - 1 ? this.docBottom + 1 : this.bounds[nextIndex];
    let local = end > start ? (y - start) / (end - start) : 0;
    local = Math.max(0, Math.min(1, local));
    this.onProgress(index, local, this.sections[index].id);
  }

  start() { this._update(); }
}

/* ---------------------------------------------------------------------- */
/* 4. NAV / RAIL ACTIVE STATE                                              */
/* ---------------------------------------------------------------------- */
function setActiveSection(id) {
  document.querySelectorAll('[data-nav-for]').forEach((a) => {
    a.toggleAttribute('aria-current', a.dataset.navFor === id);
    if (a.dataset.navFor === id) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-rail-for]').forEach((li) => {
    li.classList.toggle('is-active', li.dataset.railFor === id);
  });
}

function updateRailFill(index, local) {
  const total = SECTIONS.length - 1;
  const pct = total > 0 ? ((index + local) / total) * 100 : 0;
  document.getElementById('rail-fill').style.height = `${Math.min(100, Math.max(0, pct))}%`;
}

/* ---------------------------------------------------------------------- */
/* 5. MOBILE NAV                                                           */
/* ---------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('mobile-nav');
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
}

/* ---------------------------------------------------------------------- */
/* 6. CUSTOM CURSOR (fine pointer only)                                    */
/* ---------------------------------------------------------------------- */
function initCursor() {
  if (isCoarsePointer) return;
  document.body.classList.add('has-fine-cursor');
  const dot = document.getElementById('cursor-dot');
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  const hoverables = 'a, button, .project-head, li';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest(hoverables)) dot.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest(hoverables)) dot.classList.remove('is-hover');
  });
}

/* ---------------------------------------------------------------------- */
/* 7. BOOT                                                                  */
/* ---------------------------------------------------------------------- */
async function boot() {
  renderNav();
  renderStackGroups();
  renderProjects();
  renderManifesto();
  initReveals();
  initMobileNav();
  initCursor();

  const director = new ScrollDirector((index, local, id) => {
    setActiveSection(id);
    updateRailFill(index, local);
    if (window.__systemsScene) window.__systemsScene.setProgress(index, local);
  });
  director.start();

  // WebGL scene — optional enhancement, page is complete without it.
  const canvas = document.getElementById('scene');
  const fallback = document.getElementById('scene-fallback-grid');
  try {
    const { SystemsScene, supportsWebGL } = await import('./scene.js');
    if (!supportsWebGL()) throw new Error('no-webgl');
    const scene = new SystemsScene(canvas, {
      reducedMotion: prefersReducedMotion,
      lowPower: isCoarsePointer || isSmallViewport,
    });
    scene.start();
    window.__systemsScene = scene;
    director.start();

    if (!isCoarsePointer && !prefersReducedMotion) {
      window.addEventListener('pointermove', (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        scene.setPointer(nx, ny);
      });
    }
  } catch (err) {
    canvas.style.display = 'none';
    fallback.classList.add('is-active');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
