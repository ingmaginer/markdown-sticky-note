import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// https://vitejs.dev/config/
export default defineConfig({
  // ✨ 1. Vue 앱의 빌드 출력 경로를 'dist/renderer'로 지정
  build: {
    outDir: 'dist/renderer',
  },
  plugins: [
    vue(),
    electron([
      {
        // ✨ 2. 메인 프로세스 코드의 진입점을 지정
        entry: 'electron/main.ts',
        // ✨ 3. 메인 프로세스 코드의 출력 경로를 'dist/main'으로 지정
        vite: {
          build: {
            outDir: 'dist/main'
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        // ✨ 4. Preload 스크립트의 출력 경로를 'dist/preload'로 지정
        vite: {
          build: {
            outDir: 'dist/preload'
          }
        }
      }
    ]),
    renderer(),
  ],
});