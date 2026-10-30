import type { CatView } from '../types'
import type { CatConfig } from '../../data/cats'
import { staticView } from './static'

// All unimplemented behaviors delegate to static for skeleton pass
export function getCatView(cat: CatConfig): CatView {
  return staticView(cat)
}
