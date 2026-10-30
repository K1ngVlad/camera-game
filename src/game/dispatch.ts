import { store } from '../state/store'
import { saveAtom, sessionAtom } from '../state/atoms'
import { reduce } from './reduce'
import type { Action } from './types'
import { engine } from '../audio/AudioEngine'

export function dispatch(action: Action): void {
  const save = store.get(saveAtom)
  const session = store.get(sessionAtom)
  const { save: newSave, session: newSession, effects } = reduce(save, session, action)

  store.set(saveAtom, newSave)
  store.set(sessionAtom, newSession)

  for (const effect of effects) {
    switch (effect.type) {
      case 'sfx':
        engine.playSfx(effect.id)
        break
      case 'dialogue':
        store.set(sessionAtom, { ...store.get(sessionAtom), dialogue: effect.lines })
        break
      case 'popup':
        // popup already set in reducer via session.popup; no extra work needed
        break
    }
  }
}
