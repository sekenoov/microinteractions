/* ═════════ звук ═════════
   Набор и delete щёлкают клавишами, отправка свистит, входящие «блуп».
   Аватарка перед падением дрожит, отрывается пробкой «поп», падает со свистком вниз
   и глухо бонкает о поле ввода и о соседей. В четверг запрыгивает обратно: свисток вверх
   и мягкий «плоп» в шапке. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

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
    // короткая комната: удары звучат как в зале, а не в вакууме
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.6*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.09)}
    verb.buffer=ir;chain(verb,g(.22),master);

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

    E.key=function(t,i,k){
      k=(k==null?1:k)*.7;
      click(t,1600+((i*37)%5)*120,1.4,.3*k,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.1*k,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.16,.014,.15);click(t,1500,.9,.12,.005,.15)};
    E.send=function(t){sweep(t,700,3200,1.1,.42,.025,.2,.15,.3);tone(t+.03,660,1320,.08,.03,.15,'sine',.3)};
    E.del=function(t,i){
      click(t,1100+((i*29)%4)*90,1.2,.22,.004,.05,.05);
      tone(t,240+((i*41)%3)*14,140,.08,.006,.05,'sine',.03);
    };
    // дрожь перед падением: мелкое дребезжание
    E.shiver=function(t,pan){for(var k=0;k<6;k++)click(t+k*.032,2600+k*120,3,.05+.012*k,.003,pan,.1)};
    // отрыв: пробка
    E.pop=function(t,pan){
      tone(t,420,1150,.3,.012,pan,'sine',.18,.001);
      click(t,3200,1.4,.28,.0025,pan,.25);
    };
    // свисток вниз на всё время падения
    E.down=function(t,pan,len){
      len=Math.max(.18,len||.4);
      var o=keep(ctx.createOscillator()),v=keep(ctx.createOscillator()),vg=g(18),gn=g(0);
      o.type='sine';o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(380,t+len);
      v.frequency.value=7;chain(v,vg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.085,t+.03);gn.gain.setValueAtTime(.085,t+len-.04);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,gn);out(gn,pan,.25);o.start(t);v.start(t);o.stop(t+len+.02);v.stop(t+len+.02);
      sweep(t,1800,500,2.5,.03,.03,len,pan,.2);
    };
    E.up=function(t,pan,len){
      len=Math.max(.18,(len||.45)*.8);
      var o=keep(ctx.createOscillator()),gn=g(0);
      o.type='sine';o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(1500,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.06,t+.04);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(o,gn);out(gn,pan,.25);o.start(t);o.stop(t+len+.02);
    };
    // толчок от пола
    E.hop=function(t,pan){tone(t,160,90,.22,.02,pan,'sine',.06,.002);click(t,900,1,.1,.006,pan,.1)};
    // сел в шапку
    E.plop=function(t,pan){tone(t,620,980,.2,.016,pan,'sine',.2,.001);tone(t+.012,1250,1600,.06,.012,pan,'sine',.3,.001)};
    // удар о поле ввода или о соседа: резиновый мячик
    E.bonk=function(t,pan,k){
      k=k==null?1:k;
      tone(t,210+60*k,120,.42*k,.028,pan,'sine',.08,.0015);
      tone(t,520+90*k,380,.16*k,.016,pan,'triangle',.12,.001);
      var s=src(nb,t,.1),lp=f('lowpass',1300,.8),gn=g(0);
      gn.gain.setValueAtTime(.22*k,t);gn.gain.setTargetAtTime(0,t+.002,.01);chain(s,lp,gn);out(gn,pan,.1);
    };
    E.recv=function(t,pan){
      pan=pan==null?-.25:pan;
      tone(t,170,70,.3,.045,pan,'sine',.05,.002);
      click(t,1800,1.2,.12,.004,pan,.15);
      tone(t+.01,880,620,.07,.035,pan,'sine',.3,.003);
      tone(t+.085,740,520,.06,.04,pan,'sine',.3,.003);
    };
    // индикатор набора у Alex: еле слышный пузырёк
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4],ev[5])};
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
    S.eng.trigger(ev,S.ctx.currentTime+.005+Math.max(0,delay||0));
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
