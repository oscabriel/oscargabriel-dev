import {
	ArrowSquareOutIcon,
	DotsThreeIcon,
	EyeSlashIcon,
	TrashIcon,
} from "@phosphor-icons/react";

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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostMenuProps {
	liveSlug: string;
	published: boolean;
	busy: boolean;
	onUnpublish: () => void;
	onDelete: () => void;
}

// Actions that change a saved post's standing, kept out of the toolbar
// because they're rarer than saving and harder to undo.
export function PostMenu({
	liveSlug,
	published,
	busy,
	onUnpublish,
	onDelete,
}: PostMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon-sm" aria-label="More actions" />
				}
			>
				<DotsThreeIcon weight="bold" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				{published && (
					<>
						<DropdownMenuItem
							onClick={() => {
								window.open(`/blog/${liveSlug}`, "_blank", "noopener");
							}}
						>
							<ArrowSquareOutIcon />
							View on the blog
						</DropdownMenuItem>
						<DropdownMenuItem disabled={busy} onClick={onUnpublish}>
							<EyeSlashIcon />
							Unpublish
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem variant="destructive" onClick={onDelete}>
					<TrashIcon />
					Delete post…
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

interface DeletePostDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	published: boolean;
	hasHeaderImage: boolean;
	pending: boolean;
	error: string | undefined;
	onConfirm: () => void;
}

export function DeletePostDialog({
	open,
	onOpenChange,
	title,
	published,
	hasHeaderImage,
	pending,
	error,
	onConfirm,
}: DeletePostDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
					<AlertDialogDescription>
						{published && "It comes off the blog right away. "}
						This can’t be undone.
						{hasHeaderImage &&
							" Its header image stays available for other posts."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error !== undefined && (
					<p role="alert" className="text-xs text-destructive">
						The post wasn’t deleted: {error}
					</p>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel>Keep post</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={pending}
						onClick={onConfirm}
					>
						{pending ? "Deleting…" : "Delete post"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

interface DiscardChangesDialogProps {
	open: boolean;
	onKeep: () => void;
	onDiscard: () => void;
}

export function DiscardChangesDialog({
	open,
	onKeep,
	onDiscard,
}: DiscardChangesDialogProps) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onKeep();
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
					<AlertDialogAction variant="destructive" onClick={onDiscard}>
						Discard changes
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
