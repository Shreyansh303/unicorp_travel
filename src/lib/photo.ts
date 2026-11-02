/**
 * Responsive photo sources, cropped at build time to the shape of the frame they fill.
 *
 * Most frames are arches or other fixed-shape boxes filled with landscape photos. Without a crop
 * the browser picks a file by the box width, but object-fit: cover shows the photo at the box
 * height, so it downloads a file that is too small and upscales it. Cropping to the frame's aspect
 * makes the delivered file match the box, so `sizes` (the box width) picks a sharp file without
 * paying for pixels that are cut off anyway.
 *
 * The crop is centred unless a `position` is given, the same as the frames' default
 * object-position, so what shows in the frame does not change.
 *
 * A frame whose shape changes with the viewport (a full-bleed photo of fixed height on phones)
 * keeps the photo's own aspect: leave `aspect` out and describe the rendered width in `sizes`,
 * e.g. `max(100vw, 20rem * 1.5)` (see `coverWidth`).
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/** Set explicitly: sharp's AVIF default (50) looks soft on large photos. */
export const photoQuality = { avif: 60, webp: 80 } as const;

/**
 * For the full-bleed photos on phones, which are the LCP image there: files sized for a 2x to 3x
 * screen, where compression shows far less than softness, at a quality that keeps them within the
 * mobile LCP budget.
 */
export const phoneQuality = { avif: 45, webp: 72 } as const;
const formats = ['avif', 'webp'] as const;

export interface PhotoCrop {
  /** Width over height of the frame. Leave out to keep the photo's own aspect. */
  aspect?: number;
  /** Candidate file widths; any beyond what the source can give at this aspect are capped. */
  widths: number[];
  sizes: string;
  /** Media condition (art direction). Crops are tried in order; the last one has none. */
  media?: string;
  /** Focal point of the crop, as sharp takes it (e.g. 'top', 'right'). Default: the centre. */
  position?: string;
  /** Encoder quality; default `photoQuality`. */
  quality?: { avif: number; webp: number };
}

export interface PhotoSource {
  type: string;
  srcset: string;
  sizes: string;
  media?: string;
}

export interface PhotoSet {
  sources: PhotoSource[];
  /** Fallback file (WebP, from the last crop) and its size. */
  src: string;
  width: number;
  height: number;
}

/** The widths the source can deliver at this aspect, with the largest possible one if any were cut. */
function capWidths(widths: number[], max: number): number[] {
  const sorted = [...new Set(widths)].sort((a, b) => a - b);
  const kept = sorted.filter((width) => width <= max);
  return kept.length < sorted.length ? [...kept, max] : kept;
}

/**
 * The CSS width at which a photo shows in a frame of the given width and height with
 * object-fit: cover, for a `sizes` value: the frame width, or wider when the frame is relatively
 * taller than the photo.
 */
export function coverWidth(src: ImageMetadata, frameWidth: string, frameHeight: string): string {
  const ratio = Math.round((src.width / src.height) * 1000) / 1000;
  return `max(${frameWidth}, ${frameHeight} * ${ratio})`;
}

export async function photoSet(src: ImageMetadata, crops: PhotoCrop[]): Promise<PhotoSet> {
  if (crops.length === 0 || crops.at(-1)?.media) {
    throw new Error('photoSet: give at least one crop, and no media on the last one');
  }
  const sources: PhotoSource[] = [];
  let fallback: { src: string; width: number; height: number } | null = null;

  for (const [index, crop] of crops.entries()) {
    const aspect = crop.aspect ?? src.width / src.height;
    const max = Math.min(src.width, Math.floor(src.height * aspect));
    const widths = capWidths(crop.widths, max);
    const shape = (width: number) =>
      crop.aspect
        ? {
            width,
            height: Math.round(width / aspect),
            fit: 'cover' as const,
            position: crop.position ?? 'centre',
          }
        : { width };
    const largest = widths.at(-1) ?? max;

    for (const format of formats) {
      const image = await getImage({
        src,
        format,
        quality: (crop.quality ?? photoQuality)[format],
        ...shape(largest),
        widths,
        sizes: crop.sizes,
      });
      sources.push({
        type: `image/${format}`,
        srcset: image.srcSet.attribute,
        sizes: crop.sizes,
        ...(crop.media ? { media: crop.media } : {}),
      });
    }

    if (index === crops.length - 1) {
      const width = Math.min(960, max);
      const image = await getImage({
        src,
        format: 'webp',
        quality: (crop.quality ?? photoQuality).webp,
        ...shape(width),
      });
      fallback = { src: image.src, width, height: Math.round(width / aspect) };
    }
  }

  if (!fallback) throw new Error('photoSet: no fallback');
  return { sources, ...fallback };
}
