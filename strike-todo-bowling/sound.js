/* ═════════ звук ═════════
   Строки встают кеглями по одной: деревянные ноты вверх по пентатонике, каждая садится «ток».
   Курсор берёт шар, оттягивает резинкой, отпускает со свистом, шар катится гулом.
   Страйк: удар и россыпь деревянного треска, счётчик щёлкает выше с каждой отмеченной.
   «do taxes» качается со стуком. Второй шар гудит, сваливается в жёлоб, глухо катится по нему,
   и тихое грустное «вомп-вомп». В конце список шуршит обратно, «do taxes» ложится под Tomorrow.
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
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.6*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.3)}
    verb.buffer=ir;chain(verb,g(.22),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.2:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att,glide){
      var o=ctx.createOscillator(),gn=g(0),a=att||.0015;o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||dec*4));
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+a);gn.gain.setTargetAtTime(0,t+a+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.15:send);o.start(t);o.stop(t+a+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=src(t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.25:send);
    }

    var NOTES=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1568,1760];
    // строка встаёт: деревянная нота, выше с каждой
    E.hop=function(t,i){var fr=NOTES[i%10];tone(t,fr,null,.16,.07,(i%3-1)*.3,'triangle',.18,.003);tone(t,fr*2,null,.05,.03,(i%3-1)*.3,'sine',.15,.002);sweep(t,900,2600,1.2,.03,.02,.1,0,.05)};
    // садится на место
    E.land=function(t,i){click(t,1500+(i%4)*120,3,.45,.008,(i%3-1)*.3,.08);tone(t,520,380,.08,.02,(i%3-1)*.3,'sine',.05)};
    E.ballin=function(t){tone(t,330,620,.14,.03,.3,'sine',.1,.004,.06);click(t,2200,2,.1,.003,.3,.05)};
    E.grab=function(t){click(t,2600,1.6,.48,.0022,.35,.05);tone(t,1200,700,.07,.006,.35,'sine',0)};
    // оттянул: резинка тянется
    E.pull=function(t){tone(t,240,170,.07,.12,.3,'triangle',.05,.06,.3);sweep(t,500,300,4,.04,.12,.3,.3,.05)};
    E.release=function(t){sweep(t,500,2600,1.1,.22,.06,.12,.2,.08);tone(t,180,90,.12,.04,.2,'sine',.02)};
    // шар катится: низкий гул по доскам, к концу тише и выше
    E.roll=function(t,dur){
      var s=src(t,dur+.4),lp=f('bandpass',170,1.2),bp=f('bandpass',620,2.5),g1=g(0),g2=g(0);
      lp.frequency.setValueAtTime(150,t);lp.frequency.linearRampToValueAtTime(240,t+dur);
      g1.gain.setValueAtTime(0,t);g1.gain.linearRampToValueAtTime(.9,t+.08);g1.gain.linearRampToValueAtTime(.55,t+dur);g1.gain.linearRampToValueAtTime(0,t+dur+.15);
      g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.12,t+.08);g2.gain.linearRampToValueAtTime(.06,t+dur);g2.gain.linearRampToValueAtTime(0,t+dur+.1);
      s.connect(lp);lp.connect(g1);s.connect(bp);bp.connect(g2);out(g1,0,.05);out(g2,0,.08);
      var o=ctx.createOscillator(),og=g(0);o.frequency.setValueAtTime(58,t);o.frequency.linearRampToValueAtTime(74,t+dur);
      og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.12,t+.1);og.gain.linearRampToValueAtTime(0,t+dur+.1);chain(o,og);out(og,0,0);o.start(t);o.stop(t+dur+.2);
    };
    // страйк: удар и россыпь деревянного треска
    E.strike=function(t){
      tone(t,130,55,.8,.07,0,'sine',.05);click(t,900,.9,.9,.02,0,.2);click(t,2400,1.2,.5,.006,0,.15);
      var r2=rng(77);for(var k=0;k<34;k++){var d=Math.pow(r2(),1.6)*.5;click(t+d,900+r2()*2200,3.5,.42*Math.exp(-d*5)*(.5+r2()*.5),.006+r2()*.006,(r2()-.5)*1.4,.25)}
      for(var m=0;m<6;m++){var d2=.04+r2()*.3;tone(t+d2,700+r2()*500,null,.06,.03,(r2()-.5)*1.2,'triangle',.2)}
    };
    // кегля отмечена: тик выше с каждой
    E.tick=function(t,n){var fr=880*Math.pow(2,(n||0)/12);tone(t,fr,null,.07,.03,-.3,'sine',.2);click(t,4200,2,.04,.002,-.3,.08)};
    // «do taxes» качается: стук основания
    E.rock=function(t,k){var a=Math.exp(-(k||0)*.6);click(t,1100,4,.4*a,.012,-.3,.15);tone(t,300,250,.12*a,.03,-.3,'triangle',.1)};
    E.tag=function(t){tone(t,660,990,.07,.03,-.3,'sine',.1,.004,.05)};
    // жёлоб: глухой стук и пустой гул по желобу
    E.gutter=function(t){
      click(t,700,2,.6,.02,-.3,.15);tone(t,180,120,.3,.05,-.3,'sine',.05);
      var s=src(t,.9),bp=f('bandpass',480,7),gn=g(0);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.5,t+.04);gn.gain.linearRampToValueAtTime(0,t+.75);
      chain(s,bp,gn);out(gn,-.35,.2);
    };
    // грустное «вомп-вомп»
    E.womp=function(t){
      [[392,370,0],[330,294,.32]].forEach(function(n){var o=ctx.createOscillator(),gn=g(0),tt=t+n[2],len=n[2]?.55:.28;o.type='triangle';
        o.frequency.setValueAtTime(n[0],tt);o.frequency.linearRampToValueAtTime(n[1],tt+len);
        gn.gain.setValueAtTime(0,tt);gn.gain.linearRampToValueAtTime(.16,tt+.03);gn.gain.setValueAtTime(.16,tt+len-.08);gn.gain.linearRampToValueAtTime(0,tt+len);
        chain(o,f('lowpass',1800,.7),gn);out(gn,0,.2);o.start(tt);o.stop(tt+len+.02)});
    };
    E.shiver=function(t){var r2=rng(5);for(var k=0;k<5;k++)click(t+k*.03,1200+r2()*600,4,.25*Math.exp(-k/2),.006,-.3,.1)};
    E.swish=function(t){sweep(t,700,2000,1.2,.08,.05,.2,0,.12)};
    E.hopback=function(t){tone(t,1046.5,1318.5,.08,.05,.1,'triangle',.15,.004,.1)};
    // ложится под Tomorrow
    E.lie=function(t){click(t,1300,3,.3,.01,.1,.1);tone(t,523.25,392,.12,.06,.1,'triangle',.15,.003,.12)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
    return E;
  }

  var S={ctx:null,eng:null,on:true,Engine:Engine};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  S.play=function(ev,late){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.03+Math.max(0,-(late||0)));
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
