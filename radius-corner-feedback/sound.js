/* ═════════ звук ═════════
   Наведение и захват ручки. Пока тянешь, резина тихо скрипит и растёт по тону, храповик щёлкает выше с каждым шагом.
   Упор в максимум, ручку тянут ещё, натяг. Срыв: щелчок резинки. Круг катится с низким гулом слева направо и уходит.
   ⌘Z двумя клавишами и мягкий щелчок, квадрат на месте.
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
    chain(master,f('highpass',35,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.4*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.25)}
    verb.buffer=ir;chain(verb,g(.2),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.15:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att,glide){
      var o=ctx.createOscillator(),gn=g(0),a=att||.0015;o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||dec*4));
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+a);gn.gain.setTargetAtTime(0,t+a+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.12:send);o.start(t);o.stop(t+a+dec*9+.02);
    }

    E.hover=function(t){click(t,4200,2,.05,.0012,-.3,.03)};
    E.press=function(t){click(t,2600,1.6,.5,.002,-.3,.05);tone(t,1100,700,.07,.006,-.3,'sine',0)};
    // резина тянется: тихий скрип, тон растёт вместе со скруглением
    E.stretch=function(t,len,rg){
      var f0=90+100*(rg?rg[0]:0),f1=90+100*(rg?rg[1]:1);
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(0),bp=f('bandpass',700,6),gn=g(0);
      o.type='sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
      lfo.frequency.value=23;lg.gain.value=9;chain(lfo,lg,o.frequency);
      bp.frequency.setValueAtTime(600,t);bp.frequency.exponentialRampToValueAtTime(1500,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.05,t+.15);gn.gain.linearRampToValueAtTime(.09,t+len);gn.gain.linearRampToValueAtTime(0,t+len+.05);
      chain(o,bp,gn);out(gn,-.15,.08);o.start(t);lfo.start(t);o.stop(t+len+.1);lfo.stop(t+len+.1);
    };
    // храповик: щелчок выше с каждым шагом
    E.tick=function(t,p){click(t,2400+p*2600,5,.22,.0018,-.15,.05);tone(t,700+p*900,null,.035,.008,-.15,'sine',.04)};
    E.max=function(t){tone(t,220,150,.25,.035,-.1,'sine',.05);click(t,1400,2,.25,.006,-.1,.1)};
    // натяг: резина звенит на одной ноте и дрожит
    E.strain=function(t,len){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(0),bp=f('bandpass',1500,5),gn=g(0);
      o.type='sawtooth';o.frequency.setValueAtTime(190,t);o.frequency.linearRampToValueAtTime(230,t+len);
      lfo.frequency.value=31;lg.gain.value=16;chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(.09,t);gn.gain.linearRampToValueAtTime(.14,t+len);gn.gain.linearRampToValueAtTime(0,t+len+.02);
      chain(o,bp,gn);out(gn,0,.08);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
    };
    // срыв: щелчок резинки, короткий «тванг»
    E.slip=function(t){
      click(t,3000,1.2,.8,.003,0,.15);tone(t,1400,260,.22,.03,0,'sine',.12,.001,.06);
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(0),gn=g(0);o.type='triangle';o.frequency.value=170;
      lfo.frequency.value=17;lg.gain.setValueAtTime(40,t);lg.gain.setTargetAtTime(0,t,.12);chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.26,t+.006);gn.gain.setTargetAtTime(0,t+.01,.1);
      chain(o,f('lowpass',1800,.7),gn);out(gn,0,.15);o.start(t);lfo.start(t);o.stop(t+.7);lfo.stop(t+.7);
    };
    // качение: низкий гул и шорох, уезжает вправо и затихает
    E.roll=function(t,len){
      var s=src(t,len+.2),lp=f('lowpass',260,1.2),gn=g(0),p=ctx.createStereoPanner();
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.55,t+.25);gn.gain.linearRampToValueAtTime(.32,t+.75);gn.gain.linearRampToValueAtTime(0,t+1.3);
      lp.frequency.setValueAtTime(160,t);lp.frequency.linearRampToValueAtTime(320,t+.5);lp.frequency.linearRampToValueAtTime(140,t+1.3);
      p.pan.setValueAtTime(0,t);p.pan.linearRampToValueAtTime(.9,t+1);
      chain(s,lp,gn,p,master);
      var o=ctx.createOscillator(),og=g(0);o.type='sine';o.frequency.setValueAtTime(52,t);o.frequency.linearRampToValueAtTime(64,t+.6);
      og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.18,t+.2);og.gain.linearRampToValueAtTime(0,t+1.1);
      chain(o,og,p);o.start(t);o.stop(t+1.2);
      // мелкий стук по холсту, всё реже по мере удаления
      var r2=rng(17);for(var k=0;k<16;k++){var d=.05+k*.065+r2()*.02;click(t+d,1800+r2()*900,4,.12*(1-k/16),.002,.2+k*.045,.05)}
    };
    E.gone=function(t){var s=src(t,.3),bp=f('bandpass',1200,.9),gn=g(0);bp.frequency.setValueAtTime(1800,t);bp.frequency.exponentialRampToValueAtTime(600,t+.2);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.05,t+.02);gn.gain.linearRampToValueAtTime(0,t+.22);chain(s,bp,gn);out(gn,.8,.1)};
    // клавиши ⌘ и Z
    E.key=function(t,i){click(t,i?2300:1900,1.4,.55,.0028,0,.06);tone(t,i?190:160,i?120:110,.22,.018,0,'sine',.03);click(t+.035,3200,2,.12,.0015,0,.03)};
    E.snap=function(t,i){var f=[620,520,440][i||0];tone(t,f,f*1.5,.16,.03,0,'sine',.1,.002,.05);click(t,2800,2,.18,.002,0,.06)};
    // пин комментария падает на холст: мягкий «ток» и короткий подъём тона
    E.pin=function(t,i){var pn=[-.5,.5,-.5,.5,-.4][i]||0;tone(t,180,120,.3,.03,pn,'sine',.06);click(t,1500,1.6,.3,.005,pn,.12);tone(t+.05,[660,740,830,990,880][i]||700,null,.06,.05,pn,'sine',.2,.004)};
    // пин закрывается: лёгкий хлопок пузыря
    E.pop=function(t,i){var pn=[-.5,.5,-.5,.5,-.4][i]||0;tone(t,500+i*90,1100+i*120,.12,.018,pn,'sine',.1,.002,.04);click(t,3000,2,.12,.0015,pn,.05)};
    E.release=function(t){click(t,2200,1.6,.3,.002,-.2,.05);tone(t,600,900,.05,.01,-.2,'sine',.05)};
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
