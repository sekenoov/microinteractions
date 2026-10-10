/* ═════════ звук ═════════
   Стрим: тихий быстрый шорох, по тику на слово, высота чуть плывёт по строке. Стоп: щелчок кнопки и удар,
   за ним дробь мелких стуков, как будто слова валятся друг на друга, и мягкий откат.
   Повтор: щелчок и короткий вдох стирания. Всё синтезируется. В ?rec дорожка петли считается офлайн. */
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
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(.5*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.07)}
    verb.buffer=ir;chain(verb,g(.2),master);

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

    // слово пришло: сухой короткий тик
    E.tick=function(t,pan,i){
      click(t,3800+((i*37)%11)*180,2.2,.13,.0035,pan,.12);
      tone(t,900+((i*53)%7)*40,null,.012,.006,pan,'sine',.05);
    };
    E.press=function(t){tone(t,240,130,.22,.016);click(t,1500,.9,.18,.005)};
    E.release=function(t){click(t,2300,4,.28,.004)};
    // удар: глухой толчок, потом слова валятся друг на друга от края назад, всё реже и тише
    E.crash=function(t,n){
      tone(t,120,48,.55,.05,0,'sine',.15);
      click(t,420,1,.7,.014,0,.25);
      click(t+.002,2600,1.2,.35,.006,0,.2);
      var k=Math.min(18,Math.max(4,n||12)),tt=t+.012;
      for(var j=0;j<k;j++){
        var a=Math.pow(.86,j);
        tt+=.007+.0025*j+R()*.004;
        click(tt,900+R()*2600,2.4,.32*a,.003+R()*.004,(R()-.5)*.6,.18);
        if(j%3===0)tone(tt,170+R()*90,90,.07*a,.01,(R()-.5)*.5,'triangle',.12);
      }
      // откат назад: мягкий низкий вздох
      sweep(t+.2,260,140,1.2,.16,.08,.3,0,.2);
      tone(t+.42,92,70,.07,.05,0,'sine',.1);
    };
    // ответ дописан: два мягких тона вверх
    E.done=function(t){tone(t,880,null,.07,.08,.2,'sine',.4);tone(t+.08,1318.5,null,.06,.12,.2,'sine',.4)};
    E.wipe=function(t){sweep(t,5200,1400,.9,.16,.03,.26,0,.3)};
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
