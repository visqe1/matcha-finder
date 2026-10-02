// Scores how "matcha" a photo looks: the share of matcha-green pixels, weighted
// by how saturated they are. A matcha latte scores high; storefronts, pastry
// cases and leafy interiors (darker, duller greens) score near zero.
// The image must be loaded with crossOrigin="anonymous" (our photo route sends
// CORS headers), otherwise the canvas is tainted and we return 0.
const SAMPLE_SIZE = 32;

// Below this, no photo is green enough to be worth reordering for. Tuned on
// real café photos: a drink that fills ~1/5 of the frame scores ~0.014.
export const MIN_MATCHA_SCORE = 0.006;

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

export function matchaScore(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    let score = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      // Yellow-green through green, with some color, from deep to milky matcha
      if (h >= 60 && h <= 150 && s >= 0.18 && l >= 0.15 && l <= 0.72) {
        score += s;
      }
    }
    return score / (SAMPLE_SIZE * SAMPLE_SIZE);
  } catch {
    return 0;
  }
}
