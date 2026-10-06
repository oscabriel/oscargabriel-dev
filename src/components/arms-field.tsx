import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { strikeVerb } from "@/arms/chronicle";
import type { Corner } from "@/arms/duel";
import {
	drawField,
	FIELD_HEIGHT,
	FIELD_WIDTH,
	script,
	stage,
	toldBy,
} from "@/arms/field";
import type { FieldBout, Script } from "@/arms/field";
import { INK } from "@/arms/pixels";

// The field a bout is played out on: the two cards as card-soldiers, a log
// of the last few blows beneath, and a reader's controls. It begins when the
// field comes into view, and under reduced motion it opens at the end.

// The card's ink, as in styles.css: printed things keep their colours in
// both themes. Everything else is left clear, so the stock beneath shows.
const INK_RGBA = [0x2a, 0x27, 0x22, 0xff] as const;

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

const LOG_LINES = 3;
// Begin once this much of the field is on screen.
const IN_VIEW = 0.6;

type LogRun = { readonly name: Corner } | { readonly text: string };

// The log's line for one turn, newest last.
function logLine(field: Script, index: number): LogRun[] {
	const beat = field.beats[index];
	if (beat === undefined) {
		return [];
	}
	const { actor, outcome, critical, damage, healthAfter } = beat.event;
	const target: Corner = actor === 0 ? 1 : 0;
	if (outcome === "rest") {
		return [{ name: actor }, { text: " draws breath." }];
	}
	const strike = [
		{ name: actor },
		{ text: ` ${strikeVerb(field.bout.fighters[actor].mainhand)} ` },
		{ name: target },
	];
	if (outcome === "miss") {
		return [...strike, { text: ", who slips aside." }];
	}
	if (healthAfter === 0) {
		return [
			...strike,
			{ text: `: ${damage}, and ` },
			{ name: target },
			{ text: " falls." },
		];
	}
	return [
		...strike,
		{ text: critical ? `: ${damage}, a true blow.` : `: ${damage}.` },
	];
}

function prefersStillness(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Whole pixels where there's room for them; a phone gets what fits.
function fit(canvas: HTMLCanvasElement, width: number): void {
	const exact = width / FIELD_WIDTH;
	const scale = exact >= 2 ? Math.floor(exact) : exact;
	canvas.style.width = `${FIELD_WIDTH * scale}px`;
	canvas.style.height = `${FIELD_HEIGHT * scale}px`;
}

function playLabel(playing: boolean, ended: boolean): string {
	if (playing) {
		return "Pause";
	}
	return ended ? "Again" : "Play";
}

interface ArmsFieldProps {
	readonly bout: FieldBout;
}

export function ArmsField({ bout }: ArmsFieldProps) {
	const field = useMemo(() => script(bout), [bout]);
	const view = useMemo(() => stage(field), [field]);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const clock = useRef(0);
	const started = useRef(false);
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState<Speed>(1);
	const [told, setTold] = useState(0);
	const [ended, setEnded] = useState(false);
	// Made on the first paint: there is no ImageData on the server.
	const imageRef = useRef<ImageData | null>(null);

	const paint = useCallback(
		(t: number) => {
			const context = canvasRef.current?.getContext("2d");
			if (context === undefined || context === null) {
				return;
			}
			const shake = drawField(field, view, t);
			const image =
				imageRef.current ?? context.createImageData(FIELD_WIDTH, FIELD_HEIGHT);
			imageRef.current = image;
			image.data.fill(0);
			for (const [index, value] of view.raster.pixels.entries()) {
				if (value === INK) {
					image.data.set(INK_RGBA, index * 4);
				}
			}
			context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
			context.putImageData(image, shake.x, shake.y);
			setTold(toldBy(field, t));
			setEnded(t >= field.endAt);
		},
		[field, view]
	);

	// Size the canvas to its column, and keep it so.
	useEffect(() => {
		const observer = new ResizeObserver(([entry]) => {
			const canvas = canvasRef.current;
			if (entry !== undefined && canvas !== null) {
				fit(canvas, entry.contentRect.width);
			}
		});
		if (wrapRef.current !== null) {
			observer.observe(wrapRef.current);
		}
		return () => {
			observer.disconnect();
		};
	}, []);

	// The first frame, then play once the field is in view; under reduced
	// motion, the last frame and no more. A new bout is a new field (the page
	// keys it), so this runs once for each.
	useEffect(() => {
		const still = prefersStillness();
		clock.current = still ? field.endAt : 0;
		paint(clock.current);
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting && !started.current) {
					started.current = true;
					setPlaying(true);
				}
			},
			{ threshold: IN_VIEW }
		);
		if (!still && wrapRef.current !== null) {
			observer.observe(wrapRef.current);
		}
		return () => {
			observer.disconnect();
		};
	}, [field, paint]);

	useEffect(() => {
		let frame = 0;
		let last = performance.now();
		function tick(now: number) {
			clock.current = Math.min(
				field.endAt,
				clock.current + (now - last) * speed
			);
			last = now;
			paint(clock.current);
			if (clock.current >= field.endAt) {
				setPlaying(false);
				return;
			}
			frame = requestAnimationFrame(tick);
		}
		if (playing) {
			frame = requestAnimationFrame(tick);
		}
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [playing, speed, field, paint]);

	const hosts = [bout.fighters[0].host, bout.fighters[1].host] as const;
	const lines = Array.from(
		{ length: Math.min(LOG_LINES, told) },
		(_, offset) => {
			const index = told - Math.min(LOG_LINES, told) + offset;
			return { index, runs: logLine(field, index) };
		}
	);

	return (
		<figure className="mt-10">
			<div className="arms-field">
				<div ref={wrapRef}>
					<canvas
						ref={canvasRef}
						width={FIELD_WIDTH}
						height={FIELD_HEIGHT}
						aria-hidden="true"
						className="aspect-[144/80] w-full"
					/>
					<p className="sr-only">
						{hosts[0]} and {hosts[1]} fight it out as two cards on a field of
						card stock; the bout is told in full below.
					</p>
				</div>
				<ol
					aria-hidden="true"
					className="mx-auto mt-3 flex min-h-[4.5lh] max-w-[36rem] flex-col justify-end text-sm leading-snug"
				>
					{lines.map((line, position) => (
						<li
							key={line.index}
							className={
								position === lines.length - 1
									? "text-(--stock-ink)"
									: "text-(--stock-ink-soft)"
							}
						>
							{line.runs.map((run, runIndex) =>
								"name" in run ? (
									// A line's runs never reorder.
									// oxlint-disable-next-line react/no-array-index-key
									<span key={runIndex} className="smallcaps">
										{hosts[run.name]}
									</span>
								) : (
									run.text
								)
							)}
						</li>
					))}
				</ol>
			</div>
			<figcaption className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm text-ink-soft">
				<span className="text-xs smallcaps">Plate I</span>
				<button
					type="button"
					onClick={() => {
						if (ended) {
							clock.current = 0;
						}
						started.current = true;
						setPlaying((was) => !was);
					}}
					className="cursor-pointer text-ink hover:underline"
				>
					{playLabel(playing, ended)}
				</button>
				<fieldset className="flex gap-3">
					<legend className="sr-only">Speed</legend>
					{SPEEDS.map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={speed === option}
							onClick={() => {
								setSpeed(option);
							}}
							className="cursor-pointer hover:text-ink hover:underline aria-pressed:text-ink aria-pressed:underline"
						>
							{option}×
						</button>
					))}
				</fieldset>
				<button
					type="button"
					onClick={() => {
						started.current = true;
						setPlaying(false);
						clock.current = field.endAt;
						paint(field.endAt);
					}}
					className="cursor-pointer hover:text-ink hover:underline"
				>
					Turn to the end
				</button>
			</figcaption>
		</figure>
	);
}
