import type { CatId } from '../data/cats'
import type { DialogueLine } from '../data/dialogues'

export type Screen = 'menu' | 'office' | 'cameras' | 'stage'

export interface SaveData {
  version: 1
  found: CatId[]
}

export interface HintState {
  level: 0 | 1 | 2
  switches: number
  since: number
}

export interface SessionState {
  screen: Screen
  camera: number
  uv: boolean
  puzzle: { catId: CatId; state: unknown } | null
  hint: HintState
  dialogue: DialogueLine[]
  popup: CatId | null
}

export type MusicPosition = {
  loopTime: number
  bar: number
  beat: number
  beatPhase: number
  loopPhase: number
}

export type Action =
  | { type: 'openScreen'; screen: Screen }
  | { type: 'selectCamera'; camera: number; now?: number }
  | { type: 'horn' }
  | { type: 'toggleUV' }
  | { type: 'clickCat'; target: string; now?: number }
  | { type: 'dialogueNext' }
  | { type: 'dialogueSkip' }
  | { type: 'closePopup' }
  | { type: 'resetProgress' }
  | { type: 'beat'; pos: MusicPosition }
  | { type: 'bar'; pos: MusicPosition }
  | { type: 'tick'; now: number }

export type Effect =
  | { type: 'sfx'; id: string }
  | { type: 'dialogue'; lines: DialogueLine[] }
  | { type: 'popup'; catId: CatId }

export interface ReduceResult {
  save: SaveData
  session: SessionState
  effects: Effect[]
}

// What the render layer needs to know about the current cat's view
export interface CatView {
  camera: number
  /** Render state name: 'visible' | 'hidden' | 'revealed' | 'out' | 'peek' | 'in' */
  catState: string
  clickable: boolean
  props: Record<string, 'shown' | 'hidden'>
}

// Events dispatched to behaviors from game actions
export type BehaviorEvent =
  | { type: 'horn'; camera: number }
  | { type: 'cameraChanged'; from: number; to: number }
  | { type: 'screenChanged'; screen: Screen }
  | { type: 'bar' }

// Context snapshot passed to behavior view/on
export interface WorldCtx {
  screen: Screen
  camera: number
  uv: boolean
}
