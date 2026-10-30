import { store } from '../state/store'
import { saveAtom, sessionAtom } from '../state/atoms'
import { computeAudioState } from './mixer'
import { engine } from './AudioEngine'
import { CATS } from '../data/cats'
import type { CatId } from '../data/cats'

function getCurrentCat(found: CatId[]): CatId | null {
  return CATS.filter((c) => c.enabled).find((c) => !found.includes(c.id))?.id ?? null
}

let lastKey = ''
let prevScreen = ''

function applyAudio(): void {
  const save = store.get(saveAtom)
  const session = store.get(sessionAtom)

  const { screen, camera } = session
  const { found } = save
  const currentCat = getCurrentCat(found)

  const key = `${screen}:${camera}:${found.join(',')}`
  if (key === lastKey) return
  lastKey = key

  const isStageEntry = screen === 'stage' && prevScreen !== 'stage'
  prevScreen = screen

  const state = computeAudioState({ screen, camera, found, currentCat })
  const songState = isStageEntry ? { ...state.song, restart: true } : state.song

  engine.setCameraLoop(state.camera)
  engine.setSong(songState)
}

export function bindMixer(): () => void {
  const unsubSave = store.sub(saveAtom, applyAudio)
  const unsubSession = store.sub(sessionAtom, applyAudio)
  return () => {
    unsubSave()
    unsubSession()
  }
}
