import { defineConfig } from 'vitest/config'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'

export default defineConfig(async () => {
  const migrations = await readD1Migrations('migrations')
  return {
    test: {
      projects: [
        {
          test: {
            name: 'client',
            include: ['src/**/*.test.ts'],
            environment: 'node',
          },
        },
        {
          plugins: [
            cloudflareTest({
              miniflare: {
                compatibilityDate: '2026-11-01',
                compatibilityFlags: ['nodejs_compat'],
                d1Databases: ['DB'],
                bindings: {
                  RP_ID: 'rt.kazusa.org',
                  RP_ORIGIN: 'https://rt.kazusa.org',
                  SETUP_PASSPHRASE: 'test-pass',
                  TEST_MIGRATIONS: migrations,
                },
              },
            }),
          ],
          test: {
            name: 'server',
            include: ['server/**/*.test.ts'],
            setupFiles: ['server/test/apply-migrations.ts'],
          },
        },
      ],
    },
  }
})
