import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Configuração Vite ──
export default defineConfig({
  plugins: [react()],
  server: { open: true },
})
