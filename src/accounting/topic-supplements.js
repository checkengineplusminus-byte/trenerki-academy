function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function key(value) {
  return clean(value).toLocaleLowerCase('pl').replace(/[.!?]+$/, '');
}

function lines(value) {
  return (Array.isArray(value) ? value : [value]).map(clean).filter(Boolean);
}

export function accountingSupplements(material) {
  const m = material || {};
  const workshops = [];
  const signatures = new Set();
  const signature = steps => steps.map(step => key(step.replace(/^\d+[.)]\s+/, ''))).join('\n');
  for (const example of list(m.examples)) {
    const steps = lines(example?.steps);
    if (steps.length) signatures.add(signature(steps));
  }
  for (const w of list(m.workshops)) {
    const steps = lines(w?.steps);
    const title = clean(w?.title);
    if (!title || !steps.length || signatures.has(signature(steps))) continue;
    signatures.add(signature(steps));
    workshops.push({title, steps, result:clean(w.result)});
  }

  const homework = [];
  const tasks = new Set([key(m.practice?.task)]);
  for (const h of [...list(m.practice?.homework), ...list(m.homework)]) {
    const task = clean(h?.task);
    const items = lines(h?.instructions).filter(item => key(item) !== key(task));
    const paragraphs = task ? [task, ...items] : items;
    if (!paragraphs.length) continue;
    const signature = paragraphs.map(key).join('\n');
    if (tasks.has(signature)) continue;
    tasks.add(signature);
    homework.push({title:clean(h.title || h.format), paragraphs,
      deliverable:lines(h.deliverable || h.required_output).join(' '),
      answer:lines(h.expected_output).join(' ')});
  }

  const visible = new Set();
  for (const section of list(m.sections)) {
    visible.add(key(section?.curiosity?.text));
    for (const paragraph of lines(section?.paragraphs)) {
      visible.add(key(paragraph.replace(/^Ciekawostka:\s*/i, '')));
    }
  }
  const facts = [];
  for (const f of list(m.facts)) {
    const text = clean(f?.text);
    if (!text || visible.has(key(text))) continue;
    visible.add(key(text));
    facts.push({title:clean(f.title), text, source:clean(f.source_url),
      sourceTitle:clean(f.source_title), checked:clean(f.checked_at)});
  }
  return {workshops, homework, facts};
}
