import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'

const savedTheme = window.localStorage.getItem('control-plane-theme')
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light'
const savedLocale = window.localStorage.getItem('control-plane-locale')
document.documentElement.lang = savedLocale === 'zh' ? 'zh-CN' : 'en'
document.documentElement.dataset.locale = savedLocale === 'zh' ? 'zh' : 'en'

if (environment.production) {
  enableProdMode()
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err))
