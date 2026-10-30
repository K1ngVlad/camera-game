/**
 * npm run art — prepare sprites from art-src/ → src/assets/
 *
 * Per-folder unified bounding box, scale, pad, compress.
 * Skips files where output is newer than source.
 */

import { readdir, stat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ART_SRC = join(ROOT, 'art-src')
const OUT_ROOT = join(ROOT, 'src', 'assets')

// Max dimensions by path category
function maxDim(relPath) {
  const parts = relPath.split(/[\\/]/)
  if (parts[0] === 'backgrounds') return { axis: 'width', px: 1280 }
  if (parts[0] === 'portraits') return { axis: 'height', px: 640 }
  return { axis: 'height', px: 768 } // cats, props, etc.
}

// Scan RGBA pixels, return bounding box of non-transparent pixels (alpha > threshold)
function boundingBox(data, width, height, threshold = 8) {
  let minX = width, maxX = -1, minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null // fully transparent
  return { left: minX, top: minY, right: maxX, bottom: maxY }
}

// Union two bounding boxes
function unionBox(a, b) {
  if (!a) return b
  if (!b) return a
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  }
}

// Walk directory, return all .png files grouped by parent folder
async function collectGroups(dir) {
  const groups = new Map() // folderPath → [filePath]
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const e of entries) {
      const full = join(current, e.name)
      if (e.isDirectory()) {
        await walk(full)
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.png')) {
        const folder = current
        if (!groups.has(folder)) groups.set(folder, [])
        groups.get(folder).push(full)
      }
    }
  }
  await walk(dir)
  return groups
}

async function isNewer(src, out) {
  try {
    const [s, o] = await Promise.all([stat(src), stat(out)])
    return o.mtimeMs > s.mtimeMs
  } catch {
    return false
  }
}

async function processGroup(folder, files) {
  // Compute unified bounding box across all frames in the folder
  const metas = await Promise.all(
    files.map(async (f) => {
      const { data, info } = await sharp(f)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const box = boundingBox(data, info.width, info.height)
      return { file: f, data, info, box }
    }),
  )

  const unifiedBox = metas.reduce((acc, m) => unionBox(acc, m.box), null)
  if (!unifiedBox) {
    console.warn(`[art] ${relative(ROOT, folder)}: all frames fully transparent, skipping`)
    return []
  }

  const cropW = unifiedBox.right - unifiedBox.left + 1
  const cropH = unifiedBox.bottom - unifiedBox.top + 1

  const PAD_SIDE = 4
  const PAD_TOP = 4
  const PAD_BOT = 0

  const results = []

  for (const { file } of metas) {
    const relPath = relative(ART_SRC, file)
    const outPath = join(OUT_ROOT, relPath)

    if (await isNewer(file, outPath)) {
      results.push({ file: relPath, skipped: true })
      continue
    }

    const srcStat = await stat(file)
    const dim = maxDim(relPath)

    let pipeline = sharp(file)
      .ensureAlpha()
      .extract({
        left: unifiedBox.left,
        top: unifiedBox.top,
        width: cropW,
        height: cropH,
      })

    // Scale preserving aspect ratio
    const resizeOpts =
      dim.axis === 'height'
        ? { height: dim.px, width: undefined, withoutEnlargement: true }
        : { width: dim.px, height: undefined, withoutEnlargement: true }

    pipeline = pipeline.resize({
      ...resizeOpts,
      fit: 'inside',
      kernel: 'lanczos3',
    })

    // Add padding: sides + top, none at bottom
    pipeline = pipeline.extend({
      left: PAD_SIDE,
      right: PAD_SIDE,
      top: PAD_TOP,
      bottom: PAD_BOT,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })

    pipeline = pipeline.png({ compressionLevel: 9 })

    await mkdir(dirname(outPath), { recursive: true })
    const outBuf = await pipeline.toBuffer()
    await writeFile(outPath, outBuf)

    const outStat = await stat(outPath)
    results.push({
      file: relPath,
      skipped: false,
      wasCropW: cropW,
      wasCropH: cropH,
      beforeKB: Math.round(srcStat.size / 1024),
      afterKB: Math.round(outStat.size / 1024),
    })
  }
  return results
}

async function main() {
  const groups = await collectGroups(ART_SRC)

  if (groups.size === 0) {
    console.log('[art] no PNG files found in art-src/')
    return
  }

  const allResults = []
  for (const [folder, files] of groups) {
    const results = await processGroup(folder, files)
    allResults.push(...results)
  }

  // Print table
  const rows = allResults.map((r) => {
    if (r.skipped) return [r.file, '—', '—', 'skipped (up to date)']
    const ratio = r.beforeKB > 0 ? ((r.afterKB / r.beforeKB) * 100).toFixed(0) + '%' : '—'
    return [r.file, `${r.beforeKB} KB`, `${r.afterKB} KB`, ratio]
  })

  const headers = ['file', 'before', 'after', 'ratio']
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length)),
  )
  const fmt = (cols) => cols.map((c, i) => String(c).padEnd(colWidths[i])).join('  ')

  console.log('\n' + fmt(headers))
  console.log(colWidths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of rows) console.log(fmt(row))
  console.log()
}

main().catch((err) => {
  console.error('[art] error:', err)
  process.exit(1)
})
