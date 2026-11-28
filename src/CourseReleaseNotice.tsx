import React from 'react';
import {View,Text} from 'react-native';
const {courseRelease}=require('../public/academy/course-share.js');

export default function CourseReleaseNotice({slug}:{slug:string}){
 const release=courseRelease(slug);
 if(!release)return null;
 return <View testID="course-release-notice" style={{backgroundColor:'#FFF6E3',borderColor:'#D7B569',borderWidth:1,borderLeftWidth:4,borderRadius:12,padding:17,gap:7}}>
  <Text accessibilityRole="header" style={{color:'#14263B',fontSize:17,fontWeight:'800'}}>{release.title}</Text>
  <Text style={{color:'#43566B',fontSize:15,lineHeight:24}}>{release.body}</Text>
 </View>;
}
