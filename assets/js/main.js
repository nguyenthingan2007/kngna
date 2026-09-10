/* =========================================================
   ASTRUM — toàn bộ hiệu ứng lấp lánh, thuần JavaScript
   1) Trời sao + sao băng trên <canvas>
   2) Bụi sao bám theo con trỏ
   3) Nổ chùm tia khi nhấn / chạm
   4) Xuất hiện dần + đếm số khi cuộn
   ========================================================= */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const rand = (min, max) => Math.random() * (max - min) + min;

  /* ---------------------------------------------------------
     0. Chuẩn bị lớp ánh kim quét qua tiêu đề
        (CSS dùng content: attr(data-shine) để nhân bản chữ)
     --------------------------------------------------------- */
  document.querySelectorAll(".title__line--gold").forEach((el) => {
    el.setAttribute("data-shine", el.textContent.trim());
  });

  /* ---------------------------------------------------------
     1. TRỜI SAO + TIA SÁNG LẤP LÁNH TRÊN CANVAS
     --------------------------------------------------------- */
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d", { alpha: true });

  const PALETTE = ["255,255,255", "255,217,138", "110,231,255", "255,95,191", "185,139,255"];
  let W = 0, H = 0, DPR = 1;
  let stars = [], shooters = [], sparkles = [];
  let running = true;

  function buildStars() {
    const count = Math.min(340, Math.round((W * H) / 5200));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.35, 1.9),
      a: rand(0.25, 1),
      tw: rand(0.6, 2.4),        // tốc độ nhấp nháy
      ph: rand(0, Math.PI * 2),  // pha dao động
      dx: rand(-0.03, 0.03),     // trôi ngang rất chậm
      dy: rand(0.01, 0.06),      // rơi nhẹ
      c: PALETTE[(Math.random() * PALETTE.length) | 0],
      big: Math.random() > 0.94  // sao lớn có tia sáng hình thánh giá
    }));
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildStars();
  }

  /* Vẽ một ngôi sao 4 cánh */
  function drawStar(x, y, r, color, alpha, rot) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 5;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.32;
      const ang = (Math.PI / 4) * i;
      ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spawnShooter() {
    if (REDUCED) return;
    shooters.push({
      x: rand(-W * 0.1, W * 0.65),
      y: rand(-H * 0.1, H * 0.45),
      vx: rand(6, 11),
      vy: rand(3, 5.6),
      life: 1
    });
  }

  /* Thả một chớp sáng ngắn tại toạ độ cho trước */
  function popSparkle(x, y, color) {
    if (REDUCED || sparkles.length > 90) return;
    sparkles.push({
      x, y,
      r: rand(3, 7),
      rot: rand(0, Math.PI),
      life: 1,
      decay: rand(0.012, 0.03),
      c: color || PALETTE[(Math.random() * PALETTE.length) | 0]
    });
  }

  let t = 0;
  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    /* --- nền sao --- */
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      s.x += s.dx; s.y += s.dy;
      if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
      if (s.x > W + 2) s.x = -2;
      if (s.x < -2) s.x = W + 2;

      const alpha = s.a * tw;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.c},${alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      /* tia sáng hình thánh giá cho những sao lớn */
      if (s.big) {
        const ray = s.r * (5 + 3 * tw);
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = `rgba(${s.c},1)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - ray, s.y); ctx.lineTo(s.x + ray, s.y);
        ctx.moveTo(s.x, s.y - ray); ctx.lineTo(s.x, s.y + ray);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* --- sao băng --- */
    for (let i = shooters.length - 1; i >= 0; i--) {
      const sh = shooters[i];
      sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.012;
      const tailX = sh.x - sh.vx * 16;
      const tailY = sh.y - sh.vy * 16;
      const g = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, `rgba(255,240,200,${Math.max(sh.life, 0)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
      if (sh.life <= 0 || sh.x > W + 120 || sh.y > H + 120) shooters.splice(i, 1);
    }

    /* --- chớp sáng tuổi thọ ngắn --- */
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const p = sparkles[i];
      p.life -= p.decay;
      p.r *= 1.02;
      p.rot += 0.03;
      if (p.life <= 0) { sparkles.splice(i, 1); continue; }
      drawStar(p.x, p.y, p.r, `rgba(${p.c},1)`, Math.max(p.life, 0), p.rot);
    }

    if (running) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  if (REDUCED) { frame(); running = false; }   // chỉ vẽ một lần duy nhất
  else requestAnimationFrame(frame);

  /* Thỉnh thoảng thả một sao băng */
  setInterval(() => { if (!document.hidden && Math.random() > 0.45) spawnShooter(); }, 3800);

  /* Tạm dừng khi ẩn tab để tiết kiệm pin */
  document.addEventListener("visibilitychange", () => {
    if (REDUCED) return;
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });

  /* ---------------------------------------------------------
     2. BỤI SAO BẮM THEO CON TRỎ + VỆT SÁNG NỀN
     --------------------------------------------------------- */
  if (FINE_POINTER && !REDUCED) {
    const DOTS = 18;
    const pool = [];
    for (let i = 0; i < DOTS; i++) {
      const el = document.createElement("div");
      el.className = "trail-dot";
      el.style.opacity = "0";
      document.body.appendChild(el);
      pool.push({ el, x: innerWidth / 2, y: innerHeight / 2 });
    }

    let mx = innerWidth / 2, my = innerHeight / 2;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      const root = document.documentElement.style;
      root.setProperty("--mx", ((mx / innerWidth) * 100).toFixed(2) + "%");
      root.setProperty("--my", ((my / innerHeight) * 100).toFixed(2) + "%");
      if (Math.random() > 0.88) popSparkle(mx + rand(-10, 10), my + rand(-10, 10), "255,217,138");
    }, { passive: true });

    /* Chuỗi điểm ảnh đuổi nhau tạo vệt bụi sao mượt */
    (function follow() {
      let px = mx, py = my;
      for (const d of pool) {
        d.x += (px - d.x) * 0.34;
        d.y += (py - d.y) * 0.34;
        px = d.x; py = d.y;
        const k = 0.35 + Math.random() * 0.65;
        d.el.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) scale(${k})`;
        d.el.style.opacity = "0.85";
      }
      requestAnimationFrame(follow);
    })();
  }

  /* ---------------------------------------------------------
     3. NỔ CHÙM TIA KHI NHẤN CHUỘT / CHẠM MÀN HÌNH
     --------------------------------------------------------- */
  const BURST_COLORS = ["#ffd98a", "#ff5fbf", "#6ee7ff", "#b98bff", "#ffffff"];
  window.addEventListener("pointerdown", (e) => {
    popSparkle(e.clientX, e.clientY, "255,255,255");
    if (REDUCED) return;

    const n = 16;
    const layer = document.createElement("div");
    layer.className = "burst";
    layer.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      const ang = (Math.PI * 2 / n) * i + rand(-0.14, 0.14);
      const dist = rand(46, 122);
      p.style.setProperty("--x", (Math.cos(ang) * dist).toFixed(1) + "px");
      p.style.setProperty("--y", (Math.sin(ang) * dist).toFixed(1) + "px");
      p.style.setProperty("--c", BURST_COLORS[(Math.random() * BURST_COLORS.length) | 0]);
      p.style.setProperty("--d", rand(0.55, 1.05).toFixed(2) + "s");
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1300);
  }, { passive: true });

  /* ---------------------------------------------------------
     4. VÙNG SÁNG ĐUỔI THEO CHUỘT BÊN TRONG THẺ
     --------------------------------------------------------- */
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--cx", (e.clientX - r.left).toFixed(1) + "px");
      card.style.setProperty("--cy", (e.clientY - r.top).toFixed(1) + "px");
    }, { passive: true });
  });

  /* ---------------------------------------------------------
     5. THANH ĐIỀU HƯỚNG DẪN MÀU KHI CUỘN + PARALLAX NHẸ
     --------------------------------------------------------- */
  const topbar = document.getElementById("topbar");
  const deco = document.querySelector(".deco");
  let pendingScroll = false;

  function onScroll() {
    topbar.classList.toggle("is-stuck", window.scrollY > 24);
    if (deco && !REDUCED) {
      const y = window.scrollY;
      deco.style.setProperty("--sy", Math.min(y * 0.12, 60) + "px");
    }
    pendingScroll = false;
  }
  window.addEventListener("scroll", () => {
    if (!pendingScroll) { pendingScroll = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     6. XUẤT HIỆN DẦN + ĐẾM SỐ KHI CUỘN VÀO MÀN HÌNH
     --------------------------------------------------------- */
  function animateCount(el) {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    if (REDUCED || target === 0) { el.textContent = target + suffix; return; }
    const dur = 1500;
    const t0 = performance.now();
    (function tick(now) {
      const k = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);      // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  const reveal = (el) => {
    el.classList.add("is-in");
    el.querySelectorAll("[data-count]").forEach((n) => {
      if (!n.dataset.done) { n.dataset.done = "1"; animateCount(n); }
    });
  };

  if ("IntersectionObserver" in window && !REDUCED) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });

    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll("[data-reveal]").forEach(reveal);
  }

  /* Hero xuất hiện ngay khi tải trang */
  requestAnimationFrame(() => {
    document.querySelectorAll(".hero [data-reveal]").forEach(reveal);
  });

  /* Parallax nhẹ cho cụm sao trang trí */
  if (FINE_POINTER && !REDUCED && deco) {
    window.addEventListener("pointermove", (e) => {
      deco.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * 26).toFixed(1) + "px");
      deco.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * 18).toFixed(1) + "px");
    }, { passive: true });
  }

  console.log("%c✨ ASTRUM", "color:#ffd98a;font:700 16px serif", "— thử di chuột và nhấn vào màn hình!");
})();
