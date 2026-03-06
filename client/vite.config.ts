import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, createLogger } from "vite"

const logger = createLogger()
const originalError = logger.error.bind(logger)
logger.error = (msg, options) => {
  if (options?.error && ['ECONNRESET', 'EPIPE'].includes((options.error as NodeJS.ErrnoException).code ?? '')) return
  originalError(msg, options)
}

export default defineConfig({
  customLogger: logger,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return
            console.error('[ws proxy error]', err)
          })
        },
      },
    },
  },
})
