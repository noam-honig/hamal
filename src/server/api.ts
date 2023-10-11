import { remultExpress } from 'remult/remult-express'
import { createPostgresConnection } from 'remult/postgres'
import { User } from '../app/users/user'
import { SignInController } from '../app/users/SignInController'
import { initRequest } from './server-session'
import { Task } from '../app/events/tasks'
import { volunteerInTask } from 'src/app/events/volunteerInTask'
import { createPostgresDataProviderWithSchema } from './PostgresSchemaWrapper'
import { config } from 'dotenv'
config() //loads the configuration from the .env file

const entities = [User, Task, volunteerInTask]
export const api = remultExpress({
  controllers: [SignInController],
  entities,
  initRequest,
  dataProvider: () =>
    createPostgresDataProviderWithSchema({
      disableSsl: Boolean(process.env['dev']),
      schema: process.env['DB_SCHEMA']!,
    }),
})
