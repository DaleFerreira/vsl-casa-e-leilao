// Para trocar o vídeo: troque assets/vsl.mp4 (o caminho fica somente no source do HTML).
// Fração da duração realmente assistida necessária para liberar as próximas dobras.
const PORCENTAGEM_PARA_LIBERAR = 0.5;

/* Curvas de nível reaproveitadas da rotina WebGL da biblioteca, linhas 68 a 218.
   Licença original permite uso em projetos próprios e de clientes, veda redistribuição como produto. */
(function () {
  var CONFIG = {paper:'#EDEAE4',ink:'#85744A',accent:'#85744A',lines:22,scale:1.5,speed:.35,veil:.8};
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif',
    'uniform vec2 uR;uniform float uT,uU,uPx;uniform vec3 uPa,uIn,uAc;uniform vec4 uH,uK,uS,uP[4];',
    // hash sem seno: fica estável no celular mesmo com a página aberta por horas
    'vec2 hs(vec2 p){vec3 a=fract(p.xyx*vec3(.1031,.103,.0973));a+=dot(a,a.yzx+33.33);return fract((a.xx+a.yz)*a.zy)*2.-1.;}',
    'float gn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.),o=vec2(1,0);',
    ' return mix(mix(dot(hs(i),f),dot(hs(i+o),f-o),u.x),mix(dot(hs(i+o.yx),f-o.yx),dot(hs(i+1.),f-1.),u.x),u.y);}',
    // ondas do clique (xy centro, z raio, w força): x = rastro que acende as curvas, y = linhas da frente
    'vec2 ring(vec2 q){vec2 s=vec2(0);for(int i=0;i<4;i++)if(uP[i].w>0.){float r=length(q-uP[i].xy)-uP[i].z;',
    ' s+=uP[i].w*vec2(exp(-r*r*(r>0.?900.:45.)),clamp(uPx*.8+.5-abs(r)*uU,0.,1.)+clamp(uPx*.5+.5-abs(r+.035)*uU,0.,.35));}return s;}',
    // altura do terreno: ruído que se deforma devagar + morro do mouse + onda
    'float H(vec2 q,float k){vec2 p=q*uK.y,d=q-uH.xy;float t=uT;p+=.28*vec2(sin(p.y*1.3+t*.09),cos(p.x*1.1-t*.07));',
    ' return gn(p+t*vec2(.03,.012))*.7+gn(p*2.1+t*vec2(-.022,.03)+7.3)*.24+gn(p*4.3+t*vec2(.04,-.02)+2.9)*.07+uH.z*exp(-dot(d,d)/(uH.w*uH.w))+k*.16;}',
    'void main(){vec2 c0=gl_FragCoord.xy,uv=c0/uR,q=(c0-.5*uR)/uU,g,pr=ring(q);float f=H(q,pr.x)*uK.x;',
    '#ifdef DV',
    ' g=vec2(dFdx(f),dFdy(f));',
    '#else',
    ' vec2 e=vec2(1./uU,0);g=vec2(H(q+e,ring(q+e).x),H(q+e.yx,ring(q+e.yx).x))*uK.x-f;',
    '#endif',
    // véu do texto: elipse em px (larga no celular, limitada em telas grandes)
    ' vec2 hv=.5*uR/uPx,dv=(c0-.5*uR)/uPx/vec2(min(hv.x*1.05,560.),min(hv.y*.6,300.));',
    // curvas com espessura fixa em px (sem serrilhado); curva mestra a cada 5
    ' float k=min(pr.x,1.),w=max(length(g),1e-4),lw=uS.x*uPx*(1.+k*.6),vl=uK.z*(1.-smoothstep(.25,1.25,length(dv)));',
    ' float a1=clamp(lw*.5+.5-abs(fract(f+.5)-.5)/w,0.,1.)*(1.-smoothstep(.2,.5,w));',
    ' float a5=clamp(lw*.75+.5-abs(fract(f*.2+.5)-.5)*5./w,0.,1.)*(1.-smoothstep(1.,2.5,w));',
    ' vec2 sl=g*uU/uK.x;vec3 c=mix(uPa*(1.+uK.w*clamp((sl.x-sl.y)*.05,-.16,.1)),uAc,k*.04);',
    ' if(uS.w>0.){vec2 m=abs(fract((c0-.5*uR)/(uS.w*uPx)+.5)-.5)*uS.w,l=clamp(1.-m*uPx,0.,1.);',
    '  c=mix(c,uIn,(max(l.x,l.y)*.045+max(l.x*step(m.y,5.),l.y*step(m.x,5.))*.28)*(1.-vl));}',
    ' c=mix(c,mix(uIn,uAc,k),a1*(.26*uS.y+k*.4)*(1.-vl));',
    ' c=mix(c,uAc,a5*(.6*uS.y+k*.35)*(1.-vl*.8));',
    ' c=mix(c,uAc,min(pr.y,1.)*.85*(1.-vl*.5));',
    ' c*=1.-.07*smoothstep(.55,1.4,length((uv-.5)*2.));',
    ' gl_FragColor=vec4(uIn,max(a1*.16,a5*.20)*(1.-vl));}'
  ].join('\n');

  function rgb(h){var n=parseInt(h.slice(1),16);return [(n>>16)/255,(n>>8&255)/255,(n&255)/255];}
  var root=document.querySelector('.upw-bg-topo'), cv=root.querySelector('canvas');
  var gl=cv.getContext('webgl',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false});
  var raf=0,parado=false,morto=false,clock=0,last=0,resizeRaf=0;
  var movimento=matchMedia('(prefers-reduced-motion: reduce)');
  window.fundoTopo={pausar:function(){parado=true;check();},retomar:function(){parado=false;check();}};
  function off(){morto=true;cancelAnimationFrame(raf);root.classList.remove('pronto');cv.hidden=true;}
  if(!gl){off();return;}
  function sh(type,src){var o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);return gl.getShaderParameter(o,gl.COMPILE_STATUS)&&o;}
  function build(dv){
    var p=gl.createProgram(),v=sh(gl.VERTEX_SHADER,'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}'),
    f=sh(gl.FRAGMENT_SHADER,(dv?'#extension GL_OES_standard_derivatives : enable\n#define DV\n':'')+FRAG);
    if(!v||!f)return null;
    gl.attachShader(p,v);gl.attachShader(p,f);gl.bindAttribLocation(p,0,'a');gl.linkProgram(p);
    return gl.getProgramParameter(p,gl.LINK_STATUS)&&p;
  }
  var prog=(gl.getExtension('OES_standard_derivatives')&&build(1))||build(0),U={};
  if(!prog){off();return;}
  gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  'uR uT uU uPx uPa uIn uAc uH uK uS uP'.split(' ').forEach(function(n){U[n]=gl.getUniformLocation(prog,n);});
  gl.uniform3fv(U.uPa,rgb(CONFIG.paper));gl.uniform3fv(U.uIn,rgb(CONFIG.ink));gl.uniform3fv(U.uAc,rgb(CONFIG.accent));
  gl.uniform4f(U.uK,CONFIG.lines,CONFIG.scale,CONFIG.veil,0);
  gl.uniform4f(U.uS,1,1,0,0);gl.uniform4f(U.uH,0,0,0,.15);gl.uniform4fv(U.uP,new Float32Array(16));
  function draw(){if(morto)return;gl.uniform1f(U.uT,clock*CONFIG.speed+17);gl.drawArrays(gl.TRIANGLES,0,3);}
  function resize(){
    resizeRaf=0;if(morto)return;
    var W=root.clientWidth||1,H=root.clientHeight||1,S=Math.min(devicePixelRatio||1,1.25);
    cv.width=Math.round(W*S);cv.height=Math.round(H*S);
    gl.viewport(0,0,cv.width,cv.height);
    gl.uniform2f(U.uR,cv.width,cv.height);gl.uniform1f(U.uU,Math.max(480,Math.sqrt(W*H))*S);gl.uniform1f(U.uPx,S);
    draw();cv.style.opacity=1;root.classList.add('pronto');
  }
  function frame(now){
    raf=0;if(parado||morto||document.hidden||movimento.matches)return;
    clock+=Math.min(.1,Math.max(0,now-last)/1000);last=now;draw();raf=requestAnimationFrame(frame);
  }
  function check(){
    cancelAnimationFrame(raf);raf=0;
    if(!parado&&!morto&&!document.hidden&&!movimento.matches){last=performance.now();raf=requestAnimationFrame(frame);}
  }
  cv.addEventListener('webglcontextlost',off);
  new ResizeObserver(function(){if(!resizeRaf)resizeRaf=requestAnimationFrame(resize);}).observe(root);
  document.addEventListener('visibilitychange',check);movimento.addEventListener('change',function(){draw();check();});
  resize();check();
})();

(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const video=$('video'), player=$('player'), controles=$('controles'), selo=$('ativar');
  const aviso=$('pausa'), fim=$('fim'), barra=$('progresso'), menu=$('menu-velocidade');
  const icones={
    play:'<path d="m9 5 11 7-11 7Z"/>',
    pause:'<path d="M8 5v14M16 5v14"/>',
    sound:'<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute:'<path d="m11 5-6 4H2v6h3l6 4ZM16 9l6 6m0-6-6 6"/>'
  };
  const icone = nome => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icones[nome]+'</svg>';
  let ativo=false,arrastando=false,segundos=0,anterior=null,buscando=false,pausaDaPessoa=false,liberado=false;
  let timer=0,ultimoVolume=1,visivel=true;
  const duracao=()=>Number.isFinite(video.duration)&&video.duration>0?video.duration:0;
  const formatar=n=>{n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
  function liberar(){
    if(liberado)return;
    liberado=true;$('restante').hidden=false;$('restante').removeAttribute('aria-hidden');
    document.documentElement.classList.add('vsl-liberado');
    try{localStorage.setItem('cl_vsl_liberado','1');}catch(e){/* Armazenamento pode estar indisponível. */}
    document.dispatchEvent(new CustomEvent('vsl:liberado'));
  }
  function resetar(){
    liberado=false;segundos=0;anterior=null;$('restante').hidden=true;$('restante').setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('vsl-liberado');
    try{localStorage.removeItem('cl_vsl_liberado');}catch(e){/* A sessão continua sem armazenamento. */}
  }
  window.vslDebug={assistido:()=>segundos,liberar,resetar};
  const parametros=new URLSearchParams(location.search);
  if(parametros.get('resetar')==='1')resetar();
  else{
    let salvo=false;try{salvo=localStorage.getItem('cl_vsl_liberado')==='1';}catch(e){/* Usa apenas a sessão atual. */}
    if(salvo||parametros.get('liberar')==='1')liberar();
  }
  function exibirControles(){
    if(!ativo)return;
    controles.classList.remove('ocultos');clearTimeout(timer);
    if(!video.paused&&!video.ended&&!arrastando&&menu.hidden){
      timer=setTimeout(()=>{
        if(!(controles.contains(document.activeElement)&&document.activeElement.matches(':focus-visible'))&&menu.hidden)controles.classList.add('ocultos');
      },2500);
    }
  }
  function atualizar(){
    const d=duracao(),t=video.currentTime||0,p=d?t/d*100:0;
    $('tempo').textContent=formatar(t)+' / '+formatar(d||321);
    $('decorrido').style.width=p+'%';$('bolinha').style.left=p+'%';
    barra.setAttribute('aria-valuemax',String(d||321));barra.setAttribute('aria-valuenow',String(Math.round(t)));
    barra.setAttribute('aria-valuetext',formatar(t)+' de '+formatar(d||321));
    let carregado=0;
    for(let i=0;i<video.buffered.length;i++){
      if(video.buffered.start(i)<=t+.1&&video.buffered.end(i)>=t)carregado=video.buffered.end(i);
    }
    $('carregado').style.width=(d?carregado/d*100:0)+'%';
    $('tocar').innerHTML=icone(video.paused?'play':'pause');
    $('tocar').setAttribute('aria-label',video.paused?'Reproduzir':'Pausar');
  }
  function volume(){
    const mudo=video.muted||video.volume===0;
    $('mudo').innerHTML=icone(mudo?'mute':'sound');$('mudo').setAttribute('aria-label',mudo?'Ativar som':'Silenciar');
    $('volume').value=video.muted?0:video.volume;
  }
  function fallback(){
    selo.hidden=false;selo.querySelector('.selo-icone').innerHTML=icone('play');
    selo.querySelector('.selo-pequeno').hidden=true;selo.querySelector('strong').textContent='Clique para assistir';
    selo.setAttribute('aria-label','Assistir do início com som');
  }
  async function iniciar(){
    if(ativo)return;
    ativo=true;anterior=null;segundos=0;video.loop=false;video.muted=false;video.volume=1;video.currentTime=0;
    aviso.hidden=true;fim.hidden=true;selo.hidden=true;controles.hidden=false;player.classList.remove('previa');
    try{await video.play();volume();player.focus({preventScroll:true});exibirControles();}
    catch(e){ativo=false;controles.hidden=true;fallback();}
  }
  async function retomar(){
    aviso.hidden=true;fim.hidden=true;pausaDaPessoa=false;
    try{await video.play();}catch(e){aviso.hidden=false;}
    exibirControles();
  }
  function alternar(){
    if(!ativo){iniciar();return;}
    if(video.paused||video.ended){if(video.ended)video.currentTime=0;retomar();}
    else{pausaDaPessoa=true;video.pause();}
  }
  function buscar(tempo){
    if(!ativo||!duracao())return;
    anterior=null;video.currentTime=Math.min(duracao(),Math.max(0,tempo));atualizar();exibirControles();
  }
  function posicionar(e){
    const r=barra.getBoundingClientRect();
    buscar(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*duracao());
  }
  selo.addEventListener('click',iniciar);
  video.addEventListener('click',alternar);
  $('tocar').addEventListener('click',alternar);
  $('continuar').addEventListener('click',retomar);
  $('repetir').addEventListener('click',()=>{buscar(0);retomar();});
  video.addEventListener('playing',()=>{
    player.classList.add('gvx-vsl-ready');aviso.hidden=true;fim.hidden=true;pausaDaPessoa=false;
    window.fundoTopo.pausar();anterior=ativo?video.currentTime:null;atualizar();exibirControles();
  });
  video.addEventListener('pause',()=>{
    window.fundoTopo.retomar();anterior=null;
    if(ativo&&pausaDaPessoa&&!arrastando&&!video.ended)aviso.hidden=false;
    pausaDaPessoa=false;atualizar();exibirControles();
  });
  video.addEventListener('ended',()=>{
    aviso.hidden=true;if(ativo)fim.hidden=false;anterior=null;
    window.fundoTopo.retomar();atualizar();exibirControles();
  });
  video.addEventListener('timeupdate',()=>{
    const t=video.currentTime,d=duracao();
    if(ativo&&!video.paused&&!video.seeking&&!buscando&&!arrastando){
      const delta=anterior===null?0:t-anterior;
      if(delta>0&&delta<1.5)segundos+=delta;
      anterior=t;
      if(d&&segundos>=d*PORCENTAGEM_PARA_LIBERAR)liberar();
    }else anterior=null;
    atualizar();
  });
  video.addEventListener('seeking',()=>{buscando=true;anterior=null;});
  video.addEventListener('seeked',()=>{buscando=false;anterior=null;});
  ['loadedmetadata','durationchange','progress'].forEach(nome=>video.addEventListener(nome,atualizar));
  video.addEventListener('loadeddata',()=>player.classList.add('gvx-vsl-ready'));
  video.addEventListener('error',()=>{
    player.classList.add('gvx-vsl-ready');$('erro').hidden=false;
    $('erro').textContent='Não foi possível carregar o vídeo. Recarregue a página para tentar novamente.';
    window.fundoTopo.retomar();
  });
  barra.addEventListener('pointerdown',e=>{
    if(!ativo||!duracao()||e.button>0)return;
    e.preventDefault();arrastando=true;anterior=null;barra.setPointerCapture(e.pointerId);posicionar(e);
  });
  barra.addEventListener('pointermove',e=>{if(arrastando)posicionar(e);});
  function encerrarArrasto(e){
    if(!arrastando)return;
    if(e.type==='pointerup')posicionar(e);
    arrastando=false;anterior=null;
    if(barra.hasPointerCapture(e.pointerId))barra.releasePointerCapture(e.pointerId);
    exibirControles();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(nome=>barra.addEventListener(nome,encerrarArrasto));
  $('mudo').addEventListener('click',()=>{
    if(video.muted||video.volume===0){video.muted=false;video.volume=ultimoVolume||1;}
    else{ultimoVolume=video.volume;video.muted=true;}
    volume();exibirControles();
  });
  $('volume').addEventListener('input',e=>{
    video.volume=Number(e.target.value);video.muted=video.volume===0;
    if(video.volume>0)ultimoVolume=video.volume;volume();exibirControles();
  });
  video.addEventListener('volumechange',volume);
  function fecharMenu(){menu.hidden=true;$('velocidade').setAttribute('aria-expanded','false');exibirControles();}
  $('velocidade').addEventListener('click',()=>{
    menu.hidden=!menu.hidden;$('velocidade').setAttribute('aria-expanded',String(!menu.hidden));exibirControles();
  });
  menu.addEventListener('click',e=>{
    const botao=e.target.closest('[data-velocidade]');if(!botao)return;
    video.playbackRate=Number(botao.dataset.velocidade);
    $('velocidade').textContent=botao.textContent;
    menu.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===botao)));
    fecharMenu();$('velocidade').focus();
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.velocidade'))fecharMenu();});
  $('tela').addEventListener('click',async()=>{
    try{
      if(document.fullscreenElement||document.webkitFullscreenElement){
        const sair=document.exitFullscreen||document.webkitExitFullscreen;if(sair)await sair.call(document);
      }else{
        const entrar=player.requestFullscreen||player.webkitRequestFullscreen;
        if(entrar)await entrar.call(player);else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();
      }
    }catch(e){/* Mantém o player disponível se o navegador recusar tela cheia. */}
    exibirControles();
  });
  function telaAtualizada(){
    $('tela').setAttribute('aria-label',document.fullscreenElement||document.webkitFullscreenElement?'Sair da tela cheia':'Entrar em tela cheia');
  }
  document.addEventListener('fullscreenchange',telaAtualizada);document.addEventListener('webkitfullscreenchange',telaAtualizada);
  player.addEventListener('pointermove',exibirControles);
  player.addEventListener('pointerdown',exibirControles);
  player.addEventListener('focusin',exibirControles);
  player.addEventListener('focusout',()=>setTimeout(exibirControles,0));
  player.addEventListener('keydown',e=>{
    const emEntrada=e.target.matches('input');
    if(e.key==='Escape'){fecharMenu();return;}
    if(emEntrada)return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      if(e.target.closest('.menu-velocidade'))return;
      e.preventDefault();buscar(video.currentTime+(e.key==='ArrowRight'?5:-5));
    }else if(e.target===barra&&(e.key==='Home'||e.key==='End')){
      e.preventDefault();buscar(e.key==='Home'?0:duracao());
    }else if(e.key.toLowerCase()==='k'||(e.code==='Space'&&!e.target.closest('button'))){
      e.preventDefault();alternar();
    }
  });
  // Sem movimento fora da tela, incluindo selo e esqueleto.
  new IntersectionObserver(es=>{
    visivel=es[0].isIntersecting;
    player.classList.toggle('fora-da-tela',!visivel);
  }).observe(player);
  atualizar();volume();
  if(!video.paused)window.fundoTopo.pausar();
  const promessa=video.play();if(promessa)promessa.catch(fallback);
})();
