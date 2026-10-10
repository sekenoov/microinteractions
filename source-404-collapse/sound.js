/* ═════════ звук ═════════
   Стрим: тихие сухие тики по слову. Ссылка: мягкий «плип». Нажатие и 404: щелчок и два глухих тона вниз.
   Обвал: доски стучат деревом, длинная ниже короткой, громкость по скорости удара.
   Сборка: каждая доска взлетает с коротким вдохом и встаёт тихим стуком, посадки идут вверх по пентатонике.
   Всё синтезируется. В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',45,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.6*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.09)}
    verb.buffer=ir;chain(verb,g(.22),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function click(t,freq,q,gain,dec,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',freq,q),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.3:send);s.start(t,R()*1.5);s.stop(t+dec*9+.02);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+.0015);gn.gain.setTargetAtTime(0,t+.0025,dec);
      chain(o,gn);out(gn,pan,send==null?.2:send);o.start(t);o.stop(t+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=ctx.createBufferSource(),bp=f('bandpass',f0,q),gn=g(0);s.buffer=nb;
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.35:send);s.start(t,R()*1.2);s.stop(t+len*3+.1);
    }

    E.tick=function(t,pan,i){
      click(t,3800+((i*37)%11)*180,2.2,.12,.0035,pan,.12);
      tone(t,900+((i*53)%7)*40,null,.011,.006,pan,'sine',.05);
    };
    E.press=function(t){tone(t,240,130,.2,.016);click(t,1500,.9,.16,.005)};
    E.release=function(t){click(t,2300,4,.24,.004)};
    // не найдено: два глухих тона вниз
    E.err=function(t){tone(t+.02,523,null,.13,.05,.1,'triangle',.25);tone(t+.13,392,null,.14,.08,.1,'triangle',.3)};
    // ссылка лопается
    E.burst=function(t){click(t,3200,1.4,.4,.006,.15,.25);tone(t,1500,320,.1,.012,.15,'sine',.2)};
    // доска о доску или о поле: деревянный стук, длинная звучит ниже
    E.hit=function(t,v,len,pan){
      var a=Math.min(1,Math.pow(v/900,1.1)),f0=Math.max(260,Math.min(1100,62000/Math.max(len,40)));
      tone(t,f0,f0*.8,.32*a,.018+len/9000,pan,'triangle',.18);
      tone(t,f0*2.76,null,.09*a,.008,pan,'sine',.12);
      click(t,1800+R()*1400,1.6,.4*a,.004,pan,.2);
      if(v>500)tone(t,95,60,.22*a,.04,0,'sine',.1);
    };
    // сборка
    E.lift=function(t,pan,r){sweep(t,700,2400+r*200,1.1,.045,.05,.22,pan,.3)};
    var PENT=[587.3,659.3,784,880,987.8,1174.7,1318.5];
    E.seat=function(t,pan,r){var n=PENT[Math.min(PENT.length-1,r)];tone(t,n,null,.075,.05,pan,'sine',.35);click(t,2600,3,.14,.003,pan,.15)};
    E.roll=function(t){for(var j=0;j<3;j++)click(t+j*.045,4200-j*300,5,.13,.0025,.2,.1)};
    E.pop=function(t,v){
      tone(t,1568,null,.06,.05,.25,'sine',.35);
      if(v===2)tone(t+.09,1175,null,.05,.08,.25,'sine',.4);
    };
    E.wipe=function(t){sweep(t,5200,1400,.9,.14,.03,.26,0,.3)};
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4])};
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
    var sr=48000,n=Math.round(cycle*sr),L=Math.min(n,Math.round((len||cycle)*sr)),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr,sampleRate:sr}),E=Engine(ctx);
    for(var c=0;c<2;c++)events.forEach(function(ev){E.trigger(ev,((ev[0]-from)%cycle+cycle)%cycle+c*cycle)});
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
