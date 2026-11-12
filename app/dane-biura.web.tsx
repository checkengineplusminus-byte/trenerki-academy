import React from 'react';
import CompanyIdentityWorkbench from '../src/accounting/CompanyIdentityWorkbench';
export default function WorkspaceIdentity(){return <div style={{height:'100%',overflowY:'auto'}}><div role="note" style={{padding:'14px 24px',backgroundColor:'#fff3da',color:'#5a431a',fontFamily:'system-ui',fontSize:14}}>Karta zapisuje rodzaj jednostki i dane dokumentów. Obecny dziennik pozostaje uproszczonym ćwiczeniem Wn/Ma; wybór JDG, spółki lub fundacji nie uruchamia jeszcze kompletnej KPiR, płac ani odrębnego rozliczenia tej organizacji.</div><CompanyIdentityWorkbench/></div>;}
