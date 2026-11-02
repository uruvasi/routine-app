import type { D1Migration } from '@cloudflare/vitest-plugin'
import type { Env } from '../env'

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      RP_ID: string
      RP_ORIGIN: string
      SETUP_PASSPHRASE: string
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
export type TestEnv = Env
