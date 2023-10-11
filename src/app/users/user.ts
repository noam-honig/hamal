import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  remult,
} from 'remult'
import { Roles } from './roles'
import { terms } from '../terms'
import { PhoneField } from '../events/phone'

@Entity<User>('Users', {
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Roles.admin,
  allowApiInsert: Roles.admin,
  apiPrefilter: () =>
    !remult.isAllowed(Roles.admin) ? { id: [remult.user?.id!] } : {},
  saving: async (user) => {
    if (isBackend()) {
      if (user._.isNew()) {
        user.createDate = new Date()
      }
    }
  },
})
export class User extends IdEntity {
  @Fields.string({
    validate: [Validators.required, Validators.uniqueOnBackend],
    caption: terms.username,
  })
  name = ''

  @PhoneField({
    validate: [Validators.required, Validators.uniqueOnBackend],
    inputType: 'tel',
  })
  phone = ''
  @Fields.createdAt()
  createDate = new Date()

  @Fields.string({ allowApiUpdate: false })
  createUserId = remult.user?.id || 'no user'

  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.admin,
  })
  admin = false
}
