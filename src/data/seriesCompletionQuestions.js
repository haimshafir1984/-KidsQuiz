const PANEL_SIZE = 96
const PANEL_GAP = 14
const PANEL_FRAME = 8
const STROKE = '#111827'
const FILL = '#111827'

function svgDocument(width, height, content) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="white"/>
      ${content}
    </svg>`,
  )}`
}

function panel(x, y, content) {
  return `
    <g transform="translate(${x} ${y})">
      <rect x="${PANEL_FRAME}" y="${PANEL_FRAME}" width="${PANEL_SIZE - PANEL_FRAME * 2}" height="${PANEL_SIZE - PANEL_FRAME * 2}" fill="white" stroke="${STROKE}" stroke-width="2.2" />
      ${content}
    </g>
  `
}

function questionMarkPanel() {
  return `<text x="${PANEL_SIZE / 2}" y="${PANEL_SIZE / 2 + 10}" text-anchor="middle" font-size="42" font-family="Arial, sans-serif" fill="${STROKE}">?</text>`
}

function rotatePoint(cx, cy, x, y, angle) {
  const radians = angle * (Math.PI / 180)
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: cy + dx * Math.sin(radians) + dy * Math.cos(radians),
  }
}

function pointsToPath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function polygonContent({ sides, rotation = -90, radius = 28 }) {
  const center = PANEL_SIZE / 2
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = ((360 / sides) * index + rotation) * (Math.PI / 180)
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    }
  })

  return `<polygon points="${points.map(point => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${STROKE}" stroke-width="3" stroke-linejoin="round" />`
}

function flowerContent({ petals }) {
  const center = PANEL_SIZE / 2
  const petalLength = 21
  const petalWidth = 8
  const petalsSvg = Array.from({ length: petals }, (_, index) => {
    const angle = (360 / petals) * index
    return `
      <g transform="rotate(${angle} ${center} ${center})">
        <ellipse cx="${center}" cy="${center - 18}" rx="${petalWidth}" ry="${petalLength}" fill="none" stroke="${STROKE}" stroke-width="2.2" />
      </g>
    `
  }).join('')

  return `
    ${petalsSvg}
    <circle cx="${center}" cy="${center}" r="8.5" fill="${FILL}" />
  `
}

function gridDotsContent(dotPositions) {
  const verticals = [22, 36, 50, 64, 78]
  const horizontals = [24, 38, 52, 66, 80]

  const lines = [
    ...verticals.map(x => `<line x1="${x}" y1="18" x2="${x}" y2="82" stroke="${STROKE}" stroke-width="1.8" />`),
    ...horizontals.map(y => `<line x1="18" y1="${y}" x2="82" y2="${y}" stroke="${STROKE}" stroke-width="1.8" />`),
  ].join('')

  const dots = dotPositions.map(({ col, row }) => {
    const x = verticals[col]
    const y = horizontals[row]
    return `<circle cx="${x}" cy="${y}" r="4.8" fill="${FILL}" />`
  }).join('')

  return `${lines}${dots}`
}

function triangleContent({ width = 42, height = 58 }) {
  const center = PANEL_SIZE / 2
  const topY = center - height / 2 + 4
  const bottomY = center + height / 2
  const leftX = center - width / 2
  const rightX = center + width / 2
  return `<polygon points="${center},${topY} ${rightX},${bottomY} ${leftX},${bottomY}" fill="${FILL}" />`
}

function arrowHeadPoints(direction) {
  const center = PANEL_SIZE / 2
  const head = [
    { x: center, y: 20 },
    { x: center + 12, y: 34 },
    { x: center + 5, y: 34 },
    { x: center + 5, y: 72 },
    { x: center - 5, y: 72 },
    { x: center - 5, y: 34 },
    { x: center - 12, y: 34 },
  ]

  const angleMap = { up: 0, right: 90, down: 180, left: 270 }
  return head.map(point => rotatePoint(center, center, point.x, point.y, angleMap[direction] || 0))
}

function hookedArrowContent(direction) {
  const points = arrowHeadPoints(direction)
  return `<path d="${pointsToPath(points)} Z" fill="${FILL}" />`
}

function starPoints(outerRadius = 30, innerRadius = 14) {
  const center = PANEL_SIZE / 2
  return Array.from({ length: 10 }, (_, index) => {
    const angle = (-90 + index * 36) * (Math.PI / 180)
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    }
  })
}

function starContent(dotCount) {
  const points = starPoints()
  const dotLocations = [
    { x: 47, y: 24 },
    { x: 28, y: 44 },
    { x: 60, y: 44 },
    { x: 36, y: 66 },
  ]

  return `
    <polygon points="${points.map(point => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${STROKE}" stroke-width="2.6" stroke-linejoin="round" />
    ${dotLocations.slice(0, dotCount).map(dot => `<circle cx="${dot.x}" cy="${dot.y}" r="4.4" fill="${FILL}" />`).join('')}
  `
}

function straightArrowContent(direction) {
  const center = PANEL_SIZE / 2
  const angleMap = { right: 0, downRight: 45, up: -90, left: 180, downLeft: 135, upLeft: -135 }
  const points = [
    { x: 18, y: center },
    { x: 58, y: center },
    { x: 58, y: center - 10 },
    { x: 80, y: center },
    { x: 58, y: center + 10 },
    { x: 58, y: center + 2 },
    { x: 18, y: center + 2 },
  ].map(point => rotatePoint(center, center, point.x, point.y, angleMap[direction] || 0))

  return `<path d="${pointsToPath(points)} Z" fill="${FILL}" />`
}

function diagonalLineContent(points) {
  const lines = points.map(([x1, y1, x2, y2]) => (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${STROKE}" stroke-width="3" stroke-linecap="round" />`
  )).join('')

  return lines
}

function steppedLContent({ innerStep = false, marker = null }) {
  const base = innerStep
    ? 'M 26 72 L 26 64 L 54 64 L 54 40 L 62 40 L 62 26 L 72 26 L 72 72 Z'
    : 'M 26 72 L 26 60 L 62 60 L 62 26 L 72 26 L 72 72 Z'

  const markers = {
    topLeft: { x: 22, y: 22 },
    bottomRight: { x: 68, y: 68 },
    topRight: { x: 68, y: 22 },
    inner: { x: 56, y: 42 },
  }

  return `
    <path d="${base}" fill="none" stroke="${STROKE}" stroke-width="3" stroke-linejoin="miter" />
    ${marker && markers[marker]
      ? `<rect x="${markers[marker].x}" y="${markers[marker].y}" width="12" height="12" fill="none" stroke="${STROKE}" stroke-width="2.4" />`
      : ''}
  `
}

function semicircleZigzagContent({ rotation = 0, flipSemi = false }) {
  const center = PANEL_SIZE / 2
  const zigzag = [
    { x: center - 22, y: 30 },
    { x: center - 14, y: 20 },
    { x: center - 6, y: 30 },
    { x: center + 2, y: 20 },
    { x: center + 10, y: 30 },
    { x: center + 18, y: 20 },
  ].map(point => rotatePoint(center, center, point.x, point.y, rotation))

  const pathStart = rotatePoint(center, center, center - 18, center + 18, rotation)
  const pathEnd = rotatePoint(center, center, center + 18, center + 18, rotation)
  const radiusA = flipSemi ? 1 : 0

  return `
    <polyline points="${zigzag.map(point => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${STROKE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M ${pathStart.x} ${pathStart.y} A 18 18 0 0 ${radiusA} ${pathEnd.x} ${pathEnd.y}" fill="none" stroke="${STROKE}" stroke-width="3.2" stroke-linecap="round" />
  `
}

function sequenceSvg(panelContents) {
  const width = panelContents.length * PANEL_SIZE + (panelContents.length - 1) * PANEL_GAP
  const content = panelContents.map((item, index) => panel(index * (PANEL_SIZE + PANEL_GAP), 0, item)).join('')
  return svgDocument(width, PANEL_SIZE, content)
}

function optionSvg(content) {
  return svgDocument(PANEL_SIZE, PANEL_SIZE, panel(0, 0, content))
}

function makeVisualQuestion({ id, title, promptPanels, optionPanels, correctIndex }) {
  const optionLabels = ['א', 'ב', 'ג', 'ד']

  return {
    id,
    grade: 'thinking-challenge',
    subject: 'אתגר מחשבתי: השלמת סדרות',
    level: null,
    activityType: 'practice',
    type: 'multiple',
    text: title,
    image: sequenceSvg([...promptPanels, questionMarkPanel()]),
    optionImages: optionPanels.map(optionSvg),
    options: optionLabels.slice(0, optionPanels.length),
    correct_answer: [optionLabels[correctIndex]],
  }
}

const challengeQuestions = [
  makeVisualQuestion({
    id: 'series-completion-polygons',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      polygonContent({ sides: 3 }),
      polygonContent({ sides: 4, rotation: 45 }),
      polygonContent({ sides: 5 }),
    ],
    optionPanels: [
      polygonContent({ sides: 6 }),
      polygonContent({ sides: 8, rotation: 22 }),
      polygonContent({ sides: 7 }),
      polygonContent({ sides: 5 }),
    ],
    correctIndex: 0,
  }),
  makeVisualQuestion({
    id: 'series-completion-flowers',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      flowerContent({ petals: 2 }),
      flowerContent({ petals: 4 }),
      flowerContent({ petals: 6 }),
    ],
    optionPanels: [
      flowerContent({ petals: 7 }),
      flowerContent({ petals: 8 }),
      flowerContent({ petals: 10 }),
      flowerContent({ petals: 12 }),
    ],
    correctIndex: 1,
  }),
  makeVisualQuestion({
    id: 'series-completion-grid-dots',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      gridDotsContent([{ col: 2, row: 1 }, { col: 2, row: 2 }, { col: 2, row: 3 }]),
      gridDotsContent([{ col: 1, row: 1 }, { col: 2, row: 2 }, { col: 2, row: 3 }]),
      gridDotsContent([{ col: 1, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 3 }]),
    ],
    optionPanels: [
      gridDotsContent([{ col: 2, row: 0 }, { col: 2, row: 2 }, { col: 2, row: 4 }]),
      gridDotsContent([{ col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }]),
      gridDotsContent([{ col: 0, row: 2 }, { col: 2, row: 2 }, { col: 4, row: 2 }]),
      gridDotsContent([{ col: 1, row: 1 }, { col: 3, row: 2 }, { col: 4, row: 3 }]),
    ],
    correctIndex: 1,
  }),
  makeVisualQuestion({
    id: 'series-completion-triangles',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      triangleContent({ width: 54 }),
      triangleContent({ width: 40 }),
      triangleContent({ width: 28 }),
    ],
    optionPanels: [
      triangleContent({ width: 20 }),
      triangleContent({ width: 32 }),
      triangleContent({ width: 44 }),
      triangleContent({ width: 56 }),
    ],
    correctIndex: 0,
  }),
  makeVisualQuestion({
    id: 'series-completion-hooked-arrows',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      hookedArrowContent('left'),
      hookedArrowContent('down'),
      hookedArrowContent('up'),
    ],
    optionPanels: [
      hookedArrowContent('down'),
      hookedArrowContent('left'),
      hookedArrowContent('up'),
      hookedArrowContent('right'),
    ],
    correctIndex: 3,
  }),
  makeVisualQuestion({
    id: 'series-completion-star-dots',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      starContent(1),
      starContent(2),
      starContent(3),
    ],
    optionPanels: [
      starContent(0),
      starContent(4),
      starContent(2),
      starContent(3),
    ],
    correctIndex: 1,
  }),
  makeVisualQuestion({
    id: 'series-completion-straight-arrows',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      straightArrowContent('left'),
      straightArrowContent('upLeft'),
      straightArrowContent('downLeft'),
    ],
    optionPanels: [
      straightArrowContent('right'),
      straightArrowContent('downRight'),
      straightArrowContent('up'),
      straightArrowContent('left'),
    ],
    correctIndex: 0,
  }),
  makeVisualQuestion({
    id: 'series-completion-diagonal-lines',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      diagonalLineContent([[26, 76, 54, 20]]),
      diagonalLineContent([[20, 72, 76, 26]]),
      diagonalLineContent([[20, 22, 74, 40]]),
    ],
    optionPanels: [
      diagonalLineContent([[52, 18, 76, 72]]),
      diagonalLineContent([[18, 22, 70, 72]]),
      diagonalLineContent([[24, 74, 80, 56]]),
      diagonalLineContent([[20, 46, 78, 18]]),
    ],
    correctIndex: 0,
  }),
  makeVisualQuestion({
    id: 'series-completion-l-shapes',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      steppedLContent({ innerStep: false, marker: 'bottomRight' }),
      steppedLContent({ innerStep: true, marker: 'inner' }),
      steppedLContent({ innerStep: false, marker: 'topLeft' }),
    ],
    optionPanels: [
      steppedLContent({ innerStep: true, marker: 'topRight' }),
      steppedLContent({ innerStep: false, marker: 'bottomRight' }),
      steppedLContent({ innerStep: true, marker: 'inner' }),
      steppedLContent({ innerStep: false, marker: 'topLeft' }),
    ],
    correctIndex: 0,
  }),
  makeVisualQuestion({
    id: 'series-completion-zigzag-semicircle',
    title: 'בחרו את הצורה הבאה בסדרה',
    promptPanels: [
      semicircleZigzagContent({ rotation: 0, flipSemi: false }),
      semicircleZigzagContent({ rotation: 90, flipSemi: false }),
      semicircleZigzagContent({ rotation: 180, flipSemi: true }),
    ],
    optionPanels: [
      semicircleZigzagContent({ rotation: 0, flipSemi: false }),
      semicircleZigzagContent({ rotation: 270, flipSemi: true }),
      semicircleZigzagContent({ rotation: 90, flipSemi: false }),
      semicircleZigzagContent({ rotation: 180, flipSemi: false }),
    ],
    correctIndex: 1,
  }),
]

function cloneQuestionForGrade(question, grade, subject) {
  return {
    ...question,
    id: `${question.id}-${grade}`,
    grade,
    subject,
  }
}

const grade8Questions = challengeQuestions.map(question => cloneQuestionForGrade(question, 'grade-8', 'השלמת סדרות'))
const grade12Questions = challengeQuestions.map(question => cloneQuestionForGrade(question, 'grade-12', 'השלמת סדרות'))

export default [
  ...challengeQuestions,
  ...grade8Questions,
  ...grade12Questions,
]
