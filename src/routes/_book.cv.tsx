import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LinkOut } from "@/components/link-out";
import { CV_EDUCATION, CV_EXPERIENCE } from "@/cv/cv";
import type { Employer, Role } from "@/cv/cv";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = `CV | ${SITE_NAME}`;
const DESCRIPTION =
	"Oscar Gabriel’s curriculum vitae: experience in operations, analysis and tooling, from a trading card warehouse to a coffee roastery’s packaging line, and education.";

const monthFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	timeZone: "UTC",
});

export const Route = createFileRoute("/_book/cv")({
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/cv` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/cv` }],
	}),
	component: CvPage,
});

function Month({ value }: { value: string }) {
	return (
		<time dateTime={value}>
			{monthFormat.format(new Date(`${value}-01T00:00:00Z`))}
		</time>
	);
}

// A title, a dotted leader, and its dates: the contents-page line.
function EntryLine({
	children,
	start,
	end,
}: {
	children: ReactNode;
	start?: string;
	end: string;
}) {
	return (
		<div className="md:flex md:items-baseline md:gap-3">
			{children}
			<span
				aria-hidden="true"
				className="mb-1 hidden min-w-6 flex-1 border-b border-dotted border-ink-faint md:block"
			/>
			<span className="mt-1 block shrink-0 text-xs smallcaps whitespace-nowrap text-ink-soft md:mt-0 md:inline">
				{start !== undefined && (
					<>
						<Month value={start} /> –{" "}
					</>
				)}
				<Month value={end} />
			</span>
		</div>
	);
}

function RoleEntry({ role }: { role: Role }) {
	return (
		<div className="mt-5">
			<EntryLine start={role.start} end={role.end}>
				<h4 className="text-lg text-ink italic">{role.title}</h4>
			</EntryLine>
			{role.place !== undefined && (
				<p className="text-sm text-ink-soft italic">{role.place}</p>
			)}
			{role.summary !== undefined && (
				<p className="mt-2 justified text-sm leading-relaxed text-ink-soft">
					{role.summary}
				</p>
			)}
		</div>
	);
}

// One employer: its name heads the entry and each role gets its own dated
// line beneath, however many there are.
function EmployerEntry({ employer }: { employer: Employer }) {
	return (
		<li className="border-t border-rule py-6">
			<h3 className="text-xl font-medium text-ink">{employer.name}</h3>
			{employer.place !== undefined && (
				<p className="text-sm text-ink-soft italic">{employer.place}</p>
			)}
			{employer.roles.map((role) => (
				<RoleEntry key={role.title} role={role} />
			))}
		</li>
	);
}

function Section({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section aria-labelledby={id} className="mt-14 first-of-type:mt-0">
			<h2 id={id} className="mb-4 text-2xl font-medium text-ink">
				{title}
			</h2>
			{children}
		</section>
	);
}

function CvPage() {
	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<div className="max-w-prose">
				<h1 className="sr-only">Curriculum Vitae</h1>
				<Section id="experience" title="Experience">
					<ol>
						{CV_EXPERIENCE.map((employer) => (
							<EmployerEntry key={employer.name} employer={employer} />
						))}
					</ol>
				</Section>

				<Section id="education" title="Education">
					<ol>
						{CV_EDUCATION.map((school) => (
							<li key={school.name} className="border-t border-rule py-6">
								<EntryLine start={school.start} end={school.end}>
									<h3 className="text-xl font-medium text-ink">
										{school.name}
									</h3>
								</EntryLine>
								{school.credential !== undefined && (
									<p className="text-ink italic">
										{school.href === undefined ? (
											school.credential
										) : (
											<LinkOut
												href={school.href}
												className="underline decoration-ink-faint hover:decoration-ink"
											>
												{school.credential}
											</LinkOut>
										)}
									</p>
								)}
								{school.detail !== undefined && (
									<p className="mt-1 justified text-sm leading-relaxed text-ink-soft">
										{school.detail}
									</p>
								)}
							</li>
						))}
					</ol>
				</Section>
			</div>
		</main>
	);
}
