let store: any

async function initStore() {
  if (!store) {
    const Store = (await import('electron-store')).default
    store = new Store<{ markedPaths: string[] }>({
      defaults: {
        markedPaths: [],
      },
    })
  }
  return store
}

export async function getMarkedPaths(): Promise<string[]> {
  const s = await initStore()
  return s.get('markedPaths', [])
}

export async function saveMarkedPaths(paths: string[]): Promise<void> {
  const s = await initStore()
  s.set('markedPaths', paths)
}

