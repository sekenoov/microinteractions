/* ═════════ звук ═════════
   Клавиши и отправка как в переписке. Сгиб: бумага шуршит, пока отворот летит, потрескивает
   на отрыве и щёлкает, когда сгиб прижали. Записка с каждым сгибом меньше, поэтому звучит
   выше. На «idk» короткое «ой» вниз. Новая записка приходит щелчком, раскрывается четырьмя
   взмахами, на последнем уверенное «динь».
   Всё синтезируется, в ?rec дорожка петли считается офлайн. */
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
    // треск бумаги: редкие щелчки разной силы с коротким хвостом
    var cb=ctx.createBuffer(1,sr*2,sr),cd=cb.getChannelData(0),r2=rng(17),env=0,sg=1;
    for(i=0;i<cd.length;i++){
      if(r2()<.0016){env=Math.pow(r2(),2.2);sg=r2()<.5?-1:1}
      env*=.93;cd[i]=sg*env*(r2()*.6+.4)+(r2()*2-1)*.02;
    }

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',60,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.45*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.06)}
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
    // треск с огибающей: точки [доля, громкость]
    function crackle(t,len,pts,freq,gain,pan){
      var s=src(cb,t,len+.05),hp=f('highpass',freq,.7),pk=f('peaking',freq*1.8,1.2),gn=g(0);pk.gain.value=5;
      gn.gain.setValueAtTime(0,t);pts.forEach(function(p){gn.gain.linearRampToValueAtTime(p[1]*gain,t+p[0]*len)});
      chain(s,hp,pk,gn);out(gn,pan,.15);
    }

    E.key=function(t,i){
      click(t,1600+((i*37)%5)*120,1.4,.32,.0042,.05,.06);
      tone(t,320+((i*53)%4)*18,170,.11,.007,.05,'sine',.03);
    };
    E.press=function(t){tone(t,240,130,.18,.014,.15);click(t,1500,.9,.14,.005,.15)};
    E.send=function(t){sweep(t,700,3200,1.1,.5,.025,.2,.15,.3);tone(t+.03,660,1320,.09,.03,.15,'sine',.3)};

    // отворот летит: шорох по скорости, треск на отрыве и на подлёте; k номер сгиба, чем меньше записка, тем выше
    E.fold=function(t,dur,k){
      var hk=1+.16*(k||0),pan=-.2;
      var s=src(nb,t,dur+.2),bp=f('bandpass',1400*hk,1.3),gn=g(0);
      bp.frequency.setValueAtTime(1300*hk,t);bp.frequency.linearRampToValueAtTime(3200*hk,t+dur*.45);bp.frequency.linearRampToValueAtTime(2000*hk,t+dur*.85);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.06,t+dur*.12);gn.gain.linearRampToValueAtTime(.2,t+dur*.45);
      gn.gain.linearRampToValueAtTime(.1,t+dur*.75);gn.gain.linearRampToValueAtTime(0,t+dur*.9);
      chain(s,bp,gn);out(gn,pan,.25);
      crackle(t,dur*.9,[[0,0],[.04,1],[.16,.3],[.5,.18],[.72,.6],[.86,.25],[1,0]],2400*hk,.75,pan);
    };
    // сгиб прижали: хлопок бумаги о бумагу и сухой щелчок
    E.crease=function(t,k){
      var hk=1+.16*(k||0),pan=-.2;
      click(t,2300*hk,1,.75,.006,pan,.3);
      click(t+.002,5600*hk,1.6,.32,.0025,pan,.2);
      tone(t,420*hk,240*hk,.2,.022,pan,'sine',.08,.002);
      crackle(t,.07,[[0,1],[.4,.35],[1,0]],2600*hk,.6,pan);
    };
    E.idk=function(t){tone(t,784,740,.07,.05,-.2,'triangle',.25,.006);tone(t+.13,587,520,.08,.08,-.2,'triangle',.3,.006)};
    // новая записка прилетела
    E.pop=function(t){tone(t,520,860,.12,.018,-.2,'sine',.2,.004);click(t,2800,1.2,.18,.004,-.2,.15)};
    // взмах при раскрытии
    E.unfold=function(t,dur,j){
      var hk=1.5-.14*(j||0),pan=-.2;
      sweep(t,2600*hk,1100*hk,1,.26,dur*.3,dur*.8,pan,.2);
      crackle(t,dur,[[0,.8],[.2,.15],[.85,.3],[1,0]],2400*hk,.4,pan);
      click(t+dur*.92,2000*hk,1.1,.3,.004,pan,.2);
    };
    E.ding=function(t){tone(t,1046.5,0,.07,.12,-.1,'sine',.45,.003);tone(t+.07,1568,0,.06,.16,-.1,'sine',.5,.003)};

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
