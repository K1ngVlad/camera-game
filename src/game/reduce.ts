import type { SaveData, SessionState, Action, Effect, ReduceResult, WorldCtx } from './types'
import type { CatId } from '../data/cats'
import { CAT_MAP } from '../data/cats'
import {
  currentCat,
  isStageOpen,
  isGameComplete,
} from './progression'
import { tickHint, onCameraSwitch, resetHint, initHint } from './hints'
import { getCatView, initPuzzle, applyEvent } from './behaviors/index'
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
    puzzle: null,
    hint: initHint(),
    dialogue: [],
    popup: null,
  }
}

function ensurePuzzle(
  session: SessionState,
  found: CatId[],
): SessionState {
  const current = currentCat(found)
  if (!current) return { ...session, puzzle: null }
  if (session.puzzle?.catId === current) return session
  const cat = CAT_MAP.get(current)
  if (!cat) return { ...session, puzzle: null }
  return { ...session, puzzle: { catId: current, state: initPuzzle(cat) } }
}

function dispatchBehaviorEvent(
  session: SessionState,
  found: CatId[],
  event: import('./types').BehaviorEvent,
): SessionState {
  if (!session.puzzle) return session
  const cat = CAT_MAP.get(session.puzzle.catId)
  if (!cat) return session
  const ctx: WorldCtx = { screen: session.screen, camera: session.camera, uv: session.uv }
  const newState = applyEvent(cat, session.puzzle.state, event, ctx)
  if (newState === session.puzzle.state) return session
  return { ...session, puzzle: { catId: session.puzzle.catId, state: newState } }
}

export function reduce(
  save: SaveData,
  session: SessionState,
  action: Action,
): ReduceResult {
  const effects: Effect[] = []

  switch (action.type) {
    case 'openScreen': {
      let newSession = { ...session, screen: action.screen }

      // Init puzzle when entering game screens
      if (action.screen === 'office' || action.screen === 'cameras') {
        newSession = ensurePuzzle(newSession, save.found)
      }

      // Dispatch screenChanged to behavior
      newSession = dispatchBehaviorEvent(newSession, save.found, {
        type: 'screenChanged',
        screen: action.screen,
      })

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
      const newHint = onCameraSwitch(session.hint, action.now ?? 0)
      let newSession = { ...session, camera: action.camera, hint: newHint }

      newSession = dispatchBehaviorEvent(newSession, save.found, {
        type: 'cameraChanged',
        from: session.camera,
        to: action.camera,
      })

      return { save, session: newSession, effects }
    }

    case 'toggleUV': {
      return { save, session: { ...session, uv: !session.uv }, effects }
    }

    case 'horn': {
      effects.push({ type: 'sfx', id: 'horn' })
      const newSession = dispatchBehaviorEvent(session, save.found, {
        type: 'horn',
        camera: session.camera,
      })
      return { save, session: newSession, effects }
    }

    case 'bar': {
      const newSession = dispatchBehaviorEvent(session, save.found, { type: 'bar' })
      return { save, session: newSession, effects }
    }

    case 'clickCat': {
      const current = currentCat(save.found)
      if (!current) return { save, session, effects }

      const cat = CAT_MAP.get(current)
      if (!cat) return { save, session, effects }

      const ctx: WorldCtx = { screen: session.screen, camera: session.camera, uv: session.uv }
      const view = getCatView(cat, session.puzzle?.state, ctx)
      if (!view.clickable || view.camera !== session.camera) {
        return { save, session, effects }
      }

      if (action.target !== current) return { save, session, effects }

      // Cat found!
      const newFound: CatId[] = [...save.found, current]
      const newSave: SaveData = { version: 1, found: newFound }
      const newHint = resetHint(action.now ?? 0)

      effects.push({ type: 'sfx', id: 'found' })
      effects.push({ type: 'popup', catId: current })

      return {
        save: newSave,
        session: { ...session, hint: newHint, popup: current, puzzle: null },
        effects,
      }
    }

    case 'closePopup': {
      const justFound = session.popup
      let newSession = { ...session, popup: null }

      // Init puzzle for the next cat
      newSession = ensurePuzzle(newSession, save.found)

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
