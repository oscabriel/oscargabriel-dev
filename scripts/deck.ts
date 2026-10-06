// Cut the Roll of Arms' deck: the 22 trumps of the Rider–Waite–Smith tarot,
// drawn by Pamela Colman Smith and published by William Rider & Son in 1909.
// The scans are public domain on Wikimedia Commons ("RWS1909 - 00 Fool.jpeg"
// and on). Each is cropped to its picture (the printed numeral and title are
// set again in the site's own type), dithered to one bit like a woodcut, and
// saved as ink on a clear ground, so the card's stock shows through.
//
//   bun scripts/deck.ts
//
// Needs ImageMagick 7 (`magick`) on the PATH. Writes public/arms/trumps/.

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

function run(command: string, args: readonly string[]): string {
	return execFileSync(command, args, { encoding: "utf-8" });
}

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "oscargabriel.dev deck cutter (https://oscargabriel.dev)";
const OUT = fileURLToPath(new URL("../public/arms/trumps", import.meta.url));

// The site's ink, which the card is printed in whatever the theme.
const INK = "#2a2722";
const WIDTH = 160;
const HEIGHT = 260;

// The picture inside every scan's printed frame, as fractions of the scan:
// below the numeral, above the title band, inside the border.
const CROP = { left: 0.075, top: 0.09, width: 0.85, height: 0.775 };

// Commons answers a quick run of downloads with 429s.
const PAUSE_MS = 1500;

const TITLES = [
	"00 Fool",
	"01 Magician",
	"02 High Priestess",
	"03 Empress",
	"04 Emperor",
	"05 Hierophant",
	"06 Lovers",
	"07 Chariot",
	"08 Strength",
	"09 Hermit",
	"10 Wheel of Fortune",
	"11 Justice",
	"12 Hanged Man",
	"13 Death",
	"14 Temperance",
	"15 Devil",
	"16 Tower",
	"17 Star",
	"18 Moon",
	"19 Sun",
	"20 Judgement",
	"21 World",
];

interface ImageInfoResponse {
	readonly query: {
		readonly pages: Record<
			string,
			{ readonly imageinfo: readonly { readonly url: string }[] }
		>;
	};
}

async function originalUrl(title: string): Promise<string> {
	const query = new URLSearchParams({
		action: "query",
		titles: `File:RWS1909 - ${title}.jpeg`,
		prop: "imageinfo",
		iiprop: "url",
		format: "json",
	});
	const response = await fetch(`${COMMONS_API}?${query}`, {
		headers: { "User-Agent": USER_AGENT },
	});
	const body: ImageInfoResponse = await response.json();
	const [page] = Object.values(body.query.pages);
	const url = page?.imageinfo[0]?.url;
	if (url === undefined) {
		throw new Error(`No scan on Commons for ${title}`);
	}
	return url;
}

async function download(url: string, file: string): Promise<void> {
	const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
	if (!response.ok) {
		throw new Error(`${response.status} for ${url}`);
	}
	await writeFile(file, new Uint8Array(await response.arrayBuffer()));
}

async function cut(scan: string, out: string): Promise<void> {
	const size = run("magick", ["identify", "-format", "%w %h", scan]);
	const [width = 0, height = 0] = size.split(" ").map(Number);
	const crop = `${Math.round(width * CROP.width)}x${Math.round(height * CROP.height)}+${Math.round(width * CROP.left)}+${Math.round(height * CROP.top)}`;
	const mask = `${out}.mask.png`;
	// The contrast curve pushes the hand-coloured fills toward paper or ink
	// before the dither, so the line work leads, as in a woodcut.
	run("magick", [
		scan,
		"-crop",
		crop,
		"+repage",
		"-resize",
		`${WIDTH}x${HEIGHT}!`,
		"-colorspace",
		"Gray",
		"-sigmoidal-contrast",
		"6x55%",
		"-dither",
		"FloydSteinberg",
		"-monochrome",
		"-negate",
		mask,
	]);
	// The dither becomes the alpha of a sheet of ink.
	run("magick", [
		"-size",
		`${WIDTH}x${HEIGHT}`,
		`xc:${INK}`,
		mask,
		"-alpha",
		"off",
		"-compose",
		"CopyOpacity",
		"-composite",
		`PNG8:${out}`,
	]);
	await rm(mask);
}

const scratch = await mkdtemp(path.join(tmpdir(), "deck-"));
await mkdir(OUT, { recursive: true });
try {
	// One card at a time: Commons turns away a quick run of downloads.
	/* oxlint-disable no-await-in-loop */
	for (const title of TITLES) {
		const number = title.slice(0, 2);
		const scan = path.join(scratch, `${number}.jpg`);
		await download(await originalUrl(title), scan);
		await cut(scan, path.join(OUT, `${number}.png`));
		process.stdout.write(`${title}\n`);
		await sleep(PAUSE_MS);
	}
	/* oxlint-enable no-await-in-loop */
} finally {
	await rm(scratch, { recursive: true });
}
