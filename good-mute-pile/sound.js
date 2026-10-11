/* ═════════ звук ═════════
   Голоса без слов: пила через резонансный фильтр, который открывается на каждом слоге,
   как труба с сурдиной. Sarah звучит чисто, я в выключенный микрофон глухо, как в подушку.
   Плашки шлёпаются в кучу мягко, плитка скрипит, щелчок кнопки, «блуп» микрофона,
   хлопок, и весь рассказ вылетает скороговоркой. «good.» один низкий слог.
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
    chain(master,f('highpass',45,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.1*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.2)}
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

    // слог: две пилы чуть врозь, фильтр раскрывается «уа» и закрывается
    E.syl=function(t,o){
      var d=o.d,end=t+d,lp=f('lowpass',300,5.5),gn=g(0),tail=gn;
      lp.frequency.setValueAtTime(280,t);
      lp.frequency.exponentialRampToValueAtTime(o.open,t+d*.38);
      lp.frequency.exponentialRampToValueAtTime(380,end+.02);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(o.g,t+Math.min(.022,d*.3));
      gn.gain.setValueAtTime(o.g*.85,t+d*.72);gn.gain.linearRampToValueAtTime(0,end+.03);
      [1,1.006].forEach(function(det,i){
        var os=ctx.createOscillator();os.type=i?'square':'sawtooth';
        os.frequency.setValueAtTime(o.f0*det,t);os.frequency.linearRampToValueAtTime(o.f1*det,end);
        var og=g(i?.35:1);chain(os,og,lp);os.start(t);os.stop(end+.06);
      });
      chain(lp,gn);
      if(o.muff){var m=f('lowpass',o.muff,.9),m2=f('lowpass',o.muff*1.3,.7);chain(gn,m,m2);tail=m2}
      out(tail,o.pan||0,o.muff?.35:.12);
    };
    // «good.»: один низкий слог вниз, без сил
    E.good=function(t){
      E.syl(t,{f0:148,f1:104,d:.34,open:820,g:.62,muff:0});
      click(t+.3,260,1.2,.12,.01,0,.05);
    };
    // слово выскочило из аватарки
    E.pop=function(t,o){tone(t,o.f,o.f*1.6,.05,.012,.35,'sine',.05)};
    // плашка шлёпнулась на кучу: мягко и глухо
    E.plop=function(t,o){
      var a=Math.min(1,o.v/700);
      tone(t,260+120*a,120,.1+.18*a,.03,o.pan,'sine',.05);
      click(t,700,1,.07+.12*a,.008,o.pan,.04);
    };
    // летит по экрану и бьётся о края
    E.tick=function(t,o){
      var a=Math.min(1,o.v/1400);
      click(t,o.wall?2400:1700,2,.06+.14*a,.004,o.pan,.12);
      tone(t,o.wall?900:620,null,.03+.06*a,.02,o.pan,'triangle',.1);
    };
    // плитку распирает: резиновый скрип
    E.strain=function(t,len){
      var o=ctx.createOscillator(),bp=f('bandpass',1300,6),gn=g(0),lfo=ctx.createOscillator(),lg=g(14);
      o.type='sawtooth';o.frequency.setValueAtTime(70,t);o.frequency.linearRampToValueAtTime(118,t+len);
      lfo.frequency.value=23;chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16,t+len*.8);gn.gain.linearRampToValueAtTime(0,t+len+.02);
      chain(o,bp,gn);out(gn,.35,.12);o.start(t);lfo.start(t);o.stop(t+len+.1);lfo.stop(t+len+.1);
    };
    E.tap=function(t){click(t,1900,1.2,.24,.004,-.2,.08);tone(t,320,180,.1,.012,-.2,'sine',0)};
    // микрофон включён и выключен: два тона вверх и вниз
    E.unmute=function(t){tone(t,740,null,.13,.05,-.15,'sine',.2,.004);tone(t+.07,1108,null,.13,.08,-.15,'sine',.2,.004)};
    E.mute=function(t){tone(t,1108,null,.11,.05,-.15,'sine',.2,.004);tone(t+.07,740,null,.11,.08,-.15,'sine',.2,.004)};
    // хлопок: крышка слетела
    E.burst=function(t){
      var s=src(t,.5),hp=f('highpass',1600,.7),gn=g(0);gn.gain.setValueAtTime(.7,t);gn.gain.setTargetAtTime(0,t+.002,.05);chain(s,hp,gn);out(gn,.3,.3);
      tone(t,170,55,.55,.05,.3,'sine',.05);tone(t,420,160,.25,.03,.3,'triangle',.05);
      sweep(t+.01,500,3200,1.1,.32,.03,.32,.2,.3);
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
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
    S.eng.trigger(ev,S.ctx.currentTime+.08+(delay||0));
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
