/* ═════════ звук ═════════
   Под всем тихий ветер на улице. Каждая буква ответа всходит мягким щелчком со своей нотой,
   как токены в стриме. Порыв проходит по газону шорохом слева направо. Палец в траве: шуршание,
   громкость от скорости. Retry: щелчок кнопки, короткий вжик, и триммер проходит слева направо,
   срезы цокают. Всё синтезируется. В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  var NOTE=[523.25,587.33,659.25,783.99,880,1046.5,1174.7,1318.5,1568,1760,2093]; // пентатоника вверх по буквам

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',40,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.9*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.16)}
    verb.buffer=ir;chain(verb,g(.2),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function click(t,freq,q,gain,dec,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',freq,q),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.3:send);s.start(t,R()*1.5);s.stop(t+dec*9+.02);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+(att||.0015));gn.gain.setTargetAtTime(0,t+(att||.0015)+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.2:send);o.start(t);o.stop(t+(att||0)+dec*9+.02);
    }
    // шорох: полоса шума с атакой и спадом
    function hiss(t,f0,f1,q,gain,att,len,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',f0,q),gn=g(0);s.buffer=nb;
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+att+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.25:send);s.start(t,R()*1.2);s.stop(t+att+len*3+.1);
    }

    // буква всходит: мягкий щипок и сухой шелест
    E.sprout=function(t,i,pan){
      var n=NOTE[i%NOTE.length];
      tone(t,n,null,.09,.07,pan,'sine',.4);
      tone(t,n*2,null,.025,.03,pan,'sine',.3);
      hiss(t,2600,5200,1.2,.06,.012,.06,pan,.15);
    };
    // порыв ветра идёт слева направо
    E.gust=function(t,d){
      var s=ctx.createBufferSource(),bp=f('bandpass',380,.7),gn=g(0),p=ctx.createStereoPanner();s.buffer=nb;s.loop=true;
      bp.frequency.setValueAtTime(320,t);bp.frequency.linearRampToValueAtTime(900,t+d*.5);bp.frequency.linearRampToValueAtTime(420,t+d);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16,t+d*.45);gn.gain.linearRampToValueAtTime(0,t+d*1.05);
      p.pan.setValueAtTime(-.6,t);p.pan.linearRampToValueAtTime(.6,t+d);
      chain(s,bp,gn,p,master);s.start(t,R()*.8);s.stop(t+d*1.1+.05);
      hiss(t+d*.25,3000,6000,.8,.05,d*.3,d*.25,0,.1);
    };
    // палец коснулся травы
    E.down=function(t,pan){tone(t,170,110,.07,.012,pan,'sine',0);hiss(t,3400,4600,1,.13,.006,.05,pan,.1)};
    E.lift=function(t,pan){hiss(t,4200,5200,1.2,.05,.004,.03,pan,.08)};
    // шуршание под пальцем
    E.rustle=function(t,a,pan){
      hiss(t,3000+R()*2600,4200+R()*2400,1.1,.11*a,.006,.028,pan,.08);
      if(R()<.5)click(t+R()*.01,5200+R()*2500,3,.05*a,.0015,pan,.05);
    };
    E.tap=function(t){tone(t,240,130,.16,.013);click(t,1500,.9,.12,.005)};
    // кнопка крутится: короткий вжик вверх
    E.spin=function(t){hiss(t,900,3200,1.4,.07,.03,.16,.1,.2)};
    // триммер: жужжание плюс шум, едет слева направо
    E.mow=function(t,d){
      var o=ctx.createOscillator(),o2=ctx.createOscillator(),lp=f('lowpass',2400,.8),gn=g(0),p=ctx.createStereoPanner();
      o.type='sawtooth';o2.type='square';
      o.frequency.setValueAtTime(118,t);o.frequency.linearRampToValueAtTime(132,t+d);
      o2.frequency.setValueAtTime(236.5,t);o2.frequency.linearRampToValueAtTime(265,t+d);
      var g2=g(.35);
      o.connect(lp);o2.connect(g2);g2.connect(lp);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.075,t+.03);gn.gain.setValueAtTime(.075,t+d-.02);gn.gain.setTargetAtTime(0,t+d-.02,.05);
      p.pan.setValueAtTime(-.55,t);p.pan.linearRampToValueAtTime(.55,t+d);
      chain(lp,gn,p,master);var sv=g(.25);gn.connect(sv);sv.connect(verb);
      o.start(t);o2.start(t);o.stop(t+d+.4);o2.stop(t+d+.4);
      var s=ctx.createBufferSource(),bp=f('bandpass',2400,.6),ng=g(0),p2=ctx.createStereoPanner();s.buffer=nb;s.loop=true;
      ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.16,t+.03);ng.gain.setValueAtTime(.16,t+d-.02);ng.gain.setTargetAtTime(0,t+d-.02,.06);
      p2.pan.setValueAtTime(-.55,t);p2.pan.linearRampToValueAtTime(.55,t+d);
      chain(s,bp,ng,p2,master);s.start(t,R());s.stop(t+d+.5);
      // обрезки сыплются после прохода
      hiss(t+d*.6,5000,3000,.9,.05,.08,.35,.3,.15);
    };
    E.snip=function(t,pan,i){click(t,6200+((i*173)%7)*300,2.4,.16,.0018,pan,.12);click(t,2400,1.6,.06,.003,pan,.05)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4])};

    // ветер на улице: тихая подложка, живёт всё время
    E.bed=function(t0,len){
      var s=ctx.createBufferSource(),lp=f('lowpass',520,.5),bp=f('bandpass',1700,.5),gn=g(.05),g2=g(.012),lfo=ctx.createOscillator(),lg=g(.018);
      s.buffer=nb;s.loop=true;
      lfo.frequency.value=.37;lfo.connect(lg);lg.connect(gn.gain);
      s.connect(lp);lp.connect(gn);s.connect(bp);bp.connect(g2);
      gn.connect(master);g2.connect(master);
      s.start(t0);lfo.start(t0);if(len){s.stop(t0+len);lfo.stop(t0+len)}
      return {stop:function(){try{s.stop();lfo.stop()}catch(e){}}};
    };
    return E;
  }

  var S={ctx:null,eng:null,on:true,bed:null};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx);S.bed=S.eng.bed(S.ctx.currentTime+.05)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  S.play=function(ev,delay){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.005+(delay||0));
  };

  /* запись: события петли кладутся на два круга, берётся второй, чтобы хвосты первого зашли в начало */
  S.renderLoop=async function(events,cycle,from,len){
    var sr=48000,n=Math.round(cycle*sr),L=Math.min(n,Math.round((len||cycle)*sr)),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr,sampleRate:sr}),E=Engine(ctx);
    E.bed(0,0);
    for(var c=0;c<2;c++)events.forEach(function(ev){E.trigger(ev,((ev[0]-from)%cycle+cycle)%cycle+c*cycle)});
    var buf=await ctx.startRendering();
    return wav([buf.getChannelData(0).subarray(n,n+L),buf.getChannelData(1).subarray(n,n+L)],sr);
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
