/* ═════════ звук ═════════
   Окно появляется мягким щелчком. Later: щелчок трекпада, короткое «не-а» из двух глухих нот,
   с каждым разом на тон выше, и резиновый скрип сжатия. На третьем Later кнопка лопается.
   Install Now: щелчок и сухое подтверждение, кнопка с шорохом стягивается в полосу. Смена
   экрана открывается тёплым аккордом, пропись звучит пером по бумаге, громкость пера идёт
   за его скоростью, и в конце тихий колокольчик. Всё синтезируется, сэмплов нет.
   В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function mix(a,b,t){return a+(b-a)*t}
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={},live=[];
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*3,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-12;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.1;
    chain(master,f('highpass',50,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.8*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.34)}
    verb.buffer=ir;chain(verb,g(.24),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=pan||0;chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function click(t,freq,q,gain,dec,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',freq,q),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.2:send);s.start(t,R()*2);s.stop(t+dec*9+.02);
    }
    function tone(t,f0,f1,gain,dec,pan,send,type){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+Math.max(.02,dec*3));
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.003);gn.gain.setTargetAtTime(0,t+.004,dec);
      chain(o,gn);out(gn,pan,send==null?.25:send);o.start(t);o.stop(t+dec*9+.03);
    }
    function breath(t,f0,f1,gain,len,pan){
      var s=ctx.createBufferSource(),bp=f('bandpass',f0,1.1),gn=g(0);s.buffer=nb;
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+len*.4);gn.gain.setTargetAtTime(0,t+len*.55,len*.25);
      chain(s,bp,gn);out(gn,pan||0,.35);s.start(t,R()*1.5);s.stop(t+len*3+.05);
    }
    function bell(t,f0,gain,pan){
      [[1,1,1.1],[2.76,.28,.45],[5.4,.08,.22],[2,.14,.7]].forEach(function(p){tone(t,f0*p[0],null,gain*p[1],p[2]*.34,pan,.6)});
      click(t,f0*3,3,gain*.3,.003,pan);
    }
    // глухая нота с округлым тембром: синус, вторая гармоника и лёгкий провал высоты
    function thud(t,f0,gain,dec,pan){
      tone(t,f0,f0*.94,gain,dec,pan,.18);
      tone(t,f0*2,f0*1.9,gain*.28,dec*.7,pan,.12);
      tone(t,f0*3,null,gain*.08,dec*.4,pan,.1,'triangle');
    }

    // окно появляется
    E.appear=function(t){click(t,1900,1.4,.18,.004,0,.3);tone(t+.004,1320,null,.05,.05,0,.4)};
    // трекпад: нажатие и отпускание
    E.down=function(t){click(t,2300,1.3,.55,.0028,-.06,.08);tone(t,190,110,.14,.012,-.06,.02)};
    E.up=function(t){click(t,3300,1.8,.38,.002,-.06,.08)};
    // «не-а»: две глухие ноты вниз, каждое следующее нажатие на тон выше и чуть быстрее
    E.nope=function(t,k){
      k=k||0;var b=Math.pow(2,k*2/12),dt=.095-.012*k;
      thud(t,349.2*b,.3,.05,-.08);thud(t+dt,261.6*b,.32,.075,.08);
    };
    // резиновый скрип: кнопку сжимают
    E.squeeze=function(t,k){
      k=k||0;var b=Math.pow(2,k*3/12);
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),ld=g(28*b),bp=f('bandpass',1400*b,2.4),gn=g(0);
      o.type='sawtooth';o.frequency.setValueAtTime(520*b,t);o.frequency.exponentialRampToValueAtTime(980*b,t+.14);
      lfo.frequency.value=34+6*k;lfo.connect(ld);ld.connect(o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.05+.012*k,t+.03);gn.gain.setTargetAtTime(0,t+.1,.035);
      chain(o,bp,gn);out(gn,-.1,.15);o.start(t);lfo.start(t);o.stop(t+.4);lfo.stop(t+.4);
    };
    // Later лопается
    E.pop=function(t){tone(t,380,1700,.32,.018,-.12,.2);click(t,2600,2.2,.42,.0025,-.12,.15);tone(t+.012,2100,null,.05,.03,-.12,.3)};
    // Install Now
    E.ok=function(t){click(t,3300,1.8,.38,.002,0,.08);thud(t+.006,523.3,.14,.04,0);tone(t+.05,1046.5,null,.07,.06,0,.4)};
    // кнопка стягивается в полосу
    E.morph=function(t){breath(t,500,2400,.11,.42,0);tone(t,880,440,.04,.08,0,.2)};
    // смена экрана: тёплый аккорд с медленной атакой
    E.chord=function(t){
      [[146.83,.07],[220,.06],[293.66,.06],[369.99,.045],[440,.04],[659.25,.025],[880,.012]].forEach(function(p,i){
        [-3,3].forEach(function(det,j){
          var o=ctx.createOscillator(),gn=g(0),lp=f('lowpass',1800,.5);o.type=i<2?'triangle':'sine';
          o.frequency.value=p[0];o.detune.value=det;
          gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(p[1],t+.32+i*.03);gn.gain.setTargetAtTime(0,t+.6,.75);
          chain(o,lp,gn);out(gn,(j?.25:-.25)*(i%2?1:-1),.5);o.start(t);o.stop(t+4.5);live.push(o);
        });
      });
    };
    // перо по бумаге: шум в высокой полосе, громкость за скоростью пера, мелкая зернистость
    E.pen=function(t,cv,dur){
      if(!cv)return;
      var s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
      var hp=f('highpass',1800,.7),bp=f('bandpass',3800,1.1),gn=g(0),am=g(1);
      var s2=ctx.createBufferSource();s2.buffer=nb;s2.loop=true;
      var lp2=f('bandpass',900,.8),gn2=g(0);
      var n=cv.length,G=new Float32Array(n),G2=new Float32Array(n);
      for(var i=0;i<n;i++){var v=cv[i];G[i]=.15*Math.pow(v,1.3);G2[i]=.05*Math.pow(v,1.6)}
      gn.gain.setValueCurveAtTime(G,t,dur);gn2.gain.setValueCurveAtTime(G2,t,dur);
      // зерно бумаги: быстрые случайные провалы громкости
      var gr=ctx.createBufferSource(),gb=ctx.createBuffer(1,Math.ceil(sr*(dur+.2)),sr),gd=gb.getChannelData(0),rg=rng(21),hold=0,val=1;
      // значения меняются плавно, без ступенек, иначе ступенька щёлкает
      var from=1,to=1,len=1,pos=0;
      for(var j=0;j<gd.length;j++){if(pos>=len){from=to;to=.5+rg()*.5;len=Math.floor(sr*(.005+rg()*.012));pos=0}gd[j]=mix(from,to,pos/len)-.75;pos++}
      gr.buffer=gb;gr.connect(am.gain);
      chain(s,hp,bp,am,gn);out(gn,0,.12);chain(s2,lp2,gn2);out(gn2,0,.05);
      s.start(t,R()*2);s2.start(t,R()*2);gr.start(t);
      s.stop(t+dur+.1);s2.stop(t+dur+.1);gr.stop(t+dur+.1);
      live.push(s,s2,gr);
    };
    E.done=function(t){bell(t,1568,.07,.1);bell(t+.09,2093,.045,-.1)};

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
