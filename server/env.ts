export type Env = {
  DB: D1Database
  RP_ID: string
  RP_ORIGIN: string
  SETUP_PASSPHRASE: string
}

export type AppVars = { userId: string; sessionHash: string }
export type AppEnv = { Bindings: Env; Variables: AppVars }
