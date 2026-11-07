const ALARM_PREFIX = "seif-watch-";
const KEY = "seifWatchItems";
const cleanText = html => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,svg,nav,footer,header").forEach(n => n.remove());
  return (doc.body?.innerText || doc.body?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 250000);
};
async function getItems(){const data=await chrome.storage.local.get(KEY);return data[KEY]||[]}
async function saveItems(items){await chrome.storage.local.set({[KEY]:items})}
async function checkItem(item){
  try{
    const response=await fetch(item.url,{cache:"no-store",credentials:"omit",redirect:"follow"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const html=await response.text();
    const text=cleanText(html);
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
    const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
    const items=await getItems(), index=items.findIndex(x=>x.id===item.id);
    if(index<0)return;
    const current=items[index];
    if(current.lastHash && current.lastHash!==hash){
      const title=current.keyword ? (text.toLowerCase().includes(current.keyword.toLowerCase()) ? "تم العثور على الكلمة التي تراقبها أو تغيّر محتوى الصفحة" : "تغيّر محتوى الموقع") : "تغيّر محتوى الموقع";
      chrome.notifications.create("watch-"+current.id+"-"+Date.now(),{type:"basic",iconUrl:"",title:"Seif Watch · "+title,message:current.title||current.url});
      current.lastChange=Date.now();
    }
    current.lastHash=hash;current.lastChecked=Date.now();current.error="";
    items[index]=current;await saveItems(items);
  }catch(error){
    const items=await getItems(),index=items.findIndex(x=>x.id===item.id);
    if(index>=0){items[index].error=error.message||"تعذر فحص الموقع";items[index].lastChecked=Date.now();await saveItems(items)}
  }
}
async function runAll(){const items=await getItems();for(const item of items)if(item.enabled)await checkItem(item)}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM_PREFIX+"scan")runAll()});
chrome.runtime.onInstalled.addListener(()=>chrome.alarms.create(ALARM_PREFIX+"scan",{periodInMinutes:5}));
chrome.runtime.onStartup.addListener(()=>chrome.alarms.create(ALARM_PREFIX+"scan",{periodInMinutes:5}));
chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{
  if(msg?.type==="CHECK_NOW"){runAll().then(()=>sendResponse({ok:true}));return true}
});
