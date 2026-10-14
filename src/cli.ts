import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import { getSinks, setSinkMute, setSinkVolume } from "./pactl.js";
import { formatSinkList } from "./formatting.js";
import { isValidSinkName, isValidVolume } from "./validation.js";
import { VOLUME_LIMIT } from "./config.js";
import type { AudioSink } from "./types.js";

export async function displayMainMenu(): Promise<void> {
  const rl: Interface = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
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
          await listSinks();
        } else if (answer === "2") {
          await displaySetVolumeMenu(rl);
        } else if (answer === "3") {
          await displayMuteMenu(rl);
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
  } finally {
    rl.close();
  }
}

async function listSinks(): Promise<void> {
  const sinks = await getSinks();

  console.log(formatSinkList(sinks) + "\n");
}

async function displaySetVolumeMenu(rl: Interface): Promise<void> {
  const sink = await selectSink(rl);

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

  await setSinkVolume(sink.name, parsedVolume);

  console.log(`Volume for ${sink.description} set to ${parsedVolume}%`);
}

async function displayMuteMenu(rl: Interface): Promise<void> {
  const sink = await selectSink(rl);

  if (!sink) {
    return;
  }

  const muted = await rl.question("Set mute (1 = mute, 0 = unmute): ");

  if (muted !== "0" && muted !== "1") {
    console.log("Invalid mute value. Enter 0 or 1.");
    return;
  }

  const isMuted = muted === "1";

  await setSinkMute(sink.name, isMuted);

  console.log(`${sink.description} has been ${isMuted ? "muted" : "unmuted"}.`);
}

async function selectSink(rl: Interface): Promise<AudioSink | null> {
  const sinks = await getSinks();

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
