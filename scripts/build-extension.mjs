import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = "dist-extension";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ["extension/extension.ts"],
  outfile: `${outputDirectory}/extension.js`,
  bundle: true,
  platform: "neutral",
  format: "esm",
  target: "es2022",
  external: ["gi://*", "resource://*"],
});

await cp("extension/metadata.json", `${outputDirectory}/metadata.json`);

console.log("GNOME extension built successfully.");
