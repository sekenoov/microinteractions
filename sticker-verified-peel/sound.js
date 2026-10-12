/* ═════════ звук ═════════
   Наклейка отходит с липким треском, клапан щёлкает вверх. Палец трёт плёнку со скрипом,
   хлопает по стеклу. «Payment failed» двумя тупыми тонами. Дрожь мелким дребезгом,
   отскок звонким пружинным «пинг». Кувырки бумажным шорохом, посадка тихим шлепком.
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
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.2*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.22)}
    verb.buffer=ir;chain(verb,g(.2),master);

    function out(node,pan,send,dest){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,dest||master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.2:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+(att||.0015));gn.gain.setTargetAtTime(0,t+(att||.0015)+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.15:send);o.start(t);o.stop(t+(att||0)+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=src(t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.25:send);
    }
    function curve(arr,fn){var a=new Float32Array(arr.length);for(var i=0;i<arr.length;i++)a[i]=fn(arr[i],i);return a}

    // отклеивается: липкий треск, плотный в начале и редеющий
    E.peel=function(t,len,v){
      v=v||1;var n=Math.floor(len*170),r2=rng(Math.floor(t*1000));
      for(var i=0;i<n;i++){var u=i/n,tt=t+len*Math.pow(u,1.35),a=(.16+.3*Math.sin(Math.PI*Math.min(1,u*1.3)))*v*(.5+r2());
        click(tt,1800+r2()*3800,2.4,a,.0009+r2()*.0008,.3,.04)}
      var s=src(t,len+.1),bp=f('bandpass',900,1.4),gn=g(0);
      bp.frequency.setValueAtTime(700,t);bp.frequency.exponentialRampToValueAtTime(2600,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.2*v,t+len*.3);gn.gain.linearRampToValueAtTime(0,t+len);chain(s,bp,gn);out(gn,.3,.05);
    };
    // клапан отщёлкнулся вверх
    E.flick=function(t,i){click(t,3200,1.8,.3,.002,i?-.3:.3,.08);tone(t,900,1400,.04,.01,i?-.3:.3,'sine',.05)};
    E.press=function(t,v){tone(t,140,90,.16*v,.03,0,'sine',.03);click(t,700,1,.1*v,.006,0,.03)};
    // трение: скрип пальца по плёнке, удары туда-сюда
    E.rub=function(t,len,hz){
      var n=Math.floor(len*hz);
      for(var i=0;i<n;i++){var tt=t+i/hz,u=i/n,a=.42*Math.sin(Math.PI*(u*.9+.05));
        sweep(tt,1400+(i%2)*500,2400+(i%2)*600,5,a,.02,.05,i%2?-.15:.15,.03);
        tone(tt+.01,1700+(i%2)*260,1900+(i%2)*200,a*.18,.025,0,'sine',.02,.015)}
    };
    // похлопывание пальцем по стеклу
    E.tap=function(t,i){click(t,2600-200*i,1.3,.4,.003,0,.06);tone(t,330-20*i,200,.22,.014,0,'sine',.03)};
    // оплата не прошла: два тупых тона вниз
    E.fail=function(t){tone(t,660,null,.08,.07,0,'triangle',.2,.004);tone(t+.16,440,null,.09,.12,0,'triangle',.25,.004);click(t,1800,1.5,.05,.003,0,.1)};
    // дрожь: мелкий дребезг, всё чаще
    E.shiver=function(t,len){var n=26;for(var i=0;i<n;i++){var u=i/n,tt=t+len*(1-Math.pow(1-u,1.8));click(tt,3000+R()*1500,3,.1+.2*u,.0012,0,.03)}};
    // отскок: звонкий «пинг» пружиной и «фьють» вверх
    E.ping=function(t){
      click(t,4200,1.6,.2,.0025,0,.1);
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(260),gn=g(0);
      o.frequency.value=1750;lfo.frequency.value=24;lg.gain.setValueAtTime(260,t);lg.gain.setTargetAtTime(0,t,.12);
      chain(lfo,lg,o.frequency);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.085,t+.003);gn.gain.setTargetAtTime(0,t+.004,.12);
      chain(o,gn);out(gn,0,.35);o.start(t);lfo.start(t);o.stop(t+1);lfo.stop(t+1);
      tone(t,3500,null,.05,.08,0,'sine',.4);
      sweep(t+.01,600,3000,1.2,.16,.015,.22,.2,.12);
    };
    // кувырок: бумажный шорох на каждом ребре
    E.flutter=function(t,k){var p=((k%2)?.3:-.3);sweep(t-.03,1100,2400,1.6,.2,.03,.08,p,.1)};
    E.land=function(t){click(t,1900,1.2,.3,.004,0,.08);tone(t,240,170,.14,.014,0,'sine',.05);click(t+.09,2400,1.4,.1,.003,0,.06)};
    // живой режим: непрерывный скрип трения
    E.rubVoice=function(){
      var s=ctx.createBufferSource();s.buffer=nb;s.loop=true;var bp=f('bandpass',1900,4),gn=g(0);chain(s,bp,gn);out(gn,0,.03);s.start();
      return {gn:gn,bp:bp};
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
    return E;
  }

  var S={ctx:null,eng:null,on:true,live:null};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  // ev[0] в живом проигрывании не важен; кривые на всю петлю запускаются со сдвигом
  S.play=function(ev,late){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.03+Math.max(0,-(late||0)));
  };
  S.liveRub=function(v){
    if(!S.ctx||S.ctx.state!=='running')return;
    if(!S.rv)S.rv=S.eng.rubVoice();
    var t=S.ctx.currentTime;S.rv.gn.gain.setTargetAtTime(.22*v,t,.04);S.rv.bp.frequency.setTargetAtTime(1500+1500*v,t,.05);
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
