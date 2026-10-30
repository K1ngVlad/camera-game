import { describe, it, expect } from 'vitest'
import { reduce, DEFAULT_SAVE, defaultSession } from './reduce'
import { CAT_MAP } from '../data/cats'
import type { SaveData, SessionState } from './types'

function freshState(): { save: SaveData; session: SessionState } {
  return { save: { ...DEFAULT_SAVE, found: [] }, session: defaultSession() }
}

describe('reduce - openScreen', () => {
  it('switches to office screen', () => {
    const { save, session } = freshState()
    const result = reduce(save, session, { type: 'openScreen', screen: 'office' })
    expect(result.session.screen).toBe('office')
  })

  it('queues intro dialogue on first office visit', () => {
    const { save, session } = freshState()
    const result = reduce(save, session, { type: 'openScreen', screen: 'office' })
    const dialogue = result.effects.find((e) => e.type === 'dialogue')
    expect(dialogue).toBeDefined()
  })
})

describe('reduce - selectCamera', () => {
  it('updates camera', () => {
    const { save, session } = freshState()
    const result = reduce(save, session, { type: 'selectCamera', camera: 6 })
    expect(result.session.camera).toBe(6)
  })
})

describe('reduce - clickCat', () => {
  it('finds drummer when on camera 1', () => {
    const { save } = freshState()
    const session = { ...defaultSession(), screen: 'cameras' as const, camera: 1 }
    const result = reduce(save, session, { type: 'clickCat', target: 'drummer' })
    expect(result.save.found).toContain('drummer')
    const popup = result.effects.find((e) => e.type === 'popup')
    expect(popup).toBeDefined()
  })

  it('does not find drummer when on wrong camera', () => {
    const { save } = freshState()
    const session = { ...defaultSession(), screen: 'cameras' as const, camera: 2 }
    const result = reduce(save, session, { type: 'clickCat', target: 'drummer' })
    expect(result.save.found).not.toContain('drummer')
  })

  it('does not find wrong cat', () => {
    const { save } = freshState()
    const session = { ...defaultSession(), screen: 'cameras' as const, camera: 1 }
    const result = reduce(save, session, { type: 'clickCat', target: 'longcat' })
    expect(result.save.found).toHaveLength(0)
  })
})

describe('reduce - resetProgress', () => {
  it('clears found cats and resets session to defaults', () => {
    const save = { version: 1 as const, found: ['drummer' as const] }
    const session = { ...defaultSession(), screen: 'cameras' as const, camera: 6 }
    const result = reduce(save, session, { type: 'resetProgress' })
    expect(result.save.found).toHaveLength(0)
    expect(result.session.screen).toBe('menu')
    expect(result.session.camera).toBe(1)
  })
})

describe('reduce - full pass (5 cats)', () => {
  it('finds all 5 enabled cats in order', () => {
    let save = DEFAULT_SAVE
    let session = defaultSession()

    const catsAndCameras: [string, number][] = [
      ['drummer', 1],
      ['longcat', 6],
      ['keyboard', 3],
      ['pumpkin', 10],
      ['choir', 7],
    ]

    for (const [catId, camera] of catsAndCameras) {
      // Open cameras screen to init puzzle state
      const rScreen = reduce(save, { ...session, screen: 'cameras', camera }, { type: 'openScreen', screen: 'cameras' })
      save = rScreen.save
      session = rScreen.session

      // hornReveal cats need a horn on their camera before they can be clicked
      const cat = CAT_MAP.get(catId as import('../data/cats').CatId)
      if (cat?.behavior.type === 'hornReveal') {
        const rHorn = reduce(save, session, { type: 'horn' })
        save = rHorn.save
        session = rHorn.session
      }

      const r = reduce(save, session, { type: 'clickCat', target: catId })
      save = r.save
      session = r.session
      // close popup
      const r2 = reduce(save, session, { type: 'closePopup' })
      save = r2.save
      session = r2.session
    }

    expect(save.found).toHaveLength(5)
    expect(save.found).toContain('drummer')
    expect(save.found).toContain('choir')
  })

  it('emits sfx:found for each cat', () => {
    const save = DEFAULT_SAVE
    const session = { ...defaultSession(), camera: 1 }

    const r = reduce(save, session, { type: 'clickCat', target: 'drummer' })
    const sfx = r.effects.find((e) => e.type === 'sfx' && e.id === 'found')
    expect(sfx).toBeDefined()
  })
})

describe('reduce - hints', () => {
  it('hint level increases after 15 camera switches', () => {
    const { save } = freshState()
    let session = defaultSession()

    for (let i = 0; i < 15; i++) {
      const cam = (i % 5) + 1
      const r = reduce(save, session, { type: 'selectCamera', camera: cam })
      session = r.session
    }

    expect(session.hint.level).toBe(1)
  })

  it('hint level increases after 120 seconds', () => {
    const { save } = freshState()
    const session = { ...defaultSession(), hint: { level: 0 as const, switches: 0, since: 0 } }

    const r = reduce(save, session, { type: 'tick', now: 121 })
    expect(r.session.hint.level).toBe(1)
  })

  it('hint resets on finding a cat', () => {
    const { save } = freshState()
    const session = { ...defaultSession(), camera: 1, hint: { level: 2 as const, switches: 14, since: 0 } }

    const r = reduce(save, session, { type: 'clickCat', target: 'drummer' })
    expect(r.session.hint.level).toBe(0)
  })
})

describe('reduce - resetProgress', () => {
  it('clears found and returns to menu', () => {
    const save: SaveData = { version: 1, found: ['drummer', 'longcat'] }
    const session = { ...defaultSession(), screen: 'office' as const }
    const r = reduce(save, session, { type: 'resetProgress' })
    expect(r.save.found).toHaveLength(0)
    expect(r.session.screen).toBe('menu')
  })
})
