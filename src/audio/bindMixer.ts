import { store } from '../state/store'
import { saveAtom, sessionAtom } from '../state/atoms'
import { computeMix } from './mixer'
import { engine } from './AudioEngine'

let lastMixKey = ''

function applyMix(): void {
  const save = store.get(saveAtom)
  const session = store.get(sessionAtom)

  const key = `${session.screen}:${session.camera}:${save.found.join(',')}`
  if (key === lastMixKey) return
  lastMixKey = key

  const mix = computeMix({ screen: session.screen, camera: session.camera, found: save.found })
  engine.setMix(mix)
}

export function bindMixer(): () => void {
  const unsubSave = store.sub(saveAtom, applyMix)
  const unsubSession = store.sub(sessionAtom, applyMix)
  return () => {
    unsubSave()
    unsubSession()
  }
}
