const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const W = cv.width, H = cv.height, FLOOR_TOP = 220, FLOOR_BOT = 340;
const keys = {}, pressed = {};
addEventListener("keydown", e => { if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true;
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); });
addEventListener("keyup", e => { keys[e.code] = false; });
const L = k => keys[k] || false;

let state = "title", lvl = 0, cam = 0, ents = [], items = [], player, wave = 0, lock = false, lives = 3, score = 0, msg = "", msgT = 0, frame = 0, fx = [], showMap = false, cleared = [];

// Distinct character designs: skin, hair colour/style, jacket, trim, pants, shoes, face extras.
const LOOKS = {
  hero: { skin: "#e8ad78", hair: "#4a3024", style: "spiky", coat: "#2255cc", trim: "#ffffff", pants: "#1d2f6b", shoes: "#f2f2f2", band: "#d93a3a" },
  punk: { skin: "#f0c8a0", hair: "#e0307a", style: "mohawk", coat: "#2b2b2b", trim: "#c0c0c0", pants: "#4a2a5a", shoes: "#111", scar: 1 },
  brute: { skin: "#c98b5e", hair: "#2a1d16", style: "bald", coat: "#7a3b2e", trim: "#d9c9a0", pants: "#3b3b3b", shoes: "#4a3a2a", beard: "#2a1d16" },
  biker: { skin: "#a8744f", hair: "#1c1c1c", style: "bandana", coat: "#3d3d46", trim: "#e0a84a", pants: "#26324b", shoes: "#222", shades: 1, band: "#c62828" },
  cap: { skin: "#f4d3b0", hair: "#d8a23a", style: "cap", coat: "#2e8b57", trim: "#ffffff", pants: "#6b5b3e", shoes: "#e0e0e0", cap: "#1565c0" }
};
const ENEMY_LOOKS = ["punk", "brute", "biker", "cap"];
const BOSS_LOOKS = [
  { skin: "#c9a27a", hair: "#555", style: "bald", coat: "#8a6d3b", trim: "#f2cc54", pants: "#34233f", shoes: "#222", beard: "#777", shades: 0 },
  { skin: "#d99a69", hair: "#222", style: "cap", coat: "#b01e1e", trim: "#fff", pants: "#222", shoes: "#fff", cap: "#8b0000", whistle: 1 },
  { skin: "#e0b088", hair: "#111", style: "slick", coat: "#1c1c24", trim: "#d33", pants: "#111", shoes: "#000", shades: 1 },
  { skin: "#e8b48a", hair: "#e6c36a", style: "spiky", coat: "#00acc1", trim: "#ff7043", pants: "#01579b", shoes: "#fff", shades: 1 },
  { skin: "#d9a07a", hair: "#2a2a2a", style: "cap", coat: "#37474f", trim: "#ffb300", pants: "#212121", shoes: "#111", cap: "#ffb300", beard: "#2a2a2a" },
  { skin: "#b9805a", hair: "#3a3a3a", style: "bandana", coat: "#5d4037", trim: "#bcaaa4", pants: "#263238", shoes: "#111", band: "#455a64", scar: 1 },
  { skin: "#f0c8a0", hair: "#8d4a1f", style: "mohawk", coat: "#ad1457", trim: "#f8bbd0", pants: "#3e2723", shoes: "#222" },
  { skin: "#e8c9a0", hair: "#6a1b9a", style: "slick", coat: "#8e24aa", trim: "#fbc02d", pants: "#311b92", shoes: "#fbc02d", shades: 1 },
  { skin: "#f0d0b0", hair: "#ddd", style: "slick", coat: "#f5f5f5", trim: "#9e9e9e", pants: "#424242", shoes: "#333", beard: "#ddd" }
];
function mk(x, y, o) { return Object.assign({ x, y, z: 0, vz: 0, vx: 0, face: 1, hp: 30, max: 30, atk: 0, cd: 0, hurt: 0, dead: 0, w: 22 }, o); }
function newPlayer(x) { return mk(x, 280, { player: true, hp: 100, max: 100, look: LOOKS.hero, name: "Billy" }); }
function startLevel(i) {
  lvl = i; cam = 0; wave = 0; lock = false; ents = []; items = []; fx = []; showMap = false;
  player = newPlayer(60); ents.push(player); state = "play"; say(LEVELS[i].name, 150);
}
function say(t, n) { msg = t; msgT = n; }
function spawnEnemy(x, boss) {
  const l = LEVELS[lvl], hp = 25 + lvl * 8;
  const e = boss ? mk(x, 280, { enemy: true, boss: true, hp: l.boss.hp, max: l.boss.hp, look: BOSS_LOOKS[lvl % BOSS_LOOKS.length], w: 30, name: l.boss.name, speed: 1.1 })
    : mk(x, FLOOR_TOP + 10 + Math.random() * 110, { enemy: true, hp, max: hp, look: LOOKS[ENEMY_LOOKS[Math.floor(Math.random() * ENEMY_LOOKS.length)]], speed: 0.8 + Math.random() * 0.4 + lvl * 0.1 });
  ents.push(e);
}
function attack(a, kind) {
  if (a.atk > 0 || a.hurt > 0) return;
  a.atk = kind === "kick" ? 22 : 15; a.kind = kind; a.hit = false;
}
function resolveHits(a) {
  if (a.atk <= 0 || a.hit || a.atk > (a.kind === "kick" ? 14 : 9)) return;
  const reach = a.kind === "kick" ? 44 : 34, dmg = (a.kind === "kick" ? 14 : 8) * (a.player ? 1 : 0.5 + lvl * 0.1);
  for (const t of ents) {
    if (t === a || t.dead || !!t.player === !!a.player || t.hurt > 6) continue;
    const dx = (t.x - a.x) * a.face;
    if (dx > -6 && dx < reach && Math.abs(t.y - a.y) < 16 && Math.abs(t.z - a.z) < 30) {
      t.hp -= dmg; t.hurt = 18; t.vx = a.face * (a.kind === "kick" ? 4.5 : 3); a.hit = true;
      fx.push({ x: t.x - a.face * 4, y: t.y, z: t.z + (a.kind === "kick" ? 22 : 36), t: 10, big: a.kind === "kick" });
      if (t.hp <= 0) { t.dead = 40; if (a.player) score += t.boss ? 1000 : 100; }
    }
  }
}
function update() {
  frame++;
  if (pressed.KeyM && (state === "play" || state === "clear" || state === "title")) { showMap = !showMap; pressed.Enter = false; }
  if (showMap) { for (const k in pressed) delete pressed[k]; return; }
  if (state === "title" || state === "over" || state === "win") { if (pressed.Enter) { lives = 3; score = 0; cleared = []; startLevel(0); } return; }
  for (const f of fx) f.t--; fx = fx.filter(f => f.t > 0);
  if (state === "clear") { if (pressed.Enter) { if (lvl + 1 < LEVELS.length) startLevel(lvl + 1); else state = "win"; } return; }
  const l = LEVELS[lvl], p = player;
  if (msgT > 0) msgT--;
  // player
  if (!p.dead) {
    let dx = (L("ArrowRight") || L("KeyD") ? 1 : 0) - (L("ArrowLeft") || L("KeyA") ? 1 : 0);
    let dy = (L("ArrowDown") || L("KeyS") ? 1 : 0) - (L("ArrowUp") || L("KeyW") ? 1 : 0);
    if (p.atk <= 0 && p.hurt <= 0) { p.moving = !!(dx || dy); p.x += dx * 2.4; p.y += dy * 1.6; if (dx) p.face = dx;
      if (pressed.KeyJ) attack(p, "punch"); if (pressed.KeyK) attack(p, "kick");
      if (pressed.Space && p.z === 0) p.vz = 7; }
  }
  for (const e of ents) {
    if (e.enemy && !e.dead && e.hurt <= 0 && e.atk <= 0) {
      const dx = p.x - e.x, dy = p.y - e.y; e.face = dx < 0 ? -1 : 1;
      if (!p.dead && Math.abs(dx) < 34 && Math.abs(dy) < 12) { if (--e.cd <= 0) { attack(e, "punch"); e.cd = e.boss ? 40 : 70; } }
      else { e.moving = true; e.x += Math.sign(Math.abs(dx) > 28 ? dx : 0) * e.speed; e.y += Math.sign(Math.abs(dy) > 4 ? dy : 0) * e.speed * 0.7; }
    }
    if (e.atk > 0) { e.atk--; resolveHits(e); }
    if (e.hurt > 0) { e.hurt--; e.x += e.vx; e.vx *= 0.85; }
    if (e.z > 0 || e.vz > 0) { e.z += e.vz; e.vz -= 0.4; if (e.z <= 0) { e.z = 0; e.vz = 0; } }
    e.y = Math.max(FLOOR_TOP, Math.min(FLOOR_BOT, e.y));
    e.x = Math.max(cam + 10, Math.min(cam + W - 10, e.x));
    if (e.dead) e.dead--;
  }
  ents = ents.filter(e => !(e.dead === 0 && e.hp <= 0 && e.enemy));
  // death/lives
  if (p.hp <= 0 && !p.dying) { p.dying = true; p.dead = 90; }
  if (p.dying && p.dead === 0) {
    if (--lives <= 0) state = "over"; else { const np = newPlayer(Math.max(cam + 60, p.x)); ents[ents.indexOf(p)] = np; player = np; }
  }
  // items
  for (const it of items) if (!it.taken && !p.dead && Math.abs(it.x - p.x) < 20 && Math.abs(it.y - p.y) < 16) { it.taken = true; p.hp = Math.min(p.max, p.hp + 35); score += 50; }
  // waves
  const enemies = ents.filter(e => e.enemy).length;
  const nxt = l.waves[wave];
  if (!lock && nxt && p.x > nxt[0]) { lock = true; for (let i = 0; i < nxt[1]; i++) spawnEnemy(cam + W - 20 + i * 30); wave++; say("Fight!", 60); }
  else if (!lock && !nxt && !ents.some(e => e.boss) && !l.bossDone && p.x > l.length - 400) { lock = true; l.bossDone = true; spawnEnemy(cam + W - 30, true); say("Boss: " + l.boss.name, 150); }
  if (lock && enemies === 0) { lock = false; if (l.bossDone) { l.bossDone = false; state = "clear"; if (!cleared.includes(lvl)) cleared.push(lvl); score += 500; return; }
    items.push({ x: p.x + 60, y: 280, taken: false }); say("GO >>", 90); }
  // camera
  p.x = Math.max(cam + 10, p.x);
  const maxCam = lock ? cam : l.length - W;
  cam = Math.max(cam, Math.min(maxCam, p.x - W / 2));
  for (const k in pressed) delete pressed[k];
}
function person(e) {
  const sx = Math.round(e.x - cam), sy = Math.round(e.y - e.z), s = e.boss ? 1.35 : 1;
  if (e.dead) ctx.globalAlpha = e.dead / 40;
  ctx.fillStyle = "rgba(12,16,28,.42)"; ctx.beginPath(); ctx.ellipse(sx, e.y - 1, 13 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
  const flash = e.hurt > 0 && e.hurt % 4 < 2, walk = e.moving && !e.atk && !e.hurt;
  const step = walk ? Math.sin(frame * 0.42 + e.x) * 3 : 0;
  const bob = walk ? Math.abs(Math.sin(frame * 0.42 + e.x)) * 1.5 : 0;
  const punch = e.atk > 0 && e.kind !== "kick", kick = e.atk > 0 && e.kind === "kick";
  // Attack phases: wind-up -> strike -> recovery (0..1 extension)
  const total = kick ? 22 : 15, hitAt = kick ? 14 : 9, prog = e.atk > 0 ? total - e.atk : 0;
  let ext = 0;
  if (e.atk > 0) ext = e.atk > hitAt ? -0.35 * ((total - e.atk) / (total - hitAt)) : e.atk > hitAt - 4 ? 1 : Math.max(0, e.atk / (hitAt - 4));
  const extend = punch ? Math.max(0, ext) * 15 : 0, lean = e.atk > 0 ? ext * 3 : 0;
  ctx.save(); ctx.translate(sx, sy - bob); ctx.scale(e.face || 1, 1); ctx.translate(lean, 0);
  const lk = e.look || LOOKS.punk, F = c => flash ? "#fff" : c;
  const skin = F(lk.skin), coat = F(lk.coat), dark = F(lk.pants), shoe = F(lk.shoes), trim = F(lk.trim);
  const outline = "#171827";
  ctx.imageSmoothingEnabled = false;
  // Boots and swinging legs
  ctx.fillStyle = outline; ctx.fillRect(-8 * s, -13 * s, 7 * s, 14 * s); ctx.fillRect(2 * s, -13 * s, 7 * s, 14 * s);
  ctx.fillStyle = dark;
  if (kick) {
    const k = Math.max(0, ext), len = (6 + k * 26) * s, rise = (14 + k * 10) * s;
    ctx.fillRect(-7 * s, -23 * s, 6 * s, 12 * s);
    ctx.fillStyle = shoe; ctx.fillRect(-9 * s, -12 * s, 9 * s, 4 * s);
    ctx.fillStyle = outline; ctx.fillRect(1 * s, -rise - 2 * s, len + 8 * s, 9 * s);
    ctx.fillStyle = dark; ctx.fillRect(1 * s, -rise, len, 6 * s);
    ctx.fillStyle = shoe; ctx.fillRect(len, -rise - 1 * s, 8 * s, 8 * s);
    if (k > 0.5) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(2 * s, -rise + 3 * s, len + 6 * s, -0.7, 0.5); ctx.stroke(); }
  } else {
    ctx.fillRect(-7 * s + step, -23 * s, 6 * s, 12 * s);
    ctx.fillRect(2 * s - step, -23 * s, 6 * s, 12 * s);
    ctx.fillStyle = shoe; ctx.fillRect(-9 * s + step, -12 * s, 9 * s, 4 * s); ctx.fillRect(1 * s - step, -12 * s, 10 * s, 4 * s);
  }
  // Jacket, belt and shoulders
  ctx.fillStyle = outline; ctx.fillRect(-11 * s, -43 * s, 22 * s, 23 * s);
  ctx.fillStyle = coat; ctx.fillRect(-9 * s, -42 * s, 18 * s, 19 * s);
  ctx.fillStyle = trim;
  ctx.fillRect(-7 * s, -39 * s, 3 * s, 11 * s); ctx.fillRect(4 * s, -39 * s, 3 * s, 11 * s);
  ctx.fillStyle = "#d6b557"; ctx.fillRect(-8 * s, -24 * s, 16 * s, 3 * s); ctx.fillRect(-2 * s, -24 * s, 4 * s, 3 * s);
  // Arms and attack pose
  ctx.fillStyle = outline; ctx.fillRect(-13 * s, -40 * s, 5 * s, 14 * s); ctx.fillRect(8 * s, -40 * s, 5 * s, 14 * s);
  ctx.fillStyle = skin;
  ctx.fillRect(-12 * s, -28 * s, 5 * s, 5 * s);
  if (punch) { const wind = ext < 0 ? -ext * 10 : 0;
    ctx.fillRect(8 * s - wind, -38 * s, (11 + extend) * s, 6 * s); ctx.fillStyle = "#f0bc8e"; ctx.fillRect((17 + extend) * s - wind, -39 * s, 7 * s, 7 * s);
    if (ext > 0.5) { ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.fillRect((24 + extend) * s, -41 * s, 10 * s, 2); ctx.fillRect((24 + extend) * s, -33 * s, 10 * s, 2); } }
  else { ctx.fillRect(8 * s, -28 * s, 5 * s, 5 * s); }
  // Head, hair and face
  ctx.fillStyle = outline; ctx.fillRect(-8 * s, -57 * s, 16 * s, 16 * s);
  ctx.fillStyle = skin; ctx.fillRect(-6 * s, -55 * s, 12 * s, 12 * s);
  const hair = F(lk.hair); ctx.fillStyle = hair;
  const st = lk.style;
  if (st === "bald") { ctx.fillRect(-7 * s, -55 * s, 14 * s, 2 * s); ctx.fillStyle = skin; ctx.fillRect(-6 * s, -57 * s, 12 * s, 3 * s); ctx.fillStyle = hair; }
  else if (st === "mohawk") { ctx.fillRect(-2 * s, -66 * s, 5 * s, 10 * s); ctx.fillRect(-7 * s, -53 * s, 3 * s, 4 * s); }
  else if (st === "spiky") { ctx.fillRect(-7 * s, -57 * s, 14 * s, 5 * s); for (let i = 0; i < 4; i++) ctx.fillRect((-7 + i * 4) * s, -62 * s, 3 * s, 6 * s); ctx.fillRect(-7 * s, -53 * s, 3 * s, 4 * s); }
  else if (st === "slick") { ctx.fillRect(-8 * s, -58 * s, 16 * s, 6 * s); ctx.fillRect(-9 * s, -53 * s, 4 * s, 9 * s); }
  else { ctx.fillRect(-7 * s, -57 * s, 14 * s, 5 * s); ctx.fillRect(-7 * s, -53 * s, 3 * s, 4 * s); }
  if (st === "cap") { ctx.fillStyle = F(lk.cap || "#c33"); ctx.fillRect(-8 * s, -60 * s, 16 * s, 6 * s); ctx.fillRect(2 * s, -55 * s, 10 * s, 3 * s); }
  if (lk.band) { ctx.fillStyle = F(lk.band); ctx.fillRect(-8 * s, -54 * s, 16 * s, 3 * s); ctx.fillRect(-12 * s, -53 * s, 5 * s, 2 * s); ctx.fillRect(-13 * s, -50 * s, 4 * s, 2 * s); }
  ctx.fillStyle = "#fff"; ctx.fillRect(2 * s, -51 * s, 3 * s, 3 * s);
  ctx.fillStyle = "#171827"; ctx.fillRect(4 * s, -50 * s, 2 * s, 2 * s);
  if (lk.shades) { ctx.fillStyle = "#0b0b12"; ctx.fillRect(0 * s, -52 * s, 7 * s, 4 * s); }
  if (lk.beard) { ctx.fillStyle = F(lk.beard); ctx.fillRect(-6 * s, -46 * s, 12 * s, 4 * s); }
  ctx.fillStyle = "#9f5548"; ctx.fillRect(1 * s, -45 * s, 5 * s, 2 * s);
  if (lk.scar) { ctx.fillStyle = "#b5443a"; ctx.fillRect(-4 * s, -50 * s, 1 * s, 5 * s); }
  if (lk.whistle) { ctx.fillStyle = "#ddd"; ctx.fillRect(-2 * s, -41 * s, 4 * s, 3 * s); }
  if (e.boss) { ctx.fillStyle = "#f2cc54"; ctx.fillRect(-10 * s, -22 * s, 20 * s, 2 * s); ctx.fillRect(-11 * s, -43 * s, 22 * s, 2 * s); }
  ctx.restore(); ctx.globalAlpha = 1; e.moving = false;
}
function panel(x, y, w, h, fill) {
  ctx.fillStyle = "#171b31"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill || "#343b5b"; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = "rgba(255,255,255,.13)"; ctx.fillRect(x + 3, y + 3, w - 6, 2);
  ctx.strokeStyle = "#090c18"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function bar(x, y, w, v, m, c) {
  ctx.fillStyle = "#171321"; ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = "#6a2637"; ctx.fillRect(x + 1, y + 1, w - 2, 8);
  ctx.fillStyle = c; ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, v / m)), 8);
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, v / m)), 2);
  ctx.strokeStyle = "#e7d8ad"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 10);
}
function text(t, x, y, s, c, a) {
  ctx.font = "bold " + s + "px monospace"; ctx.textAlign = a || "center";
  ctx.lineWidth = Math.max(2, s / 6); ctx.strokeStyle = "#171827"; ctx.strokeText(t, x, y);
  ctx.fillStyle = c || "#fff"; ctx.fillText(t, x, y);
}
function drawBg(l) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP); g.addColorStop(0, l.sky[0]); g.addColorStop(1, l.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR_TOP);
  // Distant hills and clouds move at different speeds to give each stage depth.
  ctx.fillStyle = "rgba(255,255,255,.32)";
  for (let i = 0; i < 4; i++) {
    const x = ((i * 190 - cam * 0.18 + 720) % 820) - 90, y = 38 + (i % 2) * 27;
    ctx.fillRect(x, y + 7, 54, 10); ctx.fillRect(x + 10, y, 30, 18); ctx.fillRect(x + 36, y + 4, 22, 13);
  }
  ctx.fillStyle = "rgba(32,61,91,.18)";
  for (let i = 0; i < 8; i++) {
    const x = i * 105 - (cam * 0.32 % 105);
    ctx.beginPath(); ctx.moveTo(x - 50, FLOOR_TOP); ctx.lineTo(x + 35, 105 + (i % 3) * 14); ctx.lineTo(x + 125, FLOOR_TOP); ctx.fill();
  }
  ctx.fillStyle = "rgba(27,52,63,.16)"; ctx.fillRect(0, 185, W, 35);
  for (const [n, x, c] of l.landmarks) {
    const sx = Math.round(x - cam * 0.8); if (sx < -260 || sx > W) continue;
    const isSchool = /school|gym|field/i.test(n), isLake = /marina|boat|lake|bowl/i.test(n), isHotel = /hotel|theatre|athenaeum|tower/i.test(n);
    const bw = isHotel ? 176 : 220, top = isHotel ? 60 : 91;
    ctx.fillStyle = "rgba(20,30,45,.18)"; ctx.fillRect(sx + 7, top + 7, bw, FLOOR_TOP - top);
    ctx.fillStyle = c; ctx.fillRect(sx, top, bw, FLOOR_TOP - top);
    ctx.fillStyle = isHotel ? "#493c38" : isSchool ? "#6c2f35" : isLake ? "#e4bb64" : "#3b3541";
    ctx.fillRect(sx - 5, top - 7, bw + 10, 12);
    ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(sx + 4, top + 13, bw - 8, 4);
    const columns = isHotel ? 4 : 5;
    for (let i = 0; i < columns; i++) {
      const wx = sx + 13 + i * ((bw - 36) / columns);
      for (let j = 0; j < 2; j++) {
        const wy = top + 31 + j * 39;
        ctx.fillStyle = "#292d43"; ctx.fillRect(wx - 2, wy - 2, 24, 27);
        ctx.fillStyle = isLake ? "#7ed4e3" : "#ffd98a"; ctx.fillRect(wx, wy, 20, 21);
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(wx + 2, wy + 2, 3, 16);
        ctx.fillStyle = "#6e4b3e"; ctx.fillRect(wx + 9, wy, 2, 21);
      }
    }
    ctx.fillStyle = "#362e34"; ctx.fillRect(sx + bw * .43, FLOOR_TOP - 49, 34, 49);
    ctx.fillStyle = "#d6b66b"; ctx.fillRect(sx + bw * .43 + 4, FLOOR_TOP - 45, 26, 45);
    ctx.fillStyle = "#312f3b"; ctx.fillRect(sx + bw * .43 + 11, FLOOR_TOP - 20, 3, 3);
    ctx.fillStyle = isSchool ? "#f6d257" : "#26324b";
    ctx.fillRect(sx + bw * .25, top + 8, bw * .5, 15);
    text(n, sx + bw * .5, top + 19, n.length > 17 ? 8 : 10, "#fff");
    ctx.fillStyle = "#454050"; ctx.fillRect(sx - 8, FLOOR_TOP - 5, bw + 16, 7);
  }
  ctx.fillStyle = l.ground; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
  ctx.fillStyle = "rgba(242,220,174,.58)"; ctx.fillRect(0, FLOOR_TOP, W, 4);
  ctx.fillStyle = "rgba(32,32,40,.22)"; ctx.fillRect(0, FLOOR_TOP + 6, W, 3);
  ctx.fillStyle = "rgba(235,223,190,.32)"; ctx.fillRect(0, FLOOR_TOP + 30, W, 2);
  for (let x = -((cam | 0) % 80); x < W; x += 80) {
    ctx.fillStyle = "rgba(24,25,31,.15)"; ctx.fillRect(x + 13, FLOOR_TOP + 59, 2, 2);
    ctx.fillRect(x + 48, FLOOR_TOP + 83, 13, 2);
    ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(x + 25, FLOOR_TOP + 100, 2, 2);
  }
}
function drawMap() {
  ctx.fillStyle = "rgba(9,13,31,.92)"; ctx.fillRect(0, 0, W, H);
  panel(20, 20, W - 40, H - 40, "#223052");
  text("JAMESTOWN AREA MAP", W / 2, 52, 20, "#f7d15c");
  const n = LEVELS.length, cols = Math.ceil(n / 2), gx = (W - 100) / (cols - 1 || 1), pts = LEVELS.map((_, i) => {
    const row = i < cols ? 0 : 1, c = row ? cols - 1 - (i - cols) : i; return [50 + c * gx, row ? 250 : 130]; });
  ctx.strokeStyle = "#e7d8ad"; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.setLineDash([]);
  LEVELS.forEach((l, i) => {
    const [x, y] = pts[i], cur = state !== "title" && i === lvl, done = cleared.includes(i);
    ctx.fillStyle = "#171827"; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill();
    ctx.fillStyle = done ? "#55d16b" : cur ? "#ffe98b" : "#7f88aa"; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    text(String(i + 1), x, y + 5, 14, "#171827");
    text(l.name, x, y + (y < 190 ? -26 : 36), 9, cur ? "#ffe98b" : "#fff");
    text(l.sub, x, y + (y < 190 ? -15 : 47), 7, "#c9cde0");
  });
  text("GREEN = CLEARED   YELLOW = CURRENT   M TO CLOSE", W / 2, 320, 10, "#d3d4e3");
}
function draw() {
  ctx.clearRect(0, 0, W, H); draw0(); if (showMap) drawMap();
}
function draw0() {
  if (state === "title") {
    drawBg(LEVELS[0]);
    ctx.fillStyle = "rgba(12,17,39,.52)"; ctx.fillRect(0, 0, W, H);
    person({ x: 238, y: 319, z: 0, face: 1, look: LOOKS.hero, player: true });
    person({ x: 401, y: 319, z: 0, face: -1, look: LOOKS.punk });
    panel(111, 34, 418, 104, "#26345a");
    text("JAMESTOWN", W / 2, 78, 35, "#f7d15c");
    text("BRAWL '95", W / 2, 119, 30, "#ef654e");
    text("A CHAUTAUQUA COUNTY BEAT-'EM-UP", W / 2, 164, 12, "#fff");
    panel(157, 189, 326, 35, "#35466d");
    text("DOWNTOWN  •  FOOTE AVE  •  LAKEWOOD", W / 2, 211, 10, "#e6e4d1");
    const prompt = Math.floor(frame / 28) % 2 ? "#ffe98b" : "#fff";
    text("PRESS ENTER", W / 2, 271, 20, prompt);
    text("ARROWS / WASD MOVE     J PUNCH     K KICK     SPACE JUMP     M MAP", W / 2, 342, 9, "#d3d4e3");
    return;
  }
  if (state === "over" || state === "win") {
    drawBg(LEVELS[state === "win" ? LEVELS.length - 1 : lvl]);
    ctx.fillStyle = "rgba(9,13,31,.76)"; ctx.fillRect(0, 0, W, H);
    panel(101, 99, 438, 163, "#273252");
    text(state === "win" ? "COUNTY CHAMPION!" : "GAME OVER", W / 2, 151, 30, state === "win" ? "#f7d15c" : "#ef654e");
    text(state === "win" ? "You cleaned up Chautauqua County!" : "Final Score  " + score, W / 2, 190, 15, "#fff");
    text(state === "win" ? "Score  " + score : "ENTER TO RETRY", W / 2, 229, 15, "#f7d15c");
    if (state === "win") text("PRESS ENTER TO PLAY AGAIN", W / 2, 250, 10, "#d3d4e3");
    return;
  }
  const l = LEVELS[lvl]; drawBg(l);
  for (const it of items) if (!it.taken) {
    const ix = Math.round(it.x - cam), iy = Math.round(it.y - 13 + Math.sin(frame * .12) * 2);
    ctx.fillStyle = "rgba(12,16,28,.35)"; ctx.fillRect(ix - 10, it.y - 2, 20, 4);
    ctx.fillStyle = "#171827"; ctx.fillRect(ix - 9, iy - 1, 18, 14);
    ctx.fillStyle = "#f1eee0"; ctx.fillRect(ix - 7, iy + 1, 14, 10);
    ctx.fillStyle = "#cf4147"; ctx.fillRect(ix - 2, iy + 1, 4, 10); ctx.fillRect(ix - 7, iy + 4, 14, 4);
  }
  [...ents].sort((a, b) => a.y - b.y).forEach(person);
  for (const f of fx) { const fxx = f.x - cam, fy = f.y - f.z, r = (f.big ? 16 : 11) * (1.2 - f.t / 12);
    ctx.fillStyle = f.t % 2 ? "#fff" : "#ffd84a"; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = i % 2 ? r * .45 : r; ctx.lineTo(fxx + Math.cos(ang) * rr, fy + Math.sin(ang) * rr); }
    ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "rgba(12,16,32,.82)"; ctx.fillRect(0, 0, W, 39);
  panel(7, 4, 185, 31, "#303958"); text("BILLY", 14, 17, 9, "#fff", "left");
  bar(54, 9, 94, player.hp, player.max, "#55d16b");
  text("♥ " + lives + "   SCORE " + String(score).padStart(6, "0"), 14, 29, 9, "#f4d66e", "left");
  text(l.name + "  /  " + l.sub, W - 12, 16, 10, "#fff", "right");
  const b = ents.find(e => e.boss);
  if (b) { panel(W / 2 - 112, 23, 224, 31, "#40314f"); text(b.name, W / 2, 35, 10, "#fff"); bar(W / 2 - 95, 40, 190, b.hp, b.max, "#d34dc0"); }
  if (msgT > 0) { panel(W / 2 - 134, 91, 268, 39, "#35466d"); text(msg, W / 2, 117, 20, "#ffe98b"); }
  if (state === "clear") { ctx.fillStyle = "rgba(0,0,0,.64)"; ctx.fillRect(0, 0, W, H); panel(147, 134, 346, 100, "#344365"); text(l.name + " CLEARED!", W / 2, 174, 23, "#f7d15c"); text("ENTER FOR NEXT STAGE", W / 2, 211, 13, "#fff"); }
}
(function loop() { update(); draw(); requestAnimationFrame(loop); })();
