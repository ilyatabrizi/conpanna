// The hero: a cup seen from above, the milk folding through the coffee by
// itself — and you can stir it. Drag around the cup and the swirl follows
// your finger, then slowly settles. One small fragment shader; a still frame
// when motion is reduced or WebGL isn't there.
import { reduced } from "./ui.js";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
uniform vec2 res;uniform float t;uniform float spin;uniform vec2 ptr;uniform float amt;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*res)/(.5*min(res.x,res.y));
 float r=length(uv);
 float a=atan(uv.y,uv.x);
 float sw=spin+t*.06;
 a+=sw*(1.25-r)*1.3+.5*sin(r*5.5-t*.25);
 vec2 d=uv-ptr;a+=amt*exp(-dot(d,d)*5.)*2.2;
 vec2 q=vec2(cos(a),sin(a))*r;
 vec2 w=vec2(fbm(q*2.1+t*.04),fbm(q*2.1+vec2(5.2,1.3)-t*.035));
 float f=fbm(q*1.7+w*1.7);
 float swirl=f+.22*sin(r*9.-sw*1.6+w.x*3.);
 float m=smoothstep(.5,.6,swirl);
 float m2=smoothstep(.62,.7,swirl);
 vec3 coffee=mix(vec3(.20,.10,.055),vec3(.40,.22,.12),f*1.2);
 vec3 latte=vec3(.72,.52,.34);
 vec3 cream=mix(vec3(.94,.86,.73),vec3(1.,.97,.91),n(q*9.));
 vec3 col=mix(coffee,latte,m);col=mix(col,cream,m2);
 col*=mix(1.,.5,smoothstep(.72,1.,r));
 col+=exp(-pow(length(uv-vec2(-.38,.42))*2.,2.))*.16;
 col+=smoothstep(.93,.99,r)*(1.-smoothstep(.99,1.,r))*.08;
 float al=1.-smoothstep(.985,1.,r);
 gl_FragColor=vec4(col*al,al);
}`;

export function mountLatte(canvas) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });
  if (!gl) { canvas.classList.add("no-gl"); return () => {}; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.classList.add("no-gl"); return () => {}; }
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k);
  const uRes = U("res"), uT = U("t"), uSpin = U("spin"), uPtr = U("ptr"), uAmt = U("amt");

  let w = 0, h = 0;
  const size = () => {
    const dpr = Math.min(1.75, devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    w = Math.max(2, Math.round(r.width * dpr)); h = Math.max(2, Math.round(r.height * dpr));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
  };
  size();
  const ro = "ResizeObserver" in window ? new ResizeObserver(size) : null;
  ro?.observe(canvas);

  // stirring: angular drag adds spin velocity; the finger leaves a local eddy
  let spin = 0, vel = 0, amt = 0, ptr = [0, 0], lastA = null, dragging = false, stirred = false;
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; };
  const down = (e) => { dragging = true; lastA = null; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} move(e); };
  const move = (e) => {
    if (!dragging) return;
    const p = local(e);
    ptr = p; amt = Math.min(1.4, amt + 0.12);
    const a = Math.atan2(p[1], p[0]);
    if (lastA != null) { let da = a - lastA; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; vel += da * 0.9; }
    lastA = a;
    if (!stirred) { stirred = true; canvas.dispatchEvent(new CustomEvent("stirred", { bubbles: true })); }
  };
  const up = () => { dragging = false; lastA = null; };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  let raf = 0, t0 = performance.now(), running = true, visible = true;
  const draw = (now) => {
    const t = (now - t0) / 1000;
    vel *= 0.965; spin += vel * 0.06 + 0.0; amt *= 0.955;
    gl.uniform2f(uRes, w, h); gl.uniform1f(uT, t); gl.uniform1f(uSpin, spin); gl.uniform2f(uPtr, ptr[0], ptr[1]); gl.uniform1f(uAmt, amt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const loop = (now) => { if (!running) return; if (visible) draw(now); raf = requestAnimationFrame(loop); };
  if (reduced()) { draw(performance.now() + 4000); }
  else raf = requestAnimationFrame(loop);
  const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
  io?.observe(canvas);
  const vis = () => { visible = document.visibilityState === "visible"; };
  document.addEventListener("visibilitychange", vis);
  return () => { running = false; cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", vis); };
}
