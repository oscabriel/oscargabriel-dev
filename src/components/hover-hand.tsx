// The mark on a link out of the book: a manicule after the label that slides
// in under the pointer or keyboard focus. Its parent link must carry `group`.
// Phones have no hover, so there it takes no room at all.
export function HoverHand() {
	return (
		<span
			aria-hidden="true"
			className="ml-1.5 hidden -translate-x-1 opacity-0 transition duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none md:inline-block"
		>
			☞
		</span>
	);
}
