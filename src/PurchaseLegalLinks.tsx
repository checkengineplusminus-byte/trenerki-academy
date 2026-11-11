import React from 'react';
import {Linking, Pressable, Text, View} from 'react-native';

const site = 'https://trenerki.com/academy/';
const links = [
  ['Regulamin', site + 'regulamin.html'],
  ['Polityka prywatności', site + 'prywatnosc.html'],
  ['Odstąpienie i zwroty', site + 'odstapienie.html'],
  ['Kontakt i reklamacje', site + 'kontakt.html'],
  ['+48 795 676 553', 'tel:+48795676553'],
];

export default function PurchaseLegalLinks() {
  return <View style={{gap:8}}>
    <Text style={{color:'#526b57',fontSize:13}}>Sprzedawca TRENERKI Sp. z o.o.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
      {links.map(([label,url])=><Pressable key={url} accessibilityRole="link" onPress={()=>Linking.openURL(url)}>
        <Text style={{color:'#286043',fontSize:13,textDecorationLine:'underline'}}>{label}</Text>
      </Pressable>)}
    </View>
  </View>;
}
