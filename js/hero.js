// The hero: a latte seen from above. A barista pours a rosetta, it rests, a
// spoon stirs it into a spiral until the milk folds through and the cup turns
// one caramel colour — then a fresh one is poured. Drag across the cup to stir
// it yourself. One fragment shader: microfoam, crema with tiger-flecks and
// bubbles, a vortex dip, the window reflection, the meniscus at the wall and
// the shadow of the rim. A still frame when motion is reduced or WebGL is absent.
import { reduced } from "./ui.js";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 res;uniform float t,phi,cph,mixA,rev,omg,amt,ang;uniform vec2 ptr;
float hash(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
// a rosetta, stem towards -y: nine stacked leaves bowed upward, pulled through the middle
float rosetta(vec2 p,float rv,float soft){
 float x=p.x,y=p.y;
 float w=mix(.10,.50,smoothstep(-.70,.22,y));
 float cap=y>.14?sqrt(max(0.,1.-pow((y-.14)/.38,2.))):1.;
 float hw=w*cap;
 float ins=(1.-smoothstep(hw-.03-soft,hw+soft,abs(x)))*smoothstep(-.70,-.62,y);
 float xn=x/max(hw,.06);
 float u=y-1.25*x*x+.05*exp(-x*x/.0018);
 float v=clamp((u+.66)/1.14,0.,1.);
 float band=fract(pow(v,.82)*9.4);
 float th=mix(.42,.66,v)*(1.-.55*xn*xn*xn*xn);
 float e=.035+soft*10.;
 float leaf=smoothstep(0.,e,band)*(1.-smoothstep(th-e*.5,th+e*.5,band));
 leaf=mix(leaf,1.,smoothstep(.36,.5,y));
 float stem=(1.-smoothstep(.007,.013+soft,abs(x-.004*sin(y*9.))))*smoothstep(-.84,-.78,y)*(1.-smoothstep(.30,.36,y));
 float m=max(leaf*ins,stem);
 float ry=mix(.58,-.80,rv);
 m*=smoothstep(ry-.06,ry+.02,y);
 m*=smoothstep(0.,.25,rv);
 return m;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*res)/(.5*min(res.x,res.y));
 float r=length(uv);
 float sp=clamp(abs(omg)*.45,0.,1.);
 // the flow: fast in the middle, held back by the wall
 float prof=pow(max(0.,1.-r*r),1.25);
 vec2 q=rot(-phi*prof)*uv;
 float turb=.035*sp+.07*mixA;
 q+=turb*(vec2(fbm(q*2.4+t*.18),fbm(q*2.4+vec2(3.1,7.7)-t*.16))-.5);
 vec2 dp=uv-ptr;float ed=amt*exp(-dot(dp,dp)*7.);
 q=ptr+rot(-ed*2.4)*(q-ptr);
 vec2 ap=rot(ang)*(q*1.02)+vec2(0.,-.13);
 float soft=.003+mixA*.16+min(abs(phi)*.0025,.03);
 float art=rosetta(ap,rev,soft)*(1.-smoothstep(.2,.95,mixA));
 float halo=rosetta(ap,rev,soft+.07)*(1.-smoothstep(.1,.9,mixA));
 // crema: tiger flecks that drift slower than the milk
 vec2 cq=rot(-cph*prof)*uv;
 float crem=fbm(cq*3.2+7.);
 float fleck=fbm(cq*7.5+3.);
 vec3 crema=mix(vec3(.50,.27,.13),vec3(.72,.46,.25),smoothstep(.32,.78,crem));
 crema=mix(crema,vec3(.27,.13,.06),smoothstep(.5,1.,r)*.8);
 crema*=.88+.22*fleck;
 vec3 tan=vec3(.80,.60,.40);
 vec3 base=mix(crema,tan,clamp(halo*.6,0.,1.));
 vec3 mixed=vec3(.75,.55,.36)*(.93+.12*crem)*mix(1.,.86,smoothstep(.6,1.,r));
 base=mix(base,mixed,smoothstep(.15,.85,mixA));
 vec3 foam=mix(vec3(.95,.90,.82),vec3(1.,.985,.95),noise(ap*55.));
 foam*=.965+.035*noise(ap*150.);
 foam=mix(foam,vec3(.88,.78,.64),smoothstep(.9,.35,art)*.5);
 vec3 col=mix(base,foam,art);
 // bubbles in the crema, riding the flow
 vec2 bq=q*23.;vec2 bi=floor(bq),bf=fract(bq);float hb=hash(bi);
 vec2 bc=vec2(hash(bi+3.1),hash(bi+7.7))*.6+.2;float br=.07+.11*hash(bi+1.3);float bd=length(bf-bc);
 float bm=step(.82,hb)*(1.-art)*smoothstep(.35,.85,r)*(1.-mixA*.6);
 col=mix(col,col*.72,bm*smoothstep(br*1.15,br,bd)*smoothstep(br*.45,br*.9,bd));
 col+=bm*.22*smoothstep(br*.35,0.,length(bf-bc-vec2(-.25,.3)*br));
 // the surface: a dip while it spins, rings, and the meniscus at the wall
 float dip=clamp(omg*omg*.01,0.,.05);
 vec2 g=4.*dip*(1.-r*r)*uv;
 g+=.0016*34.*cos(r*34.-t*5.)*sp*uv/max(r,.001);
 float mg=smoothstep(.88,1.,r);
 g+=uv/max(r,.001)*mg*mg*1.4;
 vec3 n=normalize(vec3(-g,1.));
 vec3 V=normalize(vec3(-uv*.8,1.));
 vec3 R=reflect(-V,n);
 vec3 Ld=normalize(vec3(-.30,.36,.88));
 vec2 rr=R.xy/R.z-Ld.xy/Ld.z;
 float win=smoothstep(.24,.06,abs(rr.x))*smoothstep(.30,.10,abs(rr.y+.03));
 float gloss=mix(.24,.05,art)*(1.-mixA*.35);
 col+=win*gloss*vec3(1.,.97,.92);
 col+=pow(max(dot(R,Ld),0.),8.)*.06;
 col*=.94+.1*max(dot(n,Ld),0.);
 // rim: the wall's shadow on the near side, the lit meniscus, the dark contact line
 float sh=smoothstep(.9,1.04,length(uv+vec2(-.30,.36)*.2));
 col*=1.-sh*.42;
 float lit=.5+.5*dot(normalize(uv+1e-4),normalize(vec2(.3,-.36)));
 col+=smoothstep(.945,.982,r)*(1.-smoothstep(.982,.996,r))*.2*lit;
 col*=1.-smoothstep(.985,1.,r)*.55;
 col*=mix(1.,.86,smoothstep(.7,1.,r));
 float al=1.-smoothstep(.993,1.,r);
 gl_FragColor=vec4(col*al,al);
}`;

export function mountLatte(canvas, fixed) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true, preserveDrawingBuffer: !!fixed });
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
  const U = {}; ["res", "t", "phi", "cph", "mixA", "rev", "omg", "amt", "ang", "ptr"].forEach((k) => { U[k] = gl.getUniformLocation(pr, k); });

  let w = 0, h = 0;
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    w = Math.max(2, Math.round(r.width * dpr)); h = Math.max(2, Math.round(r.height * dpr));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
  };
  size();

  // the cup's life: pour → rest → stir → settle → pour again
  const S = { t: 0, phi: 0, cph: 0, mixA: 0, rev: 0, omg: 0, amt: 0, ang: -0.32, ptr: [0, 0] };
  const draw = () => {
    gl.uniform2f(U.res, w, h); gl.uniform1f(U.t, S.t); gl.uniform1f(U.phi, S.phi); gl.uniform1f(U.cph, S.cph); gl.uniform1f(U.mixA, S.mixA);
    gl.uniform1f(U.rev, S.rev); gl.uniform1f(U.omg, S.omg); gl.uniform1f(U.amt, S.amt); gl.uniform1f(U.ang, S.ang); gl.uniform2f(U.ptr, S.ptr[0], S.ptr[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  if (fixed) { Object.assign(S, fixed); draw(); return () => {}; }

  const ro = "ResizeObserver" in window ? new ResizeObserver(() => { size(); draw(); }) : null;
  ro?.observe(canvas);

  const DUR = { pour: 3.0, rest: 3.8, stir: 7.5, settle: 2.6 };
  let phase = "rest", pt = 0, target = 0.05, dragging = false, lastA = null;
  S.rev = 1;
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 2.2);
  const to = (p) => { phase = p; pt = 0; if (p === "pour") { S.phi = 0; S.rev = 0; S.ang = -0.32 + (Math.random() - 0.5) * 0.5; } };
  const step = (dt) => {
    S.t += dt; pt += dt;
    if (dragging) phase = "user";
    switch (phase) {
      case "pour": S.rev = ease(pt / DUR.pour); S.mixA *= Math.exp(-dt * 2.4); target = 0; if (pt > DUR.pour) to("rest"); break;
      case "rest": target = 0.05; if (pt > DUR.rest) to("stir"); break;
      case "stir": { const k = Math.min(1, pt / DUR.stir); target = 2.5 * Math.pow(Math.sin(Math.PI * k), 0.55); if (pt > DUR.stir) to("settle"); break; }
      case "settle": target = 0; if (pt > DUR.settle) to(S.mixA > 0.6 ? "pour" : "stir"); break;
      case "user": target = 0; if (!dragging) to("settle"); break;
    }
    S.omg += (target - S.omg) * Math.min(1, dt * (phase === "user" ? 0.9 : 1.7));
    S.phi += S.omg * dt;
    S.cph += S.omg * dt * 0.55 + dt * 0.02;
    if (phase !== "pour") S.mixA = Math.min(1, S.mixA + Math.abs(S.omg) * dt * 0.05);
    S.amt *= Math.exp(-dt * 2.6);
  };

  // stirring with a finger: going round the cup spins it, the fingertip leaves an eddy
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; };
  const down = (e) => { dragging = true; lastA = null; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} move(e); };
  const move = (e) => {
    if (!dragging) return;
    const p = local(e);
    S.ptr = p; S.amt = Math.min(1.3, S.amt + 0.1);
    const a = Math.atan2(p[1], p[0]);
    if (lastA != null) { let da = a - lastA; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; S.omg = Math.max(-4, Math.min(4, S.omg + da * 2.2)); }
    lastA = a;
  };
  const up = () => { dragging = false; lastA = null; };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  let raf = 0, last = performance.now(), running = true, visible = true;
  const loop = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) { step(dt); draw(); }
    raf = requestAnimationFrame(loop);
  };
  if (reduced()) draw(); else raf = requestAnimationFrame(loop);
  const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }) : null;
  io?.observe(canvas);
  const vis = () => { visible = document.visibilityState === "visible"; last = performance.now(); };
  document.addEventListener("visibilitychange", vis);
  return () => { running = false; cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", vis); };
}
