import { startCli } from "./cli.js";

try {
  await startCli();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
