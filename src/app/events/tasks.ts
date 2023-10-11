import {
  IdEntity,
  Entity,
  FieldsMetadata,
  Allow,
  EntityRef,
  FieldMetadata,
  Validators,
  isBackend,
  ValueConverters,
  remult,
  ValueListFieldType,
  Fields,
  Field,
} from 'remult'
import {
  DataControl,
  DataControlInfo,
  DataControlSettings,
  GridSettings,
  RowButton,
} from '../common-ui-elements/interfaces'

import moment from 'moment'
import { Roles } from '../users/roles'
import { UITools } from '../common/UITools'
import { GeocodeResult } from '../common/address-input/google-api-helpers'

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
    await volunteerInTask.displayVolunteer({ event: this, ui })
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
  @Fields.boolean({ caption: 'אפשר גם ללא רכב' })
  okWithoutCar = false
  @Fields.boolean({ caption: 'אפשר מהבית' })
  okFromHome = false
  @Fields.string({ caption: 'טלפון', inputType: 'tel' })
  phone1 = ''
  @Fields.string({ caption: 'איש קשר' })
  phone1Description = ''
  @Fields.integer<Task>({
    caption: 'מתנדבים רשומים',
  })
  registeredVolunteers = 0
  @Fields.createdAt()
  createdAt = new Date()
  @Fields.string()
  createUserId = remult.user?.id!

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
        e.okWithoutCar,
        e.okFromHome,
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
          click: () => this.showVolunteers(ui),
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
})
export class volunteerInTask extends IdEntity {
  @Fields.string()
  eventId = ''
  @Fields.string()
  volunteerId = ''

  @Fields.boolean({ allowApiUpdate: Roles.admin })
  canceled = false

  @Fields.createdAt()
  createdAt = new Date()
  @Fields.string()
  createUserId = remult.user?.id!

  @Fields.date()
  registerStatusDate = new Date()
  @Fields.string({ allowNull: true })
  cancelUserId: string | null = null

  static async displayVolunteer({ event, ui }: { event: Task; ui: UITools }) {
    const gridSettings: GridSettings<volunteerInTask> =
      new GridSettings<volunteerInTask>(remult.repo(volunteerInTask), {
        columnOrderStateKey: 'volunteers-in-event',
        rowsInPage: 50,
        allowUpdate: true,
        where: () => ({ eventId: event.id }),
        orderBy: { registerStatusDate: 'desc' },
        knowTotalRows: true,
        numOfColumnsInGrid: 10,
        columnSettings: (ev: FieldsMetadata<volunteerInTask>) => [
          { width: '100', field: ev.volunteerId, readonly: true },
          ev.registerStatusDate,
          ev.createUserId,
          ev.canceled,
        ],
        rowCssClass: (v) => {
          if (v.canceled) return 'forzen'
          return ''
        },
      })
    await ui.gridDialog({
      title: event.title,

      settings: gridSettings,
    })
  }
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

/*

select  (select name from helpers where id=helper) helperName,
  (select phone from helpers where id=helper) helperName,
times,
lastTime
from (
select 
 helper,count(*) times,max(createDate) lastTime
from volunteersInEvent 
where eventId in (select id from events where type='packaging' and eventStatus=9 )
    and canceled=false
group by helper) as x
where helper not in (select id from helpers where doNotSendSms=true)
 and helper not in (select helper from volunteersInEvent where eventId in (select id from events where eventStatus=0))
order by 3 desc

*/
//[ ] סינון לפי קטגוריה
