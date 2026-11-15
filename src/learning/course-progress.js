// Read all pages: the catalogue now has more rows than the Data API response cap.
async function readPages(query) {
  const rows=[];
  let total=null;
  for (;;) {
    const {data,error,count}=await query().range(rows.length,rows.length+499);
    if(error)throw error;
    if(Number.isSafeInteger(count)) {
      if(total!==null&&total!==count)throw new Error('Program kursów zmienił się podczas odczytu. Odśwież stronę.');
      total=count;
    }
    const page=data||[];
    if(!page.length) {
      if(total!==null&&rows.length<total)throw new Error('Nie udało się pobrać pełnego postępu. Odśwież stronę.');
      return rows;
    }
    rows.push(...page);
    if(total!==null&&rows.length>=total)return rows;
  }
}

export function summarizeCourseProgress(lessons,passed) {
  const current=new Map(),completed=new Map();
  for(const row of lessons) {
    if(!current.has(row.course_slug))current.set(row.course_slug,new Set());
    current.get(row.course_slug).add(row.lesson_no);
  }
  for(const row of passed) {
    if(!current.get(row.course_slug)?.has(row.lesson_no))continue;
    if(!completed.has(row.course_slug))completed.set(row.course_slug,new Set());
    completed.get(row.course_slug).add(row.lesson_no);
  }
  return new Map([...current].map(([slug,numbers])=>{
    const lessonCount=numbers.size,completedCount=completed.get(slug)?.size||0;
    return [slug,{lessonCount,completedCount,progress:Math.round(completedCount/lessonCount*100),progressAvailable:true}];
  }));
}

export async function loadCourseProgress(client,userId,slugs) {
  if(!slugs.length)return new Map();
  const [lessons,passed]=await Promise.all([
    readPages(()=>client.from('ta_lessons').select('course_slug,lesson_no',{count:'exact'})
      .in('course_slug',slugs).order('course_slug').order('lesson_no')),
    readPages(()=>client.from('ta_learning_progress').select('course_slug,lesson_no',{count:'exact'})
      .eq('user_id',userId).in('course_slug',slugs).order('course_slug').order('lesson_no')),
  ]);
  return summarizeCourseProgress(lessons,passed);
}
