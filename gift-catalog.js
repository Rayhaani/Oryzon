/* gift-catalog.js — load AFTER the main <script> in gift.html.
   Replaces the small test catalog with ~145 animated gifts (Noto) + ~145 collectibles (Fluent 3D),
   adds category chips, collectible backdrops/symbols/rarity, and richer send effects.
   Candidates whose image fails to load are removed from the grid automatically. */
(function(){
var H=function(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h};

/* ---------- ALL GIFTS (1/2): Noto Animated Emoji, gift-like only (cp|Name) ---------- */
var S={
Love:'2764_fe0f|Heart,1f498|Cupid,1f49d|Gift heart,1f496|Sparkle heart,1f497|Growing heart,1f493|Beating heart,1f495|Two hearts,1f49e|Revolving hearts,1f48b|Kiss,1f48c|Love letter,1f339|Rose,1f490|Bouquet,1f337|Tulip',
Celebrate:'1f389|Party,1f38a|Confetti,1f388|Balloon,1f381|Gift,1f382|Cake,1f942|Cheers glasses,1f37e|Bubbly,1f386|Fireworks,1f387|Sparkler,1f380|Ribbon,2728|Sparkles,2b50|Star,1f31f|Glow star,1f4a5|Boom,1f4ab|Dizzy,1f525|Fire,26a1|Zap,1f4af|Hundred,1f947|Gold medal,1f3c5|Medal,1f680|Rocket,1f3c6|Trophy',
Fun:'1f9f8|Teddy,1f3b5|Music,1f3a4|Mic,1f3ae|Game,1f3b8|Guitar,1f383|Pumpkin,1f3a8|Palette,1f3af|Bullseye,1f3b2|Dice',
Nature:'1f340|Clover,1f308|Rainbow,1f33a|Hibiscus,1f33b|Sunflower,1f338|Blossom,1f98b|Butterfly,1f984|Unicorn,1f409|Dragon,1f319|Moon,2744_fe0f|Snowflake',
Luxury:'1f4b8|Cash flight,1fa99|Coin,1f4b0|Money bag,1f52e|Crystal ball,1f6f8|Saucer,2708_fe0f|Jet,1f3ce_fe0f|Racer,1f48d|Ring,1f451|Crown,1f48e|Diamond'};
/* ---------- ALL GIFTS (2/2): Fluent Emoji 3D everyday items (folder names, shown as gifts) ---------- */
var SF={
Treats:'Cookie,Popcorn,Pizza,Hamburger,French fries,Hot dog,Taco,Sushi,Pancakes,Waffle,Croissant,Pretzel,Cheese wedge,Strawberry,Cherries,Watermelon,Peach,Pineapple,Mango,Grapes,Banana,Avocado,Teapot,Beer mug,Wine glass,Bottle with popping cork,Cup with straw,Bubble tea,Soft ice cream,Shaved ice,Pie,Bagel,Cut of meat,Fortune cookie,Honey pot,Lemon,Coconut,Chestnut'.split(','),
Fun:'Paintbrush,Crayon,Memo,Books,Pencil,Envelope,Package,Mailbox with raised flag,Bubbles,Yo-yo,Kite,Puzzle piece,Slot machine,Bowling,Chess pawn,Joker,Roller skate,Skateboard,Bicycle,Motor scooter,Tent,Camping,Beach with umbrella,Umbrella with rain drops,Sunrise,Carousel horse,Ferris wheel,Roller coaster,Circus tent,Performing arts,Clapper board,Ticket,Admission tickets,Banjo,Accordion,Long drum,Musical keyboard,Radio,Television,Laptop,Mobile phone,Battery,Satellite antenna,Gear,Magnet,Test tube,Microscope,Fountain pen,Balloon,Pinata,Nesting dolls,Teddy bear,Puzzle piece'.split(','),
Nature:'Seedling,Herb,Sheaf of rice,Four leaf clover,Leaf fluttering in wind,Fallen leaf,Evergreen tree,Deciduous tree,Cherry blossom,Lotus,Water wave,Droplet,Cloud with lightning,Cloud with rain,Snowflake,Tornado,Fog,Rainbow,Sunrise over mountains,Desert island,National park,Ladybug,Snail,Hatching chick,Baby chick,Rabbit face,Hedgehog,Otter,Sloth,Lizard,Frog,Crab,Lobster,Seal'.split(',')};
var PG={Love:[10,10,15,15,20,25,30],Fun:[10,15,15,20,25,30,40,50],Nature:[10,15,20,25,30,40,50],Celebrate:[20,30,40,50,75,100],Luxury:[100,125,150,200],Treats:[10,10,15,15,20,25,30,40]};

/* ---------- COLLECTIBLES: Fluent Emoji 3D (folder names, cheapest to most premium) ---------- */
var C='Fire,Star,Glowing star,Sparkles,Rainbow,Four leaf clover,Rose,Tulip,Hibiscus,Sunflower,Blossom,Cherry blossom,Bouquet,Balloon,Party popper,Confetti ball,Wrapped gift,Birthday cake,Cupcake,Doughnut,Chocolate bar,Candy,Lollipop,Ice cream,Shortcake,Cocktail glass,Tropical drink,Clinking glasses,Hot beverage,Mushroom,Maple leaf,Cactus,Palm tree,Christmas tree,Snowman,Snowflake,Sun,Full moon,Crescent moon,High voltage,Collision,Dizzy,Sparkler,Fireworks,Musical note,Microphone,Headphone,Guitar,Violin,Trumpet,Saxophone,Drum,Joystick,Video game,Camera,Movie camera,Light bulb,Bell,Key,Old key,Telescope,Compass,Anchor,Sailboat,Hot air balloon,Airplane,Automobile,Racing car,Teddy bear,Ghost,Skull,Robot,Alien,Alien monster,Jack-o-lantern,Red heart,Orange heart,Yellow heart,Green heart,Blue heart,Purple heart,Black heart,White heart,Heart with ribbon,Heart with arrow,Sparkling heart,Revolving hearts,Growing heart,Beating heart,Two hearts,Heart decoration,Love letter,Kiss mark,Lipstick,Butterfly,Honeybee,Swan,Flamingo,Owl,Parrot,Peacock,Eagle,Fox,Wolf,Panda,Koala,Lion,Tiger,Dolphin,Whale,Octopus,Shark,Turtle,Sunglasses,Glasses,Watch,Backpack,Briefcase,Handbag,Purse,Top hat,Shield,Crossed swords,Bow and arrow,Magic wand,Hourglass done,Atom symbol,Ringed planet,Shooting star,Comet,Milky way,Volcano,Mountain,Flying saucer,Rocket,Sports medal,Military medal,1st place medal,Trophy,Money bag,Crystal ball,Ring,Heart on fire,Unicorn,Dragon,Gem stone,Crown'.split(',');
var ADJ=['Aurora','Solar','Lunar','Royal','Neon','Crystal','Phantom','Velvet','Ember','Frost','Cosmic','Golden'];
var BD=[['Deep violet','#5A47D6','#1B1740',5.8],['Ocean','#2A82C4','#0B2A44',7.5],['Emerald','#24A67C','#0B3326',6.1],['Crimson','#CC3A55','#3A0F1B',3.4],['Amber','#D9962B','#3A2508',4.2],['Rose','#E0639A','#3D1228',8.9],['Slate','#5C6788','#161A28',12],['Teal','#27B0BB','#08333A',9.3],['Indigo','#4558E8','#12163F',7],['Lime','#8CC230','#233009',2.1],['Graphite','#4A4F63','#0E1018',14],['Sunset','#EA7B45','#3B1608',3]];
var SY=[['Dots',14],['Diamonds',8.5],['Crosses',11],['Stars',3.2],['Rings',6.7],['Triangles',5.1]];
var MD=[['Original','none',40],['Aqua','hue-rotate(120deg)',18],['Rose','hue-rotate(300deg)',14],['Sun','hue-rotate(40deg)',10],['Mint','hue-rotate(80deg)',8],['Violet','hue-rotate(250deg)',6],['Noir','grayscale(1) contrast(1.15)',4]];
var RC={Common:'#8A90A6',Rare:'#2ED3C6',Epic:'#9D86FF',Legendary:'#FFC857'};
var PS=['<circle cx="13" cy="13" r="2"/>','<path d="M13 8l5 5-5 5-5-5z"/>','<path d="M12 7h2v5h5v2h-5v5h-2v-5H7v-2h5z"/>','<path d="M13 6l2 5 5 .5-4 3.5 1.2 5-4.2-2.8-4.2 2.8 1.2-5-4-3.5 5-.5z"/>','<circle cx="13" cy="13" r="5" fill="none" stroke="#fff" stroke-width="1.6"/>','<path d="M13 7l6 11H7z"/>'];
function pat(k){return 'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="#fff" fill-opacity=".14">'+PS[k]+'</svg>')+'")'}
function bdStyle(a){return 'background:'+pat(a.sy)+' 0 0/26px 26px,radial-gradient(circle at 50% 40%,'+a.bd[1]+','+a.bd[2]+')'}

/* ---------- BUILD ITEMS ---------- */
var std=[],seen={};
function add(map,fl){Object.keys(map).forEach(function(cat){
  var raw=map[cat];raw=typeof raw==='string'?raw.split(','):raw;
  var l=raw.filter(function(x){var c=x.split('|')[0].trim();if(!c||seen[c])return false;return seen[c]=1}),P=PG[cat];
  l.forEach(function(x,j){var p=x.split('|');std.push({id:'s'+(fl?'f':'n')+p[0].trim(),k:'s',fl:fl,name:(p[1]||p[0]).trim(),f:p[0].trim(),ch:'\u2728',cat:cat,price:P[Math.floor(j*P.length/l.length)]})});
})}
add(S,0);add(SF,1);
std.sort(function(a,b){return a.price-b.price});
var M=C.length,col=C.map(function(f,i){
  var h=H(f),sup=Math.round(8000*Math.pow(.0125,i/(M-1))),md=MD[(h>>>8)%MD.length];
  return{id:'c'+i,k:'c',name:ADJ[i%ADJ.length]+' '+f.toLowerCase(),f:f,ch:'\uD83C\uDF81',price:Math.round(300*Math.pow(300,i/(M-1))),supply:sup,
    st:i>=M-6?'s':(i%9===4?'l':'r'),rar:sup>=4000?'Common':sup>=1500?'Rare':sup>=500?'Epic':'Legendary',
    a:{bd:BD[h%12],sy:(h>>>4)%6,md:md,serial:1+(h>>>12)%sup}};
});
ITEMS=std.concat(col);

/* ---------- STYLE ---------- */
var st=document.createElement('style');
st.textContent='.chips{display:flex;gap:8px;overflow-x:auto;padding:0 2px 12px;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}.chips button{flex:none;padding:7px 14px;border-radius:16px;background:var(--card);color:var(--mu);font-size:13px}.chips .on{background:var(--tx);color:#0F131D;font-weight:600}'
+'.t.cb .pr{background:rgba(10,12,20,.6)}.big.bd{height:190px;position:relative;overflow:hidden}.rar{font-size:11px;font-weight:600;padding:2px 9px;border-radius:10px;background:rgba(0,0,0,.35)}'
+'.pc{font-style:normal;font-size:11px;background:#232838;color:#C9BDFF;border-radius:10px;padding:2px 7px;margin-left:6px}'
+'.big .ic{animation:fl 3.2s ease-in-out infinite}@keyframes fl{50%{transform:translateY(-6px)}}.lgd{animation:gl 2.4s ease-in-out infinite}@keyframes gl{50%{box-shadow:0 0 34px #FFC85766}}'
+'.rays{position:absolute;width:420px;height:420px;border-radius:50%;background:repeating-conic-gradient(rgba(255,200,87,.16) 0 8deg,transparent 8deg 24deg);-webkit-mask:radial-gradient(circle,#000 20%,transparent 68%);mask:radial-gradient(circle,#000 20%,transparent 68%);animation:rt 14s linear infinite}@keyframes rt{to{transform:rotate(360deg)}}'
+'.rg{position:absolute;top:42%;left:50%;width:40px;height:40px;margin:-20px;border-radius:50%;border:3px solid #FFC857;opacity:0;animation:rgo 1.1s ease-out forwards}@keyframes rgo{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(9)}}'
+'#bu .ic,#bu h2,#bu p,#bu .bt{position:relative}'
+'.ic.m0{animation:mb ease-in-out infinite}@keyframes mb{50%{transform:translateY(-6px)}}'
+'.ic.m1{animation:ms ease-in-out infinite;transform-origin:50% 90%}@keyframes ms{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}'
+'.ic.m2{animation:mp ease-in-out infinite}@keyframes mp{50%{transform:scale(1.12)}}'
+'.ic.m3{animation:mw ease-in-out infinite}@keyframes mw{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-5px) rotate(4deg)}}'
+'.ic.m4{animation:mt ease-in-out infinite}@keyframes mt{0%,100%{transform:perspective(200px) rotateY(-20deg)}50%{transform:perspective(200px) rotateY(20deg)}}'
+'.ic.m5{animation:mj ease-in infinite;transform-origin:50% 100%}@keyframes mj{0%,60%,100%{transform:translateY(0) scale(1,1)}75%{transform:translateY(-8px) scale(.96,1.05)}90%{transform:translateY(0) scale(1.06,.94)}}'
+'.t.fm:after{content:"";position:absolute;top:16%;right:20%;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:-30px 28px 0 -1px rgba(255,255,255,.55);animation:sp 2.6s ease-in-out infinite;pointer-events:none}@keyframes sp{50%{opacity:.15;transform:scale(.4)}}';
document.head.appendChild(st);

/* ---------- IMAGE SOURCE: Fluent 3D for collectibles and Fluent-based gifts, Noto Animated for the rest ---------- */
src=function(it){return (it.k==='c'||it.fl)?'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets/'+encodeURIComponent(it.f)+'/3D/'+it.f.toLowerCase().replace(/ /g,'_')+'_3d.png':'https://fonts.gstatic.com/s/e/notoemoji/latest/'+it.f+'/512.webp'};

/* ---------- RENDER ---------- */
var chip='All',lastTab='all';
var CS=['All','Love','Celebrate','Treats','Fun','Nature','Luxury'],CC=['All','Resale','Limited','Premium','Sold out'];
function im(it){var m=(it.k==='c'||it.fl),h=H(it.id),f=it.k==='c'&&it.a.md[1]!=='none'?'filter:'+it.a.md[1]+';':'';
  return '<img class="ic'+(m?' m'+h%6:'')+'" style="'+(m?'animation-duration:'+(2.4+(h>>>3)%14/10).toFixed(1)+'s;animation-delay:-'+((h>>>7)%30/10).toFixed(1)+'s;':'')+f+'" src="'+src(it)+'" alt="" loading="lazy" onerror="var t=this.closest(\'.t\');t?t.remove():this.remove()">'}
function inChip(it){
  if(chip==='All')return true;
  if(it.k==='s')return it.cat===chip;
  return chip==='Resale'?it.st==='r':chip==='Limited'?it.st==='l':chip==='Premium'?it.price>=5000:it.st==='s';
}
tile=function(it){
  var c=it.k==='c',rb=it.st==='r'?'<span class="rb">resale</span>':it.st==='s'?'<span class="rb s">sold out</span>':it.st==='l'?'<span class="rb l">limited</span>':'';
  return '<button class="t'+(c?' cb':'')+((c||it.fl)?' fm':'')+(it.st==='s'?' so':'')+(c&&it.price>=10000?' gold':'')+'" data-id="'+it.id+'"'+(c?' style="'+bdStyle(it.a)+'"':'')+'>'+rb+im(it)+pill(it.price,it.st==='r')+'</button>';
};
render=function(){
  if(lastTab!==tab){chip='All';lastTab=tab}
  var k=tab==='all'?'s':'c',cs=k==='s'?CS:CC;
  $('#gr').innerHTML='<div class="chips">'+cs.map(function(c){return '<button data-c="'+c+'"'+(c===chip?' class="on"':'')+'>'+c+'</button>'}).join('')+'</div>'
    +'<div class="g">'+ITEMS.filter(function(i){return i.k===k&&inChip(i)}).map(tile).join('')+'</div>';
  document.querySelectorAll('.tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===tab)});
};
document.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(b){chip=b.dataset.c;render()}});

/* ---------- SEND SHEET ---------- */
drawSheet=function(){
  var it=sel.it,low=bal<total(),c=it.k==='c',a=it.a,rows='',sub,big;
  if(c){
    sub='<span class="rar" style="color:'+RC[it.rar]+'">'+it.rar+'</span> \u00b7 #'+fmt(a.serial)+' of '+fmt(it.supply)+' \u00b7 for '+esc(toName);
    big='<div class="big bd'+(it.rar==='Legendary'?' lgd':'')+'" style="'+bdStyle(a)+'">'+im(it)+'</div>';
    rows='<div class="row"><span>Model</span><span>'+a.md[0]+'<i class="pc">'+a.md[2]+'%</i></span></div>'
      +'<div class="row"><span>Backdrop</span><span>'+a.bd[0]+'<i class="pc">'+a.bd[3]+'%</i></span></div>'
      +'<div class="row"><span>Symbol</span><span>'+SY[a.sy][0]+'<i class="pc">'+SY[a.sy][1]+'%</i></span></div>';
  }else{sub='Animated gift \u00b7 for '+esc(toName);big='<div class="big">'+im(it)+'</div>'}
  $('#sh').innerHTML='<div class="sheet" onclick="event.stopPropagation()"><div class="hd"></div>'+big
  +'<div class="nm">'+esc(it.name)+'</div><div class="sb">'+sub+'</div>'+rows
  +'<textarea id="msg" maxlength="120" placeholder="Add a message (optional)"></textarea>'
  +(c?'':'<div class="row"><span>Quantity</span><div class="qs"><button data-q="-1">\u2212</button><b>'+sel.qty+'</b><button data-q="1">+</button></div></div>')
  +'<div class="row"><span>Send anonymously</span><button class="sw'+(sel.anon?' on':'')+'" id="an" aria-label="Anonymous"></button></div>'
  +'<div class="row"><span>Total</span><b style="display:flex;gap:5px;align-items:center"><svg class="hx"><use href="#hx"/></svg>'+fmt(total())+'</b></div>'
  +'<div class="row" style="border:0"><span>Balance after</span><span style="color:'+(low?'#F09595':'var(--tx)')+'">'+fmt(Math.max(bal-total(),0))+'</span></div>'
  +'<button class="cta" id="go">'+(low?'Top up to send':'Send '+esc(it.name)+' \u00b7 '+fmt(total()))+'</button></div>';
};

/* ---------- SEND EFFECT (CSS rays + rings + confetti; optional Lottie via GiftConfig.lottie.burst) ---------- */
burst=function(it){
  var cs=['#FFC857','#7C5CFF','#2ED3C6','#FF5C8A','#fff'],h='<div class="rays" style="top:calc(42% - 210px);left:calc(50% - 210px)"></div><i class="rg"></i><i class="rg" style="animation-delay:.25s;border-color:#7C5CFF"></i><i class="rg" style="animation-delay:.5s;border-color:#2ED3C6"></i>';
  for(var i=0;i<64;i++){var a=Math.random()*6.28,d=90+Math.random()*230;
    h+='<i class="cf" style="background:'+cs[i%5]+';--x:'+Math.round(Math.cos(a)*d)+'px;--y:'+Math.round(Math.sin(a)*d)+'px;--r:'+Math.round(Math.random()*720)+'deg;animation-delay:'+(i%8)*.04+'s"></i>'}
  $('#bu').innerHTML=h+'<div id="lt" style="position:absolute;inset:0;pointer-events:none"></div>'+im(it).replace('loading="lazy"','')
    +'<h2>Gift sent</h2><p>'+esc(toName)+' received '+esc(it.name)+(sel.qty>1?' \u00d7'+sel.qty:'')+'</p><div class="bt"><button id="dn">Done</button><button class="m" id="ag">Send again</button></div>';
  $('#bu').classList.add('on');buzz();
  var u=(CFG.lottie||{}).burst;if(!u)return;
  function go(){lottie.loadAnimation({container:$('#lt'),renderer:'svg',loop:false,autoplay:true,path:u})}
  if(window.lottie)go();else{var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js';s.onload=go;document.head.appendChild(s)}
};

render();
})();
