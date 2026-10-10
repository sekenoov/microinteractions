/* ============================================================
   Mascot: SDF raymarching, zoned reactions, personalities
   ============================================================ */

const cvs = document.getElementById('gl');
const gl = cvs.getContext('webgl', { antialias: false, alpha: false });

/* camera constants shared by the shader and the CPU picker */
const CAM = 3.20, FOV = 0.447, YAW = 0.34, PITCH = 0.18, BOBA = 0.026, BOBW = 1.25;

/* parameter array indices */
const I = {
  hrx:0, hry:1, hrz:2, k:3,
  lbx:4, lby:5, lmx:6, lmy:7, ltx:8, lty:9, lr0:10, lr1:11, lr2:12,
  rbx:13, rby:14, rmx:15, rmy:16, rtx:17, rty:18, rr0:19, rr1:20, rr2:21,
  tux:22, tuy0:23, tuy1:24, tur0:25, tur1:26,
  chx:27, chy:28, chr:29,
  boy:30, borx:31, bory:32, borz:33,
  cr:34, cg:35, cb:36,
  eyeX:37, eyeY:38, eyeR:39, eyeH:40,
  browY:41, browW:42, browTh:43, browOn:44,
  moY:45, moW:46, moTh:47, blY:48, oy:49
};
const NP = 50;

/* ---------------- shaders ---------------- */

const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FS = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uBg, uInk;
uniform float P[${NP}];

uniform vec2  uSquash;
uniform float uSway;
uniform vec2  uPull;
uniform float uRoll;
uniform float uRecoil;
uniform vec2  uWob;
uniform float uJump;
uniform vec2  uLook;
uniform vec2  uFloat;

uniform vec2  uEyeOpen;
uniform float uSmile;
uniform float uWide;
uniform vec2  uPupil;
uniform vec2  uBrow;
uniform vec3  uMouth;
uniform float uBlush;

#define HRX P[0]
#define HRY P[1]
#define HRZ P[2]
#define K   P[3]
#define LBX P[4]
#define LBY P[5]
#define LMX P[6]
#define LMY P[7]
#define LTX P[8]
#define LTY P[9]
#define LR0 P[10]
#define LR1 P[11]
#define LR2 P[12]
#define RBX P[13]
#define RBY P[14]
#define RMX P[15]
#define RMY P[16]
#define RTX P[17]
#define RTY P[18]
#define RR0 P[19]
#define RR1 P[20]
#define RR2 P[21]
#define TUX P[22]
#define TUY0 P[23]
#define TUY1 P[24]
#define TUR0 P[25]
#define TUR1 P[26]
#define CHX P[27]
#define CHY P[28]
#define CHR P[29]
#define BOY P[30]
#define BORX P[31]
#define BORY P[32]
#define BORZ P[33]
#define EYEX P[37]
#define EYEY P[38]
#define EYER P[39]
#define EYEH P[40]
#define BRWY P[41]
#define BRWW P[42]
#define BRWT P[43]
#define BRWO P[44]
#define MOY P[45]
#define MOW P[46]
#define MOTH P[47]
#define BLY P[48]
#define OY  P[49]

const float CAM = ${CAM};
const float FOV = ${FOV};

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0 - h);
}

float sdEllipsoid(vec3 p, vec3 r){
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0 - 1.0)/k1;
}

float sdCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  float rr = r1 - r2;
  float a2 = l2 - rr*rr;
  float il2 = 1.0/l2;
  vec3 pa = p - a;
  float y = dot(pa, ba);
  float z = y - l2;
  vec3 xp = pa*l2 - ba*y;
  float x2 = dot(xp, xp);
  float y2 = y*y*l2;
  float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if (sign(z)*a2*z2 > k) return sqrt(x2 + z2)*il2 - r2;
  if (sign(y)*a2*y2 < k) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}

/* shared deformation: recoil, roll, jelly wave */
vec3 warp(vec3 p){
  p.y -= OY;
  p.z -= uRecoil;
  p.xy = rot(uRoll)*p.xy;
  float w = uWob.x*sin(p.y*3.6 + uWob.y);
  p.xz *= 1.0 + w;
  p.y  *= 1.0 - w*0.55;
  return p;
}

float map(vec3 q){
  vec3 p = warp(q);
  vec2 s = uSquash;

  float d = sdEllipsoid(p, vec3(HRX*s.x, HRY*s.y, HRZ*s.x));

  vec3 bp = p - vec3(0.0, BOY*s.y, 0.0);
  d = smin(d, sdEllipsoid(bp, vec3(max(BORX,0.02)*s.x, max(BORY,0.02)*s.y, max(BORZ,0.02))), K*1.15);

  vec3 cp = vec3(abs(p.x) - CHX*s.x, p.y - CHY*s.y, p.z - 0.13);
  d = smin(d, length(cp) - max(CHR, 0.004), K*1.5);

  float sw = uSway*0.085;
  float bo = sin(uTime*${BOBW} + 0.9)*0.010;

  vec3 lb = vec3(LBX*s.x, LBY*s.y, 0.0);
  vec3 lm = vec3(LMX*s.x + sw*0.55, LMY*s.y + bo, 0.0);
  vec3 lt = vec3(LTX*s.x + sw - uPull.x*0.15, LTY*s.y + bo - uPull.x*0.27, 0.0);
  float e = sdCone(p, lb, lm, LR0, LR1);
  e = min(e, sdCone(p, lm, lt, LR1, LR2*(1.0 - uPull.x*0.28)));
  d = smin(d, e, K);

  vec3 rb = vec3(RBX*s.x, RBY*s.y, 0.0);
  vec3 rm = vec3(RMX*s.x + sw*0.55, RMY*s.y + bo, 0.0);
  vec3 rt = vec3(RTX*s.x + sw + uPull.y*0.15, RTY*s.y + bo - uPull.y*0.27, 0.0);
  float f = sdCone(p, rb, rm, RR0, RR1);
  f = min(f, sdCone(p, rm, rt, RR1, RR2*(1.0 - uPull.y*0.28)));
  d = smin(d, f, K);

  vec3 tb = vec3(0.0, TUY0*s.y, 0.0);
  vec3 tt = vec3(TUX*s.x + sw*1.3, TUY1*s.y + bo*1.6, 0.0);
  d = smin(d, sdCone(p, tb, tt, max(TUR0,0.004), max(TUR1,0.004)), K*0.85);

  return d;
}

vec3 normal(vec3 p){
  vec2 e = vec2(1.0, -1.0)*0.0011;
  return normalize(
    e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) +
    e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx));
}

/* ambient occlusion in the creases */
float ao(vec3 p, vec3 n){
  float o = 0.0, w = 1.0;
  for (int i = 0; i < 4; i++){
    float h = 0.025 + 0.105*float(i);
    o += (h - map(p + n*h))*w;
    w *= 0.70;
  }
  return clamp(1.0 - 2.4*o, 0.0, 1.0);
}

/* ---- face features in arc-length face space ---- */

float sdPill(vec2 q, float r, float h){
  q.y -= clamp(q.y, -h, h);
  return length(q) - r;
}
float sdArc(vec2 q, float k, float w, float th){
  return max(abs(q.y - k*q.x*q.x) - th, abs(q.x) - w);
}
float sdBrow(vec2 q, float w, float th, float ang){
  q = rot(ang)*q;
  q.x -= clamp(q.x, -w, w);
  return length(q) - th;
}

float sdBox2(vec2 q, vec2 b, float r){
  vec2 d = abs(q) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

/* one primitive morphing from vertical pill to curved line */
float eyeShape(vec2 q, float open, float r, float h){
  float t = clamp(open, 0.0, 1.0);
  float s = 1.0 - t;
  q.y -= (-2.9*uSmile + 0.9*(1.0 - uSmile))*s*q.x*q.x;
  vec2 b = vec2(mix(r*1.5, 0.0, t), mix(0.0, h, t));
  return sdBox2(q, b, mix(0.0135, r, t));
}

vec3 face(vec3 qq, float aa){
  vec3 p = warp(qq);
  vec2 s = uSquash;
  vec3 hr = vec3(HRX*s.x, HRY*s.y, HRZ*s.x);
  vec3 dir = normalize(p/hr);
  float front = smoothstep(0.0, 0.26, dir.z);
  if (front <= 0.002) return vec3(0.0);

  vec2 uv = vec2(atan(dir.x, dir.z)*hr.x, asin(clamp(dir.y, -1.0, 1.0))*hr.y);
  uv -= uPupil;

  float r = EYER*uWide;
  float h = EYEH*uWide;
  vec2 qL = uv - vec2(-EYEX, EYEY);
  vec2 qR = uv - vec2( EYEX, EYEY);
  float eL = eyeShape(qL, uEyeOpen.x, r, h);
  float eR = eyeShape(qR, uEyeOpen.y, r, h);

  /* highlights clipped to the eye */
  vec2 ho = vec2(r*0.30, h*uEyeOpen.x*0.45 + r*0.22);
  float hL = max(length(qL - vec2(-ho.x, ho.y)) - r*0.30, eL + 0.006);
  vec2 hoR = vec2(r*0.30, h*uEyeOpen.y*0.45 + r*0.22);
  float hR = max(length(qR - vec2(-hoR.x, hoR.y)) - r*0.30, eR + 0.006);
  float h2L = max(length(qL - vec2(ho.x*0.85, -ho.y*0.75)) - r*0.155, eL + 0.006);
  float h2R = max(length(qR - vec2(hoR.x*0.15, -hoR.y*0.75)) - r*0.155, eR + 0.006);
  hL = min(hL, h2L); hR = min(hR, h2R);
  float hi = min(mix(1e3, hL, step(0.55, uEyeOpen.x)), mix(1e3, hR, step(0.55, uEyeOpen.y)));
  float hiOn = 1.0;

  /* brows */
  float bw = 1e9;
  if (BRWO > 0.5){
    float by = BRWY + uBrow.x*0.045;
    bw = min(sdBrow(uv - vec2(-EYEX, by), BRWW, BRWT,  uBrow.y),
             sdBrow(uv - vec2( EYEX, by), BRWW, BRWT, -uBrow.y));
  }

  /* mouth: arc morphs into an oval */
  vec2 mq = uv - vec2(0.0, MOY);
  float w = MOW*uMouth.z;
  float ma = sdArc(mq, uMouth.x, w, MOTH);
  vec2 me = (mq - vec2(0.0, -w*uMouth.y*0.16))/vec2(w*0.66, w*(0.26 + uMouth.y*0.62));
  float mo = (length(me) - 1.0)*w*0.42;
  mo = max(mo, mq.y - (0.010 - uMouth.x*0.22*mq.x*mq.x));
  float m = mix(ma, mo, smoothstep(0.04, 0.45, uMouth.y));

  float ink = min(min(eL, eR), min(m, bw));
  float inkA = (1.0 - smoothstep(-aa, aa, ink))*front;
  float hiA = (1.0 - smoothstep(-aa, aa, hi))*front*hiOn;

  float bl = 0.0;
  if (uBlush > 0.004){
    vec2 bq = uv - vec2(0.0, BLY);
    bq.x = abs(bq.x) - (EYEX + 0.075);
    bl = (1.0 - smoothstep(0.30, 1.0, length(bq/vec2(0.085, 0.048))))*uBlush*front;
  }
  return vec3(inkA, hiA*(1.0 - inkA*0.0), bl);
}

vec2 bounds(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r*r;
  float h = b*b - c;
  if (h < 0.0) return vec2(1.0, -1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y*2.0;

  /* background and soft contact shadow */
  float hi = uJump;
  vec2 sp = (uv - vec2(0.0, -0.66))/vec2(0.52 + hi*0.10, 0.100 + hi*0.020);
  float sh = (1.0 - smoothstep(0.0, 1.05, length(sp)))*0.155/(1.0 + hi*1.5);
  vec3 col = mix(uBg, vec3(0.0), sh*0.52);

  vec3 ro = vec3(0.0, 0.14, CAM);
  vec3 rd = normalize(vec3(uv*FOV, -1.0));

  ro.y -= sin(uTime*${BOBW})*${BOBA} + uJump + uFloat.y;
  ro.x -= uFloat.x;

  float yaw = uLook.x*${YAW}, pitch = -uLook.y*${PITCH};
  ro.yz = rot(pitch)*ro.yz; rd.yz = rot(pitch)*rd.yz;
  ro.xz = rot(yaw)*ro.xz;   rd.xz = rot(yaw)*rd.xz;

  vec2 bd = bounds(ro, rd, 1.55);
  float cov = 0.0;
  vec3 p = ro;

  if (bd.y > bd.x){
    float t = max(bd.x, 0.0), md = 1e9;
    bool hit = false;
    for (int i = 0; i < 80; i++){
      p = ro + rd*t;
      float d = map(p);
      md = min(md, d);
      if (d < 0.0008){ hit = true; break; }
      t += d*0.86;
      if (t > bd.y) break;
    }
    float px = 2.0*FOV*CAM/uRes.y;
    cov = hit ? 1.0 : 1.0 - smoothstep(0.0, px*1.7, md);

    if (cov > 0.002){
      vec3 n = normal(p);
      vec3 l = normalize(vec3(-0.40, 0.80, 0.55));
      float dif = clamp(dot(n, l), 0.0, 1.0);
      float fre = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.4);
      float spe = pow(clamp(dot(reflect(-l, n), -rd), 0.0, 1.0), 30.0);

      vec3 base = vec3(P[34], P[35], P[36]);
      float occ = ao(p, n);
      vec3 c = base*(0.950 + 0.085*dif);
      c *= mix(0.83, 1.0, occ);
      c = mix(c, base*0.905, smoothstep(0.35, -0.75, n.y)*0.34);
      c *= 1.0 - 0.05*fre;
      c += spe*0.085*clamp(n.y + 0.4, 0.0, 1.0);

      vec3 f = face(p, 2.0*FOV*CAM/uRes.y*1.35);
      c = mix(c, mix(base, vec3(0.97, 0.44, 0.47), 0.52), f.z*0.55);
      c = mix(c, uInk, f.x);
      c = mix(c, mix(vec3(1.0), base, 0.12), f.y);

      col = mix(col, c, cov);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
  return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

const vb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
const al = gl.getAttribLocation(prog, 'a');
gl.enableVertexAttribArray(al);
gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);

const U = {};
['uRes','uTime','uBg','uInk','uSquash','uSway','uPull','uRoll','uRecoil','uWob','uJump',
 'uLook','uFloat','uEyeOpen','uSmile','uWide','uPupil','uBrow','uMouth','uBlush']
  .forEach(k => U[k] = gl.getUniformLocation(prog, k));
U.P = gl.getUniformLocation(prog, 'P[0]');

/* ---------------- characters ---------------- */

function shape(o){
  const a = new Float32Array(NP);
  a[I.tuy0] = 0.0; a[I.tuy1] = 0.06; a[I.tur0] = 0.004; a[I.tur1] = 0.004;
  a[I.chr] = 0.004; a[I.chx] = 0.2; a[I.chy] = -0.1;
  a[I.borx] = 0.02; a[I.bory] = 0.02; a[I.borz] = 0.02; a[I.boy] = 0.0;
  a[I.browY] = 0.2; a[I.browW] = 0.06; a[I.browTh] = 0.014;
  for (const k in o) a[I[k]] = o[k];
  return a;
}

const CHARS = [
  {
    name: 'Bo', hex: '#efb134',
    /* round head, one fat ear and one thin ear */
    p: shape({
      hrx:.62, hry:.58, hrz:.55, k:.16,
      lbx:-.24, lby:.28, lmx:-.33, lmy:.60, ltx:-.30, lty:.88, lr0:.20, lr1:.19, lr2:.13,
      rbx:.30, rby:.32, rmx:.39, rmy:.60, rtx:.43, rty:.88, rr0:.11, rr1:.085, rr2:.05,
      eyeX:.20, eyeY:.05, eyeR:.056, eyeH:.062,
      moY:-.20, moW:.13, moTh:.014, blY:-.09,
      cr:.937, cg:.694, cb:.204
    }),
    base: { eyeL:1, eyeR:0, smile:1, wide:1, brow:0, browA:0, curve:3.2, mopen:0, mwide:1, blush:.13 },
    soul: { gain:1.22, stiff:1.15, wob:1.15, blush:.04, tempo:1.15, amb:0 },
    tweak: {}
  },
  {
    name: 'Pim', hex: '#7cc9a6',
    /* tall egg with two bulb antennae */
    p: shape({
      hrx:.46, hry:.62, hrz:.45, k:.10, oy:-.07,
      lbx:-.12, lby:.40, lmx:-.19, lmy:.70, ltx:-.24, lty:.95, lr0:.040, lr1:.024, lr2:.088,
      rbx:.12, rby:.40, rmx:.19, rmy:.70, rtx:.24, rty:.95, rr0:.040, rr1:.024, rr2:.088,
      eyeX:.145, eyeY:.07, eyeR:.043, eyeH:.048,
      moY:-.19, moW:.072, moTh:.012, blY:-.055,
      cr:.486, cg:.788, cb:.651
    }),
    base: { eyeL:1, eyeR:1, smile:1, wide:1, brow:.15, browA:0, curve:3.6, mopen:0, mwide:1, blush:.5 },
    soul: { gain:.82, stiff:1.35, wob:.85, blush:.45, tempo:.85, amb:1 },
    tweak: { earL:{ blush:1 }, earR:{ blush:1 }, top:{ blush:1, eyeL:0, eyeR:0 } }
  },
  {
    name: 'Nuu', hex: '#7fa6de',
    /* low chubby body, droopy ears, calm */
    p: shape({
      hrx:.50, hry:.44, hrz:.46, k:.19, oy:.20,
      lbx:-.40, lby:.16, lmx:-.55, lmy:.05, ltx:-.62, lty:-.14, lr0:.12, lr1:.095, lr2:.07,
      rbx:.40, rby:.16, rmx:.55, rmy:.05, rtx:.62, rty:-.14, rr0:.12, rr1:.095, rr2:.07,
      boy:-.54, borx:.52, bory:.32, borz:.46,
      eyeX:.205, eyeY:.07, eyeR:.058, eyeH:.026,
      moY:-.105, moW:.088, moTh:.013, blY:-.035,
      cr:.498, cg:.651, cb:.871
    }),
    base: { eyeL:1, eyeR:1, smile:.7, wide:1, brow:0, browA:0, curve:.9, mopen:0, mwide:1, blush:.17 },
    soul: { gain:.72, stiff:.62, wob:1.35, blush:.08, tempo:.60, amb:2 },
    tweak: {
      top:   { eyeL:.95, eyeR:.95, smile:0, curve:1.6, mopen:.35 },
      belly: { eyeL:0, eyeR:0, smile:1, curve:4.2, mopen:.8 },
      eye:   { eyeL:0, eyeR:0, mopen:.3 }
    }
  },
  {
    name: 'Tak', hex: '#e6866f',
    /* small head, horn, pointy ears, brows */
    p: shape({
      hrx:.50, hry:.47, hrz:.46, k:.13, oy:-.05,
      lbx:-.33, lby:.24, lmx:-.42, lmy:.42, ltx:-.48, lty:.56, lr0:.11, lr1:.065, lr2:.028,
      rbx:.33, rby:.24, rmx:.42, rmy:.42, rtx:.48, rty:.56, rr0:.11, rr1:.065, rr2:.028,
      tux:.11, tuy0:.22, tuy1:.86, tur0:.125, tur1:.028,
      chx:.36, chy:-.13, chr:.16,
      eyeX:.175, eyeY:.015, eyeR:.050, eyeH:.046,
      browY:.175, browW:.062, browTh:.015, browOn:1,
      moY:-.235, moW:.095, moTh:.014, blY:-.115,
      cr:.902, cg:.525, cb:.435
    }),
    base: { eyeL:1, eyeR:1, smile:1, wide:1, brow:-.35, browA:-.42, curve:1.5, mopen:0, mwide:1, blush:.10 },
    soul: { gain:1.05, stiff:1.25, wob:.9, blush:0, tempo:1.25, amb:3 },
    tweak: {
      eye:  { browA:-.9, brow:-.7 },
      earL: { browA:-.95, brow:-.8 },
      earR: { browA:-.95, brow:-.8 },
      top:  { browA:.35, brow:.5, blush:.85 },
      chin: { browA:.5, brow:.6, blush:.7 }
    }
  }
];

/* ---------------- springs ---------------- */

function S(x, k, c){ return { x, v: 0, t: x, k: k || 210, c: c || 22 }; }
function stepS(s, dt, m){
  const k = s.k*m, c = s.c*Math.sqrt(m);
  s.v += ((s.t - s.x)*k - s.v*c)*dt;
  s.x += s.v*dt;
}

const F = {
  eyeL: S(1), eyeR: S(1), smile: S(1), wide: S(1),
  brow: S(0), browA: S(0), curve: S(3), mopen: S(0), mwide: S(1), blush: S(0),
  pullL: S(0, 260, 20), pullR: S(0, 260, 20),
  roll: S(0, 180, 17), recoil: S(0, 240, 21)
};
const jump = S(0, 150, 13);
const press = S(0, 260, 20);
let wobA = 0, wobP = 0;

/* ---------------- state ---------------- */

let cur = new Float32Array(CHARS[0].p);
let from = new Float32Array(cur), to = new Float32Array(cur), morph = 1;
let ci = 0, soul = CHARS[0].soul, base = CHARS[0].base;

let look = [0, 0], lookT = [0, 0], sway = 0, prevYaw = 0;
let blink = 0, bl = 0, blinkAt = 0, glance = [0, 0];
let NOW = performance.now();
let rxOv = null, rxEnd = 0, near = 0, petLvl = 0, lastPet = 0;
let ambOv = null, ambEnd = 0, ambAt = 0, hoverAmt = 0, drift = [0, 0], idleRoll = 0, flt = [0, 0];
let down = false, inside = false, hoverZone = null;

/* ---------------- CPU side SDF for hit testing ---------------- */

const P3 = (x, y, z) => ({ x, y, z });
function ell(p, rx, ry, rz){
  const k0 = Math.hypot(p.x/rx, p.y/ry, p.z/rz);
  const k1 = Math.hypot(p.x/(rx*rx), p.y/(ry*ry), p.z/(rz*rz));
  return k1 > 0 ? k0*(k0 - 1)/k1 : -1;
}
function cone(p, a, b, r1, r2){
  const bax = b.x-a.x, bay = b.y-a.y, baz = b.z-a.z;
  const l2 = bax*bax + bay*bay + baz*baz;
  if (l2 < 1e-9) return Math.hypot(p.x-a.x, p.y-a.y, p.z-a.z) - r1;
  const rr = r1 - r2, a2 = l2 - rr*rr, il2 = 1/l2;
  const pax = p.x-a.x, pay = p.y-a.y, paz = p.z-a.z;
  const y = pax*bax + pay*bay + paz*baz, z = y - l2;
  const xx = pax*l2 - bax*y, xy = pay*l2 - bay*y, xz = paz*l2 - baz*y;
  const x2 = xx*xx + xy*xy + xz*xz, y2 = y*y*l2, z2 = z*z*l2;
  const k = Math.sign(rr)*rr*rr*x2;
  if (Math.sign(z)*a2*z2 > k) return Math.sqrt(x2 + z2)*il2 - r2;
  if (Math.sign(y)*a2*y2 < k) return Math.sqrt(x2 + y2)*il2 - r1;
  return (Math.sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}
function smn(a, b, k){
  const h = Math.min(1, Math.max(0, 0.5 + 0.5*(b - a)/k));
  return b + (a - b)*h - k*h*(1 - h);
}
function warpJS(q, sq){
  let x = q.x, y = q.y - cur[I.oy], z = q.z - F.recoil.x;
  const c = Math.cos(F.roll.x), s = Math.sin(F.roll.x);
  const rx = c*x - s*y, ry = s*x + c*y;
  const w = wobA*Math.sin(ry*3.6 + wobP);
  return P3(rx*(1 + w), ry*(1 - w*0.55), z*(1 + w));
}
/* distance to each part, sq = [sx,sy] */
function partsJS(q, sq){
  const p = warpJS(q, sq), a = cur;
  const head = ell(p, a[I.hrx]*sq[0], a[I.hry]*sq[1], a[I.hrz]*sq[0]);
  const body = ell(P3(p.x, p.y - a[I.boy]*sq[1], p.z),
    Math.max(a[I.borx],.02)*sq[0], Math.max(a[I.bory],.02)*sq[1], Math.max(a[I.borz],.02));
  const cheek = Math.hypot(Math.abs(p.x) - a[I.chx]*sq[0], p.y - a[I.chy]*sq[1], p.z - 0.13) - Math.max(a[I.chr], .004);
  const lb = P3(a[I.lbx]*sq[0], a[I.lby]*sq[1], 0), lm = P3(a[I.lmx]*sq[0], a[I.lmy]*sq[1], 0), lt = P3(a[I.ltx]*sq[0], a[I.lty]*sq[1], 0);
  const earL = Math.min(cone(p, lb, lm, a[I.lr0], a[I.lr1]), cone(p, lm, lt, a[I.lr1], a[I.lr2]));
  const rb = P3(a[I.rbx]*sq[0], a[I.rby]*sq[1], 0), rm = P3(a[I.rmx]*sq[0], a[I.rmy]*sq[1], 0), rt = P3(a[I.rtx]*sq[0], a[I.rty]*sq[1], 0);
  const earR = Math.min(cone(p, rb, rm, a[I.rr0], a[I.rr1]), cone(p, rm, rt, a[I.rr1], a[I.rr2]));
  const tuft = cone(p, P3(0, a[I.tuy0]*sq[1], 0), P3(a[I.tux]*sq[0], a[I.tuy1]*sq[1], 0),
    Math.max(a[I.tur0],.004), Math.max(a[I.tur1],.004));
  return { p, head, body, cheek, earL, earR, tuft };
}
function mapJS(q, sq){
  const a = cur, k = a[I.k], d = partsJS(q, sq);
  let r = smn(d.head, d.body, k*1.15);
  r = smn(r, d.cheek, k*1.5);
  r = smn(r, d.earL, k);
  r = smn(r, d.earR, k);
  r = smn(r, d.tuft, k*0.85);
  return r;
}

function squashNow(){
  const sy = 1 + Math.max(-0.14, Math.min(0.14, jump.v*0.021)) - press.x*0.14;
  return [1/Math.sqrt(Math.max(sy, 0.5)), sy];
}

/* cast a ray from a canvas point, return the zone */
function pickZone(px, py){
  const r = cvs.getBoundingClientRect();
  const ux = (px/r.width - 0.5)*2*(r.width/r.height);
  const uy = -(py/r.height - 0.5)*2;
  let ro = P3(0, 0.14, CAM);
  let rd = P3(ux*FOV, uy*FOV, -1);
  const rl = Math.hypot(rd.x, rd.y, rd.z);
  rd = P3(rd.x/rl, rd.y/rl, rd.z/rl);

  ro.y -= Math.sin(tSec()*BOBW)*BOBA + jump.x + flt[1];
  ro.x -= flt[0];
  const yaw = look[0]*YAW, pit = -look[1]*PITCH;
  const rp = (o, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return [c*o[0] - s*o[1], s*o[0] + c*o[1]]; };
  let t1 = rp([ro.y, ro.z], pit); ro.y = t1[0]; ro.z = t1[1];
  let t2 = rp([rd.y, rd.z], pit); rd.y = t2[0]; rd.z = t2[1];
  t1 = rp([ro.x, ro.z], yaw); ro.x = t1[0]; ro.z = t1[1];
  t2 = rp([rd.x, rd.z], yaw); rd.x = t2[0]; rd.z = t2[1];

  const sq = squashNow();
  const b = dot(ro, rd), c2 = dot(ro, ro) - 1.55*1.55, hh = b*b - c2;
  if (hh < 0) return null;
  let t = Math.max(-b - Math.sqrt(hh), 0);
  const tmax = -b + Math.sqrt(hh);
  let p = null, hit = false;
  for (let i = 0; i < 90; i++){
    p = P3(ro.x + rd.x*t, ro.y + rd.y*t, ro.z + rd.z*t);
    const d = mapJS(p, sq);
    if (d < 0.0015){ hit = true; break; }
    t += d*0.86;
    if (t > tmax) break;
  }
  if (!hit) return null;

  const d = partsJS(p, sq), a = cur;
  const m = Math.min(d.earL, d.earR, d.tuft, d.body, d.head, d.cheek);
  if (m === d.earL) return { z: 'earL', p };
  if (m === d.earR) return { z: 'earR', p };
  if (m === d.tuft) return { z: 'top', p };
  if (m === d.body) return { z: 'belly', p };

  const w = d.p;
  const ny = w.y/(a[I.hry]*sq[1]), nx = w.x/(a[I.hrx]*sq[0]);
  const hr = [a[I.hrx]*sq[0], a[I.hry]*sq[1], a[I.hrz]*sq[0]];
  const dl = Math.hypot(w.x/hr[0], w.y/hr[1], w.z/hr[2]) || 1;
  const dir = [w.x/hr[0]/dl, w.y/hr[1]/dl, w.z/hr[2]/dl];
  const uvx = Math.atan2(dir[0], dir[2])*hr[0], uvy = Math.asin(Math.max(-1, Math.min(1, dir[1])))*hr[1];
  if (dir[2] > 0.1){
    const ex = Math.abs(Math.abs(uvx) - a[I.eyeX]), ey = Math.abs(uvy - a[I.eyeY]);
    if (ex < a[I.eyeR]*2.0 && ey < (a[I.eyeH] + a[I.eyeR])*1.5) return { z: 'eye', p };
    const mx = Math.abs(uvx), my = Math.abs(uvy - a[I.moY]);
    if (mx < a[I.moW]*2.0 && my < 0.075) return { z: 'chin', p };
  }
  if (ny > 0.46) return { z: 'top', p };
  if (ny < -0.42) return { z: 'chin', p };
  if (Math.abs(nx) > 0.48 || d.cheek < d.head) return { z: nx < 0 ? 'cheekL' : 'cheekR', p };
  return { z: 'nose', p };
}
function dot(a, b){ return a.x*b.x + a.y*b.y + a.z*b.z; }

/* ---------------- reactions ---------------- */

const RX = {
  top:    { label: 'head pat', hold: 560, ov: { eyeL:0, eyeR:0, smile:1, curve:4.4, mwide:1.2, blush:.7, brow:.35 }, imp: { press:.8, jump:.85, wob:.5 } },
  earL:   { label: 'ear tug',  hold: 500, ov: { eyeL:.2, eyeR:.55, smile:.2, curve:.3, mopen:.2, mwide:.8, brow:.75, pullL:1, roll:-.17 }, imp: { wob:1.1 } },
  earR:   { label: 'ear tug',  hold: 500, ov: { eyeL:.55, eyeR:.2, smile:.2, curve:.3, mopen:.2, mwide:.8, brow:.75, pullR:1, roll:.17 }, imp: { wob:1.1 } },
  eye:    { label: 'boop',     hold: 430, ov: { eyeL:0, eyeR:0, smile:0, curve:.2, mopen:.55, mwide:.55, recoil:.17, brow:.9 }, imp: { wob:.85, jump:.25 } },
  nose:   { label: 'boop',     hold: 420, ov: { eyeL:.12, eyeR:.12, wide:1.22, curve:1.1, mopen:.5, mwide:.6, recoil:.13, brow:.8 }, imp: { wob:.75 } },
  cheekL: { label: 'cheek',    hold: 540, ov: { eyeL:.12, eyeR:.8, smile:1, curve:3.9, blush:1, roll:.1, mwide:1.1 }, imp: { wob:.55, press:.3 } },
  cheekR: { label: 'cheek',    hold: 540, ov: { eyeR:.12, eyeL:.8, smile:1, curve:3.9, blush:1, roll:-.1, mwide:1.1 }, imp: { wob:.55, press:.3 } },
  chin:   { label: 'chin rub', hold: 620, ov: { eyeL:0, eyeR:0, smile:1, curve:2.6, mopen:.7, mwide:1.1, blush:.45 }, imp: { wob:.45, jump:.35 } },
  belly:  { label: 'tickle',   hold: 660, ov: { eyeL:0, eyeR:0, smile:1, curve:4.6, mopen:.85, mwide:1.3, blush:.55 }, imp: { wob:1.7, jump:.65, press:.45 } }
};

/* ---------------- ambient life ----------------
   Weights are per character: [Bo, Pim, Nuu, Tak] */

const AMB = [
  { id:'blink2', hold:260, w:[3,3,4,2],
    fn(){ blink = 1e-3; setTimeout(() => { if (!(rxOv && performance.now() < rxEnd)) blink = 1e-3; }, 230); } },

  { id:'glance', hold:760, w:[3.5,4,2,3],
    fn(){ glance = [(Math.random() - .5)*1.15, (Math.random() - .5)*0.5];
          setTimeout(() => { glance = [0, 0]; }, 620 + Math.random()*700); } },

  { id:'earflick', hold:220, w:[3,2,1.5,4],
    fn(){ (Math.random() < .5 ? F.pullL : F.pullR).v += 6.0; } },

  { id:'hop', hold:440, w:[3,1,.4,2], ov:{ eyeL:.3, eyeR:.3, smile:1, curve:4.0 }, imp:{ jump:.45, wob:.3 } },

  { id:'wiggle', hold:560, w:[2,1,1,1.5], ov:{ smile:1, curve:3.9 }, imp:{ wob:.6 },
    fn(){ F.roll.v += (Math.random() < .5 ? 4.2 : -4.2); } },

  { id:'yawn', hold:1050, w:[1,1,4,.8], ov:{ eyeL:0, eyeR:0, smile:.2, mopen:.85, mwide:.75, curve:.8 },
    imp:{ jump:.18 } },

  { id:'tilt', hold:900, w:[2,3,2,2], ov:{ roll:.14, smile:1, curve:3.4 }, flip:true },

  { id:'grin', hold:760, w:[2,2,1,1], ov:{ smile:1, curve:4.3, blush:.45, mwide:1.08 } },

  { id:'sniff', hold:460, w:[2,1,1,3], ov:{ recoil:-.045, mopen:.14, mwide:.5, eyeL:.55, eyeR:.55 },
    imp:{ wob:.2 } },

  { id:'stretch', hold:680, w:[2,1.5,2,1], ov:{ eyeL:0, eyeR:0, smile:1, curve:2.2 }, imp:{ jump:.30, wob:.2 } },

  { id:'doze', hold:1600, w:[.4,1,4,.3], ov:{ eyeL:.10, eyeR:.10, smile:.6, curve:.7, roll:.09 }, flip:true }
];

function fireAmb(now){
  const k = soul.amb;
  let total = 0;
  for (const a of AMB) total += a.w[k];
  let r = Math.random()*total, pick = AMB[0];
  for (const a of AMB){ r -= a.w[k]; if (r <= 0){ pick = a; break; } }

  if (pick.ov){
    const ov = Object.assign({}, pick.ov);
    if (pick.flip && Math.random() < .5 && 'roll' in ov) ov.roll = -ov.roll;
    ambOv = ov;
    ambEnd = now + pick.hold;
  }
  if (pick.imp){
    const g = soul.gain*0.8;
    if (pick.imp.jump) jump.v += pick.imp.jump*g*3.4;
    if (pick.imp.wob) wobA = Math.min(0.11, wobA + pick.imp.wob*g*soul.wob*0.045);
  }
  ambStats[pick.id] = (ambStats[pick.id] || 0) + 1;
  if (pick.fn) pick.fn();
}

function scheduleAmb(now){ ambAt = now + (2000 + Math.random()*2800)/soul.tempo; }
const ambStats = {};

const chip = document.getElementById('chip');
const chipTxt = document.getElementById('chipTxt');
const ripple = document.getElementById('ripple');
let chipT = 0;

function showChip(x, y, txt){
  chipTxt.textContent = txt;
  chip.style.left = x + 'px';
  chip.style.top = y + 'px';
  chip.classList.remove('on');
  void chip.offsetWidth;
  chip.classList.add('on');
  clearTimeout(chipT);
  chipT = setTimeout(() => chip.classList.remove('on'), 900);

  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.remove('go');
  void ripple.offsetWidth;
  ripple.classList.add('go');
}

function react(zone, sx, sy, silent){
  const r = RX[zone];
  if (!r) return;
  const ch = CHARS[ci];
  const tw = ch.tweak[zone] || ch.tweak[zone.replace(/[LR]$/, '')] || {};
  rxOv = Object.assign({}, r.ov, tw);
  rxEnd = NOW + r.hold;

  const g = soul.gain;
  if (r.imp.press) press.x = Math.min(1, r.imp.press*g);
  if (r.imp.jump) jump.v += r.imp.jump*g*3.4;
  if (r.imp.wob){ wobA = Math.min(0.13, wobA + r.imp.wob*g*soul.wob*0.045); }
  F.wide.v += 1.4;
  ambOv = null; ambEnd = 0;
  if (!silent) showChip(sx, sy, r.label);
}

/* ---------------- UI ---------------- */

const picker = document.getElementById('picker');
const thumb = document.getElementById('thumb');

CHARS.forEach((c, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="dot" style="background:${c.hex}"></span>${c.name}`;
  b.addEventListener('click', () => select(i));
  picker.appendChild(b);
});
const tabs = [...picker.querySelectorAll('button')];
tabs[0].classList.add('on');

function moveThumb(){
  const b = tabs[ci];
  thumb.style.width = b.offsetWidth + 'px';
  thumb.style.transform = `translateX(${b.offsetLeft}px)`;
}
requestAnimationFrame(moveThumb);

function select(i){
  if (i === ci) return;
  ci = i;
  soul = CHARS[i].soul;
  base = CHARS[i].base;
  tabs.forEach((b, k) => b.classList.toggle('on', k === i));
  moveThumb();
  from = new Float32Array(cur);
  to = new Float32Array(CHARS[i].p);
  morph = 0;
  jump.x = 0.55; jump.v = 0;
  wobA = Math.min(0.12, wobA + 0.05);
  rxOv = null; rxEnd = 0; petLvl = 0;
}

document.getElementById('gear').addEventListener('click', () => {
  const d = document.documentElement.dataset.t === 'dark';
  document.documentElement.dataset.t = d ? 'light' : 'dark';
});

/* ---------------- input ---------------- */

function local(e){
  const r = cvs.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

cvs.addEventListener('pointermove', e => {
  inside = true;
  const [x, y] = local(e);
  const r = cvs.getBoundingClientRect();
  lookT[0] = (x/r.width - 0.5)*2;
  lookT[1] = -(y/r.height - 0.5)*2;
  near = 1 - Math.min(1, Math.hypot(lookT[0], lookT[1] - 0.05)/0.9);

  const now = NOW;
  if (down){
    const h = pickZone(x, y);
    if (h && now - lastPet > 130){
      lastPet = now;
      petLvl = Math.min(1, petLvl + 0.22);
      react(h.z, x, y, true);
      rxEnd = now + 420;
      jump.v += 1.1;
    }
  } else if (now - lastPet > 60){
    lastPet = now;
    const h = pickZone(x, y);
    hoverZone = h ? h.z : null;
    cvs.style.cursor = h ? 'pointer' : 'default';
  }
});

cvs.addEventListener('pointerleave', () => { inside = false; lookT[0] = 0; lookT[1] = 0; near = 0; down = false; });

cvs.addEventListener('pointerdown', e => {
  const [x, y] = local(e);
  down = true;
  cvs.setPointerCapture(e.pointerId);
  const h = pickZone(x, y);
  if (h){ react(h.z, x, y); petLvl = Math.min(1, petLvl + 0.15); }
  else { blink = 1e-3; }
});
cvs.addEventListener('pointerup', () => { down = false; });

/* ---------------- render ---------------- */

const t0 = performance.now();
let last = t0;
const tSec = () => (performance.now() - t0)/1000;

function resize(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(cvs.clientWidth*dpr), h = Math.round(cvs.clientHeight*dpr);
  if (cvs.width !== w || cvs.height !== h){ cvs.width = w; cvs.height = h; gl.viewport(0, 0, w, h); }
}

function theme(){
  return document.documentElement.dataset.t === 'dark'
    ? { bg: [0.098, 0.098, 0.098], ink: [0.09, 0.095, 0.11] }
    : { bg: [0.965, 0.965, 0.957], ink: [0.125, 0.133, 0.153] };
}
let bg = theme().bg.slice(), ink = theme().ink.slice();

jump.x = 1.15;
ambAt = performance.now() + 1400;

function sim(dt, now){
  NOW = now;

  if (morph < 1){
    morph = Math.min(1, morph + dt/0.46);
    const e = 1 - Math.pow(1 - morph, 3);
    for (let i = 0; i < NP; i++) cur[i] = from[i] + (to[i] - from[i])*e;
  }

  /* ambient behaviour fires only when the user is not touching */
  if (now > ambAt){
    scheduleAmb(now);
    if (!(rxOv && now < rxEnd) && !down) fireAmb(now);
  }

  /* expression target: character base, then ambient, then user reaction */
  const user = (rxOv && now < rxEnd) ? rxOv : null;
  const act = user || ((ambOv && now < ambEnd) ? ambOv : null);
  const g = user ? soul.gain : soul.gain*0.8;
  for (const k in F){
    const b = (k in base) ? base[k] : 0;
    let t = b;
    if (act && k in act) t = b + (act[k] - b)*g;
    if (k === 'blush') t = Math.min(1, t + soul.blush + petLvl*0.35);
    if (k === 'wide') t += near*0.05;
    if (k === 'mwide' && act) t += petLvl*0.1;
    F[k].t = t;
  }
  if (!act){ F.pullL.t = 0; F.pullR.t = 0; F.roll.t = 0; F.recoil.t = 0; }
  press.t = 0; jump.t = 0;

  /* spring substeps */
  let rest = dt;
  while (rest > 0){
    const h = Math.min(rest, 1/240);
    for (const k in F) stepS(F[k], h, soul.stiff);
    stepS(jump, h, soul.stiff);
    stepS(press, h, 1);
    rest -= h;
  }
  wobA *= Math.exp(-dt*4.2);
  wobP += dt*17;
  petLvl = Math.max(0, petLvl - dt*0.32);

  /* gaze: cursor when hovering, slow self-drift otherwise */
  const T = (now - t0)/1000, tp = soul.tempo;
  drift[0] = (Math.sin(T*0.29*tp)*0.55 + Math.sin(T*0.61*tp + 1.3)*0.30 + Math.sin(T*1.07*tp + 2.7)*0.15)*0.40;
  drift[1] = (Math.sin(T*0.23*tp + 0.7)*0.55 + Math.sin(T*0.53*tp + 2.1)*0.35)*0.16;
  idleRoll = Math.sin(T*0.31*tp + 1.1)*0.022 + Math.sin(T*0.17*tp)*0.012;
  flt[0] = Math.sin(T*0.41*tp + 0.4)*0.030 + Math.sin(T*0.19*tp)*0.018;
  flt[1] = Math.sin(T*0.57*tp + 1.9)*0.020;
  hoverAmt += ((down || inside ? 1 : 0) - hoverAmt)*Math.min(1, dt*4.5);

  const kk = 1 - Math.pow(0.0015, dt);
  const gx = drift[0] + (lookT[0] - drift[0])*hoverAmt + glance[0];
  const gy = drift[1] + (lookT[1] - drift[1])*hoverAmt + glance[1];
  look[0] += (gx - look[0])*kk;
  look[1] += (gy - look[1])*kk;
  const yaw = look[0]*YAW;
  sway += (-(yaw - prevYaw)/Math.max(dt, 0.001)*0.05 - sway)*Math.min(1, dt*9);
  prevYaw = yaw;

  /* idle motion */
  if (now > blinkAt){ blinkAt = now + 2400 + Math.random()*3200; blink = 1e-3; }
  if (blink > 0){ blink += dt/0.085; if (blink > 2) blink = 0; }
  const tri = blink > 0 ? Math.min(1, blink < 1 ? blink : 2 - blink) : 0;
  bl = tri*tri*(3 - 2*tri);

  const tc = theme();
  for (let i = 0; i < 3; i++){
    bg[i] += (tc.bg[i] - bg[i])*Math.min(1, dt*9);
    ink[i] += (tc.ink[i] - ink[i])*Math.min(1, dt*9);
  }

}

function draw(now){
  const sq = squashNow();
  resize();

  gl.uniform2f(U.uRes, cvs.width, cvs.height);
  gl.uniform1f(U.uTime, (now - t0)/1000);
  gl.uniform3fv(U.uBg, bg);
  gl.uniform3fv(U.uInk, ink);
  gl.uniform1fv(U.P, cur);
  gl.uniform2f(U.uSquash, sq[0], sq[1]);
  gl.uniform1f(U.uSway, Math.max(-1.6, Math.min(1.6, sway)));
  gl.uniform2f(U.uPull, Math.min(1.15, F.pullL.x), Math.min(1.15, F.pullR.x));
  gl.uniform1f(U.uRoll, F.roll.x + idleRoll);
  gl.uniform1f(U.uRecoil, F.recoil.x);
  gl.uniform2f(U.uWob, wobA, wobP);
  gl.uniform1f(U.uJump, jump.x);
  gl.uniform2f(U.uLook, look[0], look[1]);
  gl.uniform2f(U.uFloat, flt[0], flt[1]);
  gl.uniform2f(U.uEyeOpen, Math.max(0, F.eyeL.x*(1 - bl)), Math.max(0, F.eyeR.x*(1 - bl)));
  gl.uniform1f(U.uSmile, Math.max(0, Math.min(1, F.smile.x)));
  gl.uniform1f(U.uWide, F.wide.x);
  gl.uniform2f(U.uPupil, look[0]*0.030, look[1]*0.024);
  gl.uniform2f(U.uBrow, F.brow.x, F.browA.x);
  gl.uniform3f(U.uMouth, F.curve.x, Math.max(0, F.mopen.x), F.mwide.x);
  gl.uniform1f(U.uBlush, Math.max(0, Math.min(1, F.blush.x)));

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function frame(now){
  const dt = Math.min((now - last)/1000, 0.04);
  last = now;
  sim(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* debug hook: advance n simulation steps and redraw */
window.__step = (n, dt) => {
  const h = dt || 1/60;
  let t = NOW;
  for (let i = 0; i < (n || 30); i++){ t += h*1000; sim(h, t); }
  draw(t);
};
window.__amb = () => ambStats;
window.__pick = pickZone;
window.__hit = (x, y) => { const h = pickZone(x, y); if (h) react(h.z, x, y); return h && h.z; };
window.__state = () => ({ jump: +jump.x.toFixed(3), press: +press.x.toFixed(3), wob: +wobA.toFixed(3),
  eyeL: +F.eyeL.x.toFixed(2), eyeR: +F.eyeR.x.toFixed(2), blush: +F.blush.x.toFixed(2),
  mopen: +F.mopen.x.toFixed(2), roll: +F.roll.x.toFixed(2), pull: [+F.pullL.x.toFixed(2), +F.pullR.x.toFixed(2)] });
