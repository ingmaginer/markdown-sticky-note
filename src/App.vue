<template>
  <StickyNote v-if="noteId" :note-id="noteId" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNotesStore } from './store/notesStore';
import StickyNote from './components/StickyNote.vue';

const noteId = ref<string | null>(null);
const notesStore = useNotesStore();

onMounted(() => {
  // --- 1. 창의 고유 ID 설정 ---
  const id = window.location.hash.substring(1);
  if (id) {
    noteId.value = id;
  }
  
  // ===================================================================
  // ✨ 메인 프로세스로부터 오는 방송을 수신하는 리스너들
  // ===================================================================
  
  // '가져오기' 후 모든 노트를 교체하고 창을 다시 만들라는 요청
  window.electronAPI.on('import-notes-data', (importedNotes) => {
    notesStore.setNotes(JSON.parse(JSON.stringify(importedNotes)));
    window.electronAPI.recreateAllWindows(JSON.parse(JSON.stringify(notesStore.notes)));
  });

  // 메인 프로세스에서 특정 노트의 데이터가 변경되었다는 알림을 받았을 때
  window.electronAPI.on('note-updated', (updatedNote) => {
    if (updatedNote.id !== noteId.value) {
      notesStore.applyNoteUpdate(updatedNote);
    }
  });

  // 메인 프로세스에서 새 노트가 추가되었다는 알림을 받았을 때
  window.electronAPI.on('note-added', (newNote) => {
    // applyNoteUpdate가 없는 노트는 추가하는 로직도 겸하므로 재사용
    notesStore.applyNoteUpdate(newNote); 
  });

  // 메인 프로세스에서 노트가 삭제되었다는 알림을 받았을 때
  window.electronAPI.on('note-removed', (removedNoteId) => {
    notesStore.applyNoteRemoval(removedNoteId);
  });

  // 트레이 메뉴에서 '새 노트'를 클릭했을 때
  window.electronAPI.on('create-new-note-request', () => {
    notesStore.requestNewNote();
  });
});
</script>


<style>
/* Vite의 기본 스타일을 제거하고, 
  노트 창이 깔끔하게 보이도록 기본 스타일을 설정합니다.
*/
html,
body,
#app {
  margin: 0;
  padding: 0;
  /* frame: false, transparent: true 옵션을 사용하므로 
    배경을 투명하게 만들어 StickyNote 컴포넌트만 보이게 합니다.
  */
  background-color: transparent;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>