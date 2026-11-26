import React from 'react';
import {Platform,View,useWindowDimensions} from 'react-native';

export function courseColumns(width:number){
 if(width>=1600)return 5;
 if(width>=1280)return 4;
 if(width>=1024)return 3;
 if(width>=680)return 2;
 return 1;
}

export function AcademyGrid({children}:{children:React.ReactNode}){
 const {width}=useWindowDimensions();
 const columns=courseColumns(width);
 if(Platform.OS==='web'){
  return <div className="academy-card-grid" style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{children}</div>;
 }
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>
  {React.Children.map(children,child=>child&&<View style={{width:Math.floor((Math.min(width,1920)-40-(columns-1)*16)/columns)}}>{child}</View>)}
 </View>;
}
