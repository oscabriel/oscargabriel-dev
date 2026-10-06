import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

// Clef is Cloudflare's decision model (@cf/cloudflare/clef): it reads a state
// and, for each typed question, answers with probabilities. It never writes
// text, so nothing it says can end up in the book.

export const CLEF_MODEL = "@cf/cloudflare/clef";

export interface NoulQuestion {
	readonly type: "noul";
	readonly instructions: string;
	readonly criteria?: { readonly true: string; readonly false: string };
}

export interface ChoiceQuestion {
	readonly type: "choice";
	readonly instructions: string;
	readonly criteria: Readonly<Record<string, string>>;
}

export interface ScoreQuestion {
	readonly type: "score";
	readonly instructions: string;
	// Lowest first; the answer's score is a probability-weighted index into it.
	readonly criteria: readonly string[];
}

export type ClefQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface ClefRequest {
	readonly model: "clef" | "clef-flash";
	readonly state: unknown;
	readonly questions: Readonly<Record<string, ClefQuestion>>;
	// Base64 data URLs: Clef takes no remote images.
	readonly images?: readonly string[];
}

const Probabilities = Schema.Record(Schema.String, Schema.Finite);

const NoulAnswer = Schema.Struct({
	type: Schema.Literal("noul"),
	noul: Schema.Finite,
});

const ChoiceAnswer = Schema.Struct({
	type: Schema.Literal("choice"),
	choice: Schema.String,
	probabilities: Probabilities,
	confidence: Schema.Finite,
});

const ScoreAnswer = Schema.Struct({
	type: Schema.Literal("score"),
	score: Schema.Finite,
	probabilities: Probabilities,
	confidence: Schema.Finite,
});

export const ClefAnswer = Schema.Union([NoulAnswer, ChoiceAnswer, ScoreAnswer]);

export const ClefResponse = Schema.Struct({
	model: Schema.String,
	answers: Schema.Record(Schema.String, ClefAnswer),
	usage: Schema.Struct({
		input_tokens: Schema.Int,
		output_tokens: Schema.Int,
	}),
});

export class ClefError extends Schema.TaggedError<ClefError>()("ClefError", {
	cause: Schema.Defect(),
}) {}

// How a call reaches Clef: the Worker's AI binding on the site, the REST API
// from the script. Both send the same request and decode the same answer.
export class Clef extends Context.Service<
	Clef,
	{
		readonly decide: (
			request: ClefRequest
		) => Effect.Effect<typeof ClefResponse.Type, ClefError>;
	}
>()("arms/Clef") {}
