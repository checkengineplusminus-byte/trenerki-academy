(function(root){
 const normalize = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/\s+/g,' ').trim();
 const immediate = /\b(?:zaraz|dzisiaj|teraz|wlasnie|w tej chwili|w tym momencie|juz|mam plan|mam zamiar)\b/;
 const selfHarm = /\b(?:mysli samobojcz\w*|mysle o samobojstwie|samookalecz\w*|chce (?:sie zabic|sobie cos zrobic|umrzec)|nie chce (?:juz )?zyc|chce odebrac sobie zycie|mysli o odebraniu sobie zycia|sobie cos zrobie|zrobie sobie krzywde|mysle (?:ze sie zabije|o odebraniu sobie zycia)|zrobic sobie krzywde|zabije sie|skonczyc ze soba|chce skoczyc|chce zniknac na zawsze|nie widze sensu zycia)\b/;
 const activeSelfHarm = /\b(?:zabije sie|chce sie zabic|chce odebrac sobie zycie|mam plan (?:sie zabic|samobojstwa)|zamierzam (?:sie zabic|odebrac sobie zycie)|probuje sie zabic|przedawkowal\w*|wzialem za duzo tabletek|wzielam za duzo tabletek|krwawie i|pocialem sie|pocielam sie)\b/;
 const violence = /\b(?:przemoc\w* (?:domow\w*|w domu|w rodzinie|w zwiazku)|zn[eę]ca sie|mnie bije|bije mnie|mnie uderza|uderza mnie|bije (?:zone|dziecko|corke|syna|mame|nas)|uderzyl\w* mnie|grozi\w* mi (?:pobiciem|smiercia|bronia|zemsta)|grozi ze (?:mnie|nas) (?:zabije|skrzywdzi)|boje sie wrocic do domu|zamyka mnie|nie pozwala mi wyjsc|jestem bity|jestem bita)\b/;
 const child = /\b(?:dzieck\w*|cork\w*|syn\w*|uczen|uczennic\w*|nastolat\w*|maloletn\w*)\b/;
 const childRisk = /\b(?:krzywdz\w*|zaniedb\w*|zagrozen\w*|nie jest bezpieczn\w*|bije|przemoc\w*|wykorzyst\w*|molest\w*|zagin\w*)\b/;
 const young = /\b(?:mam (?:[6-9]|1[0-7]) lat|jestem (?:nastolat\w*|dzieckiem|maloletni\w*)|nie mam 18 lat)\b/;
 const mental = /\b(?:depresj\w*|samotn\w*|kryzys\w* psychicz\w*|zalamani\w*|ataki paniki|nie daje (?:sobie )?rady|nie radze sobie|nie mam z kim porozmawiac|nikt mnie nie rozumie|jestem samotn\w*|czuje sie sam\w*|jestem sam\w* z tym|czuje sie fatalnie|placze codziennie|nic mnie nie cieszy)\b/;
 const addiction = /\b(?:uzalezn\w*|alkoholizm\w*|narkomani\w*|nalog\w*|nie umiem przestac pic|nie moge przestac (?:pic|brac|grac)|pije codziennie|mam problem z alkoholem|problem z narkotykami|biore narkotyki|partner pije|hazard\w*)\b/;
 const money = /\b(?:zadluzen\w*|dlug\w*|komornik\w*|eksmisj\w*|chwilowk\w*|nie mam (?:za co zyc|pieniedzy na jedzenie)|nie mam na (?:czynsz|jedzenie|leki)|nie stac mnie na (?:czynsz|jedzenie|leki)|grozi mi komornik|nie moge splac\w*|zalegam z (?:czynszem|ratami)|zajecie konta|grozi mi (?:eksmisja|utrata mieszkania))\b/;
 const crime = /\b(?:padl\w* ofiara|okradziono mnie|napadnieto mnie|zostalem napadniety|zostalam napadnieta|pokrzywdzon\w* przestepstwem|zgwalcon\w*|mnie oszukano)\b/;
 const personal = /\b(?:mam|mnie|mi|moj\w*|moja|moje|nasz\w*|czuje|jestem|nie moge|nie umiem|nie mam|nie daje|nie radze|przezywam|doswiadczam|boje sie|szukam pomocy|potrzebuje (?:pomocy|wsparcia)|bliska osoba|przyjaciel\w*|partner\w*|rodzic\w*)\b/;
 const educational = /\b(?:szukam kursu|chce (?:kurs|sie nauczyc)|kurs o|kurs na temat|szkolenie|definicj\w*|referat|prezentacj\w*|do szkoly|scenariusz fikcyjny|fikcyjna scenka|jak uczyc|co to jest)\b/;
 const direct = /\b(?:gdzie (?:szukac|znalezc|uzyskac) (?:pomoc\w*|wsparci\w*)|telefon zaufania|numer pomocowy|bezplatna pomoc|potrzebuje pomocy|szukam pomocy)\b/;
 const urgentOther = /\b(?:nie oddycha|stracil\w* przytomnosc|bezposrednie zagrozenie zycia|atakuje mnie|grozi (?:mi )?bronia|jestem w niebezpieczenstwie|ratujcie|trwa napad|dziecko jest w niebezpieczenstwie)\b/;
 const replies = {
  kryzys:'Brzmi, jakby było Ci teraz trudno. Możesz porozmawiać z kimś, kto Cię wysłucha i pomoże znaleźć wsparcie.',
  mlodzi:'Dobrze, że się odzywasz. Możesz porozmawiać z konsultantem dla dzieci i młodzieży albo z zaufaną dorosłą osobą, jeśli możesz to zrobić bezpiecznie.',
  przemoc:'To, co opisujesz, jest ważne. Jeśli możesz bezpiecznie nawiązać kontakt, konsultanci Niebieskiej Linii pomogą Ci porozmawiać o możliwych krokach.',
  rodzina:'Dobrze, że reagujesz na sygnały dotyczące dziecka. Specjaliści pomogą Ci omówić sytuację i ustalić, gdzie zwrócić się dalej.',
  uzaleznienia:'Szukając wsparcia, robisz ważny krok. Możesz uzyskać informacje o dostępnej pomocy dla siebie lub bliskiej osoby.',
  finanse:'Presja związana z długami potrafi przytłoczyć. Doradca obywatelski może pomóc Ci uporządkować sytuację i omówić możliwe kroki.',
  przestepstwo:'To może być trudne doświadczenie. Linia Pomocy Pokrzywdzonym pomoże Ci dowiedzieć się, jakie wsparcie masz do dyspozycji.',
  ogolna:'Możesz skorzystać z bezpłatnego wsparcia. Wybierz kontakt odpowiadający Twojej sytuacji, bez podawania mi dodatkowych danych.'
 };
 function route(message, previous){
  const q=normalize(message);
  if(!q)return previous || null;
  const mentionsHarm=selfHarm.test(q)||activeSelfHarm.test(q);
  const negatesPlan=/\bnie (?:chce sie zabic|zamierzam sie zabic|mam planu|mysle o samobojstwie)\b/.test(q);
  const acuteSelf=(activeSelfHarm.test(q)||(mentionsHarm&&/\b(?:mam plan|mam zamiar|zaraz|w tej chwili)\b/.test(q)))&&(!negatesPlan||/\b(?:ale|jednak|zaraz|juz)\b/.test(q));
  const violent=violence.test(q), minor=child.test(q)&&childRisk.test(q), under18=young.test(q);
  const inDanger=urgentOther.test(q)||(violent||minor)&&immediate.test(q)&&/\b(?:bije|atakuje|grozi|krzywdzi|niebezpiecz\w*)\b/.test(q);
  const quotedTraining=educational.test(q)&&/["„“].+["”]/.test(q)&&/\b(?:scenariusz|fikcyjn\w*|cytat|przyklad|przykladow\w*)\b/.test(q);
  const firstPersonRisk=!quotedTraining&&(acuteSelf||inDanger);
  if(quotedTraining)return previous || null;
  if(!previous&&educational.test(q)&&!firstPersonRisk&&!(/\b(?:bo mnie|bo mam|bo chce sie|ale moj|ale ja|ktos mnie|ktos bije)\b/.test(q)))return null;
  const categories=[];
  if(mentionsHarm||mental.test(q)&&(personal.test(q)||direct.test(q)))categories.push(under18?'mlodzi':'kryzys');
  if(violent&&(personal.test(q)||direct.test(q)||inDanger))categories.push('przemoc');
  if(minor&&(personal.test(q)||direct.test(q)||inDanger))categories.push(under18?'mlodzi':'rodzina');
  if(addiction.test(q)&&(personal.test(q)||direct.test(q)))categories.push('uzaleznienia');
  if(money.test(q)&&(personal.test(q)||direct.test(q)))categories.push('finanse');
  if(crime.test(q)&&(personal.test(q)||direct.test(q)))categories.push('przestepstwo');
  if(under18&&(direct.test(q)||inDanger))categories.push('mlodzi');
  const generalHelp=direct.test(q)&&!/\b(?:potrzebuje|szukam) pomocy (?:z|ze|przy|w)\b/.test(q);
  if(!categories.length&&!firstPersonRisk&&!previous&&!generalHelp)return null;
  const all=[...new Set([...categories,...(previous?.categories || [])])].slice(0,3);
  const urgent=!!(firstPersonRisk||previous?.urgent);
  const atRisk=!!(mentionsHarm||previous?.atRisk);
  const text=urgent
   ? 'To może być pilne. Jeśli zagrożenie trwa teraz, zadzwoń pod 112 w Polsce lub na lokalny numer alarmowy, jeśli jesteś za granicą. Jeśli to bezpieczne, poproś zaufaną osobę, żeby została z Tobą lub pomogła wezwać pomoc.'
   : atRisk
    ? 'Dziękuję, że o tym mówisz. Możesz teraz porozmawiać z konsultantem i skontaktować się z zaufaną osobą. Jeśli możesz zrobić sobie krzywdę w tej chwili, zadzwoń pod 112 w Polsce lub na lokalny numer alarmowy.'
    : replies[all[0]] || replies.ogolna;
  return {categories:all,urgent,atRisk,text};
 }
 root.TrenerkiSupport={route};
})(globalThis);
