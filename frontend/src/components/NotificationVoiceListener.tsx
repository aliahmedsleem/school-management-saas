import {useEffect,useRef} from "react";
import {api} from "../services/api";

/** Polls notifications while the user is logged in, even outside the inbox page. */
export default function NotificationVoiceListener(){
 const initialized=useRef(false);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  let active=true,working=false;
  async function check(){
   if(!active||working||document.visibilityState!=="visible")return;
   working=true;
   try{
    const result=await api.notifications();
    if(!active)return;
    const fresh=result.items.filter(n=>!n.read_at&&!seen.current.has(n.id));
    if(initialized.current&&fresh.length&&localStorage.getItem("schoolcloud_voice_enabled")==="yes"&&"speechSynthesis" in window){
     const speech=new SpeechSynthesisUtterance(fresh[0].body);
     speech.lang="ar-IQ";speech.rate=.92;
     const voices=window.speechSynthesis.getVoices();
     speech.voice=voices.find(v=>v.lang.toLowerCase()==="ar-iq")||voices.find(v=>v.lang.toLowerCase().startsWith("ar"))||null;
     window.speechSynthesis.cancel();
     window.speechSynthesis.speak(speech);
    }
    seen.current=new Set(result.items.map(n=>n.id));
    initialized.current=true;
   }catch{/* Inbox shows API errors; polling is best-effort. */}
   finally{working=false;}
  }
  void check();
  const timer=window.setInterval(()=>void check(),20000);
  document.addEventListener("visibilitychange",check);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",check);if("speechSynthesis" in window)window.speechSynthesis.cancel();};
 },[]);
 return null;
}
