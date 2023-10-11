import { Pool, PoolClient, QueryResult } from 'pg'
import { Remult, SqlDatabase } from 'remult'
import {
  PostgresDataProvider,
  PostgresPool,
  PostgresSchemaBuilder,
} from 'remult/postgres'

export class PostgresSchemaWrapper implements PostgresPool {
  constructor(private pool: Pool, private schema: string) {}
  async connect(): Promise<PoolClient> {
    let r = await this.pool.connect()

    await r.query('set search_path to ' + this.schema)
    return r
  }
  async query(queryText: string, values?: any[]): Promise<QueryResult> {
    let c = await this.connect()
    try {
      return await c.query(queryText, values)
    } finally {
      c.release()
    }
  }
}

export async function createPostgresDataProviderWithSchema(args: {
  entities: any[]
  schema: string
  connectionString?: string
  disableSsl: boolean
}) {
  const pool = new Pool({
    connectionString: args.connectionString || process.env['DATABASE_URL'],
    ssl: args.disableSsl
      ? false
      : {
          rejectUnauthorized: false,
        },
  })
  const result = new SqlDatabase(
    new PostgresDataProvider(new PostgresSchemaWrapper(pool, args.schema!))
  )
  const sb = new PostgresSchemaBuilder(result, args.schema)
  const remult = new Remult(result)
  await sb.ensureSchema(
    args.entities.map((e) => remult.repo(e as any).metadata)
  )
  return result
}
