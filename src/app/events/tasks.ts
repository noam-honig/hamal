import {
  IdEntity,
  Entity,
  Allow,
  EntityRef,
  FieldMetadata,
  Validators,
  ValueConverters,
  remult,
  ValueListFieldType,
  Fields,
  Field,
  Relations,
  dbNamesOf,
  SqlDatabase,
  repo,
  Remult,
} from 'remult'
import {
  DataControl,
  DataControlInfo,
  DataControlSettings,
  RowButton,
} from '../common-ui-elements/interfaces'

import moment from 'moment'
import { Roles } from '../users/roles'
import { UITools } from '../common/UITools'
import { GeocodeResult } from '../common/address-input/google-api-helpers'
import { PhoneField } from './phone'
import { volunteerInTask } from './volunteerInTask'

@ValueListFieldType({
  caption: 'סטטוס משימה',
  defaultValue: () => taskStatus.active,
})
export class taskStatus {
  static active = new taskStatus(0, 'פתוח לרישום')
  static preparation = new taskStatus(5, 'הכנה')
  static archive = new taskStatus(9, 'ארכיון')

  constructor(public id: number, public caption: string) {}
}

@ValueListFieldType({
  caption: 'קטגוריה',
  getValues: () => [
    Category.delivery,

    new Category('איסוף מזון וציוד'),
    new Category('הכנת מזון'),
    new Category('אחר'),
  ],
})
export class Category {
  static delivery = new Category('שינוע')
  constructor(
    public caption: string,
    public id: string | undefined = undefined
  ) {
    if (!id) this.id = caption
  }
}
@Entity<Task>('tasks', {
  allowApiCrud: Roles.admin,
  allowApiRead: Allow.authenticated,

  apiPrefilter: () => {
    if (remult.isAllowed(Roles.admin)) return {}
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return {
      eventStatus: taskStatus.active,
      eventDate: { $lte: d },
    }
  },
})
export class Task extends IdEntity {
  async showVolunteers(ui: UITools) {
    if (remult.isAllowed(Roles.admin)) await this.save()
    await ui.showVolunteers(this)
    await this._.reload()
  }

  @Fields.string<Task>({
    caption: 'כותרת',
    validate: (s, c) => Validators.required(s, c),
  })
  title = ''

  @Field(() => taskStatus)
  eventStatus: taskStatus = taskStatus.active
  @Fields.string({
    caption: 'תאור',
    customInput: (x) => x.textarea(),
  })
  description = ''
  @Field(() => Category)
  category = Category.delivery
  @Fields.dateOnly<Task>({
    caption: 'תאריך',
    validate: (s, c) => {
      if (!c.value || c.value.getFullYear() < 2018) c.error = 'תאריך שגוי'
    },
  })
  eventDate: Date = new Date()
  // @Fields.string({ inputType: 'time', caption: 'שעה' })
  // @DataControl({ width: '110' })
  // startTime = '08:00'
  // @Fields.string({ inputType: 'time', caption: 'שעת סיום' })
  // @DataControl({ width: '110' })
  // endTime = ''
  @Fields.integer({ caption: 'מספר מתנדבים נדרש' })
  requiredVolunteers = 1
  @Fields.json<GeocodeResult>()
  addressApiResult: GeocodeResult | null = null
  @Fields.string({
    caption: 'מיקום',
    customInput: (c) =>
      c.inputAddress(
        (result, event: Task) =>
          (event.addressApiResult = result.autoCompleteResult)
      ),
  })
  address = ''

  @PhoneField()
  phone1 = ''
  @Fields.string({ caption: 'איש קשר' })
  phone1Description = ''
  @Fields.integer<Task>({
    caption: 'מתנדבים רשומים',
    allowApiUpdate: false,
  })
  registeredVolunteers = 0
  @Fields.createdAt()
  createdAt = new Date()
  @Fields.string({ includeInApi: Roles.admin, allowApiUpdate: false })
  createUserId = remult.user?.id!

  @Fields.boolean<Task>({
    caption: 'רשום לאירוע',
    sqlExpression: async (e) => {
      const v = await dbNamesOf(volunteerInTask)
      return `(select true registered from ${v} where ${
        v.taskId
      }=${await e.getDbName()}.${await e.fields.id.getDbName()} 
      and ${await SqlDatabase.filterToRaw<volunteerInTask>(
        repo(volunteerInTask),
        {
          volunteerId: remult.user?.id,
          canceled: false,
        }
      )} limit 1)`
    },
  })
  registered = false
  @Relations.toMany<Task, volunteerInTask>(() => volunteerInTask)
  volunteers?: volunteerInTask[]

  openEditDialog(
    ui: UITools,
    cancel: () => void = () => {},
    saved?: VoidFunction
  ) {
    const e = this.$
    ui.areaDialog({
      title: 'פרטי משימה',
      fields: [
        e.category,
        e.title,
        e.description,
        e.eventDate,
        e.address,
        e.phone1,
        e.phone1Description,
        e.requiredVolunteers,
        e.eventStatus,
      ],
      ok: () => this.save().then(() => saved && saved()),
      cancel: () => {
        this._.undoChanges()
        cancel()
      },
      buttons: [
        {
          text: 'הצג מתנדבים',
          click: () => ui.showVolunteers(this),
        },
      ],
    })
  }
  static rowButtons(ui: UITools): RowButton<Task>[] {
    return [
      {
        name: 'פרטי משימה',
        click: async (e) => {
          e.openEditDialog(ui)
        },
      },
      {
        name: 'מתנדבים',
        click: async (e) => {
          e.showVolunteers(ui)
        },
      },
    ]
  }
}
export function mapFieldMetadataToFieldRef(
  e: EntityRef<any>,
  x: DataControlInfo<any>
) {
  let y = x as DataControlSettings<any, any>
  if (y.getValue) {
    return y
  }
  if (y.field) {
    return { ...y, field: e.fields.find(y.field as FieldMetadata) }
  }
  return e.fields.find(y as FieldMetadata)
}
export const day = 86400000

export function eventDisplayDate(
  e: Task,
  group = false,
  today: Date | undefined = undefined
) {
  if (e.eventDate) {
    let edd = e.eventDate
    if (!today) today = new Date()
    today = ValueConverters.DateOnly.fromJson!(
      ValueConverters.DateOnly.toJson!(new Date())
    )
    let todayJson = ValueConverters.DateOnly.toJson!(today)
    let t = today.valueOf()
    let d = edd.valueOf()
    if (d > t - day) {
      if (d < t + day)
        return `היום` + ' (' + moment(d).locale('he').format('DD/MM') + ')'
      if (d < t + day * 2)
        return 'מחר' + ' (' + moment(d).locale('he').format('DD/MM') + ')'
      if (group) {
        let endOfWeek = t - today.getDay() * day + day * 7
        if (d < endOfWeek) return 'השבוע'
        if (d < endOfWeek + day * 7) return 'שבוע הבא'
        if (edd.getFullYear() == today.getFullYear())
          return edd.toLocaleString('he', { month: 'long' })

        if (group)
          return edd.toLocaleString('he', { month: 'long', year: '2-digit' })
      }
    }
    if (group) return 'עבר'

    return moment(d).locale('he').format('DD/MM (dddd)')
  }
  if (group) return 'gcr'
  return ''
}
