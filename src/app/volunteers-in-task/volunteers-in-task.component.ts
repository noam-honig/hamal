import { Component, OnInit } from '@angular/core'
import { Task } from '../events/tasks'
import { volunteerInTask } from '../events/volunteerInTask'
import { sendWhatsappToPhone } from '../events/phone'

@Component({
  selector: 'app-volunteers-in-task',
  templateUrl: './volunteers-in-task.component.html',
  styleUrls: ['./volunteers-in-task.component.scss'],
})
export class VolunteersInTaskComponent implements OnInit {
  sendWhatsapp(v: volunteerInTask) {
    sendWhatsappToPhone(v.volunteer?.phone!, 'שלום ' + v.volunteer?.name!)
  }
  constructor() {}
  args!: {
    task: Task
  }

  volunteers: volunteerInTask[] = []
  unSub = () => {}
  ngOnInit(): void {
    this.unSub = this.args.task._.relations.volunteers
      .liveQuery({
        include: { volunteer: true },
      })
      .subscribe(({ items }) => (this.volunteers = items))
  }
}
