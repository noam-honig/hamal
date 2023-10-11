import { Component, OnInit } from '@angular/core'
import { User } from './user'

import { UIToolsService } from '../common/UIToolsService'
import { Roles } from './roles'

import { terms } from '../terms'
import { GridSettings } from 'common-ui-elements/interfaces'
import { remult, repo } from 'remult'
import { saveToExcel } from '../common-ui-elements/interfaces/src/saveGridToExcel'
import { BusyService } from '../common-ui-elements'

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  constructor(private ui: UIToolsService, private busyService: BusyService) {}
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }

  users: GridSettings<User> = new GridSettings<User>(remult.repo(User), {
    allowDelete: false,
    allowInsert: false,
    allowUpdate: true,
    columnOrderStateKey: 'users',

    orderBy: { name: 'asc' },
    rowsInPage: 100,

    columnSettings: (users) => [users.name, users.phone, users.admin],
    gridButtons: [
      {
        name: 'Excel',
        click: () => saveToExcel(this.users, 'users', this.busyService),
      },
    ],
    rowButtons: [
      {
        name: terms.resetPassword,
        click: async () => {
          if (
            await this.ui.yesNoQuestion(
              terms.passwordDeleteConfirmOf + ' ' + this.users.currentRow.name
            )
          ) {
            this.ui.info(terms.passwordDeletedSuccessful)
          }
        },
      },
    ],
    confirmDelete: async (h) => {
      return await this.ui.confirmDelete(h.name)
    },
  })
  async addVolunteer() {
    const v = repo(User).create()
    this.ui.areaDialog({
      title: 'הוספת מתנדב',
      fields: [v.$.name, v.$.phone, v.$.admin],
      ok: async () => {
        await v.save()
        this.users.items.splice(0, 0, v)
      },
    })
  }

  ngOnInit() {}
}
//[ ] add change log
//[ ] record create user
