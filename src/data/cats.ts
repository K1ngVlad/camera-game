export type CatId =
  | 'drummer'
  | 'longcat'
  | 'keyboard'
  | 'pumpkin'
  | 'choir'
  | 'trumpet'
  | 'popcat'
  | 'bongo'

export type Tool = 'horn' | 'uv'

export type BehaviorConfig =
  | { type: 'static' }
  | { type: 'hornReveal' }
  | { type: 'wait'; bars: number }
  | { type: 'uvOnly' }
  | { type: 'collect' }
  | { type: 'callResponse' }
  | { type: 'runner' }
  | { type: 'combo' }

export interface CatAnimConfig {
  squash: number
  axis: 'x' | 'y'
  frameMode: 'none' | 'momentary' | 'latch'
  frames: string[]
  breathe?: number
}

export interface CatConfig {
  id: CatId
  name: string
  anim: CatAnimConfig
  display: { camera: number; stage: number }
  tint: string
  camera: number
  behavior: BehaviorConfig
  unlocks: { cameras: number[]; tools: Tool[] }
  grantsOnStart?: Tool[]
  /** SFX id played when this cat becomes the current target (alongside onStart dialogue) */
  onStartSfx?: string
  stagePos: { x: number; y: number; scale?: number }
  stamp?: string
  enabled: boolean
}

export const CATS: CatConfig[] = [
  {
    id: 'drummer',
    name: 'Барабанщик',
    anim: { squash: 0.15, axis: 'y', frameMode: 'momentary', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#F4F1E8',
    camera: 1,
    behavior: { type: 'static' },
    unlocks: { cameras: [3, 6], tools: ['horn'] },
    stagePos: { x: 0.24, y: 0.78, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'longcat',
    name: 'Лонг Кэт',
    anim: { squash: 0.2, axis: 'y', frameMode: 'none', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#E9A15B',
    camera: 6,
    behavior: { type: 'hornReveal' },
    unlocks: { cameras: [7, 10], tools: [] },
    stagePos: { x: 0.44, y: 0.78, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'keyboard',
    name: 'Кейборд Кэт',
    anim: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#9FB4FF',
    camera: 3,
    behavior: { type: 'wait', bars: 4 },
    unlocks: { cameras: [4, 9], tools: [] },
    stagePos: { x: 0.64, y: 0.78, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'pumpkin',
    name: 'Тыква-кот',
    anim: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#F28C28',
    camera: 10,
    behavior: { type: 'uvOnly' },
    unlocks: { cameras: [11, 13], tools: ['uv'] },
    grantsOnStart: ['uv'],
    onStartSfx: 'blackout',
    stagePos: { x: 0.84, y: 0.78, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'choir',
    name: 'Котята-хор',
    anim: { squash: 0.08, axis: 'y', frameMode: 'none', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#F2B3B8',
    camera: 7,
    behavior: { type: 'collect' },
    unlocks: { cameras: [8, 12, 14], tools: [] },
    stagePos: { x: 0.14, y: 0.62, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'trumpet',
    name: 'Кот-трубач',
    anim: { squash: 0.12, axis: 'x', frameMode: 'none', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#FFFFFF',
    camera: 14,
    behavior: { type: 'callResponse' },
    unlocks: { cameras: [], tools: [] },
    stagePos: { x: 0.34, y: 0.62, scale: 0.4 },
    enabled: false,
  },
  {
    id: 'popcat',
    name: 'Pop Cat',
    anim: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#FFFFFF',
    camera: 12,
    behavior: { type: 'runner' },
    unlocks: { cameras: [], tools: [] },
    stagePos: { x: 0.66, y: 0.62, scale: 0.4 },
    enabled: false,
  },
  {
    id: 'bongo',
    name: 'Bongo Cat',
    anim: { squash: 0.18, axis: 'y', frameMode: 'latch', frames: ['body'] },
    display: { camera: 220, stage: 200 },
    tint: '#FFFFFF',
    camera: 16,
    behavior: { type: 'combo' },
    unlocks: { cameras: [], tools: [] },
    stagePos: { x: 0.86, y: 0.62, scale: 0.4 },
    enabled: false,
  },
]

export const CAT_MAP = new Map(CATS.map((c) => [c.id, c]))

export const ENABLED_CATS = CATS.filter((c) => c.enabled)
