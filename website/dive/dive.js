/* The Last Crossing — immersive dive (chapters 1–8).
 * Classic script (no modules) so it runs from file://. No network access needed. */
(() => {
  "use strict";
  // Directory of this script, so the page works from website/index.html and website/dive/index.html alike.
  const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[^/]*$/, "");

  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 40) : ms));
  const B = (zh, en) => ({ zh, en });
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  let lang = store.get("dive-lang") || ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
  const tx = (o) => (typeof o === "string" ? o : o[lang] ?? o.en);

  /* ------------------------------------------------------------------ text */
  const UI = {
    zh: { brand: "泰坦尼克号 · 最后的航程", restartAria: "重新开始", continue: "继续", close: "关闭", gaugeWreck: "沉船 3,840 m", found: "发现" },
    en: { brand: "THE LAST CROSSING", restartAria: "Restart", continue: "Continue", close: "Close", gaugeWreck: "WRECK 3,840 m", found: "Found" },
  };
  const ui = (k) => UI[lang][k];

  const CAPTIONS = {
    map: [B("第一章 · 坐标", "Chapter 1 · Coordinates"), B("一艘“永不沉没”的巨轮，消失在哪里？", "Where did the “unsinkable” ship vanish?")],
    poster: [B("第二章 · 下潜之前", "Chapter 2 · Before the dive"), B("今天，你将潜入 3,840 米的深海。", "Today you descend 3,840 metres into the dark.")],
    diver: [B("第三章 · 你是潜水员", "Chapter 3 · You are the diver"), B("向下滑动，沉入北大西洋。", "Scroll down and sink into the North Atlantic.")],
    bow: [B("第四章 · 船艏", "Chapter 4 · The bow"), B("锈迹斑斑的栏杆从黑暗中浮现。", "Rust-eaten railings rise out of the dark.")],
    capstans: [B("第五章 · 前甲板", "Chapter 5 · Forward deck"), B("绞盘与锚链，还停在 1912 年的位置。", "Capstans and chain, still where they stood in 1912.")],
    cabin: [B("第六章 · 舱壁", "Chapter 6 · The cabin wall"), B("一扇窗，通向曾经的住舱。", "A window into someone’s cabin.")],
    window: [B("第七章 · 黑色的窗", "Chapter 7 · The black window"), B("窗后一片漆黑。", "Beyond the glass, only darkness.")],
    stairs: [B("第八章 · 大楼梯", "Chapter 8 · The Grand Staircase"), B("木质的楼梯、雕花的栏杆——它曾经的样子。", "Oak, carved balustrades — as it once was.")],
  };
  const HINTS = {
    map: B("点击闪烁的标记 · 放大", "Click the pulsing marker · zoom in"),
    poster: B("向下滑动 · 开始下潜", "Scroll down · begin the dive"),
    diver: B("向下滑动 · 沉入海中", "Scroll down · sink"),
    bow: B("点击光点 · 然后继续下滑", "Click the glow · then keep scrolling"),
    capstans: B("点击两处光点 · 然后继续下滑", "Click both glows · then keep scrolling"),
    cabin: B("点击窗口 · 然后继续下滑", "Click the window · then keep scrolling"),
    window: B("点击黑色的窗，才能继续", "Click the black window to go on"),
    stairs: B("", ""),
  };

  const CARDS = {
    bow: {
      eyebrow: B("RMS 泰坦尼克号", "RMS Titanic"),
      title: B("这就是世界上最著名的沉船", "This is the world’s most famous shipwreck"),
      body: [
        B("1912 年 4 月 10 日，白星航运的皇家邮轮“泰坦尼克号”从英国南安普顿启航，开始驶向纽约的处女航。4 月 14 日深夜，她在北大西洋撞上冰山；4 月 15 日凌晨，船体断裂沉没。",
          "On 10 April 1912 the White Star liner RMS Titanic left Southampton on her maiden voyage to New York. Late on 14 April she struck an iceberg in the North Atlantic; in the early hours of 15 April she broke apart and sank."),
        B("1985 年 9 月 1 日，由罗伯特·巴拉德参与领导的法美联合考察队发现了沉船。她静卧在约 3,840 米深的海底，断成两截，相距约 600 米。栏杆上垂挂的棕黄色“锈柱”（rusticles），是细菌啃食铁质留下的痕迹。",
          "On 1 September 1985 a joint French–American expedition, with Robert Ballard, found the wreck about 3,840 m down, in two sections roughly 600 m apart. The rust-coloured “rusticles” hanging from the rails are bacterial colonies eating the iron."),
      ],
      stats: [
        { n: "1912-04-15", l: B("沉没日期", "Date of sinking"), plain: true },
        { n: 3840, l: B("水深（米）", "Depth (m)"), fmt: true },
        { n: 600, l: B("两截相距（米，约）", "Gap between halves (m, approx.)"), fmt: true },
      ],
    },
    people: {
      eyebrow: B("人与价值", "People & value"),
      title: B("船上有多少人？值多少钱？", "How many were aboard? What was she worth?"),
      body: [
        B("头等舱 325 人、二等舱 285 人、三等舱 706 人，外加约 913 名船员。最终约 713 人获救，约 1,500 人遇难。", "325 in first class, 285 in second, 706 in third — plus about 913 crew. About 713 survived; roughly 1,500 died."),
        B("造价约 150 万英镑（当时约 750 万美元），按 2022 年的币值约合 3 亿美元。", "She cost about £1.5 million to build (about US$7.5 million then) — roughly US$300 million in 2022 money."),
      ],
      stats: [
        { n: 2229, l: B("船上总人数（约）", "People aboard (approx.)"), fmt: true },
        { n: 1316, l: B("乘客", "Passengers"), fmt: true },
        { n: 913, l: B("船员", "Crew"), fmt: true },
        { n: "£1.5M", l: B("造价（1912）", "Build cost (1912)"), plain: true, brass: true },
      ],
      note: B("不同资料的数字略有出入（总数约 2,200–2,240 人）。", "Sources differ slightly (total roughly 2,200–2,240)."),
    },
    crew: {
      eyebrow: B("船员", "Crew"),
      title: B("后厨与乐队", "The galley and the band"),
      body: [
        B("1912 年的远洋邮轮就像一座漂浮的城市。仅后厨就有约 58 名厨师和厨房工作人员，再加上近 300 名男女服务员，为三个舱等的乘客准备一日三餐。",
          "A 1912 liner was a floating town. The galley alone employed about 58 cooks and kitchen hands, alongside nearly 300 stewards and stewardesses, feeding three classes of passengers."),
        B("船上还有 8 位乐手，分成两支乐队，在头等舱的餐厅、咖啡厅和甲板上演奏。据幸存者回忆，他们一直演奏到最后，8 人全部遇难。",
          "There were also 8 musicians in two ensembles, playing in the first-class dining saloon, the café and on deck. Survivors recalled that they played to the end; all 8 were lost."),
      ],
      stats: [
        { n: 58, l: B("厨师与厨房人员（约）", "Cooks & kitchen staff (approx.)"), fmt: true },
        { n: 292, l: B("男女服务员（约）", "Stewards & stewardesses (approx.)"), fmt: true },
        { n: 8, l: B("乐手（全部遇难）", "Musicians (all lost)"), fmt: true, brass: true },
      ],
      note: B("数字来自公开史料汇编，各来源略有差异。", "Figures come from public compilations and vary a little by source."),
    },
  };

  const ZONES = [
    { id: "first", color: "#d1a94e", name: B("头等舱", "First class"), count: B("325 人", "325 people"),
      detail: B("位于船体中部、最高也最平稳的甲板（A–E 层）：大楼梯、餐厅、咖啡厅、图书室，还有泳池。", "Midships on the highest, steadiest decks (A–E): the Grand Staircase, dining saloon, café, library — even a swimming pool.") },
    { id: "second", color: "#7fd3e0", name: B("二等舱", "Second class"), count: B("285 人", "285 people"),
      detail: B("位于头等舱后方的 D–G 层，有独立的餐厅、图书室和吸烟室，设施相当舒适。", "Aft of first class on D–G, with its own dining room, library and smoking room — comfortable by any standard.") },
    { id: "third", color: "#9fb48a", name: B("三等舱", "Third class"), count: B("706 人", "706 people"),
      detail: B("集中在船头和船尾较低的甲板（E–G 层），以多人舱为主，另有公共餐厅和休息室。", "Mostly fore and aft on the lower decks (E–G): shared cabins plus a public dining room and common rooms.") },
    { id: "crew", color: "#c97b63", name: B("船员区", "Crew & engines"), count: B("约 913 人", "about 913 people"),
      detail: B("锅炉舱、机舱和煤舱占据最底层；水手、服务员等人员的住处分布在船头和各层。", "Boiler rooms, engines and coal bunkers fill the lowest levels; crew quarters are spread through the bow and decks.") },
    { id: "bulk", color: "#7fd3e0", name: B("水密舱", "Watertight compartments"), count: B("16 个", "16 of them"),
      detail: B("15 道横向舱壁把船体分成 16 个舱室。设计上最前面的 4 个舱室进水她仍能浮着，但那晚被冰山划开的至少有 5 个。", "15 transverse bulkheads divide the hull into 16 compartments. She could float with the first four flooded — that night at least five were breached.") },
  ];
  const SECTION_TEXT = {
    eyebrow: B("船舱分区", "How the ship was divided"),
    title: B("船舱被分成了几个部分？", "How many parts was the ship divided into?"),
    body: B("三个舱等占据不同的位置与甲板，船员和锅炉舱在最底层，船体内部还被分成 16 个水密舱。点击下面的色块查看。", "Three passenger classes on different decks, crew and boilers below, and 16 watertight compartments inside the hull. Tap a colour to explore."),
    hint: B("点击上面的色块 ↑", "Tap a colour above ↑"),
    note: B("示意图，并非精确的总布置图。", "Schematic only — not an exact general-arrangement plan."),
  };

  const PORTS = { S: B("南安普顿", "Southampton"), C: B("瑟堡", "Cherbourg"), Q: B("皇后镇（今科布）", "Queenstown (now Cobh)") };
  const CLASSES = { 1: B("头等舱", "First class"), 2: B("二等舱", "Second class"), 3: B("三等舱", "Third class") };

  /* ----------------------------------------------------------------- scenes */
  const SCENES = [
    { id: "map", kind: "map", next: "fade" },
    { id: "poster", img: "05-poster.jpg", w: 365, h: 547, fit: "contain", maxH: 0.82, zoom: 0.07, next: "fade" },
    { id: "diver", img: "01-diver.jpg", w: 335, h: 597, fit: "scroll", tall: 2.3, zoom: 0, depth: true, next: "sink" },
    { id: "bow", img: "02-bow.jpg", w: 1400, h: 788, fit: "cover", fx: 0.72, fy: 0.55, zoom: 0.2, depth: true,
      hotspots: [{ id: "bow", x: 77, y: 63, tag: B("船艏的边缘", "Edge of the bow") }], next: "fade" },
    { id: "capstans", img: "03-capstans.jpg", w: 1400, h: 805, fit: "cover", fx: 0.455, fy: 0.62, zoom: 0.16, depth: true,
      hotspots: [{ id: "people", x: 57, y: 73, tag: B("绞盘", "Capstan") }, { id: "crew", x: 34, y: 52, tag: B("系缆桩", "Bollards") }], next: "door" },
    { id: "cabin", img: "04-cabin-wall.jpg", w: 1600, h: 1600, fit: "cover", fx: 0.28, fy: 0.3, zoom: 0.14, depth: true,
      hotspots: [{ id: "sections", x: 12, y: 24, tag: B("窗", "Window"), cls: "window" }], next: "fade" },
    { id: "window", img: "06-open-window.jpg", w: 1500, h: 958, fit: "cover", fx: 0.7, fy: 0.45, zoom: 0.2, depth: true, gate: true,
      hotspots: [{ id: "window", x: 78.5, y: 42, tag: B("进去", "Enter"), cls: "window" }], next: "black" },
    { id: "stairs", ship: true, end: true, img: "07-grand-staircase.jpg", w: 736, h: 404, fit: "cover", fx: 0.3, fy: 0.4, zoom: 0.08 },
  ];
  const indexOf = (id) => SCENES.findIndex((s) => s.id === id);

  /* ------------------------------------------------------------------ state */
  const el = {
    app: $("#app"), scenes: $("#scenes"), card: $("#card"), cardBody: $("#card-body"), cardClose: $("#card-close"),
    caption: $("#caption"), capEye: $("#cap-eyebrow"), capLine: $("#cap-line"), hint: $("#hint"), hintText: $("#hint-text"),
    veil: $("#veil"), door: $("#door"), gauge: $("#gauge"), depth: $("#depth"), found: $("#found"), surface: $("#surface"),
    warp: $("#warp-text"), snow: $("#snow"), cont: $("#continue"),
  };
  let idx = 0;
  let p = 0; // smoothed progress 0..1
  let pt = 0; // target progress
  let busy = false;
  let cardOpen = false;
  let cardOnClose = null;
  const foundSet = new Set();
  const gateOpen = {};
  let passenger = null;
  let vw = innerWidth, vh = innerHeight;
  const TOTAL_HOTSPOTS = SCENES.reduce((n, s) => n + (s.hotspots ? s.hotspots.length : 0), 0);

  /* --------------------------------------------------------------- build DOM */
  function buildScene(def) {
    const s = document.createElement("section");
    s.className = "scene";
    s.dataset.id = def.id;
    if (def.kind === "map") {
      s.innerHTML = `<canvas id="map" aria-hidden="true"></canvas>
        <button id="marker" type="button"><span class="core"></span><span class="tag"></span></button>
        <div class="map-readout"><div class="stage"></div><div class="coords"></div></div>`;
    } else {
      const url = `${BASE}assets/${def.img}`;
      s.innerHTML = `<div class="bg" style="background-image:url('${url}')"></div>
        <div class="frame"><img src="${url}" alt="" draggable="false" />${(def.hotspots || []).map((h) =>
          `<button class="hotspot ${h.cls || ""}" type="button" data-hs="${h.id}" style="left:${h.x}%;top:${h.y}%"><span class="core"></span><span class="tag"></span></button>`).join("")}</div>
        <div class="shade"></div><div class="tint"></div>`;
    }
    el.scenes.appendChild(s);
    def.el = s;
    def.frame = $(".frame", s);
    def.tint = $(".tint", s);
  }
  SCENES.forEach(buildScene);

  function layoutScene(def) {
    if (!def.frame) return;
    const r = def.w / def.h;
    let w, h;
    if (def.fit === "scroll") {
      // tall strip: the picture itself scrolls past the viewport as the diver descends
      h = vh * def.tall; w = h * r;
      def.frame.style.left = `${(vw - w) / 2}px`;
      def.frame.style.top = "0px";
      def.scrollH = h - vh;
    } else if (def.fit === "contain") {
      h = Math.min(vh * def.maxH, vw / r);
      w = h * r;
      def.frame.style.left = `${(vw - w) / 2}px`;
      def.frame.style.top = `${(vh - h) / 2}px`;
    } else if (vw / vh < 0.85 && !def.keepCover) {
      // portrait phones: letterbox the picture (blurred copy fills the rest) so every hotspot stays on screen
      w = clamp(vw * 1.7, vw, Math.max(vw, vh * r));
      h = w / r;
      const left = clamp(vw / 2 - def.fx * w, vw - w, 0);
      def.frame.style.left = `${left}px`;
      def.frame.style.top = `${(vh - h) / 2}px`;
    } else {
      w = Math.max(vw, vh * r);
      h = w / r;
      const left = clamp(vw / 2 - def.fx * w, vw - w, 0);
      const top = clamp(vh / 2 - def.fy * h, vh - h, 0);
      def.frame.style.left = `${left}px`;
      def.frame.style.top = `${top}px`;
    }
    def.frame.style.width = `${w}px`;
    def.frame.style.height = `${h}px`;
    const hs = def.hotspots && def.hotspots[0];
    def.frame.style.setProperty("--ox", `${hs ? hs.x : 50}%`);
    def.frame.style.setProperty("--oy", `${hs ? hs.y : 50}%`);
  }

  function applyLang() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((n) => { const v = UI[lang][n.dataset.i18n]; if (v) n.textContent = v; });
    document.querySelectorAll("[data-i18n-aria]").forEach((n) => { const v = UI[lang][n.dataset.i18nAria]; if (v) n.setAttribute("aria-label", v); });
    $("#lang").textContent = lang === "zh" ? "EN" : "中";
    SCENES.forEach((d) => (d.hotspots || []).forEach((h) => {
      const b = $(`[data-hs="${h.id}"]`, d.el);
      if (b) { $(".tag", b).textContent = tx(h.tag); b.setAttribute("aria-label", tx(h.tag)); }
    }));
    updateFound();
    refreshCaption();
    if (SCENES[idx].kind === "map") mapText();
  }
  function updateFound() {
    el.found.textContent = foundSet.size ? `✦ ${ui("found")} ${foundSet.size}/${TOTAL_HOTSPOTS}` : "";
  }
  function refreshCaption() {
    const def = SCENES[idx];
    const c = CAPTIONS[def.id];
    el.capEye.textContent = tx(c[0]);
    el.capLine.textContent = tx(c[1]);
    el.hintText.textContent = tx(HINTS[def.id] || "");
  }

  /* -------------------------------------------------------------- marine snow */
  const snow = { ctx: el.snow.getContext("2d"), parts: [], speed: 0.3, targetSpeed: 0.3, alpha: 0 };
  function initSnow() {
    el.snow.width = vw * devicePixelRatio; el.snow.height = vh * devicePixelRatio;
    snow.parts = Array.from({ length: Math.round(clamp(vw * vh / 9000, 50, 170)) }, () => ({
      x: Math.random() * vw, y: Math.random() * vh, r: 0.6 + Math.random() * 1.9, z: 0.3 + Math.random() * 0.9, ph: Math.random() * 6.28,
    }));
  }
  function drawSnow(t) {
    const c = snow.ctx; c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); c.clearRect(0, 0, vw, vh);
    snow.speed += (snow.targetSpeed - snow.speed) * 0.05;
    const on = SCENES[idx].kind !== "map" && idx >= 1 && !SCENES[idx].ship;
    snow.alpha += ((on ? 1 : 0) - snow.alpha) * 0.04;
    if (snow.alpha < 0.01) return;
    c.fillStyle = "rgba(220,240,250,1)";
    for (const q of snow.parts) {
      q.y -= snow.speed * q.z * (REDUCED ? 0.2 : 1);
      q.x += Math.sin(t / 1800 + q.ph) * 0.15;
      if (q.y < -4) { q.y = vh + 4; q.x = Math.random() * vw; }
      if (q.y > vh + 4) { q.y = -4; q.x = Math.random() * vw; }
      c.globalAlpha = snow.alpha * (0.15 + q.z * 0.35);
      c.beginPath(); c.arc(q.x, q.y, q.r * q.z, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
  }

  /* --------------------------------------------------------------------- map */
  const SITE = { lon: -49.9469, lat: 41.7325 };
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const mx = (lon) => (lon + 180) / 360;
  const my = (lat) => 0.5 - merc(lat) / (2 * Math.PI);
  const latFromMy = (v) => (Math.atan(Math.sinh((0.5 - v) * 2 * Math.PI)) * 180) / Math.PI;
  const BBOX = [-100, 20, 15, 72];
  const CITIES = [
    { n: B("纽约", "New York"), lon: -74.006, lat: 40.713, z: 0.8 }, { n: B("南安普顿", "Southampton"), lon: -1.404, lat: 50.909, z: 0.8 },
    { n: B("哈利法克斯", "Halifax"), lon: -63.575, lat: 44.649, z: 6 }, { n: B("圣约翰斯", "St. John’s"), lon: -52.713, lat: 47.562, z: 6 },
    { n: B("瑟堡", "Cherbourg"), lon: -1.616, lat: 49.633, z: 3 }, { n: B("皇后镇", "Queenstown"), lon: -8.299, lat: 51.85, z: 3 },
  ];
  const ROUTE = [[-1.404, 50.909], [-1.616, 49.633], [-8.299, 51.85], [SITE.lon, SITE.lat], [-74.006, 40.713]];
  const STAGES = [
    { lon: 12, lat: 30, s: 1.0, name: B("1 / 4 · 世界", "1 / 4 · The world"), sub: B("1912 年 4 月：处女航的目的地——纽约", "April 1912: maiden voyage, bound for New York") },
    { lon: -45, lat: 42, s: 4.5, name: B("2 / 4 · 北大西洋", "2 / 4 · North Atlantic"), sub: B("南安普顿 → 瑟堡 → 皇后镇 → 纽约", "Southampton → Cherbourg → Queenstown → New York") },
    { lon: -52.5, lat: 44.6, s: 20, name: B("3 / 4 · 纽芬兰外海", "3 / 4 · Off Newfoundland"), sub: B("距纽芬兰岛东南约 600 公里", "About 600 km south-east of Newfoundland") },
    { lon: -50.1, lat: 41.8, s: 300, name: B("4 / 4 · 沉没地点", "4 / 4 · The site"), sub: B("北纬 41°43′57″　西经 49°56′49″　水深约 3,840 米", "41°43′57″ N  49°56′49″ W  ·  about 3,840 m deep") },
  ];
  const map = { cv: null, ctx: null, rings: null, stage: 0, cam: { lon: 12, lat: 30, ls: 0 }, tween: null, dirty: true, wheel: 0, lastWheel: 0, flying: false };

  function decodeRing(flat, q) {
    const n = flat.length / 2, X = new Float32Array(n), Y = new Float32Array(n);
    let x = 0, y = 0, lo0 = 999, lo1 = -999, la0 = 999, la1 = -999;
    for (let i = 0; i < n; i++) {
      x += flat[2 * i]; y += flat[2 * i + 1];
      const lon = x / q, lat = clamp(y / q, -84, 84);
      X[i] = mx(lon); Y[i] = my(lat);
      if (lon < lo0) lo0 = lon; if (lon > lo1) lo1 = lon; if (lat < la0) la0 = lat; if (lat > la1) la1 = lat;
    }
    return { X, Y, n, x0: mx(lo0), x1: mx(lo1), y0: my(la1), y1: my(la0), lon0: lo0, lon1: lo1, lat0: la0, lat1: la1 };
  }
  function initMap() {
    const data = window.WORLD_LAND;
    map.cv = $("#map"); map.ctx = map.cv.getContext("2d");
    const fine = data.fine.map((r) => decodeRing(r, data.q));
    const coarse = data.coarse.map((r) => decodeRing(r, data.q)).filter((r) =>
      r.lat1 > -60 && !(r.lon0 <= BBOX[2] && r.lon1 >= BBOX[0] && r.lat0 <= BBOX[3] && r.lat1 >= BBOX[1]));
    map.rings = fine.concat(coarse);
    const st = STAGES[0];
    map.cam = { lon: st.lon, lat: st.lat, ls: Math.log(st.s) };
    $("#marker").addEventListener("click", () => mapAdvance());
    resizeMap();
  }
  function resizeMap() {
    if (!map.cv) return;
    map.cv.width = vw * devicePixelRatio; map.cv.height = vh * devicePixelRatio; map.dirty = true;
  }
  const base = () => Math.max(vw, vh * 1.1);

  function mapText() {
    const s = STAGES[Math.min(map.stage, 3)];
    const sc = SCENES[0].el;
    $(".stage", sc).textContent = `${tx(CAPTIONS.map[0])} · ${tx(s.name)}`;
    el.hintText.textContent = map.stage >= 3 ? tx(B("点击标记 · 下潜", "Click the marker · dive")) : tx(HINTS.map);
    $(".coords", sc).textContent = tx(s.sub);
    $("#marker .tag").textContent = map.stage >= 3 ? tx(B("RMS 泰坦尼克号 · 点击下潜", "RMS Titanic · click to dive")) : tx(B("泰坦尼克号沉没处", "Titanic wreck site"));
    $("#marker").setAttribute("aria-label", map.stage >= 3 ? tx(B("下潜", "Dive")) : tx(B("放大", "Zoom in")));
  }
  function flyTo(target, ms) {
    return new Promise((res) => {
      const from = { ...map.cam };
      const to = { lon: target.lon, lat: target.lat, ls: Math.log(target.s) };
      const t0 = performance.now();
      map.flying = true;
      map.tween = { from, to, t0, ms: REDUCED ? 1 : ms, res };
    });
  }
  async function mapAdvance() {
    if (map.flying || busy) return;
    if (map.stage < 3) {
      map.stage += 1;
      mapText();
      await flyTo(STAGES[map.stage], 2400);
      map.flying = false;
    } else if (!busy) {
      busy = true;
      $("#marker").style.pointerEvents = "none";
      el.hint.classList.add("hide");
      const f = flyTo({ lon: SITE.lon, lat: SITE.lat, s: 12000 }, 2600);
      await wait(1500);
      el.veil.classList.add("on");
      await f; map.flying = false;
      await wait(500);
      busy = false;
      activate(1);
      el.veil.classList.remove("on");
    }
  }
  function mapBack() {
    if (map.flying || busy || map.stage === 0) return;
    map.stage -= 1; mapText(); flyTo(STAGES[map.stage], 1800).then(() => (map.flying = false));
  }
  function drawMap(now) {
    if (map.tween) {
      const tw = map.tween; const k = clamp((now - tw.t0) / tw.ms, 0, 1); const e = ease(k);
      map.cam.ls = lerp(tw.from.ls, tw.to.ls, e);
      const ec = ease(clamp(k * 1.15, 0, 1));
      map.cam.lon = lerp(tw.from.lon, tw.to.lon, ec); map.cam.lat = lerp(tw.from.lat, tw.to.lat, ec);
      map.dirty = true;
      if (k >= 1) { map.tween = null; tw.res(); }
    }
    if (!map.dirty && map.stage < 3) return;
    map.dirty = false;
    const c = map.ctx; c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const worldW = Math.exp(map.cam.ls) * base();
    const cx = mx(map.cam.lon), cy = my(map.cam.lat);
    const X = (u) => (u - cx) * worldW + vw / 2, Y = (v) => (v - cy) * worldW + vh / 2;
    const g = c.createRadialGradient(vw / 2, vh * 0.45, 0, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    g.addColorStop(0, "#0e3a54"); g.addColorStop(1, "#04121c");
    c.fillStyle = g; c.fillRect(0, 0, vw, vh);

    // graticule
    const degPx = worldW / 360;
    const steps = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 30];
    const stepDeg = steps.find((s) => s * degPx >= 90) ?? 30; // smallest spacing that stays ≥ 90 px apart
    c.lineWidth = 1; c.strokeStyle = "rgba(127,211,224,0.12)"; c.fillStyle = "rgba(127,211,224,0.45)"; c.font = "10px system-ui"; c.beginPath();
    const lonL = map.cam.lon - (vw / 2 / worldW) * 360, lonR = map.cam.lon + (vw / 2 / worldW) * 360;
    for (let lo = Math.ceil(lonL / stepDeg) * stepDeg; lo <= lonR; lo += stepDeg) { const x = X(mx(lo)); c.moveTo(x, 0); c.lineTo(x, vh); }
    const latT = latFromMy(cy - vh / 2 / worldW), latB = latFromMy(cy + vh / 2 / worldW);
    for (let la = Math.ceil(latB / stepDeg) * stepDeg; la <= latT; la += stepDeg) { const y = Y(my(la)); c.moveTo(0, y); c.lineTo(vw, y); }
    c.stroke();

    // land
    c.fillStyle = "#17465e"; c.strokeStyle = "rgba(127,211,224,0.55)"; c.lineWidth = 0.9; c.lineJoin = "round";
    for (const r of map.rings) {
      const sx0 = X(r.x0), sx1 = X(r.x1), sy0 = Y(r.y0), sy1 = Y(r.y1);
      if (sx1 < -10 || sx0 > vw + 10 || sy1 < -10 || sy0 > vh + 10) continue;
      if (sx1 - sx0 < 1.2 && sy1 - sy0 < 1.2) continue;
      c.beginPath();
      let lx = X(r.X[0]), ly = Y(r.Y[0]), pu = r.X[0]; c.moveTo(lx, ly);
      for (let i = 1; i < r.n; i++) {
        const u = r.X[i], x = X(u), y = Y(r.Y[i]);
        if (Math.abs(u - pu) > 0.5) { c.closePath(); c.moveTo(x, y); lx = x; ly = y; pu = u; continue; } // antimeridian
        pu = u;
        if (Math.abs(x - lx) + Math.abs(y - ly) < 0.7) continue;
        c.lineTo(x, y); lx = x; ly = y;
      }
      c.closePath(); c.fill(); c.stroke();
    }

    // route
    const pts = ROUTE.map(([lo, la]) => [X(mx(lo)), Y(my(la))]);
    c.lineWidth = 1.6; c.strokeStyle = "#d1a94e"; c.setLineDash([]);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= 3; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    c.setLineDash([3, 6]); c.strokeStyle = "rgba(209,169,78,0.6)"; c.beginPath(); c.moveTo(pts[3][0], pts[3][1]); c.lineTo(pts[4][0], pts[4][1]); c.stroke(); c.setLineDash([]);

    // labels
    const zoom = Math.exp(map.cam.ls);
    c.fillStyle = "#efe6d2"; c.textAlign = "left"; c.font = "600 12px system-ui, sans-serif";
    for (const ct of CITIES) {
      if (zoom < ct.z) continue;
      const x = X(mx(ct.lon)), y = Y(my(ct.lat));
      if (x < 0 || x > vw || y < 0 || y > vh) continue;
      c.beginPath(); c.arc(x, y, 3, 0, 6.283); c.fill(); c.fillText(tx(ct.n), x + 7, y + 4);
    }
    if (zoom > 1.5 && zoom < 60) {
      c.save(); c.globalAlpha = clamp(1 - Math.abs(Math.log(zoom / 6)) / 2.2, 0, 0.55); c.fillStyle = "#7fd3e0";
      c.font = `italic ${Math.round(clamp(worldW / 90, 14, 46))}px Georgia, serif`; c.textAlign = "center";
      c.fillText(tx(B("北 大 西 洋", "NORTH ATLANTIC OCEAN")), X(mx(-38)), Y(my(37)));
      c.restore();
    }

    // site + sonar
    const sx = X(mx(SITE.lon)), sy = Y(my(SITE.lat));
    const mk = $("#marker");
    mk.style.transform = `translate(${sx}px, ${sy}px)`;
    mk.style.visibility = sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40 ? "hidden" : "visible";
    if (map.stage >= 3 || zoom > 100) {
      const t = (now / 1800) % 1;
      c.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) {
        const rr = ((t + k / 3) % 1) * Math.min(vw, vh) * 0.45;
        c.strokeStyle = `rgba(209,169,78,${(1 - rr / (Math.min(vw, vh) * 0.45)) * 0.7})`;
        c.beginPath(); c.arc(sx, sy, rr, 0, 6.283); c.stroke();
      }
    }
  }

  /* ------------------------------------------------------------ scene control */
  function setProgress(def, v) {
    if (!def.frame) return;
    const s = 1 + def.zoom * v;
    const ty = def.fit === "scroll" ? -v * (def.scrollH || 0) : -(def.drift || 0.03) * v * vh;
    def.frame.style.transform = def.fit === "scroll" ? `translate3d(0, ${ty}px, 0)` : `translate3d(0, ${ty}px, 0) scale(${s})`;
    if (def.id === "diver") {
      def.tint.style.opacity = String(v * 0.6);
      el.surface.style.opacity = String(clamp(1 - v * 3.2, 0, 1) * 0.9);
      el.surface.style.transform = `translateY(${-v * 220}%)`;
      el.depth.textContent = Math.round(v * 3840).toLocaleString("en-US");
    }
    gaugeSet(def, v);
  }
  function gaugeSet(def, v) {
    let d = 0;
    if (def.id === "diver") d = v * 3840; else if (idx > indexOf("diver")) d = 3840;
    const k = d / 3840;
    $(".gauge-fill", el.gauge).style.height = `${k * 100}%`;
    $(".gauge-dot", el.gauge).style.top = `${k * 100}%`;
    el.depth.textContent = Math.round(d).toLocaleString("en-US");
  }

  function activate(to) {
    const prev = SCENES[idx];
    prev.el.classList.remove("active");
    idx = to; p = 0; pt = 0;
    const def = SCENES[to];
    def.el.classList.add("active");
    if (def.frame) { layoutScene(def); setProgress(def, 0); }
    el.gauge.classList.toggle("on", to >= indexOf("diver") && !def.ship);
    if (def.id !== "diver") { el.surface.style.opacity = "0"; }
    snow.targetSpeed = def.id === "diver" ? 1.2 : 0.35;
    el.caption.classList.toggle("hide", def.id === "stairs" || def.kind === "map");
    el.hint.classList.toggle("hide", !HINTS[def.id] || !tx(HINTS[def.id]));
    refreshCaption();
    gaugeSet(def, 0);
    const hs = $$all(".hotspot:not(.found)", def.el);
    hs.forEach((b) => b.classList.add("attention"));
    setTimeout(() => hs.forEach((b) => b.classList.remove("attention")), 4500);
    el.cont.hidden = false;
  }
  const $$all = (s, r = document) => Array.from(r.querySelectorAll(s));

  async function go(to, kind) {
    busy = true; closeCard(true);
    el.caption.classList.add("hide"); el.hint.classList.add("hide");
    if (kind === "fade") { activate(to); await wait(1000); }
    else if (kind === "sink") {
      el.veil.classList.add("on"); await wait(900); activate(to); await wait(350); el.veil.classList.remove("on"); await wait(900);
    } else if (kind === "black") {
      el.veil.style.transitionDuration = "1.3s"; el.veil.classList.add("on"); await wait(1400); activate(to); await wait(500);
      el.veil.classList.remove("on"); await wait(1400); el.veil.style.transitionDuration = "";
    } else if (kind === "door") {
      el.veil.classList.add("on"); await wait(1000);
      activate(to);
      el.door.className = "on"; el.veil.classList.remove("on");
      await wait(900);
      el.door.classList.add("lit"); await wait(900);
      el.door.classList.add("open"); await wait(1500);
      el.door.classList.add("fade"); await wait(1300);
      el.door.className = "";
    }
    el.caption.classList.toggle("hide", SCENES[idx].id === "stairs");
    busy = false;
  }
  function next() {
    const def = SCENES[idx];
    if (def.end || busy) return;
    const to = idx + 1;
    go(to, def.next || "fade");
  }

  /* ----------------------------------------------------------------- input */
  function step(delta) {
    if (busy || cardOpen) return;
    const def = SCENES[idx];
    if (def.kind === "map") { if (delta > 0) mapAdvance(); else mapBack(); return; }
    pt = clamp(pt + delta, 0, 1);
    if (def.gate && !gateOpen[def.id]) pt = Math.min(pt, 0.9);
    if (def.end) pt = Math.min(pt, 0.4);
  }
  el.app.addEventListener("wheel", (e) => {
    if (e.target.closest("#card")) return;
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    snow.speed += clamp(d / 400, -2, 2);
    if (SCENES[idx].kind === "map") {
      map.wheel += d;
      if (Math.abs(map.wheel) > 110) { const dir = Math.sign(map.wheel); map.wheel = 0; step(dir); }
      return;
    }
    step(d / 1500);
  }, { passive: false });
  let touchY = null;
  el.app.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  el.app.addEventListener("touchmove", (e) => {
    if (touchY == null || e.target.closest("#card")) return;
    const y = e.touches[0].clientY; const dy = touchY - y; touchY = y;
    if (SCENES[idx].kind === "map") { map.wheel += dy * 3; if (Math.abs(map.wheel) > 110) { const dir = Math.sign(map.wheel); map.wheel = 0; step(dir); } return; }
    snow.speed += clamp(dy / 80, -1, 1);
    step(dy / (vh * 0.9));
  }, { passive: true });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cardOpen) { closeCard(); return; }
    if (e.target.closest && e.target.closest("#card")) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); step(SCENES[idx].kind === "map" ? 1 : 0.3); }
    else if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); step(SCENES[idx].kind === "map" ? -1 : -0.3); }
  });
  el.cont.addEventListener("click", () => step(SCENES[idx].kind === "map" ? 1 : 0.34));
  $("#lang").addEventListener("click", () => { lang = lang === "zh" ? "en" : "zh"; store.set("dive-lang", lang); applyLang(); if (passenger && SCENES[idx].id === "stairs") showDossier(true); });
  $("#restart").addEventListener("click", () => location.reload());

  /* ------------------------------------------------------------------- cards */
  const fmt = (n) => n.toLocaleString("en-US");
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function openCard(html, opts = {}) {
    cardOpen = true; cardOnClose = opts.onClose || null;
    el.cardBody.innerHTML = html;
    el.card.classList.toggle("wide", !!opts.wide);
    el.card.classList.toggle("noclose", !!opts.noClose);
    el.cardClose.hidden = !!opts.noClose;
    el.card.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.card.classList.add("show")));
    if (!opts.noClose) setTimeout(() => el.cardClose.focus({ preventScroll: true }), 60);
    el.hint.classList.add("hide"); el.caption.classList.add("hide");
    countUp();
  }
  function closeCard(silent) {
    if (!cardOpen) return;
    cardOpen = false;
    el.card.classList.remove("show");
    const cb = cardOnClose; cardOnClose = null;
    setTimeout(() => { if (!cardOpen) el.card.hidden = true; }, 500);
    if (!silent) { el.hint.classList.toggle("hide", !tx(HINTS[SCENES[idx].id] || "")); el.caption.classList.toggle("hide", SCENES[idx].id === "stairs"); if (cb) cb(); }
  }
  el.cardClose.addEventListener("click", () => closeCard());

  function statsHtml(stats) {
    return `<div class="stats">${stats.map((s) =>
      `<div class="stat ${s.brass ? "brass" : ""}"><b ${s.plain ? "" : `data-count="${s.n}"`}>${s.plain ? esc(s.n) : "0"}</b><span>${esc(tx(s.l))}</span></div>`).join("")}</div>`;
  }
  function cardHtml(c) {
    return `<p class="eyebrow">${esc(tx(c.eyebrow))}</p><h2 id="card-title">${esc(tx(c.title))}</h2>` +
      c.body.map((b) => `<p>${esc(tx(b))}</p>`).join("") + (c.stats ? statsHtml(c.stats) : "") +
      (c.note ? `<p class="note">${esc(tx(c.note))}</p>` : "");
  }
  function countUp() {
    $$all("[data-count]", el.card).forEach((n) => {
      const target = Number(n.dataset.count); const t0 = performance.now(); const dur = REDUCED ? 1 : 1100;
      const tick = (now) => { const k = clamp((now - t0) / dur, 0, 1); n.textContent = fmt(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }
  function markFound(id, btn) {
    foundSet.add(id); if (btn) btn.classList.add("found"); updateFound();
  }

  function openSections(btn) {
    const chips = ZONES.map((z) => `<button class="zone-chip" type="button" data-z="${z.id}" style="color:${z.color}">${esc(tx(z.name))} · ${esc(tx(z.count))}</button>`).join("");
    const svg = `
<svg class="section-svg" viewBox="0 0 880 270" role="img" aria-label="${esc(tx(B("泰坦尼克号剖面示意图", "Stylised cross-section of Titanic")))}">
  <defs><clipPath id="hullclip"><path d="M28 132 L862 132 L846 188 Q822 238 782 238 L98 238 Q58 232 50 206 Z"/></clipPath></defs>
  <g class="ship"><rect x="150" y="92" width="570" height="40"/><rect x="150" y="92" width="570" height="16" opacity=".5"/>
    ${[270, 350, 430, 510].map((x) => `<rect x="${x}" y="36" width="44" height="56"/><rect x="${x}" y="36" width="44" height="9" fill="#02080e"/>`).join("")}
    <line x1="118" y1="132" x2="118" y2="52"/><line x1="806" y1="132" x2="806" y2="62"/></g>
  <path class="hull" d="M28 132 L862 132 L846 188 Q822 238 782 238 L98 238 Q58 232 50 206 Z"/>
  <g clip-path="url(#hullclip)">
    <rect class="zone" data-z="third" x="28" y="132" width="86" height="106" fill="${ZONES[2].color}" style="color:${ZONES[2].color};transition-delay:1.9s"/>
    <rect class="zone" data-z="third" x="640" y="132" width="240" height="106" fill="${ZONES[2].color}" style="color:${ZONES[2].color};transition-delay:1.9s"/>
    <rect class="zone" data-z="second" x="114" y="132" width="186" height="64" fill="${ZONES[1].color}" style="color:${ZONES[1].color};transition-delay:1.4s"/>
    <rect class="zone" data-z="crew" x="114" y="196" width="526" height="42" fill="${ZONES[3].color}" style="color:${ZONES[3].color};transition-delay:2.4s"/>
    <rect class="zone" data-z="first" x="300" y="132" width="340" height="64" fill="${ZONES[0].color}" style="color:${ZONES[0].color};transition-delay:0.9s"/>
  </g>
  <rect class="zone" data-z="first" x="270" y="92" width="400" height="40" fill="${ZONES[0].color}" style="color:${ZONES[0].color};transition-delay:0.9s"/>
  <g clip-path="url(#hullclip)">${Array.from({ length: 15 }, (_, i) => {
    const x = 98 + ((782 - 98) * (i + 1)) / 16;
    return `<line class="bulk" data-z="bulk" x1="${x}" y1="196" x2="${x}" y2="238" style="transition-delay:${3 + i * 0.09}s"/>`; }).join("")}</g>
  <g class="labels">
    <text x="470" y="168" text-anchor="middle">${esc(tx(B("头等舱", "FIRST")))}</text><text x="207" y="168" text-anchor="middle">${esc(tx(B("二等舱", "SECOND")))}</text>
    <text x="71" y="188" text-anchor="middle">${esc(tx(B("三等", "THIRD")))}</text><text x="750" y="188" text-anchor="middle">${esc(tx(B("三等舱", "THIRD")))}</text>
    <text x="377" y="222" text-anchor="middle">${esc(tx(B("锅炉舱 · 机舱 · 船员", "BOILERS · ENGINES · CREW")))}</text>
  </g>
</svg>`;
    openCard(`<p class="eyebrow">${esc(tx(SECTION_TEXT.eyebrow))}</p><h2 id="card-title">${esc(tx(SECTION_TEXT.title))}</h2>
      <p>${esc(tx(SECTION_TEXT.body))}</p>${svg}<div class="zone-chips">${chips}</div>
      <p class="zone-detail" id="zone-detail">${esc(tx(SECTION_TEXT.hint))}</p><p class="note">${esc(tx(SECTION_TEXT.note))}</p>`,
      { wide: true, onClose: () => markFound("sections", btn) });
    const sv = $(".section-svg", el.card);
    setTimeout(() => sv.classList.add("go"), 120);
    $$all(".zone-chip", el.card).forEach((chip) => chip.addEventListener("click", () => {
      const z = ZONES.find((q) => q.id === chip.dataset.z);
      $$all(".zone-chip", el.card).forEach((c2) => c2.classList.toggle("on", c2 === chip));
      $$all(".zone", sv).forEach((n) => { n.classList.toggle("hi", n.dataset.z === z.id); n.classList.toggle("dim", z.id !== "bulk" && n.dataset.z !== z.id); });
      $$all(".bulk", sv).forEach((n) => { n.style.stroke = z.id === "bulk" ? "#fff" : ""; n.style.strokeWidth = z.id === "bulk" ? "2.4" : ""; });
      $("#zone-detail", el.card).textContent = tx(z.detail);
    }));
  }

  /* ---------------------------------------------------------------- hotspots */
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".hotspot");
    if (!b || busy || cardOpen) return;
    const id = b.dataset.hs;
    b.classList.remove("attention");
    if (CARDS[id]) openCard(cardHtml(CARDS[id]), { onClose: () => markFound(id, b) });
    else if (id === "sections") openSections(b);
    else if (id === "window") enterWindow(b);
  });

  async function enterWindow(btn) {
    // clicking "Enter" crosses over immediately: full black, then typewriter text, then the staircase
    markFound("window", btn); gateOpen.window = true; busy = true; passenger = pickPassenger();
    closeCard(true);
    el.caption.classList.add("hide"); el.hint.classList.add("hide");
    btn.classList.add("found");
    SCENES[idx].el.classList.add("opening");
    await wait(900);
    el.veil.style.transitionDuration = "1.2s"; el.veil.classList.add("on"); await wait(1300);
    activate(indexOf("stairs")); SCENES[idx].el.classList.add("hold");
    el.caption.classList.add("hide"); el.hint.classList.add("hide");
    SCENES[indexOf("window")].el.classList.remove("opening");
    await wait(300);
    const q = passenger;
    const lines = [
      tx(B("你穿越了。", "You crossed over.")),
      tx(B(`你是 ${q.name}。`, `You are ${q.name}.`)),
    ];
    const date = tx(B("1912 年 4 月 10 日 · 南安普顿", "10 April 1912 · Southampton"));
    el.warp.innerHTML = '<div class="tw"><span class="big"></span><span class="big second"></span><span class="sub"></span></div>';
    el.warp.classList.add("on", "black");
    const [a, b2, sub] = $$all(".tw span", el.warp);
    await typeInto(a, lines[0], 90); await wait(500);
    await typeInto(b2, lines[1], 90); await wait(500);
    await typeInto(sub, date, 35); await wait(1500);
    el.warp.classList.remove("on");
    await wait(700);
    el.veil.classList.remove("on"); await wait(1300); el.veil.style.transitionDuration = "";
    el.warp.classList.remove("black"); el.warp.innerHTML = "";
    SCENES[idx].el.classList.remove("hold");
    busy = false;
    showDossier();
  }
  function typeInto(node, text, ms) {
    return new Promise((res) => {
      if (REDUCED) { node.textContent = text; return res(); }
      let i = 0; node.classList.add("typing");
      const t = setInterval(() => {
        node.textContent = text.slice(0, ++i);
        if (i >= text.length) { clearInterval(t); node.classList.remove("typing"); res(); }
      }, ms);
    });
  }

  function pickPassenger() {
    const rows = window.DIVE_PASSENGERS;
    const buf = new Uint32Array(1); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(buf) : (buf[0] = Math.floor(Math.random() * 4294967295));
    const r = rows[buf[0] % rows.length];
    return { id: r[0], name: r[1], pclass: r[2], sex: r[3], age: r[4], sibSp: r[5], parch: r[6], ticket: r[7], fare: r[8], embarked: r[9], cabin: r[10] };
  }

  function showDossier(instant) {
    const q = passenger; if (!q) return;
    const age = q.age == null ? tx(B("未记录", "not recorded")) : q.age < 1 ? tx(B(`${Math.round(q.age * 12)} 个月`, `${Math.round(q.age * 12)} months`)) : tx(B(`${Math.floor(q.age)} 岁`, `${Math.floor(q.age)} years`));
    const port = q.embarked ? tx(PORTS[q.embarked]) : tx(B("未记录", "not recorded"));
    const fam = q.sibSp + q.parch;
    const famText = fam === 0 ? tx(B("独自出行", "travelling alone")) : tx(B(`${fam} 位同行亲属`, `${fam} relative${fam > 1 ? "s" : ""} aboard`));
    const cabin = q.cabin ? q.cabin : tx(B("未记录（数据缺失）", "not recorded in the data"));
    const sex = q.sex === "female" ? tx(B("女", "Female")) : tx(B("男", "Male"));
    const lede = tx(B(
      `你在${port}登上了这艘船，持${tx(CLASSES[q.pclass])}船票，${famText}。`,
      `You boarded at ${port} on a ${tx(CLASSES[q.pclass]).toLowerCase()} ticket, ${famText}.`));
    const rows = [
      [B("舱等", "Class"), tx(CLASSES[q.pclass])], [B("年龄", "Age"), age], [B("性别", "Sex"), sex], [B("登船港", "Embarked"), port],
      [B("船票号", "Ticket"), q.ticket], [B("票价", "Fare"), `£${q.fare.toFixed(2)}`], [B("舱位", "Cabin"), cabin], [B("同行亲属", "Family aboard"), String(fam)],
    ];
    const facts = rows.map(([k, v], i) => `<div style="animation-delay:${instant ? 0 : 0.5 + i * 0.12}s"><dt>${esc(tx(k))}</dt><dd>${esc(v)}</dd></div>`).join("");
    openCard(`<div class="dossier"><div class="dossier-eyebrow"><p class="eyebrow">${esc(tx(B("乘客档案", "Passenger record")))} · No. ${q.id}</p>
      <span class="sealed">${esc(tx(B("历史结局 · 封存", "Historical outcome · sealed")))}</span></div>
      <h2 id="card-title">${esc(q.name)}</h2><p class="lede">${esc(lede)}</p><dl class="facts">${facts}</dl>
      <p class="note">${esc(tx(B("这是 Kaggle 泰坦尼克号数据集中的一条真实记录，由系统随机分配给你。缺失的信息保持“未记录”，不做编造。下一章将揭开他/她那一夜的经历。", "This is a real row from the Kaggle Titanic dataset, assigned to you at random. Missing fields stay “not recorded” — nothing is invented. The next chapter follows this person through the night.")))}</p>
      <div class="actions"><button class="btn" type="button" disabled style="opacity:.55;cursor:not-allowed">${esc(tx(B("下一章：4 月 14 日之夜（开发中）", "Next: the night of 14 April (in development)")))}</button>
      <button class="btn ghost" type="button" id="again">${esc(tx(B("重新潜水", "Dive again")))}</button>
      <a class="btn ghost" href="${BASE}../classic.html">${esc(tx(B("经典版游戏", "Classic edition")))}</a></div></div>`, { wide: true, noClose: true });
    $("#again", el.card).addEventListener("click", () => location.reload());
  }

  /* -------------------------------------------------------------- main loop */
  function resize() {
    vw = innerWidth; vh = innerHeight;
    STAGES[0].lon = vw / vh < 0.85 ? -15 : 12; // portrait phones: keep the wreck-site marker on screen
    if (map.stage === 0 && !map.tween) map.cam.lon = STAGES[0].lon;
    SCENES.forEach(layoutScene); initSnow(); resizeMap();
    const def = SCENES[idx]; if (def.frame) setProgress(def, p);
  }
  addEventListener("resize", resize);

  function loop(now) {
    const def = SCENES[idx];
    if (def.kind === "map") drawMap(now);
    else {
      p += (pt - p) * (REDUCED ? 1 : 0.1);
      if (Math.abs(pt - p) < 0.0005) p = pt;
      setProgress(def, p);
      if (!busy && !cardOpen && !def.end && pt >= 1 && p > 0.985) next();
    }
    snow.targetSpeed = def.id === "diver" ? 0.4 + (pt - p) * 40 + 0.9 : 0.35;
    snow.speed = clamp(snow.speed, -3, 4);
    drawSnow(now);
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------- init */
  resize();
  initMap();
  SCENES[0].el.classList.add("active");
  el.caption.classList.add("hide");
  applyLang();
  mapText();
  el.hint.classList.remove("hide");
  requestAnimationFrame(loop);
  window.__dive = { get idx() { return idx; }, SCENES, get passenger() { return passenger; }, go, step, get busy() { return busy; } };
})();
