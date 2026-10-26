/* ═════════ звук ═════════
   Набор: каждая буква это горстка песка, которая сыплется из точек и садится на место,
   поэтому щелчки сухие, высокие и с разбросом. Стирание: зажатый backspace, сухой треск
   ускоряется, а под ним воздух втягивается обратно в точки. Точки набиты под завязку и гудят.
   «ok» садится плотно и глухо. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

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
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.6*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.09)}
    verb.buffer=ir;chain(verb,g(.2),master);

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

    // свой вопрос улетает: короткий вздох вверх
    E.send=function(t){sweep(t,700,3200,1.1,.5,.025,.2,.15,.3);tone(t+.03,660,1320,.09,.03,.15,'sine',.3)};
    // пузырь «печатает» появился
    E.blip=function(t){tone(t,420,760,.07,.018,-.3,'sine',.2,.004);click(t,2400,2,.05,.003,-.3,.1)};
    // буква: горстка вылетает из точек (i — номер буквы, чтобы разброс был стабильным)
    E.grain=function(t,i){
      var h=((i*2654435761)>>>0)/4294967296;
      click(t,3800+h*2600,2.2,.2,.0018,-.32+h*.12,.08);
      click(t+.006+h*.01,5200+h*1800,3,.09,.0012,-.3,.05);
    };
    // буква села: сухой шорох чуть позже и тише
    E.settle=function(t,i){
      var h=((i*1597334677)>>>0)/4294967296;
      click(t,2600+h*1600,1.6,.08,.0022,-.25+h*.2,.12);
    };
    // зажатый backspace: треск идёт по тем же буквам, только ниже и суше
    E.del=function(t,i){
      var h=((i*362437)>>>0)%1000/1000;
      click(t,1900+h*900,1.8,.085,.0018,-.28,.06);
    };
    // песок втягивается в точки
    E.suck=function(t,len){
      sweep(t,420,2600,1.4,.26,len*.7,len,-.3,.18);
      var s=src(nb,t,len+.3),hp=f('highpass',5200,.7),gn=g(0);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.05,t+len*.8);gn.gain.setTargetAtTime(0,t+len,.05);
      chain(s,hp,gn);out(gn,-.3,.1);
    };
    // точки набиты: низкий гул с дрожью
    E.pack=function(t,len){
      var o=ctx.createOscillator(),am=ctx.createOscillator(),ag=g(.05),gn=g(0),lp=f('lowpass',420,.8);
      o.type='triangle';o.frequency.setValueAtTime(64,t);o.frequency.exponentialRampToValueAtTime(118,t+len);
      am.frequency.value=27;chain(am,ag,gn.gain);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16,t+len*.85);gn.gain.linearRampToValueAtTime(0,t+len+.02);
      chain(o,lp,gn);out(gn,-.3,.05);o.start(t);am.start(t);o.stop(t+len+.05);am.stop(t+len+.05);
    };
    // «ok» садится: плотный глухой стук, маленький щелчок, короткий тон
    E.ok=function(t){
      tone(t,190,62,.42,.05,-.3,'sine',.05,.002);
      click(t,1500,1,.2,.005,-.3,.15);
      sweep(t-.04,3600,900,1.2,.12,.03,.12,-.3,.1);
      tone(t+.015,560,500,.07,.05,-.3,'sine',.3,.003);
    };
    // клавиатура
    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.32,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.11,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014,.15);click(t,1500,.9,.14,.005,.15)};
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
