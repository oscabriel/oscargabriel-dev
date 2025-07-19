import alchemy from "alchemy";
import { CustomDomain, Website } from "alchemy/cloudflare";

const APP_NAME = "oscargabriel-dev";

const app = await alchemy(APP_NAME, {
  phase: process.argv.includes("destroy") ? "destroy" : "up",
  stage: process.env.ALCHEMY_STAGE || "dev",
  quiet: process.argv.includes("--quiet"),
  password: process.env.SECRET_ALCHEMY_PASSPHRASE,
});

export const site = await Website("site", {
  name: `${APP_NAME}`,
  command: "bun run build",
  main: "dist/worker/worker.js",
  assets: "dist/client",
  wrangler: {
    main: "src/worker.tsx",
  },
  compatibilityFlags: ["nodejs_compat"],
  compatibilityDate: "2025-07-19",
  observability: {
    enabled: true,
  },
});

export const customDomain = await CustomDomain("custom-domain", {
  name: process.env.CUSTOM_DOMAIN!,
  zoneId: process.env.CLOUDFLARE_ZONE_ID!,
  workerName: site.name,
  adopt: true,
});

console.log(`➜  Site deployed at: https://${process.env.CUSTOM_DOMAIN}`);

await app.finalize();
