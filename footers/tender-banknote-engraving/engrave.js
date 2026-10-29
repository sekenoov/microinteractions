// Tender footer: a banknote back. The landscape is rendered once on the GPU into a
// G-buffer (tone, height, depth, kind), then engraved on the CPU as burin strokes:
// evenly spaced streamlines along the terrain's height contours, cross-hatching in
// the deepest shade, straight lines in sky and water, conifers from short strokes.
(() => {
const Q = location.search, REC = Q.includes('rec'), DEBUG = Q.includes('tone');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches && !REC;
if (REC) document.body.classList.add('rec');
const PAPER = '#efe9dc', INK = '#1d4a3a';
const DUR = 5.9; window.__dur = DUR;

// ---------- composition (design units, 1440 x 810) ----------
const GX0 = 36, GX1 = 1404, GY0 = 240, GY1 = 736, GR = 2;
const GW = (GX1 - GX0) * GR, GH = (GY1 - GY0) * GR;
const HZ = 588, SX = 636, SY = 468, SR = 50, LB = 732;
const DSEP = 3.0, STEP = .7;
const DRAW = 1.5, ROS_T = .3;            // draw-on: rosette first, then strokes outward
const TURN = 120;                         // seconds per rosette turn

// ---------- noise ----------
function hash(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296 }
function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v }
function fbm(x, y) { let s = 0, a = .5, f = 1; for (let i = 0; i < 5; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= .5 } return s / .97 }
const sst = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t) };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

// ---------- G-buffer on the GPU ----------
const FS = `#version 300 es
precision highp float;
uniform vec2 uOrg;uniform float uRes,uH;
out vec4 o;
const float HZ=588.,FOC=1150.,CX=720.;
const mat2 M=mat2(.8,-.6,.6,.8);
vec3 L;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn(vec2 x){vec2 p=floor(x),w=fract(x),u=w*w*(3.-2.*w);
  float a=hash(p),b=hash(p+vec2(1,0)),c=hash(p+vec2(0,1)),d=hash(p+vec2(1,1));
  return a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y;}
vec3 noised(vec2 x){vec2 p=floor(x),w=fract(x);
  vec2 u=w*w*w*(w*(w*6.-15.)+10.),du=30.*w*w*(w*(w-2.)+1.);
  float a=hash(p),b=hash(p+vec2(1,0)),c=hash(p+vec2(0,1)),d=hash(p+vec2(1,1));
  float k1=b-a,k2=c-a,k4=a-b-c+d;
  return vec3(-1.+2.*(a+k1*u.x+k2*u.y+k4*u.x*u.y),2.*du*vec2(k1+k4*u.y,k2+k4*u.x));}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=M*p*2.02;a*=.5;}return s/.97;}
float ero(vec2 p,int oct){float a=0.,b=.5;vec2 d=vec2(0);
  for(int i=0;i<11;i++){if(i>=oct)break;vec3 n=noised(p);d+=n.yz;a+=b*n.x/(1.+dot(d,d));b*=.5;p=M*p*2.03;}
  return a;}
float cone(vec2 p,vec2 c,vec2 r){return max(0.,1.-length((p-c)/r));}
float H(vec2 o,int oct){
  vec2 p=o+vec2(fbm(o*.09)-.5,fbm(o*.09+vec2(5.2,1.3))-.5)*5.;
  float r=1.-abs(ero(o*.17+vec2(3.1,7.7),max(oct-3,4)));
  float n=ero(o*.36+vec2(1.3,.4),oct);
  float A=cone(p,vec2(9.6,-27.),vec2(9.5,8.));
  float A2=cone(p,vec2(17.,-32.),vec2(7.5,7.));
  float B=cone(p,vec2(-11.5,-22.5),vec2(8.,7.));
  float B2=cone(p,vec2(-20.,-31.),vec2(7.,7.));
  float F=(1.-smoothstep(-66.,-52.,o.y))*smoothstep(-110.,-90.,o.y);
  float dip=1.-.8*exp(-pow((o.x+5.5)/9.,2.));
  float k=.42+.78*r,h=0.;
  h+=7.4*pow(A,1.2)*k+4.4*pow(A2,1.2)*k+5.9*pow(B,1.2)*k+3.6*pow(B2,1.2)*k;
  h+=F*dip*(1.5+2.4*r*r);
  h+=(A+A2+B+B2+F*.6)*2.2*n;
  h+=.45*n-.42;
  return h;
}
float march(vec3 ro,vec3 rd,float tmax,int oct){
  float t=.2,lt=.2;
  for(int i=0;i<300;i++){
    vec3 p=ro+rd*t;float h=p.y-H(p.xz,oct);
    if(h<.0012*t){for(int k=0;k<7;k++){float m=.5*(lt+t);vec3 q=ro+rd*m;if(q.y-H(q.xz,oct)<0.)t=m;else lt=m;}return t;}
    lt=t;t+=max(.4*h,.002*t);
    if(t>tmax)break;
  }
  return -1.;
}
float shadow(vec3 p,vec3 l){
  float res=1.,t=.06;
  for(int i=0;i<72;i++){vec3 q=p+l*t;float h=q.y-H(q.xz,6);res=min(res,9.*h/t);if(res<-.2)break;t+=clamp(.5*h,.04,1.6);if(t>60.)break;}
  return smoothstep(-.2,1.,res);
}
vec3 nrm(vec3 p,float t){float e=max(.0018*t,.004);
  return normalize(vec3(H(p.xz-vec2(e,0),11)-H(p.xz+vec2(e,0),11),2.*e,H(p.xz-vec2(0,e),11)-H(p.xz+vec2(0,e),11)));}
float terrainLum(vec3 p,vec3 n,float t,out float lit){
  float snow=smoothstep(3.9,5.1,p.y+.9*fbm(p.xz*.9))*smoothstep(.5,.78,n.y);
  float forest=(1.-smoothstep(.4,1.5,p.y+.6*fbm(p.xz*.6)))*smoothstep(.6,.82,n.y);
  float strata=.92+.16*vn(vec2(p.x*1.2+p.y*3.,p.y*14.));
  float alb=mix(.52*strata,.97,snow);
  alb=mix(alb,.2,forest*(1.-snow));
  float dif=max(dot(n,L),0.);
  float sh=dif>0.?shadow(p+n*.03,L):0.;
  lit=dif*sh;
  float lum=alb*(1.15*lit+.34+.16*n.y)+.03;
  lum=mix(lum,.8,1.-exp(-t*.017));
  float mist=exp(-max(p.y+.1,0.)*2.4)*(.4+.6*fbm(p.xz*.18))*smoothstep(12.,24.,t);
  return mix(lum,.88,mist*.6);
}
void main(){
  L=normalize(vec3(-.72,.5,.34));
  vec2 fc=gl_FragCoord.xy;
  vec2 d=vec2(uOrg.x+fc.x/uRes,uOrg.y+(uH-fc.y)/uRes);
  vec3 ro=vec3(0,1.05,0),rd=normalize(vec3((d.x-CX)/FOC,(HZ-d.y)/FOC,-1.));
  float tw=rd.y<0.?ro.y/(-rd.y):1e9;
  float tt=march(ro,rd,min(tw,170.),8);
  if(tt>0.){vec3 p=ro+rd*tt;float lit;float l=terrainLum(p,nrm(p,tt),tt,lit);o=vec4(l,p.y,tt,2.+(lit<.12?4.:0.));return;}
  if(tw<1e8){
    vec3 p=ro+rd*tw,r=reflect(rd,vec3(0,1,0));
    float tr=march(p+vec3(0,.01,0),r,150.,7),rl=.84;
    if(tr>0.){vec3 q=p+r*tr;float lit;rl=terrainLum(q,nrm(q,tr+tw),tr+tw,lit);}
    o=vec4(.05+.86*rl,0.,tw,1.);return;
  }
  o=vec4(.85,0.,0.,0.);
}`;

let LUM, HGT, DEP, KND;
function gbuffer() {
  const c = document.createElement('canvas'); c.width = GW; c.height = GH;
  const gl = c.getContext('webgl2', { antialias: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('WebGL2 float targets unavailable');
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GW, GH, 0, gl.RGBA, gl.FLOAT, null);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.uniform2f(gl.getUniformLocation(pr, 'uOrg'), GX0, GY0); gl.uniform1f(gl.getUniformLocation(pr, 'uRes'), GR); gl.uniform1f(gl.getUniformLocation(pr, 'uH'), GH);
  gl.viewport(0, 0, GW, GH); gl.enable(gl.SCISSOR_TEST);
  for (let y = 0; y < GH; y += 96) { gl.scissor(0, y, GW, Math.min(96, GH - y)); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish() }
  const px = new Float32Array(GW * GH * 4); gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.FLOAT, px);
  const N = GW * GH; LUM = new Float32Array(N); HGT = new Float32Array(N); DEP = new Float32Array(N); KND = new Uint8Array(N);
  for (let r = 0; r < GH; r++) { const src = r * GW * 4, dst = (GH - 1 - r) * GW;
    for (let x = 0; x < GW; x++) { const s = src + x * 4, i = dst + x; LUM[i] = px[s]; HGT[i] = px[s + 1]; DEP[i] = px[s + 2]; KND[i] = px[s + 3] | 0 } }
  const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
}

// ---------- sampling ----------
let BLOCK;  // design-res mask: trees, rosette, serial
function gidx(x, y) { const px = ((x - GX0) * GR) | 0, py = ((y - GY0) * GR) | 0; if (px < 0 || py < 0 || px >= GW || py >= GH) return -1; return py * GW + px }
function kindAt(x, y) { if (x < GX0 || x >= GX1 || y < GY0 || y >= LB) return 9; if (BLOCK[(y | 0) * 1440 + (x | 0)]) return 8; const i = gidx(x, y); return i < 0 ? 9 : KND[i] & 3 }
function shadedAt(x, y) { const i = gidx(x, y); return i >= 0 && (KND[i] & 4) }
function depthAt(x, y) { const i = gidx(x, y); return i < 0 ? 0 : DEP[i] }
function lumAt(x, y) {
  let fx = (x - GX0) * GR - .5, fy = (y - GY0) * GR - .5; fx = clamp(fx, 0, GW - 1.001); fy = clamp(fy, 0, GH - 1.001);
  const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, i = y0 * GW + x0;
  return LUM[i] * (1 - ax) * (1 - ay) + LUM[i + 1] * ax * (1 - ay) + LUM[i + GW] * (1 - ax) * ay + LUM[i + GW + 1] * ax * ay;
}
const darkOf = l => Math.pow(clamp((1 - l) / .8, 0, 1), 1.05);

// ---------- contour direction field from the height buffer ----------
let DX, DY;
function boxBlur(A, R) {
  const T = new Float32Array(A.length);
  for (let y = 0; y < GH; y++) { const o = y * GW; let s = 0;
    for (let x = -R; x <= R; x++) s += A[o + clamp(x, 0, GW - 1)];
    for (let x = 0; x < GW; x++) { T[o + x] = s; s += A[o + Math.min(GW - 1, x + R + 1)] - A[o + Math.max(0, x - R)] } }
  for (let x = 0; x < GW; x++) { let s = 0;
    for (let y = -R; y <= R; y++) s += T[clamp(y, 0, GH - 1) * GW + x];
    for (let y = 0; y < GH; y++) { A[y * GW + x] = s; s += T[Math.min(GH - 1, y + R + 1) * GW + x] - T[Math.max(0, y - R) * GW + x] } }
}
const TILT = .74;
function directions() {
  const N = GW * GH, F = new Float32Array(N);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x; if ((KND[i] & 3) !== 2) continue;
    const dx = GX0 + (x + .5) / GR, dy = GY0 + (y + .5) / GR, a = (dx - 720) / 1150, b = (588 - dy) / 1150;
    const z = -DEP[i] / Math.sqrt(1 + a * a + b * b);
    F[i] = HGT[i] * Math.cos(TILT) + z * Math.sin(TILT);
  }
  { const m = new Float32Array(N); for (let i = 0; i < N; i++) if ((KND[i] & 3) === 2) m[i] = 1;
    const fm = F.slice(); boxBlur(fm, 11); boxBlur(fm, 11); const mm = m.slice(); boxBlur(mm, 11); boxBlur(mm, 11);
    for (let i = 0; i < N; i++) if (m[i]) F[i] = fm[i] / Math.max(mm[i], 1e-6) }
  const jxx = new Float32Array(N), jxy = new Float32Array(N), jyy = new Float32Array(N), w = new Float32Array(N);
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const i = y * GW + x; if ((KND[i] & 3) !== 2) continue; const d = DEP[i];
    const ok = j => (KND[j] & 3) === 2 && Math.abs(DEP[j] - d) < d * .04;
    const l = i - 1, r = i + 1, u = i - GW, n = i + GW; let hx = 0, hy = 0;
    if (ok(l) && ok(r)) hx = (F[r] - F[l]) * .5; else if (ok(r)) hx = F[r] - F[i]; else if (ok(l)) hx = F[i] - F[l];
    if (ok(u) && ok(n)) hy = (F[n] - F[u]) * .5; else if (ok(n)) hy = F[n] - F[i]; else if (ok(u)) hy = F[i] - F[u];
    jxx[i] = hx * hx; jxy[i] = hx * hy; jyy[i] = hy * hy; w[i] = 1;
  }
  for (const A of [jxx, jxy, jyy, w]) { boxBlur(A, 9); boxBlur(A, 9) }
  DX = new Float32Array(N); DY = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let tx = 1, ty = 0;
    if (w[i] > .05) {
      const a = jxx[i] / w[i], b = jxy[i] / w[i], c = jyy[i] / w[i], m = a + c;
      if (m > 1e-9) {
        const phi = .5 * Math.atan2(2 * b, a - c); let ux = -Math.sin(phi), uy = Math.cos(phi); if (ux < 0) { ux = -ux; uy = -uy }
        const s = sst(1e-7, 2e-6, m); tx = ux * s + (1 - s); ty = uy * s; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      }
    }
    DX[i] = tx; DY[i] = ty;
  }
}
const CA = Math.cos(1.02), SA = Math.sin(1.02);
function dirAt(x, y, fam) {
  const i = gidx(x, y); let tx = 1, ty = 0; if (i >= 0) { tx = DX[i]; ty = DY[i] }
  return fam ? [tx * CA - ty * SA, tx * SA + ty * CA] : [tx, ty];
}

// ---------- evenly spaced streamlines (Jobard-Lefer) ----------
function makeGrid(cs) {
  const cols = Math.ceil(1440 / cs) + 1, rows = Math.ceil(810 / cs) + 1, cells = new Array(cols * rows);
  return {
    add(x, y, id, sq) { const k = ((y / cs) | 0) * cols + ((x / cs) | 0); (cells[k] || (cells[k] = [])).push(x, y, id, sq) },
    near(x, y, r, id, sq, self) {
      const r2 = r * r, cx = (x / cs) | 0, cy = (y / cs) | 0, n = Math.ceil(r / cs);
      for (let j = cy - n; j <= cy + n; j++) { if (j < 0 || j >= rows) continue;
        for (let i = cx - n; i <= cx + n; i++) { if (i < 0 || i >= cols) continue; const c = cells[j * cols + i]; if (!c) continue;
          for (let q = 0; q < c.length; q += 4) { if (c[q + 2] === id && Math.abs(c[q + 3] - sq) < self) continue;
            const dx = c[q] - x, dy = c[q + 1] - y; if (dx * dx + dy * dy < r2) return true } } }
      return false;
    }
  };
}
function streamlines(fam, inMask, dsep, dtest, seedStep) {
  const grid = makeGrid(dsep), lines = [], SELF = Math.ceil(2.4 * dsep / STEP); let id = 0;
  const queue = []; let head = 0;
  const trace = (sx, sy) => {
    const me = ++id; grid.add(sx, sy, me, 0); const halves = [[], []];
    for (let h = 0; h < 2; h++) {
      const dir = h ? -1 : 1, out = halves[h]; let px = sx, py = sy, [vx, vy] = dirAt(sx, sy, fam); vx *= dir; vy *= dir;
      let pd = depthAt(px, py), sq = 0;
      for (let n = 0; n < 1800; n++) {
        let [ax, ay] = dirAt(px, py, fam); if (ax * vx + ay * vy < 0) { ax = -ax; ay = -ay }
        let [bx, by] = dirAt(px + ax * STEP * .5, py + ay * STEP * .5, fam); if (bx * ax + by * ay < 0) { bx = -bx; by = -by }
        const nx = px + bx * STEP, ny = py + by * STEP;
        if (!inMask(nx, ny)) break;
        const nd = depthAt(nx, ny); if (Math.abs(nd - pd) > pd * .035) break;
        sq += dir; if (grid.near(nx, ny, dtest, me, sq, SELF)) break;
        grid.add(nx, ny, me, sq); out.push(nx, ny); px = nx; py = ny; pd = nd; vx = bx; vy = by;
      }
    }
    const b = halves[1], f = halves[0], pts = [];
    for (let i = b.length - 2; i >= 0; i -= 2) pts.push(b[i], b[i + 1]);
    pts.push(sx, sy); for (let i = 0; i < f.length; i++) pts.push(f[i]);
    lines.push(pts);
    for (let i = 2; i < pts.length - 3; i += 8) {
      const x = pts[i], y = pts[i + 1]; let tx = pts[i + 2] - pts[i - 2], ty = pts[i + 3] - pts[i - 1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      queue.push(x - ty * dsep, y + tx * dsep, x + ty * dsep, y - tx * dsep);
    }
  };
  const ok = (x, y) => inMask(x, y) && !grid.near(x, y, dsep * .92, -1, 0, 0);
  for (let y = GY0 + 2; y < LB; y += seedStep) for (let x = GX0 + 2; x < GX1; x += seedStep) {
    if (!ok(x, y)) continue; trace(x, y);
    while (head < queue.length) { const qx = queue[head++], qy = queue[head++]; if (ok(qx, qy)) trace(qx, qy) }
  }
  return lines;
}

// ---------- strokes ----------
// a stroke is {p: Float32Array [x,y,w,...], x0,y0,x1,y1, t0, dur}
const strokes = [];
function smoothW(w, R, passes) {
  for (let k = 0; k < passes; k++) { const c = w.slice(); for (let i = 0; i < w.length; i++) { let s = 0, n = 0; for (let j = i - R; j <= i + R; j++) if (j >= 0 && j < w.length) { s += c[j]; n++ } w[i] = s / n } }
}
function pushStroke(xy, widths, taper = 7, minLen = 4) {
  const n = xy.length / 2; if (n < 2) return;
  let len = 0; const acc = [0]; for (let i = 1; i < n; i++) { len += Math.hypot(xy[i * 2] - xy[i * 2 - 2], xy[i * 2 + 1] - xy[i * 2 - 1]); acc.push(len) }
  if (len < minLen) return;
  const p = new Float32Array(n * 3); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = 0;
  for (let i = 0; i < n; i++) {
    const x = xy[i * 2], y = xy[i * 2 + 1], s = acc[i], tp = Math.min(len / 2, taper);
    const w = widths[i] * sst(0, tp, s) * sst(0, tp, len - s);
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = w; if (w > .06) any = 1;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (any) strokes.push({ p, x0, y0, x1, y1, len });
}
function decimate(pts, k) { const o = []; const n = pts.length / 2; for (let i = 0; i < n; i += k) o.push(pts[i * 2], pts[i * 2 + 1]); if ((n - 1) % k) o.push(pts[n * 2 - 2], pts[n * 2 - 1]); return o }
// break a polyline into strokes wherever the width stays near zero, so highlights read as clean gaps
function emitByTone(xy, widths, taper) {
  let s = 0; const n = widths.length;
  while (s < n) {
    while (s < n && widths[s] < .07) s++;
    let e = s; while (e < n && widths[e] >= .07) e++;
    if (e - s > 1) pushStroke(xy.slice(Math.max(0, s - 1) * 2, Math.min(n, e + 1) * 2), widths.slice(Math.max(0, s - 1), Math.min(n, e + 1)), taper);
    s = e + 1;
  }
}

function terrainStrokes() {
  const inT = (x, y) => kindAt(x, y) === 2;
  for (const pts of streamlines(0, inT, DSEP, DSEP * .5, 7)) {
    const xy = decimate(pts, 2), n = xy.length / 2, w = new Array(n);
    for (let i = 0; i < n; i++) w[i] = .8 * DSEP * darkOf(lumAt(xy[i * 2], xy[i * 2 + 1]));
    smoothW(w, 3, 2); emitByTone(xy, w, 6);
  }
  const deep = (x, y) => kindAt(x, y) === 2 && shadedAt(x, y) && darkOf(lumAt(x, y)) > .6;
  for (const pts of streamlines(1, deep, DSEP * 1.05, DSEP * .55, 5)) {
    const xy = decimate(pts, 2), n = xy.length / 2, w = new Array(n);
    for (let i = 0; i < n; i++) w[i] = .42 * DSEP * clamp((darkOf(lumAt(xy[i * 2], xy[i * 2 + 1])) - .56) / .34, 0, 1);
    smoothW(w, 3, 2); emitByTone(xy, w, 5);
  }
}
// silhouettes: where sky meets terrain, or a nearer slope overlaps a farther one
function edgeStrokes() {
  const pts = [];
  for (let x = GX0 + .25; x < GX1; x += .5) {
    let pk = kindAt(x, GY0 + .25), pd = depthAt(x, GY0 + .25); const col = [];
    for (let y = GY0 + .75; y < LB; y += .5) {
      const k = kindAt(x, y), d = depthAt(x, y);
      if ((pk === 0 && k === 2) || (pk === 2 && k === 2 && pd > d * 1.12)) col.push(y - .25);
      pk = k; pd = d;
    }
    pts.push(col);
  }
  let active = [];
  const flush = a => { if (a.xy.length >= 8) { const n = a.xy.length / 2, w = new Array(n); for (let i = 0; i < n; i++) w[i] = .4 + .45 * darkOf(lumAt(a.xy[i * 2], a.xy[i * 2 + 1] + 1.5)); smoothW(w, 3, 1); pushStroke(decimate(a.xy, 2), decimate(w.flatMap(v => [v, 0]), 2).filter((_, i) => i % 2 === 0), 4) } };
  for (let c = 0; c < pts.length; c++) {
    const x = GX0 + .25 + c * .5, next = [];
    for (const y of pts[c]) {
      let best = null, bd = 4.5; for (const a of active) { const d = Math.abs(a.ly - y); if (d < bd && !a.used) { bd = d; best = a } }
      if (best) { best.used = true; best.xy.push(x, y); best.ly = y; next.push(best) } else next.push({ xy: [x, y], ly: y, used: true });
    }
    for (const a of active) if (!a.used) flush(a);
    for (const a of next) a.used = false; active = next;
  }
  for (const a of active) flush(a);
}
// straight lines get a sub-pixel wobble so antialiasing steps scatter instead of lining up
const wob = (x, k) => .2 * Math.sin(x * .013 + k * 1.7) + .09 * Math.sin(x * .071 + k * 2.3);
function skyDark(x, y) {
  const ds = Math.hypot(x - SX, (y - SY) * 1.12);
  let d = .07 + .25 * sst(SR + 10, 720, ds);
  d *= .6 + .4 * sst(HZ, HZ - 170, y);
  d *= .35 + .65 * sst(GY0, GY0 + 60, y);
  return clamp(d, 0, 1);
}
let MICRO = null;  // {y, spans:[[x0,x1],...]}
function skyStrokes() {
  const microY = GY0 + 1.5 + Math.round((318 - GY0 - 1.5) / DSEP) * DSEP;
  for (let y = GY0 + 1.5; y < HZ + 2; y += DSEP) {
    const isMicro = Math.abs(y - microY) < .01;
    const spans = []; let cur = null;
    for (let x = GX0; x <= GX1; x += 1) {
      const ok = kindAt(x, y) === 0 && Math.hypot(x - SX, y - SY) > SR + 6;
      if (ok) { if (!cur) cur = [x, x]; cur[1] = x } else if (cur) { spans.push(cur); cur = null }
    }
    if (cur) spans.push(cur);
    if (isMicro) { MICRO = { y, spans: spans.filter(s => s[1] - s[0] > 6) }; continue }
    for (const [a, b] of spans) {
      // split at the sun so each half is cut outward from it
      const cuts = a < SX && b > SX ? [[a, SX - .5], [SX + .5, b]] : [[a, b]];
      for (const [u, v] of cuts) {
        const xy = [], w = [];
        const kk = Math.round(y / DSEP);
        for (let x = u; x <= v; x += 1.4) { xy.push(x, y + wob(x, kk)); w.push(.86 * DSEP * skyDark(x, y)) }
        xy.push(v, y + wob(v, kk)); w.push(.86 * DSEP * skyDark(v, y));
        smoothW(w, 2, 1); emitByTone(xy, w, 5);
      }
    }
  }
}
function rayStrokes() {
  const N = 132;
  for (let i = 0; i < N; i++) {
    const a = (i + .5) / N * Math.PI * 2 + (hash(i, 3) - .5) * .015, ca = Math.cos(a), sa = Math.sin(a);
    const L = [70, 170, 104, 240][i % 4] * (.8 + .4 * hash(i, 9)), r0 = SR + 7;
    const xy = [], w = [];
    for (let s = 0; s <= L; s += 1.2) {
      const x = SX + ca * (r0 + s), y = SY + sa * (r0 + s); if (kindAt(x, y) !== 0) break;
      xy.push(x, y); w.push(.7 * Math.pow(1 - s / L, 1.35) * (i % 2 ? .8 : 1));
    }
    pushStroke(xy, w, 3, 6);
  }
}
function waterStrokes() {
  let k = 0;
  for (let y = HZ + 1.3; y < LB; k++) {
    const depth = (y - HZ) / (LB - HZ), hw = 6 + (y - HZ) * .42, e = hw * (.62 + .55 * hash(k, 41));
    const xy = [], w = [];
    const flush = () => { if (xy.length > 2) { smoothW(w, 2, 1); emitByTone(xy.slice(), w.slice(), 4) } xy.length = 0; w.length = 0 };
    for (let x = GX0; x <= GX1; x += 1.2) {
      if (kindAt(x, y) !== 1) { flush(); continue }
      const dx = Math.abs(x - SX);
      if (dx < e) {
        // the sun's column: broken into short glints
        flush();
        continue;
      }
      xy.push(x, y + wob(x, k + 50)); w.push(.9 * DSEP * darkOf(lumAt(x, y)) * (.55 + .45 * sst(e, e * 2.6, dx)) * (.86 + .14 * depth));
    }
    flush();
    // glints inside the column
    const g = 1 + Math.floor(hash(k, 7) * 3);
    for (let j = 0; j < g; j++) {
      const c = SX + (hash(k, j * 13 + 2) - .5) * 2 * e * .9, l = 2 + hash(k, j * 5 + 1) * 7 * (.5 + depth);
      if (kindAt(c, y) !== 1) continue;
      pushStroke([c - l / 2, y, c, y, c + l / 2, y], [.35, .55, .35], 1.5, 1);
    }
    y += 2.3 + 1.4 * depth;
  }
}

// ---------- conifers ----------
const TREES = [[64, 236, .13], [94, 186, .71], [129, 146, .37], [160, 110, .52], [188, 80, .91], [213, 56, .27],
               [1244, 58, .44], [1274, 90, .81], [1309, 140, .09], [1352, 212, .63], [1393, 172, .31]];
function treeHalfWidth(t, y) {
  const [x0, h, sd] = t, top = LB - h; if (y < top) return -1;
  const k = (y - top) / h, tierH = 3.4 + 9 * k, saw = (((y - top) / tierH + sd) % 1 + 1) % 1;
  return { W: h * .19 * Math.pow(k, .9) * (.46 + .54 * Math.pow(saw, .55)) + .8, k, saw };
}
function blockTrees() {
  for (const t of TREES) {
    const [x0, h] = t;
    for (let y = Math.floor(LB - h); y < LB; y++) {
      const q = treeHalfWidth(t, y + .5); if (q === -1) continue;
      for (let x = Math.floor(x0 - q.W - 2); x <= x0 + q.W + 2; x++) if (x >= 0 && x < 1440) BLOCK[y * 1440 + x] = 1;
    }
  }
  // ground mounds under the trees
  for (let x = GX0; x < GX1; x++) {
    const m = Math.max(0, 1 - (x - GX0) / 220) * 18 + Math.max(0, 1 - (GX1 - x) / 190) * 16;
    for (let y = Math.floor(LB - m); y < LB; y++) BLOCK[y * 1440 + x] = 1;
  }
}
function treeStrokes() {
  for (const t of TREES) {
    const [x0, h, sd] = t, top = LB - h; let row = 0;
    pushStroke([x0, top - 3, x0, top + 8], [.2, .5], 2, 2);
    for (let y = top + 2.5; y < LB - 3; y += 1.35, row++) {
      const q = treeHalfWidth(t, y); if (q === -1) continue;
      for (const side of [-1, 1]) {
        const lit = side < 0, r = hash(row * 7 + side, sd * 1000 | 0);
        if (lit && r < .12) continue;
        const len = q.W * (.78 + .26 * hash(row, (sd * 997 | 0) + side)), droop = len * (.22 + .14 * q.saw);
        const xy = [], w = [], wm = lit ? .85 : 1.25;
        for (let s = 0; s <= 1.0001; s += .125) {
          const bx = x0 + side * (.3 + len * s), by = y + droop * s * s;
          xy.push(bx, by); w.push(wm * Math.pow(Math.sin(Math.PI * Math.min(1, s * .92 + .08)), .6));
        }
        pushStroke(xy, w, 1.2, 1.5);
        // shade strokes between branches on the dark side
        if (hash(row, 77 + side) < (lit ? .35 : .9)) {
          const l2 = len * (.5 + .3 * hash(row, 5)), xs = [], ws = [];
          for (let s = 0; s <= 1.0001; s += .2) { xs.push(x0 + side * (.6 + l2 * s), y + .8 + droop * .6 * s * s); ws.push((lit ? .5 : .8) * Math.sin(Math.PI * s)) }
          pushStroke(xs, ws, 1, 1.2);
        }
      }
      // needle ticks at the bottom of each tier
      if (q.saw > .82 && hash(row, 31) < .8) for (const side of [-1, 1]) {
        const tx = x0 + side * q.W * .92; pushStroke([tx, y - .5, tx + side * .3, y + 2.2], [.45, .1], .6, .8);
      }
    }
    pushStroke([x0, LB - h * .1, x0, LB], [.8, .9], 1, 2);
  }
  // ground: short horizontal strokes
  for (let y = LB - 17; y < LB; y += 1.7) for (const [a, b] of [[GX0, GX0 + 220], [GX1 - 190, GX1]]) {
    let x = a;
    while (x < b) {
      const m = a === GX0 ? Math.max(0, 1 - (x - GX0) / 220) * 18 : Math.max(0, 1 - (GX1 - x) / 190) * 16;
      const l = 4 + hash(x | 0, y * 10 | 0) * 10;
      if (y > LB - m) pushStroke([x, y, x + l / 2, y + .1, x + l, y], [.4, .95, .4], 1.5, 1);
      x += l + 1 + hash(y * 10 | 0, x | 0) * 3;
    }
  }
}

// ---------- rosette (logo = sun) ----------
function hypo(R, r, o, turns, n) { const a = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2 * turns; a.push((R - r) * Math.cos(t) + o * Math.cos((R - r) / r * t), (R - r) * Math.sin(t) - o * Math.sin((R - r) / r * t)) } return a }
const ROS = [hypo(34, 13, 22, 13, 2600).map(v => v * .9), hypo(34, 13, 16, 13, 2600).map(v => v * .9)];
const ROS_OFF = [0, Math.PI / 34];
(() => {
  const svg = document.getElementById('logo'); let h = '<g id="logoRot">';
  ROS.forEach((pts, k) => { let d = ''; for (let i = 0; i < pts.length; i += 6) { const a = ROS_OFF[k], x = pts[i] * Math.cos(a) - pts[i + 1] * Math.sin(a), y = pts[i] * Math.sin(a) + pts[i + 1] * Math.cos(a); d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2) } h += `<path d="${d}" stroke-width="${k ? .9 : 1.3}"/>` });
  svg.innerHTML = h + '</g><circle r="47" stroke-width="3"/>';
})();
function drawRosette(ctx, cx, cy, rad, rot, frac, lw) {
  const s = rad / 50;
  ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ROS.forEach((pts, k) => {
    const n = pts.length / 2, m = Math.floor(n * frac); if (m < 2) return;
    const a = rot + ROS_OFF[k], c = Math.cos(a), sn = Math.sin(a);
    ctx.beginPath();
    for (let i = 0; i < m; i++) { const x = pts[i * 2], y = pts[i * 2 + 1]; const px = cx + s * (x * c - y * sn), py = cy + s * (x * sn + y * c); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
    ctx.lineWidth = lw * (k ? .7 : 1); ctx.stroke();
  });
  if (frac > .02) {
    ctx.beginPath(); ctx.arc(cx, cy, rad * .94, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac * 1.4)); ctx.lineWidth = lw * 2.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rad * 1.0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac * 1.4)); ctx.lineWidth = lw * .7; ctx.stroke();
  }
}

// ---------- banknote frame ----------
function drawFrame(ctx) {
  ctx.strokeStyle = INK; ctx.lineCap = 'butt';
  ctx.lineWidth = .7; ctx.strokeRect(14.5, 14.5, 1411, 781); ctx.lineWidth = .5; ctx.strokeRect(29.5, 29.5, 1381, 751);
  ctx.lineWidth = .3; ctx.strokeRect(32.5, 32.5, 1375, 745);
  const band = (len, pt) => { for (let k = 0; k < 5; k++) { ctx.beginPath(); const ph = k / 5 * Math.PI * 2; for (let s = 0; s <= len; s += .8) { const [x, y] = pt(s, 5.6 * Math.sin(s / 24 * Math.PI * 2 + ph)); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y) } ctx.lineWidth = .42; ctx.stroke() } };
  band(1352, (s, o) => [44 + s, 22 + o]); band(1352, (s, o) => [44 + s, 788 + o]);
  band(722, (s, o) => [22 + o, 44 + s]); band(722, (s, o) => [1418 + o, 44 + s]);
  for (const [x, y] of [[22, 22], [1418, 22], [22, 788], [1418, 788]]) {
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = .7; ctx.stroke();
    drawRosette(ctx, x, y, 14, 0, 1, .32);
  }
  // landscape base rules
  ctx.beginPath(); ctx.moveTo(GX0, LB + 3.5); ctx.lineTo(GX1, LB + 3.5); ctx.lineWidth = .8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(GX0, LB + 6.5); ctx.lineTo(GX1, LB + 6.5); ctx.lineWidth = .35; ctx.stroke();
}

// ---------- render ----------
const stage = document.getElementById('stage'), ft = document.getElementById('ft'), cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const cur = document.getElementById('cur'), logoRot = () => document.getElementById('logoRot');
let SC = 1, kScale = 1, cache = false, buf = null, built = false, drawStart = null;
function layout() {
  kScale = stage.clientWidth / 1440; ft.style.setProperty('--k', kScale);
  SC = kScale * (devicePixelRatio || 1);
  cv.width = Math.round(1440 * SC); cv.height = Math.round(810 * SC);
  cache = false; buf = null;
}
// engrave into a supersampled layer: sub-pixel strokes rasterise unevenly at 1x
function sceneLayer(a) {
  const ss = cv.width < 3000 ? 2 : 1;
  if (!buf) { buf = document.createElement('canvas'); buf.width = cv.width * ss; buf.height = cv.height * ss }
  const c = buf.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, buf.width, buf.height);
  c.setTransform(SC * ss, 0, 0, SC * ss, 0, 0); drawFrame(c); if (a === null || a > 0) drawScene(c, a);
}
function strokePath(c, s, frac) {
  const p = s.p, n = p.length / 3; let m = n, tip = 0;
  if (frac < 1) { m = Math.max(2, Math.ceil(n * frac)); tip = 1 } if (m < 2) return;
  const L = new Float32Array(m * 2), R = new Float32Array(m * 2);
  for (let i = 0; i < m; i++) {
    const a = Math.max(0, i - 1), b = Math.min(m - 1, i + 1); let tx = p[b * 3] - p[a * 3], ty = p[b * 3 + 1] - p[a * 3 + 1]; const l = Math.hypot(tx, ty) || 1;
    let w = p[i * 3 + 2] * .5; if (tip) { const k = m - 1 - i; if (k < 5) w *= k / 5 }
    L[i * 2] = p[i * 3] - ty / l * w; L[i * 2 + 1] = p[i * 3 + 1] + tx / l * w; R[i * 2] = p[i * 3] + ty / l * w; R[i * 2 + 1] = p[i * 3 + 1] - tx / l * w;
  }
  c.moveTo(L[0], L[1]); for (let i = 1; i < m; i++) c.lineTo(L[i * 2], L[i * 2 + 1]);
  for (let i = m - 1; i >= 0; i--) c.lineTo(R[i * 2], R[i * 2 + 1]); c.closePath();
}
function drawMicro(c, a, box) {
  if (!MICRO) return;
  c.save(); c.fillStyle = INK; c.globalAlpha = .5; c.font = '500 4px Geist, sans-serif'; if ('letterSpacing' in c) c.letterSpacing = '.2px';
  c.textBaseline = 'middle';
  const text = 'TENDER · '.repeat(110);
  for (const [x0, x1] of MICRO.spans) {
    if (box && (x1 < box[0] || x0 > box[2] || MICRO.y < box[1] - 4 || MICRO.y > box[3] + 4)) continue;
    // reveal outward from the sun like the other strokes
    let u = x0, v = x1;
    if (a !== null) { const d = Math.min(Math.abs(x0 - SX), Math.abs(x1 - SX)), t0 = ROS_T + (DRAW - ROS_T - .3) * Math.min(1, d / 760), f = clamp((a - t0) / .3, 0, 1); if (f <= 0) continue; if (x0 > SX) v = x0 + (x1 - x0) * f; else u = x1 - (x1 - x0) * f }
    c.save(); c.beginPath(); c.rect(u, MICRO.y - 3, v - u, 6); c.clip(); c.fillText(text, GX0 - 3, MICRO.y + .2); c.restore();
  }
  c.restore();
}
function drawScene(c, a, box) {
  // a = seconds since draw-on start, null = complete
  c.save(); c.beginPath(); c.rect(GX0, GY0 - 1, GX1 - GX0, LB - GY0 + 1); c.clip();
  // fill in small batches: one giant path makes the rasteriser change antialiasing across tiles
  c.fillStyle = INK; c.beginPath(); let k = 0;
  for (const s of strokes) {
    if (box && (s.x1 < box[0] || s.x0 > box[2] || s.y1 < box[1] || s.y0 > box[3])) continue;
    let f = 1; if (a !== null) { f = (a - s.t0) / s.dur; if (f <= 0) continue; if (f > 1) f = 1 }
    strokePath(c, s, f);
    if (++k % 48 === 0) { c.fill(); c.beginPath() }
  }
  c.fill();
  drawMicro(c, a, box);
  c.restore();
}
function rosetteRot(t) { return RM ? 0 : t / TURN * Math.PI * 2 }
let loupe = null; // {x,y,s}
function drawLoupe(c, t) {
  if (!loupe || loupe.s <= .01) return;
  const R = 78 * loupe.s, Z = 4, { x, y } = loupe;
  c.save(); c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill(); c.clip();
  c.translate(x, y); c.scale(Z, Z); c.translate(-x, -y);
  const r = R / Z + 2; drawScene(c, null, [x - r, y - r, x + r, y + r]);
  drawRosette(c, SX, SY, SR, rosetteRot(t), 1, .5);
  c.restore();
  c.strokeStyle = INK; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.lineWidth = 1.3; c.stroke();
  c.beginPath(); c.arc(x, y, R + 3, 0, Math.PI * 2); c.lineWidth = .45; c.stroke();
}
function render(t, a) {
  window.__t = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  if (!built) { drawFrame(ctx); return }
  const done = a === null || a >= DRAW + .05;
  if (!done || !cache) { sceneLayer(done ? null : a); cache = done }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(buf, 0, 0, cv.width, cv.height); ctx.setTransform(SC, 0, 0, SC, 0, 0);
  const rf = done ? 1 : clamp(a / ROS_T, 0, 1);
  if (rf > 0) { ctx.save(); ctx.beginPath(); ctx.arc(SX, SY, SR + 3, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore(); drawRosette(ctx, SX, SY, SR, rosetteRot(t), rf, .5) }
  drawLoupe(ctx, t);
  const lr = logoRot(); if (lr) lr.setAttribute('transform', `rotate(${rosetteRot(t) * 180 / Math.PI})`);
  if (DEBUG) debugTone();
}
function debugTone() {
  const img = ctx.createImageData(GW, GH);
  for (let i = 0; i < GW * GH; i++) { const v = 255 * (1 - darkOf(LUM[i])); img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255 }
  const c = document.createElement('canvas'); c.width = GW; c.height = GH; c.getContext('2d').putImageData(img, 0, 0);
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.globalAlpha = .9; ctx.drawImage(c, GX0, GY0, GX1 - GX0, GY1 - GY0); ctx.globalAlpha = 1;
}

// ---------- build ----------
function build() {
  BLOCK = new Uint8Array(1440 * 810);
  gbuffer(); directions(); blockTrees();
  const se = document.getElementById('serial'), sx0 = se.offsetLeft - 8, sx1 = se.offsetLeft + se.offsetWidth + 8, sy0 = se.offsetTop - 6, sy1 = se.offsetTop + se.offsetHeight + 6;
  rayStrokes(); skyStrokes(); waterStrokes(); terrainStrokes(); edgeStrokes(); treeStrokes();
  // burin order: from the sun outward; each stroke is cut starting at its end nearest the sun
  let dmax = 1;
  for (const s of strokes) {
    const p = s.p, n = p.length / 3, d0 = Math.hypot(p[0] - SX, p[1] - SY), d1 = Math.hypot(p[(n - 1) * 3] - SX, p[(n - 1) * 3 + 1] - SY);
    if (d1 < d0) { const q = new Float32Array(p.length); for (let i = 0; i < n; i++) { const j = n - 1 - i; q[i * 3] = p[j * 3]; q[i * 3 + 1] = p[j * 3 + 1]; q[i * 3 + 2] = p[j * 3 + 2] } s.p = q }
    s.d = Math.min(d0, d1); dmax = Math.max(dmax, s.d);
  }
  for (const s of strokes) { s.t0 = ROS_T + (DRAW - ROS_T - .3) * Math.pow(s.d / dmax, .85); s.dur = clamp(.06 + s.len / 1600, .06, .3) }
  LUM_STATS();
  built = true;
}
function LUM_STATS() { window.__strokes = strokes.length; if (DEBUG) window.__S = strokes }

// ---------- serial number ----------
(() => {
  let n = 4817;
  if (!REC) { try { n = (parseInt(localStorage.getItem('tender-serial') || '4816', 10) || 4816) + 1; localStorage.setItem('tender-serial', String(n)) } catch (e) { } }
  document.getElementById('serial').textContent = 'TN 2026 ' + String(n).padStart(6, '0');
})();

// ---------- timeline for the recorded video ----------
const DRAW_T0 = .2;
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function lerp2(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] }
function recCursor(t) {
  const my = MICRO ? MICRO.y : 318;
  const P0 = [1190, 830], P1 = [262, my], P2 = [520, my], P3 = [1268, 486], P4 = [1210, 840];
  if (t < 2.0) return P0;
  if (t < 2.75) return lerp2(P0, P1, ease((t - 2.0) / .75));
  if (t < 3.7) return lerp2(P1, P2, ease((t - 2.75) / .95));
  if (t < 4.5) return lerp2(P2, P3, ease((t - 3.7) / .8));
  if (t < 5.05) return P3;
  return lerp2(P3, P4, ease((t - 5.05) / .7));
}
window.__render = t => {
  const a = t - DRAW_T0;
  const [x, y] = recCursor(t);
  const s = ease((t - 2.4) / .3) * (1 - ease((t - 4.95) / .25));
  loupe = s > 0 ? { x, y, s } : null;
  cur.style.transform = `translate(${x - 2}px,${y - 2}px)`;
  render(t, a);
};

// ---------- live page ----------
function live() {
  const t0 = performance.now();
  const loop = n => { const t = (n - t0) / 1000; render(t, RM ? null : drawStart === null ? -1 : (n - drawStart) / 1000); requestAnimationFrame(loop) };
  new IntersectionObserver((es, ob) => { for (const e of es) if (e.isIntersecting && drawStart === null) { drawStart = performance.now(); ob.disconnect() } }, { threshold: .3 }).observe(ft);
  ft.addEventListener('pointermove', e => {
    const r = ft.getBoundingClientRect(), x = (e.clientX - r.left) / kScale, y = (e.clientY - r.top) / kScale;
    loupe = y > GY0 + 8 && y < LB && x > GX0 && x < GX1 ? { x, y, s: 1 } : null;
  });
  ft.addEventListener('pointerleave', () => { loupe = null });
  requestAnimationFrame(loop);
}
addEventListener('resize', () => { layout(); if (REC) render(window.__t || 0, (window.__t || 0) - DRAW_T0) });
document.fonts.ready.then(() => {
  layout(); render(0, -1);
  setTimeout(() => {
    const tb = performance.now(); build(); window.__buildMs = performance.now() - tb;
    if (REC) { cache = null; window.__ready = true; return }
    window.__ready = true; live();
  }, 30);
});
})();
