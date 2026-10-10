/* ═════════ звук ═════════
   Запись: Alex тараторит, как перемотанная вперёд кассета (пила через две форманты гласной,
   слоги идут ровно тогда, когда столбик выходит из горлышка), под этим тихо жужжит протяжка
   ленты. Стоп: короткий щелчок записи. Рулетка: храповик с растущей частотой, свист и та же
   речь задом наперёд всё быстрее. Конец ленты щёлкает о пузырь. «nvm» садится тихо.
   Всё синтезируется, в ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // форманты гласных: а, э, и, о, у
  var VOW=[[780,1250,2600],[520,1850,2550],[320,2250,2950],[540,900,2450],[360,820,2350]];

  function Engine(ctx,live){
    var sr=ctx.sampleRate,R=rng(3),E={},alive=[];
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}
    function keep(n){if(live)alive.push(n);return n}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',45,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.5*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.07)}
    verb.buffer=ir;chain(verb,g(.2),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function src(buf,t,len){var s=keep(ctx.createBufferSource());s.buffer=buf;s.start(t,R()*.8);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(nb,t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.3:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att){
      var o=keep(ctx.createOscillator()),gn=g(0);o.type=type||'sine';
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

    E.send=function(t){sweep(t,700,3200,1.1,.5,.025,.2,.15,.3);tone(t+.03,660,1320,.09,.03,.15,'sine',.3)};
    // Alex нажал запись
    E.recon=function(t){tone(t,880,0,.09,.03,-.3,'sine',.2,.004);tone(t+.07,1320,0,.08,.035,-.3,'sine',.2,.004)};
    E.recoff=function(t){tone(t,1320,0,.08,.025,-.3,'sine',.2,.003);tone(t+.06,880,0,.09,.035,-.3,'sine',.2,.003);click(t,2200,2,.12,.003,-.3,.1)};

    // слог: голос ускорен, поэтому высокий. sp > 1: перемотка, ещё выше и короче, rev: интонация наоборот
    E.syl=function(t,dur,a,v,fq,sp,gl,rev){
      sp=sp||1;var k=Math.min(7,sp),pr=Math.pow(k,.75),fr=Math.pow(k,.42),F=VOW[v||0],d=Math.max(.012,dur);
      var f0=410*(fq||1)*pr,glide=1+.18*(gl||0);
      var o=keep(ctx.createOscillator());o.type='sawtooth';
      o.frequency.setValueAtTime(rev?f0*glide:f0,t);o.frequency.linearRampToValueAtTime(rev?f0:f0*glide,t+d);
      var sum=g(1),env=g(0),vol=(rev?.85:1.05)*a/Math.sqrt(Math.max(1,k*.45));
      [[F[0],6,1],[F[1],9,.55],[F[2],10,.22]].forEach(function(p,j){var ft=p[0]*1.32*fr,bp=f('bandpass',ft,p[1]),gg=g(p[2]);bp.frequency.setValueAtTime(ft*(j===1?.72:.82),t);bp.frequency.linearRampToValueAtTime(ft,t+d*.3);chain(o,bp,gg,sum)});
      var at=Math.min(.012,d*.25),rl=Math.min(.03,d*.35);
      env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(vol,t+at);env.gain.setValueAtTime(vol,t+d-rl);env.gain.linearRampToValueAtTime(0,t+d);
      chain(sum,env);out(env,-.18,.1);
      o.start(t);o.stop(t+d+.02);
      // согласная в начале через раз
      if(!rev&&(v+Math.round((fq||1)*10))%2===0)click(t,4200,1.6,.09*a,.006,-.18,.05);
    };
    // протяжка ленты: тихое жужжание моторчика, пока идёт запись
    E.motor=function(t,len){
      var o=keep(ctx.createOscillator()),lp=f('lowpass',900,1),gn=g(0),am=keep(ctx.createOscillator()),ag=g(.012);
      o.type='sawtooth';o.frequency.setValueAtTime(210,t);o.frequency.linearRampToValueAtTime(240,t+len);
      am.type='square';am.frequency.value=46;chain(am,ag,gn.gain);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.03,t+.1);gn.gain.setValueAtTime(.03,t+len-.05);gn.gain.linearRampToValueAtTime(0,t+len+.03);
      chain(o,lp,gn);out(gn,.1,0);o.start(t);am.start(t);o.stop(t+len+.05);am.stop(t+len+.05);
      var s=src(nb,t,len+.1),bp=f('bandpass',1900,3),sg=g(0);
      sg.gain.setValueAtTime(0,t);sg.gain.linearRampToValueAtTime(.022,t+.1);sg.gain.setValueAtTime(.022,t+len-.05);sg.gain.linearRampToValueAtTime(0,t+len+.03);
      chain(s,bp,sg);out(sg,.1,0);
    };
    // рулетка: храповик всё чаще, свист вверх
    E.zip=function(t,len){
      var n=Math.max(2,Math.round(len*200)),rate=new Float32Array(n),wh=new Float32Array(n),gn=new Float32Array(n);
      for(var i=0;i<n;i++){var p=i/(n-1);rate[i]=38+300*Math.pow(p,1.3);wh[i]=260+1700*Math.pow(p,1.4);gn[i]=Math.min(1,.25+.9*p)}
      gn[n-1]=0;
      var s=src(nb,t,len+.1),bp=f('bandpass',3200,1.4),am=g(0),lfo=keep(ctx.createOscillator()),lg=g(.5),dc=ctx.createConstantSource?keep(ctx.createConstantSource()):null,body=g(0);
      lfo.type='square';lfo.frequency.setValueCurveAtTime(rate,t,len);chain(lfo,lg,am.gain);
      if(dc){dc.offset.value=.5;dc.connect(am.gain);dc.start(t);dc.stop(t+len+.05)}
      body.gain.setValueCurveAtTime(gn.map(function(x){return x*.5}),t,len);
      chain(s,bp,am,body);out(body,-.1,.15);
      var o=keep(ctx.createOscillator()),obp=f('bandpass',900,6),og=g(0);o.type='sawtooth';
      o.frequency.setValueCurveAtTime(wh,t,len);obp.frequency.setValueCurveAtTime(wh.map(function(x){return x*1.6}),t,len);
      og.gain.setValueCurveAtTime(gn.map(function(x){return x*.16}),t,len);
      chain(o,obp,og);out(og,-.1,.2);o.start(t);o.stop(t+len+.05);lfo.start(t);lfo.stop(t+len+.05);
      sweep(t,500,4200,1.2,.12,len*.8,len,-.1,.2);
    };
    // конец ленты бьёт в пузырь
    E.clack=function(t){
      click(t,2600,1.1,.75,.006,-.25,.35);
      click(t+.004,5200,2,.4,.003,-.25,.2);
      tone(t,300,120,.4,.045,-.25,'sine',.05,.002);
      tone(t+.002,1900,1500,.07,.03,-.25,'triangle',.3,.002);
      // пузырь дребезжит
      tone(t+.03,330,290,.06,.06,-.25,'sine',.25,.01);
    };
    E.land=function(t){
      tone(t,170,70,.32,.045,-.25,'sine',.05,.002);
      click(t,1800,1.2,.14,.004,-.25,.15);
      tone(t+.012,640,470,.06,.03,-.25,'sine',.25,.003);
    };
    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.32,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.11,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014,.15);click(t,1500,.9,.14,.005,.15)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4],ev[5],ev[6],ev[7],ev[8])};
    E.stopAll=function(){var n=ctx.currentTime;alive.forEach(function(x){try{x.stop(n+.02)}catch(e){}});alive=[]};
    return E;
  }

  var S={ctx:null,eng:null,on:true};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx,true)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  S.play=function(ev,delay){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.005+(delay||0));
  };
  S.stopAll=function(){if(S.eng)S.eng.stopAll()};

  /* запись: события петли кладутся на два круга, берётся второй, чтобы хвосты первого зашли в начало */
  S.renderLoop=async function(events,cycle,from,len){
    var sr=48000,n=Math.round(cycle*sr),L=Math.min(n,Math.round((len||cycle)*sr)),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr*2,sampleRate:sr}),E=Engine(ctx,false);
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
