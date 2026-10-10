/* ═════════ звук ═════════
   Встряска: телефон с шорохом режет воздух, тире мелко дребезжат в гнёздах, как шпильки в коробке,
   и выскакивают с тихим щелчком. Падение: каждое тире звенит своим тоном, когда бьётся о поле или
   о соседа, сила звона от скорости удара (удары берутся из самой физики). Набор: мягкие клавиши,
   отправка с коротким вздохом вверх. Возврат: тире взлетает свистком вверх и садится в текст
   с чистым звоном, шесть посадок подряд складываются в восходящую пентатонику.
   Всё синтезируется. В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  var PITCH=[2793.8,3136,3322.4,3729.3,4186,4698.6];        // собственный тон каждого тире
  var SEAT=[1046.5,1174.7,1318.5,1568,1760,2093];            // посадки: C D E G A C

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
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.7*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.11)}
    verb.buffer=ir;chain(verb,g(.22),master);

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
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',f0,q),gn=g(0);s.buffer=nb;
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.35:send);s.start(t,R()*1.2);s.stop(t+len*3+.1);
    }
    // тонкая металлическая палочка: щелчок плюс два негармонических призвука
    function ping(t,f0,gain,dec,pan,send){
      tone(t,f0,null,gain,dec,pan,'sine',send);
      if(f0*2.76<sr*.4)tone(t,f0*2.76,null,gain*.35,dec*.45,pan,'sine',send);
      if(f0*5.4<sr*.4)tone(t,f0*5.4,null,gain*.12,dec*.25,pan,'sine',send);
    }

    // взмах телефона: глухой шорох воздуха
    E.swish=function(t,e,pan){sweep(t,1100,420,.8,.2*e+.03,.03,.11,pan,.08);tone(t,95,70,.05*e,.03,pan,'sine',0)};
    // тире бренчит в гнезде
    E.rattle=function(t,j,a,pan){
      click(t,5200+((j*311)%7)*260,6,.11*a,.0016,pan,.08);
      click(t,2400+((j*97)%5)*200,4,.05*a,.002,pan,.05);
      tone(t,PITCH[j%6]*1.5,null,.012*a,.012,pan,'sine',.05);
    };
    // выскочило из строки
    E.pop=function(t,j,pan){click(t,3400,3,.26,.003,pan,.2);tone(t,PITCH[j%6]*.75,PITCH[j%6],.07,.02,pan,'sine',.25)};
    // удар о поле или о соседнее тире
    E.hit=function(t,j,v,pan){
      var a=Math.min(1,Math.pow(v/600,.9));if(a<.04)return;
      click(t,2600+((j*173)%5)*400,2.2,.7*a,.0028,pan,.18);
      click(t,900,1.4,.35*a,.004,pan,.1);
      ping(t,PITCH[j%6]*(1+(R()-.5)*.012),.16*a,.05+.08*a,pan,.3);
      tone(t,240,130,.12*a,.01,pan,'triangle',.05);
    };
    // клавиатура
    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.13,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.05,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014);click(t,1500,.9,.14,.005)};
    // отправка: короткий вздох вверх
    E.send=function(t){sweep(t,700,3000,1.1,.2,.025,.2,.1,.3);tone(t+.03,660,1320,.04,.03,.1,'sine',.3)};
    // слово в стриме
    E.tick=function(t,pan,i){click(t,3600+((i*37)%11)*160,2.2,.06,.003,pan,.1)};
    // тире взлетает из кучки
    E.fly=function(t,j,pan){
      tone(t,520,1560,.05,.06,pan,'sine',.25,.03);
      sweep(t,900,4200,2.2,.07,.05,.24,pan,.25);
    };
    // и садится в текст: щелчок и чистая нота
    E.seat=function(t,j,pan){
      click(t,4200,2,.22,.0026,pan,.2);
      ping(t,SEAT[j%6],.085,.15,pan,.45);
    };
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
