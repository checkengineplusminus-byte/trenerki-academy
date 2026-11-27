import React,{useEffect,useRef} from 'react';
import {usePathname} from 'expo-router';

const {academyMenuMarkup,bindAcademyDisclosure}=require('../public/academy/course-share.js');

export default function AcademyDesktopNav({signedIn}:{signedIn:boolean}){
 const pathname=usePathname();
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>bindAcademyDisclosure(host.current?.querySelector('details')),[pathname,signedIn]);
 return <div ref={host} style={{position:'relative',zIndex:65,flexShrink:0}}
  dangerouslySetInnerHTML={{__html:academyMenuMarkup(signedIn,pathname)}}/>;
}
