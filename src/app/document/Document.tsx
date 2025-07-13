import styles from "./styles.css?url";

export const Document: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;700&display=swap"
					rel="stylesheet"
				/>
				<script src="/theme-script.js" />
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<link rel="modulepreload" href="/src/client.tsx" />
				<link rel="stylesheet" href={styles} />
				<script>import("/src/client.tsx")</script>
			</head>
			<body>
				<div id="root">{children}</div>
			</body>
		</html>
	);
};
