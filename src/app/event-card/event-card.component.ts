import { Component, Input, OnInit } from '@angular/core'
import { Fields, getFields, remult } from 'remult'
import { EventInfoComponent } from '../event-info/event-info.component'
import { DataAreaSettings, RowButton } from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'

import * as copy from 'copy-to-clipboard'
import { UIToolsService } from '../common/UIToolsService'
import { Task, eventDisplayDate, taskStatus } from '../events/tasks'
import { Roles } from '../users/roles'
import {
  Location,
  GetDistanceBetween,
  getCity,
  getLongLat,
  getLocation,
  getCurrentLocation,
} from '../common/address-input/google-api-helpers'
const AllTypes = {
  id: 'asdfaetfsafads',
  caption: 'כל הסוגים',
  count: 0,
}
@Component({
  selector: 'app-event-card',
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss'],
})
export class EventCardComponent implements OnInit {
  constructor(private dialog: UIToolsService) {}
  @Input() listOptions: RowButton<any>[] = []
  menuOptions: RowButton<Task>[] = [
    {
      name: 'העבר לארכיב',
      click: async (e) => {
        e.eventStatus = taskStatus.archive
        await e.save()
        this.tasks = this.tasks.filter((x) => x != e)
        this.refresh()
      },
    },
  ]

  getStatus(e: Task) {
    if (e.eventStatus != taskStatus.active) return e.eventStatus.caption
    return ''
  }
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }
  dates: dateEvents[] = []
  cities: { id: string; count: number; caption: string }[] = []
  types: { id: string; count: number; caption: string }[] = []
  trackBy(i: number, e: { id: any }): any {
    return e.id as any
  }

  @Fields.string({
    caption: 'איפה?',
  })
  city: string = ''
  @Fields.string({ caption: 'סוג משימה' })
  type = 'הכל'
  area!: DataAreaSettings

  _tasks!: Task[]

  @Input()
  set tasks(val: Task[]) {
    this._tasks = val
    this.refresh()
  }
  showLocation = false
  refresh() {
    this.dates = []
    this.tasks.sort((a, b) => compareEventDate(a, b))

    let firstLongLat: string | undefined

    this.cities.splice(0)
    this.types.splice(0)
    for (const e of this._tasks) {
      if (!firstLongLat) firstLongLat = getLongLat(e.addressApiResult)
      if (getLongLat(e.addressApiResult) != firstLongLat)
        this.showLocation = true
      let d = this.dates.find((d) => d.date == eventDisplayDate(e, true))
      if (!d)
        this.dates.push((d = { date: eventDisplayDate(e, true), events: [] }))
      d.events.push(e)
      let city = this.cities.find((c) => c.id == this.eventCity(e))
      if (!city) {
        this.cities.push({
          id: this.eventCity(e),
          count: 1,
          caption: '',
        })
      } else city.count++
      // let type = this.types.find((c) => c.id == e.type?.id)
      // if (!type) {
      //   this.types.push({ id: e.type?.id, count: 1, caption: e.type?.caption })
      // } else type.count++
    }
    this.cities.sort((b, a) => a.count - b.count)
    this.cities.forEach((c) => (c.caption = c.id + ' - ' + c.count))
    this.cities.splice(0, 0, {
      id: '',
      count: this._tasks.length,
      caption: 'כל הארץ' + ' - ' + this._tasks.length,
    })

    this.types.sort((b, a) => a.count - b.count)
    this.types.forEach((c) => (c.caption = c.caption + ' - ' + c.count))

    this.types.splice(0, 0, AllTypes)

    this.dates = this.dates.filter((d) => d.events.length > 0)
    this.sortEvents()
    this.area = new DataAreaSettings({
      fields: () => [
        [
          {
            field: this.$.city,
            valueList: this.cities,
            visible: () => this.cities.length > 2,
          },
          {
            field: this.$.type,
            valueList: this.types,
            visible: () => this.types.length > 2,
          },
        ],
      ],
    })
  }

  filter(e: Task) {
    return (
      (this.city == '' || this.eventCity(e) == this.city) && 1 == 1
      // (this.type == undefined ||
      //   this.type == AllTypes ||
      //   e.type.id == this.type.id)
    )
  }
  hasEvents(d: dateEvents) {
    return !!d.events.find((x) => this.filter(x))
  }
  get tasks() {
    return this._tasks
  }
  get $() {
    return getFields(this, remult)
  }

  ngOnInit(): void {}
  eventDetails(e: Task) {
    openDialog(EventInfoComponent, (x) => (x.e = e))
  }
  displayDate(e: Task) {
    return eventDisplayDate(e)
  }
  clickButton(b: RowButton<Task>, e: Task) {
    b.click!(e)
  }
  showVolunteers(e: Task) {
    e.showVolunteers(this.dialog)
  }
  edit(e: Task) {
    e.openEditDialog(this.dialog)
    this.refresh()
  }
  isFull(e: Task) {
    if (e.requiredVolunteers > 0) {
      if (e.requiredVolunteers <= e.registeredVolunteers) {
        return true
      }
    }
    return false
  }

  adminVolunteers(e: Task) {
    if (remult.isAllowed(Roles.admin) && e.registeredVolunteers != undefined)
      if (e.requiredVolunteers)
        return (
          e.registeredVolunteers + '/' + e.requiredVolunteers + ' ' + 'מתנדבים'
        )
      else return e.registeredVolunteers + ' ' + 'מתנדבים'
    return ''
  }
  distance(e: Task) {
    if (!this.volunteerLocation) return undefined
    return (
      GetDistanceBetween(
        this.volunteerLocation,
        getLocation(e.addressApiResult)
      ).toFixed(1) +
      ' ' +
      'ק"מ'
    )
  }
  volunteerLocation?: Location
  async sortByDistance() {
    try {
      if (!this.volunteerLocation)
        this.volunteerLocation = await getCurrentLocation(true, this.dialog)
      else this.volunteerLocation = undefined
      this.sortEvents()
    } catch {}
  }
  isRegisteredToEvent(task: Task) {
    console.log('not implemented ')
    return false
  }
  eventCity(e: Task) {
    return getCity(e.addressApiResult?.results[0].address_components!)
  }
  sortEvents() {
    if (!this.volunteerLocation)
      this.dates.forEach((d) => d.events.sort((a, b) => compareEventDate(a, b)))
    else
      this.dates.forEach((d) =>
        d.events.sort(
          (a, b) =>
            GetDistanceBetween(
              this.volunteerLocation!,
              getLocation(a.addressApiResult)
            ) -
            GetDistanceBetween(
              this.volunteerLocation!,
              getLocation(b.addressApiResult)
            )
        )
      )
  }
}

function compareEventDate(a: Task, b: Task) {
  let r = a.eventDate.valueOf() - b.eventDate.valueOf()

  if (r != 0) return r
  return (a.createdAt?.valueOf() || 0) - (b.createdAt?.valueOf() || 0)
}

interface dateEvents {
  date: string
  events: Task[]
}
