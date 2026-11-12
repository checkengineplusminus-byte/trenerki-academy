import React,{useEffect,useState} from 'react';
import {Platform,ScrollView,Text} from 'react-native';
import {supabase} from '../src/supabase';
import {categories,defaults,dial,emergency,safeContact,type Contact} from '../src/support/directory';
import {HelpFooter,HelpLink,helpTitle} from '../src/support/links';

const title='Bezpłatna pomoc i telefony zaufania – Trenerki.com';
const description='Zweryfikowane bezpłatne telefony zaufania w Polsce, wsparcie w kryzysie psychicznym, pomoc dla dzieci i rodzin oraz poradnictwo prawne i obywatelskie.';
const subtitle='Każdy z nas może znaleźć się w trudnej sytuacji. Nie musisz radzić sobie ze wszystkim samodzielnie. Przygotowaliśmy listę miejsc, w których możesz uzyskać bezpłatną pomoc, wsparcie i rozmowę ze specjalistą. Nie musisz zakładać konta ani kupować kursu.';

export default function SupportPage(){
 const [rows,setRows]=useState<Contact[]>(defaults);
 const [filter,setFilter]=useState('');
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  let active=true;
  function readHash(){
   const category=window.location.hash.slice(1);
   if(categories.some(([id])=>id===category))setFilter(category);
   else setFilter('');
  }
  readHash();
  window.addEventListener('hashchange',readHash);
  void supabase.from('ta_support_contacts').select('id,category,name,phone,url,description,hours,sort_order')
   .order('sort_order').then(({data,error})=>{
    if(!active||error||!data||data.length!==defaults.length||!data.every(safeContact))return;
    setRows(data);
   });
  return()=>{active=false;window.removeEventListener('hashchange',readHash);};
 },[]);
 if(Platform.OS!=='web')return <ScrollView contentContainerStyle={{padding:20,gap:14}}>
  <Text accessibilityRole="header">{helpTitle}</Text><Text>{subtitle}</Text>
  {[emergency,...rows].map(row=><React.Fragment key={row.id}><Text accessibilityRole="header">{row.name}</Text><Text>{row.description} {row.hours}</Text>
   {row.phone&&<HelpLink href={dial(row.phone)}>Zadzwoń {row.phone}</HelpLink>}<HelpLink href={row.url}>Odwiedź stronę</HelpLink></React.Fragment>)}
 </ScrollView>;
 const sections=categories.filter(([id])=>id!=='alarm'&&(!filter||filter===id)).slice()
  .sort(([a],[b])=>(rows.find(x=>x.category===a)?.sort_order||0)-(rows.find(x=>x.category===b)?.sort_order||0));
 return <div className="support-page" lang="pl">
   <title>{title}</title>
   <meta name="description" content={description}/>
   <meta property="og:title" content={title}/>
   <meta property="og:description" content={description}/>
   <link rel="canonical" href="https://trenerki.com/pomoc"/>
   <link rel="stylesheet" href="/academy/support.css" precedence="default"/>
  <a className="support-skip" href="#tresc">Przejdź do treści</a>
  <header className="support-header"><div className="support-wrap"><a href="/academy/index.html"><span aria-hidden="true">T.</span> TRENERKI Academy</a></div></header>
  <main className="support-wrap" id="tresc">
   <section className="support-intro">
    <h1>{helpTitle}</h1>
    <p>{subtitle}</p>
    <p className="support-country">Kontakty na tej stronie dotyczą Polski. Godziny podano według czasu polskiego.</p>
   </section>
   <section className="support-emergency" id="alarm" aria-labelledby="emergency-heading">
    <div>
     <h2 id="emergency-heading"><span aria-hidden="true">! </span>Nagłe zagrożenie życia</h2>
     <p>{emergency.description} {emergency.hours}</p>
     <a href={emergency.url}>Oficjalne informacje o numerze 112</a>
    </div>
    <a className="support-call" href="tel:112">Zadzwoń pod 112</a>
   </section>
   <section aria-labelledby="contacts-heading" className="support-directory">
    <h2 id="contacts-heading">Znajdź pomoc</h2>
    <div className="support-filters" role="group" aria-label="Filtruj kontakty według kategorii">
     <button type="button" aria-pressed={!filter} onClick={()=>setFilter('')}>Wszystkie</button>
     {categories.map(([id,name])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{name}</button>)}
    </div>
    <p className="support-sr" role="status">{filter==='alarm'?'Numer 112 jest w sekcji alarmowej powyżej.':`Widoczne kategorie: ${sections.length}`}</p>
    {filter==='alarm'&&<p><a href="#alarm">Przejdź do numeru alarmowego 112</a></p>}
    <div className="support-grid">
     {sections.map(([id,name,icon])=><section className="support-category" key={id} id={id} aria-labelledby={id+'-heading'}>
      <h2 id={id+'-heading'}><span className="support-icon" aria-hidden="true">{icon}</span>{name}</h2>
      {rows.filter(row=>row.category===id).map(row=><article className="support-card" key={row.id}>
       <h3>{row.name}</h3>
       {row.phone&&<p className="support-number">{row.phone}</p>}
       <p>{row.description}</p>
       <p className="support-hours">{row.hours}</p>
       <div className="support-actions">
        {row.phone&&<a className="support-call" href={dial(row.phone)} aria-label={'Zadzwoń pod '+row.phone+' – '+row.name}>Zadzwoń</a>}
        <a className="support-visit" href={row.url} rel="noreferrer" aria-label={'Odwiedź stronę – '+row.name}>Odwiedź stronę</a>
       </div>
      </article>)}
     </section>)}
    </div>
   </section>
  </main>
  <HelpFooter/>
 </div>;
}
