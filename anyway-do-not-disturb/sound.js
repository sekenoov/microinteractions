/* ═════════ звук ═════════
   Баннер падает со свистом. Пилюля подпрыгивает «хоп» и ловит его: звонок уведомления
   слышен глухо, как через стекло, а сама пилюля пружинит желейным «бойн». После второго
   удара тонкий треск, потом пилюля стучит зубами. Третий: стекло скрипит, звон осколков,
   уведомление бухается на место, и только теперь звонок звучит громко и чисто.
   Осколки и луна звякают по карточке из событий физики, при перемотке те же звяки идут
   задом наперёд. Всё синтезируется, в ?rec дорожка петли считается офлайн. */
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
    var verb=ctx.createConvolver(),ir=ctx.createBuffer(2,Math.floor(1.4*sr),sr),rr=rng(5);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var k=0;k<d.length;k++)d[k]=(rr()*2-1)*Math.exp(-k/sr/.28)}
    verb.buffer=ir;chain(verb,g(.22),master);

    function out(node,pan,send,dest){
      var p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));chain(node,p,dest||master);
      if(send){var s=g(send);p.connect(s);s.connect(verb)}
      return p;
    }
    function src(t,len){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,R()*1.5);s.stop(t+len);return s}
    function click(t,freq,q,gain,dec,pan,send){
      var s=src(t,dec*9+.02),bp=f('bandpass',freq,q),gn=g(0);
      gn.gain.setValueAtTime(gain,t);gn.gain.setTargetAtTime(0,t+.0012,dec);
      chain(s,bp,gn);out(gn,pan,send==null?.3:send);
    }
    function tone(t,f0,f1,gain,dec,pan,type,send,att,dest){
      var o=ctx.createOscillator(),gn=g(0);o.type=type||'sine';
      o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dec*4);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+(att||.0015));gn.gain.setTargetAtTime(0,t+(att||.0015)+.001,dec);
      chain(o,gn);out(gn,pan,send==null?.2:send,dest);o.start(t);o.stop(t+(att||0)+dec*9+.02);
    }
    function sweep(t,f0,f1,q,gain,att,len,pan,send){
      var s=src(t,len*3+.1),bp=f('bandpass',f0,q),gn=g(0);
      bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(gain,t+att);gn.gain.setTargetAtTime(0,t+att,len*.35);
      chain(s,bp,gn);out(gn,pan,send==null?.35:send);
    }
    function bell(t,f0,gain,dec,pan,send,dest){
      tone(t,f0,null,gain,dec,pan,'sine',send,.003,dest);
      tone(t,f0*2.01,null,gain*.3,dec*.6,pan,'sine',send,.003,dest);
      tone(t,f0*3.47,null,gain*.12,dec*.35,pan,'sine',send,.003,dest);
    }
    // звонок уведомления: три восходящие ноты
    function chime(t,gain,dest){
      bell(t,1318.5,gain,.2,0,.35,dest);bell(t+.075,1661.2,gain*.85,.2,0,.35,dest);bell(t+.15,1975.5,gain*.95,.32,0,.42,dest);
    }

    E.whoosh=function(t,k){sweep(t,2200,700,1.1,.2+.1*k,.06,.16,0,.15)};
    E.incoming=function(t){sweep(t,3400,600,1,.5,.02,.12,0,.2);tone(t,1100,380,.1,.03,0,'triangle',.1)};
    E.hop=function(t,k){tone(t,280,600,.2,.028,0,'sine',.08);sweep(t,600,1800,1.6,.12,.01,.07,0,.08)};
    // отбил: звонок за стеклом, желейное стекло пружинит
    E.block=function(t,k){
      var lp=f('lowpass',560,.9),mg=g(1.3);chain(lp,mg,master);
      chime(t,.42,lp);
      var o=ctx.createOscillator(),gn=g(0),v=ctx.createOscillator(),vg=g(0);
      o.type='sine';o.frequency.setValueAtTime(260+k*30,t);o.frequency.exponentialRampToValueAtTime(190+k*20,t+.4);
      v.frequency.value=15;vg.gain.setValueAtTime(40,t);vg.gain.setTargetAtTime(0,t,.16);chain(v,vg,o.frequency);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.34,t+.006);gn.gain.setTargetAtTime(0,t+.01,.15);
      chain(o,gn);out(gn,0,.15);o.start(t);v.start(t);o.stop(t+1);v.stop(t+1);
      // то же октавой выше, чтобы было слышно в телефоне
      var o2=ctx.createOscillator(),g2=g(0),v2=ctx.createOscillator(),vg2=g(0);o2.type='triangle';
      o2.frequency.setValueAtTime(520+k*60,t);o2.frequency.exponentialRampToValueAtTime(380+k*40,t+.4);
      v2.frequency.value=15;vg2.gain.setValueAtTime(80,t);vg2.gain.setTargetAtTime(0,t,.16);chain(v2,vg2,o2.frequency);
      g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.16,t+.006);g2.gain.setTargetAtTime(0,t+.01,.13);
      chain(o2,g2);out(g2,0,.15);o2.start(t);v2.start(t);o2.stop(t+1);v2.stop(t+1);
      bell(t,3200,.08,.04,.1,.2);click(t,1200,1,.22,.006,0,.05);
    };
    E.land=function(t,k){click(t,1500,1,.22,.005,0,.08);tone(t,220,120,.18,.018,0,'sine',.04)};
    E.crack=function(t){for(var i=0;i<6;i++){click(t+i*.011+R()*.005,3200+R()*3200,2.2,.3*(1-i/8),.0018,(R()-.5)*.4,.15)}};
    // стучит зубами
    E.chatter=function(t,len){var n=Math.floor(len*24);for(var i=0;i<n;i++){var a=Math.pow(i/n,1.4);click(t+i/24,2600+R()*600,3,.03+.12*a,.0018,(i%2?.15:-.15),.05)}};
    E.strain=function(t){
      var o=ctx.createOscillator(),bp=f('bandpass',1800,5),gn=g(0);o.type='sawtooth';
      o.frequency.setValueAtTime(130,t);o.frequency.linearRampToValueAtTime(90,t+.07);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.4,t+.01);gn.gain.linearRampToValueAtTime(0,t+.075);
      chain(o,bp,gn);out(gn,0,.1);o.start(t);o.stop(t+.1);
      E.crack(t+.01);
    };
    // разбилось
    E.smash=function(t){
      var s=src(t,.6),hp=f('highpass',2200,.7),gn=g(0);gn.gain.setValueAtTime(.9,t);gn.gain.setTargetAtTime(0,t+.002,.07);chain(s,hp,gn);out(gn,0,.3);
      tone(t,180,60,.45,.05,0,'sine',.05);tone(t,360,120,.25,.04,0,'triangle',.05);
      for(var i=0;i<26;i++){var dt=Math.pow(R(),1.8)*.42;bell(t+dt,2600+R()*5200,.11*(1-dt*1.6),.03+R()*.05,(R()-.5)*1.4,.3)}
    };
    E.thud=function(t){
      tone(t,140,52,.55,.06,0,'sine',.04);tone(t,300,110,.3,.035,0,'triangle',.05);
      click(t,800,1,.4,.008,0,.12);sweep(t,1400,300,1,.25,.004,.14,0,.1);
    };
    E.ding=function(t){chime(t,.34)};
    E.tink=function(t,o){var a=Math.min(1,o.v/1100);bell(t,o.f*(o.k===3?1:1.12),.04+.13*a,.03+.02*a,o.pan,.25);click(t,o.f*.8,2,.06*a,.002,o.pan,.1)};
    E.tonk=function(t,o){var a=Math.min(1,o.v/900);tone(t,720,640,.08+.2*a,.05,o.pan,'sine',.15);tone(t,1480,1300,.04+.08*a,.03,o.pan,'sine',.15);click(t,1100,1.5,.1*a,.004,o.pan,.1)};
    // задом наперёд: звук нарастает и обрывается
    E.rtink=function(t,o){
      var a=Math.min(1,o.v/1100),fr=o.moon?720:o.f*1.12,oo=ctx.createOscillator(),gn=g(0);
      oo.frequency.value=fr;gn.gain.setValueAtTime(0,t-.06);gn.gain.linearRampToValueAtTime(.03+.09*a,t);gn.gain.linearRampToValueAtTime(0,t+.004);
      chain(oo,gn);out(gn,o.pan,.3);oo.start(Math.max(0,t-.07));oo.stop(t+.01);
    };
    E.rewind=function(t,len){
      var s=src(t,len+.1),bp=f('bandpass',400,1.2),gn=g(0);
      bp.frequency.setValueAtTime(400,t);bp.frequency.exponentialRampToValueAtTime(5200,t+len);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.22,t+len*.85);gn.gain.linearRampToValueAtTime(0,t+len);
      chain(s,bp,gn);out(gn,0,.3);
    };
    E.reform=function(t){bell(t,2093,.2,.22,0,.4);bell(t+.02,2637,.14,.2,0,.4);bell(t+.04,3136,.1,.18,0,.4);click(t,4000,2,.15,.002,0,.2)};
    E.touch=function(t){click(t,1900,1.2,.24,.004,.4,.1);tone(t,320,180,.1,.012,.4,'sine',0)};
    E.swipe=function(t){sweep(t,700,2600,1.1,.32,.03,.22,-.4,.2)};
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
    S.eng.trigger(ev,S.ctx.currentTime+.08+(delay||0));
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
