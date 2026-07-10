export function computeMPM(tasks) {
  if (tasks.length === 0) return null;

  const idSet = new Set(tasks.map(t => t.id));
  for (const t of tasks) {
    for (const p of t.preds) {
      if (!idSet.has(p)) throw new Error(`Antériorité invalide pour "${t.name}".`);
    }
  }

  const successors = {};
  tasks.forEach(t => successors[t.id] = []);
  tasks.forEach(t => t.preds.forEach(p => successors[p].push(t.id)));

  const START = '__START__', END = '__END__';
  const nodeIds = [START, ...tasks.map(t => t.id), END];
  const durationOf = id => (id === START || id === END ? 0 : tasks.find(t => t.id === id).duration);

  const outgoing = {};
  const incoming = {};
  nodeIds.forEach(id => { outgoing[id] = []; incoming[id] = []; });

  tasks.forEach(t => {
    if (t.preds.length === 0) {
      outgoing[START].push({ to: t.id, weight: 0 });
      incoming[t.id].push({ from: START, weight: 0 });
    } else {
      t.preds.forEach(p => {
        outgoing[p].push({ to: t.id, weight: durationOf(p) });
        incoming[t.id].push({ from: p, weight: durationOf(p) });
      });
    }
    if (successors[t.id].length === 0) {
      outgoing[t.id].push({ to: END, weight: t.duration });
      incoming[END].push({ from: t.id, weight: t.duration });
    }
  });

  const indeg = {};
  nodeIds.forEach(id => indeg[id] = incoming[id].length);
  const queue = nodeIds.filter(id => indeg[id] === 0);
  const order = [];
  const indegCopy = { ...indeg };
  
  while (queue.length) {
    const n = queue.shift();
    order.push(n);
    outgoing[n].forEach(e => {
      indegCopy[e.to]--;
      if (indegCopy[e.to] === 0) queue.push(e.to);
    });
  }
  
  if (order.length !== nodeIds.length) {
    throw new Error('Le graphe contient un cycle. Vérifiez les antériorités.');
  }

  const earliest = {};
  order.forEach(id => {
    if (incoming[id].length === 0) { earliest[id] = 0; return; }
    earliest[id] = Math.max(...incoming[id].map(e => earliest[e.from] + e.weight));
  });

  const projectDuration = earliest[END];

  const latest = {};
  [...order].reverse().forEach(id => {
    if (outgoing[id].length === 0) { latest[id] = earliest[id]; return; }
    latest[id] = Math.min(...outgoing[id].map(e => latest[e.to] - e.weight));
  });

  const results = tasks.map(t => {
    const succIds = successors[t.id];
    let freeFloat = (succIds.length === 0) 
      ? earliest[END] - earliest[t.id] - t.duration 
      : Math.min(...succIds.map(s => earliest[s])) - earliest[t.id] - t.duration;
    
    const totalFloat = latest[t.id] - earliest[t.id];
    return {
      id: t.id, name: t.name, duration: t.duration,
      earliest: earliest[t.id], latest: latest[t.id],
      totalFloat, freeFloat, critical: totalFloat === 0,
    };
  });

  const criticalEdgeSet = new Set();
  nodeIds.forEach(from => {
    outgoing[from].forEach(e => {
      const tight = earliest[from] + e.weight === earliest[e.to] && latest[from] + e.weight === latest[e.to];
      if (tight) criticalEdgeSet.add(from + '->' + e.to);
    });
  });

  const level = {};
  order.forEach(id => {
    if (incoming[id].length === 0) { level[id] = 0; return; }
    level[id] = Math.max(...incoming[id].map(e => level[e.from] + 1));
  });

  return {
    results, projectDuration, START, END, nodeIds, outgoing, incoming,
    earliest, latest, level, criticalEdgeSet, durationOf
  };
}