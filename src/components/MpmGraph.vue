<template>
  <div id="graph-wrap">
    <div v-if="!mpm" class="empty-state" style="padding:60px 20px; border:none; background:transparent;">
      <b>Graphe vide</b> Ajoutez des tâches pour générer le réseau.
    </div>
    
    <svg v-else ref="svgRef" :viewBox="`0 0 ${layout.width} ${layout.height}`" :width="layout.width" :height="layout.height"
         @pointermove="onPointerMove" @pointerup="onPointerUp" @pointerleave="onPointerUp">
      <defs>
        <marker id="arrow-normal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--ink-faint)"></path>
        </marker>
        <marker id="arrow-critical" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--critical)"></path>
        </marker>
      </defs>

      <g v-for="(edge, i) in layout.edges" :key="'edge-'+i">
        <path :d="edge.d" fill="none" :stroke="edge.isCritical ? 'var(--critical)' : 'var(--ink-faint)'"
              :stroke-width="edge.isCritical ? '3' : '2'"
              :marker-end="edge.isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'" />
        <text v-if="edge.showLabel" :x="edge.lx" :y="edge.ly" text-anchor="middle"
              font-family="var(--font-mono)" font-size="11" font-weight="600"
              :fill="edge.isCritical ? 'var(--critical)' : 'var(--ink-soft)'">
          {{ edge.weight }}
        </text>
      </g>

      <g v-for="node in layout.nodes" :key="node.id" style="cursor: grab;" @pointerdown="onPointerDown($event, node.id)">
        <circle :cx="node.cx" :cy="node.cy" :r="NODE_R"
                :fill="node.critical ? 'var(--critical-soft)' : (node.isExtremity ? 'var(--bg)' : '#FFFFFF')"
                :stroke="node.critical ? 'var(--critical)' : 'var(--panel-border)'"
                :stroke-width="node.critical ? '2' : '1.5'" />
        
        <line :x1="node.cx - NODE_R" :y1="node.cy" :x2="node.cx + NODE_R" :y2="node.cy"
              :stroke="node.critical ? 'var(--critical)' : 'var(--panel-border)'" />
        <line :x1="node.cx" :y1="node.cy" :x2="node.cx" :y2="node.cy + NODE_R"
              :stroke="node.critical ? 'var(--critical)' : 'var(--panel-border)'" />
        
        <text :x="node.cx" :y="node.cy - 20" text-anchor="middle" font-family="var(--font-display)" font-weight="600" font-size="13" fill="var(--ink-main)" style="pointer-events:none;">
          {{ node.title }}
        </text>
        <!-- <text v-if="!node.isExtremity" :x="node.cx" :y="node.cy - 5" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--ink-faint)" style="pointer-events:none;">
          d = {{ node.duration }}
        </text> -->
        <text v-if="!node.isExtremity" :x="node.cx" :y="node.cy - 5" text-anchor="middle" font-family="var(--font-mono)" font-size="12" fill="#27ae60" font-weight="bold" style="pointer-events:none;">
          Marge = {{ node.totalFloat }}
        </text>
        <text :x="node.cx - 22" :y="node.cy + 28" text-anchor="middle" font-family="var(--font-mono)" font-weight="600" font-size="14" fill="var(--primary)" style="pointer-events:none;">
          {{ node.earliest }}
        </text>
        <text :x="node.cx + 22" :y="node.cy + 28" text-anchor="middle" font-family="var(--font-mono)" font-weight="600" font-size="14" :fill="node.critical ? 'var(--critical)' : 'var(--ink-soft)'" style="pointer-events:none;">
          {{ node.latest }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps(['mpm', 'customPositions']);
const emit = defineEmits(['update-position']);

const svgRef = ref(null);
const draggingId = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

const NODE_R = 45;
const NODE_W = NODE_R * 2, NODE_H = NODE_R * 2;
const COL_GAP = 70, ROW_GAP = 30, PAD = 40;

const layout = computed(() => {
  if (!props.mpm) return null;

  const byLevel = {};
  props.mpm.nodeIds.forEach(id => {
    const lv = props.mpm.level[id];
    if (!byLevel[lv]) byLevel[lv] = [];
    byLevel[lv].push(id);
  });
  const maxLevel = Math.max(...Object.keys(byLevel).map(Number));

  const positions = {};
  for (let lv = 0; lv <= maxLevel; lv++) {
    (byLevel[lv] || []).forEach((id, i) => {
      positions[id] = { x: PAD + lv * (NODE_W + COL_GAP), y: PAD + i * (NODE_H + ROW_GAP) };
    });
  }

  // Override avec customPositions
  props.mpm.nodeIds.forEach(id => {
    if (props.customPositions[id]) positions[id] = props.customPositions[id];
  });

  let maxX = 0, maxY = 0;
  Object.values(positions).forEach(p => {
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  const width = Math.max(PAD * 2 + (maxLevel + 1) * NODE_W + maxLevel * COL_GAP, maxX + NODE_W + PAD);
  const height = Math.max(PAD * 2 + Math.max(...Object.values(byLevel).map(a => a.length)) * NODE_H + ROW_GAP, maxY + NODE_H + PAD);

  // const nodes = props.mpm.nodeIds.map(id => {
  //   const isStart = id === props.mpm.START;
  //   const isEnd = id === props.mpm.END;
  //   const isExtremity = isStart || isEnd;
  //   const res = props.mpm.results.find(r => r.id === id);
  //   return {
  //     id, cx: positions[id].x + NODE_R, cy: positions[id].y + NODE_R,
  //     critical: !isExtremity && res.critical, isExtremity,
  //     title: isStart ? 'DÉBUT' : (isEnd ? 'FIN' : (res.name.length > 12 ? res.name.slice(0,11)+'…' : res.name)),
  //     duration: props.mpm.durationOf(id), earliest: props.mpm.earliest[id], latest: props.mpm.latest[id]
  //   };
  // });

  const nodes = props.mpm.nodeIds.map(id => {
    const isStart = id === props.mpm.START;
    const isEnd = id === props.mpm.END;
    const isExtremity = isStart || isEnd;
    const res = props.mpm.results.find(r => r.id === id);
    return {
      id, cx: positions[id].x + NODE_R, cy: positions[id].y + NODE_R,
      critical: !isExtremity && res.critical, isExtremity,
      title: isStart ? 'DÉBUT' : (isEnd ? 'FIN' : (res.name.length > 12 ? res.name.slice(0,11)+'…' : res.name)),
      duration: props.mpm.durationOf(id), 
      earliest: props.mpm.earliest[id], 
      latest: props.mpm.latest[id],
      // AJOUT : On récupère la marge totale (marge de retard)
      totalFloat: res ? res.totalFloat : 0 
    };
  });

  const edges = [];
  props.mpm.nodeIds.forEach(from => {
    props.mpm.outgoing[from].forEach(e => {
      const p1 = { x: positions[from].x + NODE_W, y: positions[from].y + NODE_H / 2 };
      const p2 = { x: positions[e.to].x, y: positions[e.to].y + NODE_H / 2 };
      const isCritical = props.mpm.criticalEdgeSet.has(from + '->' + e.to);
      
      let midX = (p1.x + p2.x) / 2;
      let c1x = midX, c1y = p1.y, c2x = midX, c2y = p2.y;
      if (p2.x < p1.x + 40) { c1x = p1.x + 60; c2x = p2.x - 60; }

      edges.push({
        d: `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`,
        isCritical, weight: e.weight,
        showLabel: from !== props.mpm.START || e.weight !== 0,
        lx: p2.x < p1.x + 40 ? (p1.x + p2.x)/2 : midX, ly: (p1.y + p2.y)/2 - 8
      });
    });
  });

  return { width, height, nodes, edges };
});

const onPointerDown = (e, id) => {
  e.preventDefault();
  draggingId.value = id;
  const pt = svgRef.value.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const svgP = pt.matrixTransform(svgRef.value.getScreenCTM().inverse());
  
  // On récupère la position actuelle dans le layout (pas le Custom, mais le final)
  const node = layout.value.nodes.find(n => n.id === id);
  dragOffset.value = { x: svgP.x - (node.cx - NODE_R), y: svgP.y - (node.cy - NODE_R) };
  document.body.classList.add('is-dragging');
};

const onPointerMove = (e) => {
  if (!draggingId.value) return;
  const pt = svgRef.value.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const svgP = pt.matrixTransform(svgRef.value.getScreenCTM().inverse());
  
  emit('update-position', {
    id: draggingId.value,
    x: Math.max(0, svgP.x - dragOffset.value.x),
    y: Math.max(0, svgP.y - dragOffset.value.y)
  });
};

const onPointerUp = () => {
  draggingId.value = null;
  document.body.classList.remove('is-dragging');
};
</script>