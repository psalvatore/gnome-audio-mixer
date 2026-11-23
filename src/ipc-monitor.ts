import { spawn } from "node:child_process";
import { createIpcReceiver } from "./ipc-receiver.js";
import { formatSinkInputList, formatSinkList } from "./formatting.js";

const child = spawn(
  process.execPath,
  [new URL("./ipc-server.js", import.meta.url).pathname],
  {
    stdio: ["ignore", "pipe", "inherit"],
  },
);

const receive = createIpcReceiver((message) => {
  console.log(formatSinkList(message.payload.sinks));
  console.log(formatSinkInputList(message.payload.sinkInputs));
});

child.stdout.on("data", (chunk: Buffer) => {
  receive(chunk.toString("utf8"));
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});

child.on("exit", (code, signal) => {
  console.error(`Audio backend exited (code: ${code}, signal: ${signal})`);
});
