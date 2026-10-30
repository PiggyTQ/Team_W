import { defineConfig } from 'vite';
const apiProxy=process.env.CAREER_API_PROXY;
if(apiProxy&&!/^http:\/\/(?:127\.0\.0\.1|localhost):\d{1,5}$/.test(apiProxy))throw new Error('CAREER_API_PROXY must be a local HTTP origin');
export default defineConfig({esbuild:{jsxFactory:'localizedElement',jsxFragment:'React.Fragment',jsxInject:'import {localizedElement} from "/src/i18n/render.js";'},server:{port:5184,strictPort:true,watch:{ignored:['**/checks/**','**/检查记录/**']},...(apiProxy?{proxy:{'/api':{target:apiProxy}}}:{})},preview:{port:4173,strictPort:true},build:{rollupOptions:{output:{manualChunks:{react:['react','react-dom','react-dom/client'],translations:['./src/i18n/site-complete-en.json']}}}}});
