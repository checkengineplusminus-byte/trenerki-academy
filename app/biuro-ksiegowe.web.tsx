import React,{useEffect,useRef} from 'react';
import {supabase} from '../src/supabase';
// @ts-ignore — moduł przeglądarkowy bez dodatkowych zależności.
import {mountLab} from '../src/accounting/lab-ui.js';
export default function AccountingLab(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>root.current?mountLab(root.current,supabase):undefined,[]);
 const terms=[['NIP','slownik-nip'],['REGON','slownik-regon'],['KRS','slownik-krs'],['KSeF','slownik-ksef']];
 return <div style={{height:'100%',overflowY:'auto'}}>
  <nav aria-label="Kurs i objaśnienia pojęć w pracowni" style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',padding:'12px 24px',background:'#eaf3df',fontFamily:'system-ui,sans-serif',color:'#183c2b'}}>
   <a href="/ksiegowosc" style={{color:'#235d35',fontWeight:800}}>← Lekcje i wyszukiwarka kursu</a>
   <strong>Nie znasz skrótu?</strong>{terms.map(([label,key])=><a key={key} href={'/slownik-ksiegowego?entry='+key} style={{color:'#235d35',fontWeight:700}}>{label}</a>)}
   <a href="/slownik-ksiegowego" style={{color:'#235d35',fontWeight:700}}>Cały słownik →</a>
  </nav>
  <div ref={root}/>
 </div>;
}
