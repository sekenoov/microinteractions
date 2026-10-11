/* ═════════ звук ═════════
   Магнит гудит электрическим «ззз», громче и выше, чем сильнее тянет. Курсор упирается
   резиновым скрипом. Почти дотянулся до Back: тихий щелчок наведения. Срыв: свист и
   глухое магнитное «клац». Клик трекпада, серия на перемотке бурчит ускоренными голосами,
   часы трещат барабаном. На «Are you okay?» клавиши и тихое «хм?».
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
    chain(master,f('highpass',40,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.2*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.22)}
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
    function curve(arr,scale,add){var a=new Float32Array(arr.length);for(var i=0;i<arr.length;i++)a[i]=arr[i]*scale+(add||0);return a}

    // магнит: электрический гул из пилы через фильтр, плюс вибрато; скрип резины по напряжению
    function humVoice(dest){
      var o=ctx.createOscillator(),o2=ctx.createOscillator(),lp=f('lowpass',900,1.2),gn=g(0),lfo=ctx.createOscillator(),lg=g(0);
      o.type='sawtooth';o2.type='sawtooth';o.frequency.value=100;o2.frequency.value=100.7;
      var trem=g(1);lfo.frequency.value=9;lg.gain.value=.25;chain(lfo,lg,trem.gain);
      o.connect(lp);o2.connect(lp);chain(lp,gn,trem);out(trem,0,.08,dest);
      var cr=ctx.createOscillator(),cb=f('bandpass',1500,6),cg=g(0),jit=ctx.createOscillator(),jg=g(18);
      cr.type='sawtooth';cr.frequency.value=72;jit.type='square';jit.frequency.value=13;chain(jit,jg,cr.frequency);
      chain(cr,cb,cg);out(cg,.1,.1,dest);
      return {o:o,o2:o2,lp:lp,gn:gn,lfo:lfo,cr:cr,cg:cg,jit:jit,start:function(t){[o,o2,lfo,cr,jit].forEach(function(x){x.start(t)})},stop:function(t){[o,o2,lfo,cr,jit].forEach(function(x){x.stop(t)})}};
    }
    E.hum=function(t,o){
      var v=humVoice(),len=o.g.length/o.hz;
      v.gn.gain.setValueCurveAtTime(curve(o.g.map(function(x){return x*x}),.16),t,len);
      v.o.frequency.setValueCurveAtTime(curve(o.g,55,95),t,len);
      v.o2.frequency.setValueCurveAtTime(curve(o.g,55,95.8),t,len);
      v.lp.frequency.setValueCurveAtTime(curve(o.g,1300,500),t,len);
      v.cg.gain.setValueCurveAtTime(curve(o.tr,.1),t,len);
      v.start(t);v.stop(t+len+.05);
    };
    E.appear=function(t,k){tone(t,880,700,.05,.03,0,'sine',.2);click(t,2600,1.5,.04,.003,0,.1)};
    E.hover=function(t){click(t,3800,2,.12,.002,.4,.1);tone(t,1750,null,.035,.02,.4,'sine',.1)};
    // срыв: свист и магнитное клац
    E.snap=function(t,k){
      var imp=k?.083:.089;
      sweep(t,700,2800,1.3,.34,.01,.1,.2,.12);
      tone(t+imp,190,58,.55,.05,-.2,'sine',.05);tone(t+imp,420,160,.22,.03,-.2,'triangle',.06);
      click(t+imp,1600,1.2,.45,.006,-.2,.15);
      tone(t+imp,2350,null,.07,.05,-.2,'sine',.25);tone(t+imp,3410,null,.04,.035,-.2,'sine',.25);
    };
    E.click=function(t){click(t,2100,1.3,.32,.004,0,.08);tone(t,330,200,.12,.012,0,'sine',0);click(t+.085,2600,1.4,.16,.003,0,.06)};
    // серия на перемотке: ускоренные голоса и шум
    E.ff=function(t,len){
      var o=ctx.createOscillator(),bp=f('bandpass',1400,2.2),gn=g(0),RR=rng(Math.floor(t*100)+7);o.type='sawtooth';
      for(var s=0;s<len;s+=.028)o.frequency.setValueAtTime(380+RR()*900,t+s);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.09,t+.08);gn.gain.setValueAtTime(.09,t+len-.15);gn.gain.linearRampToValueAtTime(0,t+len);
      var am=ctx.createOscillator(),ag=g(.05);am.type='square';am.frequency.value=17;chain(am,ag,gn.gain);
      chain(o,bp,gn);out(gn,0,.15);o.start(t);am.start(t);o.stop(t+len+.05);am.stop(t+len+.05);
      var s2=src(t,len+.1),b2=f('bandpass',600,.8),g2=g(0);b2.frequency.setValueAtTime(600,t);b2.frequency.exponentialRampToValueAtTime(3200,t+len);
      g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.07,t+.1);g2.gain.linearRampToValueAtTime(0,t+len);chain(s2,b2,g2);out(g2,0,.1);
    };
    // барабан часов: тики замедляются
    E.roll=function(t){var n=13;for(var i=0;i<n;i++){var u=i/(n-1),dt=.55*(1-Math.pow(1-u,1.8));click(t+dt,3600-800*u,2.5,.11*(1-.4*u),.0016,.55,.06)}tone(t+.58,1320,null,.04,.04,.55,'sine',.2)};
    E.twitch=function(t){var o=ctx.createOscillator(),bp=f('bandpass',1500,6),gn=g(0);o.type='sawtooth';o.frequency.setValueAtTime(80,t);o.frequency.linearRampToValueAtTime(60,t+.2);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.08,t+.06);gn.gain.linearRampToValueAtTime(0,t+.24);chain(o,bp,gn);out(gn,.1,.1);o.start(t);o.stop(t+.3)};
    E.bs=function(t,i){click(t,2900+(i%3)*140,2,.07,.0018,.15,.05)};
    E.key=function(t,i){click(t,1900+(i%2)*180,1.6,.16,.003,.15,.06);tone(t,240,170,.05,.01,.15,'sine',0)};
    // «хм?»: носовой гул, тон вверх в конце
    E.hm=function(t){
      var o=ctx.createOscillator(),lp=f('lowpass',420,.9),f1=f('peaking',260,4),gn=g(0);o.type='sawtooth';f1.gain.value=10;
      o.frequency.setValueAtTime(128,t);o.frequency.linearRampToValueAtTime(118,t+.18);o.frequency.exponentialRampToValueAtTime(168,t+.42);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.12,t+.05);gn.gain.setValueAtTime(.11,t+.34);gn.gain.linearRampToValueAtTime(0,t+.48);
      chain(o,lp,f1,gn);out(gn,0,.12);o.start(t);o.stop(t+.5);
      var s=src(t-.04,.12),hp=f('bandpass',1200,.7),hg=g(0);hg.gain.setValueAtTime(0,t-.04);hg.gain.linearRampToValueAtTime(.05,t);hg.gain.linearRampToValueAtTime(0,t+.05);chain(s,hp,hg);out(hg,0,.05);
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
    E.liveVoice=function(){var v=humVoice();v.start(ctx.currentTime);return v};
    return E;
  }

  var S={ctx:null,eng:null,on:true,live:null};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  S.play=function(ev,delay){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.06+(delay&&delay<.05?0:0));
  };
  // живой режим: один постоянный гул, громкость по силе магнита
  S.liveHum=function(gv,tr){
    if(!S.ctx||S.ctx.state!=='running')return;
    if(!S.live)S.live=S.eng.liveVoice();
    var t=S.ctx.currentTime,v=S.live;
    v.gn.gain.setTargetAtTime(.16*gv*gv,t,.05);v.o.frequency.setTargetAtTime(95+55*gv,t,.05);v.o2.frequency.setTargetAtTime(95.8+55*gv,t,.05);
    v.lp.frequency.setTargetAtTime(500+1300*gv,t,.05);v.cg.gain.setTargetAtTime(.1*tr,t,.05);
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
