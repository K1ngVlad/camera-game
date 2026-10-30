import type { Behavior } from './types'
import type { CatConfig } from '../../data/cats'

interface HornRevealState {
  camera: number
  catState: 'hidden' | 'revealed'
}

export const hornRevealBehavior: Behavior<{ type: 'hornReveal' }, HornRevealState> = {
  init: (cat: CatConfig) => ({ camera: cat.camera, catState: 'hidden' }),

  on: (state, event) => {
    if (
      event.type === 'horn' &&
      event.camera === state.camera &&
      state.catState === 'hidden'
    ) {
      return { ...state, catState: 'revealed' }
    }
    // All other events leave state unchanged (revealed persists across camera changes)
    return state
  },

  view: (state) => ({
    camera: state.camera,
    catState: state.catState,
    clickable: state.catState === 'revealed',
    props: { bin: state.catState === 'hidden' ? 'shown' : 'hidden' },
  }),
}
