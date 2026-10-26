/* ═════════ звук ═════════
   Пушка стреляет пневматическим «тфп», следом тихий стук нового сообщения. Мяч цокает о стол
   сухим «ток», ракетка отвечает звонким «пок», над мячом щёлкает реакция. Часы тикают на каждой минуте.
   @channel: три яркие ноты тревоги, мотор раскручивается, бункер гремит, сорок «тфп» очередью на гуле,
   стол и поле ввода тонут в стуке, счётчик раскручивается тиками до звона 99+. Ракетка падает
   на стол деревянным «клак» с грустной нотой вниз. Последний мяч: вздох пушки, извиняющиеся
   две ноты вниз, редкие «ток» и мягкий шлепок в сетку. Всё синтезируется, в ?rec дорожка считается офлайн. */
var Sound=(function(){
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function Engine(ctx){
    var sr=ctx.sampleRate,R=rng(3),E={};
    function g(v){var x=ctx.createGain();x.gain.value=v;return x}
    function f(type,freq,q){var x=ctx.createBiquadFilter();x.type=type;x.frequency.value=freq;if(q!=null)x.Q.value=q;return x}
    function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}

    var nb=ctx.createBuffer(1,sr*3,sr),nd=nb.getChannelData(0),r=rng(9);
    for(var i=0;i<nd.length;i++)nd[i]=r()*2-1;

    var master=g(1.3),comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.003;comp.release.value=.15;
    chain(master,f('highpass',40,.7),comp,ctx.destination);
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.4*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.22)}
    verb.buffer=ir;chain(verb,g(.2),master);

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

    // выстрел пушки: пневматический «тфп» с низом
    E.shot=function(t){tone(t,170,70,.32,.03,.45,'sine',.03);sweep(t,450,1300,1.1,.13,.004,.05,.45,.05);click(t,1700,1.4,.14,.004,.45,.05)};
    // очередь @channel: то же, но легче и короче, чтобы сорок штук не превратились в кашу
    E.pew=function(t,i){var d=1+((i||0)%5)*.03;tone(t,150*d,75,.22,.02,.45,'sine',.02);sweep(t,500*d,1500,1.2,.09,.003,.035,.45,.03)};
    // под очередью: нарастающий гул, сорок мячей сразу
    E.rush=function(t){
      var s=src(t,1.6),lp=f('lowpass',300,.8),gn=g(0);lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(2400,t+.5);lp.frequency.exponentialRampToValueAtTime(500,t+1.3);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.32,t+.35);gn.gain.setTargetAtTime(0,t+.9,.22);chain(s,lp,gn);out(gn,0,.2);
      tone(t,62,48,.45,.25,0,'sine',.02,.05,.8);
    };
    // новое сообщение: мягкий двойной стук, высота чуть гуляет
    E.msg=function(t,k){var s=[0,2,4,2,5,0,4,7,2,5,4,7][(k||0)%12],fr=880*Math.pow(2,s/24);
      tone(t,fr,null,.045,.035,.15,'sine',.25);tone(t+.06,fr*1.335,null,.04,.05,.15,'sine',.3)};
    // мяч о стол: сухой «ток»
    E.tok=function(t,v,pan){var k=v==null?.7:v;
      tone(t,1380,1040,.26*k,.016,pan,'sine',.1);click(t,2700,2.2,.48*k,.0035,pan,.1);tone(t,540,null,.1*k,.01,pan,'triangle',.05)};
    // ракетка: звонкий «пок» с резиновым низом
    E.pok=function(t,k){var d=1+((k||0)%3)*.025;
      tone(t,1120*d,880*d,.3,.02,-.5,'sine',.12);click(t,3300,1.8,.42,.003,-.5,.1);tone(t,250,170,.24,.024,-.5,'sine',.05)};
    // реакция 👍: короткий светлый щелчок
    E.react=function(t){tone(t,2093,null,.035,.04,-.3,'sine',.25);click(t,5200,3,.05,.002,-.3,.1)};
    // взмах ракеткой
    E.whiff=function(t){
      var s=src(t,.25),bp=f('bandpass',500,1.1),gn=g(0);
      bp.frequency.setValueAtTime(500,t);bp.frequency.exponentialRampToValueAtTime(2000,t+.07);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.09,t+.06);gn.gain.setTargetAtTime(0,t+.065,.015);
      chain(s,bp,gn);out(gn,-.5,.05);
    };
    // мяч о поле ввода: пластиковый, глуше стола
    E.floor=function(t,v,pan){var k=v==null?.6:v;tone(t,760,560,.16*k,.016,pan,'triangle',.1);click(t,1700,2,.24*k,.004,pan,.08)};
    E.wall=function(t,v,pan){var k=v==null?.6:v;tone(t,620,480,.14*k,.014,pan,'triangle',.08);click(t,1400,2,.2*k,.004,pan,.08)};
    // мяч упёрся в лежащую ракетку: глухой резиновый тык
    E.pad=function(t,v,pan){var k=v==null?.6:v;tone(t,330,220,.2*k,.02,pan,'sine',.06);click(t,1900,2,.16*k,.004,pan,.08)};
    // мягкий шлепок в сетку
    E.net=function(t,v){var k=v==null?.6:v;sweep(t,900,400,.8,.18*k,.003,.05,0,.06);tone(t,190,140,.18*k,.025,0,'sine',.04)};
    // минута сменилась: тихий тик часов; последняя, 9:07, чуть заметнее
    E.tick=function(t,i){var last=i===6;click(t,4200,3,last?.22:.07,.002,.3,.05);tone(t,last?1760:1500,null,last?.1:.022,last?.03:.012,.3,'sine',.15)};
    // @channel: три яркие ноты тревоги и толчок
    E.alert=function(t){
      [1318.5,1568,2093].forEach(function(fr,k){tone(t+k*.07,fr,null,.12,.08,0,'triangle',.25);tone(t+k*.07,fr*2,null,.03,.04,0,'sine',.2)});
      tone(t,90,55,.4,.06,0,'sine',.03);
    };
    // мотор раскручивается перед очередью
    E.whirr=function(t){
      var o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=g(.035),gn=g(0),lp=f('lowpass',500,1.2),len=.62;o.type='sawtooth';
      o.frequency.setValueAtTime(48,t);o.frequency.exponentialRampToValueAtTime(150,t+len);
      lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(1400,t+len);
      lfo.frequency.setValueAtTime(18,t);lfo.frequency.linearRampToValueAtTime(40,t+len);chain(lfo,lg);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.09,t+len*.8);gn.gain.linearRampToValueAtTime(0,t+len+.05);
      lg.connect(gn.gain);chain(o,lp,gn);out(gn,.45,.06);o.start(t);lfo.start(t);o.stop(t+len+.1);lfo.stop(t+len+.1);
    };
    // бункер набивается: мячи сыпятся и гремят
    E.fill=function(t){var r2=rng(23);for(var k=0;k<26;k++){var d=k*.019+r2()*.012;click(t+d,2200+r2()*1600,2.5,.06*(.6+.4*r2()),.004,.45,.06)}};
    // счётчик раскручивается: тик выше с каждым числом
    E.roll=function(t,v){var fr=700+Math.min(99,v||0)*14;tone(t,fr,null,.08,.012,-.3,'sine',.05);click(t,4000,2,.06,.0015,-.3,.03)};
    // 99+: яркое двойное уведомление
    E.plus=function(t){tone(t,1760,null,.22,.07,-.3,'sine',.25);tone(t+.1,2349,null,.2,.12,-.3,'sine',.3);click(t,5000,2,.15,.003,-.3,.15)};
    // ракетка сдаётся: нота вниз
    E.droop=function(t){tone(t,523,262,.1,.1,-.45,'triangle',.18,.01,.34)};
    // ракетка ложится на стол: деревянный «клак»
    E.clack=function(t){click(t,1150,4,.55,.018,-.45,.15);tone(t,230,160,.3,.03,-.45,'triangle',.06);click(t+.07,1500,4,.16,.01,-.45,.1)};
    // последний мяч: усталый вздох пушки
    E.puff=function(t){sweep(t,900,300,.9,.06,.02,.2,.45,.08)};
    // «sorry, wrong channel»: две ноты вниз, извиняясь
    E.sorry=function(t){tone(t,880,null,.1,.07,.2,'sine',.3);tone(t+.1,740,null,.09,.12,.2,'sine',.35)};
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
