export interface CameraConfig {
  id: number
  name: string
  background?: string
  props?: string[]
}

export const CAMERAS: CameraConfig[] = [
  { id: 1, name: 'Переулок' },
  { id: 2, name: 'Прачечная' },
  { id: 3, name: 'Крыша' },
  { id: 4, name: 'Парковка' },
  { id: 5, name: 'Подвал' },
  { id: 6, name: 'Двор с баками' },
  { id: 7, name: 'Детская площадка' },
  { id: 8, name: 'Рынок' },
  { id: 9, name: 'Караоке-бар' },
  { id: 10, name: 'Тыквенная грядка', props: ['moon'] },
  { id: 11, name: 'Остановка' },
  { id: 12, name: 'Подъезд' },
  { id: 13, name: 'Стройка' },
  { id: 14, name: 'Причал' },
  { id: 15, name: 'Склад' },
  { id: 16, name: 'Клуб' },
]

export const CAMERA_MAP = new Map(CAMERAS.map((c) => [c.id, c]))

// Grid 4×4: row = (id-1)/4, col = (id-1)%4
export function neighbors(id: number): number[] {
  const row = Math.floor((id - 1) / 4)
  const col = (id - 1) % 4
  const result: number[] = []
  if (row > 0) result.push(id - 4)
  if (row < 3) result.push(id + 4)
  if (col > 0) result.push(id - 1)
  if (col < 3) result.push(id + 1)
  return result
}

export const INITIAL_OPEN_CAMERAS: number[] = [1, 2, 5]
