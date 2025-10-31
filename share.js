(function () {
  // ---------- small helpers ----------
  const $ = (id) => document.getElementById(id);
  const copy = (txt) => navigator.clipboard.writeText(txt).catch(()=>{});

  function getData() {
    try {
      const raw = new URL(location.href).searchParams.get("data");
      if (!raw) return null;
      return JSON.parse(decodeURIComponent(raw));
    } catch { return null; }
  }

  // Turn the guidance into friendly “why / try” lines
  function translate(g) {
    const why = [];
    const todo = [];

    const tone = (g.tone || "").toLowerCase();

    // Environment “120° arc” -> people-front language
    if (g.env && /120/.test(g.env)) {
      why.push("Keep most action in front so people don’t need to spin around to follow it.");
      todo.push("Imagine a big pizza slice in front (~120°). Keep key motion inside that slice.");
    }

    // Viewer distance hints
    if (g.viewer && /(2\.?5|2 m|~2)/.test(g.viewer)) {
      why.push("A medium distance (~2–3 m) keeps subjects readable without crowding the viewer.");
      todo.push("If faces feel tiny, move ~0.5 m closer. If it feels cramped, step back ~0.5–1 m.");
    }

    // Light phrasing catch
    if (g.light && /(falloff|rim|key|contrast|soft|natural)/i.test(g.light)) {
      why.push("Light guides attention and prevents the scene looking flat in a headset.");
      todo.push("Keep the brightest patch on what matters; avoid bright distractions behind the viewer.");
    }

    // Tone nudges
    if (tone.includes("suspense")) {
      why.push("Clear exits and controlled framing build tension without confusion.");
      todo.push("Cue surprises with sound near the edge of the slice before they enter view.");
    }
    if (tone.includes("warm") || tone.includes("romance") || tone.includes("calm")) {
      why.push("Soft contrast and gentle motion feel comfortable at headset scale.");
      todo.push("Favor slower movement; let the viewer choose when to look around.");
    }
    if (tone.includes("action")) {
      why.push("Parallax (things passing by) sells speed without whipping the camera.");
      todo.push("Keep the camera steady; let objects move past rather than rotating the viewer.");
    }

    const camExplain =
      "Think of the viewer at the center. Distance = how close the subject is, " +
      "height = eye level, orbit = which way you’re turned, and FOV = how wide the lens feels.";

    return { why, todo, camExplain };
  }

  // ---------- Diagram ----------
  function drawViz(svg, cam) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const W = svg.viewBox.baseVal.width || 360;
    const H = svg.viewBox.baseVal.height || 260;
    const cx = 120;                 // viewer x (leave room on right for slice)
    const cy = Math.floor(H/2);     // viewer y
    const outer = Math.min(W - cx - 16, H/2 - 12);

    const dist = Number.isFinite(cam.dist) ? cam.dist : 2.5;
    const height = Number.isFinite(cam.height) ? cam.height : 1.6; // not drawn, but we keep it
    const orbit = Number.isFinite(cam.orbit) ? cam.orbit : 0;
    const fov = Number.isFinite(cam.fov) ? cam.fov : 60;

    // map 0.5–5 m to 0.18–1.0 scale of outer
    const r = Math.max(0.18, Math.min(1, (dist - 0.5)/(5 - 0.5))) * outer;

    const NS = "http://www.w3.org/2000/svg";
    const add = (el)=>{svg.appendChild(el); return el;};
    const C = (x,y,rad,fill,stroke,sw,dash)=>{
      const e = document.createElementNS(NS, "circle");
      e.setAttribute("cx",x); e.setAttribute("cy",y); e.setAttribute("r",rad);
      e.setAttribute("fill", fill || "none");
      if (stroke) e.setAttribute("stroke", stroke);
      if (sw) e.setAttribute("stroke-width", sw);
      if (dash) e.setAttribute("stroke-dasharray", dash);
      return add(e);
    };
    const L = (x1,y1,x2,y2,stroke,sw,dash)=>{
      const e = document.createElementNS(NS,"line");
      e.setAttribute("x1",x1); e.setAttribute("y1",y1);
      e.setAttribute("x2",x2); e.setAttribute("y2",y2);
      if (stroke) e.setAttribute("stroke", stroke);
      if (sw) e.setAttribute("stroke-width", sw);
      if (dash) e.setAttribute("stroke-dasharray", dash);
      e.setAttribute("stroke-linecap","round");
      return add(e);
    };
    const P = (d,fill,stroke,sw,opacity)=>{
      const e = document.createElementNS(NS,"path");
      e.setAttribute("d", d);
      if (fill) e.setAttribute("fill", fill);
      if (stroke) e.setAttribute("stroke", stroke);
      if (sw) e.setAttribute("stroke-width", sw);
      if (opacity!=null) e.setAttribute("opacity", opacity);
      return add(e);
    };
    const T = (x,y,text,anchor="start",fill="#374151",size=12)=>{
      const e = document.createElementNS(NS,"text");
      e.setAttribute("x",x); e.setAttribute("y",y);
      e.setAttribute("text-anchor",anchor);
      e.setAttribute("font-size", size);
      e.setAttribute("fill", fill);
      e.textContent = text;
      return add(e);
    };

    // pizza-slice (±60°)
    const demi = (120 * Math.PI/180)/2;
    const arcPath = (R,a0,a1)=>{
      const p = (a)=>[cx + R*Math.cos(a), cy + R*Math.sin(a)];
      const [x0,y0] = p(a0), [x1,y1] = p(a1);
      const large = (a1-a0) > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
    };
    // blue slice
    P(arcPath(outer, -demi, demi), "#cfe3ff", "#93c5fd", 1);

    // FOV hint (pale)
    const halfFov = Math.max(20, Math.min(100,fov)) * Math.PI/180/2;
    P(arcPath(outer*0.72, -halfFov, halfFov), "#eef2ff", "#e0e7ff", 1, 0.9);

    // baseline and degree ticks (−60, 0, +60)
    L(cx, cy, cx+outer, cy, "#94a3b8", 1.5, "3 3"); // 0°
    const tick = (deg)=>{
      const a = deg*Math.PI/180;
      const x0 = cx + (outer-12)*Math.cos(a), y0 = cy + (outer-12)*Math.sin(a);
      const x1 = cx + (outer)*Math.cos(a), y1 = cy + (outer)*Math.sin(a);
      L(x0,y0,x1,y1,"#94a3b8",1.5);
      const lx = cx + (outer+12)*Math.cos(a), ly = cy + (outer+12)*Math.sin(a);
      T(lx, ly+4, (deg>0?"+":"") + deg + "°", "middle", "#94a3b8", 11);
    };
    tick(-60); tick(0); tick(60);

    // orbit line (orange)
    const a = orbit*Math.PI/180;
    L(cx, cy, cx+outer*Math.cos(a), cy+outer*Math.sin(a), "#fb923c", 2);

    // distance ring (dashed)
    C(cx, cy, r, "none", "#9ca3af", 1, "6 6");

    // viewer and subject
    C(cx, cy, 4, "#111827");
    T(cx+8, cy-6, "Viewer");
    const sx = cx + r; const sy = cy;
    C(sx, sy, 3, "#2563eb");
    T(sx+8, sy-6, "Subject (approx.)");

    // “Front” arrow
    const ax = cx + outer - 6, ay = cy;
    L(ax-40, ay, ax, ay, "#64748b", 2);
    P(`M ${ax} ${ay} l -8 -4 v 8 z`, "#64748b");

    // small note with numbers
    const box = document.createElementNS(NS,"rect");
    box.setAttribute("x", W - 150); box.setAttribute("y", 14);
    box.setAttribute("width", 140); box.setAttribute("height", 62);
    box.setAttribute("rx", 8); box.setAttribute("fill", "#ffffff");
    box.setAttribute("stroke", "#e5e7eb");
    add(box);
    const note = [
      `Dist: ${dist.toFixed(1)} m`,
      `Height: ${height.toFixed(1)} m`,
      `Orbit: ${Math.round(orbit)}°`,
      `FOV: ${Math.round(fov)}°`,
    ];
    note.forEach((s,i)=> T(W-145, 30+i*14, s));
  }

  // ---------- main ----------
  const data = getData();
  if (!data) { $("err").style.display=""; return; }

  const g = data.guidance || {};
  const cam = data.camera || {};
  $("ok").style.display = "";

  // actions
  $("copyJson").addEventListener("click", ()=> copy(JSON.stringify(data,null,2)));
  $("copyMd").addEventListener("click", ()=>{
    const md =
`# VR Scene Director — Shared Guidance

**Story**: ${data.snippet || ""}

**Tone**: ${g.tone || "-"}
**Viewer Position**: ${g.viewer || "-"}
**Environment/Layout**: ${g.env || "-"}
**Lighting**: ${g.light || "-"}
**Emotional Beat**: ${g.beat || "-"}

**Camera**: Distance ${cam.dist ?? "-"} m · Height ${cam.height ?? "-"} m · Orbit ${cam.orbit ?? "-"}° · FOV ${cam.fov ?? "-"}°
`;
    copy(md);
  });

  // fill UI
  $("snippet").textContent = data.snippet || "";
  $("tone").textContent = g.tone || "—";
  $("viewer").textContent = g.viewer || "—";
  $("env").textContent = g.env || "—";
  $("light").textContent = g.light || "—";
  $("beat").textContent = g.beat || "—";
  $("raw").textContent = JSON.stringify(data, null, 2);

  const camLine =
    `Distance ${Number(cam.dist ?? 0).toFixed(1)} m · ` +
    `Height ${Number(cam.height ?? 0).toFixed(1)} m · ` +
    `Orbit ${Number(cam.orbit ?? 0)}° · ` +
    `FOV ${Number(cam.fov ?? 0)}°`;
  $("camLine").textContent = camLine;

  const friendly = translate(g);
  $("camExplain").textContent = friendly.camExplain;

  const whyList = $("whyList"); whyList.innerHTML = "";
  (friendly.why.length ? friendly.why : [
    "Good framing keeps the story easy to follow in VR.",
  ]).forEach(t => { const li = document.createElement("li"); li.textContent = t; whyList.appendChild(li); });

  const doList = $("doList"); doList.innerHTML = "";
  (friendly.todo.length ? friendly.todo : [
    "Keep important action in front; avoid whipping the camera around.",
  ]).forEach(t => { const li = document.createElement("li"); li.textContent = t; doList.appendChild(li); });

  drawViz($("viz"), {
    dist: Number(cam.dist ?? 2.5),
    height: Number(cam.height ?? 1.6),
    orbit: Number(cam.orbit ?? 0),
    fov: Number(cam.fov ?? 60),
  });
})();
