import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@resvg/resvg-js': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-win32-x64-msvc': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-win32-ia32-msvc': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-darwin-x64': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-darwin-arm64': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-linux-x64-gnu': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-linux-x64-musl': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-linux-arm64-gnu': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
      '@resvg/resvg-js-android-arm64': path.resolve(__dirname, 'src/services/io/__mocks__/resvg-js-shim.ts'),
    },
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths()
  ],
  optimizeDeps: {
    exclude: ['h5wasm'],
  },
})
