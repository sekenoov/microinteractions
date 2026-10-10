/* ═════════ звук ═════════
   Злой набор: тяжёлые клавиши, у раскалённых букв с потрескиванием. Пока письмо горячее, под всем
   гудит печь, громкость идёт от температуры на кнопке. Отказ: два глухих удара. Закалка: всплеск
   и шипение пара, у длинного куска длиннее. Остывающий металл тенькает. Готово: короткий чистый тон.
   Отправка: свист. Всё синтезируется, сэмплов нет. В ?rec дорожка петли считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;
    // бурый шум для печи
    var bb=ctx.createBuffer(1,sr*4,sr),bd=bb.getChannelData(0),last=0;
    for(i=0;i<bd.length;i++){last=(last+.02*(r()*2-1))/1.02;bd[i]=last*3.5}

    var master=g(1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.12;
    chain(master,f('highpass',60,.7),comp,ctx.destination);
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

    // печь: гул под раскалённым письмом, громкость задаёт сцена
    var bed=ctx.createBufferSource(),bedG=g(0),bedF=f('lowpass',380,.8);bed.buffer=bb;bed.loop=true;
    chain(bed,bedF,bedG,master);bed.start(0);
    var hissBed=ctx.createBufferSource(),hbG=g(0);hissBed.buffer=nb;hissBed.loop=true;
    chain(hissBed,f('bandpass',5200,.6),hbG,master);hissBed.start(0);
    E.bed=function(t,v){
      bedG.gain.setTargetAtTime(v*.15,t,.05);
      hbG.gain.setTargetAtTime(v*v*.018,t,.05);
      bedF.frequency.setTargetAtTime(260+520*v,t,.08);
    };

    // клавиша: 0 буква, 1 пробел, 2 ввод, 3 «!»; heat добавляет треск раскалённой буквы
    E.key=function(t,kind,heat){
      var hv=kind===2?1.3:kind===3?1.25:kind===1?1.05:1,p=(R()-.5)*.3;
      tone(t,kind===1?120:kind===2?105:150+R()*20,70,.1*hv,.011,p,'sine',.08);
      click(t,kind===1?1500:2300+R()*900,1.3,.55*hv,.0055,p,.18);
      click(t+.0015,4800+R()*1600,2.5,.24*hv,.0028,p,.1);
      if(kind===2)click(t+.03,1900,1.5,.3,.006,p,.2);
      if(heat>.3)click(t+.004,7200+R()*2000,1.6,.1*heat,.008,p,.1);
    };
    E.spark=function(t,pan){click(t,6500+R()*3500,5,.12+R()*.1,.0018,pan*.8,.15)};
    E.crk=function(t,pan,v){click(t,3000+R()*4500,3,.05+.08*v,.0012,pan,.2)};
    E.press=function(t){tone(t,210,120,.24,.018);click(t,1300,.9,.16,.005)};
    E.release=function(t){click(t,2100,4,.35,.004)};
    // отказ: «не-а», два глухих удара вниз
    E.deny=function(t){
      tone(t,196,150,.3,.035,.2,'triangle',.25);click(t,700,1.5,.25,.012,.2);
      tone(t+.105,165,120,.26,.04,.2,'triangle',.25);click(t+.105,600,1.5,.2,.012,.2);
    };
    // закалка: плюх и шипение, зёрна пузырьков
    E.hiss=function(t,size,pan){
      tone(t,120,55,.3*size,.028,pan,'sine',.3);
      sweep(t,9000,3600,.7,.3*size,.012,.5+.35*size,pan,.45);
      var s=ctx.createBufferSource(),hp=f('highpass',2600,.7),gn=g(0);s.buffer=nb;
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.2*size,t+.01);gn.gain.setTargetAtTime(0,t+.02,.18+.12*size);
      chain(s,hp,gn);out(gn,pan,.4);s.start(t,R()*1.5);s.stop(t+1.6);
      var n=Math.round(22+22*size);
      for(var i=0;i<n;i++){
        var dt=Math.pow(R(),1.7)*(.55+.4*size);
        click(t+.01+dt,3200+R()*6000,4,(.16+R()*.14)*size*(1-dt/1.1),.004+R()*.012,pan+(R()-.5)*.3,.3);
      }
    };
    // остывающий металл: неровные обертоны
    E.tink=function(t,fr,pan,v){
      [[1,.1,.32],[2.76,.05,.16],[5.4,.026,.08],[8.93,.012,.05]].forEach(function(p){tone(t,fr*p[0],null,p[1]*v,p[2],pan,'sine',.5)});
    };
    E.form=function(t){click(t,5200,6,.07,.004,0,.4);tone(t,2600,null,.02,.04,0,'sine',.4)};
    E.ready=function(t){tone(t,1318.5,null,.07,.09,.3,'sine',.4);tone(t+.07,1975.5,null,.06,.12,.3,'sine',.4)};
    E.whoosh=function(t){sweep(t,380,3200,1.1,1,.14,.42,0,.4);sweep(t+.03,700,5200,2,.35,.12,.35,.2,.4)};
    E.arrive=function(t){sweep(t,1400,420,1,.22,.08,.35,0,.3);tone(t+.3,95,70,.12,.03)};
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
  S.bed=function(v){if(S.ctx&&S.ctx.state==='running')S.eng.bed(S.ctx.currentTime,v)};

  /* запись: события петли кладутся на два круга, берётся второй, чтобы хвосты первого зашли в начало */
  S.renderLoop=async function(events,cycle,from,bedFn){
    var sr=48000,n=Math.round(cycle*sr),ctx=new OfflineAudioContext({numberOfChannels:2,length:n*2+sr,sampleRate:sr}),E=Engine(ctx);
    for(var c=0;c<2;c++){
      events.forEach(function(ev){E.trigger(ev,((ev[0]-from)%cycle+cycle)%cycle+c*cycle)});
      if(bedFn)for(var s=0;s<cycle;s+=1/60)E.bed(c*cycle+s,bedFn(((s+from)%cycle+cycle)%cycle));
    }
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
