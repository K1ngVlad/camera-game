import type { Behavior } from './types'
import type { CatConfig } from '../../data/cats'

interface WaitState {
  camera: number
  bars: number
  catState: 'out' | 'peek' | 'in'
  counter: number
}

export const waitBehavior: Behavior<{ type: 'wait'; bars: number }, WaitState> = {
  init: (cat: CatConfig, cfg: { type: 'wait'; bars: number }) => ({
    camera: cat.camera,
    bars: cfg.bars,
    catState: 'out',
    counter: 0,
  }),

  on: (state, event, ctx) => {
    if (event.type === 'horn') {
      if (event.camera === state.camera) {
        // Horn on cat's camera: reset to out from any state
        return { ...state, catState: 'out', counter: 0 }
      }
      return state
    }

    if (event.type === 'cameraChanged' || event.type === 'screenChanged') {
      // Leaving cat's context: reset if not already in
      if (state.catState !== 'in') {
        return { ...state, catState: 'out', counter: 0 }
      }
      return state
    }

    if (event.type === 'bar') {
      // Only advance while player is on cameras screen and on this cat's camera
      if (ctx.screen !== 'cameras' || ctx.camera !== state.camera) return state
      if (state.catState === 'in') return state

      const counter = state.counter + 1
      const half = Math.floor(state.bars / 2)

      if (counter >= state.bars) return { ...state, counter, catState: 'in' }
      if (counter >= half) return { ...state, counter, catState: 'peek' }
      return { ...state, counter }
    }

    return state
  },

  view: (state) => ({
    camera: state.camera,
    catState: state.catState,
    clickable: state.catState === 'in',
    props: {},
  }),
}
