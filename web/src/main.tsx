import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { I18nProvider } from './i18n'
import './styles/global.css'
import './styles/control-plane.css'

const savedTheme = window.localStorage.getItem('control-plane-theme')
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light'
const savedLocale = window.localStorage.getItem('control-plane-locale')
document.documentElement.lang = savedLocale === 'zh' ? 'zh-CN' : 'en'
document.documentElement.dataset.locale = savedLocale === 'zh' ? 'zh' : 'en'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
