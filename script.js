// @ts-nocheck
/* ───────────────────────────────────────────────────────────
   Image sources.

   Primary files are served from /public (front-cover.jpg and
   vijaya-suriya.jpg). If a file is not present yet, the loader
   falls back to the same asset in the project's GitHub repo and,
   as a last resort, to a CSS-drawn stand-in (the markup keeps a
   `.cover-art` / `.p-fallback` layer underneath each <img>).
   ─────────────────────────────────────────────────────────── */

const REPO = "https://raw.githubusercontent.com/yashwantchatti005/To-The-Moon-That-Listens/main";

const IMG = {
  cover: ["./front-cover.jpg", `${REPO}/front-cover.jpg`],
  author: ["./vijaya-suriya.jpg", `${REPO}/vijaya-suriya.jpg`],
};

function bindFallbacks(root = document) {
  root.querySelectorAll("img[data-img]").forEach((img) => {
    if (img.__bound) return;
    img.__bound = true;
    const list = IMG[img.dataset.img] || [];
    let i = 0;

    const fail = () => {
      i += 1;
      if (i < list.length) {
        img.src = list[i];
      } else {
        img.classList.add("is-broken");
        if (img.parentElement) img.parentElement.classList.add("img-failed");
      }
    };

    img.addEventListener("error", fail);
    img.addEventListener("load", () => img.classList.add("is-loaded"));

    // the image may already have failed before this script ran
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fail();
  });
}


// @ts-nocheck
/* Fullscreen loader: counts 01 → 100 with an ease-in-out curve, then dissolves. */

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function runLoader(reduce) {
  const root = document.documentElement;
  const loader = document.getElementById("loader");
  const countEl = document.getElementById("loaderCount");
  const lineEl = document.getElementById("loaderLine");

  return new Promise((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (loader) {
        loader.classList.add("done");
        window.setTimeout(() => loader.remove(), 1800);
      }
      root.classList.remove("loading");
      root.classList.add("ready");
      resolve();
    };

    if (!loader || !countEl || !lineEl) {
      finish();
      return;
    }

    // safety net: never trap the visitor behind the loader
    window.setTimeout(finish, 7000);

    if (reduce) {
      countEl.textContent = "100";
      lineEl.style.transform = "scaleX(1)";
      window.setTimeout(finish, 250);
      return;
    }

    const duration = 2600;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOutCubic(t);
      const value = Math.max(1, Math.round(e * 100));
      countEl.textContent = String(value).padStart(2, "0");
      lineEl.style.transform = `scaleX(${e.toFixed(4)})`;
      if (t < 1) requestAnimationFrame(step);
      else window.setTimeout(finish, 380);
    };
    requestAnimationFrame(step);
  });
}


// @ts-nocheck
/* Scroll-lock, smooth scrolling, mobile menu, reveal-on-scroll, card glow. */

function createLocks() {
  const root = document.documentElement;
  const held = new Set();
  const sync = () => root.classList.toggle("is-locked", held.size > 0);
  return {
    lock(key) {
      held.add(key);
      sync();
    },
    unlock(key) {
      held.delete(key);
      sync();
    },
  };
}

/* ── custom eased smooth scroll ── */

// easeInOutCubic already defined above = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let scrollRaf = 0;

function cancelScroll() {
  if (scrollRaf) cancelAnimationFrame(scrollRaf);
  scrollRaf = 0;
}

function smoothScrollTo(targetY, { reduce = false, duration } = {}) {
  cancelScroll();
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const to = Math.min(Math.max(0, targetY), maxY);
  const from = window.scrollY;
  const dist = to - from;

  if (reduce || Math.abs(dist) < 2) {
    window.scrollTo({ top: to, left: 0, behavior: "instant" });
    return;
  }

  const dur = duration || Math.min(2000, Math.max(900, Math.abs(dist) * 0.55));
  const t0 = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    window.scrollTo({ top: from + dist * easeInOutCubic(t), left: 0, behavior: "instant" });
    if (t < 1) scrollRaf = requestAnimationFrame(step);
    else scrollRaf = 0;
  };
  scrollRaf = requestAnimationFrame(step);
}

function initUI({ reduce, locks }) {
  const header = document.getElementById("siteHeader");
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("mobileMenu");
  const menuLabel = menuBtn ? menuBtn.querySelector(".menu-label") : null;
  let menuOpen = false;

  /* user input interrupts a running scroll animation */
  ["wheel", "touchstart", "keydown"].forEach((evt) =>
    window.addEventListener(evt, cancelScroll, { passive: true }),
  );

  /* ── mobile menu ── */
  function setMenu(open) {
    if (!menu || !menuBtn || open === menuOpen) return;
    menuOpen = open;
    document.documentElement.classList.toggle("menu-open", open);
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
    if (open) locks.lock("menu");
    else locks.unlock("menu");
  }

  if (menuBtn) menuBtn.addEventListener("click", () => setMenu(!menuOpen));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) setMenu(false);
  });
  const desktopQuery = window.matchMedia("(min-width: 1081px)");
  const onDesktop = (e) => {
    if (e.matches) setMenu(false);
  };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener("change", onDesktop);

  /* ── internal links → eased scroll that accounts for the fixed header ── */
  const SCROLLED_HEADER = 66;

  document.addEventListener("click", (e) => {
    const link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    e.preventDefault();
    const wasOpen = menuOpen;
    setMenu(false);

    const go = () => {
      const headerH = header ? Math.min(header.offsetHeight, SCROLLED_HEADER + 4) : SCROLLED_HEADER;
      const top =
        hash === "#home" ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerH + 1);
      smoothScrollTo(top, { reduce });
      try {
        history.pushState(null, "", hash);
      } catch (_) {
        /* file:// or sandboxed contexts */
      }
    };

    if (wasOpen) window.setTimeout(go, 90);
    else go();
  });

  /* ── active nav link ── */
  const navLinks = [...document.querySelectorAll(".nav-desktop a")];
  if ("IntersectionObserver" in window && navLinks.length) {
    const map = new Map();
    navLinks.forEach((a) => {
      const sec = document.getElementById(a.getAttribute("href").slice(1));
      if (sec) map.set(sec, a);
    });
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          const a = map.get(en.target);
          if (a) a.classList.toggle("active", en.isIntersecting);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    map.forEach((_, sec) => spy.observe(sec));
  }

  /* ── pointer-follow glow inside cards ── */
  document.querySelectorAll(".poem-card, .rev").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--gx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    });
  });

  /* ── reveal on scroll ── */
  let revealStarted = false;
  function startReveals() {
    if (revealStarted) return;
    revealStarted = true;
    const items = [...document.querySelectorAll(".reveal")];
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add("in");
          obs.unobserve(en.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((el) => obs.observe(el));
  }

  return { startReveals, setMenu };
}


// @ts-nocheck
/* One rAF loop: header state, reading progress, parallax, cursor glow,
   magnetic buttons and the star canvas. Everything is lerped. */

function createStars(canvas, reduce) {
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let stars = [];
  const tints = ["231,236,242", "231,236,242", "231,236,242", "244,232,200", "203,215,232"];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(340, Math.round((w * h) / 6800));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.35 + Math.pow(Math.random(), 3) * 1.25,
      a: 0.25 + Math.random() * 0.6,
      s: 0.5 + Math.random() * 1.6,
      p: Math.random() * Math.PI * 2,
      d: 0.15 + Math.random() * 0.85,
      c: tints[(Math.random() * tints.length) | 0],
    }));
  }

  function draw(t, scroll) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i];
      const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.s + s.p);
      let y = (s.y - scroll * s.d * 0.05) % h;
      if (y < 0) y += h;
      const alpha = s.a * tw;
      ctx.fillStyle = `rgba(${s.c},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, 6.2832);
      ctx.fill();
      if (s.r > 1.25) {
        ctx.fillStyle = `rgba(${s.c},${(alpha * 0.14).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r * 3.4, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reduce) draw(0, window.scrollY);
  });
  if (reduce) draw(0, 0);
  return { draw };
}

function initMotion({ reduce, fine }) {
  const root = document.documentElement;
  const header = document.getElementById("siteHeader");
  const progress = document.getElementById("progress");
  const canvas = document.getElementById("stars");
  const glow = document.getElementById("cursorGlow");
  const heroBg = document.getElementById("heroBg");
  const moonWrap = document.getElementById("moonWrap");
  const interlude = document.getElementById("interlude");
  const closing = document.getElementById("closing");
  const closingMoon = document.getElementById("closingMoon");
  const hero = document.getElementById("home");

  const stars = canvas ? createStars(canvas, reduce) : null;

  const words = [...document.querySelectorAll(".fw")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.speed || "80"),
    cur: 0,
  }));

  const magnets = fine && !reduce
    ? [...document.querySelectorAll(".magnetic")].map((el) => ({ el, x: 0, y: 0, rect: null }))
    : [];

  /* which cinematic sections are on screen */
  const vis = { hero: true, interlude: false, closing: false };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.target === hero) vis.hero = en.isIntersecting;
          if (en.target === interlude) vis.interlude = en.isIntersecting;
          if (en.target === closing) vis.closing = en.isIntersecting;
        });
      },
      { rootMargin: "200px 0px 200px 0px" },
    );
    [hero, interlude, closing].forEach((el) => el && io.observe(el));
  } else {
    vis.interlude = true;
    vis.closing = true;
  }

  /* pointer */
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, has: false };
  const glowPos = { x: mouse.x, y: mouse.y };
  const tilt = { x: 0, y: 0 };

  if (fine && !reduce) {
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (!mouse.has) {
          mouse.has = true;
          glowPos.x = mouse.x;
          glowPos.y = mouse.y;
          if (glow) glow.classList.add("on");
        }
      },
      { passive: true },
    );
    document.documentElement.addEventListener("mouseleave", () => glow && glow.classList.remove("on"));
    document.documentElement.addEventListener("mouseenter", () => mouse.has && glow && glow.classList.add("on"));
  }

  let sy = window.scrollY;
  let scrolled = false;
  let lastProgress = -1;
  let frame = 0;

  function tick(t) {
    frame += 1;
    const y = window.scrollY;
    const vh = window.innerHeight;

    /* lerped scroll */
    if (reduce) sy = y;
    else {
      sy += (y - sy) * 0.085;
      if (Math.abs(y - sy) < 0.2) sy = y;
    }

    /* header: shrink + blur after the first scroll */
    const isScrolled = y > 40;
    if (isScrolled !== scrolled) {
      scrolled = isScrolled;
      if (header) header.classList.toggle("scrolled", isScrolled);
    }

    /* reading progress */
    if (progress) {
      const max = Math.max(1, root.scrollHeight - vh);
      const p = Math.min(1, Math.max(0, sy / max));
      if (Math.abs(p - lastProgress) > 0.0002) {
        lastProgress = p;
        progress.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    }

    if (!reduce) {
      /* hero: moon + atmosphere */
      if (vis.hero) {
        const nx = mouse.has ? mouse.x / window.innerWidth - 0.5 : 0;
        const ny = mouse.has ? mouse.y / vh - 0.5 : 0;
        tilt.x += (nx - tilt.x) * 0.05;
        tilt.y += (ny - tilt.y) * 0.05;
        if (moonWrap) {
          moonWrap.style.transform = `translate3d(${(-tilt.x * 26).toFixed(1)}px, ${(sy * 0.12 - tilt.y * 14).toFixed(1)}px, 0)`;
        }
        if (heroBg) heroBg.style.transform = `translate3d(0, ${(sy * 0.05).toFixed(1)}px, 0)`;
      }

      /* interlude: floating words */
      if (vis.interlude && interlude && words.length) {
        const r = interlude.getBoundingClientRect();
        const pr = (r.top + r.height / 2 - vh / 2) / vh;
        for (let i = 0; i < words.length; i += 1) {
          const wd = words[i];
          const target = -pr * wd.speed;
          wd.cur += (target - wd.cur) * 0.075;
          wd.el.style.transform = `translate3d(0, ${wd.cur.toFixed(1)}px, 0)`;
        }
      }

      /* closing moon */
      if (vis.closing && closing && closingMoon) {
        const r = closing.getBoundingClientRect();
        const pr = (r.top + r.height / 2 - vh / 2) / vh;
        closingMoon.style.transform = `translate3d(0, ${(pr * -80).toFixed(1)}px, 0)`;
      }

      /* cursor glow */
      if (fine && glow && mouse.has) {
        glowPos.x += (mouse.x - glowPos.x) * 0.1;
        glowPos.y += (mouse.y - glowPos.y) * 0.1;
        glow.style.transform = `translate3d(${glowPos.x.toFixed(1)}px, ${glowPos.y.toFixed(1)}px, 0)`;
      }

      /* magnetic buttons: read first, write after */
      if (magnets.length && mouse.has) {
        for (let i = 0; i < magnets.length; i += 1) {
          const m = magnets[i];
          const r = m.el.getBoundingClientRect();
          m.rect = r.bottom < -120 || r.top > vh + 120 ? null : r;
        }
        for (let i = 0; i < magnets.length; i += 1) {
          const m = magnets[i];
          let tx = 0;
          let ty = 0;
          if (m.rect) {
            const cx = m.rect.left + m.rect.width / 2 - m.x;
            const cy = m.rect.top + m.rect.height / 2 - m.y;
            const dx = mouse.x - cx;
            const dy = mouse.y - cy;
            const reach = Math.max(m.rect.width, m.rect.height) * 0.75 + 36;
            const dist = Math.hypot(dx, dy);
            if (dist < reach) {
              tx = Math.max(-9, Math.min(9, dx * 0.2));
              ty = Math.max(-7, Math.min(7, dy * 0.26));
            }
          }
          const nx = m.x + (tx - m.x) * 0.16;
          const ny = m.y + (ty - m.y) * 0.16;
          if (Math.abs(nx - m.x) > 0.02 || Math.abs(ny - m.y) > 0.02) {
            m.x = nx;
            m.y = ny;
            m.el.style.transform = `translate3d(${nx.toFixed(2)}px, ${ny.toFixed(2)}px, 0)`;
          }
        }
      }

      /* stars at ~30fps */
      if (stars && (frame & 1) === 0) stars.draw(t, sy);
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}


// @ts-nocheck
/* ───────────────────────────────────────────────────────────
   Fullscreen book reader.

   The book is a stack of physical leaves hinged on the centre
   spine. Each leaf has a front and a back face. Turning a leaf
   rotates it 180° around the spine (WAAPI, with a slight bend),
   while shade + cast-shadow layers change underneath it.

   Desktop shows a two-page spread. On narrow screens the same
   engine shows a single page and pans between the halves.
   ─────────────────────────────────────────────────────────── */



const EASE = "cubic-bezier(.645,.045,.355,1)";
const DUR = 1150;
const RATIO = 0.64; // page width / height

const POEMS = {
  love: { n: "01", t: "Love", l: ["I didn’t fall for you.", "I leaned.", "Slowly.", "Trusting the ground", "would stay."] },
  letting: { n: "02", t: "Letting Go", l: ["Why am I homesick", "for a place I can", "never call home?"] },
  kindness: { n: "03", t: "Kindness", l: ["I liked you for how kind you were.", "I just wish you were as kind to yourself."] },
  hope: { n: "04", t: "Hope", l: ["If all you did was get through today,", "that is enough.", "You are seen."] },
  moon: { n: "05", t: "The Moon", l: ["The moon never explains itself.", "Even on days with no light,", "it simply shows up."] },
};

const poem = (key) => ({ k: "poem", ...POEMS[key] });

// each sheet = one physical leaf (front + back)
const SHEETS = [
  { f: { k: "cover" }, b: { k: "epigraph" } },
  { f: { k: "title" }, b: poem("love") },
  { f: poem("letting"), b: poem("kindness") },
  { f: poem("hope"), b: poem("moon") },
  { f: { k: "quote" }, b: { k: "note" } },
];
const END = { k: "colophon" };
const N = SHEETS.length;

const pad = (n) => String(n).padStart(2, "0");
const isDark = (f) => f.k === "cover" || f.k === "epigraph";

function faceHTML(f, folio) {
  switch (f.k) {
    case "cover":
      return `<div class="pg pg-cover">
        <span class="cover-art" aria-hidden="true"><span class="ca-title">to<br>the moon<br>that<br>listens</span><span class="ca-moon"></span><span class="ca-name">Vijaya Suriya</span></span>
        <img data-img="cover" src="${IMG.cover[0]}" alt="Front cover of To the Moon That Listens by Vijaya Suriya" draggable="false">
      </div>`;
    case "epigraph":
      return `<div class="pg pg-dark">
        <span class="moon-mark" aria-hidden="true"></span>
        <p class="pg-epi"><span>For everything you never said out loud.</span><span>For the feelings that stayed anyway.</span></p>
        <p class="pg-epi2"><span>You don’t have to carry them alone.</span><span>Here, you are seen.</span></p>
      </div>`;
    case "title":
      return `<div class="pg">
        <span class="pg-label">A debut poetry collection</span>
        <span class="pg-orn"></span>
        <h2 class="pg-title-big">to the moon<br><em>that listens</em></h2>
        <span class="pg-orn"></span>
        <p class="pg-by">Vijaya Suriya</p>
        <p class="pg-sub">A collection of poems &amp; fragments</p>
      </div>`;
    case "poem":
      return `<div class="pg">
        <p class="pg-label"><b>${f.n}</b>${f.t}</p>
        <span class="pg-orn"></span>
        <p class="pg-poem">${f.l.map((l) => `<span class="ln">${l}</span>`).join("")}</p>
        <span class="pg-folio">${folio}</span>
      </div>`;
    case "quote":
      return `<div class="pg">
        <p class="pg-label">From the book</p>
        <span class="pg-orn"></span>
        <p class="pg-quote">“Somewhere between the words, you may find yourself.”</p>
        <span class="pg-folio">${folio}</span>
      </div>`;
    case "note":
      return `<div class="pg">
        <p class="pg-poem"><span class="ln">Some words are meant to be read.</span><span class="ln">Others are meant to be felt.</span></p>
        <span class="pg-orn"></span>
        <p class="pg-label">Read slowly</p>
        <span class="pg-folio">${folio}</span>
      </div>`;
    case "colophon":
    default:
      return `<div class="pg">
        <p class="pg-end-big">And still,<br><em>we remain.</em></p>
        <span class="pg-orn"></span>
        <p class="pg-by">Vijaya Suriya</p>
        <p class="pg-small">© 2026 Vijaya Suriya<br>Published by Notion Press</p>
        <span class="pg-folio">${folio}</span>
      </div>`;
  }
}

const face = (f, side, folio) =>
  `<div class="face ${side}${isDark(f) ? " dark" : ""}">${faceHTML(f, folio)}<i class="shade"></i></div>`;

function initReader({ reduce, locks }) {
  const reader = document.getElementById("reader");
  const spread = document.getElementById("spread");
  const clip = document.getElementById("spreadClip");
  const shift = document.getElementById("spreadShift");
  const stage = document.getElementById("readerStage");
  const closeBtn = document.getElementById("readerClose");
  const prevBtn = document.getElementById("rdPrev");
  const nextBtn = document.getElementById("rdNext");
  const arrowPrev = document.getElementById("rdArrowPrev");
  const arrowNext = document.getElementById("rdArrowNext");
  const countEl = document.getElementById("rdCount");
  if (!reader || !spread || !clip || !shift || !stage) return;

  /* ── build the book ── */
  const parts = [
    '<div class="board board-l"></div><div class="board board-r"></div>',
    '<div class="stack stack-l"></div><div class="stack stack-r"></div>',
    `<div class="face front base-r">${faceHTML(END, 2 * N + 1)}<i class="shade"></i></div>`,
  ];
  SHEETS.forEach((s, i) => {
    parts.push(
      `<div class="leaf" data-i="${i}">${face(s.f, "front", 2 * i + 1)}${face(s.b, "back", 2 * i + 2)}</div>`,
    );
  });
  parts.push('<div class="cast cast-l"></div><div class="cast cast-r"></div><div class="gutter"></div>');
  spread.innerHTML = parts.join("");
  bindFallbacks(spread);

  const leaves = [...spread.querySelectorAll(".leaf")];
  const castL = spread.querySelector(".cast-l");
  const castR = spread.querySelector(".cast-r");
  const stackL = spread.querySelector(".stack-l");
  const stackR = spread.querySelector(".stack-r");

  /* ── state ── */
  let p = 0; // number of leaves turned
  let side = "R"; // single-page mode: which half is on screen
  let busy = false;
  let single = false;
  let isOpen = false;
  let lastFocus = null;
  let openTimer = 0;
  let suppressClick = false;
  let pw = 420;

  function size() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    single = vw < 760;
    const availH = Math.max(260, vh - (single ? 190 : 214));
    const availW = single ? vw * 0.9 : Math.min(vw * 0.82, 1200);
    pw = single ? Math.min(availW, availH * RATIO) : Math.min(availW / 2, availH * RATIO);
    const ph = pw / RATIO;
    reader.style.setProperty("--pw", `${pw.toFixed(1)}px`);
    reader.style.setProperty("--ph", `${ph.toFixed(1)}px`);
    reader.style.setProperty("--clipw", `${(single ? pw : pw * 2).toFixed(1)}px`);
    clip.classList.toggle("single", single);
  }

  function updateShift() {
    let tx = 0;
    if (single) tx = side === "R" ? -pw : 0;
    else tx = p === 0 ? -pw / 2 : 0;
    shift.style.transform = `translateX(${tx.toFixed(1)}px)`;
  }

  function updateUI() {
    let label;
    if (single) {
      const view = p === 0 ? 0 : 2 * p - 1 + (side === "R" ? 1 : 0);
      label = `${pad(view + 1)} / ${pad(2 * N + 1)}`;
    } else {
      label = `${pad(p + 1)} / ${pad(N + 1)}`;
    }
    if (countEl) countEl.textContent = label;
    const canPrev = single ? !(p === 0 && side === "R") : p > 0;
    const canNext = single ? !(p === N && side === "R") : p < N;
    [prevBtn, arrowPrev].forEach((b) => b && (b.disabled = !canPrev));
    [nextBtn, arrowNext].forEach((b) => b && (b.disabled = !canNext));
  }

  function applyState() {
    leaves.forEach((lf, i) => {
      lf.classList.toggle("flipped", i < p);
      lf.style.zIndex = String(i < p ? i + 1 : N - i);
    });
    spread.dataset.p = String(p);
    if (stackL) stackL.style.width = single ? "0px" : `${(p * 1.7).toFixed(1)}px`;
    if (stackR) stackR.style.width = single ? "0px" : `${((N - p) * 1.7).toFixed(1)}px`;
    updateShift();
    updateUI();
  }

  /* ── the page turn ── */
  function flip(i, dir, done) {
    const lf = leaves[i];
    busy = true;
    lf.style.zIndex = String(N + 40); // above the cast shadows (z 20) and gutter (z 21)

    const finish = () => {
      done();
      busy = false;
    };

    if (reduce || typeof lf.animate !== "function") {
      finish();
      return;
    }

    const fwd = dir > 0;
    const frames = fwd
      ? [
          { transform: "rotateY(0deg) skewY(0deg)" },
          { transform: "rotateY(-64deg) skewY(2.6deg)", offset: 0.34 },
          { transform: "rotateY(-116deg) skewY(-2.2deg)", offset: 0.66 },
          { transform: "rotateY(-180deg) skewY(0deg)" },
        ]
      : [
          { transform: "rotateY(-180deg) skewY(0deg)" },
          { transform: "rotateY(-116deg) skewY(-2.2deg)", offset: 0.34 },
          { transform: "rotateY(-64deg) skewY(2.6deg)", offset: 0.66 },
          { transform: "rotateY(0deg) skewY(0deg)" },
        ];
    const timing = { duration: DUR, easing: EASE };

    // the leaf bends away from the spine as it turns
    const anim = lf.animate(frames, { ...timing, fill: "forwards" });

    // face shading: darkens toward the middle of the turn
    lf.querySelectorAll(".shade").forEach((s) =>
      s.animate(
        [
          { opacity: 0 },
          { opacity: 0, offset: 0.12 },
          { opacity: 0.7, offset: 0.5 },
          { opacity: 0, offset: 0.92 },
          { opacity: 0 },
        ],
        timing,
      ),
    );

    // the shadow the moving leaf throws on the page beneath it
    if (castR) {
      castR.animate(
        fwd
          ? [{ opacity: 0 }, { opacity: 0.9, offset: 0.28 }, { opacity: 0, offset: 0.62 }, { opacity: 0 }]
          : [{ opacity: 0 }, { opacity: 0, offset: 0.38 }, { opacity: 0.9, offset: 0.72 }, { opacity: 0 }],
        timing,
      );
    }
    if (castL) {
      castL.animate(
        fwd
          ? [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 0.9, offset: 0.74 }, { opacity: 0 }]
          : [{ opacity: 0 }, { opacity: 0.9, offset: 0.26 }, { opacity: 0, offset: 0.6 }, { opacity: 0 }],
        timing,
      );
    }

    anim.onfinish = () => {
      finish(); // update classes first…
      anim.cancel(); // …then drop the animation, so there is no flicker
    };
  }

  function next() {
    if (busy) return;
    if (single) {
      if (side === "L") {
        side = "R";
        applyState();
        return;
      }
      if (p >= N) return;
      const i = p;
      side = "L";
      updateShift();
      flip(i, 1, () => {
        p = i + 1;
        applyState();
      });
      return;
    }
    if (p >= N) return;
    const i = p;
    flip(i, 1, () => {
      p = i + 1;
      applyState();
    });
  }

  function prev() {
    if (busy) return;
    if (single) {
      if (side === "R") {
        if (p === 0) return;
        side = "L";
        applyState();
        return;
      }
      const i = p - 1;
      side = "R";
      updateShift();
      flip(i, -1, () => {
        p = i;
        applyState();
      });
      return;
    }
    if (p <= 0) return;
    const i = p - 1;
    flip(i, -1, () => {
      p = i;
      applyState();
    });
  }

  /* ── open / close ── */
  const inertTargets = () => [...document.querySelectorAll("#main, #siteHeader, .site-footer, #mobileMenu")];
  const setInert = (on) => inertTargets().forEach((el) => (el.inert = on));

  function open(opener) {
    if (isOpen) return;
    isOpen = true;
    lastFocus = opener || document.activeElement;
    window.clearTimeout(openTimer);
    leaves.forEach((l) => l.getAnimations && l.getAnimations().forEach((a) => a.cancel()));
    busy = false;
    size();
    p = 0;
    side = "R";

    shift.classList.add("no-anim");
    applyState();
    void shift.offsetWidth;
    shift.classList.remove("no-anim");

    reader.classList.add("open");
    reader.setAttribute("aria-hidden", "false");
    locks.lock("reader");
    setInert(true);
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    if (reduce) {
      p = 1;
      side = single ? "L" : "R";
      applyState();
    } else {
      // the cover swings open once the reader has faded in
      openTimer = window.setTimeout(() => {
        if (isOpen && p === 0 && !busy) next();
      }, 1100);
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    window.clearTimeout(openTimer);
    reader.classList.remove("open");
    reader.setAttribute("aria-hidden", "true");
    locks.unlock("reader");
    setInert(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ── wiring ── */
  document.querySelectorAll("[data-open-reader]").forEach((el) => el.addEventListener("click", () => open(el)));
  if (closeBtn) closeBtn.addEventListener("click", close);
  [prevBtn, arrowPrev].forEach((b) => b && b.addEventListener("click", prev));
  [nextBtn, arrowNext].forEach((b) => b && b.addEventListener("click", next));

  // click outside the book closes the reader
  reader.addEventListener("click", (e) => {
    const t = e.target;
    if (t === reader || t === stage || (t.classList && t.classList.contains("reader-bg"))) close();
  });

  // tap / click the page: right half turns forward, left half back
  spread.addEventListener("click", (e) => {
    if (suppressClick) return;
    if (p === 0 && side === "R") {
      next();
      return;
    }
    const r = clip.getBoundingClientRect();
    if (e.clientX - r.left > r.width / 2) next();
    else prev();
  });

  // swipe
  let sx = 0;
  let sy = 0;
  let tracking = false;
  stage.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true },
  );
  stage.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppressClick = true;
      window.setTimeout(() => (suppressClick = false), 400);
      if (dx < 0) next();
      else prev();
    }
  });

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "Tab") {
      const els = [closeBtn, arrowPrev, prevBtn, nextBtn, arrowNext].filter(
        (b) => b && !b.disabled && b.offsetParent !== null,
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!els.includes(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("resize", () => {
    if (!isOpen) return;
    const wasSingle = single;
    size();
    if (wasSingle !== single) side = "R";
    shift.classList.add("no-anim");
    applyState();
    void shift.offsetWidth;
    shift.classList.remove("no-anim");
  });

  size();
  applyState();
}


// @ts-nocheck
/* Boots the whole static site: loader → reveals, atmosphere, reader. */


let started = false;

function initSite() {
  if (started) return;
  started = true;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // always begin at the top, behind the loader (unless deep-linked)
  if (!window.location.hash) {
    try {
      history.scrollRestoration = "manual";
    } catch (_) {
      /* ignore */
    }
    window.scrollTo(0, 0);
  }

  const locks = createLocks();

  bindFallbacks();
  const ui = initUI({ reduce, locks });
  initReader({ reduce, locks });
  initMotion({ reduce, fine });

  // reveals wait for the loader to dissolve
  const startReveals = () => ui.startReveals();
  runLoader(reduce).then(() => window.setTimeout(startReveals, reduce ? 0 : 380));
  window.setTimeout(startReveals, 9000); // failsafe
}


document.addEventListener('DOMContentLoaded', initSite);
