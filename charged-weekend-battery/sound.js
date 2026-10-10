/* ═════════ звук ═════════
   Кабель щёлкает в разъём, короткий сигнал зарядки. Минуты сначала тикают по одной, потом
   сливаются в гул перемотки, который поднимается и опускается вместе со скоростью часов.
   Полночь перещёлкивает дату как табло. Последние минуты воскресенья тикают громко, заряд
   добирает по проценту с подъёмом, в 00:00 звучит аккорд «готово». Понедельник: перемотка
   к утру, кабель выдёргивают, приходят уведомления, и каждое уводит заряд вниз. Экран гаснет
   щелчком блокировки. Всё синтезируется, сэмплов нет. В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={},live=[];
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-12;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.1;
    chain(master,f('highpass',60,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.3*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.24)}
    verb.buffer=ir;chain(verb,g(.22),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=pan||0;chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function click(t,freq,q,gain,dec,pan){
      var s=ctx.createBufferSource(),bp=f('bandpass',freq,q),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,.3);s.start(t,R()*1.5);s.stop(t+dec*9+.02);
    }
    function tone(t,f0,f1,gain,dec,pan,send){
      var o=ctx.createOscillator(),gn=g(0);o.type='sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.002);gn.gain.setTargetAtTime(0,t+.003,dec);
      chain(o,gn);out(gn,pan,send==null?.25:send);o.start(t);o.stop(t+dec*9+.02);
    }
    function breath(t,f0,f1,gain,len,pan){
      var s=ctx.createBufferSource(),bp=f('bandpass',f0,1.2),gn=g(0);s.buffer=nb;
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+len*.45);gn.gain.setTargetAtTime(0,t+len*.6,len*.28);
      chain(s,bp,gn);out(gn,pan||0,.4);s.start(t,R()*.8);s.stop(t+len*3+.05);
    }
    function bell(t,f0,gain,pan){
      [[1,1,1.1],[2.76,.3,.45],[5.4,.1,.22],[2,.16,.7]].forEach(function(p){
        tone(t,f0*p[0],null,gain*p[1],p[2]*.34,pan,.6);
      });
      click(t,f0*3,3,gain*.35,.003,pan);
    }

    // кабель входит в разъём: щелчок и короткий сигнал зарядки
    E.plug=function(t){click(t,1700,1.6,.5,.004,0);click(t+.012,3400,3,.25,.002,0);tone(t+.05,1175,null,.13,.05,0,.35);tone(t+.13,1760,null,.11,.08,0,.4)};
    // минута: тихий тик, на последних минутах воскресенья громче
    E.tick=function(t,k){k=k||0;click(t,3200,8,.4+.45*k,.004,.12);tone(t,1900,null,.04+.06*k,.007,.12)};
    // перемотка: шум в полосе и гудение, высота и громкость идут за скоростью часов
    E.whirr=function(t,cv,dur){
      var s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
      var bp=f('bandpass',300,.9),gn=g(0),o=ctx.createOscillator(),og=g(0);o.type='triangle';
      var n=cv.length,F=new Float32Array(n),G=new Float32Array(n),O=new Float32Array(n),OG=new Float32Array(n);
      for(var i=0;i<n;i++){var v=cv[i];F[i]=260+2600*Math.pow(v,.8);G[i]=.2*Math.pow(v,1.3);O[i]=90+260*v;OG[i]=.035*Math.pow(v,1.5)}
      bp.frequency.setValueCurveAtTime(F,t,dur);gn.gain.setValueCurveAtTime(G,t,dur);
      o.frequency.setValueCurveAtTime(O,t,dur);og.gain.setValueCurveAtTime(OG,t,dur);
      chain(s,bp,gn);out(gn,0,.25);chain(o,f('lowpass',900,.7),og);out(og,0,.1);
      s.start(t);s.stop(t+dur+.05);o.start(t);o.stop(t+dur+.05);
      live.push(s,o);
    };
    // полночь: дата перещёлкивается как табло
    E.flap=function(t,k){click(t,1300,2,.3+.08*(k||0),.006,-.1);click(t+.02,2500,4,.2,.003,-.1)};
    // процент сверху: подъём на тон
    E.blip=function(t,k){tone(t,988*Math.pow(2,(k||0)*2/12),null,.08,.03,.2,.3)};
    E.clack=function(t){click(t,2700,4,.6,.006,0);click(t+.015,1500,2,.4,.008,0);tone(t,150,90,.16,.03)};
    // 00:00 и 100%: аккорд «готово»
    E.charged=function(t){bell(t,1046.5,.13,-.15);bell(t+.1,1318.5,.11,0);bell(t+.2,1568,.13,.15);bell(t+.32,2093,.07,.05)};
    E.ff=function(t){breath(t,280,3600,.16,.55,0)};
    E.unplug=function(t){click(t,1400,1.4,.35,.004,0);tone(t,520,260,.1,.03)};
    // уведомление: два тона, каждое на своей высоте
    var PG=[[1318.5,1760],[1174.7,1568],[1396.9,1864.7],[1244.5,1661.2],[1480,1975.5]];
    E.ping=function(t,k){var p=PG[k%5],pan=(k%2?.18:-.18);tone(t,p[0],null,.13,.045,pan,.35);tone(t+.075,p[1],null,.12,.07,pan,.4)};
    // заряд проседает: свист вниз
    E.drop=function(t,k){k=k||0;tone(t,720-50*k,240-25*k,.17+.02*k,.05,0,.15)};
    E.lock=function(t){click(t,950,1.4,.6,.006,0);tone(t,170,85,.24,.025)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
    E.cut=function(){live.forEach(function(s){try{s.stop()}catch(e){}});live=[]};
    return E;
  }

  var S={ctx:null,eng:null,on:true};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx){S.cut();S.ctx.suspend()}};
  S.cut=function(){if(S.eng)S.eng.cut()};
  S.play=function(ev,delay){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.005+(delay||0));
  };

  /* запись: события петли кладутся на два круга, берётся второй, чтобы хвосты первого зашли в начало */
  S.renderLoop=async function(events,cycle,from){
    var sr=48000,n=Math.round(cycle*sr),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr,sampleRate:sr}),E=Engine(ctx);
    for(var c=0;c<2;c++)events.forEach(function(ev){
      var t=((ev[0]-from)%cycle+cycle)%cycle+c*cycle;
      E.trigger(ev,t);
    });
    var buf=await ctx.startRendering();
    return wav([buf.getChannelData(0).subarray(n,2*n),buf.getChannelData(1).subarray(n,2*n)],sr);
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
