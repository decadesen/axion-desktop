import { createApp } from 'vue'
import './style.css'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/responsive.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
