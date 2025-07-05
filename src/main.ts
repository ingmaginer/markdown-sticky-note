// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';

// ✨ 스토어만 임포트합니다.
import { useNotesStore } from './store/notesStore';

// ✨ Vue 앱 초기화 과정을 비동기 함수로 변경
async function initializeApp() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // --- 스토어 초기화 ---
  // 1. 메인 프로세스로부터 초기 데이터를 비동기적으로 받아옵니다.
  const initialNotes = await window.electronAPI.getInitialNotes();
  const notesStore = useNotesStore();
  
  // 2. 받아온 데이터로 스토어를 초기화합니다.
  // JSON 변환은 데이터가 Proxy 객체일 경우를 대비한 안전장치입니다.
  notesStore.setNotes(JSON.parse(JSON.stringify(initialNotes)));

  // 3. 스토어가 준비된 후 앱을 마운트합니다.
  app.mount('#app');
}

initializeApp();