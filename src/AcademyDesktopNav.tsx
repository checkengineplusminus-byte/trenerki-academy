import React from 'react';
import {Link,usePathname} from 'expo-router';

export default function AcademyDesktopNav({signedIn}:{signedIn:boolean}){
 const pathname=usePathname();
 const links=[
  {href:'/moje-kursy',label:'Moje kursy'},
  {href:'/moje-dyplomy',label:'Dyplomy'},
  {href:'/konto',label:signedIn?'Mój profil':'Zaloguj się'},
 ] as const;
 return <nav aria-label="Nawigacja akademii" style={{background:'#102C45',borderBottom:'2px solid #C99A43',fontFamily:'system-ui, sans-serif'}}>
  <div style={{boxSizing:'border-box',maxWidth:1920,margin:'0 auto',padding:'6px 24px',display:'flex',gap:24,alignItems:'center'}}>
   <a href="/academy/index.html" style={{marginRight:'auto',color:'white',textDecoration:'none',fontWeight:800}}>TRENERKI <span style={{color:'#F1C876'}}>Academy</span></a>
   <a href="/academy/index.html#kursy" style={{color:'white',textDecoration:'none',fontWeight:650,padding:'12px 0'}}>Katalog kursów</a>
   {links.filter(link=>signedIn||link.href==='/konto').map(link=><Link key={link.href} href={link.href}
    aria-current={pathname===link.href?'page':undefined}
    style={{paddingVertical:12,paddingHorizontal:8,color:pathname===link.href?'#FFDD96':'white',fontWeight:'700'}}>{link.label}</Link>)}
  </div>
 </nav>;
}
