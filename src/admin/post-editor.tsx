import { ORPCError } from "@orpc/client";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { SLUG, slugify } from "@/posts/slug";
import { adminOrpc } from "@/rpc/admin-client";
import type { adminRouter } from "@/rpc/admin-router";

type SaveInput = InferRouterInputs<typeof adminRouter>["posts"]["save"];
type EditablePost = InferRouterOutputs<typeof adminRouter>["posts"]["byId"];
type DraftFields = Omit<SaveInput, "id">;

const DRAFT_KEYS = [
	"slug",
	"title",
	"summary",
	"body",
	"headerImageId",
	"headerImageCaption",
] as const satisfies readonly (keyof DraftFields)[];

const LINE_BREAKS = /\r?\n/gu;

const EMPTY_DRAFT: DraftFields = {
	slug: "",
	title: "",
	summary: "",
	body: "",
	headerImageId: null,
	headerImageCaption: null,
};

function toDraft(post: DraftFields): DraftFields {
	const { slug, title, summary, body, headerImageId, headerImageCaption } =
		post;
	return { slug, title, summary, body, headerImageId, headerImageCaption };
}

function sameDraft(a: DraftFields, b: DraftFields): boolean {
	return DRAFT_KEYS.every((key) => a[key] === b[key]);
}

function slugProblem(slug: string): string | undefined {
	if (slug === "") {
		return "Add a slug. It becomes the post’s URL.";
	}
	if (!SLUG.test(slug)) {
		return "Use lowercase letters, numbers and single hyphens, like my-first-post.";
	}
	return undefined;
}

// The same rules the server enforces, checked here so mistakes show up
// beside the field instead of as a failed save.
function validate(draft: DraftFields) {
	return {
		title: draft.title.trim() === "" ? "Give the post a title." : undefined,
		slug: slugProblem(draft.slug),
	};
}

function useSaveShortcut(form: React.RefObject<HTMLFormElement | null>) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key === "s") {
				event.preventDefault();
				form.current?.requestSubmit();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [form]);
}

// With no `post`, this writes a new draft and moves to its edit URL once saved.
export function PostEditor({ post }: { post?: EditablePost }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const formRef = useRef<HTMLFormElement>(null);
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const slugRef = useRef<HTMLInputElement>(null);
	const ids = useId();

	const [baseline, setBaseline] = useState(() =>
		post === undefined ? EMPTY_DRAFT : toDraft(post)
	);
	const [draft, setDraft] = useState(baseline);
	// A new post's slug follows its title until the slug is edited by hand.
	const [slugEdited, setSlugEdited] = useState(post !== undefined);
	const [showErrors, setShowErrors] = useState(false);

	const dirty = !sameDraft(draft, baseline);
	const errors = validate(draft);

	const save = useMutation(
		adminOrpc.posts.save.mutationOptions({
			onSuccess: async (saved) => {
				setBaseline(toDraft(saved));
				setShowErrors(false);
				await queryClient.invalidateQueries({
					queryKey: adminOrpc.posts.key(),
				});
				if (post === undefined) {
					// The blocker still sees the pre-save state here, so skip it.
					await navigate({
						to: "/admin/posts/$id",
						params: { id: saved.id },
						replace: true,
						ignoreBlocker: true,
					});
				}
			},
		})
	);

	const blocker = useBlocker({
		shouldBlockFn: () => dirty,
		enableBeforeUnload: dirty,
		withResolver: true,
	});

	useSaveShortcut(formRef);

	const slugTaken =
		save.error instanceof ORPCError &&
		save.error.code === "CONFLICT" &&
		save.variables?.slug === draft.slug;
	const titleError = showErrors ? errors.title : undefined;
	let slugError = showErrors ? errors.slug : undefined;
	if (slugTaken) {
		slugError = "Another post already uses this slug.";
	}
	const saveFailed = save.isError && !slugTaken;

	function update<K extends keyof DraftFields>(key: K, value: DraftFields[K]) {
		setDraft((current) => ({ ...current, [key]: value }));
	}

	function handleTitle(typed: string) {
		const title = typed.replace(LINE_BREAKS, " ");
		setDraft((current) => ({
			...current,
			title,
			slug: slugEdited ? current.slug : slugify(title),
		}));
	}

	function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (errors.title !== undefined || errors.slug !== undefined) {
			setShowErrors(true);
			(errors.title === undefined ? slugRef : titleRef).current?.focus();
			return;
		}
		save.mutate(post === undefined ? draft : { ...draft, id: post.id });
	}

	let status = "New draft";
	if (post !== undefined) {
		status = post.status === "published" ? "Published" : "Draft";
	}
	let saveState = "Not saved yet";
	if (save.isPending) {
		saveState = "Saving…";
	} else if (dirty && post?.status === "published") {
		saveState = "Unsaved changes. Saving updates the live post.";
	} else if (dirty) {
		saveState = "Unsaved changes";
	} else if (post !== undefined) {
		saveState = "All changes saved";
	}

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			noValidate
			className="flex min-h-dvh flex-col"
		>
			<header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-4 border-b bg-background px-6">
				<p
					className="truncate text-xs text-muted-foreground"
					aria-live="polite"
				>
					<span className="font-medium text-foreground">{status}</span>
					{" · "}
					{saveState}
				</p>
				<Button type="submit" size="sm" disabled={save.isPending}>
					Save
				</Button>
			</header>
			{saveFailed && (
				<p
					role="alert"
					className="border-b bg-destructive/10 px-6 py-2 text-xs text-destructive"
				>
					The post didn’t save: {save.error.message}. Your text is still here;
					try saving again.
				</p>
			)}
			<div className="w-full max-w-3xl space-y-8 px-6 py-8">
				<div>
					<textarea
						ref={titleRef}
						aria-label="Title"
						aria-invalid={titleError !== undefined}
						aria-describedby={
							titleError === undefined ? undefined : `${ids}-title-error`
						}
						placeholder="Untitled"
						rows={1}
						value={draft.title}
						onChange={(event) => {
							handleTitle(event.target.value);
						}}
						onKeyDown={(event) => {
							// A title is one line; Enter shouldn't start a second.
							if (event.key === "Enter") {
								event.preventDefault();
							}
						}}
						className="field-sizing-content w-full resize-none overflow-hidden bg-transparent text-3xl font-bold text-balance outline-none placeholder:text-muted-foreground/60"
					/>
					{titleError !== undefined && (
						<p
							id={`${ids}-title-error`}
							className="mt-1 text-xs text-destructive"
						>
							{titleError}
						</p>
					)}
				</div>
				<FieldGroup>
					<Field data-invalid={slugError !== undefined}>
						<FieldLabel htmlFor={`${ids}-slug`}>Slug</FieldLabel>
						<InputGroup>
							<InputGroupAddon>
								<InputGroupText>/blog/</InputGroupText>
							</InputGroupAddon>
							<InputGroupInput
								ref={slugRef}
								id={`${ids}-slug`}
								aria-invalid={slugError !== undefined}
								value={draft.slug}
								onChange={(event) => {
									setSlugEdited(true);
									update("slug", event.target.value);
								}}
								spellCheck={false}
								autoCapitalize="off"
							/>
						</InputGroup>
						<FieldError>{slugError}</FieldError>
					</Field>
					<Field>
						<FieldLabel htmlFor={`${ids}-summary`}>Summary</FieldLabel>
						<Textarea
							id={`${ids}-summary`}
							rows={2}
							value={draft.summary}
							onChange={(event) => {
								update("summary", event.target.value);
							}}
						/>
						<FieldDescription>
							Shown in the blog list and in link previews.
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor={`${ids}-body`}>Body</FieldLabel>
						<Textarea
							id={`${ids}-body`}
							value={draft.body}
							onChange={(event) => {
								update("body", event.target.value);
							}}
							variant="writing"
							className="min-h-[60dvh]"
						/>
						<FieldDescription>
							Markdown. Each ## and ### heading becomes an entry in the table of
							contents.
						</FieldDescription>
					</Field>
				</FieldGroup>
			</div>
			<AlertDialog
				open={blocker.status === "blocked"}
				onOpenChange={(open) => {
					if (!open) {
						blocker.reset?.();
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
						<AlertDialogDescription>
							Leaving now throws away everything you’ve changed since the last
							save.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								blocker.proceed?.();
							}}
						>
							Discard changes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</form>
	);
}
