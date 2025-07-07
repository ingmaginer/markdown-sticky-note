import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, clipboard, protocol, net, shell } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';
import debounce from 'lodash.debounce';

// --- 전역 변수 ---
let tray: Tray | null = null;
let loadedNotes: any[] = []; // ✨ 앱의 모든 노트 데이터를 담는 '단일 정보 출처'

// --- 앱 초기화 및 프로토콜 등록 ---
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-asset',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);


// ===================================================================
// ✨ 헬퍼 함수 (Helper Functions)
// ===================================================================

/** 모든 열려있는 창에 메시지를 방송(Broadcast)합니다. */
function broadcast(channel: string, ...args: any[]) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(channel, ...args);
  });
}

/** 노트를 파일에 저장합니다. (이제 객체를 직접 받아 처리합니다) */
async function saveNotes() {
  const userDataPath = app.getPath('userData');
  const notesFilePath = path.join(userDataPath, 'notes.json');
  try {
    await fs.writeFile(notesFilePath, JSON.stringify(loadedNotes, null, 2));
  } catch (err) {
    console.error('노트 저장에 실패했습니다:', err);
  }
}


// ===================================================================
// ✨ 핵심 로직 함수 (Core Logic Functions)
// ===================================================================

/** 새 노트 객체를 생성합니다. */
function createNewNoteData() {
  const newNote = {
    id: uuid(),
    title: `새 노트 ${loadedNotes.length + 1}`,
    isOpen: true,
    content: '# 환영합니다! 🎉\n\n이곳에 마크다운으로 메모를 작성해 보세요.',
    position: { x: Math.floor(Math.random() * 200) + 50, y: Math.floor(Math.random() * 200) + 50 },
    size: { width: 275, height: 350 },
    color: '#FFFACD',
    font: 'system-ui',
    fontSize: 14,
    isPinned: false,
    transparency: 1.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  loadedNotes.push(newNote);
  return newNote;
}

/** 트레이 메뉴를 생성하거나 업데이트합니다. */
const updateTrayMenu = () => {
  const loginSettings = app.getLoginItemSettings();
  const closedNotes = loadedNotes.filter(note => !note.isOpen);

  const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
    { label: '새 노트', click: () => ipcMain.emit('request-new-note') },
    { type: 'separator' },
    { label: '노트 내보내기', type: 'normal', click: handleExportNotes },
    { label: '노트 가져오기', type: 'normal', click: handleImportNotes },
    { type: 'separator' },
    { label: '로그인 시 자동 실행', type: 'checkbox', checked: loginSettings.openAtLogin,
      click: (menuItem) => app.setLoginItemSettings({ openAtLogin: menuItem.checked })
    },
    { type: 'separator' },
  ];

  if (closedNotes.length > 0) {
    template.push({
      label: '노트 다시 열기',
      submenu: closedNotes.map(note => ({
        label: note.title || '제목 없음',
        click: () => {
          const targetNote = loadedNotes.find(n => n.id === note.id);
          if (targetNote) {
            targetNote.isOpen = true;
            createNoteWindow(targetNote);
            updateTrayMenu();
            saveNotes();
          }
        }
      }))
    });
  }

  template.push({ type: 'separator' }, { label: '종료', click: () => app.quit() });
  tray?.setContextMenu(Menu.buildFromTemplate(template));
};

/** 노트 창을 생성합니다. */
const createNoteWindow = (note) => {
  const win = new BrowserWindow({
    x: note.position.x,
    y: note.position.y,
    width: note.size.width,
    height: note.size.height,
    minWidth: 250,
    minHeight: 250,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  win.setFullScreenable(false);
  win.setAlwaysOnTop(note.isPinned);
  win.setOpacity(note.transparency);

  const debouncedMoveHandler = debounce(() => {
    const [x, y] = win.getPosition();
    ipcMain.emit('update-note', null, { id: note.id, position: { x, y } });
  }, 300);
  win.on('move', debouncedMoveHandler);

  const debouncedResizeHandler = debounce(() => {
    const [width, height] = win.getSize();
    ipcMain.emit('update-note', null, { id: note.id, size: { width, height } });
  }, 300);
  win.on('resize', debouncedResizeHandler);
  
  win.on('closed', () => {
    const targetNote = loadedNotes.find(n => n.id === note.id);
    if(targetNote) targetNote.isOpen = false;
    updateTrayMenu();
    saveNotes();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  })
  
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}#${note.id}`);
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: note.id });
  }
};

// ✨ 노트 내보내기 로직
async function handleExportNotes() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  const { filePath } = await dialog.showSaveDialog({
    title: '노트 내보내기',
    defaultPath: `notes-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (filePath) {
    try {
      const backupData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        notes: loadedNotes.map(note => ({
            title: note.title,
            isOpen: note.isOpen,
            content: note.content,
            size: note.size,
            color: note.color,
            font: note.font,
            fontSize: note.fontSize,
            isPinned: note.isPinned,
            transparency: note.transparency
        }))
      };
      
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
      dialog.showMessageBox({ title: '성공', message: '노트를 성공적으로 내보냈습니다.' });
    } catch (err) {
      dialog.showErrorBox('내보내기 실패', '파일을 저장하는 중 오류가 발생했습니다.');
    }
  }
}

// ✨ 노트 가져오기 로직
async function handleImportNotes() {
    const { filePaths } = await dialog.showOpenDialog({
        title: '노트 가져오기',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePaths && filePaths.length > 0) {
      const filePath = filePaths[0];
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const importedNotes = JSON.parse(data).notes;
        
        importedNotes.forEach(note => {
          note.id = uuid();
          note.position = { x: Math.floor(Math.random() * 200) + 50, y: Math.floor(Math.random() * 200) + 50 };
          loadedNotes.push(note);
          if (note.isOpen) createNoteWindow(note);
          broadcast('note-updated', note);
        });

        saveNotes();
      } catch (error) {
        dialog.showErrorBox('가져오기 실패', '파일을 읽는 중 오류가 발생했습니다.');
      }
    }
}

// ===================================================================
// ✨ 앱 생명주기 및 IPC 핸들러
// ===================================================================

app.whenReady().then(async () => {
  protocol.handle('app-asset', (request) => {
    const fileName = new URL(request.url).hostname;
    const filePath = path.join(app.getPath('userData'), 'images', fileName);
    return net.fetch(`file://${filePath}`);
  });
  
  const notesFilePath = path.join(app.getPath('userData'), 'notes.json');
  try {
    const data = await fs.readFile(notesFilePath, 'utf-8');
    loadedNotes = JSON.parse(data);
  } catch (err) {
    loadedNotes = [];
  }

  if (loadedNotes.length === 0) {
    createNewNoteData();
    await saveNotes();
  }
  
  const openedNotes = loadedNotes.filter(note => note.isOpen);
  if (loadedNotes.length > 0 && openedNotes.length === 0) {
    loadedNotes[0].isOpen = true;
  }

  loadedNotes.forEach(note => {
    if (note.isOpen) createNoteWindow(note);
  });
  
  const iconPath = app.isPackaged
        ? path.join(__dirname, '../renderer/icon.png') // 프로덕션 경로
        : path.join(__dirname, `../../public/icon.png`);     // 개발 경로
  tray = new Tray(iconPath);
  tray.setToolTip('Markdown Sticky Notes');
  updateTrayMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // macOS가 아니면 앱 종료. macOS에서는 독에 남아있음.
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const noteToOpen = loadedNotes.find(note => note.isOpen) || loadedNotes[0];
    if (noteToOpen) {
      noteToOpen.isOpen = true;
      createNoteWindow(noteToOpen);
    }
  }
});

// --- IPC 핸들러들 ---

ipcMain.handle('get-initial-notes', () => loadedNotes);

ipcMain.on('request-new-note', () => {
  const newNote = createNewNoteData();
  createNoteWindow(newNote);
  saveNotes();
  updateTrayMenu();
  broadcast('note-added', newNote);
});

ipcMain.on('remove-note', (event, noteId) => {
  loadedNotes = loadedNotes.filter(note => note.id !== noteId);
  saveNotes();
  broadcast('note-removed', noteId);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
});

ipcMain.on('update-note', (event, partialNote) => {
  const noteIndex = loadedNotes.findIndex(n => n.id === partialNote.id);
  if (noteIndex === -1) return;

  loadedNotes[noteIndex] = { ...loadedNotes[noteIndex], ...partialNote, updatedAt: new Date().toISOString() };
  saveNotes();

  broadcast('note-updated', loadedNotes[noteIndex]);
});

ipcMain.on('save-image-from-clipboard', async (event) => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;

  const buffer = image.toJPEG(90);
  const imageDir = path.join(app.getPath('userData'), 'images');
  await fs.mkdir(imageDir, { recursive: true });
  
  const fileName = `image-${Date.now()}.jpeg`;
  await fs.writeFile(path.join(imageDir, fileName), buffer);
  
  const assetPath = `app-asset://${fileName}`;
  event.sender.send('image-pasted', assetPath);
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
});

ipcMain.on('set-opacity', (event, opacity) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setOpacity(Number(opacity));
  }
});

ipcMain.on('toggle-pin-status', (event, isPinned) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    // 해당 창을 찾아서 setAlwaysOnTop 속성을 설정
    win.setAlwaysOnTop(isPinned);
  }
});