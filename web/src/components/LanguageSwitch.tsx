import { useI18n, type Locale } from '../i18n'

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n()
  const options: Array<{ value: Locale; label: string }> = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
  ]

  return (
    <div className={`lang-switch${compact ? ' compact' : ''}`} role="group" aria-label="Language">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={locale === option.value ? 'active' : ''}
          onClick={() => setLocale(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
