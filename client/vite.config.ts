import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev` gets its data from the gateway started by `make client`.
    proxy: { '/api': process.env.GATEWAY_URL ?? 'http://localhost:3000' },
  },
})
