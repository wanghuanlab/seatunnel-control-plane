export class PollingSource<T> {
  data: T | null = null
  error: string | null = null
  loading = true
  refreshing = false

  private timer: number | null = null
  private requestId = 0
  private intervalMs = 15000
  private enabled = true

  constructor(
    private loader: () => Promise<T>,
    private onChange: () => void = () => undefined,
  ) {}

  start(intervalMs: number, enabled = true) {
    this.intervalMs = intervalMs
    this.enabled = enabled
    void this.load('replace')
    this.restartTimer()
  }

  setLoader(loader: () => Promise<T>, reload = true) {
    this.loader = loader
    if (reload) void this.load(this.data != null ? 'silent' : 'replace')
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.restartTimer()
  }

  reload() {
    return this.load(this.data != null ? 'silent' : 'replace')
  }

  destroy() {
    this.requestId += 1
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  private restartTimer() {
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    if (!this.enabled || this.intervalMs <= 0) return
    this.timer = window.setInterval(() => {
      void this.load('silent')
    }, this.intervalMs)
  }

  private async load(mode: 'replace' | 'silent') {
    const id = ++this.requestId
    const keepCurrent = mode === 'silent' && this.data != null
    if (keepCurrent) this.refreshing = true
    else this.loading = true
    this.onChange()
    try {
      const result = await this.loader()
      if (id !== this.requestId) return
      this.data = result
      this.error = null
    } catch (err) {
      if (id !== this.requestId) return
      if (!keepCurrent) this.error = (err as Error).message
    } finally {
      if (id === this.requestId) {
        this.loading = false
        this.refreshing = false
        this.onChange()
      }
    }
  }
}

export class AsyncSource<T> {
  data: T | null = null
  error: string | null = null
  loading = true
  private active = true

  constructor(
    private loader: () => Promise<T>,
    private onChange: () => void = () => undefined,
  ) {
    void this.loadInitial()
  }

  reload() {
    return this.loader()
      .then((result) => {
        if (!this.active) return result
        this.data = result
        this.error = null
        this.onChange()
        return result
      })
      .catch((err: Error) => {
        if (!this.active) return
        this.error = err.message
        this.onChange()
      })
  }

  destroy() {
    this.active = false
  }

  private async loadInitial() {
    this.loading = true
    this.error = null
    this.onChange()
    try {
      const result = await this.loader()
      if (!this.active) return
      this.data = result
    } catch (err) {
      if (!this.active) return
      this.error = (err as Error).message
    } finally {
      if (this.active) {
        this.loading = false
        this.onChange()
      }
    }
  }
}
