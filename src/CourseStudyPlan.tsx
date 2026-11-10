import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export type StudyProject = {
  title: string;
  minutes: number;
  reading_minutes?: number;
  review_minutes?: number;
  chapters: { title: string; lesson: number; minutes: number }[];
};
const ink = '#193c2d';
const time = (minutes: number) => [Math.floor(minutes / 60) ? Math.floor(minutes / 60) + ' godz.' : '',
  minutes % 60 ? minutes % 60 + ' min' : ''].filter(Boolean).join(' ');

export default function CourseStudyPlan({ project }: { project: StudyProject }) {
  const [open, setOpen] = useState(false);
  const total = project.minutes + (project.reading_minutes || 0) + (project.review_minutes || 0);
  return <View style={{ backgroundColor: '#edf4e8', borderColor: '#cdddca', borderWidth: 1, borderRadius: 15, padding: 15, gap: 10, marginBottom: 12 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}
      style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: ink, fontSize: 17, fontWeight: '900' }}>{open ? '↑' : '↓'} Projekt i plan nauki · ok. {time(total)}</Text>
    </Pressable>
    {open && <>
      <Text style={{ color: ink, fontSize: 16, lineHeight: 24 }}>{project.title}</Text>
      <Text style={{ color: '#4e6756', lineHeight: 21 }}>Możesz zrobić projekt w jednym bloku lub rozłożyć go na kilka sesji. Przed sprawdzeniem rozwiązania spróbuj samodzielnie, a do trudnego zadania wróć następnego dnia.</Text>
      {project.chapters.map(chapter => <View key={chapter.lesson} style={{ backgroundColor: '#fff', borderRadius: 9, padding: 11, gap: 3 }}>
        <Text style={{ color: ink, fontWeight: '800' }}>{chapter.title}</Text>
        <Text style={{ color: '#4e6756', fontSize: 13 }}>Lekcja {chapter.lesson} · około {time(chapter.minutes)}</Text>
      </View>)}
      {!!project.reading_minutes && <Text style={{ color: '#4e6756' }}>Lekcje i ich zadania · około {time(project.reading_minutes)}</Text>}
      {!!project.review_minutes && <Text style={{ color: '#4e6756' }}>Powtórka z pamięci i przygotowanie do egzaminu · około {time(project.review_minutes)}</Text>}
      {!project.reading_minutes && <Text style={{ color: '#4e6756' }}>Szacunek dotyczy pracowni. Na pozostałe lekcje zaplanuj dodatkowy czas.</Text>}
    </>}
  </View>;
}
