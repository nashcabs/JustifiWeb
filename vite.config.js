import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const basePath = process.env.BASE_PATH || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  function rewritePublicAssetPaths() {
    return {
      name: 'rewrite-public-asset-paths',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('/src/') && !id.endsWith('/index.html') && !id.endsWith('index.html')) {
          return null;
        }

        if (!code.includes('/assets/')) {
          return null;
        }

        return code.replace(/\/assets\//g, `${normalizedBasePath}assets/`);
      }
    };
  }

  return {
    base: normalizedBasePath,
    plugins: [rewritePublicAssetPaths(), react()],
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['chart.js/auto']
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});