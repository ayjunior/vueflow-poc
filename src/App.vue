<template>
  <div class="container-fluid py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">Vue Flow POC — Diagrama Básico</h1>
      <span class="badge text-bg-secondary">Vue 3 · Options API</span>
    </div>
    <h1 class="h4 mt-4 mb-3">Organograma</h1>
    <p class="text-muted small mb-3">
      Estrutura hierárquica montada a partir de um JSON plano (id / parentId).
    </p>
    <OrgChart />
  </div>
</template>

<script>
import OrgChart from './components/OrgChart.vue'

export default {
  name: 'App',
  components: { OrgChart }
}
</script>
