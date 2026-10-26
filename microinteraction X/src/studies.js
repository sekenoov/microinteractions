export const studies = [
  {
    id: "peel",
    title: "Under the answer",
    category: "AI · Trust",
    verb: "Pull to reveal",
    description:
      "An answer with a little more underneath. Pull the edge to see where the thought came from.",
    hint: "Drag the blue corner, or use the slider.",
    caption:
      "What if checking an AI answer felt like peeling a sticker?\n\nPull the corner. There’s the source.\n\nInteraction concept.",
    hook: "Ответ физически отгибается, открывая источник под ним.",
    gesture:
      "Потянуть синий угол влево → источник → потянуть обратно → ответ возвращается.",
    time: "8–10 s",
  },
  {
    id: "branch",
    title: "A thought can fork",
    category: "AI · Exploration",
    verb: "Split the thought",
    description:
      "Try another direction without losing the one you started with.",
    hint: "Click the thought to open two directions.",
    caption:
      "Regenerate throws away a direction.\n\nWhat if you could split the thought instead?\n\nA small AI interaction study.",
    hook: "Одна карточка раскладывается в две ветки, исходная мысль остаётся.",
    gesture: "Клик по карточке → две ветки → выбрать одну → вернуться.",
    time: "8–10 s",
  },
  {
    id: "context",
    title: "Context has gravity",
    category: "AI · Context",
    verb: "Gather context",
    description:
      "Bring scattered notes into the prompt. Give every piece a place to land.",
    hint: "Click Gather to attach the three example notes.",
    caption:
      "Context should feel like something you can collect.\n\nOne pull. Three notes. A better starting point.\n\nUI prototype.",
    hook: "Разбросанные заметки собираются в поле запроса.",
    gesture: "Заметки вокруг поля → Gather → компактные вложения → сброс.",
    time: "7–9 s",
  },
  {
    id: "commit",
    title: "A moment to reconsider",
    category: "Actions · Intent",
    verb: "Hold to send",
    description:
      "A small pause between “I think so” and “send it”. Let go early to change your mind.",
    hint: "Hold the button for 1.2 seconds. Release early to cancel.",
    caption:
      "Some buttons should ask for a moment, not a modal.\n\nHold to send. Let go to reconsider.\n\nInteraction study.",
    hook: "Кнопка набирает вес и заполняется; раннее отпускание отменяет отправку.",
    gesture: "Короткое удержание → отмена → полное удержание → подтверждение.",
    time: "8–10 s",
  },
  {
    id: "focus",
    title: "Make room for one idea",
    category: "Reading · Focus",
    verb: "Find the focus",
    description:
      "The rest of the page steps aside. The sentence you need stays exactly where it belongs.",
    hint: "Click the highlighted sentence to focus it.",
    caption:
      "Focus mode, but for a single thought.\n\nTap the sentence. Everything else steps back.",
    hook: "Одна строка остаётся резкой, окружающий текст разъезжается и затихает.",
    gesture: "Клик по строке → изоляция → повторный клик → вернуть контекст.",
    time: "6–8 s",
  },
  {
    id: "tone",
    title: "Dial in the tone",
    category: "Writing · Expression",
    verb: "Turn the dial",
    description:
      "Same message. Different energy. A tactile control for the way words feel.",
    hint: "Move the slider between three prewritten tones.",
    caption:
      "“Make it friendlier” could be a dial.\n\nSame message. Different energy.\n\nExploring tone as a physical control.",
    hook: "Круглый регулятор меняет тон сообщения через три состояния.",
    gesture: "Деловой → нейтральный → дружелюбный → нейтральный.",
    time: "8–10 s",
  },
  {
    id: "bookmark",
    title: "Keep this corner",
    category: "Reading · Memory",
    verb: "Fold the corner",
    description:
      "Save a thought with the same gesture you would use on a real page.",
    hint: "Click the page corner to fold it.",
    caption:
      "Bookmarks used to be a gesture.\n\nTrying to bring a little of that back.",
    hook: "Угол страницы складывается и превращается в закладку.",
    gesture: "Навести → загнуть угол → появилась закладка → развернуть.",
    time: "6–8 s",
  },
  {
    id: "undo",
    title: "Nothing lost, yet",
    category: "Actions · Recovery",
    verb: "Let it go",
    description:
      "A deleted note leaves a thread behind. Pull it back when you change your mind.",
    hint: "Remove the note, then click Undo to bring it back.",
    caption:
      "Delete with a way back.\n\nThe note disappears. A little thread stays behind.",
    hook: "Заметка сжимается в тонкую линию, Undo разворачивает её обратно.",
    gesture: "Delete → линия → Undo → восстановленная заметка.",
    time: "6–8 s",
  },
  {
    id: "stack",
    title: "A little perspective",
    category: "Navigation · Space",
    verb: "Spread the stack",
    description:
      "A pile becomes a map. Get a sense of what is there before choosing a page.",
    hint: "Click the stack to spread the three pages.",
    caption:
      "A stack when you’re working.\nA map when you’re choosing.\n\nA tiny navigation experiment.",
    hook: "Стопка документов раскладывается веером с читаемыми названиями.",
    gesture: "Стопка → раскрыть → три документа → свернуть.",
    time: "7–9 s",
  },
  {
    id: "thread",
    title: "Tie the loose ends",
    category: "Notes · Connection",
    verb: "Connect the notes",
    description:
      "Two separate notes become one connected thought. The link keeps its shape.",
    hint: "Click Connect to bring the notes together.",
    caption:
      "What if linking notes felt like tying a thread?\n\nA small study in making connections visible.",
    hook: "Линия между двумя заметками натягивается и собирает их в пару.",
    gesture:
      "Две карточки → нить рисуется → карточки сближаются → разъединить.",
    time: "7–9 s",
  },
  {
    id: "resolve",
    title: "Done has a rhythm",
    category: "Tasks · Completion",
    verb: "Finish the task",
    description:
      "Check. Settle. Make room. A finished task gets a proper goodbye.",
    hint: "Click the checkbox to complete the example task.",
    caption:
      "The checkbox is the beginning of the animation.\n\nCheck. Settle. Make room.",
    hook: "Галочка рисуется, строка перечёркивается и уступает место следующей.",
    gesture:
      "Завершить → линия проходит через текст → следующая задача поднимается.",
    time: "6–8 s",
  },
  {
    id: "scrub",
    title: "Time, within reach",
    category: "Editing · History",
    verb: "Rewind the edit",
    description:
      "Move through a thought as it took shape. Your earlier words are still there.",
    hint: "Scrub through three example revisions.",
    caption:
      "Undo is a button. History could be something you touch.\n\nScrubbing through a sentence as it takes shape.",
    hook: "Ползунок времени возвращает предыдущие версии одной мысли.",
    gesture: "Черновик → уточнение → финал → назад к черновику.",
    time: "8–10 s",
  },
  {
    id: "send",
    title: "Words take flight",
    category: "Messages · Feedback",
    verb: "Send the note",
    description:
      "Your message folds itself into the next part of the conversation.",
    hint: "Click Send to fold the example note into a plane.",
    caption:
      "A send button with a little follow-through.\n\nThe message folds. Then it leaves.",
    hook: "Карточка сообщения складывается в самолёт и улетает.",
    gesture: "Текст → Send → складка → самолёт → пустое поле.",
    time: "7–9 s",
  },
  {
    id: "quiet",
    title: "Turn down the world",
    category: "Attention · Quiet",
    verb: "Find some quiet",
    description:
      "Keep the conversation. Soften the interruptions. One deliberate gesture.",
    hint: "Move the slider to gather the notification dots.",
    caption:
      "Do not disturb, as a feeling.\n\nTurn it down. Watch the noise settle.",
    hook: "Разрозненные уведомления сходятся в одну спокойную точку.",
    gesture: "Много точек → ползунок → одна точка → снова рассеять.",
    time: "8–10 s",
  },
];
