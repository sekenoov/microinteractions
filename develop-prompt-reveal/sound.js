/* ═════════ звук ═════════
   Звук проявляется так же, как картинка. Пока область в шуме, слышно статику. Когда слово напечатано,
   звук области идёт через фильтр: грубая проявка звучит глухо, как из-за стены, готовая звучит чисто.
   0 маяк: туманный горн, 1 скалы: удары волн о камень, 2 волны: прибой, 3 небо: ветер.
   Панорама как в кадре: маяк и скалы справа, волны левее. Всё синтезируется, сэмплов нет.
   В ?rec живого звука нет: сцена пишет состояние по кадрам, а дорожка потом считается офлайн. */
var Sound=(function(){
  var VOL=[1,.9,1,.75],PAN=[.38,.28,-.22,0],SEND=[.55,.25,.22,.15];

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(11),E={};
    function noise(sec,kind,seed){
      var n=Math.floor(sec*sr),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0),r=rng(seed);
      var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,br=0;
      for(var i=0;i<n;i++){
        var w=r()*2-1;
        if(kind==='white')d[i]=w*.5;
        else if(kind==='pink'){
          b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;
          b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;
        }else{br=(br+.02*w)/1.02;d[i]=br*3.2}
      }
      // сшиваем край петли, чтобы не щёлкало
      for(var k=0;k<2048;k++){var a=k/2048;d[k]=d[k]*a+d[n-2048+k]*(1-a)}
      return b;
    }
    var WH=noise(6.1,'white',1),PK=noise(7.3,'pink',2),BR=noise(8.7,'brown',3);
    function loop(buf,off){var s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.start(0,off||0);return s}
    function one(buf,t,off,dur){var s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.start(t,off);s.stop(t+dur);return s}
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function pan(v){var p=ctx.createStereoPanner();p.pan.value=v;return p}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    // общий выход
    var master=g(.9),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-16;comp.ratio.value=3;comp.attack.value=.01;comp.release.value=.3;
    // ниже 55 Гц только гул, телефон его не сыграет, а в наушниках он давит
    chain(master,f('highpass',55,.7),f('highpass',55,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(2.8*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var i=0;i<d.length;i++)d[i]=(rr()*2-1)*Math.exp(-i/sr/.62)}
    verb.buffer=ir;chain(verb,g(.32),master);

    // шины областей: вход, фильтр ясности, громкость
    var bus=[0,1,2,3].map(function(i){
      var o={in:g(1),lp:f('lowpass',200,.5),out:g(0),p:pan(PAN[i])};
      chain(o.in,o.lp,o.out,o.p,master);
      var s=g(SEND[i]);o.p.connect(s);s.connect(verb);
      return o;
    });

    // статика: белый и розовый шум, чуть окрашенный
    var stat=g(0);
    chain(loop(WH,0),f('highpass',260,.7),stat);
    chain(loop(PK,1.3),g(.6),stat);
    stat.connect(master);

    // волны: постоянный гул прибоя, накаты добавляются отдельно
    chain(loop(BR,0),f('highpass',90,.6),f('lowpass',560,.6),g(.3),bus[2].in);
    chain(loop(PK,3.1),f('bandpass',1100,.45),g(.32),bus[2].in);
    // скалы: низкий рокот под ударами
    chain(loop(BR,4.2),f('highpass',70,.7),f('lowpass',180,.8),g(.2),bus[1].in);
    // небо: два полосовых ветра по краям, медленно гуляют
    [[-.55,.061,700,340,2.2],[.55,.083,1150,420,4.9]].forEach(function(w){
      var bp=f('bandpass',w[2],1.5),lfo=ctx.createOscillator(),dep=g(w[3]),amp=g(.5),alfo=ctx.createOscillator(),adep=g(.28);
      lfo.frequency.value=w[1];chain(lfo,dep,bp.frequency);lfo.start(0);
      alfo.frequency.value=w[1]*1.37;chain(alfo,adep,amp.gain);alfo.start(0);
      chain(loop(PK,w[4]),bp,amp,pan(w[0]),bus[3].in);
    });
    // гул генерации
    var riseG=g(0),riseF=f('bandpass',300,3);chain(loop(PK,5.5),riseF,riseG,master);

    function at(p,v,t,tau){p.setTargetAtTime(v,t,tau||.04)}

    /* накат: волна поднимается, бьёт, пена шипит и откатывается */
    E.crash=function(t,fast){
      var a=fast?.35:1.05,pk=t+a,p=pan((R()-.5)*.7-.15);p.connect(bus[2].in);
      var s=one(PK,t,R()*6,7),lp=f('lowpass',260,.7),gn=g(0);
      lp.frequency.setValueAtTime(260,t);lp.frequency.exponentialRampToValueAtTime(3200,pk);lp.frequency.exponentialRampToValueAtTime(420,pk+4.5);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(1.1,pk);gn.gain.setTargetAtTime(0,pk+.15,1.25);
      chain(s,lp,gn,p);
      var fo=one(WH,pk-.1,R()*5,5),bp=f('bandpass',3200,.45),fg=g(0);
      fg.gain.setValueAtTime(0,pk-.1);fg.gain.linearRampToValueAtTime(.85,pk+.35);fg.gain.setTargetAtTime(0,pk+.5,1.05);
      chain(fo,bp,fg,p);
      E.boom(pk+.04,.7+R()*.3);
    };
    /* удар о камень */
    E.boom=function(t,v){
      v=v||1;
      var o=ctx.createOscillator(),og=g(0);o.type='sine';
      o.frequency.setValueAtTime(96,t);o.frequency.exponentialRampToValueAtTime(52,t+.6);
      og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.55*v,t+.02);og.gain.setTargetAtTime(0,t+.05,.32);
      chain(o,og,bus[1].in);o.start(t);o.stop(t+2.5);
      var n=one(PK,t,R()*7,2.5),lp=f('lowpass',420,.9),ng=g(0);
      ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(1.2*v,t+.03);ng.gain.setTargetAtTime(0,t+.06,.45);
      chain(n,lp,ng,bus[1].in);
    };
    /* туманный горн: низкий тон с обертонами, в конце характерное проседание */
    E.horn=function(t){
      var lp=f('lowpass',380,2.4),hg=g(0),end=t+2;
      lp.frequency.setValueAtTime(380,t);lp.frequency.linearRampToValueAtTime(980,t+.3);lp.frequency.setTargetAtTime(520,end-.2,.25);
      hg.gain.setValueAtTime(0,t);hg.gain.linearRampToValueAtTime(.34,t+.22);hg.gain.setValueAtTime(.34,end-.25);hg.gain.setTargetAtTime(0,end,.28);
      chain(lp,hg,bus[0].in);
      [[1,'sawtooth',1],[1.004,'sawtooth',.8],[.5,'sine',1.4],[1.5,'square',.14]].forEach(function(v){
        var o=ctx.createOscillator(),og=g(v[2]*.33);o.type=v[1];
        o.frequency.setValueAtTime(74*v[0],t);o.frequency.exponentialRampToValueAtTime(86*v[0],t+.28);
        o.frequency.setValueAtTime(86*v[0],end-.3);o.frequency.exponentialRampToValueAtTime(68*v[0],end+.25);
        chain(o,og,lp);o.start(t);o.stop(end+1.6);
      });
    };
    /* порыв ветра */
    E.gust=function(t){
      var s=one(PK,t,R()*6,4),bp=f('bandpass',500,2),gn=g(0);
      bp.frequency.setValueAtTime(500,t);bp.frequency.exponentialRampToValueAtTime(1500,t+1.2);bp.frequency.exponentialRampToValueAtTime(600,t+3.4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(1.6,t+1);gn.gain.setTargetAtTime(0,t+1.3,.7);
      chain(s,bp,gn,bus[3].in);
    };
    E.accent=function(r,t){if(r===0)E.horn(t);else if(r===1)E.boom(t,1.2);else if(r===2)E.crash(t,true);else E.gust(t)};

    /* интерфейс: клавиши, шаги, тап */
    E.key=function(t,del){
      var s=one(WH,t,R()*5,.05),bp=f('bandpass',(del?1700:2600)+R()*1300,1.1),gn=g(0);s.playbackRate.value=.8+R()*.4;
      gn.gain.setValueAtTime(del?.26:.34,t);gn.gain.setTargetAtTime(0,t+.004,.009);
      chain(s,bp,gn,master);
      var o=ctx.createOscillator(),og=g(0);o.frequency.value=del?190:240+R()*40;
      og.gain.setValueAtTime(.1,t);og.gain.setTargetAtTime(0,t+.003,.012);chain(o,og,master);o.start(t);o.stop(t+.08);
    };
    E.step=function(t,i){
      var o=ctx.createOscillator(),og=g(0);o.type='sine';o.frequency.value=620*Math.pow(2,i/30*1.1);
      og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.045,t+.003);og.gain.setTargetAtTime(0,t+.006,.02);
      chain(o,og,master);o.start(t);o.stop(t+.15);
    };
    E.tap=function(t){
      E.key(t);
      var o=ctx.createOscillator(),og=g(0);o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(900,t+.03);
      og.gain.setValueAtTime(.05,t);og.gain.setTargetAtTime(0,t+.005,.015);chain(o,og,master);o.start(t);o.stop(t+.1);
    };
    E.rise=function(t,dur){
      riseF.frequency.cancelScheduledValues(t);riseG.gain.cancelScheduledValues(t);
      riseF.frequency.setValueAtTime(260,t);riseF.frequency.exponentialRampToValueAtTime(5200,t+dur);
      riseG.gain.setValueAtTime(0,t);riseG.gain.linearRampToValueAtTime(.16,t+dur*.8);riseG.gain.setTargetAtTime(0,t+dur,.12);
    };
    E.trigger=function(type,arg,t){
      if(type==='key')E.key(t,false);else if(type==='del')E.key(t,true);
      else if(type==='step')E.step(t,arg);else if(type==='tap')E.tap(t);
      else if(type==='accent')E.accent(arg,t);else if(type==='rise')E.rise(t,arg);
    };

    /* состояние кадра: ясность и громкость шин, уровень статики */
    E.apply=function(st,t){
      var sl=0;
      for(var i=0;i<4;i++){
        var c=st.R[i],foc=1-st.FA*(1-st.F[i])*.93,sm=Math.min(1,c/.3);sm=sm*sm*(3-2*sm);
        // грубая проявка звучит не только глуше, но и дальше
        at(bus[i].out.gain,VOL[i]*sm*(.3+.7*c)*foc,t);
        at(bus[i].lp.frequency,Math.min(19000,210*Math.pow(2,c*6.6)),t);
        sl+=st.cover[i]*(1-Math.min(1,c/.95));
      }
      at(stat.gain,.3*Math.pow(clamp01(sl),1.25)*(1-st.FA*.8),t,.06);
    };
    function clamp01(x){return x<0?0:x>1?1:x}

    /* накаты по расписанию: живой режим добавляет их по ходу, офлайн расставляет сразу */
    var next=.6;
    function gap(){return 4.3+R()*1.9}
    E.schedule=function(until){while(next<until){E.crash(next);next+=gap()}};
    E.hold=function(t){next=Math.max(next,t+4.6)};
    E.nextT=function(){return next};
    return E;
  }

  /* ─────────── живой режим ─────────── */
  var S={ctx:null,eng:null,on:true,log:null,ev:null};
  S.start=function(){
    if(S.ctx||!S.on)return;
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx);
    }catch(e){S.ctx=null}
  };
  S.setOn=function(v){
    S.on=v;
    if(v){if(!S.ctx)S.start();else S.ctx.resume()}
    else if(S.ctx)S.ctx.suspend();
  };
  S.update=function(st){
    if(S.log){S.log.push([performance.now()/1000,st.R.slice(),st.F.slice(),st.FA]);return}
    if(!S.ctx||S.ctx.state!=='running')return;
    var t=S.ctx.currentTime;S.eng.apply(st,t);S.eng.schedule(t+1.2);
  };
  S.ev=function(type,arg){
    if(S.log){S.evs.push([performance.now()/1000,type,arg]);return}
    if(!S.ctx||S.ctx.state!=='running')return;
    var t=S.ctx.currentTime+.005;
    if(type==='accent'&&arg===2)S.eng.hold(t);
    S.eng.trigger(type,arg,t);
  };

  /* ─────────── запись: лог по кадрам и офлайн-рендер ─────────── */
  S.record=function(){S.log=[];S.evs=[]};
  S.render=async function(cover){
    var log=S.log,evs=S.evs,dur=log[log.length-1][0]+.6,sr=48000;
    var ctx=new OfflineAudioContext({numberOfChannels:2,length:Math.ceil(dur*sr),sampleRate:sr}),E=Engine(ctx);
    log.forEach(function(r){E.apply({R:r[1],F:r[2],FA:r[3],cover:cover},r[0])});
    // накаты: вынужденный накат на тапе по волнам сдвигает следующий, как в живом режиме
    var forced=evs.filter(function(e){return e[1]==='accent'&&e[2]===2}).map(function(e){return e[0]});
    var fi=0;
    for(var guard=0;guard<99;guard++){
      while(fi<forced.length&&forced[fi]<=E.nextT()){E.hold(forced[fi]);fi++}
      if(E.nextT()>=dur)break;E.schedule(E.nextT()+.001);
    }
    evs.forEach(function(e){E.trigger(e[1],e[2],e[0])});
    var buf=await ctx.startRendering();
    return wav(buf);
  };
  function wav(buf){
    var ch=[buf.getChannelData(0),buf.getChannelData(1)],n=ch[0].length,bytes=new Uint8Array(44+n*4),v=new DataView(bytes.buffer);
    function s(o,t){for(var i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))}
    s(0,'RIFF');v.setUint32(4,36+n*4,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);
    v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n*4,true);
    for(var i=0,o=44;i<n;i++)for(var c=0;c<2;c++,o+=2)v.setInt16(o,Math.max(-1,Math.min(1,ch[c][i]))*32767,true);
    var str='';for(var k=0;k<bytes.length;k+=32768)str+=String.fromCharCode.apply(null,bytes.subarray(k,k+32768));
    return btoa(str);
  }
  return S;
})();
