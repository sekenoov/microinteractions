/* ═════════ звук ═════════
   Каждый переключатель это струна. Выключение: щелчок ручки, мягкий тычок «хаптика» и стеклянная
   нота; восемь строк вниз складываются в нисходящую пентатонику A6 G6 E6 D6 C6 A5 G5, ухо ждёт
   следующую ноту, а на собаке вместо неё глухой стук: клавиша без струны. Ручка пружиной летит
   назад с резиновым «бойн». Тап по собаке: два тупых стука. Включение (воскресенье) идёт вверх
   в миноре и звучит теплее и тише. Всё синтезируется. В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  var DOWN=[1760,1568,1318.5,1174.7,1046.5,880,784,659.3];   // по строкам сверху вниз
  var UP=[784,698.5,622.3,587.3,523.3,466.2,392,349.2];       // вверх от 6:30 к 6:00: G4 B♭4 C5 D5 E♭5 F5 G5

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',45,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.1*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.2)}
    verb.buffer=ir;chain(verb,f('lowpass',6500,.5),g(.26),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function click(t,freq,q,gain,dec,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',freq,q),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.15:send);s.start(t,R()*1.5);s.stop(t+dec*9+.02);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att,glide){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||dec*4));
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+(att||.0015));gn.gain.setTargetAtTime(0,t+(att||.0015)+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.2:send);o.start(t);o.stop(t+(att||0)+dec*9+.02);
    }
    // стеклянный брусок: основной тон и два негармонических призвука
    function bell(t,f0,gain,dec,pan,send){
      tone(t,f0,null,gain,dec,pan,'sine',send,.002);
      tone(t,f0*2.76,null,gain*.22,dec*.42,pan,'sine',send,.001);
      if(f0*5.4<sr*.45)tone(t,f0*5.4,null,gain*.06,dec*.2,pan,'sine',send,.001);
    }

    // суббота: переключатель выключается
    E.off=function(t,i){
      var n=DOWN[i%8];
      click(t,4600,2.4,.16,.0018,.18,.05);
      tone(t,150,85,.13,.012,0,'sine',0);
      bell(t+.004,n,.2,.34,.12-.03*i,.38);
      tone(t+.004,n/2,null,.05,.2,.1,'triangle',.25,.004);
    };
    // воскресенье: включается обратно, теплее и тише
    E.on=function(t,i){
      var n=UP[i%8];
      click(t,3800,2,.13,.002,.18,.05);
      tone(t,140,85,.11,.012,0,'sine',0);
      tone(t+.004,n,null,.13,.26,-.05+.03*i,'triangle',.4,.006);
      tone(t+.004,n*2,null,.03,.12,.05,'sine',.3,.004);
    };
    // собака: клавиша без струны
    E.refuse=function(t){
      click(t,900,1.1,.45,.007,.15,.08);
      tone(t,165,88,.42,.04,.1,'sine',.05);
      tone(t+.003,659.3,540,.14,.03,.15,'triangle',.08,.002,.07);
    };
    // ручка летит назад: резиновый «бойн»
    E.snap=function(t){
      click(t+.03,3400,2,.12,.002,.2,.08);
      var o=ctx.createOscillator(),gn=g(0),lf=ctx.createOscillator(),lg=g(26);
      o.type='sine';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(420,t+.06);
      lf.frequency.value=19;chain(lf,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.12,t+.012);gn.gain.setTargetAtTime(0,t+.02,.07);
      chain(o,gn);out(gn,.15,.15);o.start(t);lf.start(t);o.stop(t+.6);lf.stop(t+.6);
    };
    // тап по собаке: нет-нет
    E.nope=function(t){
      [0,.088].forEach(function(dt,k){
        click(t+dt,800-k*80,1.1,.34,.006,.15,.06);
        tone(t+dt,180-k*20,110-k*12,.32,.032,.1,'sine',.04);
      });
    };
    // палец касается стекла
    E.touch=function(t){click(t,1700,.9,.05,.004,.15,.04)};
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
    var sr=48000,n=Math.round(cycle*sr),L=Math.min(n,Math.round((len||cycle)*sr)),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr,sampleRate:sr}),E=Engine(ctx);
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
