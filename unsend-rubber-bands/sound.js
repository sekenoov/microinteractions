/* ═════════ звук ═════════
   Резинки звучат как струны: каждая щёлкает щипком (Karplus-Strong) с резиновым подтягом высоты,
   пять щелчков поднимаются по пентатонике и последний разрешается октавой. Вылет из поля:
   резиновое «бвоинг» с качанием в такт тарзанке. Пока висит: тихий скрип натяжения.
   Посадка: шлепок. Палец мимо: глухой тап. Ответ: два нисходящих «блуп».
   Всё синтезируется, в ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  var NOTES=[293.66,329.63,392,440,587.33,1174.66];

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    // щипок струны: шум в линии задержки, усреднение соседей гасит верха
    function ks(freq,dur,decay,bright,seed){
      var n=Math.floor(sr*dur),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0),N=Math.max(2,Math.round(sr/freq)),rk=rng(seed),line=new Float32Array(N),p=0,mx=0;
      for(var i=0;i<N;i++){p=p*(1-bright)+(rk()*2-1)*bright;line[i]=p}
      var k=0;
      for(i=0;i<n;i++){var a=line[k],c=line[(k+1)%N];line[k]=decay*.5*(a+c);d[i]=a;if(Math.abs(a)>mx)mx=Math.abs(a);k=(k+1)%N}
      for(i=0;i<n;i++)d[i]/=mx||1;
      return b;
    }
    var KS=NOTES.map(function(fq,i){return ks(fq,1.6,.9985,.62,11+i)});

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',40,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.8*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.13)}
    verb.buffer=ir;chain(verb,g(.24),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function src(buf,t,len){var s=ctx.createBufferSource();s.buffer=buf;s.start(t,R()*.8);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(nb,t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
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
      var s=src(nb,t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.35:send);
    }
    // скрип резины: пила с дрожью высоты через узкую полосу
    function squeak(t,f0,f1,len,gain,pan){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(f0*.035),bp=f('bandpass',f0*2,4),gn=g(0);
      o.type='sawtooth';lfo.frequency.value=9+R()*4;
      o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
      bp.frequency.setValueAtTime(f0*2,t);bp.frequency.exponentialRampToValueAtTime(f1*2,t+len);
      chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.04);gn.gain.setValueAtTime(gain,t+len*.7);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,bp,gn);out(gn,pan,.15);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
    }
    // резиновое «бвоинг»: высота качается и затухает
    function boing(t,f0,f1,rate,depth,len,gain,pan){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(0),lp=f('lowpass',1500,1.2),gn=g(0);
      o.type='triangle';lfo.frequency.value=rate;
      o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
      lg.gain.setValueAtTime(f0*depth,t);lg.gain.setTargetAtTime(0,t+.02,len*.35);chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.012);gn.gain.setTargetAtTime(0,t+.04,len*.3);
      chain(o,lp,gn);out(gn,pan,.2);o.start(t);lfo.start(t);o.stop(t+len*2);lfo.stop(t+len*2);
    }

    // клавиатура
    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.3,.0042,-.05,.06);
      tone(t,320+((i*53)%4)*18,170,.1,.007,-.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014,.4);click(t,1500,.9,.14,.005,.4)};
    // ушло из поля: вдох вверх и резина растягивается
    E.send=function(t){
      sweep(t,700,3400,1.1,.42,.02,.18,.3,.3);
      boing(t+.02,150,118,7.5,.22,.7,.3,.25);
      squeak(t+.06,420,640,.32,.02,.25);
    };
    // висит: резина поскрипывает, чем меньше нитей, тем выше
    E.creak=function(t,len,j){squeak(t,380+70*j,430+80*j,len,.011+.002*j,.15)};
    // нить лопнула
    E.snap=function(t,j,pan){
      var s=ctx.createBufferSource(),lp=f('lowpass',3600+400*j,.6),gn=g(0),v=j===4?.85:.6;
      s.buffer=KS[j];
      s.playbackRate.setValueAtTime(1.035,t);s.playbackRate.exponentialRampToValueAtTime(.975,t+.22);
      gn.gain.setValueAtTime(v,t);gn.gain.setTargetAtTime(0,t+.3,j===4?.35:.2);
      chain(s,lp,gn);out(gn,pan,.28);s.start(t);s.stop(t+1.6);
      click(t,3400,1.3,.42,.0028,pan,.18);
      tone(t,210,95,.14,.018,pan,'sine',.04);
      if(j===4){
        var s2=ctx.createBufferSource(),g2=g(0);s2.buffer=KS[5];
        s2.playbackRate.setValueAtTime(1.02,t);s2.playbackRate.exponentialRampToValueAtTime(.985,t+.2);
        g2.gain.setValueAtTime(.32,t);g2.gain.setTargetAtTime(0,t+.25,.3);chain(s2,g2);out(g2,-pan,.35);s2.start(t);s2.stop(t+1.6);
      }
    };
    // рогатка: свист вверх
    E.zip=function(t){sweep(t,900,5200,1.3,.5,.015,.13,0,.25);tone(t,380,1500,.08,.03,0,'sine',.2)};
    // шлепок о своё место
    E.land=function(t,k){
      k=k==null?1:k;
      tone(t,165,52,.5*k,.05,.2,'sine',.05,.002);
      click(t,1500,1,.3*k,.006,.2,.12);
      var s=src(nb,t,.2),lp=f('lowpass',700,.7),gn=g(0);gn.gain.setValueAtTime(.45*k,t);gn.gain.setTargetAtTime(0,t+.002,.018);chain(s,lp,gn);out(gn,.2,.1);
    };
    // палец опоздал: глухой тап по пустому месту
    E.dead=function(t){tone(t,210,140,.11,.012,0,'sine',.02);click(t,800,.7,.07,.004,0,.02)};
    // прочитано: два тихих тика
    E.read=function(t){tone(t,2600,null,.035,.006,.3,'sine',.25);tone(t+.065,3100,null,.03,.006,.3,'sine',.25)};
    // у собеседника появились точки
    E.blip=function(t){tone(t,420,760,.07,.018,-.3,'sine',.2,.004);click(t,2400,2,.05,.003,-.3,.1)};
    // ответ: два нисходящих «блуп», неловко
    E.reply=function(t){
      tone(t,784,740,.15,.07,-.3,'sine',.3,.004);tone(t,1568,null,.03,.03,-.3,'sine',.3,.004);
      tone(t+.11,523,494,.15,.11,-.3,'sine',.35,.004);tone(t+.11,1046,null,.025,.04,-.3,'sine',.3,.004);
    };
    // лента уезжает вверх: следующая ночь
    E.swish=function(t){sweep(t,2600,800,.8,.07,.06,.32,0,.3)};
    // живой режим: успел, резина утаскивает обратно
    E.undo=function(t){boing(t,520,170,9,.18,.35,.26,.25);sweep(t,3200,700,1,.22,.02,.2,.25,.2)};
    E.plop=function(t){tone(t,320,150,.24,.03,.35,'sine',.1);click(t,1300,1,.12,.004,.35,.1)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4])};
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
