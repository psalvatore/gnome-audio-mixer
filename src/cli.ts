import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import { getSinks, setSinkMute, setSinkVolume } from "./pactl.js";
import { formatSinkList } from "./formatting.js";
import { isValidVolume } from "./validation.js";
import { VOLUME_LIMIT } from "./config.js";
import type { AudioSink, CliServices } from "./types.js";

const defaultServices: CliServices = {
  getSinks,
  setSinkVolume,
  setSinkMute,
};

export async function startCli(): Promise<void> {
  const rl: Interface = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await runMenu(rl);
  } finally {
    rl.close();
  }
}

export async function runMenu(
  rl: Interface,
  services: CliServices = defaultServices,
): Promise<void> {
  while (true) {
    const answer = await rl.question(
      "1. List audio sinks\n" +
        "2. Set sink volume\n" +
        "3. Mute/Unmute sink\n" +
        "4. Exit\n\n" +
        "Select an option: ",
    );

    try {
      if (answer === "1") {
        await listSinks(services);
      } else if (answer === "2") {
        await runSetVolumeMenu(rl, services);
      } else if (answer === "3") {
        await runMuteMenu(rl, services);
      } else if (answer === "4") {
        console.log("Goodbye!");
        break;
      } else {
        console.log("Invalid selection.");
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Unknown error");
    }
  }
}

async function listSinks(services: CliServices): Promise<void> {
  const sinks = await services.getSinks();

  console.log(formatSinkList(sinks) + "\n");
}

async function runSetVolumeMenu(
  rl: Interface,
  services: CliServices,
): Promise<void> {
  const sink = await selectSink(rl, services);

  if (!sink) {
    return;
  }

  const volume = await rl.question(`Enter volume (0-${VOLUME_LIMIT}): `);
  const parsedVolume = Number(volume);

  if (
    volume.trim() === "" ||
    !Number.isInteger(parsedVolume) ||
    !isValidVolume(parsedVolume)
  ) {
    console.log("Invalid volume.");
    return;
  }

  await services.setSinkVolume(sink.name, parsedVolume);

  console.log(`Volume for ${sink.description} set to ${parsedVolume}%`);
}

async function runMuteMenu(
  rl: Interface,
  services: CliServices,
): Promise<void> {
  const sink = await selectSink(rl, services);

  if (!sink) {
    return;
  }

  const muted = await rl.question("Set mute (1 = mute, 0 = unmute): ");

  if (muted !== "0" && muted !== "1") {
    console.log("Invalid mute value. Enter 0 or 1.");
    return;
  }

  const isMuted = muted === "1";

  await services.setSinkMute(sink.name, isMuted);

  console.log(`${sink.description} has been ${isMuted ? "muted" : "unmuted"}.`);
}

async function selectSink(
  rl: Interface,
  services: CliServices,
): Promise<AudioSink | null> {
  const sinks = await services.getSinks();

  if (sinks.length === 0) {
    console.log("No audio sinks found.");
    return null;
  }

  console.log("Available audio sinks:\n");
  console.log(formatSinkList(sinks) + "\n");

  const selection = await rl.question("Select sink: ");
  const parsedSelection = Number(selection);

  if (
    selection.trim() === "" ||
    !Number.isInteger(parsedSelection) ||
    parsedSelection < 1 ||
    parsedSelection > sinks.length
  ) {
    console.log("Invalid sink selection.");
    return null;
  }

  return sinks[parsedSelection - 1] ?? null;
}
