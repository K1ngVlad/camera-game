import type { CatView } from '../types'
import type { CatConfig } from '../../data/cats'

// Static behavior: cat is always visible and clickable on its camera
export function staticView(cat: CatConfig): CatView {
  return {
    camera: cat.camera,
    visible: true,
    clickable: true,
  }
}
