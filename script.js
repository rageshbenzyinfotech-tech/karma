/*!
 * Karma Design Lab — Interactive Scripts
 * WebGL Fluted Shader · Nav Morphing · Scramble Animation · Theme · Metrics
 */

/* ── UTILITIES ── */
const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ════════════════════════════════════════════════════════════
   1. WEBGL FLUTED GREEN SHADER (Exact kstoimenov.com Algorithm)
   ════════════════════════════════════════════════════════════ */
function initHeroShader() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl', { alpha: true });
  if (!gl) {
    canvas.style.display = 'none';
    return;
  }

  const vsSource = `
    attribute vec2 p;
    void main() {
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;
    uniform float uTime;
    uniform vec2 uRes;
    uniform vec2 uMouse;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec3 field(vec2 uv){
      float t = uTime * 0.3;
      vec2 m = (uMouse - 0.5);
      float yr = sin(uv.y * 2.3 - t * 0.6) + 0.6 * sin(uv.y * 1.1 + t * 0.35 + 1.7);
      float phase = t * 0.7 + m.x * 2.0;
      float w = sin(uv.x * 8.5 + yr * 1.4 + phase) * 0.6 
              + sin(uv.x * 4.5 - yr * 0.8 + phase * 0.55) * 0.45 
              + sin(uv.x * 15.0 + yr * 0.5 - phase * 0.3) * 0.2;
      float f = w * 0.5 + 0.5;
      f = pow(clamp(f, 0.0, 1.0), 2.0);
      vec2 asp = vec2(uRes.x / uRes.y, 1.0);
      float d = distance(uv * asp, uMouse * asp);
      f += smoothstep(0.5, 0.0, d) * 0.5;

      // Palette extracted from hreobg.avif (bronze, brass, champagne gold, warm amber)
      vec3 c0 = vec3(0.0, 0.0, 0.0);
      vec3 c1 = vec3(0.85, 0.58, 0.28);
      vec3 c2 = vec3(0.98, 0.86, 0.64);

      vec3 col = mix(c0, c1, smoothstep(0.20, 0.65, f));
      col = mix(col, c2, smoothstep(0.72, 1.05, f));

      vec3 A = vec3(0.72, 0.44, 0.18);
      vec3 B = vec3(0.95, 0.70, 0.36);
      vec3 C = vec3(0.50, 0.30, 0.12);

      col = mix(col, A, 0.25 * smoothstep(0.60, 0.10, f));
      col = mix(col, C, 0.10 * smoothstep(0.25, 0.75, f));
      col = mix(col, B, 0.15 * smoothstep(0.65, 1.0, f));
      return col;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      float rods = 32.0;
      float x = uv.x * rods;
      float id = floor(x);
      float lens = fract(x) - 0.5;
      float center = (id + 0.5) / rods;
      float mag = 1.6;
      float bend = lens - (lens * lens * lens) * 0.6;
      float sx = center + bend * (mag / rods);
      float disp = lens * (1.8 / rods);

      vec3 col = vec3(
        field(vec2(sx + disp, uv.y)).r,
        field(vec2(sx, uv.y)).g,
        field(vec2(sx - disp, uv.y)).b
      );

      col += pow(max(0.0, 1.0 - abs(lens) * 2.35), 8.0) * 0.15 * vec3(1.0, 0.88, 0.68);
      col *= 1.0 - smoothstep(0.38, 0.5, abs(lens)) * 0.25;
      col += (hash(gl_FragCoord.xy * 1.3) - 0.5) * 0.015;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const pLoc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  const uTimeLoc = gl.getUniformLocation(prog, "uTime");
  const uResLoc = gl.getUniformLocation(prog, "uRes");
  const uMouseLoc = gl.getUniformLocation(prog, "uMouse");

  let mouse = [0.72, 0.5];
  let targetMouse = [0.72, 0.5];
  const startTime = performance.now();

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    targetMouse[0] = (e.clientX - rect.left) / rect.width;
    targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  let curW = 0, curH = 0;
  function resize() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (w !== curW || Math.abs(h - curH) > 10) {
      curW = w;
      curH = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let rafId;
  function render(now) {
    rafId = requestAnimationFrame(render);
    mouse[0] += (targetMouse[0] - mouse[0]) * 0.06;
    mouse[1] += (targetMouse[1] - mouse[1]) * 0.06;

    const elapsed = (now - startTime) * 0.001;
    gl.uniform1f(uTimeLoc, elapsed);
    gl.uniform2f(uResLoc, canvas.width, canvas.height);
    gl.uniform2f(uMouseLoc, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Subtle physical parallax on architectural fluted glass background
    const bgImg = document.querySelector('.hero__bg-img');
    if (bgImg && !reducedMotion()) {
      const px = (mouse[0] - 0.5) * -16;
      const py = (mouse[1] - 0.5) * -12;
      bgImg.style.transform = `scale(1.05) translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
    }
  }
  rafId = requestAnimationFrame(render);
}

/* ════════════════════════════════════════════════════════════
   2. BOTTOM NAVIGATION MORPHING (Spread on Hero -> Pill on Scroll)
   ════════════════════════════════════════════════════════════ */
function initNavMorph() {
  const nav = qs('#scrollNav');
  if (!nav) return;

  const items = qsa('[data-morph]', nav);

  function updateSpreadOffsets() {
    const navWidth = nav.offsetWidth;
    const widths = items.map(el => el.offsetWidth);
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxWidth = Math.min(85.75 * rootPx, window.innerWidth - 3 * rootPx);
    const gap = (maxWidth - totalWidth) / (items.length - 1);
    let currentOffset = 0;

    items.forEach((item, index) => {
      const spreadCenter = currentOffset + widths[index] / 2 - maxWidth / 2;
      const packedCenter = item.offsetLeft + widths[index] / 2 - navWidth / 2;
      const dx = (spreadCenter - packedCenter).toFixed(2);
      item.style.setProperty('--dx', `${dx}px`);
      currentOffset += widths[index] + gap;
    });
  }

  let p = 0;
  let lastTime = 0;
  let animId = 0;

  function setProgress() {
    nav.style.setProperty('--p', p.toFixed(4));
  }

  function step(now) {
    const target = window.scrollY > 12 ? 1 : 0;
    const dt = Math.min(64, now - lastTime);
    lastTime = now;

    p += (target - p) * (1 - Math.exp(-dt / 204));
    if (Math.abs(target - p) < 0.001) {
      p = target;
      setProgress();
      animId = 0;
      return;
    }
    setProgress();
    animId = requestAnimationFrame(step);
  }

  function onScroll() {
    if (!animId) {
      lastTime = performance.now();
      animId = requestAnimationFrame(step);
    }
  }

  updateSpreadOffsets();
  setProgress();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateSpreadOffsets();
    onScroll();
  }, { passive: true });

  // Mobile menu interactions
  const mBarBtn = qs('#mBarBtn');
  const mOverlay = qs('#mOverlay');
  const mBar = qs('#mBar');
  let mOpen = false;

  mBarBtn?.addEventListener('click', () => {
    mOpen = !mOpen;
    mOverlay?.classList.toggle('is-open', mOpen);
    mBar?.classList.toggle('is-open', mOpen);
    mBarBtn?.setAttribute('aria-expanded', String(mOpen));
    document.body.style.overflow = mOpen ? 'hidden' : '';
  });

  qsa('.scroll-nav__m-item').forEach(link => {
    link.addEventListener('click', () => {
      mOpen = false;
      mOverlay?.classList.remove('is-open');
      mBar?.classList.remove('is-open');
      mBarBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Track active section
  const sections = qsa('section[id]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        items.forEach(it => {
          it.classList.toggle('is-active', it.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => io.observe(s));
}

/* ════════════════════════════════════════════════════════════
   3. THEME TOGGLE (Sun / Moon)
   ════════════════════════════════════════════════════════════ */
function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('kdl-theme') || 'dark';
  root.dataset.theme = saved;

  function toggle() {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('kdl-theme', next); } catch(e) {}
  }

  qs('#themeBtn')?.addEventListener('click', toggle);
  qs('#mThemeBtn')?.addEventListener('click', toggle);
}

/* ════════════════════════════════════════════════════════════
   4. HERO TYPOGRAPHY & SCRAMBLE REVEAL
   ════════════════════════════════════════════════════════════ */
function runHero() {
  if (reducedMotion()) return;

  const splitLines = qsa('[data-split]');
  const scrambleLine = qs('[data-scramble]');
  const ctaBtn = qs('[data-cta]');
  const taglines = qsa('[data-subsplit]');

  // Split lines into characters with mask
  splitLines.forEach((line, lineIdx) => {
    const text = line.textContent.trim();
    line.innerHTML = '';
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    span.style.overflow = 'hidden';

    [...text].forEach((char, charIdx) => {
      const cSpan = document.createElement('span');
      cSpan.textContent = char === ' ' ? '\u00A0' : char;
      cSpan.style.display = 'inline-block';
      cSpan.style.transform = 'translateY(115%)';
      cSpan.style.opacity = '0';
      cSpan.style.transition = `transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease`;
      cSpan.style.transitionDelay = `${0.25 + lineIdx * 0.28 + charIdx * 0.025}s`;
      span.appendChild(cSpan);
    });

    line.appendChild(span);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      qsa('[data-split] span span').forEach(c => {
        c.style.transform = 'translateY(0)';
        c.style.opacity = '1';
      });
    });
  });

  // Scramble "remarkable"
  if (scrambleLine) {
    const target = scrambleLine.textContent.trim();
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let iter = 0;
    scrambleLine.textContent = '';
    scrambleLine.style.opacity = '1';

    setTimeout(() => {
      const interval = setInterval(() => {
        scrambleLine.textContent = target.split('').map((letter, idx) => {
          if (idx < iter) return target[idx];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');

        if (iter >= target.length) {
          clearInterval(interval);
          scrambleLine.textContent = target;
        }
        iter += 1 / 2;
      }, 40);
    }, 850);
  }

  // CTA button pop
  if (ctaBtn) {
    ctaBtn.style.opacity = '0';
    ctaBtn.style.transform = 'translate(-50%) scale(0.85)';
    ctaBtn.style.transition = 'opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      ctaBtn.style.opacity = '1';
      ctaBtn.style.transform = 'translate(-50%) scale(1)';
    }, 1400);
  }

  // Subsplit taglines unblur
  taglines.forEach((tag, idx) => {
    tag.style.opacity = '0';
    tag.style.filter = 'blur(12px)';
    tag.style.transition = `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${1.5 + idx * 0.15}s, filter 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${1.5 + idx * 0.15}s`;
    requestAnimationFrame(() => {
      tag.style.opacity = '0.75';
      tag.style.filter = 'blur(0px)';
    });
  });
}

/* ════════════════════════════════════════════════════════════
   5. PRELOADER ([0%] → [100%] + Wipe)
   ════════════════════════════════════════════════════════════ */
function initPreloader() {
  const pre = qs('#preloader');
  const num = qs('#preNum');
  if (!pre) { runHero(); return; }

  if (reducedMotion()) {
    pre.style.display = 'none';
    runHero();
    return;
  }

  // Animate chars rise
  qsa('.preloader__char-rise').forEach((ch, i) => {
    setTimeout(() => {
      ch.style.transform = 'translateY(0)';
    }, 100 + i * 50);
  });

  const t0 = performance.now();
  const dur = 1400;

  function count(now) {
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    num.textContent = Math.round(ease * 100);

    if (p < 1) {
      requestAnimationFrame(count);
    } else {
      num.textContent = 100;
      setTimeout(exit, 200);
    }
  }
  requestAnimationFrame(count);

  function exit() {
    qsa('.pt-panel').forEach((p, i) => {
      p.style.transform = 'scaleY(1)';
      setTimeout(() => {
        p.style.transition = 'transform 0.75s cubic-bezier(0.76, 0, 0.24, 1)';
        p.style.transform = 'scaleY(0)';
      }, 50 + i * 50);
    });

    pre.style.opacity = '0';
    setTimeout(() => {
      pre.style.display = 'none';
      runHero();
    }, 700);
  }
}

/* ════════════════════════════════════════════════════════════
   6. CUSTOM CURSOR
   ════════════════════════════════════════════════════════════ */
function initCursor() {
  const cursor = qs('#cursor');
  if (!cursor || window.innerWidth < 768) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx, cy = my;

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  function tick() {
    cx += (mx - cx) * 0.15;
    cy += (my - cy) * 0.15;
    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  qsa('.works__media-inner').forEach(card => {
    card.addEventListener('mouseenter', () => document.body.classList.add('is-hovering-work'));
    card.addEventListener('mouseleave', () => document.body.classList.remove('is-hovering-work'));
  });
}

/* ════════════════════════════════════════════════════════════
   7. ABOUT SECTION WORD LIGHTING ON SCROLL
   ════════════════════════════════════════════════════════════ */
function initAboutScroll() {
  const words = qsa('.about__w');
  if (!words.length) return;

  function update() {
    const vh = window.innerHeight;
    words.forEach(w => {
      const rect = w.getBoundingClientRect();
      if (rect.top < vh * 0.78) {
        w.classList.add('is-lit');
      } else {
        w.classList.remove('is-lit');
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ════════════════════════════════════════════════════════════
   8. METRICS COUNT-UP & REVEAL
   ════════════════════════════════════════════════════════════ */
function initMetrics() {
  const metricsSection = qs('.metrics');
  if (!metricsSection) return;

  const countElements = qsa('[data-count]', metricsSection);
  let hasCounted = false;

  function startCount() {
    if (hasCounted) return;
    hasCounted = true;
    metricsSection.classList.add('is-in-view');
    countElements.forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const t0 = performance.now();
      const dur = 1400;

      function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      }
      requestAnimationFrame(tick);
    });
  }

  const ioMetrics = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      startCount();
      ioMetrics.disconnect();
    }
  }, { threshold: 0.1 });

  ioMetrics.observe(metricsSection);
}

/* ════════════════════════════════════════════════════════════
   9. PLAY REAL SHOWREEL
   ════════════════════════════════════════════════════════════ */
function initPlayReal() {
  const stage = qs('#realStage');
  const video = qs('#realVideo');
  const playBtn = qs('#realPlayBtn');
  const section = qs('.real');
  if (!stage || !video || !playBtn) return;

  function togglePlay() {
    if (video.paused) {
      video.play().catch(() => {});
      stage.classList.add('is-playing');
      stage.style.transform = 'scale(1)';
      stage.style.borderRadius = '0';
    } else {
      video.pause();
      stage.classList.remove('is-playing');
      stage.style.transform = 'scale(0.62)';
      stage.style.borderRadius = '2rem';
    }
  }

  playBtn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);

  window.addEventListener('scroll', () => {
    if (stage.classList.contains('is-playing')) return;
    const parent = section || stage.parentElement;
    const rect = parent.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return;
    const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    const s = 0.62 + Math.sin(p * Math.PI) * 0.33;
    stage.style.transform = `scale(${s.toFixed(3)})`;
  }, { passive: true });
}

/* ════════════════════════════════════════════════════════════
   10. WORKS CTA (Eye Blink, Toggle Knob & Click)
   ════════════════════════════════════════════════════════════ */
function initWorksCta() {
  const cta = qs('#cta');
  const eye = qs('#ctaEye');
  const toggle = qs('#ctaToggle');
  if (!cta) return;

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      cta.classList.add('is-in-view');

      // Eye blink
      setTimeout(() => {
        if (eye) {
          eye.style.transition = 'transform 0.13s cubic-bezier(0.4, 0, 1, 1)';
          eye.style.transform = 'scaleY(0.06)';
          setTimeout(() => {
            eye.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            eye.style.transform = 'scaleY(1)';
          }, 130);
        }
      }, 900);

      // Slide toggle knob
      setTimeout(() => {
        if (toggle) {
          toggle.classList.add('is-toggled');
        }
      }, 1250);

      io.disconnect();
    }
  }, { threshold: 0.3 });

  io.observe(cta);

  if (toggle) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('is-toggled');
    });
  }
}

/* ════════════════════════════════════════════════════════════
   11. TESTIMONIALS STACKED CARD DECK
   ════════════════════════════════════════════════════════════ */
function initTestimonials() {
  const section = qs('#testimonials');
  const cards = qsa('[data-tcard]');
  if (!section || !cards.length) return;

  const D = [
    { x: 0, y: 0 },
    { x: 32, y: 32 },
    { x: 64, y: 64 },
    { x: 32, y: 96 },
    { x: 0, y: 128 }
  ];

  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const scale = rootPx / 16;

  function update() {
    if (window.innerWidth <= 768) {
      cards.forEach(c => {
        c.style.transform = 'none';
      });
      return;
    }

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.7;
    const end = -vh * 0.3;
    const progress = clamp((start - rect.top) / (start - end), 0, 1);

    cards.forEach((card, idx) => {
      if (idx === 0) {
        card.style.transform = `translate3d(${D[0].x * scale}px, ${D[0].y * scale}px, 0)`;
        return;
      }

      const cardStart = (idx - 1) * 0.22;
      const cardEnd = cardStart + 0.30;
      const cp = clamp((progress - cardStart) / (cardEnd - cardStart), 0, 1);
      const easeCp = 1 - Math.pow(1 - cp, 3);

      const startY = D[idx].y + 600;
      const curY = startY + (D[idx].y - startY) * easeCp;
      const curX = D[idx].x * scale;

      card.style.transform = `translate3d(${curX}px, ${curY * scale}px, 0)`;
      card.style.zIndex = idx + 1;
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ════════════════════════════════════════════════════════════
   12. QUOTE PARALLAX DRIFT & GLYPHS
   ════════════════════════════════════════════════════════════ */
function initQuoteParallax() {
  const section = qs('#quote');
  if (!section) return;

  const driftEls = qsa('[data-drift]', section);
  const glyphs = qsa('[data-qglyph]', section);

  function update() {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return;

    const progress = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    const t = (progress - 0.5) * 2;

    const isMobile = window.innerWidth <= 768;
    driftEls.forEach(el => {
      const d = parseFloat(isMobile ? (el.dataset.mdrift || el.dataset.drift) : el.dataset.drift) || 0;
      const x = -d * t * 0.75;
      el.style.transform = `translateX(${x}px)`;
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  const animTypes = ['pop', 'twirl', 'spin', 'blink', 'twirl', 'pop', 'burst', 'spin', 'burst'];
  glyphs.forEach((g, i) => {
    const anim = animTypes[i % animTypes.length];
    g.addEventListener('mouseenter', () => {
      g.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      switch(anim) {
        case 'spin':
          g.style.transform += ' rotate(180deg)';
          break;
        case 'twirl':
          g.style.transform += ' scaleX(-1) rotate(15deg)';
          break;
        case 'pop':
          g.style.transform += ' scale(1.35)';
          break;
        case 'blink':
          g.style.transform += ' scaleY(0.1)';
          break;
        case 'burst':
          g.style.transform += ' scale(1.4) rotate(25deg)';
          break;
      }
      setTimeout(() => {
        g.style.transform = g.style.transform.replace(/ rotate\([^)]+\)| scale[XY]?\([^)]+\)/g, '');
      }, 550);
    });
  });
}

/* ════════════════════════════════════════════════════════════
   13. FOOTER IN-VIEW & BACK TO TOP
   ════════════════════════════════════════════════════════════ */
function initFooter() {
  const footer = qs('#contact');
  const backToTop = qs('#footerBackToTop');
  if (footer) {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        footer.classList.add('is-in-view');
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(footer);
  }

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ════════════════════════════════════════════════════════════
   14. CONTACT MODAL (Interactive Drawer & Validation)
   ════════════════════════════════════════════════════════════ */
function initContactModal() {
  const overlay = qs('#contactModalOverlay');
  const closeBtn = qs('#contactModalClose');
  const sentCloseBtn = qs('#contactModalSentClose');
  const formWrap = qs('#contactModalFormWrap');
  const sentWrap = qs('#contactModalSent');
  const form = qs('#contactModalForm');
  const chips = qsa('.contact-modal__chip');
  const msgInput = qs('#cf-message');
  const submitBtn = qs('#cf-submit');

  if (!overlay || !form) return;

  function openModal(e) {
    if (e) e.preventDefault();
    overlay.classList.add('contact-modal__open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    formWrap.style.display = 'block';
    sentWrap.style.display = 'none';
    const nameInput = qs('#cf-name');
    if (nameInput) setTimeout(() => nameInput.focus(), 150);
  }

  function closeModal() {
    overlay.classList.remove('contact-modal__open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Open triggers
  qsa('#footerWriteBtn, #footerContactBtn, .scroll-nav__talk, .scroll-nav__m-talk, .hero__cta, .partners__companyBtn, [data-open-contact], .page-module__VKYseq__reachOut').forEach(el => {
    el.addEventListener('click', openModal);
  });

  // Close triggers
  closeBtn?.addEventListener('click', closeModal);
  sentCloseBtn?.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('contact-modal__open')) {
      closeModal();
    }
  });

  // Chips multi-select toggle
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const isPressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', isPressed ? 'false' : 'true');
      const errChips = qs('#err-chips');
      if (errChips) errChips.style.display = 'none';
    });
  });

  // Auto-expand textarea
  if (msgInput) {
    msgInput.addEventListener('input', () => {
      msgInput.style.height = 'auto';
      msgInput.style.height = `${msgInput.scrollHeight}px`;
    });
  }

  // Form validation & submission
  form.addEventListener('submit', e => {
    e.preventDefault();

    const nameVal = qs('#cf-name')?.value.trim() || '';
    const emailVal = qs('#cf-email')?.value.trim() || '';
    const msgVal = qs('#cf-message')?.value.trim() || '';
    const selectedChips = chips.filter(c => c.getAttribute('aria-pressed') === 'true');

    let hasError = false;

    // Validate name
    const errName = qs('#err-name');
    if (!nameVal) {
      if (errName) errName.style.display = 'block';
      qs('#field-name')?.classList.add('contact-modal__error');
      hasError = true;
    } else {
      if (errName) errName.style.display = 'none';
      qs('#field-name')?.classList.remove('contact-modal__error');
    }

    // Validate email
    const errEmail = qs('#err-email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      if (errEmail) errEmail.style.display = 'block';
      qs('#field-email')?.classList.add('contact-modal__error');
      hasError = true;
    } else {
      if (errEmail) errEmail.style.display = 'none';
      qs('#field-email')?.classList.remove('contact-modal__error');
    }

    // Validate chips
    const errChips = qs('#err-chips');
    if (selectedChips.length === 0) {
      if (errChips) errChips.style.display = 'block';
      qs('#field-chips')?.classList.add('contact-modal__error');
      hasError = true;
    } else {
      if (errChips) errChips.style.display = 'none';
      qs('#field-chips')?.classList.remove('contact-modal__error');
    }

    // Validate message
    const errMessage = qs('#err-message');
    if (!msgVal) {
      if (errMessage) errMessage.style.display = 'block';
      qs('#field-message')?.classList.add('contact-modal__error');
      hasError = true;
    } else {
      if (errMessage) errMessage.style.display = 'none';
      qs('#field-message')?.classList.remove('contact-modal__error');
    }

    if (hasError) return;

    // Transition to sending state
    if (submitBtn) {
      submitBtn.disabled = true;
      const sendLabel = qs('.contact-modal__sendLabel', submitBtn);
      if (sendLabel) sendLabel.textContent = 'Sending...';
    }

    setTimeout(() => {
      formWrap.style.display = 'none';
      sentWrap.style.display = 'flex';
      form.reset();
      chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
      if (submitBtn) {
        submitBtn.disabled = false;
        const sendLabel = qs('.contact-modal__sendLabel', submitBtn);
        if (sendLabel) sendLabel.textContent = 'Send note';
      }
    }, 700);
  });
}

/* ════════════════════════════════════════════════════════════
   15. SERVICES PAGE SPECIFIC INTERACTIONS
   ════════════════════════════════════════════════════════════ */
function initServicesPage() {
  const isServicesPage = !!qs('.page-module__VKYseq__main');
  if (!isServicesPage) return;

  // 1. Principles Accordion Toggle
  const principles = qsa('.page-module__VKYseq__principle');
  principles.forEach(btn => {
    btn.addEventListener('click', () => {
      const isAlreadyOpen = btn.classList.contains('page-module__VKYseq__principleOpen');
      principles.forEach(p => {
        p.classList.remove('page-module__VKYseq__principleOpen');
        p.setAttribute('aria-expanded', 'false');
      });
      if (!isAlreadyOpen) {
        btn.classList.add('page-module__VKYseq__principleOpen');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // 2. Shot Frames Reveal on Scroll (expand corner & scale image down)
  const shotFrames = qsa('.page-module__VKYseq__shotFrame[data-reveal="true"]');
  if ('IntersectionObserver' in window && shotFrames.length > 0) {
    const shotObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('page-module__VKYseq__inView');
        }
      });
    }, { threshold: 0.15 });
    shotFrames.forEach(el => shotObserver.observe(el));
  } else {
    shotFrames.forEach(el => el.classList.add('page-module__VKYseq__inView'));
  }

  // 3. Metrics Cards Slide Reveal
  const metricCards = qsa('.page-module__VKYseq__metricCard[data-reveal="true"]');
  if ('IntersectionObserver' in window && metricCards.length > 0) {
    const metricObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('page-module__VKYseq__inView');
        }
      });
    }, { threshold: 0.15 });
    metricCards.forEach(el => metricObserver.observe(el));
  } else {
    metricCards.forEach(el => el.classList.add('page-module__VKYseq__inView'));
  }

  // 4. Parallax Drift on Quote Band
  const qband = qs('#qband');
  if (qband) {
    const driftEls = qsa('[data-qd]', qband);
    function updateQDrift() {
      const rect = qband.getBoundingClientRect();
      const winH = window.innerHeight;
      if (rect.top < winH && rect.bottom > 0) {
        const progress = (winH - rect.top) / (winH + rect.height) - 0.5; // -0.5 to 0.5
        driftEls.forEach(el => {
          const qd = parseFloat(el.getAttribute('data-qd')) || 0;
          const tx = progress * qd * 0.7;
          el.style.transform = `translateX(${tx.toFixed(1)}px)`;
        });
      }
    }
    window.addEventListener('scroll', updateQDrift, { passive: true });
    updateQDrift();
  }

  // 5. Deep Linking to Anchors (e.g. #mobile-applications)
  if (window.location.hash) {
    const target = qs(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }

  // Smooth scroll for internal links
  qsa('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId !== '#') {
        const target = qs(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', targetId);
        }
      }
    });
  });
}

/* ════════════════════════════════════════════════════════════
   INIT ALL
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeroShader();
  initNavMorph();
  initCursor();
  initAboutScroll();
  initPlayReal();
  initMetrics();
  initWorksCta();
  initTestimonials();
  initQuoteParallax();
  initFooter();
  initContactModal();
  initPreloader();
  initServicesPage();
});