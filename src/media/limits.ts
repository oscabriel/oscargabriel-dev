// The admin API refuses any request body over this, uploads included.
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

// The formats `sniffImageType` recognises, for the file picker's filter.
export const ACCEPTED_IMAGE_TYPES =
	"image/png,image/jpeg,image/gif,image/webp,image/avif";
