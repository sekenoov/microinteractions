/* ═════════ звук ═════════
   Клик, меню. Пресс едет вниз с шипением гидравлики и гулом мотора, встаёт «ка-чанк».
   Касание, потом давит: низкий стон металла растёт, пластик потрескивает, хруст и тяжёлый удар,
   из щели с писком выстреливают биты и стучат по полу. Пресс уходит вверх с выдохом «пшшш».
   Блины съезжаются, архив выпрыгивает, молния вжикает, размер щёлкает 48.0 → 47.9 и тупо встаёт.
   Второй удар: короткое шипение, удар, стон, выдох и резиновый «боинг».
   Всё синтезируется, в ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*3,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.003;comp.release.value=.15;
    chain(master,f('highpass',40,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.6*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.3)}
    verb.buffer=ir;chain(verb,g(.22),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.2:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att,glide){
      var o=ctx.createOscillator(),gn=g(0),a=att||.0015;o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||dec*4));
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+a);gn.gain.setTargetAtTime(0,t+a+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.15:send);o.start(t);o.stop(t+a+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=src(t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.25:send);
    }

    E.click=function(t){click(t,2600,1.6,.6,.0022,.2,.05);tone(t,1200,700,.08,.006,.2,'sine',0)};
    E.menu=function(t){tone(t,880,1320,.05,.02,.2,'sine',.1,.003,.04)};
    E.hover=function(t){click(t,3800,2,.06,.0015,.2,.03)};
    E.close=function(t){sweep(t,1600,700,1.4,.05,.01,.08,.2,.05)};
    // гидравлика: шипение воздуха
    E.hiss=function(t,len){var s=src(t,len+.3),hp=f('highpass',2500,.7),bp=f('bandpass',5200,.8),gn=g(0);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.22,t+.04);gn.gain.linearRampToValueAtTime(.12,t+len);gn.gain.linearRampToValueAtTime(0,t+len+.08);
      chain(s,hp,bp,gn);out(gn,0,.12)};
    // мотор: гул, растёт по тону
    E.motor=function(t,len){var o=ctx.createOscillator(),gn=g(0);o.type='sawtooth';o.frequency.setValueAtTime(70,t);o.frequency.linearRampToValueAtTime(115,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.09,t+.05);gn.gain.linearRampToValueAtTime(0,t+len+.05);
      chain(o,f('lowpass',600,.9),gn);out(gn,0,.05);o.start(t);o.stop(t+len+.1)};
    // встал над файлами: «ка-чанк»
    E.clunk=function(t){tone(t,140,70,.5,.05,0,'sine',.05);click(t,900,1.2,.6,.012,0,.2);click(t+.06,1400,2,.35,.01,0,.2);tone(t+.06,420,null,.07,.05,0,'triangle',.2)};
    E.touch=function(t){tone(t,110,70,.3,.04,0,'sine',.05);click(t,1600,2,.15,.006,0,.1)};
    // давит: низкий стон металла растёт по тону и громкости
    E.groan=function(t,len){
      var o=ctx.createOscillator(),o2=ctx.createOscillator(),gn=g(0),lp=f('lowpass',500,4);o.type='sawtooth';o2.type='sawtooth';
      o.frequency.setValueAtTime(52,t);o.frequency.linearRampToValueAtTime(78,t+len);o2.frequency.setValueAtTime(53.3,t);o2.frequency.linearRampToValueAtTime(80,t+len);
      lp.frequency.setValueAtTime(300,t);lp.frequency.linearRampToValueAtTime(900,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16,t+len*.8);gn.gain.linearRampToValueAtTime(0,t+len+.06);
      o.connect(lp);o2.connect(lp);chain(lp,gn);out(gn,0,.1);o.start(t);o2.start(t);o.stop(t+len+.1);o2.stop(t+len+.1);
    };
    // пластик потрескивает
    E.creak=function(t,i){var r2=rng(13+i);for(var k=0;k<4;k++)click(t+k*.018+r2()*.01,1800+r2()*1800,5,.32+i*.08,.004,(r2()-.5)*.6,.1)};
    // хруст: россыпь сухих щелчков
    E.crunch=function(t){var r2=rng(23);for(var k=0;k<26;k++){var d=r2()*.12;click(t+d,1200+r2()*3500,3,.85*(1-d*5),.004+r2()*.004,(r2()-.5)*.8,.12)}};
    // плита села: тяжёлый удар
    E.boom=function(t){tone(t,120,40,1,.09,0,'sine',.05);tone(t,240,90,.3,.05,0,'triangle',.05);click(t,600,.8,.9,.025,0,.25);click(t,2200,1.4,.35,.006,0,.15)};
    // биты выстрелили: быстрые писки
    E.squirt=function(t){var r2=rng(7);for(var k=0;k<8;k++)tone(t+k*.012,2400+r2()*1600,1400,.1,.012,(k%2?1:-1)*.6,'sine',.08,.001,.04)};
    E.bit=function(t,i){click(t,3000+(i%5)*400,4,.36,.002,(i%2?1:-1)*.6,.08)};
    // плита уходит: выдох
    E.release=function(t,len){var s=src(t,len+.4),bp=f('bandpass',3500,.6),gn=g(0);
      bp.frequency.setValueAtTime(5000,t);bp.frequency.exponentialRampToValueAtTime(1800,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.2,t+.02);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(s,bp,gn);out(gn,0,.15)};
    E.slide=function(t){sweep(t,400,900,1.6,.1,.08,.3,0,.1)};
    E.pop=function(t){tone(t,300,700,.22,.03,0,'sine',.12,.004,.07);click(t,2400,2,.15,.003,0,.1)};
    // молния архива вжикает
    E.zipper=function(t,len){var n=22;for(var k=0;k<n;k++){var d=k/n*len;click(t+d,2200+k*80,6,.4,.0015,.1,.04)}};
    // размер щёлкает и тупо встаёт
    E.roll=function(t){click(t,3600,2,.1,.002,0,.05);tone(t,1320,null,.04,.02,0,'sine',.1)};
    E.settle=function(t){tone(t,392,330,.2,.05,0,'triangle',.15,.003,.12);click(t,1200,3,.2,.008,0,.1)};
    // второй удар
    E.slam=function(t){tone(t,110,38,1,.1,0,'sine',.05);click(t,500,.8,1,.03,0,.3);click(t,1800,1.2,.45,.008,0,.2);tone(t,300,120,.25,.05,0,'triangle',.1)};
    // zip пружинит обратно резиной
    E.boing=function(t){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(0),gn=g(0);o.type='triangle';o.frequency.value=260;
      lfo.frequency.setValueAtTime(14,t);lfo.frequency.linearRampToValueAtTime(8,t+.6);
      lg.gain.setValueAtTime(120,t);lg.gain.setTargetAtTime(0,t,.22);
      chain(lfo,lg,o.frequency);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.3,t+.01);gn.gain.setTargetAtTime(0,t+.02,.18);
      chain(o,f('lowpass',2400,.7),gn);out(gn,0,.15);o.start(t);lfo.start(t);o.stop(t+1);lfo.stop(t+1);
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
    return E;
  }

  var S={ctx:null,eng:null,on:true,Engine:Engine};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  S.play=function(ev,late){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.03+Math.max(0,-(late||0)));
  };
  /* запись: события петли кладутся на два круга, берётся второй, чтобы хвосты первого зашли в начало */
  S.renderLoop=async function(events,cycle,from,len){
    var sr=48000,n=Math.round(cycle*sr),L=Math.min(n,Math.round((len||cycle)*sr)),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr*2,sampleRate:sr}),E=Engine(ctx);
    for(var c=0;c<2;c++)events.forEach(function(ev){E.trigger(ev,((ev[0]-from)%cycle+cycle)%cycle+c*cycle+.1)});
    var buf=await ctx.startRendering(),o=Math.round(.1*sr);
    return wav([buf.getChannelData(0).subarray(n+o,n+o+L),buf.getChannelData(1).subarray(n+o,n+o+L)],sr);
  };
  function wav(ch,sr){
    var n=ch[0].length,bytes=new Uint8Array(44+n*4),v=new DataView(bytes.buffer);
    function s(o,t){for(var i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))}
    s(0,'RIFF');v.setUint32(4,36+n*4,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);
    v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n*4,true);
    for(var i=0,o=44;i<n;i++)for(var c=0;c<2;c++,o+=2)v.setInt16(o,Math.max(-1,Math.min(1,ch[c][i]))*32767,true);
    var str='';for(var k=0;k<bytes.length;k+=32768)str+=String.fromCharCode.apply(null,bytes.subarray(k,k+32768));
    return btoa(str);
  }
  return S;
})();
