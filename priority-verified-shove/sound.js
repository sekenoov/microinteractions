/* ═════════ звук ═════════
   Клавиши, «фьють» ответа. Каждый толчок это глухой удар плечом с замахом-скрипом,
   отлетевшая карточка свистит вбок и шлёпается на место. Наверху два «дзынь» галочки.
   Max: нарастающий свист и очередь ударов, мой ответ улетает со свистом вниз по тону,
   через секунду где-то за экраном грохот. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
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

    // клавиша: короткий сухой тик
    E.key=function(t,i){click(t,2800+R()*900,2.2,.2,.0016,.25,.04);tone(t,240+R()*40,160,.08,.007,.25,'sine',0)};
    E.tap=function(t){click(t,1900,1.2,.22,.003,.3,.06);tone(t,300,190,.1,.01,.3,'sine',0)};
    // ответ ушёл: короткий взлёт
    E.send=function(t){sweep(t,500,2600,1.3,.11,.012,.1,.25,.1);tone(t+.01,520,900,.1,.025,.25,'sine',.12)};
    // карточка встала в список
    E.land=function(t){tone(t,190,120,.3,.03,0,'sine',.05);click(t,1300,1.4,.2,.004,0,.06)};
    // замах: резиновый скрип
    E.wind=function(t,i){var k=i>=4?1.3:1;sweep(t,260*k,170*k,7,.05,.06,.1,0,.05);tone(t,150*k,120*k,.04,.05,0,'triangle',0,.04)};
    // толчок плечом: глухой удар телом, с каждым разом сильнее
    E.shove=function(t,i){
      var v=Math.min(1.35,.75+.15*i);
      tone(t,150-8*Math.min(i,4),58,.5*v,.05,0,'sine',.06);
      tone(t,330,170,.14*v,.02,0,'triangle',.05);
      click(t,800+90*i,1.1,.32*v,.008,0,.1);click(t+.004,3000,1.6,.06*v,.002,0,.05);
    };
    // отлетевшая карточка свистит вбок
    E.swish=function(t,dir){sweep(t,2200,700,.9,.26,.012,.15,(dir||0)*.65,.12)};
    // и шлёпается обратно на место
    E.slap=function(t,dir){click(t,2300,1.1,.2,.004,(dir||0)*.4,.12);tone(t,250,150,.07,.012,(dir||0)*.4,'sine',.05)};
    // галочка подпрыгнула: два высоких «дзынь»
    E.bling=function(t,i){var p=i?.9:0;tone(t,1568,null,.15,.1,p,'sine',.4);tone(t+.065,2349,null,.13,.16,p,'sine',.45);click(t,6000,2,.06,.002,p,.2)};
    // ответ автора: мягкий поп
    E.who=function(t){sweep(t-.03,700,2600,1.4,.16,.02,.1,.4,.1);tone(t+.03,640,470,.26,.04,.4,'sine',.12);click(t+.03,2200,1.5,.12,.003,.4,.08)};
    // Max выезжает снизу
    E.rise=function(t){sweep(t,180,520,1.6,.07,.18,.22,0,.08)};
    // пуск: большой нарастающий свист
    E.launch=function(t){sweep(t,260,3200,.9,.32,.05,.38,0,.15);tone(t,90,45,.35,.08,0,'sine',.05)};
    // мой улетает: свист вниз по тону и в сторону
    E.fling=function(t){
      sweep(t,3000,600,1.1,.4,.015,.42,.75,.2);
      var o=ctx.createOscillator(),gn=g(0);o.type='sine';o.frequency.setValueAtTime(1500,t+.05);o.frequency.exponentialRampToValueAtTime(420,t+.8);
      gn.gain.setValueAtTime(0,t+.05);gn.gain.linearRampToValueAtTime(.045,t+.12);gn.gain.linearRampToValueAtTime(0,t+.8);chain(o,gn);out(gn,.85,.3);o.start(t+.05);o.stop(t+.85);
    };
    // где-то за экраном: грохот вдалеке
    E.crash=function(t){
      var r2=rng(41);
      for(var i=0;i<9;i++){var d=i*.035+r2()*.05;click(t+d,500+r2()*1800,1.3,.16*(1-i/12),.01+r2()*.01,.9,.5)}
      tone(t,110,60,.1,.06,.9,'sine',.4);
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
