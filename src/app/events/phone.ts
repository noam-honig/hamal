export function sendWhatsappToPhone(
  phone: string,
  smsMessage: string,
  test = false
) {
  phone = fixPhoneInput(phone)
  if (phone.startsWith('0')) {
    phone = `+972` + phone.substring(1)
  }

  if (phone.startsWith('+')) phone = phone.substring(1)
  if (test)
    window.open(
      'whatsapp://send/?phone=' + phone + '&text=' + encodeURI(smsMessage),
      '_blank'
    )
  else
    window.open(
      'https://wa.me/' + phone + '?text=' + encodeURI(smsMessage),
      '_blank'
    )
}

export function fixPhoneInput(s: string) {
  if (!s) return s
  let orig = s.trim()
  s = s.replace(/\D/g, '')
  if (s.startsWith('972')) s = s.substring(3)
  //if (orig.startsWith('+')) return '+' + s
  if (s.length == 9 && s[0] != '0' && s[0] != '3') s = '0' + s
  return s
}

export function isPhoneValidForIsrael(input: string) {
  if (input) {
    input = input.trim()
    let st1 = input.match(/^0(5\d|7\d|[2,3,4,6,8,9])(-{0,1}\d{3})(-*\d{4})$/)
    return st1 != null
  }
  return false
}
//[ ] - clean and validate phone
//[ ] - display phone correctly
//[ ] - add volunteer button
