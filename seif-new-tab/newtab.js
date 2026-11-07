const $=s=>document.querySelector(s);
const body=document.body,video=$('#wallVideo'),shade=$('#shade'),dialog=$('#wallDialog');
let items=[],current=0,rotation=null,previewUrl=null,colorTimer=null,lastColor='gold';
const DB='seif-hub-wallpapers',STORE='media';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbAll(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbAdd(file){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).add({name:file.name,type:file.type,blob:file,added:Date.now()});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbDelete(id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}
function isVideo(x){return x.type.startsWith('video/')}
function revoke(x){if(x?.url)URL.revokeObjectURL(x.url)}
function makeUrl(x){if(x.url)return x.url;x.url=URL.createObjectURL(x.blob);return x.url}
function applySettings(){const fit=$('#fit').value;video.style.objectFit=fit;$('#previewVideo').style.objectFit=fit;$('#previewImage').style.objectFit=fit;const d=Number($('#darkness').value)/100,b=Number($('#blur').value);shade.style.background='rgba(0,0,0,'+d+')';shade.style.backdropFilter='blur('+b+'px)';$('#previewShade').style.background='rgba(0,0,0,'+d+')';$('#previewShade').style.backdropFilter='blur('+b+'px)';}
function showItem(index){if(!items.length){video.pause();video.removeAttribute('src');video.load();video.style.display='none';return}current=(index+items.length)%items.length;const item=items[current],url=makeUrl(item);if(isVideo(item)){$('.wallpaper').style.backgroundImage='none';video.style.display='block';video.src=url;video.play().catch(()=>{});}else{video.pause();video.style.display='none';video.removeAttribute('src');$('.wallpaper').style.backgroundImage='url("'+url+'")'}$('#previewVideo').pause();$('#previewVideo').removeAttribute('src');$('#previewImage').style.display=isVideo(item)?'none':'block';$('#previewVideo').style.display=isVideo(item)?'block':'none';if(isVideo(item)){$('#previewVideo').src=url;$('#previewVideo').play().catch(()=>{})}else $('#previewImage').src=url;$('#previewLabel').textContent=item.name;startColorAnalysis()}
function renderList(){const root=$('#wallList');root.replaceChildren();if(!items.length){const p=document.createElement('p');p.className='empty';p.textContent='لم تضف خلفيات بعد. اختر فيديوهات أو صوراً من جهازك.';root.append(p);return}items.forEach((item,i)=>{const row=document.createElement('div');row.className='wall-row';const name=document.createElement('button');name.className='wall-name';name.textContent=(i+1)+'. '+item.name;name.onclick=()=>showItem(i);const type=document.createElement('small');type.textContent=isVideo(item)?'فيديو':'صورة';const del=document.createElement('button');del.className='remove';del.textContent='حذف';del.onclick=async()=>{await dbDelete(item.id);revoke(item);items.splice(i,1);if(current>=items.length)current=0;renderList();showItem(current)};row.append(name,type,del);root.append(row)})}
function startRotation(){clearInterval(rotation);const minutes=Number($('#interval').value)||3;if(items.length>1)rotation=setInterval(()=>showItem(current+1),minutes*60000)}
function applyMode(mode){body.classList.toggle('mode-hacker',mode==='hacker');body.classList.toggle('mode-calm',mode==='calm');$('#modeHacker').classList.toggle('active',mode==='hacker');$('#modeCalm').classList.toggle('active',mode==='calm');localStorage.setItem('seif-hub-mode',mode)}
function updateClock(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString('ar-TN',{hour:'2-digit',minute:'2-digit'});$('#dateLine').textContent=d.toLocaleDateString('ar-TN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});setTimeout(updateClock,15000)}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0,s=0,l=(max+min)/2;if(delta){s=delta/(1-Math.abs(2*l-1));switch(max){case r:h=((g-b)/delta)%6;break;case g:h=(b-r)/delta+2;break;default:h=(r-g)/delta+4}h*=60;if(h<0)h+=360}return {h,s,l}}
function analyzeFrame(){if(!$('#autoColor').checked||!video.src||video.readyState<2||!video.videoWidth)return;try{const c=document.createElement('canvas');c.width=48;c.height=27;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,c.width,c.height);const data=ctx.getImageData(0,0,c.width,c.height).data;let rs=0,gs=0,bs=0,n=0,hues=[0,0,0,0,0,0];for(let i=0;i<data.length;i+=16){const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b);if(max<65)continue;const hsl=rgbToHsl(r,g,b);if(hsl.l<.24)continue;rs+=r;gs+=g;bs+=b;n++;if(hsl.s>.22)hues[Math.floor(hsl.h/60)%6]++}if(n<8)return;const hueIndex=hues.indexOf(Math.max(...hues));let hue=hueIndex<0?lastColor:[0,60,120,180,240,300][hueIndex];if(hues[hueIndex]===0)return;lastColor=hue;const textColor='hsl('+hue+' 92% 72%)';body.style.setProperty('--adaptive-color',textColor);body.style.setProperty('--adaptive-glow','hsl('+hue+' 95% 55% / .42)');$('#colorStatus').textContent='لون الفيديو المكتشف: '+['أحمر','برتقالي','أخضر','سماوي','أزرق','بنفسجي'][hueIndex];}catch(e){$('#colorStatus').textContent='تحليل اللون غير متاح لهذا الفيديو'}}
function startColorAnalysis(){clearInterval(colorTimer);if(video.src)colorTimer=setInterval(analyzeFrame,1800)}
function saveSettings(){localStorage.setItem('seif-hub-settings',JSON.stringify({light:body.classList.contains('light'),interval:$('#interval').value,fit:$('#fit').value,darkness:$('#darkness').value,blur:$('#blur').value,autoColor:$('#autoColor').checked}))}
async function init(){try{items=await dbAll();items.forEach(x=>x.url=null);renderList();if(items.length)showItem(0)}catch(e){$('#wallStatus').textContent='تعذر فتح مساحة تخزين الخلفيات في هذا المتصفح.'}const saved=JSON.parse(localStorage.getItem('seif-hub-settings')||'{}');if(saved.light)body.classList.add('light');$('#interval').value=saved.interval||'3';$('#fit').value=saved.fit||'cover';$('#darkness').value=saved.darkness??35;$('#blur').value=saved.blur??0;$('#autoColor').checked=saved.autoColor!==false;$('#studioAutoColor').checked=$('#autoColor').checked;applySettings();applyMode(localStorage.getItem('seif-hub-mode')||'hacker');if(items.length)startRotation();updateClock()}
$('#theme').onclick=()=>{body.classList.toggle('light');saveSettings()};
$('#modeHacker').onclick=()=>applyMode('hacker');$('#modeCalm').onclick=()=>applyMode('calm');
$('#focusToggle').onclick=()=>{body.classList.toggle('focus-mode');$('#focusToggle').textContent=body.classList.contains('focus-mode')?'إنهاء التركيز':'وضع التركيز'};
$('#search').onsubmit=e=>{e.preventDefault();const q=$('#q').value.trim();if(!q)return;const engine=$('#searchEngine').value;const bases={google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q=',duck:'https://duckduckgo.com/?q=',youtube:'https://www.youtube.com/results?search_query='};const url=/^https?:\/\//i.test(q)?q:bases[engine]+encodeURIComponent(q);location.href=url};
$('#toolSearch').oninput=()=>{const q=$('#toolSearch').value.trim().toLowerCase();document.querySelectorAll('.tool').forEach(x=>x.hidden=!x.dataset.name.toLowerCase().includes(q))};
$('#wallpaperOpen').onclick=()=>{dialog.showModal();applySettings()};
$('#wallClose').onclick=()=>dialog.close();
$('#wallFiles').onchange=async e=>{const files=[...e.target.files].filter(f=>f.type.startsWith('video/')||f.type.startsWith('image/'));for(const f of files){try{const id=await dbAdd(f);items.push({id,name:f.name,type:f.type,blob:f,url:null})}catch(err){$('#wallStatus').textContent='تعذر حفظ ملف: '+f.name}}e.target.value='';renderList();if(items.length)showItem(items.length-1)};
['interval','fit','darkness','blur'].forEach(id=>$('#'+id).addEventListener('input',()=>{applySettings();if(id==='interval')startRotation()}));
$('#autoColor').onchange=()=>{saveSettings();if(!$('#autoColor').checked){body.style.removeProperty('--adaptive-color');$('#colorStatus').textContent='الألوان الافتراضية'}else analyzeFrame()};
$('#studioAutoColor').onchange=()=>{$('#autoColor').checked=$('#studioAutoColor').checked;saveSettings()};
$('#shuffle').onclick=()=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]]}current=0;renderList();showItem(0)};
$('#rotateNow').onclick=()=>showItem(current+1);
$('#wallSave').onclick=()=>{saveSettings();startRotation();if(items.length)showItem(current);dialog.close()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(items.length&&isVideo(items[current]))video.play().catch(()=>{})});
init();

// Seif Hub extended workspace: themes, draggable cards, local tools and audio.
const hubModes=['hacker','calm','cyber','luxury'];
function setHubMode(mode){
 if(!hubModes.includes(mode))mode='hacker';
 hubModes.forEach(m=>body.classList.toggle('mode-'+m,mode===m));
 ['Hacker','Calm','Cyber','Luxury'].forEach((label,i)=>{const b=$('#mode'+label);if(b)b.classList.toggle('active',hubModes[i]===mode)});
 localStorage.setItem('seif-hub-mode',mode);
}
$('#modeHacker').onclick=()=>setHubMode('hacker');
$('#modeCalm').onclick=()=>setHubMode('calm');
$('#modeCyber').onclick=()=>setHubMode('cyber');
$('#modeLuxury').onclick=()=>setHubMode('luxury');
// Replace the earlier two-mode initializer while preserving the stored selection.
const previousInitMode=localStorage.getItem('seif-hub-mode')||'hacker';setHubMode(previousInitMode);
// Local AI helper: transparent, deterministic assistance; no fake cloud-AI claims.
const aiReplies=[
 [/طقس|الجو/i,'افتح بطاقة الطقس واضغط تحديث. سيطلب المتصفح إذن الموقع ثم يجلب بيانات الطقس من خدمة Open-Meteo.'],
 [/مهمة|مهام|تنظيم|وقت/i,'قسّم العمل إلى مهام صغيرة، واكتب أول خطوة قابلة للإنجاز في قائمة المهام. يمكنك تحديد المهمة عند إكمالها.'],
 [/ملاحظة|ملاحظات/i,'اكتب في بطاقة ملاحظاتي؛ تُحفظ تلقائياً على هذا الجهاز داخل المتصفح.'],
 [/موسيقى|صوت/i,'اختر ملفات صوتية من جهازك في مشغل الموسيقى. الملفات لا تُرفع إلى أي خادم.'],
 [/خلفية|فيديو|ألوان/i,'من استوديو الخلفيات أضف صوراً أو فيديوهات واضبط التعتيم والتمويه والتبديل التلقائي.'],
 [/اختصار|بحث|متصفح/i,'اكتب عبارة في مربع البحث واختر محرك البحث. ويمكنك سحب بطاقات مساحة العمل لتغيير ترتيبها.']
];
$('#aiForm').onsubmit=e=>{e.preventDefault();const q=$('#aiInput').value.trim();if(!q)return;const box=$('#aiMessages');const user=document.createElement('p');user.className='user-bubble';user.textContent=q;box.append(user);const found=aiReplies.find(x=>x[0].test(q));const answer=found?found[1]:'أستطيع مساعدتك في الطقس والمهام والملاحظات والموسيقى والخلفيات. اكتب سؤالك بصورة أكثر تحديداً. هذا الإصدار محلي ولا يدّعي الاتصال بنموذج سحابي.';const reply=document.createElement('p');reply.className='ai-bubble';reply.textContent=answer;box.append(reply);box.scrollTop=box.scrollHeight;$('#aiInput').value='';};
// Tasks and notes stored locally.
let tasks=JSON.parse(localStorage.getItem('seif-hub-tasks')||'[]');
function renderTasks(){const list=$('#taskList');list.replaceChildren();tasks.forEach((t,i)=>{const li=document.createElement('li');const cb=document.createElement('input');cb.type='checkbox';cb.checked=t.done;cb.onchange=()=>{tasks[i].done=cb.checked;persistTasks();renderTasks()};const span=document.createElement('span');span.textContent=t.text;if(t.done)span.className='done';const del=document.createElement('button');del.textContent='×';del.title='حذف';del.onclick=()=>{tasks.splice(i,1);persistTasks();renderTasks()};li.append(cb,span,del);list.append(li)});$('#taskCount').textContent=tasks.length+' مهام';}
function persistTasks(){localStorage.setItem('seif-hub-tasks',JSON.stringify(tasks))}
$('#taskForm').onsubmit=e=>{e.preventDefault();const v=$('#taskInput').value.trim();if(!v)return;tasks.push({text:v,done:false});persistTasks();renderTasks();$('#taskInput').value=''};
$('#notesInput').value=localStorage.getItem('seif-hub-notes')||'';
$('#notesInput').addEventListener('input',()=>localStorage.setItem('seif-hub-notes',$('#notesInput').value));
renderTasks();
// Calendar uses the browser's native date picker and local date formatting.
const today=new Date();$('#calendarDate').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
$('#calendarMonth').textContent=today.toLocaleDateString('ar-TN',{month:'long',year:'numeric'});
$('#calendarDay').textContent=today.toLocaleDateString('ar-TN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
$('#calendarDate').onchange=()=>{if($('#calendarDate').value){const d=new Date($('#calendarDate').value+'T12:00:00');$('#calendarDay').textContent=d.toLocaleDateString('ar-TN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}};
// Weather: geolocation + Open-Meteo public endpoint, no API key.
$('#weatherRefresh').onclick=()=>{const out=$('#weatherInfo');if(!navigator.geolocation){out.textContent='تحديد الموقع غير مدعوم في هذا المتصفح.';return}out.textContent='جارٍ تحديد موقعك...';navigator.geolocation.getCurrentPosition(async p=>{try{const url='https://api.open-meteo.com/v1/forecast?latitude='+p.coords.latitude+'&longitude='+p.coords.longitude+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto';const r=await fetch(url);if(!r.ok)throw Error('weather');const d=await r.json(),c=d.current;const codes={0:'سماء صافية',1:'غالباً صافٍ',2:'غائم جزئياً',3:'غائم',45:'ضباب',48:'ضباب متجمد',51:'رذاذ خفيف',61:'مطر خفيف',63:'مطر',65:'مطر غزير',71:'ثلوج',80:'زخات مطر',95:'عواصف رعدية'};out.textContent='🌡 '+Math.round(c.temperature_2m)+'°C · '+(codes[c.weather_code]||'حالة جوية متغيرة')+' · رطوبة '+c.relative_humidity_2m+'% · رياح '+c.wind_speed_10m+' كم/س';}catch(e){out.textContent='تعذر جلب الطقس. تحقق من الاتصال وحاول مجدداً.'}},()=>{out.textContent='لم يُسمح بالوصول إلى الموقع. يمكنك تفعيل إذن الموقع من إعدادات المتصفح.'},{timeout:10000,maximumAge:600000})};
// Local music playlist.
let tracks=[],trackIndex=0,musicUrl=null;
function playTrack(i){if(!tracks.length)return;trackIndex=(i+tracks.length)%tracks.length;if(musicUrl)URL.revokeObjectURL(musicUrl);musicUrl=URL.createObjectURL(tracks[trackIndex]);$('#musicPlayer').src=musicUrl;$('#musicName').textContent=tracks[trackIndex].name;$('#musicPlayer').play().catch(()=>{});}
$('#musicFiles').onchange=e=>{tracks.push(...Array.from(e.target.files).filter(f=>f.type.startsWith('audio/')));if(tracks.length)playTrack(tracks.length-1);e.target.value=''};
$('#musicPrev').onclick=()=>playTrack(trackIndex-1);$('#musicNext').onclick=()=>playTrack(trackIndex+1);$('#musicPlayer').onended=()=>playTrack(trackIndex+1);
// Drag/drop ordering for tool tiles and workspace cards.
function enableDrag(container,selector,key){const root=$(container);if(!root)return;let dragged=null;const saved=JSON.parse(localStorage.getItem(key)||'[]');saved.forEach(id=>{const el=Array.from(root.querySelectorAll(selector)).find(x=>x.dataset.dragId===id);if(el)root.append(el)});root.querySelectorAll(selector).forEach((el,i)=>{if(!el.dataset.dragId)el.dataset.dragId=el.id||('item-'+i);el.draggable=true;el.addEventListener('dragstart',()=>{dragged=el;el.classList.add('dragging')});el.addEventListener('dragend',()=>{el.classList.remove('dragging');dragged=null;localStorage.setItem(key,JSON.stringify(Array.from(root.querySelectorAll(selector)).map(x=>x.dataset.dragId)))});el.addEventListener('dragover',e=>{e.preventDefault();if(!dragged||dragged===el)return;const r=el.getBoundingClientRect();const after=(e.clientY-r.top)>r.height/2;root.insertBefore(dragged,after?el.nextSibling:el)})})}
enableDrag('#toolGrid','.tool','seif-hub-tool-order');enableDrag('#suiteGrid','.suite-card','seif-hub-card-order');
$('#suiteToggle').onclick=()=>{const grid=$('#suiteGrid');grid.hidden=!grid.hidden;$('#suiteToggle').textContent=grid.hidden?'إظهار الأدوات':'إخفاء الأدوات'};
// Gentle pointer parallax + video luminance response, without affecting text contrast.
let pointerX=0,pointerY=0;document.addEventListener('pointermove',e=>{pointerX=(e.clientX/innerWidth-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2;body.style.setProperty('--pointer-x',pointerX.toFixed(2));body.style.setProperty('--pointer-y',pointerY.toFixed(2))},{passive:true});
const oldAnalyzeFrame=analyzeFrame;
analyzeFrame=function(){oldAnalyzeFrame();if(video.readyState>=2){try{const c=document.createElement('canvas');c.width=12;c.height=8;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(video,0,0,12,8);const a=x.getImageData(0,0,12,8).data;let lum=0,n=0;for(let i=0;i<a.length;i+=16){const l=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];if(l>28){lum+=l;n++}}if(n)body.style.setProperty('--video-energy',String(Math.min(1,lum/n/190)))}catch(e){}}};

// Optional lightweight UI sound effects (Web Audio, generated locally).
let soundEnabled=localStorage.getItem('seif-hub-sounds')!=='off',audioContext=null;
function playUiTone(kind){if(!soundEnabled)return;try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;audioContext=audioContext||new Ctx();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();const now=audioContext.currentTime;osc.type='sine';osc.frequency.setValueAtTime(kind==='link'?660:kind==='toggle'?520:790,now);osc.frequency.exponentialRampToValueAtTime(kind==='toggle'?390:kind==='link'?520:560,now+.065);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.085);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+.09)}catch(e){}}
function updateSoundButton(){const b=$('#soundToggle');if(!b)return;b.textContent='الصوت: '+(soundEnabled?'تشغيل':'إيقاف');b.setAttribute('aria-pressed',String(soundEnabled))}
$('#soundToggle').onclick=()=>{soundEnabled=!soundEnabled;localStorage.setItem('seif-hub-sounds',soundEnabled?'on':'off');updateSoundButton();if(soundEnabled)playUiTone('toggle')};
document.addEventListener('click',e=>{const target=e.target.closest('button,a,.tool');if(!target||target.id==='soundToggle')return;playUiTone(target.tagName==='A'?'link':'button')});
updateSoundButton();
// If the last wallpaper is removed, clear the previous image as well.
const originalShowItem=showItem;
showItem=function(index){if(!items.length){$('.wallpaper').style.backgroundImage='none';body.style.removeProperty('--video-energy');body.style.removeProperty('--adaptive-color');body.style.removeProperty('--adaptive-glow')}originalShowItem(index)};
