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
  try {
    const s = await initStore()
    return s.get('markedPaths', [])
  } catch (error) {
    console.error('Error getting marked paths:', error)
    return []
  }
}

export async function saveMarkedPaths(paths: string[]): Promise<void> {
  try {
    const s = await initStore()
    s.set('markedPaths', paths)
  } catch (error) {
    console.error('Error saving marked paths:', error)
  }
}

