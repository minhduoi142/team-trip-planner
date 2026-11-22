const TOKEN_KEY = 'tp.accessToken'

/** localStorage có thể bị chặn (chế độ riêng tư): mọi thao tác đều bọc try/catch. */
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* bỏ qua: phiên chỉ sống trong bộ nhớ */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* bỏ qua */
    }
  },
}
