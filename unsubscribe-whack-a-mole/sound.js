/* ═════════ звук ═════════
   Письма выскакивают резиновым «буп», ныряют обратно «фьюп». Молоток свистит и бьёт мультяшным «бонк»
   с глухим низом, над письмом тихий «дзынь» отписки, счётчик щёлкает. Промах: деревянный «ток» по пустой лунке.
   All caught up: три светлые ноты вверх. «We miss you» выглядывает робким вопросом. Потом «вумп»,
   девять «буп» подряд, счётчик раскручивается тиками всё выше и звенит на 99+, письмо пружинит «боинг»,
   молоток со свистом падает и где-то внизу гремит. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
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

    // письмо выскочило: резиновый «буп» вверх, высота чуть разная
    E.pop=function(t,i){var k=[0,2,4,5,7,9,11,12,14][(i||0)%9],f0=300*Math.pow(2,k/24);
      tone(t,f0,f0*2.1,.19,.03,((i||0)%3-1)*.35,'sine',.1,.004,.06);sweep(t,600,2000,1.4,.06,.02,.08,((i||0)%3-1)*.35,.06)};
    // нырнуло обратно
    E.duck=function(t){tone(t,620,240,.12,.03,.3,'sine',.08,.003,.07);sweep(t,1800,500,1.4,.05,.01,.08,.3,.05)};
    // мах молотка
    E.swing=function(t,miss){
      var s=src(t,.3),bp=f('bandpass',600,1.1),gn=g(0);
      bp.frequency.setValueAtTime(600,t);bp.frequency.exponentialRampToValueAtTime(2400,t+.1);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(miss?.32:.26,t+.095);gn.gain.setTargetAtTime(0,t+.1,.015);
      chain(s,bp,gn);out(gn,.2,.08);
    };
    // удар по письму: мультяшный резиновый «бонк» и глухой низ
    E.bonk=function(t,i){var d=1+((i||0)%4)*.04;
      tone(t,150,58,.7,.05,0,'sine',.04);
      tone(t,520*d,250*d,.42,.045,0,'triangle',.1,.002,.08);
      tone(t,1040*d,500*d,.08,.02,0,'sine',.1,.002,.05);
      click(t,1200,.9,.55,.01,0,.12);click(t,3800,1.5,.12,.003,0,.1);
    };
    // «Unsubscribed»: тихий светлый «дзынь»
    E.toast=function(t,i){tone(t,1568,null,.05,.05,.25,'sine',.25);tone(t+.06,2093,null,.04,.08,.25,'sine',.3)};
    E.tick=function(t){click(t,3200,2,.12,.002,-.3,.05);tone(t,1900,null,.03,.01,-.3,'sine',0)};
    // промах: деревянный «ток» по краю пустой лунки
    E.miss=function(t){click(t,950,6,.9,.03,0,.15);tone(t,300,240,.25,.04,0,'triangle',.08);click(t,2600,3,.2,.006,0,.1)};
    // All caught up: три светлые ноты вверх
    E.zero=function(t){[1046.5,1318.5,1568].forEach(function(fr,k){tone(t+k*.075,fr,null,.08,.12,-.2,'sine',.3)})};
    // «We miss you» робко выглядывает: два тихих тона вопросом
    E.peek=function(t){tone(t,392,415,.1,.06,0,'sine',.12,.02,.1);tone(t+.16,494,560,.08,.08,0,'sine',.15,.02,.12)};
    // лезут все: низкий «вумп» и шорох
    E.erupt=function(t){
      var o=ctx.createOscillator(),gn=g(0);o.type='sine';o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(140,t+.18);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.55,t+.03);gn.gain.setTargetAtTime(0,t+.05,.09);
      chain(o,gn);out(gn,0,.05);o.start(t);o.stop(t+.6);
      sweep(t,300,1600,.9,.2,.04,.25,0,.15);
    };
    // счётчик раскручивается: тик выше с каждым числом
    E.roll=function(t,v){var fr=700+Math.min(99,v||0)*14;tone(t,fr,null,.085,.012,-.3,'sine',.05);click(t,4000,2,.07,.0015,-.3,.03)};
    // 99+: яркое двойное уведомление
    E.plus=function(t){tone(t,1760,null,.23,.07,-.3,'sine',.25);tone(t+.1,2349,null,.21,.12,-.3,'sine',.3);click(t,5000,2,.16,.003,-.3,.15)};
    // письмо пружинит обратно: «боинг»
    E.boing=function(t){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(90),gn=g(0);o.type='triangle';o.frequency.value=330;
      lfo.frequency.setValueAtTime(15,t);lfo.frequency.linearRampToValueAtTime(9,t+.5);
      lg.gain.setValueAtTime(110,t);lg.gain.setTargetAtTime(0,t,.18);
      chain(lfo,lg,o.frequency);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.28,t+.01);gn.gain.setTargetAtTime(0,t+.02,.14);
      chain(o,f('lowpass',2200,.7),gn);out(gn,-.2,.15);o.start(t);lfo.start(t);o.stop(t+.8);lfo.stop(t+.8);
    };
    E.swish=function(t,i){sweep(t,700,2200,1.2,.12,.03,.09,i?.3:-.3,.06)};
    // молоток выпал: свист вниз
    E.drop=function(t){
      var o=ctx.createOscillator(),gn=g(0),len=.42;o.type='sine';
      o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(420,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.08,t+.05);gn.gain.linearRampToValueAtTime(.1,t+len-.03);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,gn);out(gn,.2,.12);o.start(t);o.stop(t+len+.02);
    };
    // где-то внизу: глухой удар и дребезг ручки
    E.clatter=function(t){
      var lp=f('lowpass',1400,.7),gn=g(.6);chain(lp,gn);out(gn,.25,.3);
      var o=ctx.createOscillator(),og=g(0);o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(55,t+.12);
      og.gain.setValueAtTime(.5,t);og.gain.setTargetAtTime(0,t+.002,.06);chain(o,og,lp);o.start(t);o.stop(t+.5);
      var r2=rng(41);for(var k=0;k<6;k++){var d=k*.06+r2()*.03;click(t+d,700+r2()*900,3,.16*Math.exp(-k/2.5),.012,.25,.3)}
    };
    // письма уходят в лунки
    E.sink=function(t){for(var k=0;k<3;k++)tone(t+k*.05,500-k*60,200,.06,.03,(k-1)*.4,'sine',.1,.003,.08)};
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
