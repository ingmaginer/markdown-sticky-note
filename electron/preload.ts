// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { Note } from '../src/store/notesStore';

contextBridge.exposeInMainWorld('electronAPI', {
  // ===================================================================
  // Renderer -> Main -> Renderer (요청/응답이 있는 양방향 통신)
  // ===================================================================
  getInitialNotes: () => ipcRenderer.invoke('get-initial-notes'),

  // ===================================================================
  // Renderer -> Main (응답이 없는 단방향 통신)
  // ===================================================================
  saveImageFromClipboard: () => ipcRenderer.send('save-image-from-clipboard'),
  requestNewNote: () => ipcRenderer.send('request-new-note'),
  removeNote: (noteId: string) => ipcRenderer.send('remove-note', noteId),
  updateNote: (partialNote: Partial<Note> & { id: string }) => ipcRenderer.send('update-note', partialNote),
  closeWindow: (noteId: string) => ipcRenderer.send('close-window', noteId),
  togglePinStatus: (isPinned: boolean) => ipcRenderer.send('toggle-pin-status', isPinned),
  setOpacity: (opacity: number) => ipcRenderer.send('set-opacity', opacity),

  // ===================================================================
  // Main -> Renderer (메인 프로세스로부터 오는 이벤트를 수신)
  // ===================================================================
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 수신을 허용할 채널 목록
    const validChannels = [
      'note-updated',
      'note-added',
      'note-removed',
      // 'import-notes-data',
      'image-pasted',
      'create-new-note-request',
    ];
    if (validChannels.includes(channel)) {
      // event 객체를 제외하고 callback에 인자들을 전달
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
});