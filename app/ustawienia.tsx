import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../src/supabase';

const ink = '#173228';

export default function AccountSettings() {
 const router = useRouter();
 const [savedName, setSavedName] = useState<string | null>(null);
 const [name, setName] = useState('');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [reload, setReload] = useState(0);
 const [error, setError] = useState('');
 const [saved, setSaved] = useState(false);
 const normalizedName = name.trim().replace(/\s+/g, ' ');

 useEffect(() => {
  let active = true;
  async function load() {
   setLoading(true);
   setError('');
   try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!active) return;
    if (!user && (!authError || authError.name === 'AuthSessionMissingError')) {
     router.replace('/konto');
     return;
    }
    if (authError || !user) throw authError || new Error();
    const current = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
    setName(current);
    setSavedName(current);
   } catch {
    if (active) setError('Nie udało się wczytać ustawień konta.');
   } finally {
    if (active) setLoading(false);
   }
  }
  void load();
  return () => { active = false; };
 }, [reload, router]);

 async function save() {
  if (saving || savedName === null || normalizedName === savedName) return;
  setSaved(false);
  if (normalizedName.length < 3 || normalizedName.length > 120 || /[<>\r\n]/.test(name)) {
   setError('Wpisz imię i nazwisko. Pole może zawierać od 3 do 120 znaków.');
   return;
  }
  setSaving(true);
  setError('');
  try {
   const { data: { user }, error: authError } = await supabase.auth.updateUser({ data: { full_name: normalizedName } });
   if (authError || user?.user_metadata?.full_name !== normalizedName) throw authError || new Error();
   setName(normalizedName);
   setSavedName(normalizedName);
   setSaved(true);
  } catch {
   setError('Nie udało się zapisać imienia i nazwiska. Spróbuj ponownie.');
  } finally {
   setSaving(false);
  }
 }

 const disabled = saving || normalizedName === savedName;
 return <ScrollView style={{ flex: 1, backgroundColor: '#fcfcf7' }} contentContainerStyle={{ padding: 20, maxWidth: 650, alignSelf: 'center', width: '100%', gap: 16, paddingBottom: 55 }}>
  <Link href="/moje-kursy" replace style={{ color: '#376143', fontWeight: '800' }}>← Moje kursy</Link>
  <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '900', color: ink }}>Ustawienia konta</Text>
  {loading && <ActivityIndicator color={ink} accessibilityLabel="Wczytuję ustawienia konta" />}
  {!loading && savedName !== null && <View style={{ backgroundColor: 'white', borderColor: '#dbe8d9', borderWidth: 1, borderRadius: 14, padding: 18, gap: 11 }}>
   <Text style={{ color: ink, fontWeight: '800' }}>Imię i nazwisko</Text>
   <TextInput
    accessibilityLabel="Imię i nazwisko"
    autoComplete="name"
    autoCapitalize="words"
    editable={!saving}
    maxLength={120}
    value={name}
    onChangeText={value => { setName(value); setSaved(false); setError(''); }}
    style={{ backgroundColor: 'white', borderColor: '#b8d3b7', borderWidth: 1, borderRadius: 10, color: ink, fontSize: 16, padding: 12 }}
   />
   <Text style={{ color: '#5c7460', lineHeight: 21 }}>Te dane będą podpowiadane przy rozpoczynaniu kolejnych egzaminów.</Text>
   <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void save()} style={{ backgroundColor: ink, opacity: disabled ? .5 : 1, borderRadius: 10, padding: 12, alignSelf: 'flex-start' }}>
    <Text style={{ color: 'white', fontWeight: '800' }}>{saving ? 'Zapisuję…' : 'Zapisz zmiany'}</Text>
   </Pressable>
   {saved && <Text accessibilityLiveRegion="polite" style={{ color: '#245c3c', fontWeight: '700' }}>Zapisano imię i nazwisko.</Text>}
  </View>}
  {!!error && <Text accessibilityRole="alert" style={{ color: '#a52626' }}>{error}</Text>}
  {!loading && savedName === null && !!error && <Pressable accessibilityRole="button" onPress={() => setReload(attempt => attempt + 1)}>
   <Text style={{ color: ink, fontWeight: '800' }}>Spróbuj ponownie</Text>
  </Pressable>}
 </ScrollView>;
}
