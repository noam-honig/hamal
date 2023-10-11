import { Component, OnDestroy, OnInit } from '@angular/core'

import { remult, repo, Unsubscribe } from 'remult'
import { Roles } from '../users/roles'
import { Task } from './tasks'
import { UITools } from '../common/UITools'
import { UIToolsService } from '../common/UIToolsService'

@Component({
  selector: 'app-org-events',
  templateUrl: './org-events.component.html',
  styleUrls: ['./org-events.component.scss'],
})
export class OrgEventsComponent implements OnInit, OnDestroy {
  constructor(private tools: UIToolsService) {}

  ngOnDestroy(): void {
    if (this.unObserve) this.unObserve()
  }
  addTask() {
    const t = repo(Task).create()
    t.openEditDialog(this.tools)
  }
  unObserve?: Unsubscribe
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }

  events: Task[] = []
  async ngOnInit() {
    this.unObserve = repo(Task)
      .liveQuery()
      .subscribe(({ items }) => (this.events = items))
  }
}
