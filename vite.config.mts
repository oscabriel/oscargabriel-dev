import path from "node:path";

import contentCollections from "@content-collections/vite";
import tailwindcss from "@tailwindcss/vite";
import { redwood } from "rwsdk/vite";
import { defineConfig } from "vite";

export default defineConfig({
  environments: {
    ssr: {},
  },
  plugins: [redwood(), tailwindcss(), contentCollections()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/root/*": path.resolve(__dirname, "./"),
    },
  },
});
