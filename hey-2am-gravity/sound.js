/* ═════════ звук ═════════
   Уведомление: два тихих стеклянных тона. Поле: низкий гул, который растёт и подтягивается
   вверх вместе с притяжением, поверх него воздух закручивается по кругу (панорама бегает
   с частотой закрутки). Палец по спирали: монетка в воронке, обороты учащаются и звук
   поднимается. Тап: пространство отпружинивает глухим «вумп» с дрожью. Дальше клавиши,
   отправка, щелчок блокировки. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
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
    chain(master,f('highpass',30,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.6*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.32)}
    verb.buffer=ir;chain(verb,g(.24),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.3:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+(att||.0015));gn.gain.setTargetAtTime(0,t+(att||.0015)+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.2:send);o.start(t);o.stop(t+(att||0)+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=src(t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.35:send);
    }
    // стеклянный тон с негармоническими призвуками
    function bell(t,f0,gain,dec,pan,send){
      tone(t,f0,null,gain,dec,pan,'sine',send,.004);
      tone(t,f0*2.01,null,gain*.3,dec*.6,pan,'sine',send,.004);
      tone(t,f0*3.47,null,gain*.1,dec*.35,pan,'sine',send,.004);
    }
    function curve(a,fn){var o=new Float32Array(a.length);for(var i=0;i<a.length;i++)o[i]=fn(a[i],i);o[0]=o[0]||0;return o}

    E.chime=function(t){bell(t,1318.5,.26,.16,.1,.4);bell(t+.11,1975.5,.2,.2,.1,.45)};
    // гул притяжения
    E.grav=function(t,C){
      var D=C.D,G=C.g,n=G.length;
      var o=ctx.createOscillator(),o2=ctx.createOscillator(),gn=g(0),lp=f('lowpass',180,.8);
      o.type='sine';o2.type='triangle';
      o.frequency.setValueCurveAtTime(curve(G,function(v){return 38+26*v}),t,D);
      o2.frequency.setValueCurveAtTime(curve(G,function(v){return 76.4+52*v}),t,D);
      var m2=g(.35);o2.connect(m2);m2.connect(lp);o.connect(lp);
      gn.gain.setValueCurveAtTime(curve(G,function(v,i){return i===n-1?0:.2*Math.pow(v,1.3)}),t,D);
      chain(lp,gn);out(gn,0,.05);
      // воздух закручивается: полоса шума поднимается, панорама бегает по кругу
      var s=src(t,D+.1),bp=f('bandpass',300,1),ng=g(0),pn=ctx.createStereoPanner(),lfo=ctx.createOscillator(),lg=g(.75);
      bp.frequency.setValueCurveAtTime(curve(G,function(v){return 320+2600*v*v}),t,D);
      ng.gain.setValueCurveAtTime(curve(G,function(v,i){return i===n-1?0:1.1*Math.pow(v,.8)}),t,D);
      lfo.frequency.setValueCurveAtTime(curve(C.w,function(v){return Math.max(.3,Math.min(9,v/(2*Math.PI)*2.2))}),t,D);
      chain(lfo,lg,pn.pan);chain(s,bp,ng,pn,master);var vs=g(.25);pn.connect(vs);vs.connect(verb);
      // натяжение: тонкий вой, который ползёт вверх и дрожит всё быстрее
      var wh=ctx.createOscillator(),wv=ctx.createOscillator(),wvg=g(0),wb=f('bandpass',600,2.5),wg=g(0);
      wh.type='triangle';
      wh.frequency.setValueCurveAtTime(curve(G,function(v){return 190+620*Math.pow(v,1.4)}),t,D);
      wb.frequency.setValueCurveAtTime(curve(G,function(v){return 380+1240*Math.pow(v,1.4)}),t,D);
      wv.frequency.setValueCurveAtTime(curve(G,function(v){return 4+9*v}),t,D);
      wvg.gain.setValueCurveAtTime(curve(G,function(v){return 6+30*v}),t,D);chain(wv,wvg,wh.frequency);
      wg.gain.setValueCurveAtTime(curve(G,function(v,i){return i===n-1?0:.42*Math.pow(v,1.2)}),t,D);
      chain(wh,wb,wg);out(wg,.1,.3);
      [o,o2,lfo,wh,wv].forEach(function(x){x.start(t);x.stop(t+D+.05)});
    };
    E.touch=function(t){click(t,1900,1.2,.26,.004,.4,.1);tone(t,320,180,.12,.012,.4,'sine',0)};
    // уведомление упирается: резиновый скрип
    E.drag=function(t,len){
      var o=ctx.createOscillator(),bp=f('bandpass',900,6),gn=g(0),lfo=ctx.createOscillator(),lg=g(14);
      o.type='sawtooth';o.frequency.setValueAtTime(140,t);o.frequency.linearRampToValueAtTime(205,t+len);
      lfo.frequency.value=17;chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.11,t+.05);gn.gain.linearRampToValueAtTime(.15,t+len*.8);gn.gain.linearRampToValueAtTime(0,t+len+.03);
      chain(o,bp,gn);out(gn,.35,.1);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
    };
    // монетка в воронке: обороты учащаются, тон растёт, каждый оборот слышен как «вум»
    E.orbit=function(t,C){
      var D=C.D,F=C.f,Rr=C.r,n=F.length;
      var o=ctx.createOscillator(),bp=f('bandpass',600,3),gn=g(0),am=ctx.createOscillator(),ag=g(.5),base=g(.5),pn=ctx.createStereoPanner(),pl=ctx.createOscillator(),pg=g(.8);
      o.type='sawtooth';
      o.frequency.setValueCurveAtTime(curve(F,function(v,i){return 150+90*v+130*(1-Rr[i])}),t,D);
      bp.frequency.setValueCurveAtTime(curve(F,function(v,i){return 420+900*(1-Rr[i])+80*v}),t,D);
      am.frequency.setValueCurveAtTime(curve(F,function(v){return Math.max(.5,v)}),t,D);
      pl.frequency.setValueCurveAtTime(curve(F,function(v){return Math.max(.5,v)}),t,D);
      chain(am,ag,base.gain);chain(pl,pg,pn.pan);
      gn.gain.setValueCurveAtTime(curve(F,function(v,i){return i>=n-2?0:.75*Math.min(1,i/6)}),t,D);
      chain(o,bp,base,gn,pn,master);var vs=g(.2);pn.connect(vs);vs.connect(verb);
      var s=src(t,D+.1),nb2=f('bandpass',1500,2),ng=g(0);
      nb2.frequency.setValueCurveAtTime(curve(F,function(v,i){return 900+2600*(1-Rr[i])}),t,D);
      ng.gain.setValueCurveAtTime(curve(F,function(v,i){return i>=n-2?0:.4*Math.min(1,i/6)}),t,D);
      chain(s,nb2,ng);ng.connect(base);
      [o,am,pl].forEach(function(x){x.start(t);x.stop(t+D+.05)});
    };
    E.tap=function(t){click(t,2400,1.4,.4,.004,0,.15);tone(t,420,220,.2,.014,0,'sine',.05)};
    // пространство отпружинивает
    E.snap=function(t){
      var o=ctx.createOscillator(),gn=g(0),lfo=ctx.createOscillator(),lg=g(0);
      o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(52,t+.35);
      lfo.frequency.value=9;lg.gain.setValueAtTime(26,t);lg.gain.setTargetAtTime(0,t,.18);chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.35,t+.008);gn.gain.setTargetAtTime(0,t+.01,.16);
      chain(o,gn);out(gn,0,.2);o.start(t);lfo.start(t);o.stop(t+1.2);lfo.stop(t+1.2);
      // то же «вумп» октавами выше, чтобы его было слышно в телефоне
      var o3=ctx.createOscillator(),l3=ctx.createOscillator(),g3=g(0),lg3=g(0),lp3=f('lowpass',1600,1);o3.type='triangle';
      o3.frequency.setValueAtTime(330,t);o3.frequency.exponentialRampToValueAtTime(140,t+.35);
      l3.frequency.value=9;lg3.gain.setValueAtTime(60,t);lg3.gain.setTargetAtTime(0,t,.18);chain(l3,lg3,o3.frequency);
      g3.gain.setValueAtTime(0,t);g3.gain.linearRampToValueAtTime(.34,t+.008);g3.gain.setTargetAtTime(0,t+.01,.15);
      chain(o3,lp3,g3);out(g3,0,.25);o3.start(t);l3.start(t);o3.stop(t+1.2);l3.stop(t+1.2);
      sweep(t,2600,500,1,.42,.01,.3,0,.3);
    };
    E.open=function(t){sweep(t,500,2200,.9,.34,.06,.24,0,.25)};
    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.6,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.2,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014,.15);click(t,1500,.9,.14,.005,.15)};
    E.send=function(t){sweep(t,700,3200,1.1,.8,.025,.2,.15,.3);tone(t+.03,660,1320,.15,.03,.15,'sine',.3)};
    E.tick=function(t){click(t,3800,3,.18,.002,.3,.1)};
    // блокировка: короткий сухой щелчок с низом
    E.lock=function(t){click(t,1200,1.1,.7,.006,0,.05);click(t+.004,3000,1.5,.3,.003,0,.05);tone(t,190,90,.25,.02,0,'sine',0)};
    // живой режим: смахнули и оно вернулось
    E.fling=function(t){sweep(t,600,2400,1.2,.3,.02,.25,-.4,.2);sweep(t+.5,2400,600,1.2,.3,.25,.3,-.3,.2)};
    E.thud=function(t){tone(t,140,60,.4,.04,0,'sine',.05);click(t,900,1,.2,.006,0,.1)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4],ev[5])};
    return E;
  }

  var S={ctx:null,eng:null,on:true};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  S.play=function(ev,delay){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.005+(delay||0));
  };

  /* запись: события петли кладутся на два круга, берётся второй, чтобы хвосты первого зашли в начало */
  S.renderLoop=async function(events,cycle,from,len){
    var sr=48000,n=Math.round(cycle*sr),L=Math.min(n,Math.round((len||cycle)*sr)),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr*2,sampleRate:sr}),E=Engine(ctx);
    for(var c=0;c<2;c++)events.forEach(function(ev){E.trigger(ev,((ev[0]-from)%cycle+cycle)%cycle+c*cycle+.001)});
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
