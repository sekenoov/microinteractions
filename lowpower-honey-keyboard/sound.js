/* ═════════ звук ═════════
   Клавиши глухие и вязкие: «тхок», и каждая следующая ниже. Палец отлипает с липким
   треском, нитка рвётся мокрым «плюп». Send вдавливается, пузырь ползёт густым скрипом.
   Телефон гаснет как зажёванная плёнка: всё уходит вниз и обрывается. Тишина, тихий
   двойной тон зарядки, экран просыпается. Потом очередь входящих, всё выше и быстрее,
   и на «wow.» короткий глухой удар.
   В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function mix(a,b,u){return a+(b-a)*u}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={},seed=11,alive=[];
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}
    function keep(n){alive.push(n);if(alive.length>300)alive.splice(0,100);return n}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(.5),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',38,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.1*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.16)}
    verb.buffer=ir;chain(verb,g(.22),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(buf,t,len){var s=keep(ctx.createBufferSource());s.buffer=buf;s.start(t,R()*.8);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(nb,t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.3:send);
    }
    function noiseHit(t,type,freq,q,gain,dec,pan,send){
      var s=src(nb,t,dec*9+.03),fl=f(type,freq,q),gn=g(0);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.002);gn.gain.setTargetAtTime(0,t+.003,dec);
      chain(s,fl,gn);out(gn,pan,send==null?.2:send);
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
    /* липкий треск: редкие щелчки, частота растёт по ходу отлипания, cut обрывает резко */
    function crackle(t,len,r0,r1,f0,f1,gain,env,pan,cut){
      var n=Math.ceil((len+.05)*sr),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0),q=rng(seed++),tt=0;
      while(tt<len){
        var u=tt/len,v=env(u),i0=Math.floor(tt*sr),m=Math.floor(sr*.005),amp=(.5+.5*q())*v;
        for(var j=0;j<m&&i0+j<n;j++)d[i0+j]+=amp*(q()*2-1)*Math.exp(-j/(sr*.0011));
        tt+=1/mix(r0,r1,u)*(.7+q()*.6);
      }
      var s=keep(ctx.createBufferSource());s.buffer=b;
      var bp=f('bandpass',f0,2.2),lp=f('lowpass',3000,.7),gn=g(gain);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      if(cut)gn.gain.setValueAtTime(gain,t+len-.004),gn.gain.linearRampToValueAtTime(0,t+len);
      chain(s,bp,lp,gn);out(gn,pan,.1);s.start(t);s.stop(t+len+.05);
    }
    // тянущийся гул: густой низкий тон, плывёт вверх с натяжением
    function goo(t,len,f0,f1,gain,pan,cut){
      var o=keep(ctx.createOscillator()),lp=f('lowpass',520,4),gn=g(0),vib=ctx.createOscillator(),vg=g(f0*.03);
      o.type='sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
      lp.frequency.setValueAtTime(380,t);lp.frequency.exponentialRampToValueAtTime(900,t+len);
      vib.frequency.value=5.5;chain(vib,vg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+len*.4);gn.gain.setValueAtTime(gain,t+len-.006);
      gn.gain.linearRampToValueAtTime(0,t+len+(cut?0:.08));
      chain(o,lp,gn);out(gn,pan,.08);o.start(t);o.stop(t+len+.15);vib.start(t);vib.stop(t+len+.15);
    }

    E.key=function(t,i,pan){
      var k=(i||0)/8;
      tone(t,mix(190,120,k),mix(110,60,k),.32,mix(.022,.04,k),pan,'sine',.06,.002);
      noiseHit(t,'lowpass',mix(1500,700,k),.8,.22,mix(.006,.012,k),pan,.06);
      click(t,mix(2400,1500,k),1.3,.07,.002,pan,.05);
    };
    E.peel=function(t,len,i,pan){
      var k=(i||0)/9,cut=i===9;
      crackle(t,len,mix(45,30,k),mix(110,70,k),mix(900,600,k),mix(1900,1300,k),.65,function(u){return .3+.7*Math.pow(u,1.2)},pan,cut);
      goo(t,len,mix(95,70,k),mix(150,120,k),mix(.03,.05,k),pan,cut);
    };
    E.drip=function(t,i,pan){
      var k=(i||0)/8,f0=mix(820,560,k);
      tone(t,f0*.55,f0,.22,.018,pan,'sine',.18,.002);
      noiseHit(t,'bandpass',2200,1.6,.08,.004,pan,.12);
    };
    E.press=function(t){tone(t,150,80,.3,.04,.35,'sine',.06,.002);noiseHit(t,'lowpass',600,.8,.2,.012,.35,.05)};
    E.ooze=function(t,len){goo(t,len,62,88,.045,-.1,true);crackle(t,len,20,40,500,800,.3,function(u){return .4+.6*u},-.1,true)};
    // гаснет: всё сползает вниз как плёнка и обрывается щелчком
    E.die=function(t){
      var o=keep(ctx.createOscillator()),lp=f('lowpass',1400,1.2),gn=g(0),len=.08;
      o.type='sawtooth';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(38,t+len);
      lp.frequency.setValueAtTime(1400,t);lp.frequency.exponentialRampToValueAtTime(160,t+len);
      gn.gain.setValueAtTime(.16,t);gn.gain.setValueAtTime(.16,t+len-.005);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,lp,gn);out(gn,0,.05);o.start(t);o.stop(t+len+.02);
      noiseHit(t+len,'lowpass',260,.7,.4,.01,0,0);
      tone(t+len,70,40,.3,.02,0,'sine',0,.001);
    };
    // зарядка: два тихих тона
    E.plug=function(t){
      tone(t,880,0,.07,.09,0,'sine',.4,.006);
      tone(t+.11,1318,0,.06,.12,0,'sine',.45,.006);
    };
    E.wake=function(t){sweep(t,300,1600,.8,.05,.08,.28,0,.3)};
    // входящие очередью: всё выше
    E.recv=function(t,j){
      var up=Math.pow(2,(j||0)*1.5/12),pan=(j%2?.18:-.18);
      tone(t,1046*up,0,.13,.045,pan,'sine',.22,.003);
      tone(t+.06,1568*up,0,.11,.06,pan,'sine',.26,.003);
    };
    E.wow=function(t){
      tone(t,130,52,.5,.05,0,'sine',.08,.002);
      noiseHit(t,'lowpass',420,.8,.32,.02,0,.06);
      tone(t+.02,784,0,.12,.06,0,'sine',.3,.003);
      tone(t+.09,523,0,.1,.09,0,'sine',.35,.003);
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4],ev[5])};
    E.stopAll=function(){var n=ctx.currentTime;alive.forEach(function(x){try{x.stop(n+.02)}catch(e){}});alive=[]};
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
  S.stopAll=function(){if(S.eng)S.eng.stopAll()};

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
