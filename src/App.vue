<template>
  <header>
    <div class="brand">
      <h1>Méthode des Potentiels Métra</h1>
    </div>
  </header>

  <main>
    <div>
      <div class="panel">
        <h2>Ajouter une tâche</h2>
        <div v-if="error" id="err-box" style="display:block;">{{ error }}</div>

        <div class="field">
          <label>Nom de la tâche</label>
          <input type="text" v-model="newTask.name" @keydown.enter="focusDuration" placeholder="Ex: Fondations">
        </div>
        <div class="field">
          <label>Durée</label>
          <input type="number" ref="durationInput" v-model.number="newTask.duration" @keydown.enter="addTask" min="0" placeholder="Ex: 5">
        </div>
        <div class="field">
          <label>Tâches antérieures</label>
          <div class="preds-box">
            <div v-if="tasks.length === 0" class="preds-empty">Aucune tâche disponible.</div>
            <label v-else v-for="t in tasks" :key="t.id" class="pred-opt">
              <input type="checkbox" :value="t.id" v-model="newTask.preds"> <span>{{ t.name }}</span>
            </label>
          </div>
        </div>
        <button class="btn-primary" @click="addTask">+ Ajouter la tâche</button>
      </div>

      <div class="panel">
        <h2>Liste des tâches</h2>
        <p class="sub">{{ tasks.length }} {{ tasks.length > 1 ? 'tâches saisies' : 'tâche saisie' }}.</p>
        <table v-if="tasks.length > 0">
          <thead><tr><th>Tâche</th><th>Durée</th><th>Antériorités</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.id">
              <td class="task-name">{{ t.name }}</td>
              <td class="mono">{{ t.duration }} j</td>
              <td class="mono">{{ t.preds.length ? t.preds.map(id => taskNameById(id)).join(', ') : '—' }}</td>
              <td style="text-align:right;"><button class="btn-ghost" @click="removeTask(t.id)">Supprimer</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><b>Pas encore de tâche</b> Ajoutez votre première tâche pour commencer.</div>
      </div>
    </div>

    <div>
      <div class="panel">
        <div class="panel-header">
          <h2>Graphe MPM</h2>
          <button v-if="Object.keys(customPositions).length" @click="resetPositions" class="btn-ghost" style="color: var(--primary);">Réinitialiser positions</button>
        </div>
        <div class="legend">
          <span><i class="swatch" style="background:var(--ink-faint)"></i> Chemin normal</span>
          <span><i class="swatch" style="background:var(--critical)"></i> Chemin critique</span>
        </div>
        
        <MpmGraph :mpm="mpmData" :customPositions="customPositions" @update-position="updatePosition" />
      </div>

      <div class="panel">
        <h2>Résultats & Marges</h2>
        <div v-if="mpmData" class="stats-row">
          <div class="stat"><div class="val">{{ mpmData.projectDuration }} j</div><div class="lbl">Durée totale</div></div>
          <div class="stat"><div class="val">{{ mpmData.results.filter(r => r.critical).length }}</div><div class="lbl">Tâches critiques</div></div>
        </div>
        <table v-if="mpmData">
          <thead><tr><th>Tâche</th><th>Durée</th><th>Tôt</th><th>Tard</th><th>M. Totale</th><th>M. Libre</th><th>Statut</th></tr></thead>
          <tbody>
            <tr v-for="r in mpmData.results" :key="r.id" :class="{'critical-row': r.critical}">
              <td class="task-name">{{ r.name }}</td><td class="mono">{{ r.duration }}</td>
              <td class="mono">{{ r.earliest }}</td><td class="mono">{{ r.latest }}</td>
              <td class="mono">{{ r.totalFloat }}</td><td class="mono">{{ r.freeFloat }}</td>
              <td><span v-if="r.critical" class="tag-critical">CRITIQUE</span><span v-else>—</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><b>Aucun résultat</b> Les calculs apparaîtront ici.</div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { computeMPM } from './utils/mpm';
import MpmGraph from './components/MpmGraph.vue';

const tasks = ref([]);
let nextId = 1;
const newTask = reactive({ name: '', duration: null, preds: [] });
const error = ref('');
const durationInput = ref(null);
const customPositions = ref({});

const taskNameById = (id) => tasks.value.find(t => t.id === id)?.name || '?';

const mpmData = computed(() => {
  error.value = '';
  try {
    return computeMPM(tasks.value);
  } catch (err) {
    error.value = err.message;
    return null;
  }
});

const focusDuration = () => durationInput.value.focus();

const addTask = () => {
  if (!newTask.name.trim()) return error.value = 'Veuillez donner un nom à la tâche.';
  if (newTask.duration === null || newTask.duration < 0) return error.value = 'La durée doit être un nombre positif.';
  
  tasks.value.push({ id: nextId++, name: newTask.name.trim(), duration: newTask.duration, preds: [...newTask.preds] });
  newTask.name = ''; newTask.duration = null; newTask.preds = []; error.value = '';
};

const removeTask = (id) => {
  tasks.value = tasks.value.filter(t => t.id !== id);
  tasks.value.forEach(t => t.preds = t.preds.filter(p => p !== id));
  delete customPositions.value[id];
};

const updatePosition = ({ id, x, y }) => customPositions.value[id] = { x, y };
const resetPositions = () => customPositions.value = {};
</script>