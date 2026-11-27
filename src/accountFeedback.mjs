// Only authored feedback may be shown verbatim. Provider errors are translated
// to safe, actionable messages instead of exposing raw service responses.
export class AccountFeedbackError extends Error {
 constructor(message){super(message);this.name='AccountFeedbackError';}
}

export function accountEmail(value){
 const email=String(value||'').trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new AccountFeedbackError('Wpisz prawidłowy adres e-mail.');
 return email;
}

export function accountErrorMessage(error){
 if(error instanceof AccountFeedbackError)return error.message;
 const code=String(error?.code||'');
 const messages={
  invalid_credentials:'Nieprawidłowy e-mail lub hasło. Sprawdź wpisane dane lub wybierz „Nie pamiętam hasła”.',
  email_not_confirmed:'Potwierdź adres e-mail w wiadomości od TRENERKI Academy. Możesz wysłać potwierdzenie ponownie poniżej.',
  over_email_send_rate_limit:'Zbyt wiele prób wysłania wiadomości. Odczekaj chwilę i spróbuj ponownie.',
  over_request_rate_limit:'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.',
  same_password:'Nowe hasło musi różnić się od poprzedniego.',
  weak_password:'Wybierz silniejsze hasło. Użyj co najmniej 8 znaków.',
  otp_expired:'Link wygasł lub został już użyty. Poproś o nową wiadomość.',
  session_not_found:'Sesja wygasła. Zaloguj się ponownie lub poproś o nowy link zmiany hasła.',
  unexpected_failure:'Nie udało się wykonać operacji. Spróbuj ponownie za chwilę.',
 };
 if(messages[code])return messages[code];
 const raw=String(error?.message||'');
 const legacy={
  'Error sending recovery email':'Nie udało się wysłać wiadomości do zmiany hasła. Spróbuj ponownie za chwilę.',
  'Email rate limit exceeded':messages.over_email_send_rate_limit,
  'Invalid login credentials':messages.invalid_credentials,
  'New password should be different from the old password.':messages.same_password,
  'Auth session missing!':messages.session_not_found,
 };
 if(legacy[raw])return legacy[raw];
 if(error?.name==='AuthRetryableFetchError'||error?.name==='TypeError'&&/fetch|network|load failed/i.test(raw))
  return 'Nie udało się połączyć. Sprawdź internet i spróbuj ponownie. Wpisane dane pozostają w formularzu.';
 return 'Nie udało się wykonać operacji. Spróbuj ponownie. Jeśli problem się powtarza, otwórz Pomoc i wsparcie.';
}
