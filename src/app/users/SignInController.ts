import {
  Allow,
  BackendMethod,
  Controller,
  ControllerBase,
  Fields,
  remult,
  repo,
  UserInfo,
  Validators,
} from 'remult'
import { terms } from '../terms'
import { Roles } from './roles'
import { User } from './user'
import { setSessionUser } from '../../server/server-session'
import { sendSms } from '../../server/send-sms'

const otp = '123456'
@Controller('signIn')
export class SignInController extends ControllerBase {
  @Fields.string({
    caption: 'מספר טלפון נייד',
    validate: Validators.required,
    inputType: 'tel',
  })
  phone = ''
  @Fields.string({
    caption: 'קוד חד פעמי',
    inputType: 'tel',
  })
  otp = ''
  @Fields.boolean({
    caption: terms.rememberOnThisDevice,
  })
  rememberOnThisDevice = false

  @Fields.boolean()
  askForOtp = false

  @BackendMethod({ allowed: true })
  /**
   * This sign mechanism represents a simplistic sign in management utility with the following behaviors
   * 1. The first user that signs in, is created as a user and is determined as admin.
   * 2. When a user that has no password signs in, that password that they've signed in with is set as the users password
   */
  async signIn() {
    const userRepo = remult.repo(User)
    let u = await userRepo.findFirst({ phone: this.phone })
    if (!u) {
      if ((await userRepo.count()) === 0) {
        //first ever user is the admin
        u = await userRepo.insert({
          name: this.phone,
          phone: this.phone,
          admin: true,
        })
      }
    }
    var d = new Date()
    d.setMinutes(d.getMinutes() + 5)
    const otp = generateRandomSixDigitNumber()

    await sendSms(
      this.phone,
      `הקוד לכניסה לעוזרים לצה"ל במה שאפשר הוא: ` + otp
    ).then((x) => console.log('sent', x))
    otps.set(this.phone, { otp: otp, expire: d })
    this.askForOtp = true
  }
  @BackendMethod({ allowed: true })
  async signInWithOtp(): Promise<UserInfo> {
    const otp = otps.get(this.phone)
    if (!otp || otp.expire < new Date()) {
      this.askForOtp = false
      throw Error('פג תוקף הקוד, נסה שנית')
    }
    if (otp.otp != this.otp) throw Error('קוד לא תקין')
    const user = await repo(User).findFirst({ phone: this.phone })
    if (!user) throw 'מספר טלפון לא מוכר'
    const roles: string[] = []
    if (user.admin) {
      roles.push(Roles.admin)
    }
    return setSessionUser(
      {
        id: user.id,
        name: user.name,
        roles,
      },
      this.rememberOnThisDevice
    )
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static signOut() {
    setSessionUser(undefined!, true)
  }
  @BackendMethod({ allowed: true })
  static currentUser() {
    return remult.user
  }
}
function generateRandomSixDigitNumber() {
  // Generate a random number between 100,000 (inclusive) and 1,000,000 (exclusive)
  const min = 100000
  const max = 1000000
  const randomNumber = Math.floor(Math.random() * (max - min)) + min
  return randomNumber.toString()
}

const otps = new Map<string, { otp: string; expire: Date }>()
