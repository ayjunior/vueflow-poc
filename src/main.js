import { createApp } from 'vue'
import App from './App.vue'

// Bootstrap 5
import 'bootstrap/dist/css/bootstrap.min.css'

// Vue Flow - estilos base (obrigatório) e tema padrão (opcional, mas recomendado)
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

createApp(App).mount('#app')
