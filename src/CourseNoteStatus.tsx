import React from 'react';
import {View,Text,Pressable} from 'react-native';
type State={dirty:number;saving:boolean;localPending:boolean;localError:string;error:string;restored:boolean;conflicts:Record<string,string>};
export default function CourseNoteStatus({state,lesson,onResolve}:{state:State|null;lesson:number;onResolve:(remote:boolean)=>void}){
 if(!state)return null;
 const conflict=Object.prototype.hasOwnProperty.call(state.conflicts,String(lesson));
 const storageMessage=state.localError&&!state.dirty&&!state.saving&&!state.error
  ?'Wyświetlona wersja pochodzi z konta. Kopia szkicu na urządzeniu jest niedostępna.':state.localError;
 const text=storageMessage||state.error||(state.saving?'Zapisywanie notatek na koncie…':state.dirty
  ?state.localPending?'Zachowywanie szkicu na urządzeniu…':(state.restored?'Przywrócono niewysłany szkic. ':'')+'Szkic zachowany na tym urządzeniu. Zapisz zadanie, aby mieć je na koncie i drugim urządzeniu.':'');
 if(!text&&!conflict)return null;
 return <View testID="course-note-status" style={{padding:14,borderRadius:12,borderWidth:1,borderColor:'#E4C98F',backgroundColor:'#FFF7E5',gap:10,marginVertical:12}}>
  {!!text&&<Text accessibilityLiveRegion="polite" style={{color:'#14263B',lineHeight:22}}>{text}</Text>}
  {conflict&&<View testID="course-note-conflict" style={{gap:10}}>
   <Text style={{fontWeight:'800',color:'#14263B'}}>Wersja zapisana na koncie:</Text>
   <Text selectable style={{color:'#43596F',lineHeight:22}}>{state.conflicts[String(lesson)]||'(Pusta notatka)'}</Text>
   <Text style={{color:'#43596F',lineHeight:21}}>Twój szkic nadal jest w polu zadania poniżej. Porównaj obie wersje przed zapisem.</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
    <Pressable accessibilityRole="button" disabled={state.saving} onPress={()=>onResolve(true)} style={{padding:12,minHeight:44,borderRadius:9,backgroundColor:'#EDF2F8'}}><Text style={{color:'#14263B',fontWeight:'800'}}>Wczytaj wersję z konta</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={state.saving} onPress={()=>onResolve(false)} style={{padding:12,minHeight:44,borderRadius:9,backgroundColor:'#E7BB5B'}}><Text style={{color:'#14263B',fontWeight:'800'}}>Porównałem — zachowaj mój szkic</Text></Pressable>
   </View>
  </View>}
 </View>;
}
