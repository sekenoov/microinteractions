/* ═════════ звук ═════════
   Набор: каждая волна это выдох в шарик (шум в полосе голоса) и тонкий скрип резины,
   который ползёт вверх вместе с размером. Стирание: короткий свист воздуха из горлышка вниз.
   Перед тем как отпустить: резина скрипит от натяжения. Отпустили: горлышко трещит,
   высота треска идёт от давления в полёте, в конце он захлёбывается и плюётся. Посадка
   глухая и маленькая. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;
    // розовый шум для дыхания: мягче белого
    var pb=ctx.createBuffer(1,sr*2,sr),pd=pb.getChannelData(0),b0=0,b1=0,b2=0,rp=rng(4);
    for(i=0;i<pd.length;i++){var w=rp()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;pd[i]=(b0+b1+b2+w*.1848)*.2}

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
    // скрип резины: треугольник с дрожью высоты через узкую полосу
    function squeak(t,f0,f1,len,gain,pan){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(f0*.035),bp=f('bandpass',f0*2,4),gn=g(0);
      o.type='sawtooth';lfo.frequency.value=9+R()*4;
      o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
      bp.frequency.setValueAtTime(f0*2,t);bp.frequency.exponentialRampToValueAtTime(f1*2,t+len);
      chain(lfo,lg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.04);gn.gain.setValueAtTime(gain,t+len*.75);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,bp,gn);out(gn,pan,.15);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
    }

    // свой вопрос улетает: короткий вздох вверх
    E.send=function(t){sweep(t,700,3200,1.1,.5,.025,.2,.15,.3);tone(t+.03,660,1320,.09,.03,.15,'sine',.3)};
    // пузырь «печатает» появился
    E.blip=function(t){tone(t,420,760,.07,.018,-.3,'sine',.2,.004);click(t,2400,2,.05,.003,-.3,.1)};
    // волна набора: выдох в шарик и скрип натягивающейся резины
    E.puff=function(t,len,L0,L1,i){
      var s=src(pb,t,len+.5),bp=f('bandpass',520+(i||0)*60,.9),lp=f('lowpass',2200,.7),gn=g(0),a=.55+.1*Math.min(L1,8)/8;
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(a,t+.07);
      // выдох чуть пульсирует в такт клавишам
      var am=ctx.createOscillator(),ag=g(.18);am.frequency.value=11;chain(am,ag,gn.gain);am.start(t);am.stop(t+len+.3);
      gn.gain.setValueAtTime(a,t+len-.06);gn.gain.linearRampToValueAtTime(0,t+len+.12);
      chain(s,bp,lp,gn);out(gn,-.2,.12);
      tone(t,120,90,.08,.05,-.2,'sine',0,.02);
      squeak(t+len*.25,330+32*L0,330+32*L1,len*.8,.022+.004*L1,-.1);
    };
    // стирание: воздух свистит из горлышка
    E.leak=function(t,len,L0,L1){
      var s=src(nb,t,len+.4),bp=f('bandpass',3400,2.4),gn=g(0);
      bp.frequency.setValueAtTime(3400,t);bp.frequency.exponentialRampToValueAtTime(1700,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.2,t+.03);gn.gain.setTargetAtTime(0,t+len*.6,len*.25);
      chain(s,bp,gn);out(gn,-.25,.2);
      squeak(t,330+32*L0,330+32*L1,len,.02,-.1);
    };
    // натянуто до предела: резина поскрипывает
    E.strain=function(t,len){
      var o=ctx.createOscillator(),bp=f('bandpass',820,5),gn=g(0),am=ctx.createOscillator(),ag=g(.05);
      o.type='sawtooth';o.frequency.setValueAtTime(58,t);o.frequency.linearRampToValueAtTime(74,t+len);
      am.type='square';am.frequency.value=31;chain(am,ag,gn.gain);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.06,t+len*.6);gn.gain.linearRampToValueAtTime(0,t+len+.02);
      chain(o,bp,gn);out(gn,0,.1);o.start(t);am.start(t);o.stop(t+len+.05);am.stop(t+len+.05);
      squeak(t+len*.2,880,1040,len*.7,.018,.1);
    };
    // узелок отпускает
    E.untie=function(t){click(t,2600,1.5,.32,.004,-.25,.15);tone(t,1350,620,.08,.03,-.25,'sine',.2)};
    // сдувается: треск горлышка, высота от давления, в конце плюётся
    E.rasp=function(t,C){
      var n=C.p.length,D=C.D,fr=new Float32Array(n),gn=new Float32Array(n),cf=new Float32Array(n),hs=new Float32Array(n),R2=rng(17),wob=0;
      for(var i=0;i<n;i++){
        var p=Math.max(0,C.p[i]),v=Math.min(1,(C.v[i]||0)/1400);
        wob+=(R2()-.5)*.55;wob*=.8;
        fr[i]=Math.max(45,(78+300*Math.pow(p,.7))*(1+wob*.3));
        var sp=p<.16?Math.pow(Math.max(0,Math.sin(i*1.37+Math.sin(i*.43)*2)),.6):1;
        gn[i]=Math.min(1,Math.pow(p,.35)*1.25)*sp*(i<n-2?1:0)*(.8+.2*v);
        cf[i]=700+3400*Math.pow(p,.8);
        hs[i]=.32*Math.pow(p,.9)+.05;
      }
      gn[0]=0;
      var o=ctx.createOscillator(),o2=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(1),fl=ctx.createOscillator(),fg=g(0),
          lp=f('lowpass',2000,1.6),bp=f('peaking',1100,1.2),body=g(0),amg=g(.62);
      o.type='sawtooth';o2.type='square';
      o.frequency.setValueCurveAtTime(fr,t,D);
      var fr2=new Float32Array(n);for(i=0;i<n;i++)fr2[i]=fr[i]*.502;o2.frequency.setValueCurveAtTime(fr2,t,D);
      bp.gain.value=8;lp.frequency.setValueCurveAtTime(cf,t,D);
      // хлопанье горлышка: громкость дёргается на 20–30 Гц
      lfo.type='sine';lfo.frequency.setValueAtTime(23,t);lfo.frequency.linearRampToValueAtTime(31,t+D);lg.gain.value=.38;chain(lfo,lg,amg.gain);
      // и высота дрожит
      fl.frequency.value=17;fg.gain.value=22;chain(fl,fg,o.frequency);
      var m2=g(.45);o2.connect(m2);m2.connect(lp);
      body.gain.setValueCurveAtTime(gn,t,D);
      chain(o,lp,bp,amg,body);
      var lev=g(.42);chain(body,lev);out(lev,0,.18);
      // шипение воздуха поверх
      var s=src(nb,t,D+.1),hp=f('bandpass',2600,.8),hg=g(0);
      hg.gain.setValueCurveAtTime(hs,t,D);
      chain(s,hp,hg);out(hg,0,.1);
      [o,o2,lfo,fl].forEach(function(x){x.start(t);x.stop(t+D+.05)});
    };
    // ответ сел на место
    E.land=function(t){
      tone(t,170,70,.32,.045,-.25,'sine',.05,.002);
      click(t,1800,1.2,.14,.004,-.25,.15);
      tone(t+.012,640,470,.06,.03,-.25,'sine',.25,.003);
    };
    // лопнул (живой режим)
    E.pop=function(t){
      var s=src(nb,t,.5),lp=f('lowpass',4200,.7),gn=g(0);
      gn.gain.setValueAtTime(1.1,t);gn.gain.setTargetAtTime(0,t+.002,.035);
      chain(s,lp,gn);out(gn,0,.45);
      tone(t,95,45,.6,.06,0,'sine',.1,.002);
    };
    // клавиатура
    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.32,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.11,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014,.15);click(t,1500,.9,.14,.005,.15)};
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
