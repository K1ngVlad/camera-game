import type { CatId } from './cats'

export const ASSISTANT_NAME = '[Имя помощника]'

export interface DialogueLine {
  speaker: string
  text: string
}

export interface CatDialogue {
  onStart: DialogueLine[]
  hints: [DialogueLine, DialogueLine, DialogueLine]
  onFound: DialogueLine[]
}

export const INTRO: DialogueLine[] = [
  {
    speaker: ASSISTANT_NAME,
    text: 'Босс! Чрезвычайная ситуация. Вся группа разбежалась по городу прямо перед концертом.',
  },
  {
    speaker: ASSISTANT_NAME,
    text: 'К счастью, у нас есть доступ к сети городских камер. Найди музыкантов и верни их на сцену!',
  },
  {
    speaker: ASSISTANT_NAME,
    text: 'Начнём с барабанщика. Он всегда любил этот переулок. Проверь камеру там.',
  },
]

export const CAT_DIALOGUES: Record<CatId, CatDialogue> = {
  drummer: {
    onStart: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Барабанщик! Вижу его в переулке. Он совсем не прячется — просто кликни на него.',
      },
    ],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'Он на первой камере. Просто нажми на него.' },
      { speaker: ASSISTANT_NAME, text: 'Переулок, камера 1. Кот прямо перед тобой.' },
      { speaker: ASSISTANT_NAME, text: 'Кликни на кота на камере 1. Серьёзно, он никуда не прячется.' },
    ],
    onFound: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Отлично! Барабанщик с нами. Кстати, я нашёл клаксон в ящике — пригодится.',
      },
    ],
  },
  longcat: {
    onStart: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Лонг Кэт прячется в мусорном баке во дворе с баками. Камера 6.',
      },
      {
        speaker: ASSISTANT_NAME,
        text: 'Бас-гитарист, между прочим. Слышишь, как бак дрожит в такт? Это он.',
      },
    ],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'Лонг Кэт в баке на камере 6. Попробуй клаксон.' },
      {
        speaker: ASSISTANT_NAME,
        text: 'Сигнал клаксоном на камере 6 — и он вылезет.',
      },
      { speaker: ASSISTANT_NAME, text: 'Камера 6, кнопка клаксона. Он вылезет и можно будет кликнуть.' },
    ],
    onFound: [{ speaker: ASSISTANT_NAME, text: 'Лонг Кэт найден! Бас снова с нами.' }],
  },
  keyboard: {
    onStart: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Кейборд Кэт очень стеснительный. Он прячется на крыше, камера 3.',
      },
      {
        speaker: ASSISTANT_NAME,
        text: 'Нужно просто побыть рядом — оставайся на его камере, пока он не привыкнет к тебе.',
      },
    ],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'Камера 3. Не уходи с неё — дай ему время.' },
      { speaker: ASSISTANT_NAME, text: 'Оставайся на камере 3 и не нажимай клаксон. Просто жди.' },
      {
        speaker: ASSISTANT_NAME,
        text: 'Терпение! Камера 3, без клаксона. Через несколько тактов он выйдет.',
      },
    ],
    onFound: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Кейборд Кэт наш! Кстати, теперь сцена открыта — можешь проверить, как звучит группа.',
      },
    ],
  },
  pumpkin: {
    onStart: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Что это?! Кто-то вырубил свет во всём районе... Наверняка это наш следующий музыкант.',
      },
      {
        speaker: ASSISTANT_NAME,
        text: 'Хорошо, что у меня в запасе нашёлся УФ-фонарик. Держи — в ультрафиолете увидишь больше.',
      },
    ],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'Включи УФ — в ультрафиолете видно больше.' },
      { speaker: ASSISTANT_NAME, text: 'Смотри, где в темноте что-то светится оранжевым.' },
      { speaker: ASSISTANT_NAME, text: 'Камера 10. Включи УФ и забирай его.' },
    ],
    onFound: [
      {
        speaker: ASSISTANT_NAME,
        text: 'Наконец-то свет! Тыква-кот пойман. Этот кот определённо слишком увлёкся атмосферой.',
      },
    ],
  },
  choir: {
    onStart: [
      // TODO text
      { speaker: ASSISTANT_NAME, text: 'Котята-хор рассыпались по городу. Нужно собрать всех четверых.' },
    ],
    hints: [
      // TODO text
      { speaker: ASSISTANT_NAME, text: 'Ищи котят на открытых камерах. Не пугай их клаксоном!' },
      { speaker: ASSISTANT_NAME, text: 'Котята видны на нескольких камерах. Кликай на каждого.' },
      { speaker: ASSISTANT_NAME, text: 'Осталось найти оставшихся котят. Проверь все открытые камеры.' },
    ],
    onFound: [
      // TODO text
      { speaker: ASSISTANT_NAME, text: 'Все котята собраны! Хор в полном составе.' },
    ],
  },
  trumpet: {
    onStart: [{ speaker: ASSISTANT_NAME, text: 'Кот-трубач на причале, камера 14.' }],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'Слушай его фразу и отвечай клаксоном.' },
      { speaker: ASSISTANT_NAME, text: 'Жми клаксон, пока он дудит.' },
      { speaker: ASSISTANT_NAME, text: 'Два точных ответа подряд — и он твой.' },
    ],
    onFound: [{ speaker: ASSISTANT_NAME, text: 'Трубач найден!' }],
  },
  popcat: {
    onStart: [{ speaker: ASSISTANT_NAME, text: 'Pop Cat спит где-то в городе.' }],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'Слышишь храп? Используй клаксон.' },
      { speaker: ASSISTANT_NAME, text: 'Три раза — и он проснётся.' },
      { speaker: ASSISTANT_NAME, text: 'Следи за звуком и жми клаксон.' },
    ],
    onFound: [{ speaker: ASSISTANT_NAME, text: 'Pop Cat проснулся!' }],
  },
  bongo: {
    onStart: [{ speaker: ASSISTANT_NAME, text: 'Bongo Cat прячется. Ищи УФ-следы.' }],
    hints: [
      { speaker: ASSISTANT_NAME, text: 'УФ-следы и эхо его мелодии — ключ к его местонахождению.' },
      { speaker: ASSISTANT_NAME, text: 'Найди камеру, где совпадают следы и звук.' },
      { speaker: ASSISTANT_NAME, text: 'На верной камере — жми клаксон.' },
    ],
    onFound: [{ speaker: ASSISTANT_NAME, text: 'Bongo Cat наш! Группа в сборе!' }],
  },
}

export const STAGE_UNLOCKED: DialogueLine[] = [
  {
    speaker: ASSISTANT_NAME,
    text: 'Три музыканта — уже маленький концерт. Сцена открыта, можешь послушать, как они звучат вместе!',
  },
]

export const FINALE: DialogueLine[] = [
  {
    speaker: ASSISTANT_NAME,
    text: 'Невероятно! Все коты собраны. Группа в полном составе. Концерт состоится!',
  },
  {
    speaker: ASSISTANT_NAME,
    text: 'Ты настоящий кошачий менеджер. Иди на сцену — они ждут тебя.',
  },
]
