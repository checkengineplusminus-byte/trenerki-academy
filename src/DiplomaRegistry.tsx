import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { diplomaAction, downloadDiploma, type DiplomaLanguage, type DiplomaMail, type RegistryEntry } from './diplomaApi';

const ink = '#183b2c';
const muted = '#52705a';
const labels: Record<DiplomaMail['status'], string> = {
  pending: 'W kolejce do wysłania',
  sending: 'Wysyłanie',
  sent: 'Wysłano e-mail',
  failed: 'Wysyłka wymaga ponowienia',
};
type RegistryPage = { certificates: RegistryEntry[]; more: string | null };

function updateMail(items: RegistryEntry[], id: string, mail: DiplomaMail) {
  return items.map(item => item.id === id ? { ...item, ta_diploma_mail: mail } : item);
}

function deliveryNotice(mail: DiplomaMail, sentEarlier = false) {
  switch (mail.status) {
    case 'sent':
      return sentEarlier ? 'Obie wersje dyplomu zostały już wysłane.' : 'Wysłano obie wersje dyplomu na adres uczestnika.';
    case 'failed':
      return mail.last_error === 'recipient_unavailable' ? 'Brakuje potwierdzonego adresu e-mail uczestnika.' : 'Nie udało się wysłać dyplomu. Możesz ponowić wysyłkę.';
    case 'sending':
      return 'Trwa wysyłka obu wersji dyplomu.';
    case 'pending':
      return mail.last_error ? 'Wysyłka czeka na kolejną automatyczną próbę.' : 'Obie wersje dyplomu czekają na wysłanie.';
  }
}

function deliveryLabel(item: RegistryEntry) {
  if (item.revoked_at) return 'Unieważniony';
  if (item.is_demo) return 'Wzór testowy';
  const mail = item.ta_diploma_mail;
  if (!mail) return 'Brak zapisu wysyłki';
  const when = mail.status === 'sent' && mail.sent_at
    ? ' · ' + new Date(mail.sent_at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Warsaw' })
    : '';
  return labels[mail.status] + when;
}

export default function DiplomaRegistry() {
  const [items, setItems] = useState<RegistryEntry[]>([]);
  const [number, setNumber] = useState('');
  const [applied, setApplied] = useState('');
  const [more, setMore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [pendingNumber, setPendingNumber] = useState<string | null>(null);

  async function load(lookup = '', cursor: string | null = null) {
    setBusy(true);
    setNotice('');
    setPendingNumber(null);
    try {
      const result = await diplomaAction<RegistryPage>('list', {
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
  useEffect(() => {
    const numberToWatch = pendingNumber;
    if (!numberToWatch) return;
    let active = true;
    let remaining = 24;
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const { certificates } = await diplomaAction<RegistryPage>('list', { number: numberToWatch });
        if (!active) return;
        const item = certificates.find(entry => entry.certificate_no === numberToWatch);
        const mail = item?.ta_diploma_mail;
        if (item && mail) {
          setItems(old => updateMail(old, item.id, mail));
          setNotice(deliveryNotice(mail));
          if (mail.status === 'sent' || mail.status === 'failed') {
            setPendingNumber(null);
            return;
          }
        }
      } catch {
        // A short connection failure leaves the last confirmed status visible.
      }
      if (!active) return;
      if (--remaining > 0) timer = setTimeout(refresh, 6000);
      else setPendingNumber(null);
    }

    timer = setTimeout(refresh, 6000);
    return () => { active = false; clearTimeout(timer); };
  }, [pendingNumber]);

  async function act(diploma: RegistryEntry, language?: DiplomaLanguage) {
    setBusy(true);
    setNotice(language ? '' : 'Wysyłam obie wersje dyplomu…');
    try {
      if (language) await downloadDiploma(diploma.id, language);
      else {
        setPendingNumber(null);
        const result = await diplomaAction<{ queued: boolean; mail?: DiplomaMail | null }>('resend', { id: diploma.id });
        const mail: DiplomaMail | null = result.mail ?? (result.queued
          ? { status: 'pending', sent_at: null, last_error: null } : null);
        if (mail) {
          setItems(old => updateMail(old, diploma.id, mail));
          setNotice(deliveryNotice(mail, !result.queued));
          if (mail.status === 'pending' || mail.status === 'sending') setPendingNumber(diploma.certificate_no);
        } else setNotice('Odśwież rejestr, aby sprawdzić stan wysyłki tego dyplomu.');
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
      <Text style={{ color: muted }}>{new Date(item.issued_at).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })} · {deliveryLabel(item)}</Text>
      {!item.revoked_at ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Platform.OS === 'web' && button('PDF PL', () => void act(item, 'pl'))}
        {Platform.OS === 'web' && button('PDF EN', () => void act(item, 'en'))}
        {!item.is_demo && button('Wyślij ponownie', () => void act(item))}
      </View> : null}
    </View>)}
    {more ? button('Pokaż starsze dokumenty', () => void load(applied, more)) : null}
  </View>;
}
