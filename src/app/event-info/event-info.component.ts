import { Component, Input, OnInit, Output } from '@angular/core'
import { BusyService } from '../common-ui-elements'
import { EventEmitter } from 'events'

import { remult } from 'remult'
import { Roles } from '../users/roles'

import { UIToolsService } from '../common/UIToolsService'
import { Task, eventDisplayDate } from '../events/tasks'
import {
  getCity,
  getLongLat,
  openWaze,
} from '../common/address-input/google-api-helpers'
import { sendWhatsappToPhone } from '../events/phone'

@Component({
  selector: 'app-event-info',
  templateUrl: './event-info.component.html',
  styleUrls: ['./event-info.component.scss'],
})
export class EventInfoComponent implements OnInit {
  constructor(public dialog: UIToolsService, private busy: BusyService) {}
  @Output() phoneChanged = new EventEmitter()
  @Input()
  e!: Task
  @Input() noClose = false
  displayDate() {
    return eventDisplayDate(this.e)
  }
  openWaze() {
    openWaze(getLongLat(this.e.addressApiResult), this.e.address)
  }

  openGoogleMap() {
    window.open(
      'https://maps.google.com/maps?q=' +
        getLongLat(this.e.addressApiResult) +
        '&hl=he',
      '_blank'
    )
  }
  registerToEvent() {
    alert('123')
    //[ ] to implement
  }
  removeFromEvent() {
    //[ ] to implement
  }
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }
  registered() {
    //[ ] to implement
    return false
  }

  ngOnInit(): void {}
  edit() {
    this.e.openEditDialog(this.dialog)
  }
  getCity() {
    return getCity(this.e.addressApiResult?.results[0]?.address_components!)
  }

  sendWhatsapp(phone: string) {
    sendWhatsappToPhone(phone, '')
  }
}
