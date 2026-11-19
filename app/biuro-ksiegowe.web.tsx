import React,{useEffect,useRef} from 'react';
import {supabase} from '../src/supabase';
import {useLocalSearchParams} from 'expo-router';
// @ts-ignore — plain JS guard for allowed workbook tabs.
import {normalizeLabTab} from '../src/accounting/lab-navigation.js';
// @ts-ignore — moduł przeglądarkowy bez dodatkowych zależności.
import {mountLab} from '../src/accounting/lab-ui.js';
export default function AccountingLab(){
 const root=useRef<HTMLDivElement>(null);
 const params=useLocalSearchParams<{tab?:string}>();
 const selectedTab=normalizeLabTab(typeof params.tab==='string'?params.tab:'start');
 useEffect(()=>root.current?mountLab(root.current,supabase,selectedTab):undefined,[selectedTab]);
 return <div style={{height:'100%',overflowY:'auto'}}>
  <div ref={root}/>
 </div>;
}
