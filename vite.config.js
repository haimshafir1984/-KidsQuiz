import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // בפיתוח: בקשות /api מועברות לשרת המקומי (npm start בתיקיית server), כך שהכול על אותו מקור
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
