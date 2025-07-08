// src/electron.d.ts
import { Note } from './store/notesStore';

// 전역 Window 인터페이스를 확장하여 electronAPI 타입을 정의합니다.
declare global {
  interface Window {
    electronAPI: {
      // ===================================================================
      // Renderer -> Main (요청/응답이 있는 양방향 통신)
      // ===================================================================
      
      /** 앱 시작 시 메인 프로세스로부터 초기 노트 목록을 가져옵니다. */
      getInitialNotes: () => Promise<Note[]>;
      
      /** 클립보드의 이미지를 파일로 저장하고 그 경로를 반환받습니다. */
      saveImageFromClipboard: () => Promise<string | null>;


      // ===================================================================
      // Renderer -> Main (응답이 없는 단방향 통신)
      // ===================================================================
      
      /** 메인 프로세스에 새 노트 생성을 요청합니다. */
      requestNewNote: () => void;

      /** 메인 프로세스에 노트 삭제를 요청합니다. */
      removeNote: (noteId: string) => void;

      /** 노트의 일부 속성 변경을 메인 프로세스에 요청합니다. */
      updateNote: (partialNote: Partial<Note> & { id: string }) => void;

      /** 가져오기(import) 후 모든 창을 다시 만들도록 요청합니다. */
      recreateAllWindows: (notes: Note[]) => void;

      /** 메인 프로세스에 창 종료 신호를 보냅니다. */
      closeWindow: (noteId: string) => void,

      /** 메인 프로세스에 '항상 위에 표시' 상태를 요청합니다. */
      togglePinStatus: (isPinned: boolean) => void;

      /** 메인 프로세스에 창의 투명도 변경을 요청합니다. */
      setOpacity: (opacity: number) => void,

      // ===================================================================
      // Main -> Renderer (메인 프로세스로부터 오는 이벤트를 수신)
      // ===================================================================

      /** 메인 프로세스가 보내는 업데이트를 수신하는 범용 리스너입니다. */
      on: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// 이 파일이 모듈로 동작하도록 export {} 를 추가합니다.
export {};