import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { diplomaAction, downloadDiploma, type DiplomaLanguage, type RegistryEntry } from './diplomaApi';

const ink = '#183b2c';
const muted = '#52705a';
const labels: Record<string, string> = {
  pending: 'W kolejce do wysłania',
  sending: 'Przekazywanie do wysłania',
  sent: 'Przyjęto do wysłania',
  failed: 'Wysyłka wymaga ponowienia',
};

export default function DiplomaRegistry() {
  const [items, setItems] = useState<RegistryEntry[]>([]);
  const [number, setNumber] = useState('');
  const [applied, setApplied] = useState('');
  const [more, setMore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load(lookup = '', cursor: string | null = null) {
    setBusy(true);
    setNotice('');
    try {
      const result = await diplomaAction<{ certificates: RegistryEntry[]; more: string | null }>('list', {
        number: lookup.trim(), ...(cursor ? { before: cursor } : {}),
      });
      setApplied(lookup);
      setItems(old => cursor ? [...old, ...result.certificates] : result.certificates);
      setMore(result.more);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Rejestr jest chwilowo niedostępny.');
    } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);

  async function act(diploma: RegistryEntry, language?: DiplomaLanguage) {
    setBusy(true);
    setNotice('');
    try {
      if (language) await downloadDiploma(diploma.id, language);
      else {
        const result = await diplomaAction<{ queued: boolean }>('resend', { id: diploma.id });
        if (result.queued) {
          setItems(old => old.map(item => item.id === diploma.id
            ? { ...item, ta_diploma_mail: { status: 'pending', sent_at: null, last_error: null } } : item));
          setNotice('Obie wersje dyplomu trafiły do kolejki ponownej wysyłki.');
        } else setNotice('Wysyłka jest już w kolejce lub dyplom wysłano przed chwilą.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Nie udało się wykonać operacji.');
    } finally { setBusy(false); }
  }
  const button = (label: string, action: () => void) => <Pressable accessibilityRole="button" disabled={busy}
    onPress={action} style={{ backgroundColor: '#eaf2e6', padding: 12, borderRadius: 10, opacity: busy ? 0.55 : 1 }}>
    <Text style={{ color: ink, fontWeight: '800' }}>{label}</Text>
  </Pressable>;

  return <View style={{ padding: 19, backgroundColor: 'white', borderColor: '#dfe9dc', borderWidth: 1, borderRadius: 16, gap: 13 }}>
    <Text style={{ color: ink, fontWeight: '900', fontSize: 21 }}>Rejestr dyplomów</Text>
    <Text style={{ color: muted, lineHeight: 22 }}>Wyszukaj dokument po numerze. Ponowna wysyłka trafia na potwierdzony adres zapisany na koncie uczestnika.</Text>
    <TextInput value={number} onChangeText={setNumber} maxLength={30} autoCapitalize="characters"
      placeholder="Numer dyplomu, np. TRE-00000001" accessibilityLabel="Numer dyplomu"
      onSubmitEditing={() => { if (!busy) void load(number); }}
      style={{ padding: 12, borderWidth: 1, borderColor: '#c5d7c2', color: ink, borderRadius: 9 }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {button('Szukaj', () => void load(number))}
      {button('Pokaż najnowsze', () => { setNumber(''); void load(); })}
    </View>
    {notice ? <Text accessibilityLiveRegion="polite" style={{ color: ink, lineHeight: 22 }}>{notice}</Text> : null}
    {!items.length ? <Text style={{ color: muted }}>{busy ? 'Wczytuję rejestr…' : 'Brak dokumentów w tym widoku.'}</Text> : null}
    {items.map(item => <View key={item.id} style={{ borderTopWidth: 1, borderColor: '#e1e8dd', paddingTop: 11, gap: 7 }}>
      <Text style={{ color: ink, fontWeight: '900' }}>{item.certificate_no} · {item.holder_name}</Text>
      <Text style={{ color: muted }}>{item.title_pl}</Text>
      <Text style={{ color: muted }}>{new Date(item.issued_at).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })} · {
        item.revoked_at ? 'Unieważniony' : item.is_demo ? 'Wzór testowy' : labels[item.ta_diploma_mail?.status || ''] || 'Brak zapisu wysyłki'
      }</Text>
      {!item.revoked_at ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Platform.OS === 'web' && button('PDF PL', () => void act(item, 'pl'))}
        {Platform.OS === 'web' && button('PDF EN', () => void act(item, 'en'))}
        {!item.is_demo && button('Wyślij ponownie', () => void act(item))}
      </View> : null}
    </View>)}
    {more ? button('Pokaż starsze dokumenty', () => void load(applied, more)) : null}
  </View>;
}
