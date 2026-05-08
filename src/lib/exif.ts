import exifr from 'exifr'

export interface PhotoExif {
  date: string | null
  camera: string | null
  lens: string | null
  aperture: string | null
  shutter: string | null
  iso: number | null
  focal_length: string | null
}

export async function readPhotoExif(file: File): Promise<PhotoExif | null> {
  try {
    const data = await exifr.parse(file, [
      'DateTimeOriginal', 'CreateDate',
      'Make', 'Model',
      'LensModel',
      'FNumber',
      'ExposureTime',
      'ISO',
      'FocalLength',
    ])
    if (!data) return null

    const rawDate = data.DateTimeOriginal ?? data.CreateDate
    const d = rawDate ? (rawDate instanceof Date ? rawDate : new Date(rawDate)) : null

    const make = (data.Make as string | undefined)?.trim() ?? null
    const model = (data.Model as string | undefined)?.trim() ?? null
    let camera: string | null = null
    if (make && model) {
      camera = model.startsWith(make) ? model : `${make} ${model}`
    } else {
      camera = model ?? make ?? null
    }

    const lens = (data.LensModel as string | undefined) ?? null

    const aperture = data.FNumber != null
      ? `f/${(data.FNumber as number).toFixed(1).replace(/\.0$/, '')}`
      : null

    const et = data.ExposureTime as number | undefined
    const shutter = et != null
      ? et < 1 ? `1/${Math.round(1 / et)}s` : `${et}s`
      : null

    const iso = (data.ISO as number | undefined) ?? null
    const fl = data.FocalLength as number | undefined
    const focal_length = fl != null ? `${Math.round(fl)}mm` : null

    return {
      date: d && !isNaN(d.getTime()) ? d.toISOString() : null,
      camera,
      lens,
      aperture,
      shutter,
      iso,
      focal_length,
    }
  } catch {
    return null
  }
}
