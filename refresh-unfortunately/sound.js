/* ═════════ звук ═════════
   Рывок вниз: резина скрипит, высота растёт с натяжением. Отпустил: резиновый щелчок.
   Строки, сходясь, стучат друг о друга, как деревянные бруски. Пока крутится индикатор,
   тихо трещит храповик. Письмо падает со свистом и бьёт, как наковальня, а сразу за ударом
   звенит бодрый сигнал новой почты. Смахнул: свист и смятая бумага.
   Всё синтезируется, в ?rec дорожка петли считается офлайн. Низ выше 180 Гц, чтобы сыграл телефон. */
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
    chain(master,f('highpass',60,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.7*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.11)}
    verb.buffer=ir;chain(verb,g(.22),master);

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
    function squeak(t,f0,f1,len,gain,pan,wob){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(f0*(wob||.035)),bp=f('bandpass',f0*2,4),gn=g(0);
      o.type='sawtooth';lfo.frequency.value=9+R()*4;
      o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
      bp.frequency.setValueAtTime(f0*2,t);bp.frequency.exponentialRampToValueAtTime(f1*2,t+len);
      chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.05);gn.gain.setValueAtTime(gain,t+len*.8);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,bp,gn);out(gn,pan,.15);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
    }
    // металл: негармонические обертоны, как у наковальни
    function clang(t,base,gain,dec,pan){
      [[1,1],[2.76,.6],[4.07,.42],[5.93,.3],[8.2,.16]].forEach(function(p,i){
        tone(t,base*p[0],null,gain*p[1],dec*(1-.13*i),pan,'sine',.35,.001);
      });
    }

    // касание
    E.touch=function(t){click(t,2100,1.6,.06,.003,.1,.05);tone(t,330,210,.05,.01,.1,'sine',.02)};
    // рывок: скрип растёт с натяжением, на третьем ещё и стонет
    E.creak=function(t,len,dist,i){
      var top=280+dist*1.9,gn=.03+.012*i;
      squeak(t+.03,260,top,len,gn,.05,.03+.02*i);
      var s=src(nb,t,len+.3),bp=f('bandpass',900,3.2),ng=g(0);
      bp.frequency.setValueAtTime(700,t);bp.frequency.exponentialRampToValueAtTime(700+dist*5,t+len);
      ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.014+.01*i,t+len);ng.gain.linearRampToValueAtTime(0,t+len+.06);
      chain(s,bp,ng);out(ng,0,.1);
      if(i===2){
        // на пределе: натянутая резина дрожит
        var o=ctx.createOscillator(),am=ctx.createOscillator(),ag=g(.05),b2=f('bandpass',940,5),sg=g(0);
        o.type='sawtooth';o.frequency.setValueAtTime(230,t+len*.45);o.frequency.linearRampToValueAtTime(300,t+len);
        am.type='square';am.frequency.value=29;chain(am,ag,sg.gain);
        sg.gain.setValueAtTime(0,t+len*.45);sg.gain.linearRampToValueAtTime(.07,t+len*.95);sg.gain.linearRampToValueAtTime(0,t+len+.03);
        chain(o,b2,sg);out(sg,0,.1);o.start(t+len*.45);am.start(t+len*.45);o.stop(t+len+.06);am.stop(t+len+.06);
      }
    };
    // порог обновления пройден: тактильный щелчок
    E.arm=function(t){tone(t,240,170,.16,.008,0,'sine',.02);click(t,3200,2,.05,.002,0,.02)};
    // отпустил: резина щёлкает, чем сильнее тянул, тем громче и с дрожью
    E.snap=function(t,dist,i){
      var k=Math.min(1,dist/350);
      sweep(t,600,3600,1.2,.28+.3*k,.008,.12,0,.25);
      var o=ctx.createOscillator(),vib=ctx.createOscillator(),vg=g(30*k),gn=g(0);
      o.type='triangle';vib.frequency.value=17;chain(vib,vg,o.frequency);
      o.frequency.setValueAtTime(520+160*k,t);o.frequency.exponentialRampToValueAtTime(240,t+.22+.1*k);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16+.14*k,t+.005);gn.gain.setTargetAtTime(0,t+.01,.06+.06*k);
      chain(o,gn);out(gn,0,.25);o.start(t);vib.start(t);o.stop(t+.6);vib.stop(t+.6);
    };
    // индикатор крутится: тихий храповик
    E.spin=function(t,len){
      var n=Math.floor(len*14);
      for(var i=0;i<n;i++)click(t+i/14,4200+((i*5)%3)*300,3,.035*(1-.4*i/n),.0018,0,.02);
    };
    // строки стукаются: деревянный брусок, ниже по списку тише и ниже
    E.clack=function(t,v,j){
      var a=Math.min(1,v/1600),fq=1500-((j||1)-1)*70;
      click(t,fq*1.6,5,.5*a,.006,(j%2?.12:-.12),.15);
      tone(t,fq,fq*.9,.16*a,.022,(j%2?.12:-.12),'sine',.12,.0008);
    };
    // письмо падает: мультяшный свист вниз
    E.drop=function(t){
      var o=ctx.createOscillator(),gn=g(0);o.type='sine';
      o.frequency.setValueAtTime(2300,t);o.frequency.exponentialRampToValueAtTime(700,t+.16);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.09,t+.02);gn.gain.linearRampToValueAtTime(0,t+.17);
      chain(o,gn);out(gn,0,.3);o.start(t);o.stop(t+.2);
      sweep(t,2400,900,1.5,.12,.02,.15,0,.1);
    };
    // удар: наковальня
    E.slam=function(t,v){
      var s=src(nb,t,.6),lp=f('lowpass',2600,.8),gn=g(0);
      gn.gain.setValueAtTime(1.15,t);gn.gain.setTargetAtTime(0,t+.002,.045);
      chain(s,lp,gn);out(gn,0,.4);
      tone(t,320,110,.95,.07,0,'sine',.12,.001);
      tone(t,210,190,.5,.12,0,'triangle',.1,.001);
      clang(t+.002,392,.22,.16,0);
      click(t,1200,1,.6,.008,0,.3);
    };
    // новая почта: бодрый двойной звоночек
    E.ding=function(t){
      [[0,1568],[.11,2093]].forEach(function(n){
        tone(t+n[0],n[1],null,.17,.11,.2,'sine',.45,.002);
        tone(t+n[0],n[1]*2.01,null,.05,.05,.2,'sine',.4,.002);
        tone(t+n[0],n[1]*3.02,null,.025,.03,.2,'sine',.3,.002);
      });
    };
    // смахнул влево
    E.swipe=function(t){sweep(t,2600,900,1.1,.2,.03,.22,-.3,.2)};
    // в корзину: шорох смятой бумаги и уход
    E.trash=function(t){
      var R2=rng(31);
      for(var i=0;i<16;i++){var q=R2();click(t+q*q*.26,2200+R2()*3800,2.5,.12*(1-q*.6),.0025,-.35+R2()*.2,.08)}
      sweep(t,1800,500,1,.22,.01,.2,-.5,.15);
    };
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
