import moonUrl from "@/components/sun-moon/moon.webp";
import sunUrl from "@/components/sun-moon/sun.webp";

// The sun and the moon, from folio LXXVI of Hartmann Schedel's Nuremberg
// Chronicle (Anton Koberger, 1493), cut in the workshop of Michael Wolgemut
// and Wilhelm Pleydenwurff and coloured by hand. The copy is out of copyright
// and the scan is public domain (Wikimedia Commons, "Nuremberg chronicles -
// Sun and Moon (LXXVIr)"; a cleaned scan from rawpixel, id 10184806).
//
// Cut from the scan as raster layers rather than traced, so the hatching
// keeps its weight: the ink is an alpha mask, painted in the current colour
// so it follows the theme (the mask is set in styles.css, since the lint
// bans inline styles), and the hand-colouring is two washes under it.
// Only one wash shows at a time: the sun's by day, the moon's by night, so
// the device tells the theme without a caption.
const WASH_CLASS =
	"transition-opacity duration-300 motion-reduce:transition-none";

interface SunMoonProps {
	className?: string;
}

// The sun's wash sets the box from its own proportions; the moon's wash and
// the ink lie over it edge to edge.
export function SunMoon({ className }: SunMoonProps) {
	return (
		<span aria-hidden="true" className={`relative block ${className ?? ""}`}>
			<img
				alt=""
				className={`${WASH_CLASS} block h-full w-auto dark:opacity-0 dark:group-hover:opacity-35 dark:group-focus-visible:opacity-35`}
				src={sunUrl}
			/>
			<img
				alt=""
				className={`${WASH_CLASS} absolute inset-0 h-full w-full opacity-0 group-hover:opacity-35 group-focus-visible:opacity-35 dark:opacity-100 dark:group-hover:opacity-100 dark:group-focus-visible:opacity-100`}
				src={moonUrl}
			/>
			<span className="sun-moon-ink absolute inset-0 bg-current" />
		</span>
	);
}
