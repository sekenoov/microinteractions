// Snap: щелчок пальцами переключает режим внешности.
// Человек отделяется от фона сегментацией, смена режима идёт волной от руки,
// шестой щелчок рассыпает в пыль, седьмой собирает обратно.
import { FilesetResolver, ImageSegmenter, HandLandmarker } from './mp/vision_bundle.mjs';
import { Sound } from './sound.js';

const Q = new URLSearchParams(location.search);
const MODES = ['live', 'pixel', 'ascii', 'glass', 'heat', 'dust'];
const DUST = 5;

const cam = document.getElementById('cam');
const cv = document.getElementById('gl');
const ear = document.getElementById('ear');
const dot = document.getElementById('dot');
const go = document.getElementById('go');
const gateT = document.getElementById('gateT');
if (Q.has('full')) document.body.classList.add('full');

/* ---------- WebGL ---------- */
const gl = cv.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uRes, uCrop, uOrigin;
uniform float uTime, uT0, uDpr, uDiag;
uniform int uFrom, uTo;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+1.), f.x), f.y);
}
// когда пиксель p рассыпается или собирается, секунд после щелчка
float dustT(vec2 p){
  float d = distance(p, uOrigin);
  return (uTo == 5 ? .06 : .3) + d / (uDiag / 1.05) + vnoise(p / (13. * uDpr)) * .38;
}
`;

const VS_QUAD = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0, 1); }`;

const FS_MAIN = COMMON + `
uniform sampler2D uVid, uMask, uBg, uAtlas, uPlate;
uniform vec3 uGain;
uniform float uVidLod, uSnapPass;
uniform vec2 uFrag;           // множитель gl_FragCoord (снимок рендерится в половину)
out vec4 o;

vec2 vuv(vec2 p){ vec2 q = p / uRes; return .5 + (vec2(1. - q.x, q.y) - .5) * uCrop; }
vec3 vid(vec2 p){ return texture(uVid, vuv(p)).rgb; }
vec3 vidL(vec2 p, float l){ return textureLod(uVid, vuv(p), max(l, 0.)).rgb; }
float msk(vec2 p){ return texture(uMask, vuv(p)).r; }
float mskL(vec2 p, float l){ return textureLod(uMask, vuv(p), l).r; }
float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }

// дыры в известном затягиваются по мип-уровням: каждый следующий уровень закрывает то, что не закрыли мельче
vec4 pull(sampler2D t, vec2 q){
  vec4 acc = vec4(0);
  for (int l = 0; l < 10; l++) {
    vec4 s = textureLod(t, q, float(l));
    acc += s * (1. - acc.a);
    if (acc.a > .985) break;
  }
  return vec4(acc.a > .002 ? acc.rgb / acc.a : vec3(0), acc.a);
}
vec2 sq(vec2 p){ return vec2(p.x / uRes.x, 1. - p.y / uRes.y); }

// живой фон: копится всё время там, где человека нет
vec3 bgAt(vec2 p){ vec4 b = pull(uBg, sq(p)); return b.a > .002 ? b.rgb : vid(p) * .6; }

// пустая комната: снята, пока в кадре никого не было, поэтому без тени и без призрака.
// uGain подгоняет её под текущую экспозицию вебки
float hasPlate(vec2 p){ return smoothstep(.3, .7, pull(uPlate, sq(p)).a); }
vec3 room(vec2 p){
  vec2 q = sq(p);
  vec4 P = pull(uPlate, q), P0 = textureLod(uPlate, q, 0.), B0 = textureLod(uBg, q, 0.);
  if (P.a < .3) return bgAt(p);
  vec3 plate = P.rgb * uGain;
  // дыру в пустой комнате лучше закрыть живым фоном, если он там известен
  vec3 base = mix(plate, B0.rgb / max(B0.a, .001), smoothstep(.5, .9, B0.a));
  return mix(base, plate, smoothstep(.5, .9, P0.a));
}

vec3 mPixel(vec2 p){
  float c = floor(uRes.x / 50.);
  vec2 cc = (floor(p / c) + .5) * c;
  if (msk(cc) < .5) return vid(p);
  return vidL(cc, uVidLod + log2(c) - .3);
}

vec3 mAscii(vec2 p){
  float c = floor(uRes.x / 118.);
  vec2 cc = (floor(p / c) + .5) * c;
  if (mskL(cc, 1.5) < .38) return vid(p);
  float lc = uVidLod + log2(c);
  vec3 col = vidL(cc, lc - 1.);
  // локальный контраст: черты лица важнее общей экспозиции
  float mean = lum(vidL(cc, lc + 2.));
  float l = clamp(.5 + (lum(col) - mean) * 3.2 + (pow(mean, .62) - .5) * .7, 0., .999);
  vec2 f = fract(p / c);
  float g = texture(uAtlas, vec2((floor(l * 10.) + f.x) / 10., f.y)).r;
  vec3 ink = col / max(max(col.r, max(col.g, col.b)), .2);
  ink = mix(vec3(.91, .9, .85), ink, .55) * (.5 + .65 * l);
  return mix(vec3(.051, .063, .059), ink, g);
}

vec3 iron(float t){
  t = clamp(t, 0., 1.);
  vec3 c0 = vec3(.01, .0, .05), c1 = vec3(.24, .02, .45), c2 = vec3(.75, .06, .36),
       c3 = vec3(.98, .36, .06), c4 = vec3(1., .78, .2), c5 = vec3(1., .99, .88);
  if (t < .22) return mix(c0, c1, t / .22);
  if (t < .44) return mix(c1, c2, (t - .22) / .22);
  if (t < .64) return mix(c2, c3, (t - .44) / .2);
  if (t < .84) return mix(c3, c4, (t - .64) / .2);
  return mix(c4, c5, (t - .84) / .16);
}
vec3 mHeat(vec2 p){
  vec3 c = vidL(p, uVidLod + 1.5);
  float l = lum(c);
  float m = mskL(p, 2.5);
  float skin = smoothstep(.02, .14, c.r - c.b) * smoothstep(.15, .35, l);
  float h = mix(.06 + .26 * l, .5 + .16 * l + .3 * skin, m);
  h += (vnoise(p / (16. * uDpr) + vec2(0, uTime * 1.3)) - .5) * .05 * m;
  return iron(h);
}

vec3 mGlass(vec2 p){
  float m = mskL(p, 1.);
  if (m < .004) return vid(p);
  // маска как рельеф: толстое стекло по силуэту
  float e = 7. * uDpr, E = 22. * uDpr;
  vec2 g1 = vec2(mskL(p + vec2(e, 0), 3.5) - mskL(p - vec2(e, 0), 3.5), mskL(p + vec2(0, e), 3.5) - mskL(p - vec2(0, e), 3.5));
  vec2 g2 = vec2(mskL(p + vec2(E, 0), 5.) - mskL(p - vec2(E, 0), 5.), mskL(p + vec2(0, E), 5.) - mskL(p - vec2(0, E), 5.));
  vec2 g = g1 * .8 + g2 * .7;
  vec2 off = -g * 90. * uDpr;
  vec3 r = vec3(room(p + off).r, room(p + off * 1.1).g, room(p + off * 1.22).b);
  // черты лица проступают как неровности стекла
  vec3 v = vid(p);
  float detail = lum(v - vidL(p, uVidLod + 2.));
  vec3 n = normalize(vec3(-g * 5. - vec2(dFdx(detail), dFdy(detail)) * 3., 1.));
  float spec = pow(max(dot(n, normalize(vec3(-.45, -.55, .7))), 0.), 28.);
  float edgeBand = smoothstep(.12, .4, m) * (1. - smoothstep(.45, .8, m));
  vec3 gl = r * vec3(.93, .97, 1.) * (1. - edgeBand * .45) + detail * .8 + spec * .55 + length(g) * .35;
  return mix(v, gl, smoothstep(.2, .55, m));
}

vec3 mDust(vec2 p){
  // если пустая комната снята, показываем её целиком: так пропадает и тень
  float m = smoothstep(.12, .35, max(msk(p), max(mskL(p, 2.), mskL(p, 3.5))));
  vec3 fallback = mix(vid(p), bgAt(p), m);
  return mix(fallback, room(p), hasPlate(p));
}

vec3 shade(int mode, vec2 p){
  if (mode == 1) return mPixel(p);
  if (mode == 2) return mAscii(p);
  if (mode == 3) return mGlass(p);
  if (mode == 4) return mHeat(p);
  if (mode == 5) return mDust(p);
  return vid(p);
}

void main(){
  vec2 fc = gl_FragCoord.xy * uFrag;
  vec2 p = vec2(fc.x, uRes.y - fc.y);
  if (uSnapPass > .5) { o = vec4(shade(uTo, p), msk(p)); return; }
  float t = uTime - uT0;
  vec3 col;
  if (uFrom == uTo) col = shade(uTo, p);
  else if (uFrom == 5 || uTo == 5) {
    // человек осыпается по своему фронту, комната меняется ровной волной
    float sw = mix(distance(p, uOrigin) / (uDiag / .62), dustT(p), smoothstep(.3, .7, msk(p)));
    col = t > sw ? shade(uTo, p) : shade(uFrom, p);
  }
  else {
    // ударная волна от пальцев: фронт с рваным краем и линзой на кромке
    float d = distance(p, uOrigin);
    float r = t * uDiag / .62;
    float dn = d + (vnoise(p / (28. * uDpr)) - .5) * 46. * uDpr;
    float w = 44. * uDpr;
    float k = (dn - r) / w;
    vec2 dir = (p - uOrigin) / max(d, 1.);
    float amp = 18. * uDpr * (1. - smoothstep(.25, .75, t));
    vec2 pp = p - dir * amp * k * exp(-k * k);
    col = dn < r ? shade(uTo, pp) : shade(uFrom, pp);
  }
  o = vec4(col, 1);
}`;

// фон копится там, где человека нет
const FS_BG = COMMON + `
uniform sampler2D uVid, uMask, uPrev;
uniform vec2 uBgRes;
uniform float uRate;
out vec4 o;
vec2 vuv(vec2 p){ vec2 q = p / uRes; return .5 + (vec2(1. - q.x, q.y) - .5) * uCrop; }
void main(){
  vec2 q = gl_FragCoord.xy / uBgRes;
  vec2 p = vec2(q.x, 1. - q.y) * uRes;
  vec4 prev = textureLod(uPrev, q, 0.);
  float m = max(textureLod(uMask, vuv(p), 2.).r, textureLod(uMask, vuv(p), 4.).r);
  float w = uRate * (1. - smoothstep(.015, .12, m));
  o = vec4(prev.rgb * (1. - w) + textureLod(uVid, vuv(p), 1.).rgb * w, prev.a * (1. - w) + w);
}`;

const FS_PROBE = COMMON + `
uniform sampler2D uVid, uMask;
uniform vec2 uPRes;
out vec4 o;
vec2 vuv(vec2 p){ vec2 q = p / uRes; return .5 + (vec2(1. - q.x, q.y) - .5) * uCrop; }
void main(){
  vec2 q = gl_FragCoord.xy / uPRes;
  vec2 p = vec2(q.x, 1. - q.y) * uRes;
  o = vec4(textureLod(uVid, vuv(p), 5.).rgb, max(textureLod(uMask, vuv(p), 3.).r, textureLod(uMask, vuv(p), 5.).r));
}`;

const VS_DUST = COMMON + `
uniform sampler2D uSnap;
uniform vec2 uGrid;
uniform float uDir;
out vec4 vc;
void main(){
  int id = gl_VertexID, gx = int(uGrid.x);
  vec2 g = vec2(float(id % gx), float(id / gx));
  vec2 p0 = (g + .5) / uGrid * uRes;
  vec4 s = texture(uSnap, vec2(p0.x / uRes.x, 1. - p0.y / uRes.y));
  float s1 = hash(g * 1.37 + .5), s2 = hash(g.yx * 2.11 + 3.);
  float t = uTime - uT0;
  float td = dustT(p0);
  float life = 1.5 + s1 * 1.3;
  float a = uDir > 0. ? (t - td) / life : (td - t) / life;
  if (s.a < .5 || a <= 0. || a >= 1.) { gl_Position = vec4(3, 3, 0, 1); gl_PointSize = 0.; return; }
  vec2 wind = normalize(vec2(1., -.5 + (s2 - .5) * .9));
  float e = a * a * (1.25 - .25 * a);
  vec2 off = wind * e * uRes.x * (.22 + .42 * s1)
           + vec2(sin(a * 6.5 + s1 * 40.), cos(a * 4.7 + s2 * 30.)) * a * 26. * uDpr
           - vec2(0, a * a * 60. * uDpr * s2);
  vec2 p = p0 + off;
  gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0, 1);
  gl_PointSize = uDpr * 2.3 * (1. - a * .65) * (.6 + .8 * s2);
  float ash = smoothstep(.1, .7, a);
  vec3 c = mix(s.rgb, vec3(dot(s.rgb, vec3(.3, .59, .11))) * vec3(1.06, .95, .82) * .78, ash);
  float al = 1. - smoothstep(.5, 1., a);
  if (uDir < 0.) al *= smoothstep(0., .3, t);
  vc = vec4(c, al);
}`;
const FS_DUST = `#version 300 es
precision highp float;
in vec4 vc; out vec4 o;
void main(){ vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; o = vc; }`;

function prog(vs, fs) {
  const p = gl.createProgram();
  for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(p, sh);
  }
  gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
  return { p, u };
}
const PMain = prog(VS_QUAD, FS_MAIN);
const PBg = prog(VS_QUAD, FS_BG);
const PDust = prog(VS_DUST, FS_DUST);
const PProbe = prog(VS_QUAD, FS_PROBE);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const vaoEmpty = gl.createVertexArray();

function tex(mip = false) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function target(w, h, mip) {
  const t = tex(mip);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  // без мипов текстура неполная и читается как непрозрачный чёрный
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { t, fb, w, h };
}

const tVid = tex(true);
const tMask = tex(true);
// атлас символов для ascii, светлые знаки на прозрачном
const tAtlas = tex(false);
{
  const RAMP = ' .:-=+*#%@', S = 48;
  const c = document.createElement('canvas'); c.width = S * RAMP.length; c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.font = `700 ${S * .86}px ui-monospace, Menlo, monospace`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  [...RAMP].forEach((ch, i) => x.fillText(ch, i * S + S / 2, S * .54));
  gl.bindTexture(gl.TEXTURE_2D, tAtlas);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
}

let W = 0, H = 0, DPR = 1, bgA, bgB, plA, plB, probe, snapT, grid = [0, 0];
function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  const r = cam.getBoundingClientRect();
  W = Math.round(r.width * DPR); H = Math.round(r.height * DPR);
  cv.width = W; cv.height = H;
  const bw = Math.round(r.width), bh = Math.round(r.height);
  if (!bgA || bgA.w !== bw) {
    bgA = target(bw, bh, true); bgB = target(bw, bh, true);
    plA = target(bw, bh, true); plB = target(bw, bh, true);
    probe = target(Math.max(1, bw >> 5), Math.max(1, bh >> 5), false);
    for (const b of [bgA, bgB, plA, plB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, b.t); gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  snapT = target(Math.round(W / 2), Math.round(H / 2), false);
  grid = [Math.round(r.width / 2.1), Math.round(r.height / 2.1)];
}
addEventListener('resize', resize);
resize();

/* ---------- камера, сегментация, руки ---------- */
const video = document.createElement('video');
video.muted = true; video.playsInline = true;
const segC = document.createElement('canvas');
const segX = segC.getContext('2d', { willReadFrequently: false });
let seg, hands, multiclass = false;
let maskW = 0, maskH = 0, maskF = null, maskU8 = null;
let vw = 16, vh = 9;
let lastHand = { x: 0, y: 0, t: -1e9 };

// GPU в некоторых браузерах не поднимается или висит: тогда процессор
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, j) => setTimeout(() => j(new Error('timeout')), ms))]); }
async function loadModels() {
  const fs = await FilesetResolver.forVisionTasks('./mp/wasm');
  multiclass = Q.get('seg') === 'multi';
  const segOpts = (delegate) => ({
    baseOptions: { modelAssetPath: multiclass ? './mp/selfie_multiclass.tflite' : './mp/selfie_segmenter.tflite', delegate },
    runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true,
  });
  const handOpts = (delegate) => ({ baseOptions: { modelAssetPath: './mp/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 2 });
  let delegate = Q.has('cpu') ? 'CPU' : 'GPU';
  try { seg = await withTimeout(ImageSegmenter.createFromOptions(fs, segOpts(delegate)), 10000); }
  catch (e) { console.warn('segmenter on CPU', e); delegate = 'CPU'; seg = await ImageSegmenter.createFromOptions(fs, segOpts('CPU')); }
  try { hands = await withTimeout(HandLandmarker.createFromOptions(fs, handOpts(delegate)), 10000); }
  catch (e) {
    try { hands = await HandLandmarker.createFromOptions(fs, handOpts('CPU')); } catch (e2) { console.warn('hands off', e2); }
  }
}

// экранные координаты (px канваса, y вниз) из нормированных координат кадра камеры
const crop = [1, 1];
function fromVideo(ux, uy) {
  const u = .5 + (ux - .5) / crop[0], v = .5 + (uy - .5) / crop[1];
  return [(1 - u) * W, v * H];
}

let lastVT = -1, lastTs = 0, frameN = 0, absentN = 0;
function track_(now) {
  if (video.readyState < 2 || video.currentTime === lastVT) return false;
  lastVT = video.currentTime;
  const ts = Math.max(now, lastTs + 1); lastTs = ts;
  segX.drawImage(video, 0, 0, segC.width, segC.height);
  seg.segmentForVideo(segC, ts, (r) => {
    const ms = r.confidenceMasks;
    if (!ms || !ms.length) return;
    const m = ms[0];
    const a = m.getAsFloat32Array();
    if (maskW !== m.width || maskH !== m.height) {
      maskW = m.width; maskH = m.height; maskF = new Float32Array(a.length); maskU8 = new Uint8Array(a.length);
    }
    const inv = multiclass;
    let area = 0;
    for (let i = 0; i < a.length; i++) {
      const v = inv ? 1 - a[i] : a[i];
      // прошлый кадр гасит дрожание края
      const s = maskF[i] = maskF[i] * .3 + v * .7;
      maskU8[i] = s * 255;
      if (s > .5) area++;
    }
    // в кадре никого: можно снимать пустую комнату
    absentN = area / a.length < .04 ? absentN + 1 : 0;
    ms.forEach((x) => x.close());
  });
  if (maskU8) {
    gl.bindTexture(gl.TEXTURE_2D, tMask);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, maskW, maskH, 0, gl.RED, gl.UNSIGNED_BYTE, maskU8);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  if (hands && (frameN++ & 1) === 0) {
    const r = hands.detectForVideo(video, ts);
    let best = null;
    for (const lm of r.landmarks || []) {
      // щёлкает та рука, у которой большой палец ближе к среднему
      const d = Math.hypot(lm[4].x - lm[12].x, lm[4].y - lm[12].y) / Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
      if (!best || d < best.d) best = { d, lm };
    }
    if (best) {
      const [x, y] = fromVideo(best.lm[4].x, best.lm[4].y);
      lastHand = { x, y, t: now };
    }
  }
  return true;
}

/* ---------- слух: щелчок это короткий звонкий удар ---------- */
let ac, anH, anL, bufH, bufL, floorH = .004, sens = +(Q.get('s') || 1), lastSnapHeard = -1e9;
function listen(stream, el) {
  ac = new AudioContext();
  const src = el ? ac.createMediaElementSource(el) : ac.createMediaStreamSource(stream);
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  anH = ac.createAnalyser(); anH.fftSize = 1024; anH.smoothingTimeConstant = 0;
  anL = ac.createAnalyser(); anL.fftSize = 1024; anL.smoothingTimeConstant = 0;
  src.connect(hp).connect(anH); src.connect(lp).connect(anL);
  bufH = new Float32Array(anH.fftSize); bufL = new Float32Array(anL.fftSize);
}
function hear(now) {
  if (!anH) return;
  anH.getFloatTimeDomainData(bufH); anL.getFloatTimeDomainData(bufL);
  let pH = 0, pL = 0, sH = 0;
  for (let i = 0; i < bufH.length; i++) { const a = Math.abs(bufH[i]); if (a > pH) pH = a; sH += a * a; }
  for (let i = 0; i < bufL.length; i++) { const a = Math.abs(bufL[i]); if (a > pL) pL = a; }
  // щелчок острый: пик сильно выше среднего по окну, речь и шипящие так не умеют
  const crest = pH / Math.sqrt(sH / bufH.length + 1e-12);
  dot.style.setProperty('--lv', (1 + Math.min(pH / .1, 1) * .9).toFixed(3));
  const handNear = now - lastHand.t < 700;
  const hit = pH > (handNear ? .02 : .035) / sens && pH > floorH * 6
    && crest > (handNear ? 3.8 : 5) && pH > pL * .5;
  if (hit && now > quietUntil && now - lastSnapHeard > 380) { lastSnapHeard = now; snap(handNear ? [lastHand.x, lastHand.y] : null); }
  floorH = hit ? floorH : floorH * .97 + pH * .03;
}

/* ---------- состояние режимов ---------- */
let mode = 0, from = 0, t0 = -1e9, origin = [0, 0], busyUntil = 0;
// свой звук из динамиков не должен сработать как щелчок
let sfx = null, quietUntil = 0;
let dust = { on: false, dir: 1, t0: 0, origin: [0, 0], until: 0 };
const T = () => performance.now() / 1000;

function snap(at, toMode) {
  const now = T();
  if (now < busyUntil) return;
  ear.classList.add('hit'); setTimeout(() => ear.classList.remove('hit'), 180);
  const next = toMode ?? (mode + 1) % MODES.length;
  if (next === mode) return;
  origin = at || [W * .5, H * .55];
  from = mode; mode = next; t0 = now;
  if (sfx) {
    const sharp = sfx.play(from, mode, Math.max(-1, Math.min(1, origin[0] / W * 2 - 1)) * .8);
    quietUntil = Math.max(quietUntil, performance.now() + sharp * 1000 + 120);
  }
  if (from === DUST || mode === DUST) {
    // снимок того, что сейчас на экране (или того, во что собираемся), с маской в альфе
    const leaving = mode === DUST;
    renderSnapshot(leaving ? from : mode);
    dust = { on: true, dir: leaving ? 1 : -1, t0: now, origin: origin.slice(), until: now + 6 };
    busyUntil = now + (leaving ? 1.7 : 2.2);
  } else busyUntil = now + .55;
}

function common(P, now, f, to) {
  const u = P.u;
  gl.uniform2f(u.uRes, W, H);
  gl.uniform2f(u.uCrop, crop[0], crop[1]);
  gl.uniform2f(u.uOrigin, origin[0], origin[1]);
  gl.uniform1f(u.uTime, now);
  gl.uniform1f(u.uT0, t0);
  gl.uniform1f(u.uDpr, DPR);
  gl.uniform1f(u.uDiag, Math.hypot(W, H));
  gl.uniform1i(u.uFrom, f);
  gl.uniform1i(u.uTo, to);
}
function bindTex(P, name, t, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(P.u[name], unit);
}
function drawMain(now, f, to, snapPass) {
  gl.useProgram(PMain.p);
  common(PMain, now, f, to);
  bindTex(PMain, 'uVid', tVid, 0);
  bindTex(PMain, 'uMask', tMask, 1);
  bindTex(PMain, 'uBg', bgA.t, 2);
  bindTex(PMain, 'uAtlas', tAtlas, 3);
  bindTex(PMain, 'uPlate', plA.t, 4);
  gl.uniform3f(PMain.u.uGain, gain[0], gain[1], gain[2]);
  gl.uniform1f(PMain.u.uVidLod, Math.log2(vw * crop[0] / W));
  gl.uniform1f(PMain.u.uSnapPass, snapPass ? 1 : 0);
  gl.uniform2f(PMain.u.uFrag, snapPass ? W / snapT.w : 1, snapPass ? H / snapT.h : 1);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function renderSnapshot(m) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, snapT.fb);
  gl.viewport(0, 0, snapT.w, snapT.h);
  drawMain(T(), m, m, true);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function frame() {
  requestAnimationFrame(frame);
  const nowMs = performance.now(), now = nowMs / 1000;
  hear(nowMs);
  if (!seg || video.readyState < 2) return;

  if (track_(nowMs)) {
    gl.bindTexture(gl.TEXTURE_2D, tVid);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.generateMipmap(gl.TEXTURE_2D);

    // фон: пинг-понг, потом мипы для затягивания дыр
    gl.useProgram(PBg.p);
    common(PBg, now, mode, mode);
    bindTex(PBg, 'uVid', tVid, 0);
    bindTex(PBg, 'uMask', tMask, 1);
    bindTex(PBg, 'uPrev', bgA.t, 2);
    gl.uniform2f(PBg.u.uBgRes, bgB.w, bgB.h);
    // первые кадры камеры бывают тёмными, пока не встала экспозиция
    gl.uniform1f(PBg.u.uRate, maskU8 && ++bgWarm > 24 ? .08 : 0.);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bgB.fb);
    gl.viewport(0, 0, bgB.w, bgB.h);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    [bgA, bgB] = [bgB, bgA];
    gl.bindTexture(gl.TEXTURE_2D, bgA.t);
    gl.generateMipmap(gl.TEXTURE_2D);

    if (absentN > 6 && bgWarm > 24) {
      bindTex(PBg, 'uPrev', plA.t, 2);
      gl.uniform1f(PBg.u.uRate, .3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, plB.fb);
      gl.viewport(0, 0, plB.w, plB.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      [plA, plB] = [plB, plA];
      gl.bindTexture(gl.TEXTURE_2D, plA.t);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    if (bgWarm % 10 === 0) coverage();
  }

  // переход закончился: старый режим больше не нужен
  const settle = (from === DUST || mode === DUST) ? 2.4 : 1.2;
  if (from !== mode && now - t0 > settle) from = mode;

  gl.viewport(0, 0, W, H);
  drawMain(now, from, mode, false);

  if (dust.on) {
    if (now > dust.until) dust.on = false;
    else {
      gl.useProgram(PDust.p);
      common(PDust, now, dust.dir > 0 ? 0 : DUST, dust.dir > 0 ? DUST : 0);
      gl.uniform1f(PDust.u.uT0, dust.t0);
      gl.uniform2f(PDust.u.uOrigin, dust.origin[0], dust.origin[1]);
      gl.uniform2f(PDust.u.uGrid, grid[0], grid[1]);
      gl.uniform1f(PDust.u.uDir, dust.dir);
      bindTex(PDust, 'uSnap', snapT.t, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(vaoEmpty);
      gl.drawArrays(gl.POINTS, 0, grid[0] * grid[1]);
      gl.disable(gl.BLEND);
    }
  }
}
// какая доля комнаты уже видна без человека: читаем мелкий мип фона
const covFb = gl.createFramebuffer();
let known = 0;
const gain = [1, 1, 1];
function coverage() {
  const w = probe.w, h = probe.h;
  // мелкий мип пустой комнаты
  const L = 5, pl = new Uint8Array(w * h * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, covFb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, plA.t, L);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pl);
  // то же место в живом кадре, в альфе человек
  gl.useProgram(PProbe.p);
  common(PProbe, 0, 0, 0);
  bindTex(PProbe, 'uVid', tVid, 0);
  bindTex(PProbe, 'uMask', tMask, 1);
  gl.uniform2f(PProbe.u.uPRes, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, probe.fb);
  gl.viewport(0, 0, w, h);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const lv = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, lv);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  let n = 0; const sv = [0, 0, 0], sp = [0, 0, 0];
  for (let i = 0; i < pl.length; i += 4) {
    const a = pl[i + 3];
    if (a > 150) n++;
    if (a > 200 && lv[i + 3] < 20) for (let c = 0; c < 3; c++) { sv[c] += lv[i + c]; sp[c] += pl[i + c] * 255 / a; }
  }
  known = n / (w * h);
  // экспозиция вебки гуляет: комнату подтягиваем к живому кадру по видимому фону
  for (let c = 0; c < 3; c++) if (sp[c] > 400) gain[c] += (Math.min(1.6, Math.max(.6, sv[c] / sp[c])) - gain[c]) * .35;
  const need = known < .9 && bgWarm > 60;
  earT.textContent = 'step out for a sec';
  ear.classList.toggle('show', need);
}
const earT = document.getElementById('earT');
let hasMic = false;
let bgWarm = 0;

/* ---------- старт ---------- */
async function start() {
  go.disabled = true; go.textContent = 'starting';
  let stream;
  const want = (audio) => navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: audio && { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  try {
    stream = await want(!Q.has('audio'));
  } catch (e) {
    // без микрофона щелчок заменяют пробел и клик
    try { stream = await want(false); } catch (e2) {
      go.disabled = false; go.textContent = 'turn on camera';
      gateT.textContent = 'camera was blocked';
      return;
    }
  }
  video.srcObject = stream;
  await video.play();
  vw = video.videoWidth; vh = video.videoHeight;
  // кадр камеры вписывается в окно обрезкой
  const ca = vw / vh, wa = W / H;
  crop[0] = ca > wa ? wa / ca : 1; crop[1] = ca > wa ? 1 : ca / wa;
  segC.width = 384; segC.height = Math.round(384 * vh / vw);
  if (Q.has('audio')) {
    // проверка без микрофона: звук из файла
    const a = new Audio(Q.get('audio')); a.loop = true; await a.play();
    listen(null, a); hasMic = true;
  } else if (stream.getAudioTracks().length) { listen(stream); hasMic = true; }
  if (!ac) ac = new AudioContext();
  sfx = new Sound(ac);
  if (Q.has('mute')) sfx.muted = true;
  go.textContent = 'loading';
  try { await loadModels(); }
  catch (e) {
    console.error(e);
    go.textContent = 'failed'; gateT.textContent = String(e && e.message || e).slice(0, 120);
    return;
  }
  cam.classList.add('on');
}
go.addEventListener('click', start);

// запасные способы: пробел, клик в кадр (волна от точки клика), цифры 1–6
addEventListener('keydown', (e) => {
  if (!seg) return;
  if (e.code === 'Space') { e.preventDefault(); snap(performance.now() - lastHand.t < 700 ? [lastHand.x, lastHand.y] : null); }
  const n = +e.key;
  if (n >= 1 && n <= 6) snap(null, n - 1);
  if (e.key === 'm' && sfx) sfx.muted = !sfx.muted;
  if (e.key === ']') sens = Math.min(sens * 1.25, 4);
  if (e.key === '[') sens = Math.max(sens / 1.25, .3);
});
cv.addEventListener('pointerdown', (e) => {
  if (!seg) return;
  const r = cv.getBoundingClientRect();
  snap([(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]);
});

requestAnimationFrame(frame);
window.__snap = { snap, get mode() { return mode; }, get room() { return { absentN, known, gain, warm: bgWarm }; } };
