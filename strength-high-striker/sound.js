/* ═════════ звук ═════════
   Клавиши, клик по Continue. Замах скрипит, молот со свистом бьёт по рычагу: глухой «ток» и звяк железа.
   На слабом пароле шайба пискляво подскакивает, шлёпается обратно, и форма отвечает тупым «бом-бом».
   На сильном тот же удар, шайба взвизгивает вверх, на каждом сегменте тик выше, колокол звенит долго,
   шайба гремит обратно. Confirm password: шорох смены экрана, шкала сливается вниз.
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

    // клавиша: короткий сухой тик
    E.key=function(t,i){click(t,2800+R()*900,2.2,.2,.0016,-.1,.04);tone(t,240+R()*40,160,.07,.007,-.1,'sine',0)};
    // клик мыши по Continue
    E.click=function(t){click(t,2600,1.6,.34,.0022,.35,.05);tone(t,1200,700,.08,.006,.35,'sine',0)};
    // замах: ручка скрипит, воздух тянется назад
    E.wind=function(t){sweep(t,320,760,5,.07,.12,.22,.4,.1);tone(t,95,130,.06,.08,.4,'triangle',0,.05,.2)};
    // мах вниз: свист, нарастает к удару
    E.swing=function(t){
      var s=src(t,.4),bp=f('bandpass',500,1.1),gn=g(0);
      bp.frequency.setValueAtTime(500,t);bp.frequency.exponentialRampToValueAtTime(2300,t+.16);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.45,t+.155);gn.gain.setTargetAtTime(0,t+.16,.02);
      chain(s,bp,gn);out(gn,.2,.12);
    };
    // удар по рычагу: глухой «ток» дерева и короткий звяк железной пластины
    E.hit=function(t){
      tone(t,118,46,.75,.07,.1,'sine',.05);tone(t,236,92,.28,.05,.1,'triangle',.05);
      tone(t,58,40,.5,.14,.1,'sine',.02);
      click(t,700,.9,.95,.018,.1,.15);click(t,2100,1.2,.4,.006,.1,.12);
      tone(t,642,null,.11,.06,.1,'triangle',.2);tone(t,1013,null,.08,.05,.1,'sine',.2);tone(t,1597,null,.05,.04,.1,'sine',.25);
    };
    // шайба по рельсу: на слабом короткий писк, на сильном взвизг вверх
    E.zip=function(t,strong){
      if(!strong){tone(t,330,560,.09,.03,-.15,'triangle',.08,.004,.12);sweep(t,900,1600,3,.05,.03,.12,-.15,.05);return}
      var o=ctx.createOscillator(),gn=g(0);o.type='triangle';
      o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(1900,t+.21);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.14,t+.04);gn.gain.linearRampToValueAtTime(.18,t+.2);gn.gain.linearRampToValueAtTime(0,t+.23);
      chain(o,f('lowpass',3200,.7),gn);out(gn,-.15,.1);o.start(t);o.stop(t+.25);
      sweep(t,700,4200,1.6,.14,.19,.21,-.15,.08);
    };
    // сегмент шкалы загорелся: тик выше на каждом
    E.step=function(t,k){var fr=[784,988,1175][k]||1175;tone(t,fr,null,.17,.035,-.15,'sine',.2);click(t,4200,2,.09,.002,-.15,.1)};
    // колокол: неровные обертоны, долгий хвост, лёгкое биение
    E.ding=function(t){
      var f0=987.8,P=[[.5,.16,.9],[1,1,1.5],[2.0,.42,1.0],[2.76,.32,.7],[3.9,.18,.45],[5.4,.1,.3]];
      P.forEach(function(p){tone(t,f0*p[0],null,.32*p[1],p[2]/2.3,-.15,'sine',.3,.002);tone(t,f0*p[0]+1.7,null,.18*p[1],p[2]/2.3,-.12,'sine',.3,.002)});
      click(t,5200,1.5,.45,.004,-.15,.25);click(t,2400,2,.3,.006,-.15,.2);
    };
    // шайба вернулась вниз: стук, громкость по скорости
    E.floor=function(t,v){var a=Math.min(1,v/1000);tone(t,160,92,.5*a+.05,.04,-.1,'sine',.04);click(t,820,1.1,.5*a+.06,.01,-.1,.1);click(t,3200,1.6,.12*a,.003,-.1,.1)};
    // ошибка: тупое «бом-бом»
    E.err=function(t){
      tone(t,233,null,.2,.06,0,'triangle',.1,.004);tone(t+.13,185,null,.22,.09,0,'triangle',.1,.004);
      tone(t,116.5,null,.12,.06,0,'sine',.05,.004);tone(t+.13,92.5,null,.14,.09,0,'sine',.05,.004);
    };
    E.sel=function(t){click(t,3300,2,.1,.002,-.1,.05)};
    E.del=function(t){sweep(t,1800,600,1.4,.08,.01,.12,-.1,.08);click(t,2600,2,.12,.002,-.1,.05)};
    // шкала сливается вниз
    E.drain=function(t,big){var o=ctx.createOscillator(),gn=g(0),len=big?.42:.3;o.type='sine';
      o.frequency.setValueAtTime(big?1100:620,t);o.frequency.exponentialRampToValueAtTime(big?260:240,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(big?.07:.05,t+.03);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,gn);out(gn,-.15,.15);o.start(t);o.stop(t+len+.02)};
    // Strong: короткий светлый аккорд
    E.ok=function(t){tone(t,1318.5,null,.07,.08,.2,'sine',.25);tone(t+.07,1760,null,.07,.12,.2,'sine',.3)};
    // смена экрана на Confirm password
    E.conf=function(t){sweep(t,600,2200,1.2,.07,.05,.18,.1,.15);tone(t+.02,660,880,.04,.03,.1,'sine',.1)};
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
