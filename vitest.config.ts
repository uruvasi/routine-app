import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'client',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
})
