const ALARM_PREFIX = "seif-watch-";
const KEY = "seifWatchItems";
const cleanText = html => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&lt;/gi,"<")
  .replace(/&gt;/gi,">")
  .replace(/&quot;/gi,'"')
  .replace(/&#39;/gi,"'")
  .replace(/\s+/g," ").trim().slice(0,250000);
async function getItems(){const data=await chrome.storage.local.get(KEY);return data[KEY]||[]}
async function saveItems(items){await chrome.storage.local.set({[KEY]:items})}
async function checkItem(item){
  try{
    const response=await fetch(item.url,{cache:"no-store",credentials:"omit",redirect:"follow"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const text=cleanText(await response.text());
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
    const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
    const items=await getItems(),index=items.findIndex(x=>x.id===item.id);
    if(index<0)return;
    const current=items[index];
    if(current.lastHash && current.lastHash!==hash){
      const keywordFound=current.keyword && text.toLowerCase().includes(current.keyword.toLowerCase());
      chrome.notifications.create("watch-"+current.id+"-"+Date.now(),{type:"basic",iconUrl:chrome.runtime.getURL("icon.svg"),title:"Seif Watch · "+(keywordFound?"تغيّر الموقع / الكلمة موجودة":"تغيّر محتوى الموقع"),message:current.title||current.url});
      current.lastChange=Date.now();
    }
    current.lastHash=hash;current.lastChecked=Date.now();current.error="";
    items[index]=current;await saveItems(items);
  }catch(error){
    const items=await getItems(),index=items.findIndex(x=>x.id===item.id);
    if(index>=0){items[index].error=error.message||"تعذر فحص الموقع";items[index].lastChecked=Date.now();await saveItems(items)}
  }
}
async function runAll(force=false){
  const items=await getItems(),now=Date.now();
  for(const item of items)if(item.enabled&&(force||!item.lastChecked||now-item.lastChecked>=Math.max(5,item.interval||5)*60000))await checkItem(item);
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM_PREFIX+"scan")runAll(false)});
function schedule(){chrome.alarms.create(ALARM_PREFIX+"scan",{periodInMinutes:5})}
chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{
  if(msg?.type==="CHECK_NOW"){runAll(true).then(()=>sendResponse({ok:true}));return true}
});
