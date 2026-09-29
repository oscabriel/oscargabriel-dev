import { ORPCError } from "@orpc/client";
import type { InferRouterOutputs } from "@orpc/server";
import { ImageIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaPath } from "@/lib/site";
import { ACCEPTED_IMAGE_TYPES, MAX_BODY_BYTES } from "@/media/limits";
import { adminOrpc } from "@/rpc/admin-client";
import type { adminRouter } from "@/rpc/admin-router";

export type MediaFile = InferRouterOutputs<
	typeof adminRouter
>["media"]["list"][number];

const TOO_LARGE = "Images must be under 5 MB.";
const LIBRARY_PLACEHOLDERS = ["a", "b", "c"];

function uploadProblem(error: Error): string {
	if (error instanceof ORPCError && error.code === "UNSUPPORTED_MEDIA_TYPE") {
		return "That file isn’t a PNG, JPEG, GIF, WebP or AVIF image.";
	}
	if (error instanceof ORPCError && error.code === "PAYLOAD_TOO_LARGE") {
		return TOO_LARGE;
	}
	return `The upload failed: ${error.message}`;
}

// A local URL for the chosen file, so its alt text is written while looking
// at it. Released when the file changes or the form closes.
function useObjectUrl(file: File | undefined): string | undefined {
	const url = useMemo(
		() => (file === undefined ? undefined : URL.createObjectURL(file)),
		[file]
	);
	useEffect(
		() => () => {
			if (url !== undefined) {
				URL.revokeObjectURL(url);
			}
		},
		[url]
	);
	return url;
}

function ImageUpload({
	onUploaded,
}: {
	onUploaded: (file: MediaFile) => void;
}) {
	const ids = useId();
	const queryClient = useQueryClient();
	const [file, setFile] = useState<File>();
	const [alt, setAlt] = useState("");
	const [problem, setProblem] = useState<string>();
	const previewUrl = useObjectUrl(file);

	const upload = useMutation(
		adminOrpc.media.upload.mutationOptions({
			onSuccess: async (uploaded) => {
				// Put it in the library now so the preview can show it right away.
				queryClient.setQueryData(adminOrpc.media.list.queryKey(), (current) => [
					uploaded,
					...(current ?? []).filter((media) => media.id !== uploaded.id),
				]);
				onUploaded(uploaded);
				await queryClient.invalidateQueries({
					queryKey: adminOrpc.media.list.key(),
				});
			},
			onError: (error) => {
				setProblem(uploadProblem(error));
			},
		})
	);

	// Checked here first so an oversized file fails before it's sent.
	function start() {
		if (file === undefined) {
			setProblem("Choose an image file first.");
			return;
		}
		if (file.size > MAX_BODY_BYTES) {
			setProblem(TOO_LARGE);
			return;
		}
		if (alt.trim() === "") {
			setProblem("Add alt text describing the image.");
			return;
		}
		setProblem(undefined);
		upload.mutate({ file, alt: alt.trim() });
	}

	return (
		<div className="space-y-3">
			<p className="text-xs font-medium">Upload a new image</p>
			<div className="flex gap-3">
				{previewUrl !== undefined && (
					<img
						src={previewUrl}
						alt=""
						className="aspect-video w-32 shrink-0 object-cover"
					/>
				)}
				<div className="min-w-0 flex-1 space-y-3">
					<Field>
						<FieldLabel htmlFor={`${ids}-file`}>Image file</FieldLabel>
						<Input
							id={`${ids}-file`}
							type="file"
							accept={ACCEPTED_IMAGE_TYPES}
							onChange={(event) => {
								setFile(event.target.files?.item(0) ?? undefined);
								setProblem(undefined);
							}}
						/>
						<FieldDescription>
							PNG, JPEG, GIF, WebP or AVIF, under 5 MB.
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor={`${ids}-alt`}>Alt text</FieldLabel>
						<Input
							id={`${ids}-alt`}
							value={alt}
							onChange={(event) => {
								setAlt(event.target.value);
							}}
							onKeyDown={(event) => {
								// Enter here means upload, not save the whole post.
								if (event.key === "Enter") {
									event.preventDefault();
									start();
								}
							}}
						/>
						<FieldDescription>
							What the image shows, for people who can’t see it.
						</FieldDescription>
					</Field>
				</div>
			</div>
			{problem !== undefined && (
				<p role="alert" className="text-xs text-destructive">
					{problem}
				</p>
			)}
			<Button
				type="button"
				size="sm"
				disabled={upload.isPending}
				onClick={start}
			>
				<UploadSimpleIcon />
				{upload.isPending ? "Uploading…" : "Upload and use"}
			</Button>
		</div>
	);
}

interface MediaLibraryProps {
	selectedId: number | null;
	onSelect: (file: MediaFile) => void;
}

function MediaLibrary({ selectedId, onSelect }: MediaLibraryProps) {
	const media = useQuery(adminOrpc.media.list.queryOptions());

	if (media.isPending) {
		return (
			<div className="grid grid-cols-3 gap-2">
				{LIBRARY_PLACEHOLDERS.map((placeholder) => (
					<Skeleton key={placeholder} className="aspect-video" />
				))}
			</div>
		);
	}
	if (media.isError) {
		return (
			<p role="alert" className="text-xs text-destructive">
				Your images didn’t load: {media.error.message}
			</p>
		);
	}
	if (media.data.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				Nothing uploaded yet. Images you upload show up here to reuse.
			</p>
		);
	}

	return (
		<ul className="grid grid-cols-3 gap-2">
			{media.data.map((file) => (
				<li key={file.id}>
					<button
						type="button"
						aria-pressed={file.id === selectedId}
						onClick={() => {
							onSelect(file);
						}}
						className="block w-full ring-offset-2 ring-offset-background outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-foreground"
					>
						<img
							src={mediaPath(file.key)}
							alt={file.alt ?? file.key}
							loading="lazy"
							className="aspect-video w-full object-cover"
						/>
					</button>
				</li>
			))}
		</ul>
	);
}

interface ImagePickerProps {
	selectedId: number | null;
	onChoose: (file: MediaFile) => void;
	onClose: () => void;
}

function ImagePicker({ selectedId, onChoose, onClose }: ImagePickerProps) {
	return (
		<div className="space-y-6 border p-4">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium">Choose a header image</p>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Close"
					onClick={onClose}
				>
					<XIcon />
				</Button>
			</div>
			<ImageUpload onUploaded={onChoose} />
			<div className="space-y-3">
				<p className="text-xs font-medium">Or reuse one you’ve uploaded</p>
				<MediaLibrary selectedId={selectedId} onSelect={onChoose} />
			</div>
		</div>
	);
}

interface HeaderImageFieldProps {
	imageId: number | null;
	image: MediaFile | undefined;
	caption: string | null;
	onImageChange: (id: number | null) => void;
	onCaptionChange: (caption: string | null) => void;
}

export function HeaderImageField({
	imageId,
	image,
	caption,
	onImageChange,
	onCaptionChange,
}: HeaderImageFieldProps) {
	const ids = useId();
	const [choosing, setChoosing] = useState(false);

	function choose(file: MediaFile) {
		onImageChange(file.id);
		setChoosing(false);
	}

	return (
		<FieldSet>
			<FieldLegend variant="label">Header image</FieldLegend>
			{imageId !== null && (
				<div className="space-y-3">
					{image === undefined ? (
						<Skeleton className="aspect-video w-full max-w-sm" />
					) : (
						<img
							src={mediaPath(image.key)}
							alt={image.alt ?? ""}
							className="aspect-video w-full max-w-sm object-cover"
						/>
					)}
					{image?.alt !== undefined && image.alt !== null && (
						<p className="max-w-sm text-xs text-muted-foreground">
							Alt text: {image.alt}
						</p>
					)}
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							aria-expanded={choosing}
							onClick={() => {
								setChoosing(!choosing);
							}}
						>
							Change image
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								onImageChange(null);
								onCaptionChange(null);
								setChoosing(false);
							}}
						>
							Remove
						</Button>
					</div>
					<Field>
						<FieldLabel htmlFor={`${ids}-caption`}>Caption</FieldLabel>
						<Input
							id={`${ids}-caption`}
							value={caption ?? ""}
							onChange={(event) => {
								const typed = event.target.value;
								onCaptionChange(typed === "" ? null : typed);
							}}
						/>
						<FieldDescription>
							Optional. Shown in italics under the image.
						</FieldDescription>
					</Field>
				</div>
			)}
			{imageId === null && !choosing && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="self-start"
					onClick={() => {
						setChoosing(true);
					}}
				>
					<ImageIcon />
					Add a header image
				</Button>
			)}
			{choosing && (
				<ImagePicker
					selectedId={imageId}
					onChoose={choose}
					onClose={() => {
						setChoosing(false);
					}}
				/>
			)}
		</FieldSet>
	);
}
