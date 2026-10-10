/* ═════════ звук ═════════
   Только механика: нажатие, барабан раскрылся, щелчок на каждой строке, барабан закрылся.
   Когда хвост ответа перекатывается, каждое слово встаёт на место тихим щелчком, поэтому
   волна звучит как быстрая дробь барабана, к концу чуть выше. Всё синтезируется, сэмплов нет.
   В ?rec живого звука нет: дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-12;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.1;
    chain(master,f('highpass',90,.7),comp,ctx.destination);
    // маленькая комната, чтобы щелчки не были сухими
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.4*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.06)}
    verb.buffer=ir;chain(verb,g(.2),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=pan||0;chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    // шумовой щелчок через резонансный фильтр
    function click(t,freq,q,gain,dec,pan){
      var s=ctx.createBufferSource(),bp=f('bandpass',freq,q),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,.45);s.start(t,R()*.8);s.stop(t+dec*9+.02);
    }
    function tone(t,f0,f1,gain,dec,pan){
      var o=ctx.createOscillator(),gn=g(0);o.type='sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.0015);gn.gain.setTargetAtTime(0,t+.0025,dec);
      chain(o,gn);out(gn,pan,.25);o.start(t);o.stop(t+dec*9+.02);
    }
    function breath(t,f0,f1,gain,len){
      var s=ctx.createBufferSource(),bp=f('bandpass',f0,1.3),gn=g(0);s.buffer=nb;
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+len*.4);gn.gain.setTargetAtTime(0,t+len*.55,len*.3);
      chain(s,bp,gn);out(gn,0,.4);s.start(t,R()*.5);s.stop(t+len*3+.05);
    }

    E.press=function(t){tone(t,210,120,.24,.018);click(t,1300,.9,.16,.005)};
    E.open=function(t){breath(t,650,2400,.12,.13)};
    E.tick=function(t){click(t,3000,7,.9,.0045);tone(t,1750,null,.16,.009);tone(t,3400,null,.05,.005)};
    E.release=function(t){click(t,2100,4,.35,.004)};
    E.close=function(t){breath(t,2300,800,.08,.1)};
    // слово встало на место: тихий щелчок, к концу волны выше и правее
    E.land=function(t,i,n){
      var k=n>1?i/(n-1):1,last=i===n-1;
      click(t,1900+1500*k+R()*260,5,last?.62:.28+.1*R(),last?.006:.0032,(k-.5)*.5);
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
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
