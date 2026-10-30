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

export type BehaviorType = 'static' | 'hornReveal' | 'wait' | 'uvOnly' | 'collect' | 'callResponse' | 'runner' | 'combo'

export interface CatConfig {
  id: CatId
  name: string
  stem: string
  tint: string
  camera: number
  behavior: BehaviorType
  unlocks: { cameras: number[]; tools: Tool[] }
  grantsOnStart?: Tool[]
  stagePos: { x: number; y: number; scale?: number }
  stamp?: string
  enabled: boolean
}

export const CATS: CatConfig[] = [
  {
    id: 'drummer',
    name: 'Барабанщик',
    stem: 'drums',
    tint: '#F4F1E8',
    camera: 1,
    behavior: 'static',
    unlocks: { cameras: [3, 6], tools: ['horn'] },
    stagePos: { x: 0.24, y: 0.92, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'longcat',
    name: 'Лонг Кэт',
    stem: 'bass',
    tint: '#E9A15B',
    camera: 6,
    behavior: 'hornReveal',
    unlocks: { cameras: [7, 10], tools: [] },
    stagePos: { x: 0.44, y: 0.92, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'keyboard',
    name: 'Кейборд Кэт',
    stem: 'keys',
    tint: '#9FB4FF',
    camera: 3,
    behavior: 'wait',
    unlocks: { cameras: [4, 9], tools: [] },
    stagePos: { x: 0.64, y: 0.92, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'pumpkin',
    name: 'Тыква-кот',
    stem: 'pumpkin',
    tint: '#F28C28',
    camera: 10,
    behavior: 'uvOnly',
    unlocks: { cameras: [11, 13], tools: [] },
    grantsOnStart: ['uv'],
    stagePos: { x: 0.84, y: 0.92, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'choir',
    name: 'Котята-хор',
    stem: 'choir',
    tint: '#F2B3B8',
    camera: 7,
    behavior: 'collect',
    unlocks: { cameras: [8, 12, 14], tools: [] },
    stagePos: { x: 0.14, y: 0.62, scale: 0.4 },
    enabled: true,
  },
  {
    id: 'trumpet',
    name: 'Кот-трубач',
    stem: 'trumpet',
    tint: '#FFFFFF',
    camera: 14,
    behavior: 'callResponse',
    unlocks: { cameras: [], tools: [] },
    stagePos: { x: 0.34, y: 0.62, scale: 0.4 },
    enabled: false,
  },
  {
    id: 'popcat',
    name: 'Pop Cat',
    stem: 'pop',
    tint: '#FFFFFF',
    camera: 12,
    behavior: 'runner',
    unlocks: { cameras: [], tools: [] },
    stagePos: { x: 0.66, y: 0.62, scale: 0.4 },
    enabled: false,
  },
  {
    id: 'bongo',
    name: 'Bongo Cat',
    stem: 'bongo',
    tint: '#FFFFFF',
    camera: 16,
    behavior: 'combo',
    unlocks: { cameras: [], tools: [] },
    stagePos: { x: 0.86, y: 0.62, scale: 0.4 },
    enabled: false,
  },
]

export const CAT_MAP = new Map(CATS.map((c) => [c.id, c]))

export const ENABLED_CATS = CATS.filter((c) => c.enabled)
