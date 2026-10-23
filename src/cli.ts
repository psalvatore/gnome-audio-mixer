import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import {
  getSinks,
  setSinkMute,
  setSinkVolume,
  getSinkInputs,
  setSinkInputVolume,
  setSinkInputMute,
} from "./pactl.js";
import { formatSinkList, formatSinkInputList } from "./formatting.js";
import {
  isValidVolume,
  isValidMenuSelection,
  getSelectedItem,
} from "./validation.js";
import { VOLUME_LIMIT, EXIT_OPTION } from "./config.js";
import type { AudioSink, AudioSinkInput, CliServices } from "./types.js";

const defaultServices: CliServices = {
  getSinks,
  setSinkVolume,
  setSinkMute,
  getSinkInputs,
  setSinkInputVolume,
  setSinkInputMute,
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
        "4. List application audio streams\n" +
        "5. Set application stream volume\n" +
        "6. Mute/Unmute application stream\n" +
        `${EXIT_OPTION}. Exit\n\n` +
        "Select an option: ",
    );

    try {
      if (answer === "1") {
        await listSinks(services);
      } else if (answer === "2") {
        await runSetSinkVolumeMenu(rl, services);
      } else if (answer === "3") {
        await runSinkMuteMenu(rl, services);
      } else if (answer === "4") {
        await listSinkInputs(services);
      } else if (answer === "5") {
        await runSetSinkInputVolumeMenu(rl, services);
      } else if (answer === "6") {
        await runSinkInputMuteMenu(rl, services);
      } else if (answer === `${EXIT_OPTION}`) {
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

async function runSetSinkVolumeMenu(
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

async function runSinkMuteMenu(
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
  const sink = getSelectedItem(sinks, selection);

  if (sink === null) {
    console.log("Invalid sink selection.");
    return null;
  }

  return sink;
}

async function listSinkInputs(services: CliServices): Promise<void> {
  const sinks = await services.getSinkInputs();

  console.log(formatSinkInputList(sinks) + "\n");
}

async function runSetSinkInputVolumeMenu(
  rl: Interface,
  services: CliServices,
): Promise<void> {
  const sinkInput = await selectSinkInput(rl, services);

  if (!sinkInput) {
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

  await services.setSinkInputVolume(sinkInput.index, parsedVolume);

  console.log(
    `Volume for ${sinkInput.applicationName} set to ${parsedVolume}%`,
  );
}

async function runSinkInputMuteMenu(
  rl: Interface,
  services: CliServices,
): Promise<void> {
  const sinkInput = await selectSinkInput(rl, services);

  if (!sinkInput) {
    return;
  }

  const muted = await rl.question("Set mute (1 = mute, 0 = unmute): ");

  if (muted !== "0" && muted !== "1") {
    console.log("Invalid mute value. Enter 0 or 1.");
    return;
  }

  const isMuted = muted === "1";

  await services.setSinkInputMute(sinkInput.index, isMuted);

  console.log(
    `${sinkInput.applicationName} has been ${isMuted ? "muted" : "unmuted"}.`,
  );
}

async function selectSinkInput(
  rl: Interface,
  services: CliServices,
): Promise<AudioSinkInput | null> {
  const sinkInputs = await services.getSinkInputs();

  if (sinkInputs.length === 0) {
    console.log("No application audio streams found.");
    return null;
  }

  console.log("Available application audio streams:\n");
  console.log(formatSinkInputList(sinkInputs) + "\n");

  const selection = await rl.question("Select application audio stream: ");
  const sinkInput = getSelectedItem(sinkInputs, selection);

  if (sinkInput === null) {
    console.log("Invalid application audio stream selection.");
    return null;
  }

  return sinkInput;
}
