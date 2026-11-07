import { Text, View } from 'react-native';
export default function Home() {
  return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#fcfcf7',padding:24}}>
    <Text style={{fontSize:32,fontWeight:'800',color:'#173228'}}>TRENERKI Academy</Text>
    <Text style={{fontSize:16,color:'#4d6556',marginTop:12,textAlign:'center'}}>Wersja techniczna Expo. Pełny katalog i egzaminy pozostają prywatne do czasu zabezpieczenia projektu.</Text>
  </View>;
}
