import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { researchHandler } from './server/research.ts'

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), ['REPAIR_AI_', 'OPENAI_API_KEY'])
  for (const key of ['REPAIR_AI_API_KEY', 'OPENAI_API_KEY', 'REPAIR_AI_MODEL']) {
    if (!process.env[key] && localEnv[key]) process.env[key] = localEnv[key]
  }
  return {
    plugins: [
      react(),
      {
        name: 'second-life-research-api',
        configureServer(server) {
          server.middlewares.use('/api/research', researchHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/research', researchHandler)
        },
      },
    ],
    test: {
      include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    },
  }
})
