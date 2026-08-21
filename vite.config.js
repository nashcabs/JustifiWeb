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

  function preloadGeneratedCss() {
    return {
      name: 'preload-generated-css',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(
            /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
            '<link rel="preload" as="style" crossorigin href="$1" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" crossorigin href="$1"></noscript>'
          );
        }
      }
    };
  }

  return {
    base: normalizedBasePath,
    plugins: [rewritePublicAssetPaths(), preloadGeneratedCss(), react()],
    build: {
      cssCodeSplit: true,
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