// Gera toda a arte empacotada a partir da arte original em design/.
//
//   node tools/build-assets.js design/background-functional.png assets/active-2-square
//
// Em um passo so, porque o zeus varre qualquer .js do projeto como entrada de
// build e quebra em require relativo entre scripts: o codec PNG precisa morar
// no mesmo arquivo que o usa.
//
// Saidas:
//   background-functional-soft.png  fundo com digitos apagados, medidores
//                                   zerados e a lua removida
//   gauge-*.png                     tiras de medidor com a fileira toda acesa
//   weather-*.png                   icones de condicao do tempo

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

// ---------------------------------------------------------------- codec PNG

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n
  for (let k = 0; k < 8; k++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

function readPng(file) {
  const source = fs.readFileSync(file)
  if (!source.subarray(0, 8).equals(SIGNATURE)) throw new Error(`${file} nao e um PNG`)

  const chunks = []
  const imageData = []
  for (let offset = 8; offset < source.length;) {
    const length = source.readUInt32BE(offset)
    const type = source.toString('ascii', offset + 4, offset + 8)
    const data = source.subarray(offset + 8, offset + 8 + length)
    if (type === 'IDAT') imageData.push(data)
    else chunks.push({ type, data })
    offset += length + 12
    if (type === 'IEND') break
  }

  const header = chunks.find(({ type }) => type === 'IHDR')?.data
  if (!header) throw new Error(`${file} nao tem IHDR`)
  const width = header.readUInt32BE(0)
  const height = header.readUInt32BE(4)
  if (header[8] !== 8 || (header[9] !== 2 && header[9] !== 6) || header[12] !== 0) {
    throw new Error(`${file}: esperado PNG RGB/RGBA de 8 bits nao entrelacado`)
  }

  const channels = header[9] === 6 ? 4 : 3
  const stride = width * channels
  const packed = zlib.inflateSync(Buffer.concat(imageData))
  const pixels = Buffer.alloc(stride * height)

  for (let y = 0; y < height; y++) {
    const packedRow = y * (stride + 1)
    const filter = packed[packedRow]
    for (let i = 0; i < stride; i++) {
      const value = packed[packedRow + 1 + i]
      const left = i >= channels ? pixels[y * stride + i - channels] : 0
      const above = y > 0 ? pixels[(y - 1) * stride + i] : 0
      const upperLeft = y > 0 && i >= channels ? pixels[(y - 1) * stride + i - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = above
      else if (filter === 3) predictor = Math.floor((left + above) / 2)
      else if (filter === 4) predictor = paeth(left, above, upperLeft)
      else if (filter !== 0) throw new Error(`filtro PNG nao suportado: ${filter}`)
      pixels[y * stride + i] = (value + predictor) & 0xff
    }
  }

  return { width, height, channels, stride, pixels, chunks }
}

function makeChunk(type, data) {
  const name = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  let crc = 0xffffffff
  for (const byte of Buffer.concat([name, data])) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, name, data, checksum])
}

function writePng(file, image) {
  const { width, height, channels, stride, pixels } = image
  const rows = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    rows[y * (stride + 1)] = 0
    pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = channels === 4 ? 6 : 2

  const output = [SIGNATURE, makeChunk('IHDR', ihdr)]
  for (const { type, data } of image.chunks || []) {
    if (type !== 'IHDR' && type !== 'IEND') output.push(makeChunk(type, data))
  }
  output.push(makeChunk('IDAT', zlib.deflateSync(rows)))
  output.push(makeChunk('IEND', Buffer.alloc(0)))
  fs.writeFileSync(file, Buffer.concat(output))
}

function createPng(width, height, channels = 4) {
  const stride = width * channels
  return { width, height, channels, stride, pixels: Buffer.alloc(stride * height), chunks: null }
}

function getPixel(image, x, y) {
  const i = y * image.stride + x * image.channels
  const { pixels, channels } = image
  return [pixels[i], pixels[i + 1], pixels[i + 2], channels === 4 ? pixels[i + 3] : 255]
}

function setPixel(image, x, y, [r, g, b, a = 255]) {
  const i = y * image.stride + x * image.channels
  const { pixels, channels } = image
  pixels[i] = r
  pixels[i + 1] = g
  pixels[i + 2] = b
  if (channels === 4) pixels[i + 3] = a
}

// -------------------------------------------------------------- areas da arte

const DIGIT_SLOTS = [32, 102, 208, 283]
const DIGIT_BAND = { top: 164, bottom: 262, width: 66 }

// Fileiras de tracinhos medidas na arte. Na original algumas ja vem acesas, o
// que congela o medidor; aqui todas sao apagadas e o estado aceso vira overlay.
const GAUGES = [
  { name: 'steps', x: 138, y: 338, w: 102, h: 6 },
  { name: 'calories', x: 138, y: 403, w: 102, h: 7 },
  { name: 'distance', x: 256, y: 338, w: 94, h: 6 },
  { name: 'sleep', x: 258, y: 403, w: 107, h: 6 },
  { name: 'battery', x: 41, y: 85, w: 35, h: 13 },
]

// A lua fica cravada no painel do clima. E copiada para o icone noturno e
// apagada com um trecho vazio do mesmo painel, à esquerda dela.
const MOON = { x: 317, y: 78, w: 37, h: 39, sourceOffsetX: -41 }

const INK = 30
const ORANGE = [255, 154, 4]
const TINT = [155, 230, 253]
const SAMPLES = 4

// --------------------------------------------------------------- icones SVG-ish

const W = MOON.w
const H = MOON.h
const CX = W / 2
const CY = H / 2

const dist = (x, y, x2, y2) => Math.hypot(x - x2, y - y2)
const disc = (cx, cy, r) => (x, y) => dist(x, y, cx, cy) <= r
const rect = (x1, y1, x2, y2) => (x, y) => x >= x1 && x <= x2 && y >= y1 && y <= y2

// Capsula: segmento de reta com espessura, usada em raios, gotas e faixas.
const bar = (x1, y1, x2, y2, thickness) => (x, y) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2))
  return dist(x, y, x1 + t * dx, y1 + t * dy) <= thickness / 2
}

const polygon = (points) => (x, y) => {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Nuvem base, deslocavel no eixo y para abrir espaco para gotas e raios. A base
// e um retangulo, e nao uma capsula, para o contorno nao estufar nas pontas.
const cloud = (dy = 0) => [
  disc(12.5, 21 + dy, 6.5),
  disc(20, 16.5 + dy, 9),
  disc(27, 20.5 + dy, 6),
  rect(12.5, 18 + dy, 27, 27 + dy),
]

const drop = (x, y, len) => bar(x, y, x - 1.8, y + len, 2.4)

const flake = (x, y, r) => [
  bar(x - r, y, x + r, y, 1.6),
  bar(x - r * 0.6, y - r * 0.85, x + r * 0.6, y + r * 0.85, 1.6),
  bar(x + r * 0.6, y - r * 0.85, x - r * 0.6, y + r * 0.85, 1.6),
]

const ICONS = {
  'weather-clear': {
    add: [
      disc(CX, CY, 8),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4
        return bar(CX + Math.cos(a) * 11, CY + Math.sin(a) * 11, CX + Math.cos(a) * 16.5, CY + Math.sin(a) * 16.5, 2.8)
      }),
    ],
  },
  'weather-cloudy': { add: cloud(2) },
  'weather-cloudy-night': {
    // Crescente = disco cheio menos um disco deslocado.
    add: [disc(27, 10, 7), ...cloud(6)],
    sub: [disc(31, 7, 6.5)],
  },
  'weather-rain': { add: [...cloud(-4), drop(14, 28, 7), drop(20, 30, 7), drop(26, 28, 7)] },
  'weather-rain-heavy': {
    add: [...cloud(-5), drop(11, 26, 9), drop(16.5, 29, 9), drop(22, 26, 9), drop(27.5, 29, 9)],
  },
  'weather-storm': {
    add: [
      ...cloud(-6),
      polygon([[21, 23], [13, 33], [18, 33], [15, 39], [25, 29], [19.5, 29], [24, 23]]),
    ],
  },
  'weather-snow': {
    add: [...cloud(-5), ...flake(11, 31, 3.4), ...flake(19, 34, 3.4), ...flake(27, 31, 3.4)],
  },
  'weather-fog': {
    add: [
      bar(7, 12, 30, 12, 3.4),
      bar(10, 19, 27, 19, 3.4),
      bar(7, 26, 30, 26, 3.4),
      bar(12, 33, 25, 33, 3.4),
    ],
  },
}

// ------------------------------------------------------------------ pipeline

const [inputPath, outputDir] = process.argv.slice(2)
if (!inputPath || !outputDir) {
  throw new Error('Uso: node build-assets.js design/background-functional.png assets/active-2-square')
}

const image = readPng(inputPath)
const out = (name) => path.join(outputDir, name)
const intensity = ([r, g, b]) => Math.max(r, g, b)
const isLit = ([r, g, b]) => r > 90 && r > g * 1.3 && r > b * 1.6

// 1. Hora: escurece os segmentos inativos e remove os contornos laranja.
let darkened = 0
let outlinesRemoved = 0
for (let y = DIGIT_BAND.top; y < Math.min(DIGIT_BAND.bottom, image.height); y++) {
  for (const slotX of DIGIT_SLOTS) {
    for (let x = slotX; x < Math.min(slotX + DIGIT_BAND.width, image.width); x++) {
      const [r, g, b] = getPixel(image, x, y)
      const highest = Math.max(r, g, b)
      const lowest = Math.min(r, g, b)
      if (lowest >= 22 && highest <= 110 && highest - lowest <= 18) {
        setPixel(image, x, y, [
          Math.max(10, Math.round(r * 0.3)),
          Math.max(10, Math.round(g * 0.3)),
          Math.max(10, Math.round(b * 0.3)),
        ])
        darkened++
      } else if (r >= 18 && r > g * 1.25 && r > b * 1.5) {
        setPixel(image, x, y, [12, 14, 13])
        outlinesRemoved++
      }
    }
  }
}
process.stdout.write(`hora: ${darkened} pixels de segmento escurecidos, ${outlinesRemoved} de contorno removidos\n`)

// 2. Icone noturno, recortado antes de a lua ser apagada.
const night = createPng(W, H, 4)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = getPixel(image, MOON.x + x, MOON.y + y)
    const alpha = Math.max(r, g, b)
    if (alpha > 12) setPixel(night, x, y, [r, g, b, alpha])
  }
}
writePng(out('weather-clear-night.png'), night)

// 3. Medidores: tudo apagado na arte, tira acesa como overlay.
for (const gauge of GAUGES) {
  let graySum = [0, 0, 0]
  let grayCount = 0
  let grayPeak = 0
  for (let y = gauge.y; y < gauge.y + gauge.h; y++) {
    for (let x = gauge.x; x < gauge.x + gauge.w; x++) {
      const pixel = getPixel(image, x, y)
      const v = intensity(pixel)
      if (v <= INK || isLit(pixel)) continue
      graySum = [graySum[0] + pixel[0], graySum[1] + pixel[1], graySum[2] + pixel[2]]
      grayCount++
      grayPeak = Math.max(grayPeak, v)
    }
  }
  if (!grayCount) throw new Error(`${gauge.name}: nenhum tracinho apagado para usar de referencia`)
  const grayHue = graySum.map((total) => total / grayCount / grayPeak)

  const overlay = createPng(gauge.w, gauge.h, 4)
  let turnedOff = 0
  for (let y = 0; y < gauge.h; y++) {
    for (let x = 0; x < gauge.w; x++) {
      const pixel = getPixel(image, gauge.x + x, gauge.y + y)
      const v = intensity(pixel)
      if (v <= INK) continue

      // Cobertura do tracinho: vira alpha do overlay e reconstroi o tom apagado
      // preservando o antialiasing da arte.
      const coverage = Math.min(1, isLit(pixel) ? v / 255 : v / grayPeak)
      setPixel(overlay, x, y, [...ORANGE, Math.round(coverage * 255)])

      if (isLit(pixel)) {
        const level = coverage * grayPeak
        setPixel(image, gauge.x + x, gauge.y + y, grayHue.map((c) => Math.round(c * level)))
        turnedOff++
      }
    }
  }

  writePng(out(`gauge-${gauge.name}.png`), overlay)
  process.stdout.write(`${gauge.name}: overlay ${gauge.w}x${gauge.h}, ${turnedOff} pixels acesos apagados\n`)
}

// 4. Remove a lua copiando um trecho vazio do mesmo painel.
for (let y = MOON.y; y < MOON.y + MOON.h; y++) {
  for (let x = MOON.x; x < MOON.x + MOON.w; x++) {
    setPixel(image, x, y, getPixel(image, x + MOON.sourceOffsetX, y))
  }
}

writePng(out('background-functional-soft.png'), image)
process.stdout.write('fundo gravado com a lua removida\n')

// 5. Demais icones de clima.
for (const [name, { add, sub = [] }] of Object.entries(ICONS)) {
  const icon = createPng(W, H, 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let hits = 0
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = x + (sx + 0.5) / SAMPLES
          const py = y + (sy + 0.5) / SAMPLES
          if (add.some((shape) => shape(px, py)) && !sub.some((shape) => shape(px, py))) hits++
        }
      }
      if (hits) setPixel(icon, x, y, [...TINT, Math.round((hits / (SAMPLES * SAMPLES)) * 255)])
    }
  }
  writePng(out(`${name}.png`), icon)
}
process.stdout.write(`${Object.keys(ICONS).length + 1} icones de clima gravados\n`)
