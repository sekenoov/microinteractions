/* ═════════ звук ═════════
   Вкладка: короткий тик, старый кубик тает каплей, новый замерзает треском инея и звоном.
   Плюс: пластик лотка скрипит на скрутке, кубики щёлкают, вылетая, и звенят, падая, потом шуршат по скольжению.
   Voice примерз: дребезжит в ячейке, лоток стукают второй раз, он вылетает и падает тяжелее.
   Выбор действия: аккорд из льдинок. Закрытие: кубики тают, капли падают в лоток.
   Смена стиля: мягкий вдох и колокольчик. Всё синтезируется, в ?rec дорожка считается офлайн по журналу событий. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(7),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*3,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(2.1),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-16;comp.ratio.value=3;comp.attack.value=.003;comp.release.value=.15;
    chain(master,f('highpass',50,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.4*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.28)}
    verb.buffer=ir;chain(verb,g(.25),master);

    function out(node,pan,send){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.15:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att,glide){
      var o=ctx.createOscillator(),gn=g(0),a=att||.0015;o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||dec*4));
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+a);gn.gain.setTargetAtTime(0,t+a+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.12:send);o.start(t);o.stop(t+a+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=src(t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send);
    }
    // льдинка: несколько негармоничных обертонов, чем выше n, тем выше и короче
    function ice(t,base,gain,pan,dec){
      [1,2.76,5.4,8.9].forEach(function(m,k){tone(t+k*.0007,base*m,0,gain/(1+k*1.3),(dec||.09)/(1+k*.6),pan,'sine',.22)});
      click(t,base*3,2,gain*.8,.004,pan,.1);
    }
    var P=function(x){return (x-216)/260};

    E.tick=function(t,x){click(t,2600,3,.32,.006,P(x||216),.05);tone(t,1500,900,.05,.02,P(x||216))};
    E.press=function(t,x){click(t,1700,2,.4,.008,P(x||216),.05);tone(t,320,180,.12,.03,P(x||216))};
    E.melt=function(t,x){
      tone(t+.05,700,1500,.13,.035,P(x),'sine',.2,.004,.06);
      sweep(t,3000,1400,.8,.04,.03,.35,P(x),.05);
    };
    E.freeze=function(t,x){
      for(var k=0;k<7;k++)click(t+k*.018+R()*.01,4200+R()*3200,4,.22-k*.02,.003,P(x)+(R()-.5)*.2,.15);
      ice(t+.14,1900,.16,P(x),.12);
    };
    E.creak=function(t,amt){
      amt=amt||1;var len=.34*amt,s=src(t,len+.2),bp=f('bandpass',380,7),gn=g(0),lfo=ctx.createOscillator(),lg=g(.5);
      bp.frequency.setValueAtTime(380,t);bp.frequency.linearRampToValueAtTime(820,t+len*.5);bp.frequency.linearRampToValueAtTime(460,t+len);
      lfo.type='sawtooth';lfo.frequency.setValueAtTime(42,t);lfo.frequency.linearRampToValueAtTime(26,t+len);
      var am=g(.5);lfo.connect(lg);lg.connect(am.gain);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.5*amt,t+.03);gn.gain.setTargetAtTime(0,t+len*.8,.04);
      chain(s,bp,am,gn);out(gn,0,.1);lfo.start(t);lfo.stop(t+len+.2);
      for(var k=0;k<3;k++)click(t+len*(.55+k*.14),900+R()*600,3,.3*amt,.005,(R()-.5)*.6,.1);
    };
    E.pop=function(t,x,n){click(t,2400+n*180,2,.5,.006,P(x),.1);tone(t,240-n*10,120,.18,.025,P(x))};
    E.clink=function(t,x,n){ice(t,1500+[0,190,380,90,270,470][n%6],.17,P(x),.1);tone(t,160,90,.16,.03,P(x),'sine',0)};
    E.slide=function(t,x,len){sweep(t,5200,3600,1.2,.05,.01,len||.25,P(x),.03)};
    E.rattle=function(t,x){for(var k=0;k<10;k++)click(t+k*.075+R()*.012,1100+R()*700,3,.22,.005,P(x),.08)};
    E.thud=function(t,x){ice(t,1250,.22,P(x),.13);tone(t,120,60,.18,.05,P(x),'sine',0);click(t,600,1,.3,.01,P(x),.05)};
    E.pick=function(t,x){[0,.05,.1].forEach(function(d,k){ice(t+d,[1760,2217,2637][k],.14,P(x)+(k-1)*.15,.16)})};
    E.drip=function(t,x){tone(t,900+R()*500,1800+R()*400,.12,.03,P(x),'sine',.18,.003,.05)};
    E.whoosh=function(t,x){
      sweep(t,500,2800,.9,.32,.18,.5,P(x),.25);
      [1318,1976,2637].forEach(function(fq,k){tone(t+.22+k*.06,fq,0,.09,.22,P(x)+(k-1)*.2,'sine',.35,.01)});
    };
    E.trigger=function(ev,t){var fn=E[ev[1]];if(fn)fn(t,ev[2],ev[3],ev[4])};
    return E;
  }

  var S={ctx:null,eng:null,on:true,log:[],rec:false};
  S.start=function(){
    if(!S.on||S.rec)return;
    if(S.ctx){if(S.ctx.state!=='running')S.ctx.resume();return}
    try{var AC=window.AudioContext||window.webkitAudioContext;S.ctx=new AC({latencyHint:'interactive'});S.eng=Engine(S.ctx)}catch(e){S.ctx=null}
  };
  S.setOn=function(v){S.on=v;if(v)S.start();else if(S.ctx)S.ctx.suspend()};
  // журнал нужен для записи: время берётся из часов страницы, которые в ?rec виртуальные
  S.play=function(name,a,b,c){
    var ev=[performance.now()/1000,name,a,b,c];
    if(S.rec){S.log.push(ev);return}
    if(!S.on||!S.ctx||S.ctx.state!=='running')return;
    S.eng.trigger(ev,S.ctx.currentTime+.01);
  };
  S.render=async function(from,len){
    var sr=48000,n=Math.round(len*sr),ctx=new OfflineAudioContext({numberOfChannels:2,length:n+sr,sampleRate:sr}),E=Engine(ctx);
    S.log.forEach(function(ev){var t=ev[0]-from;if(t>=0&&t<len)E.trigger(ev,t+.001)});
    var buf=await ctx.startRendering();
    return wav([buf.getChannelData(0).subarray(0,n),buf.getChannelData(1).subarray(0,n)],sr);
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
