# Звук и анимация от амплитуды

Все стемы запускаются один раз в одну точку времени и крутятся бесконечно; игра управляет только громкостью и фильтром каждого стема. Анимация котов читает заранее посчитанную огибающую их стема.

## Граф

```
стем: AudioBufferSourceNode(loop) → BiquadFilterNode(lowpass) → GainNode ┐
                                                                        ├→ musicBus(Gain) ┐
SFX:  AudioBufferSourceNode → GainNode ─────────────────────── sfxBus(Gain) ─────────────┤
                                                                                          └→ DynamicsCompressor (лимитер) → destination
```

- Все стемы стартуют одним вызовом `start(t0)` с общим `t0 = ctx.currentTime + 0.1`.
- `loop = true`, `loopStart = 0`, `loopEnd = bars * beatsPerBar * 60 / bpm` — **задаются вручную**, а не по длине буфера (тишина кодеков на шве).
- Все стемы обязаны иметь одинаковую длину. Если длина буфера отличается от расчётной больше чем на 50 мс — `console.warn` с именем стема.
- Изменения громкости и среза — `param.setTargetAtTime(value, ctx.currentTime, 0.05)` (постоянная ~50 мс).
- Лимитер: `threshold -6 dB`, `knee 6`, `ratio 12`, `attack 0.003`, `release 0.25` — стартовые значения.
- `AudioContext` создаётся/возобновляется по клику «Играть». До этого движок можно только загрузить (декодирование через `OfflineAudioContext` или отложить до старта).
- Фоновая вкладка: при `visibilitychange` ничего не делаем специально — Web Audio продолжает играть синхронно.

## Публичный API (`src/audio/AudioEngine.ts`)

```ts
type StemId = string
type SfxId = string

interface MusicConfig { bpm: number; bars: number; beatsPerBar: number }
interface StemDef { id: StemId; url: string }
interface SfxDef { id: SfxId; url: string }
interface StemMix { gain: number; cutoff: number }   // cutoff, Гц; 20000 = открыт

interface MusicPosition {
  loopTime: number     // секунды от начала лупа
  bar: number          // 0..bars-1
  beat: number         // 0..beatsPerBar-1
  beatPhase: number    // 0..1 внутри доли
  loopPhase: number    // 0..1 внутри лупа
}

class AudioEngine {
  constructor(config: MusicConfig)
  load(stems: StemDef[], sfx: SfxDef[], onProgress?: (loaded: number, total: number) => void): Promise<void>
  start(): Promise<void>                       // только из обработчика жеста
  readonly started: boolean
  setMix(mix: Partial<Record<StemId, StemMix>>): void   // плавно
  setMasterVolume(v: number): void
  playSfx(id: SfxId, opts?: { gain?: number; cutoff?: number }): void
  getPosition(): MusicPosition
  getAmplitude(id: StemId): number             // огибающая × текущая громкость стема, 0..1
  getRawEnvelope(id: StemId): number           // огибающая без учёта громкости
  isOnset(id: StemId): boolean                 // сейчас «удар» (с гистерезисом)
  onBeat(cb: (pos: MusicPosition) => void): () => void
  onBar(cb: (pos: MusicPosition) => void): () => void
  update(): void                               // вызывается раз в кадр из общего тикера
}
```

Текущая громкость стема для `getAmplitude` берётся из `GainNode.gain.value` (она уже сглажена).

## Музыкальные часы (`src/audio/clock.ts`)

- Чистая функция `positionAt(elapsed: number, config: MusicConfig): MusicPosition`, где `elapsed = ctx.currentTime - t0`.
- Класс/функция детектора событий: в `update()` сравнивает индекс доли с прошлым кадром и вызывает `onBeat`/`onBar`. Точность — один кадр (~16 мс), для логики игры достаточно. Если между кадрами прошло несколько долей (вкладка была в фоне), событие вызывается один раз для последней доли — не «догоняем».

## Матрица громкости (`src/audio/mixer.ts`)

Чистая функция `computeMix(input): Record<StemId, StemMix>`. Пересчитывается при каждой смене экрана, камеры или состояния котов. Реализуется в задаче со скелетом игры, но значения фиксируем здесь.

| Состояние стема | Где игрок | gain | cutoff |
| --- | --- | --- | --- |
| Найден | сцена | 1.0 | 20000 |
| Найден | офис / камеры / меню | 0.25 | 600 |
| Искомый | его камера | 1.0 | 20000 |
| Искомый | соседняя камера | 0.3 | 800 |
| Искомый | дальше / офис | 0 | 20000 |
| Ещё не в игре | везде | 0 | 20000 |

Особые случаи: Bongo Cat на «ложных» камерах эха — gain 0.15, cutoff 1500. Хор до сбора всех котят — 0. Значения стартовые, подбираются на слух.

## Огибающие (`src/audio/envelope.ts`)

Считаются один раз после декодирования стема. Всё — чистые функции над `Float32Array`.

1. Моно-сведение каналов.
2. RMS по окнам `hop = round(sampleRate * 0.01)` (~10 мс).
3. Нормализация: делим на 98-й перцентиль (не на максимум — одиночный пик не должен «съедать» динамику), обрезаем в 0..1.
4. Сглаживание: однополюсный фильтр с разными атакой (~10 мс) и спадом (~120 мс).
5. Разметка ударов (onsets): гистерезис — вкл. при > 0.5, выкл. при < 0.3. Результат — `Uint8Array` той же длины.

Чтение в кадре: индекс `floor(loopTime / hopSeconds)`, линейная интерполяция между соседними окнами.

## Анимация кота (`src/render/CatSprite.ts`)

Конфиг анимации (часть конфига кота):

```ts
interface CatAnimConfig {
  squash: number                 // сила, 0.05..0.25
  axis: 'x' | 'y'                // по какой оси «тянется»
  frameMode: 'none' | 'momentary' | 'latch'
  frames: string[]               // ключи текстур; [0] — основной кадр
  breathe?: number               // амплитуда дыхания в тишине, по умолчанию 0.015
}
```

- **Squash & stretch с сохранением объёма**, точка опоры у ног (`anchor = (0.5, 1)`):
  - `axis: 'y'` — `scaleY = 1 + k·a`, `scaleX = 1 / (1 + k·a)`;
  - `axis: 'x'` — наоборот.
- **Режимы кадров:**
  - `none` — всегда `frames[0]`;
  - `momentary` — `frames[1]`, пока `isOnset` активен, иначе `frames[0]`;
  - `latch` — каждый новый onset переключает на следующий кадр по кругу и оставляет его.
- **Дыхание:** когда `a < 0.05`, добавляется `breathe · sin(t · 2π / 2.5 с)` к оси растяжения, чтобы кот не замирал.
- `a` берётся из `getAmplitude(stem)`: приглушённый кот почти не двигается.
- Та же огибающая применяется к объектам (мусорный бак дрожит от `bass`): `PropWobble` — небольшой сдвиг/поворот по амплитуде.

## Форматы

- Финальные стемы — OGG 44,1 кГц; запасной MP3 для Safari (выбор по `canPlayType`). Заглушки — WAV.
- SFX — короткие OGG/WAV.
