/* VR Scene Director — popup.js (full replacement)
   - Layman-language guidance
   - Auto tone detection
   - Camera presets per tone
   - History + favourites + share links
   - Voice + copy helpers
   - Fixes history text wrapping (no vertical letters)
*/

// ---------- Small DOM helpers ----------
const $ = id => document.getElementById(id);
const setText = (el, val) => { if (el) el.textContent = val; };
const show = (el, on) => { if (el) el.style.display = on ? "" : "none"; };

// ---------- Elements (must match popup.html IDs) ----------
const storyInput   = $("storyInput");
const analyseBtn   = $("analyseBtn");
const clearBtn     = $("clearBtn");
const copyBtn      = $("copyBtn");
const voiceBtn     = $("voiceBtn");

const toneBadge    = $("toneBadge");
const guidanceWrap = $("guidance");
const viewerPos    = $("viewerPos");
const envLayout    = $("envLayout");
const lighting     = $("lighting");
const emotional    = $("emotional");

// Camera controls
const dist     = $("dist");
const height   = $("height");
const orbit    = $("orbit");
const fov      = $("fov");
const distVal  = $("distVal");
const heightVal= $("heightVal");
const orbitVal = $("orbitVal");
const fovVal   = $("fovVal");
const camPreview = $("camPreview");
const copyCamBtn = $("copyCamBtn");

// History controls
const toggleHistoryBtn = $("toggleHistoryBtn");
const clearHistoryBtn  = $("clearHistoryBtn");
const downloadBtn      = $("downloadBtn");
const historyWrap      = $("historyWrap");
const historyList      = $("historyList");
const favBlock         = $("favBlock");
const favList          = $("favList");

// ---------- Friendly Guidance Library ----------
const GUIDANCE_LIBRARY = {
  Suspense: {
    tone: "Suspense",
    viewer: "Place the viewer close enough to sense tension — about two steps from the main focus point. Keep exits or movement paths visible to create unease.",
    env:    "Keep most of the scene’s focus in front of the viewer, with hints of depth or shadow in the corners. Avoid overloading the sides or behind.",
    light:  "Use one main light source, leaving parts of the environment slightly dim to encourage curiosity and uncertainty.",
    beat:   "Tension building — the viewer feels something is about to happen."
  },
  Calm: {
    tone: "Calm",
    viewer: "Position the viewer comfortably in the space, not too close to any objects. Let them feel like they can breathe and look around freely.",
    env:    "Keep an open, balanced environment with gentle shapes and soft transitions between areas.",
    light:  "Use even, natural lighting. Gentle brightness can help convey peace and safety.",
    beat:   "Tranquility — the scene encourages slow breathing and reflection."
  },
  Dreamlike: {
    tone: "Dreamlike",
    viewer: "Place the viewer at a medium distance from key elements, as if floating between them. Allow freedom to wander and discover details.",
    env:    "Soft shapes and fluid layouts — nothing should feel too solid or fixed. Depth should feel mysterious and smooth.",
    light:  "Mix warm and cool tones gently. Use glows or slow shifts in brightness to create a surreal feel.",
    beat:   "Wonder and imagination — the viewer is drifting through thought or memory."
  },
  Mystery: {
    tone: "Mystery",
    viewer: "Keep the viewer just outside the main spotlight, as if observing from the edge. Give them room to move toward clues.",
    env:    "Limit what’s visible at first glance. Use layers, fog, or shadow to hide small details that invite exploration.",
    light:  "Focus on contrast — let key objects catch the light while others fade into darkness.",
    beat:   "Curiosity and discovery — the viewer feels drawn in but not yet sure of what’s happening."
  },
  Action: {
    tone: "Action",
    viewer: "Position the viewer close to the motion but not in danger. Keep visibility wide enough to follow quick changes.",
    env:    "Use open layouts with clear front-facing focus — keep the main action readable in front.",
    light:  "Bright, direct light for clarity, with short bursts of shadow to add rhythm and excitement.",
    beat:   "Energy and focus — something’s happening now, and the viewer is part of it."
  },
  Emotional: {
    tone: "Emotional",
    viewer: "Keep the viewer near the subject, at eye level or slightly below. Create a personal, grounded sense of connection.",
    env:    "Simple surroundings with emotional focus points — color, object placement, or subtle sound can enhance impact.",
    light:  "Soft, warm light draws attention to faces or focal areas. Allow natural shadows for depth.",
    beat:   "Empathy and closeness — the viewer feels what the scene’s subject feels."
  },
  Awe: {
    tone: "Awe",
    viewer: "Place the viewer low or centered, so they look up or around with a sense of scale.",
    env:    "Large, open spaces — grand structures, wide horizons, or towering shapes that fill their vision.",
    light:  "Use wide light spreads with soft gradients — make the space glow naturally.",
    beat:   "Wonder and inspiration — the viewer feels small but deeply moved."
  },
  Neutral: {
    tone: "Neutral",
    viewer: "Neutral observer position — comfortable distance, easy to scan the scene.",
    env:    "Keep important action readable in the forward view.",
    light:  "Natural, evenly lit feel.",
    beat:   "Informational / balanced."
  }
};

// ---------- Camera presets per tone ----------
const CAMERA_PRESET = {
  Suspense: { dist: 2.5, height: 1.6, orbit: 20, fov: 55 },
  Calm:     { dist: 2.0, height: 1.6, orbit:  0, fov: 60 },
  Dreamlike:{ dist: 2.8, height: 1.6, orbit: 35, fov: 65 },
  Mystery:  { dist: 2.3, height: 1.6, orbit: 25, fov: 55 },
  Action:   { dist: 3.8, height: 1.7, orbit: 45, fov: 70 },
  Emotional:{ dist: 1.4, height: 1.55,orbit: 10, fov: 50 },
  Awe:      { dist: 3.2, height: 1.5, orbit: 15, fov: 65 },
  Neutral:  { dist: 2.0, height: 1.6, orbit:  0, fov: 60 }
};

// ---------- Tone detection (simple keyword model) ----------
function detectTone(text) {
  const t = (text || "").toLowerCase();

  const score = {
    Suspense: 0, Calm: 0, Dreamlike: 0, Mystery: 0, Action: 0, Emotional: 0, Awe: 0
  };

  // Suspense / Mystery
  countWords(["dark","shadow","creak","tense","whisper","footsteps","fog","quiet","echo","door"], "Suspense");
  countWords(["clue","hidden","myster","puzzle","veil","dim","haze","secret"], "Mystery");

  // Calm / Emotional / Dreamlike
  countWords(["calm","soft","gentle","quiet","peace","breeze","warm","glow"], "Calm");
  countWords(["heart","tears","embrace","tender","close","love","sorrow","smile"], "Emotional");
  countWords(["dream","float","drift","surreal","haze","starlight","sparkle","memory"], "Dreamlike");

  // Action / Awe
  countWords(["run","sprint","chase","crash","explosion","roar","leap","impact"], "Action");
  countWords(["vast","towering","grand","majestic","cathedral","horizon","gargantuan"], "Awe");

  function countWords(words, label) {
    words.forEach(w => {
      const hits = t.match(new RegExp(`\\b${w}`, "g"));
      if (hits) score[label] += hits.length;
    });
  }

  // Pick the highest score, fall back to Neutral
  let best = "Neutral", bestVal = 0;
  Object.entries(score).forEach(([k,v]) => { if (v > bestVal) { bestVal = v; best = k; } });
  return best;
}

// ---------- Storage helpers (chrome.storage or localStorage) ----------
const store = {
  get: (key, def) => new Promise(resolve => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.get({ [key]: def }, items => resolve(items[key]));
      } else {
        const raw = localStorage.getItem(key);
        resolve(raw ? JSON.parse(raw) : def);
      }
    } catch { resolve(def); }
  }),
  set: (key, val) => new Promise(resolve => {
    try {
      if (chrome?.storage?.local) chrome.storage.local.set({ [key]: val }, resolve);
      else { localStorage.setItem(key, JSON.stringify(val)); resolve(); }
    } catch { resolve(); }
  })
};

// ---------- App state ----------
let state = {
  history: [],        // array of {snippet, guidance, camera, ts, fav}
  showHistory: true
};

// ---------- Rendering ----------
function renderGuidance(g) {
  setText(viewerPos, g.viewer);
  setText(envLayout, g.env);
  setText(lighting, g.light);
  setText(emotional, g.beat);
  setText(toneBadge, g.tone);
  show(toneBadge, true);
  show(guidanceWrap, true);
}

function updateCamPreview() {
  setText(distVal,   Number(dist.value).toFixed(1));
  setText(heightVal, Number(height.value).toFixed(1));
  setText(orbitVal,  orbit.value);
  setText(fovVal,    fov.value);
  setText(camPreview,
    `Camera: ${Number(dist.value).toFixed(1)} m away, height ${Number(height.value).toFixed(1)} m, orbit ${orbit.value}°, FOV ${fov.value}°.`
  );
}

function renderHistory() {
  // Favourites
  favList.innerHTML = "";
  const favs = state.history.filter(h => h.fav);
  show(favBlock, favs.length > 0);
  favs.forEach((h, i) => favList.appendChild(historyItem(h, i)));

  // Recent
  historyList.innerHTML = "";
  state.history
    .slice()
    .sort((a,b) => b.ts - a.ts)
    .forEach((h, i) => historyList.appendChild(historyItem(h, i)));
}

function historyItem(h, _i) {
  const row = document.createElement("div");
  row.className = "item";

  const star = document.createElement("button");
  star.className = "star" + (h.fav ? " fav" : "");
  star.title = "Toggle favourite";
  star.textContent = h.fav ? "★" : "☆";
  star.addEventListener("click", async () => {
    h.fav = !h.fav;
    await store.set("history", state.history);
    renderHistory();
  });

  const text = document.createElement("div");
  text.className = "snippet";
  text.style.whiteSpace = "normal";      // << Fixes vertical-letter issue
  text.style.wordBreak  = "break-word";  // safe wrap
  text.textContent = h.snippet;

  const meta = document.createElement("div");
  meta.className = "pill";
  meta.textContent = new Date(h.ts).toLocaleString();

  // action buttons
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";

  const bRestore = btn("Restore", () => { storyInput.value = h.snippet; window.scrollTo(0,0); });
  const bCopy    = btn("Copy",    () => copyToClipboard(h.snippet));
  const bCopySn  = btn("Copy Snippet", () =>
    copyToClipboard(blockFromGuidance(h.snippet, h.guidance))
  );
  const bLink    = btn("Link", () => openShare(h));

  actions.appendChild(bRestore);
  actions.appendChild(bCopy);
  actions.appendChild(bCopySn);
  actions.appendChild(bLink);

  const body = document.createElement("div");
  body.style.flex = "1";
  body.appendChild(text);
  body.appendChild(actions);

  row.appendChild(star);
  row.appendChild(body);
  row.appendChild(meta);
  return row;

  function btn(label, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }
}

function blockFromGuidance(snippet, g) {
  return [
    `Tone: ${g.tone}`,
    `Viewer Position: ${g.viewer}`,
    `Environment/Layout: ${g.env}`,
    `Lighting: ${g.light}`,
    `Emotional Beat: ${g.beat}`,
    "",
    `Snippet: ${snippet}`
  ].join("\n");
}

// ---------- Analyse ----------
async function runAnalyse() {
  const snippet = (storyInput?.value || "").trim();
  if (!snippet) { alert("Please enter a story snippet."); return; }

  const tone = detectTone(snippet) || "Neutral";
  const g = GUIDANCE_LIBRARY[tone] || GUIDANCE_LIBRARY.Neutral;
  renderGuidance(g);

  // apply camera preset
  const cam = CAMERA_PRESET[tone] || CAMERA_PRESET.Neutral;
  dist.value   = cam.dist;
  height.value = cam.height;
  orbit.value  = cam.orbit;
  fov.value    = cam.fov;
  updateCamPreview();

  // save to history
  state.history.push({
    snippet,
    guidance: g,
    camera: cam,
    fav: false,
    ts: Date.now()
  });
  await store.set("history", state.history);
  renderHistory();
}

// ---------- Copy / Voice / Share ----------
function currentGuidanceText() {
  const tone = toneBadge?.textContent || "Neutral";
  const g = Object.values(GUIDANCE_LIBRARY).find(x => x.tone === tone) || GUIDANCE_LIBRARY.Neutral;
  return blockFromGuidance(storyInput.value || "", g);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard.");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert("Copied to clipboard.");
  }
}

function runVoice() {
  if (!("speechSynthesis" in window)) { alert("Voice not supported."); return; }
  const t = currentGuidanceText().trim();
  if (!t) { alert("Nothing to speak yet."); return; }
  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.0; u.pitch = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function openShare(entry) {
  // Build payload the share.html expects
  const payload = {
    snippet: entry.snippet,
    guidance: entry.guidance,
    camera: entry.camera,
    timestamp: new Date(entry.ts).toISOString()
  };
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const url = `share.html?data=${encoded}`;
  window.open(url, "_blank");
}

// ---------- Camera & History helpers ----------
function runCopyCamera() {
  copyToClipboard(camPreview?.textContent || "");
}

async function runToggleHistory() {
  state.showHistory = !state.showHistory;
  await store.set("showHistory", state.showHistory);
  historyWrap.style.display = state.showHistory ? "block" : "none";
}

async function runClearHistory() {
  if (!confirm("Clear all history?")) return;
  state.history = [];
  await store.set("history", state.history);
  renderHistory();
}

async function runDownloadLog() {
  if (!state.history.length) { alert("Nothing to download yet."); return; }
  const lines = state.history
    .sort((a,b) => a.ts - b.ts)
    .map(h => {
      const d = new Date(h.ts).toLocaleString();
      return `[${d}] ${h.snippet}`;
    });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `vr-scene-director-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

// ---------- Wire events ----------
if (analyseBtn)  analyseBtn.addEventListener("click", runAnalyse);
if (clearBtn)    clearBtn.addEventListener("click", () => { storyInput.value = ""; show(toneBadge,false); show(guidanceWrap,false); });
if (copyBtn)     copyBtn.addEventListener("click", () => copyToClipboard(currentGuidanceText()));
if (voiceBtn)    voiceBtn.addEventListener("click", runVoice);

if (copyCamBtn)  copyCamBtn.addEventListener("click", runCopyCamera);
[dist,height,orbit,fov].forEach(el => el && el.addEventListener("input", updateCamPreview));

if (toggleHistoryBtn) toggleHistoryBtn.addEventListener("click", runToggleHistory);
if (clearHistoryBtn)  clearHistoryBtn.addEventListener("click", runClearHistory);
if (downloadBtn)      downloadBtn.addEventListener("click", runDownloadLog);

// ---------- Init ----------
(async function init(){
  updateCamPreview();
  const hist = await store.get("history", []);
  const showH = await store.get("showHistory", true);
  state.history = Array.isArray(hist) ? hist : [];
  state.showHistory = !!showH;
  historyWrap.style.display = state.showHistory ? "block" : "none";
  renderHistory();
})();
