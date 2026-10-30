import { useEffect, useRef, useState } from 'react'
import { computeScale } from '../../render/CatSprite.logic'
import { portrait } from '../../assets/registry'
import { engine } from '../../audio/AudioEngine'
import { BLIP_GAIN } from '../../data/audio'

const VOWELS = /[аеёиоуыэюяaeiou]/i

const PUPPET_ANIM = {
  squash: 0.08,
  axis: 'y' as const,
  frameMode: 'none' as const,
  frames: ['closed', 'open'],
  breathe: 0.015,
}

interface PuppetProps {
  typing: boolean
  typedText: string
}

export function Puppet({ typing, typedText }: PuppetProps) {
  const amplitudeRef = useRef(0)
  const mouthOpenRef = useRef(false)
  const prevTimeRef = useRef(0)
  const prevTextRef = useRef('')
  const frameRef = useRef<number>(0)
  const [transform, setTransform] = useState('scale(1, 1)')
  const [mouthOpen, setMouthOpen] = useState(false)

  // Trigger blip on each newly typed vowel
  useEffect(() => {
    const prev = prevTextRef.current
    prevTextRef.current = typedText
    if (!typing) return
    const newChars = typedText.slice(prev.length)
    for (const ch of newChars) {
      if (VOWELS.test(ch)) {
        engine.blip({
          freq: 420 + Math.random() * 140,
          duration: 0.05,
          gain: BLIP_GAIN,
        })
        amplitudeRef.current = 1
      }
    }
  }, [typedText, typing])

  // rAF animation loop
  useEffect(() => {
    const loop = () => {
      frameRef.current = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = Math.min((now - prevTimeRef.current) / 1000, 0.1)
      prevTimeRef.current = now
      const t = now / 1000

      // Exponential decay, tau ~90 ms
      amplitudeRef.current *= Math.exp(-dt / 0.09)
      const amp = amplitudeRef.current

      const { sx, sy } = computeScale(amp, PUPPET_ANIM, t)
      setTransform(`scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`)

      if (!mouthOpenRef.current && amp > 0.5) {
        mouthOpenRef.current = true
        setMouthOpen(true)
      } else if (mouthOpenRef.current && amp < 0.3) {
        mouthOpenRef.current = false
        setMouthOpen(false)
      }
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const closedUrl = portrait('closed')
  const openUrl = portrait('open')
  const src = mouthOpen && openUrl ? openUrl : closedUrl

  return (
    <div
      style={{
        width: 64,
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt="Помощник"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transformOrigin: '50% 100%',
          transform,
          borderRadius: 12,
        }}
      />
    </div>
  )
}
