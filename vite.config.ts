import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目站点部署在 /仓库名/ 下，而不是域名根目录。
export default defineConfig({
  base: '/fretquest/',
  plugins: [react()],
})
