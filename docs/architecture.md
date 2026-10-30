# Архитектура

Один источник правды — jotai-store. Игровая логика — единственный, кто его меняет. React, Pixi и звук только подписаны на него. Коты описываются данными, а загадки собраны из небольшого набора типовых поведений.

## Слои и потоки

```
React UI ──действия игрока──▶ Игровая логика ◀──конфиги── Данные (src/data)
   ▲                              │   ▲
   │                    новое     │   │ такты и доли
   │                  состояние   ▼   │
PixiJS ◀────────────── Jotai store ──▶ Аудиодвижок
   │ клик по коту ─▶ (в логику)            │
   ▲───────────── амплитуда для анимации ──┘
```

- **React UI** (`src/app`) — экраны и оверлеи. Читает атомы, отправляет действия через `dispatch`.
- **Игровая логика** (`src/game`) — чистые функции: `reduce(state, action) → state` + поведения котов. Не знает про Pixi, React и Web Audio.
- **Store** (`src/state`) — атомы jotai. Персистентная часть — через `atomWithStorage`.
- **Аудиодвижок** (`src/audio`) — синглтон `engine`. API: `setCameraLoop`, `setSong`, `blip`, `getAmplitude(TrackId)`. `bindMixer` подписан на store: пересчитывает `computeAudioState` и вызывает engine. Отдаёт события `beat`/`bar` по активным часам (камерный луп или песня).
- **Pixi** (`src/render`) — один `Application` на всю игру, создаётся в `PixiHost` один раз. Меняет содержимое (камера / сцена) по состоянию store. Каждый кадр читает `engine.getAmplitude` для анимации. Клики по котам отправляет в `dispatch`.
- **Тикер:** один общий цикл — `app.ticker` Pixi. В нём `engine.update()` (события часов) и обновление спрайтов.

## Почему такой стек

- **Pixi оправдан:** деформация спрайтов каждый кадр, шейдерные помехи камеры, затемнение и УФ поверх кадра, точные клики по растянутым спрайтам, позже масштаб/панорама сцены. В DOM это собирается плохо.
- **Не Phaser:** сцены и UI делает React, звук — свой граф Web Audio; физика и тайлмапы не нужны. Получились бы два мира состояния и два звуковых движка.
- **Не @pixi/react:** коты меняются каждый кадр по звуку; гонять это через ре-рендеры React неправильно.

## Состояние

```ts
type Screen = 'menu' | 'office' | 'cameras' | 'stage'

interface SaveData { version: 1; found: CatId[] }          // atomWithStorage('purr-save')

interface SessionState {                                     // не сохраняется
  screen: Screen
  camera: number                                             // текущая камера 1..16
  uv: boolean
  puzzle: PuzzleState                                        // состояние поведения текущего кота
  hint: { level: 0 | 1 | 2; switches: number; since: number }
  dialogue: DialogueLine[]                                   // очередь реплик
  popup: CatId | null
}
```

**Производные значения** (вычисляются из `found` и конфигов, а не хранятся): открытые камеры, доступные инструменты, доступность сцены (`found.length >= 3`), текущий искомый кот (первый ненайденный по порядку), активные глобальные состояния (блэкаут). Рассинхрон сохранения невозможен.

## Действия

Всё, что делает игрок, проходит через одну функцию `dispatch(action)`:

```ts
type Action =
  | { type: 'openScreen'; screen: Screen }
  | { type: 'selectCamera'; camera: number }
  | { type: 'horn' }
  | { type: 'toggleUV' }
  | { type: 'clickCat'; target: string }         // id кота или его части (котёнок хора)
  | { type: 'dialogueNext' } | { type: 'dialogueSkip' }
  | { type: 'closePopup' }
  | { type: 'resetProgress' }
  | { type: 'beat'; pos: MusicPosition }         // системные, от часов
  | { type: 'bar'; pos: MusicPosition }
  | { type: 'tick'; now: number }                // для таймеров подсказок
```

Логика передаёт событие поведению текущего кота и записывает результат в store. Побочные эффекты (звук клаксона, фанфара) — не в редьюсере: редьюсер возвращает список `effects` (`{ type: 'sfx', id }`), их исполняет тонкий слой в `actions.ts`.

## Конфиг кота (`src/data/cats.ts`)

```ts
interface CatAnimConfig {
  squash: number                  // 0.05..0.25
  axis: 'x' | 'y'
  frameMode: 'none' | 'momentary' | 'latch'
  frames: string[]                // имена кадров: ['body'] или ['closed', 'open']
  breathe?: number                // по умолчанию 0.015
}

interface CatConfig {
  id: CatId
  name: string
  anim: CatAnimConfig             // анимация от амплитуды
  display: { camera: number; stage: number }  // высота в пикселях на каждом экране
  tint: string                    // цвет для заглушки-спрайта
  camera: number
  behavior: BehaviorConfig  // discriminated union: {type:'static'}|{type:'hornReveal'}|{type:'wait';bars:number}|…
  unlocks: { cameras: number[]; tools: Tool[] }
  stagePos: { x: number; y: number; scale?: number }
  stamp?: string
  enabled: boolean
}

type Tool = 'horn' | 'uv'
```

## Реестр ассетов (`src/assets/registry.ts`)

Glob-импорты (`import.meta.glob`) загружают PNG и аудиофайлы из `src/assets/`. Все функции возвращают URL или заглушку:

```ts
catFrame(catId, frame)   // PNG кота или placeholder SVG
catHasArt(catId)         // есть ли реальный арт
portrait(frame)          // портрет помощника (closed/open)
background(name)         // фоновое изображение или ''
cameraTrack(catId)       // URL камерного лупа (OGG→MP3→WAV→placeholder)
songStem(catId)          // URL стема песни
sfx(id)                  // URL звукового эффекта
prop(name)               // URL пропа-ассета (bin, …) или SVG-заглушка
missingAssets()          // отсортированный список недостающих путей
```

## Рендер сцены (`src/render/StageView.ts`)

Pixi-класс для экрана сцены: фон из `registry.background('stage')`, найденные коты как `CatSprite` на `stagePos`, отсортированные по y. Анимация от `engine.getAmplitude('song:<catId>')`. Подписывается на `saveAtom`/`sessionAtom`, вызывает `unsubs` в `destroy()`.

## Марионетка помощника (`src/app/ui/Puppet.tsx`)

React-компонент: `{ typing, typedText }`. Raf-цикл управляет амплитудой (пульс при каждой новой гласной → `engine.blip()`, спад ~90 мс), открытием рта (гистерезис > 0.5 / < 0.3) и squash/stretch через `computeScale`.

## Типовые поведения (`src/game/behaviors/`)

Каждое поведение — набор чистых функций над своим локальным состоянием:

```ts
interface Behavior<C, S> {
  init(cat: CatConfig, cfg: C): S
  on(state: S, event: BehaviorEvent, ctx: WorldCtx): S
  view(state: S, ctx: WorldCtx): CatView
}

// CatView
interface CatView {
  camera: number
  catState: string   // 'visible' | 'hidden' | 'revealed' | 'out' | 'peek' | 'in'
  clickable: boolean
  props: Record<string, 'shown' | 'hidden'>
}

// BehaviorEvent
type BehaviorEvent =
  | { type: 'horn'; camera: number }
  | { type: 'cameraChanged'; from: number; to: number }
  | { type: 'screenChanged'; screen: Screen }
  | { type: 'bar' }
```

| Тип | Кот | Суть |
| --- | --- | --- |
| `static` | Барабанщик | всегда виден и кликабелен |
| `hornReveal` | Long Cat | кликабелен после клаксона на его камере |
| `wait` | Keyboard Cat | N тактов на его камере без клаксона |
| `uvOnly` | Тыква-кот | виден только в УФ, включает блэкаут |
| `collect` | Котята-хор | несколько частей на разных камерах |
| `callResponse` | Трубач | клаксон в окно фразы, K раз подряд |
| `runner` | Pop Cat | клаксон переводит по маршруту, на N-й раз кликабелен |
| `combo` | Bongo Cat | клаксон на камере, где совпали признаки |

Новый кот на существующем поведении — только запись в `cats.ts` и спрайты. Каждое поведение покрывается тестами Vitest.

## Сохранение

- В localStorage — только `{ version: 1, found: [...] }` под ключом `purr-save`.
- Прогресс внутри текущей загадки не сохраняется: после перезагрузки она начинается заново.
- «Сбросить прогресс» очищает ключ и возвращает в меню.
- Неизвестная `version` или битый JSON — начинаем с чистого сохранения.
