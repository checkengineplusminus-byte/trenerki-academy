import { supabase } from './supabase';

export type DiplomaLanguage = 'pl' | 'en';
export type Diploma = {
  id: string; certificate_no: string; holder_name: string; title_pl: string; title_en: string;
  issued_at: string; is_demo: boolean; revoked_at?: string | null;
};
export type DiplomaMail = {
  status: 'pending' | 'sending' | 'sent' | 'failed';
  sent_at: string | null;
  last_error: string | null;
};
export type RegistryEntry = Diploma & {
  ta_diploma_mail?: DiplomaMail | null;
};

export async function diplomaAction<T>(action: string, fields: Record<string, string> = {}) {
  const { data, error } = await supabase.functions.invoke<T>('ta-diplomas', { body: { action, ...fields } });
  if (error || !data) throw new Error('Nie udało się teraz połączyć z rejestrem dyplomów.');
  return data;
}

export async function downloadDiploma(id: string, language: DiplomaLanguage) {
  const { filename, pdf } = await diplomaAction<{ filename: string; pdf: string }>('download', { id, language });
  if (!filename || !pdf) throw new Error('Plik PDF jest chwilowo niedostępny.');
  const bytes = Uint8Array.from(atob(pdf), character => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
