import { defineStore } from 'pinia';

// 노트의 모든 속성을 포함하는 인터페이스 (변경 없음)
export interface Note {
  id: string;
  title: string;
  isOpen: boolean;
  isWinClose: boolean;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  font: string;
  fontSize: number;
  isPinned: boolean;
  transparency: number;
  createdAt: string;
  updatedAt: string;
}

export const useNotesStore = defineStore('notes', {
  state: () => ({
    notes: [] as Note[],
    noteId: '',
  }),
  getters: {
    findNoteById: (state) => {
      return (noteId: string): Note | undefined => state.notes.find(note => note.id === noteId);
    },
    closedNotes: (state) => state.notes.filter(note => !note.isOpen),
  },
  // ===================================================================
  // ✨ actions: 이제 직접 상태를 변경하지 않고, 메인 프로세스에 요청만 보냅니다.
  // ===================================================================
  actions: {
    // -------------------------------------------------------------------
    // 1. 메인 프로세스로부터 받은 데이터로 스토어를 업데이트하는 액션들
    // -------------------------------------------------------------------

    /**
     * 스토어의 전체 노트 목록을 설정합니다. (앱 초기화, 데이터 가져오기 시 사용)
     */
    setNotes(notes: Note[]) {
      this.notes = notes;
    },

    /**
     * 변경된 노트 하나만 스토어에 적용합니다. (동기화의 핵심)
     */
    applyNoteUpdate(updatedNote: Note) {
      const noteIndex = this.notes.findIndex(n => n.id === updatedNote.id);
      if (noteIndex !== -1) {
        // 배열의 해당 요소를 교체하여 Vue의 반응성을 트리거합니다.
        this.notes.splice(noteIndex, 1, updatedNote);
      } else {
        // 스토어에 없는 새로운 노트일 경우, 배열에 추가합니다.
        this.notes.push(updatedNote);
      }
    },
    
    /**
     * 스토어에서 특정 노트를 제거합니다.
     */
    applyNoteRemoval(noteId: string) {
        this.notes = this.notes.filter(note => note.id !== noteId);
    },


    // -------------------------------------------------------------------
    // 2. 사용자의 상호작용을 메인 프로세스에 알리는 액션들
    // -------------------------------------------------------------------

    /**
     * 메인 프로세스에 새 노트 생성을 요청합니다.
     */
    requestNewNote() {
      window.electronAPI.requestNewNote();
    },

    /**
     * 메인 프로세스에 노트 삭제를 요청합니다.
     */
    requestNoteRemoval(noteId: string) {
      window.electronAPI.removeNote(noteId);
    },

    /**
     * 메인 프로세스에 노트의 부분적인 업데이트를 요청합니다.
     * Object.assign과 같은 방식으로 동작하여 어떤 속성이든 유연하게 업데이트할 수 있습니다.
     */
    updateNote(partialNote: Partial<Note> & { id: string }) {
      window.electronAPI.updateNote(JSON.parse(JSON.stringify(partialNote)));
    },
  },
});