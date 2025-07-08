<template>
  <div v-if="note" class="sticky-note-wrapper" :style="{ backgroundColor: note.color, fontSize: `${note.fontSize}px` }">
    <div class="note-header">
      <div class="note-title" @dblclick="toggleTitleEdit">
        <input v-if="isTitleEdit" type="text" id="titleInput" @input="updateTitle" :value="note.title" placeholder="제목 없음">
        <p v-else>{{ note.title }}</p>
      </div>
      <div class="header-buttons">
        <button @click="handleNewNote" class="header-btn plus-btn">➕</button>
        <button @click="togglePin" class="header-btn pin-btn">📌</button>
        <button @click="toggleSettings" class="header-btn settings-btn">⚙️</button>
        <button @click="handleCloseNote" class="header-btn close-btn">❌</button>
      </div>
    </div>
    <div v-if="isSettingsOpen" class="settings-panel">
      <div class="setting-item">
        <label for="color-picker">노트 색상</label>
        <input type="color" id="color-picker" :value="note.color" @input="updateSettings({ color: ($event.target as HTMLInputElement).value })">
      </div>
      <div class="setting-item">
        <label for="opacity-slider">투명도</label>
        <input type="range" id="opacity-slider" min="0.2" max="1" step="0.1" :value="note.transparency" @input="updateSettings({ transparency: Number(($event.target as HTMLInputElement).value) })">
      </div>
      <div class="setting-item">
        <label for="font-size-input">글자 크기</label>
        <input type="number" id="font-size-input" min="8" max="32" :value="note.fontSize" @input="updateSettings({ fontSize: Number(($event.target as HTMLInputElement).value) })">
      </div>
      <div class="setting-item">
        <label for="font-size-input">노트 삭제</label>
        <button @click="handleDeleteNote" class="header-btn">🗑️</button>
      </div>
    </div>
    <div class="note-body" @dblclick="toggleEdit">
      <textarea v-if="isEdit"
        class="editor"
        :value="note.content"
        @input="updateContent"
        @paste="handlePaste"
        placeholder="마크다운으로 내용을 입력하세요..."
      ></textarea>
      <div v-else class="markdown-body preview" v-html="renderedHtml"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { marked, type Tokens } from 'marked';
import { useNotesStore } from '../store/notesStore';

const renderer = {
  link({ href, title, text }: Tokens.Link): string {
    const localLink = href.startsWith(
      `${location.protocol}//${location.hostname}`
    );
    if (location.protocol.startsWith("http")) {
      // to avoid title="null"
      if (title === null || title === undefined) {
        return localLink
          ? `<a href="${href}">${text}</a>`
          : `<a target="_blank" rel="noreferrer noopener" href="${href}">${text}</a>`;
      }

      return localLink
        ? `<a href="${href}" title="${title}">${text}</a>`
        : `<a target="_blank" rel="noreferrer noopener" href="${href}" title="${title}">${text}</a>`;
    } else {
      if (title === null || title === undefined) {
        return `<a href="${href}">${text}</a>`
      }

      return `<a href="${href}" title="${title}">${text}</a>`;
    }
  },
};

marked.use({ renderer });

// --- Props and Store Initialization ---
const props = defineProps<{
  noteId: string;
}>();
const notesStore = useNotesStore();

// --- Local Component State ---
const isSettingsOpen = ref(false);
const isTitleEdit = ref(false);
const isEdit = ref(false);

// --- Computed Properties ---
const note = computed(() => notesStore.findNoteById(props.noteId));

const renderedHtml = computed(() => {
  return note.value ? marked.parse(note.value.content) : '';
});


// ===================================================================
// ✨ 모든 데이터 변경은 스토어 액션을 통해 메인 프로세스에 요청합니다.
// ===================================================================

const updateTitle = (event: Event) => {
  if (note.value) {
    const target = event.target as HTMLInputElement;
    note.value.title = target.value
    notesStore.updateNote({ id: props.noteId, title: target.value });
  }
};

const updateContent = (event: Event) => {
  if (note.value) {
    const target = event.target as HTMLTextAreaElement;
    note.value.content = target.value
    notesStore.updateNote({ id: props.noteId, content: target.value });
  }
};

const updateSettings = (payload: { color?: string, transparency?: number, fontSize?: number }) => {
  if (note.value) {
    if (payload.transparency) {
      note.value.transparency = payload.transparency;
      window.electronAPI.setOpacity(payload.transparency);
    }
    if (payload.color) note.value.color = payload.color;
    if (payload.fontSize) note.value.fontSize = payload.fontSize;
    notesStore.updateNote({ id: props.noteId, ...payload });
  }
};

const togglePin = async () => {
  if (note.value) {
    note.value.isPinned = !note.value.isPinned
    notesStore.updateNote({ id: props.noteId, isPinned: note.value.isPinned });
    window.electronAPI.togglePinStatus(note.value.isPinned);
  }
};


// ===================================================================
// ✨ 사용자 인터랙션 핸들러
// ===================================================================

const toggleSettings = async () => {
  isSettingsOpen.value = !isSettingsOpen.value;

  await nextTick(); // DOM이 업데이트된 후 실행

  const header = document.querySelector('.note-header') as HTMLDivElement;
  // 세팅 패널이 표시되면 겹치는 현상이 발생하여 note-body를 아래로 내려야 한다.
  const noteBody = document.querySelector('.note-body') as HTMLDivElement;
  if (isSettingsOpen.value) {
    // 열렸을 때
    const settingsPanel = document.querySelector('.settings-panel') as HTMLDivElement;
    noteBody.style.top = `${header.offsetHeight + settingsPanel.offsetHeight}px`
  } else {
    // 닫혔을 때
    noteBody.style.top = `${header.offsetHeight}px`
  }  
};

const toggleTitleEdit = async () => {
  isTitleEdit.value = !isTitleEdit.value;
  if (isTitleEdit.value) {
    await nextTick();
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('#titleInput')?.focus();
    }, 0);
  }
};

const toggleEdit = async () => {
  isEdit.value = !isEdit.value;
  if (isEdit.value) {
    await nextTick();
    setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('.editor')?.focus();
    }, 0);
  }
};

const handleNewNote = () => {
  notesStore.requestNewNote();
};

const handleCloseNote = async () => {
  notesStore.updateNote({ id: props.noteId, isOpen: false });
  await nextTick();
  window.electronAPI.closeWindow(props.noteId);
};

const handleDeleteNote = () => {
  if (confirm('정말로 이 노트를 삭제하시겠습니까?')) {
    notesStore.requestNoteRemoval(props.noteId);
  }
};


// ===================================================================
// ✨ IPC 통신
// ===================================================================

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault();
      window.electronAPI.saveImageFromClipboard();
      return;
    }
  }
};

// --- Listener for events from Main process ---
onMounted(() => {
  window.electronAPI.on('image-pasted', async (imagePath) => {
    const markdownImage = `\n![붙여넣은 이미지](${imagePath})\n`;
    if (note.value) {
      const textarea = document.querySelector<HTMLTextAreaElement>('.editor')
      if (textarea) {
        const before = textarea.value.slice(0, textarea.selectionStart);
        const addImagePath = before + markdownImage;
        textarea.value = addImagePath + textarea.value.slice(textarea.selectionEnd);;
        note.value.content = textarea.value;
        notesStore.updateNote({ id: props.noteId, content: textarea.value });

        await nextTick();
        setTimeout(() => {
          textarea.selectionStart = addImagePath.length;
          textarea.selectionEnd = addImagePath.length;
        }, 10);
      }
    }
  });
});

</script>

<style scoped>
.sticky-note-wrapper {
  height: 100%;
  border: 1px solid #ccc;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.note-content {
  flex-grow: 1;
  border: none;
  padding: 10px;
  font-size: 14px;
  background-color: transparent;
  resize: none;
}
.note-content:focus {
  outline: none;
}

.note-body {
  position: fixed;
  top: 30px;
  width: 100%;
  height: -webkit-fill-available;
  display: flex;
}
.editor,
.preview {
  width: 100%;
  padding: 10px;
  overflow-y: auto;
  text-align: justify;
  background-color: transparent;
}
.editor {
  font: inherit;
  border: none;
  resize: none;
}
.editor:focus {
  outline: none;
}
/* ✨ preview 내부의 HTML 요소들에 대한 기본 스타일 추가 */
.preview :deep(h1),
.preview :deep(h2),
.preview :deep(h3) {
  margin-top: 0;
  border-bottom: 1px solid #a0a0a0;
}
.preview :deep(pre) {
  color: #e6e8ea;
  background-color: #707070;
  padding: 2px 4px;
  border-radius: 4px;
}
.preview :deep(table) {
 border-collapse: collapse;
 width: 100%;
 margin-bottom: 1em;
}
.preview :deep(th),
.preview :deep(td) {
 border: 1px solid #ccc;
 padding: 0.5em;
}
.preview :deep(th) {
 background-color: #a0a0a0;
}

/* ✨ 추가: 에디터와 프리뷰 영역의 스크롤바를 숨기는 스타일 */
.editor::-webkit-scrollbar,
.preview::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera 등 */
}
/* Firefox를 위한 추가 설정 (선택 사항) */
.editor,
.preview {
  scrollbar-width: none; /* Firefox */
}

.note-header {
  height: 30px;
  background-color: rgba(0, 0, 0, 0.08);
  /* ✨ Electron에서 드래그 가능 영역으로 설정 */
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding: 0 5px;
}

.note-title {
  /* flex-grow: 1; 남은 공간을 모두 차지 */
  display: flex;
  align-items: center;
  min-width: 60px;
  margin: 0 10px;
  font-size: 14px;
  font-weight: bold;
  margin-right: auto;
  height: 100%;
  overflow: hidden;
  -webkit-app-region: no-drag; /* 입력 필드는 드래그 제외 */
}
.note-title > input {
  width: 100%;
  border: none;
  color: #333;
  background: transparent;
  -webkit-app-region: no-drag; /* 입력 필드는 드래그 제외 */
}
.note-title > input:focus {
  outline: none;
  border-bottom: 1px solid #999;
}

.header-buttons {
  display: flex;
  -webkit-app-region: no-drag; /* 버튼 영역은 드래그 제외 */
}

/* 모든 헤더 버튼의 공통 스타일 */
.header-btn {
  border: none;
  background: transparent;
  padding: 0 4px;
  margin: 0 2px;
  cursor: pointer;
  font-size: 20px;
  color: #555;
  transition: all 0.2s ease;
}
/* 개별 버튼 호버 효과 */
.header-btn:hover {
  transform: scale(1.2);
}

.close-btn:hover {
  color: #e53935; /* 빨간색으로 변경 */
}

.settings-panel {
  height: fit-content;
  padding: 10px;
  background-color: rgba(0,0,0,0.05);
  border-bottom: 1px solid #eee;
}
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 16px;
}
</style>