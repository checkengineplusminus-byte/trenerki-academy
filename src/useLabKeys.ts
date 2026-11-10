import {useEffect} from 'react';
import {Platform} from 'react-native';

export default function useLabKeys(testId:string,handle:(event:KeyboardEvent)=>boolean){
 useEffect(()=>{
  if(Platform.OS!=='web'||typeof document==='undefined')return;
  function onKey(event:KeyboardEvent){
   if(event.defaultPrevented||event.isComposing||!(event.target instanceof Element))return;
   if(event.target.closest('[data-testid="'+testId+'"]')&&handle(event))event.preventDefault();
  }
  document.addEventListener('keydown',onKey);
  return ()=>document.removeEventListener('keydown',onKey);
 },[testId,handle]);
}
