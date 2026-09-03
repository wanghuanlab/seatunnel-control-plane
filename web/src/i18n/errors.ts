import type { Translate } from './I18nContext'

const ERROR_KEYS: Record<string, string> = {
  '用户名或密码错误': 'login.invalidCredentials',
  'Incorrect username or password': 'login.invalidCredentials',
  '用户不存在': 'password.userMissing',
  '当前密码不正确': 'password.wrongCurrent',
  '新密码至少 6 位': 'password.minLength',
  '密码至少 6 位': 'password.minLength',
  '未登录或会话已过期': 'login.sessionExpired',
  '需要管理员权限': 'settings.forbidden',
}

export function localizeError(message: string, t: Translate): string {
  const key = ERROR_KEYS[message]
  return key ? t(key) : message
}
