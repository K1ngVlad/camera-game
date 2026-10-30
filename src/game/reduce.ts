import type { SaveData, SessionState, Action, Effect, ReduceResult } from './types'
import type { CatId } from '../data/cats'
import { CAT_MAP } from '../data/cats'
import {
  currentCat,
  isStageOpen,
  isGameComplete,
} from './progression'
import { tickHint, onCameraSwitch, resetHint, initHint } from './hints'
import { getCatView } from './behaviors/index'
import {
  INTRO,
  CAT_DIALOGUES,
  STAGE_UNLOCKED,
  FINALE,
} from '../data/dialogues'

export const DEFAULT_SAVE: SaveData = { version: 1, found: [] }

export function defaultSession(): SessionState {
  return {
    screen: 'menu',
    camera: 1,
    uv: false,
    hint: initHint(),
    dialogue: [],
    popup: null,
  }
}

export function reduce(
  save: SaveData,
  session: SessionState,
  action: Action,
): ReduceResult {
  const effects: Effect[] = []

  switch (action.type) {
    case 'openScreen': {
      const newSession = { ...session, screen: action.screen }

      // First entry to office without found cats → show intro
      if (action.screen === 'office' && save.found.length === 0 && session.screen === 'menu') {
        const current = currentCat(save.found)
        const lines = [...INTRO]
        if (current) {
          lines.push(...CAT_DIALOGUES[current].onStart)
        }
        effects.push({ type: 'dialogue', lines })
      }

      return { save, session: newSession, effects }
    }

    case 'selectCamera': {
      const newHint = onCameraSwitch(session.hint, Date.now() / 1000)
      return {
        save,
        session: { ...session, camera: action.camera, hint: newHint },
        effects,
      }
    }

    case 'toggleUV': {
      return { save, session: { ...session, uv: !session.uv }, effects }
    }

    case 'horn': {
      effects.push({ type: 'sfx', id: 'horn' })
      return { save, session, effects }
    }

    case 'clickCat': {
      const current = currentCat(save.found)
      if (!current) return { save, session, effects }

      const cat = CAT_MAP.get(current)
      if (!cat) return { save, session, effects }

      const view = getCatView(cat)
      if (!view.clickable || view.camera !== session.camera) {
        return { save, session, effects }
      }

      if (action.target !== current) return { save, session, effects }

      // Cat found!
      const newFound: CatId[] = [...save.found, current]
      const newSave: SaveData = { version: 1, found: newFound }
      const newHint = resetHint(Date.now() / 1000)

      effects.push({ type: 'sfx', id: 'found' })
      effects.push({ type: 'popup', catId: current })

      return {
        save: newSave,
        session: { ...session, hint: newHint, popup: current },
        effects,
      }
    }

    case 'closePopup': {
      const justFound = session.popup
      const newSession = { ...session, popup: null }

      if (!justFound) return { save, session: newSession, effects }

      const lines: import('../data/dialogues').DialogueLine[] = []
      lines.push(...CAT_DIALOGUES[justFound].onFound)

      const stageJustUnlocked = isStageOpen(save.found) && !isStageOpen(save.found.filter((f) => f !== justFound))
      if (stageJustUnlocked) {
        lines.push(...STAGE_UNLOCKED)
      }

      if (isGameComplete(save.found)) {
        lines.push(...FINALE)
      } else {
        // Introduce next cat
        const next = currentCat(save.found)
        if (next) {
          lines.push(...CAT_DIALOGUES[next].onStart)
        }
      }

      if (lines.length > 0) {
        effects.push({ type: 'dialogue', lines })
      }

      return { save, session: newSession, effects }
    }

    case 'dialogueNext': {
      if (session.dialogue.length <= 1) {
        return { save, session: { ...session, dialogue: [] }, effects }
      }
      return {
        save,
        session: { ...session, dialogue: session.dialogue.slice(1) },
        effects,
      }
    }

    case 'dialogueSkip': {
      return { save, session: { ...session, dialogue: [] }, effects }
    }

    case 'tick': {
      const newHint = tickHint(session.hint, action.now)
      if (newHint === session.hint) return { save, session, effects }
      return { save, session: { ...session, hint: newHint }, effects }
    }

    case 'resetProgress': {
      const newSave: SaveData = { version: 1, found: [] }
      const newSession = defaultSession()
      return { save: newSave, session: newSession, effects }
    }

    default:
      return { save, session, effects }
  }
}
