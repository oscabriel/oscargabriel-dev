import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
	CV_EDUCATION,
	CV_EXPERIENCE,
	CV_LINKS,
	CV_PLACE,
	CV_PROJECTS,
	CV_SKILLS,
	CV_SUMMARY,
} from "@/cv/cv";
import type { Employer, Role } from "@/cv/cv";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = `CV | ${SITE_NAME}`;
const DESCRIPTION =
	"Oscar Gabriel’s curriculum vitae: operations, analysis and software, from a coffee roastery’s packaging line to multi-provider LLM tools.";

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

function RoleEntry({ role, nested }: { role: Role; nested: boolean }) {
	return (
		<div className={nested ? "mt-5" : "mt-1"}>
			{nested && (
				<EntryLine start={role.start} end={role.end}>
					<h4 className="text-lg text-ink italic">{role.title}</h4>
				</EntryLine>
			)}
			{role.place !== undefined && (
				<p className="text-sm text-ink-soft italic">{role.place}</p>
			)}
			{role.note !== undefined && (
				<p className="mt-2 text-ink-soft italic">{role.note}</p>
			)}
			{role.points.length > 0 && (
				<ul className="pilcrows mt-3">
					{role.points.map((point) => (
						<li key={point}>{point}</li>
					))}
				</ul>
			)}
		</div>
	);
}

// One employer. With a single role the role names the line; with several,
// the employer does and each role gets its own dated line beneath.
function EmployerEntry({ employer }: { employer: Employer }) {
	const { roles } = employer;
	const [only] = roles;
	const single = roles.length === 1 && only !== undefined;

	return (
		<li className="border-t border-rule py-6">
			{single ? (
				<EntryLine start={only.start} end={only.end}>
					<h3 className="text-xl font-medium text-ink">
						{only.title}, <span className="font-normal">{employer.name}</span>
					</h3>
				</EntryLine>
			) : (
				<h3 className="text-xl font-medium text-ink">{employer.name}</h3>
			)}
			{employer.place !== undefined && (
				<p className="text-sm text-ink-soft italic">{employer.place}</p>
			)}
			{roles.map((role) => (
				<RoleEntry key={role.title} role={role} nested={!single} />
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
		<section aria-labelledby={id} className="mt-14">
			<h2 id={id} className="mb-4 text-2xl font-medium text-ink">
				{title}
			</h2>
			{children}
		</section>
	);
}

function CvPage() {
	return (
		<main className="px-6 py-10 md:px-12 md:py-16">
			<div className="max-w-prose">
				<h1 className="text-4xl leading-tight font-medium tracking-tight text-ink">
					Curriculum Vitae
				</h1>
				<p className="mt-4 flex flex-wrap gap-x-5 text-xs smallcaps text-ink-soft">
					<span>{CV_PLACE}</span>
					{CV_LINKS.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className="underline decoration-ink-faint hover:text-ink"
						>
							{link.label}
						</a>
					))}
				</p>
				<p className="mt-6 text-lg leading-relaxed text-ink-soft">
					{CV_SUMMARY}
				</p>

				<Section id="experience" title="Experience">
					<ol>
						{CV_EXPERIENCE.map((employer) => (
							<EmployerEntry key={employer.name} employer={employer} />
						))}
					</ol>
				</Section>

				<Section id="projects" title="Selected projects">
					<ol>
						{CV_PROJECTS.map((project) => (
							<li key={project.name} className="border-t border-rule py-6">
								<h3 className="text-xl font-medium text-ink">{project.name}</h3>
								<p className="mt-2 leading-relaxed text-ink-soft">
									{project.description}
								</p>
								<p className="mt-2 flex gap-5 text-xs smallcaps text-ink-soft">
									{project.links.map((link) => (
										<a
											key={link.label}
											href={link.href}
											className="underline decoration-ink-faint hover:text-ink"
										>
											{link.label}
										</a>
									))}
								</p>
							</li>
						))}
					</ol>
					<p className="border-t border-rule pt-6">
						<Link
							to="/projects"
							className="text-ink underline decoration-ink-faint hover:decoration-ink"
						>
							Everything else I’ve built →
						</Link>
					</p>
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
											<a
												href={school.href}
												className="underline decoration-ink-faint hover:decoration-ink"
											>
												{school.credential}
											</a>
										)}
									</p>
								)}
								{school.detail !== undefined && (
									<p className="mt-1 text-ink-soft">{school.detail}</p>
								)}
							</li>
						))}
					</ol>
				</Section>

				<Section id="skills" title="Skills">
					<dl className="border-t border-rule">
						{CV_SKILLS.map((skill) => (
							<div
								key={skill.label}
								className="border-b border-rule py-4 md:grid md:grid-cols-[9rem_1fr] md:items-baseline md:gap-6"
							>
								<dt className="text-xs smallcaps text-ink-soft">
									{skill.label}
								</dt>
								<dd className="mt-1 md:mt-0">{skill.text}</dd>
							</div>
						))}
					</dl>
				</Section>
			</div>
		</main>
	);
}
