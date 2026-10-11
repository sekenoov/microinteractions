/* ═════════ звук ═════════
   Точка включается как люминесцентная лампа: два «тинь» на мерцании и тихий гул 120 Гц.
   Рой шуршит крыльями, громче с каждым мотыльком, мотыльки сухо тикают о точку.
   Свет погас: щелчок выключателя. Тишина и сверчок. Начальник летит медленно и тяжело,
   стучит деревом три раза. Ответ уходит с «пуф».
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
    function curve(arr,fn){var a=new Float32Array(arr.length);for(var i=0;i<arr.length;i++)a[i]=fn(arr[i],i);return a}

    // рой: шум через полосовой фильтр, амплитуда трепещет на частоте взмахов; гул лампы
    function swarmVoice(dest){
      var s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
      var bp=f('bandpass',380,1.1),bp2=f('bandpass',190,2),gn=g(0),am=g(.5),lfo=ctx.createOscillator(),lg=g(.5),lfo2=ctx.createOscillator(),lg2=g(.25);
      lfo.type='triangle';lfo.frequency.value=23;lfo2.type='triangle';lfo2.frequency.value=31.5;
      chain(lfo,lg,am.gain);chain(lfo2,lg2,am.gain);
      s.connect(bp);s.connect(bp2);bp.connect(am);bp2.connect(am);chain(am,gn);var p=out(gn,0,.06,dest);
      var hm=ctx.createOscillator(),hm2=ctx.createOscillator(),hg=g(0);hm.frequency.value=120;hm2.frequency.value=240;var h2=g(.35);
      hm.connect(hg);chain(hm2,h2,hg);out(hg,-.1,.02,dest);
      return {gn:gn,p:p,hg:hg,start:function(t){s.start(t);lfo.start(t);lfo2.start(t);hm.start(t);hm2.start(t)},stop:function(t){[s,lfo,lfo2,hm,hm2].forEach(function(x){x.stop(t)})}};
    }
    E.buzz=function(t,o){
      var v=swarmVoice(),len=o.g.length/o.hz;
      v.gn.gain.setValueCurveAtTime(curve(o.g,function(x){return 1.5*Math.pow(x,.75)}),t,len);
      v.p.pan.setValueCurveAtTime(curve(o.pan,function(x){return Math.max(-.6,Math.min(.6,x*.7))}),t,len);
      v.hg.gain.setValueCurveAtTime(curve(o.lamp,function(x){return .012*x}),t,len);
      v.start(t);v.stop(t+len+.02);
    };
    E.click=function(t){click(t,2100,1.3,.32,.004,0,.08);tone(t,330,200,.12,.012,0,'sine',0);click(t+.085,2600,1.4,.16,.003,0,.06)};
    // люминесцентная лампа: «тинь» на каждой вспышке и треск стартёра
    E.on=function(t){
      [0,.1].forEach(function(d,i){tone(t+d,2400+i*300,null,.06,.05,-.1,'sine',.3);tone(t+d,4800+i*500,null,.025,.03,-.1,'sine',.3);click(t+d,5200,2,.06,.002,-.1,.1)});
      var s=src(t+.04,.2),bp=f('bandpass',3200,4),gn=g(0);gn.gain.setValueAtTime(0,t+.04);gn.gain.linearRampToValueAtTime(.05,t+.06);gn.gain.linearRampToValueAtTime(0,t+.2);chain(s,bp,gn);out(gn,-.1,.05);
      tone(t+.2,120,null,.05,.12,-.1,'triangle',.05,.03);
    };
    E.off=function(t){click(t,1400,1.6,.22,.004,-.1,.1);tone(t,180,90,.12,.025,-.1,'sine',.05);tone(t+.01,2600,null,.02,.06,-.1,'sine',.3)};
    // мотылёк о точку: сухой тик, чем сильнее удар, тем громче и ниже
    E.hit=function(t,s,nx){
      var a=.16+.42*s,fq=3400-1400*s+R()*700;
      click(t,fq,2.2,a,.0016,(nx||0)*.35,.08);
      tone(t,900+R()*400,500,.12*s,.006,(nx||0)*.35,'triangle',0);
    };
    // сверчок: три быстрых пульса высокого тона
    E.chirp=function(t){for(var i=0;i<3;i++){var o=ctx.createOscillator(),gn=g(0),tt=t+i*.045;o.frequency.value=4300;gn.gain.setValueAtTime(0,tt);gn.gain.linearRampToValueAtTime(.09,tt+.008);gn.gain.linearRampToValueAtTime(0,tt+.032);chain(o,gn);out(gn,.5,.35);o.start(tt);o.stop(tt+.04)}};
    // начальник: тяжёлые медленные взмахи
    E.flap=function(t,len){var n=Math.floor(len*6.4);for(var i=0;i<n;i++){var u=i/n;sweep(t+i/6.4,260,520,1.2,.3*(1-u*.4),.03,.09,.5-.6*u,.05)}};
    // стук костяшками по дереву
    E.knock=function(t,i){
      var tt=t-.005;
      tone(tt,210-i*6,140,.22,.03,.15,'sine',.12);tone(tt,520,330,.08,.015,.15,'triangle',.1);
      click(tt,950,1.5,.2,.006,.15,.15);click(tt,2400,2,.05,.003,.15,.1);
    };
    E.pop=function(t){sweep(t-.04,900,3800,1.4,.12,.02,.12,.2,.1);tone(t+.04,620,980,.16,.03,.2,'sine',.15);click(t+.04,2400,1.6,.1,.003,.2,.08)};
    E.roll=function(t){var n=6;for(var i=0;i<n;i++){var u=i/(n-1),dt=.3*(1-Math.pow(1-u,1.8));click(t+dt,3600-800*u,2.5,.07*(1-.4*u),.0016,.55,.06)}};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3])};
    E.liveVoice=function(){var v=swarmVoice();v.start(ctx.currentTime);return v};
    return E;
  }

  var S={ctx:null,eng:null,on:true,live:null};
  S.start=function(){
    if(!S.on)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  // ev[0] в живом проигрывании не важен; кривые на всю петлю запускаются со сдвигом
  S.play=function(ev,late){
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    if(ev[1]==='buzz'){S.eng.trigger(ev,S.ctx.currentTime+.03);return}
    S.eng.trigger(ev,S.ctx.currentTime+.03+Math.max(0,-(late||0)));
  };
  S.liveBuzz=function(gv,lamp){
    if(!S.ctx||S.ctx.state!=='running')return;
    if(!S.live)S.live=S.eng.liveVoice();
    var t=S.ctx.currentTime;S.live.gn.gain.setTargetAtTime(1.5*Math.pow(gv,.75),t,.06);S.live.hg.gain.setTargetAtTime(.012*lamp,t,.05);
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
