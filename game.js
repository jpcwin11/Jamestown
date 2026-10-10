const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const W = cv.width, H = cv.height, FLOOR_TOP = 220, FLOOR_BOT = 340;
const keys = {}, pressed = {};
addEventListener("keydown", e => { if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true;
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); });
addEventListener("keyup", e => { keys[e.code] = false; });
const L = k => keys[k] || false;

let state = "title", lvl = 0, cam = 0, ents = [], items = [], player, wave = 0, lock = false, lives = 3, score = 0, msg = "", msgT = 0;

function mk(x, y, o) { return Object.assign({ x, y, z: 0, vz: 0, vx: 0, face: 1, hp: 30, max: 30, atk: 0, cd: 0, hurt: 0, dead: 0, w: 22 }, o); }
function newPlayer(x) { return mk(x, 280, { player: true, hp: 100, max: 100, color: "#2255cc", name: "Billy" }); }
function startLevel(i) {
  lvl = i; cam = 0; wave = 0; lock = false; ents = []; items = [];
  player = newPlayer(60); ents.push(player); state = "play"; say(LEVELS[i].name, 150);
}
function say(t, n) { msg = t; msgT = n; }
function spawnEnemy(x, boss) {
  const l = LEVELS[lvl], hp = 25 + lvl * 8;
  const e = boss ? mk(x, 280, { enemy: true, boss: true, hp: l.boss.hp, max: l.boss.hp, color: "#aa00aa", w: 30, name: l.boss.name, speed: 1.1 })
    : mk(x, FLOOR_TOP + 10 + Math.random() * 110, { enemy: true, hp, max: hp, color: ["#aa3333", "#33aa33", "#aa7733"][lvl % 3], speed: 0.8 + Math.random() * 0.4 + lvl * 0.1 });
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
      t.hp -= dmg; t.hurt = 18; t.vx = a.face * 3; a.hit = true;
      if (t.hp <= 0) { t.dead = 40; if (a.player) score += t.boss ? 1000 : 100; }
    }
  }
}
function update() {
  if (state === "title" || state === "over" || state === "win") { if (pressed.Enter) { lives = 3; score = 0; startLevel(0); } return; }
  if (state === "clear") { if (pressed.Enter) { if (lvl + 1 < LEVELS.length) startLevel(lvl + 1); else state = "win"; } return; }
  const l = LEVELS[lvl], p = player;
  if (msgT > 0) msgT--;
  // player
  if (!p.dead) {
    let dx = (L("ArrowRight") || L("KeyD") ? 1 : 0) - (L("ArrowLeft") || L("KeyA") ? 1 : 0);
    let dy = (L("ArrowDown") || L("KeyS") ? 1 : 0) - (L("ArrowUp") || L("KeyW") ? 1 : 0);
    if (p.atk <= 0 && p.hurt <= 0) { p.x += dx * 2.4; p.y += dy * 1.6; if (dx) p.face = dx;
      if (pressed.KeyJ) attack(p, "punch"); if (pressed.KeyK) attack(p, "kick");
      if (pressed.Space && p.z === 0) p.vz = 7; }
  }
  for (const e of ents) {
    if (e.enemy && !e.dead && e.hurt <= 0 && e.atk <= 0) {
      const dx = p.x - e.x, dy = p.y - e.y; e.face = dx < 0 ? -1 : 1;
      if (!p.dead && Math.abs(dx) < 34 && Math.abs(dy) < 12) { if (--e.cd <= 0) { attack(e, "punch"); e.cd = e.boss ? 40 : 70; } }
      else { e.x += Math.sign(Math.abs(dx) > 28 ? dx : 0) * e.speed; e.y += Math.sign(Math.abs(dy) > 4 ? dy : 0) * e.speed * 0.7; }
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
  if (lock && enemies === 0) { lock = false; if (l.bossDone) { l.bossDone = false; state = "clear"; score += 500; return; }
    items.push({ x: p.x + 60, y: 280, taken: false }); say("GO >>", 90); }
  // camera
  p.x = Math.max(cam + 10, p.x);
  const maxCam = lock ? cam : l.length - W;
  cam = Math.max(cam, Math.min(maxCam, p.x - W / 2));
  for (const k in pressed) delete pressed[k];
}
function person(e) {
  const sx = e.x - cam, sy = e.y - e.z;
  if (e.dead) ctx.globalAlpha = e.dead / 40;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(sx - 12, e.y - 2, 24, 4);
  const s = e.boss ? 1.4 : 1;
  ctx.fillStyle = e.hurt > 0 && e.hurt % 4 < 2 ? "#fff" : e.color; ctx.fillRect(sx - 8 * s, sy - 40 * s, 16 * s, 26 * s);
  ctx.fillStyle = "#f1c27d"; ctx.fillRect(sx - 6 * s, sy - 54 * s, 12 * s, 14 * s);
  ctx.fillStyle = "#222"; ctx.fillRect(sx - 8 * s, sy - 14 * s, 6 * s, 14 * s); ctx.fillRect(sx + 2 * s, sy - 14 * s, 6 * s, 14 * s);
  if (e.atk > 0) { ctx.fillStyle = "#f1c27d"; const k = e.kind === "kick"; ctx.fillRect(sx + e.face * 8 * s - (e.face < 0 ? 22 : 0), sy - (k ? 14 : 34) * s, 22, 6); }
  ctx.globalAlpha = 1;
}
function bar(x, y, w, v, m, c) { ctx.fillStyle = "#300"; ctx.fillRect(x, y, w, 8); ctx.fillStyle = c; ctx.fillRect(x, y, w * Math.max(0, v) / m, 8); ctx.strokeStyle = "#fff"; ctx.strokeRect(x, y, w, 8); }
function text(t, x, y, s, c, a) { ctx.font = "bold " + s + "px monospace"; ctx.textAlign = a || "center"; ctx.fillStyle = c || "#fff"; ctx.fillText(t, x, y); }
function drawBg(l) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP); g.addColorStop(0, l.sky[0]); g.addColorStop(1, l.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR_TOP);
  for (const [n, x, c] of l.landmarks) {
    const sx = x - cam * 0.8; if (sx < -260 || sx > W) continue;
    ctx.fillStyle = c; ctx.fillRect(sx, 80, 220, FLOOR_TOP - 80);
    ctx.fillStyle = "#ffeb99"; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) ctx.fillRect(sx + 15 + i * 50, 100 + j * 50, 24, 28);
    ctx.fillStyle = "#000"; ctx.fillRect(sx + 90, 170, 40, 50); text(n, sx + 110, 74, 12, "#222");
  }
  ctx.fillStyle = l.ground; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
  ctx.fillStyle = "#ddd"; for (let x = -((cam | 0) % 80); x < W; x += 80) ctx.fillRect(x, FLOOR_TOP + 60, 40, 3);
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  if (state === "title") { ctx.fillStyle = "#123"; ctx.fillRect(0, 0, W, H); text("JAMESTOWN BRAWL '95", W / 2, 110, 36, "#fc0");
    text("Downtown • High School • Foote Ave • Lakewood • Chautauqua", W / 2, 160, 14); text("Press ENTER", W / 2, 260, 20); return; }
  if (state === "over") { text("GAME OVER  Score " + score, W / 2, 180, 30, "#f55"); text("ENTER to retry", W / 2, 230, 16); return; }
  if (state === "win") { ctx.fillStyle = "#123"; ctx.fillRect(0, 0, W, H); text("You cleaned up Chautauqua County!", W / 2, 170, 26, "#fc0"); text("Score " + score + " - ENTER to play again", W / 2, 220, 16); return; }
  const l = LEVELS[lvl]; drawBg(l);
  for (const it of items) if (!it.taken) { ctx.fillStyle = "#fff"; ctx.fillRect(it.x - cam - 8, it.y - 12, 16, 12); ctx.fillStyle = "#e22"; ctx.fillRect(it.x - cam - 2, it.y - 11, 4, 10); }
  [...ents].sort((a, b) => a.y - b.y).forEach(person);
  bar(10, 10, 120, player.hp, player.max, "#3c3"); text("Lives " + lives + "  Score " + score, 140, 18, 12, "#fff", "left");
  text(l.name + " – " + l.sub, W - 10, 18, 12, "#fff", "right");
  const b = ents.find(e => e.boss); if (b) { bar(W / 2 - 100, 30, 200, b.hp, b.max, "#c3c"); text(b.name, W / 2, 52, 12); }
  if (msgT > 0) text(msg, W / 2, 120, 24, "#fff");
  if (state === "clear") { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, H); text(l.name + " cleared!", W / 2, 170, 28, "#fc0"); text("ENTER for next level", W / 2, 220, 16); }
}
(function loop() { update(); draw(); requestAnimationFrame(loop); })();
