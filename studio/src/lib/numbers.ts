// Utility to convert ASCII numbers / strings to Devanagari numerals

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(input: number | string): string {
  const str = String(input);
  return str.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[parseInt(d, 10)]);
}

export function fromNepaliDigits(input: string): string {
  return input.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}
