import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import vercelApiPlugin from './vercelApiPlugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
})
