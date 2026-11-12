import React,{useState} from 'react';
import {Image,Platform,StyleSheet,View} from 'react-native';
import manifest from '../public/academy/course-photo-manifest.json';

type CoursePhoto={file:string;alt:string;iconBundle:number;credits?:boolean};
const photos:Record<string,CoursePhoto>=manifest.courses;
const web=Platform.OS==='web';

export default function CourseIntroPhoto({slug,title}:{slug:string;title:string}){
 const [failed,setFailed]=useState(false);
 const photo=photos[slug];
 if(!photo?.file||photo.file!==slug+'.webp'||(failed&&!web))return null;

 const path='/academy/photos/'+photo.file;
 return <View testID="course-intro-photo" style={styles.frame}>
  {failed?
   <svg role="img" aria-label={'Ikona kursu: '+title} viewBox="0 0 256 256" width={128} height={128}>
    <use href={'/academy/course-icons-'+photo.iconBundle+'.svg#course-'+slug}/>
   </svg>:
   web?
   <img src={path} alt={photo.alt} width={960} height={540} decoding="async" fetchPriority="high"
    style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} onError={()=>setFailed(true)}/>:
   <Image accessible accessibilityLabel={photo.alt} source={{uri:'https://trenerki.com'+path}}
    resizeMode="cover" style={styles.photo} onError={()=>setFailed(true)}/>}
  {web&&photo.credits&&!failed&&<a href={'/academy/zrodla-zdjec.html#'+slug}
   style={{position:'absolute',right:8,bottom:8,padding:'3px 9px',borderRadius:5,background:'#183529',color:'#fff',fontSize:11}}>Źródło zdjęcia</a>}
 </View>;
}

const styles=StyleSheet.create({
 frame:{width:'100%',aspectRatio:16/9,marginBottom:13,position:'relative',overflow:'hidden',
  alignItems:'center',justifyContent:'center',backgroundColor:'#edf5e7',borderRadius:17,borderWidth:1,borderColor:'#dbe9d7'},
 photo:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
});
