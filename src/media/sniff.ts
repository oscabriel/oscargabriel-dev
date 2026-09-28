export interface ImageType {
	contentType: string;
	extension: string;
}

const ascii = new TextEncoder();

const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = Uint8Array.of(0xff, 0xd8, 0xff);
const GIF87A = ascii.encode("GIF87a");
const GIF89A = ascii.encode("GIF89a");
const RIFF = ascii.encode("RIFF");
const WEBP = ascii.encode("WEBP");
const WEBP_OFFSET = 8;

// ISO-BMFF `ftyp` box: size (4), "ftyp" (4), major brand (4), minor
// version (4), then compatible brands (4 each) up to the box size.
const FTYP = ascii.encode("ftyp");
const FTYP_OFFSET = 4;
const MAJOR_BRAND_OFFSET = 8;
const COMPATIBLE_BRANDS_OFFSET = 16;
const BRAND_SIZE = 4;
const AVIF = ascii.encode("avif");
const AVIS = ascii.encode("avis");

function matchesAt(
	bytes: Uint8Array,
	offset: number,
	signature: Uint8Array
): boolean {
	return signature.every((byte, index) => bytes[offset + index] === byte);
}

function hasAvifBrand(bytes: Uint8Array, at: number): boolean {
	return matchesAt(bytes, at, AVIF) || matchesAt(bytes, at, AVIS);
}

// AVIF lists `avif` (still) or `avis` (sequence) as its major brand or as
// one of its compatible brands.
function isAvif(bytes: Uint8Array): boolean {
	if (!matchesAt(bytes, FTYP_OFFSET, FTYP)) {
		return false;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const boxSize = Math.min(view.getUint32(0), bytes.byteLength);
	if (hasAvifBrand(bytes, MAJOR_BRAND_OFFSET)) {
		return true;
	}
	for (
		let at = COMPATIBLE_BRANDS_OFFSET;
		at + BRAND_SIZE <= boxSize;
		at += BRAND_SIZE
	) {
		if (hasAvifBrand(bytes, at)) {
			return true;
		}
	}
	return false;
}

// Trusts the file's leading bytes, never its name or the client's MIME type.
// SVG is deliberately absent: it can carry script.
export function sniffImageType(bytes: Uint8Array): ImageType | undefined {
	if (matchesAt(bytes, 0, PNG)) {
		return { contentType: "image/png", extension: "png" };
	}
	if (matchesAt(bytes, 0, JPEG)) {
		return { contentType: "image/jpeg", extension: "jpg" };
	}
	if (matchesAt(bytes, 0, GIF87A) || matchesAt(bytes, 0, GIF89A)) {
		return { contentType: "image/gif", extension: "gif" };
	}
	if (matchesAt(bytes, 0, RIFF) && matchesAt(bytes, WEBP_OFFSET, WEBP)) {
		return { contentType: "image/webp", extension: "webp" };
	}
	if (isAvif(bytes)) {
		return { contentType: "image/avif", extension: "avif" };
	}
	return undefined;
}
