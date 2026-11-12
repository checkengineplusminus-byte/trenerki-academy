import React,{useEffect,useRef} from 'react';
import {supabase} from '../src/supabase';
// @ts-ignore — moduł przeglądarkowy bez dodatkowych zależności.
import {mountLab} from '../src/accounting/lab-ui.js';
export default function AccountingLab(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>root.current?mountLab(root.current,supabase):undefined,[]);
 return <div ref={root} style={{height:'100%',overflowY:'auto'}}/>;
}
