import { ORPCError } from "@orpc/client";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { EyeIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";

import { HeaderImageField } from "@/admin/header-image-field";
import type { MediaFile } from "@/admin/header-image-field";
import {
	DeletePostDialog,
	DiscardChangesDialog,
	PostMenu,
} from "@/admin/post-actions";
import { PostPreview } from "@/admin/post-preview";
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
import { Toggle } from "@/components/ui/toggle";
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

// Wide enough for the text and the preview side by side (Tailwind's `xl`).
const SIDE_BY_SIDE = "(min-width: 80rem)";

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

// The saved post already carries its image; one picked since comes from the
// media library.
function resolveHeaderImage(
	id: number | null,
	saved: MediaFile | null | undefined,
	library: MediaFile[] | undefined
): MediaFile | undefined {
	if (id === null) {
		return undefined;
	}
	if (saved?.id === id) {
		return saved;
	}
	return library?.find((file) => file.id === id);
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

type Activity = "saving" | "publishing" | "unpublishing" | undefined;

function currentActivity(
	saving: boolean,
	publishing: boolean,
	unpublishing: boolean
): Activity {
	if (saving) {
		return "saving";
	}
	if (publishing) {
		return "publishing";
	}
	return unpublishing ? "unpublishing" : undefined;
}

function describeStatus(post: EditablePost | undefined): string {
	if (post === undefined) {
		return "New draft";
	}
	return post.status === "published" ? "Published" : "Draft";
}

function describeSaveState(
	post: EditablePost | undefined,
	dirty: boolean,
	activity: Activity
): string {
	if (activity === "saving") {
		return "Saving…";
	}
	if (activity === "publishing") {
		return "Publishing…";
	}
	if (activity === "unpublishing") {
		return "Unpublishing…";
	}
	if (dirty) {
		return post?.status === "published"
			? "Unsaved changes. Saving updates the live post."
			: "Unsaved changes";
	}
	return post === undefined ? "Not saved yet" : "All changes saved";
}

function describeFailure(
	save: Error | null,
	publish: Error | null,
	unpublish: Error | null
): string | undefined {
	if (save !== null) {
		return `The post didn’t save: ${save.message}. Your text is still here; try saving again.`;
	}
	if (publish !== null) {
		return `The post didn’t publish: ${publish.message}.`;
	}
	if (unpublish !== null) {
		return `The post is still live; unpublishing failed: ${unpublish.message}.`;
	}
	return undefined;
}

interface EditorToolbarProps {
	post: EditablePost | undefined;
	status: string;
	saveState: string;
	busy: boolean;
	previewOpen: boolean;
	onPreviewChange: (open: boolean) => void;
	onPublish: () => void;
	onUnpublish: () => void;
	onDelete: () => void;
}

function EditorToolbar({
	post,
	status,
	saveState,
	busy,
	previewOpen,
	onPreviewChange,
	onPublish,
	onUnpublish,
	onDelete,
}: EditorToolbarProps) {
	const isDraft = post?.status === "draft";

	return (
		<header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-4 border-b bg-background px-6">
			<p className="truncate text-xs text-muted-foreground" aria-live="polite">
				<span className="font-medium text-foreground">{status}</span>
				{" · "}
				{saveState}
			</p>
			<div className="flex shrink-0 items-center gap-1.5">
				<Toggle
					size="sm"
					pressed={previewOpen}
					onPressedChange={onPreviewChange}
				>
					<EyeIcon />
					Preview
				</Toggle>
				{post !== undefined && (
					<PostMenu
						liveSlug={post.slug}
						published={post.status === "published"}
						busy={busy}
						onUnpublish={onUnpublish}
						onDelete={onDelete}
					/>
				)}
				<Button
					type="submit"
					size="sm"
					variant={isDraft ? "outline" : "default"}
					disabled={busy}
				>
					Save
				</Button>
				{isDraft && (
					<Button type="button" size="sm" disabled={busy} onClick={onPublish}>
						Publish
					</Button>
				)}
			</div>
		</header>
	);
}

interface PostFieldsProps {
	draft: DraftFields;
	headerImage: MediaFile | undefined;
	titleError: string | undefined;
	slugError: string | undefined;
	titleRef: React.RefObject<HTMLTextAreaElement | null>;
	slugRef: React.RefObject<HTMLInputElement | null>;
	onTitleChange: (title: string) => void;
	onSlugChange: (slug: string) => void;
	onChange: (key: "summary" | "body", value: string) => void;
	onHeaderImageChange: (id: number | null) => void;
	onCaptionChange: (caption: string | null) => void;
}

function PostFields({
	draft,
	headerImage,
	titleError,
	slugError,
	titleRef,
	slugRef,
	onTitleChange,
	onSlugChange,
	onChange,
	onHeaderImageChange,
	onCaptionChange,
}: PostFieldsProps) {
	const ids = useId();

	return (
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
						onTitleChange(event.target.value);
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
								onSlugChange(event.target.value);
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
							onChange("summary", event.target.value);
						}}
					/>
					<FieldDescription>
						Shown in the blog list and in link previews.
					</FieldDescription>
				</Field>
				<HeaderImageField
					imageId={draft.headerImageId}
					image={headerImage}
					caption={draft.headerImageCaption}
					onImageChange={onHeaderImageChange}
					onCaptionChange={onCaptionChange}
				/>
				<Field>
					<FieldLabel htmlFor={`${ids}-body`}>Body</FieldLabel>
					<Textarea
						id={`${ids}-body`}
						value={draft.body}
						onChange={(event) => {
							onChange("body", event.target.value);
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
	);
}

// With no `post`, this writes a new draft and moves to its edit URL once saved.
export function PostEditor({ post }: { post?: EditablePost }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const formRef = useRef<HTMLFormElement>(null);
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const slugRef = useRef<HTMLInputElement>(null);

	const [baseline, setBaseline] = useState(() =>
		post === undefined ? EMPTY_DRAFT : toDraft(post)
	);
	const [draft, setDraft] = useState(baseline);
	// A new post's slug follows its title until the slug is edited by hand.
	const [slugEdited, setSlugEdited] = useState(post !== undefined);
	const [showErrors, setShowErrors] = useState(false);
	// Open by default only where it fits beside the text; on narrower screens
	// it replaces the text instead.
	const [previewOpen, setPreviewOpen] = useState(
		() => window.matchMedia(SIDE_BY_SIDE).matches
	);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const dirty = !sameDraft(draft, baseline);
	const errors = validate(draft);
	const media = useQuery(adminOrpc.media.list.queryOptions());
	const headerImage = resolveHeaderImage(
		draft.headerImageId,
		post?.headerImage,
		media.data
	);

	async function refreshPosts() {
		await queryClient.invalidateQueries({ queryKey: adminOrpc.posts.key() });
	}

	const save = useMutation(
		adminOrpc.posts.save.mutationOptions({
			onSuccess: async (saved) => {
				setBaseline(toDraft(saved));
				setShowErrors(false);
				await refreshPosts();
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
	const publish = useMutation(
		adminOrpc.posts.publish.mutationOptions({ onSuccess: refreshPosts })
	);
	const unpublish = useMutation(
		adminOrpc.posts.unpublish.mutationOptions({ onSuccess: refreshPosts })
	);
	const remove = useMutation(
		adminOrpc.posts.delete.mutationOptions({
			onSuccess: async ({ id }) => {
				// Leave first: refetching the open post now would find it gone.
				await navigate({ to: "/admin", ignoreBlocker: true });
				queryClient.removeQueries({
					queryKey: adminOrpc.posts.byId.key({ input: { id } }),
				});
				await refreshPosts();
			},
		})
	);

	const activity = currentActivity(
		save.isPending,
		publish.isPending,
		unpublish.isPending
	);
	const busy = activity !== undefined || remove.isPending;

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
	const failure = describeFailure(
		slugTaken ? null : save.error,
		publish.error,
		unpublish.error
	);

	function handleTitle(typed: string) {
		const title = typed.replace(LINE_BREAKS, " ");
		setDraft((current) => ({
			...current,
			title,
			slug: slugEdited ? current.slug : slugify(title),
		}));
	}

	// Points at the first problem instead of sending a draft the server rejects.
	function checkDraft(): boolean {
		if (errors.title === undefined && errors.slug === undefined) {
			return true;
		}
		setShowErrors(true);
		(errors.title === undefined ? slugRef : titleRef).current?.focus();
		return false;
	}

	function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (checkDraft()) {
			save.mutate(post === undefined ? draft : { ...draft, id: post.id });
		}
	}

	// Publishing unsaved text would publish the old version, so save first.
	async function handlePublish(id: number) {
		if (!checkDraft()) {
			return;
		}
		if (dirty) {
			try {
				await save.mutateAsync({ ...draft, id });
			} catch {
				// A failed save already reports itself through `save.error`.
				return;
			}
		}
		publish.mutate({ id });
	}

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			noValidate
			className="flex min-h-dvh flex-col"
		>
			<EditorToolbar
				post={post}
				status={describeStatus(post)}
				saveState={describeSaveState(post, dirty, activity)}
				busy={busy}
				previewOpen={previewOpen}
				onPreviewChange={setPreviewOpen}
				onPublish={() => {
					if (post !== undefined) {
						void handlePublish(post.id);
					}
				}}
				onUnpublish={() => {
					if (post !== undefined) {
						unpublish.mutate({ id: post.id });
					}
				}}
				onDelete={() => {
					remove.reset();
					setConfirmingDelete(true);
				}}
			/>
			{failure !== undefined && (
				<p
					role="alert"
					className="border-b bg-destructive/10 px-6 py-2 text-xs text-destructive"
				>
					{failure}
				</p>
			)}
			<div className="flex-1 xl:grid xl:grid-cols-2">
				<div
					className={
						previewOpen ? "min-w-0 max-xl:hidden" : "min-w-0 xl:col-span-2"
					}
				>
					<PostFields
						draft={draft}
						headerImage={headerImage}
						titleError={titleError}
						slugError={slugError}
						titleRef={titleRef}
						slugRef={slugRef}
						onTitleChange={handleTitle}
						onSlugChange={(slug) => {
							setSlugEdited(true);
							setDraft((current) => ({ ...current, slug }));
						}}
						onChange={(key, value) => {
							setDraft((current) => ({ ...current, [key]: value }));
						}}
						onHeaderImageChange={(headerImageId) => {
							setDraft((current) => ({ ...current, headerImageId }));
						}}
						onCaptionChange={(headerImageCaption) => {
							setDraft((current) => ({ ...current, headerImageCaption }));
						}}
					/>
				</div>
				{previewOpen && (
					<section
						aria-label="Preview"
						className="min-w-0 px-6 py-8 xl:sticky xl:top-12 xl:h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:border-l"
					>
						<PostPreview
							title={draft.title}
							body={draft.body}
							publishedAt={post?.publishedAt ?? null}
							headerImage={headerImage ?? null}
							headerImageCaption={draft.headerImageCaption}
						/>
					</section>
				)}
			</div>
			{post !== undefined && (
				<DeletePostDialog
					open={confirmingDelete}
					onOpenChange={setConfirmingDelete}
					title={post.title}
					published={post.status === "published"}
					hasHeaderImage={post.headerImageId !== null}
					pending={remove.isPending}
					error={remove.error?.message}
					onConfirm={() => {
						remove.mutate({ id: post.id });
					}}
				/>
			)}
			<DiscardChangesDialog
				open={blocker.status === "blocked"}
				onKeep={() => {
					blocker.reset?.();
				}}
				onDiscard={() => {
					blocker.proceed?.();
				}}
			/>
		</form>
	);
}
