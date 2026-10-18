import {getRequestConfig} from 'next-intl/server'
import {cookies} from 'next/headers'

export default getRequestConfig(async () => {
  const saved = (await cookies()).get('pv_locale')?.value
  const locale = saved === 'fr' ? 'fr' : 'en'
  const messages = (await import(`../messages/${locale}.json`)).default
  return {locale, messages}
})
