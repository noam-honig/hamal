import {
  IdEntity,
  Entity,
  FieldsMetadata,
  Allow,
  isBackend,
  remult,
  Fields,
  Relations,
  repo,
} from 'remult'
import { GridSettings } from '../common-ui-elements/interfaces'
import { Roles } from '../users/roles'
import { UITools } from '../common/UITools'
import { User } from '../users/user'
import { Task } from './tasks'

@Entity<volunteerInTask>('volunteersForTask', {
  allowApiCrud: Allow.authenticated,
  allowApiDelete: false,
  apiPrefilter: () => ({
    volunteerId: !remult.isAllowed([Roles.admin])
      ? [remult.user?.id!]
      : undefined,
  }),
  saving: async (self) => {
    if (self.isNew() && isBackend()) {
      self.createUserId = remult.user!.id
    }
    if (self.canceled && self.$.canceled.valueChanged()) {
      self.cancelUserId = remult.user!.id
    }
    if (self.isNew() || self.$.canceled.valueChanged())
      self.registerStatusDate = new Date()
  },
  saved: async (self) => {
    if (self.$.canceled.valueChanged() || self._.isNew()) {
      const e = (await self._.relations.task.findOne())!
      e.registeredVolunteers = await e._.relations.volunteers.count({
        canceled: false,
      })
      await e.save()
    }
  },
})
export class volunteerInTask extends IdEntity {
  @Fields.string({ dbName: 'eventId' })
  taskId = ''
  @Relations.toOne<volunteerInTask, Task>(() => Task, 'taskId')
  task?: Task
  @Fields.string()
  volunteerId = ''
  @Relations.toOne<volunteerInTask, User>(() => User, 'volunteerId')
  volunteer?: User

  @Fields.boolean({ allowApiUpdate: Roles.admin })
  canceled = false

  @Fields.createdAt()
  createdAt = new Date()
  @Fields.string({ includeInApi: Roles.admin, allowApiUpdate: false })
  createUserId = remult.user?.id!

  @Fields.date()
  registerStatusDate = new Date()
  @Fields.string({ allowNull: true })
  cancelUserId: string | null = null
}
