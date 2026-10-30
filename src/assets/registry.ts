import type { CatId } from '../data/cats'

// ── glob imports (eager, resolved to URL strings at build time) ──────────────

const catGlob = import.meta.glob('./cats/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const propGlob = import.meta.glob('./props/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const portraitGlob = import.meta.glob('./portraits/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const bgGlob = import.meta.glob('./backgrounds/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const camAudioGlob = import.meta.glob('./audio/camera/*.{ogg,mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const songAudioGlob = import.meta.glob('./audio/song/*.{ogg,mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const sfxAudioGlob = import.meta.glob('./audio/sfx/*.{ogg,mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

// ── audio format preference ──────────────────────────────────────────────────

function supportsOgg(): boolean {
  const a = document.createElement('audio')
  return a.canPlayType('audio/ogg; codecs="vorbis"') !== ''
}

const preferOgg = typeof document !== 'undefined' ? supportsOgg() : true
const AUDIO_EXT_ORDER = preferOgg ? ['ogg', 'mp3', 'wav'] : ['mp3', 'ogg', 'wav']

function pickAudio(glob: Record<string, string>, filename: string): string | null {
  for (const ext of AUDIO_EXT_ORDER) {
    const suffix = `/${filename}.${ext}`
    const entry = Object.entries(glob).find(([k]) => k.endsWith(suffix))
    if (entry) return entry[1]
  }
  return null
}

// ── placeholder fallback paths (served from public/) ─────────────────────────

const PH_CAT_A = './assets/placeholder/cat_a.svg'
const PH_AUDIO_CAM = (id: string) => `./assets/audio/placeholder/camera/${id}.wav`
const PH_AUDIO_SONG = (id: string) => `./assets/audio/placeholder/song/${id}.wav`
const PH_AUDIO_SFX = (id: string) => `./assets/audio/placeholder/sfx/${id}.wav`

// ── missing assets tracking ──────────────────────────────────────────────────

const _missing = new Set<string>()

function track(label: string, found: boolean) {
  if (!found) _missing.add(label)
}

// ── public API ───────────────────────────────────────────────────────────────

/** URL for a cat's sprite frame. Falls back to placeholder SVG. */
export function catFrame(catId: CatId, frame: string): string {
  const url = catGlob[`./cats/${catId}/${frame}.png`]
  track(`cats/${catId}/${frame}.png`, !!url)
  return url ?? PH_CAT_A
}

/** True if the cat has any real art registered. */
export function catHasArt(catId: CatId): boolean {
  return Object.keys(catGlob).some((k) => k.startsWith(`./cats/${catId}/`))
}

/** URL for a prop image. */
export function prop(name: string): string {
  const url = propGlob[`./props/${name}.png`]
  track(`props/${name}.png`, !!url)
  return url ?? PH_CAT_A
}

/** URL for an assistant portrait frame ('closed' or 'open'). */
export function portrait(frame: string): string {
  const url = portraitGlob[`./portraits/assistant/${frame}.png`]
  track(`portraits/assistant/${frame}.png`, !!url)
  return url ?? PH_CAT_A
}

/** URL for a background image (name without extension). */
export function background(name: string): string {
  const url = bgGlob[`./backgrounds/${name}.png`]
  track(`backgrounds/${name}.png`, !!url)
  return url ?? ''
}

/** URL for a cat's camera loop audio. */
export function cameraTrack(catId: CatId): string {
  const url = pickAudio(camAudioGlob, catId)
  track(`audio/camera/${catId}`, !!url)
  return url ?? PH_AUDIO_CAM(catId)
}

/** URL for a cat's song stem audio. */
export function songStem(catId: CatId): string {
  const url = pickAudio(songAudioGlob, catId)
  track(`audio/song/${catId}`, !!url)
  return url ?? PH_AUDIO_SONG(catId)
}

/** URL for a sound effect (name without extension). */
export function sfx(id: string): string {
  const url = pickAudio(sfxAudioGlob, id)
  track(`audio/sfx/${id}`, !!url)
  return url ?? PH_AUDIO_SFX(id)
}

/** Sorted list of all asset paths that fell back to placeholders. */
export function missingAssets(): string[] {
  return [..._missing].sort()
}

// Log missing assets once after module init (deferred so all imports settle)
if (typeof console !== 'undefined') {
  Promise.resolve().then(() => {
    if (_missing.size > 0) {
      console.log(`[assets] missing: ${[..._missing].sort().join(', ')}`)
    }
  })
}
