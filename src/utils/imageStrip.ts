/**
 * Strip EXIF / GPS / device metadata from a photo by re-encoding the
 * pixels through a <canvas>. Browsers expose no API to edit metadata
 * in place — but a canvas-encoded JPEG only carries the JFIF header +
 * pixel data, so EVERYTHING else (camera model, GPS, capture time,
 * thumbnail, software version) is gone after this pass.
 *
 * Also downsamples to `maxEdge` px (default 1280) so a 4096×3072 phone
 * snapshot doesn't blow out Storage or upload bandwidth.
 *
 * Mirror of stripImageMetadata in src/store/useAppStore.ts — that one
 * was scoped to the Childhood Diary; this is the public, family-photo
 * version. Same algorithm, no behavior drift.
 *
 * Inputs accepted:
 *   • A data: URL (FileReader.readAsDataURL result)
 *   • A Blob / File (camera capture / file picker)
 *
 * Always returns a Blob (image/jpeg) so the caller can upload directly.
 */
export async function stripImageMetadata(
  source: string | Blob,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  const { maxEdge = 1280, quality = 0.86 } = options

  // 1. Normalise to a same-origin image URL the <img> tag can load.
  const sourceUrl =
    typeof source === 'string' ? source : URL.createObjectURL(source)

  try {
    const img = await loadImage(sourceUrl)

    const w0 = img.naturalWidth || img.width
    const h0 = img.naturalHeight || img.height
    if (w0 === 0 || h0 === 0) {
      throw new Error('image_has_zero_dimensions')
    }

    const scale = Math.min(1, maxEdge / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas_context_unavailable')

    // White matte under transparent sources so PNG→JPEG doesn't end
    // up with black bands where alpha used to be.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('canvas_to_blob_failed')
    return blob
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(sourceUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = src
  })
}
