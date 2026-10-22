import type { Interface } from "node:readline/promises";
import type {
  CommandRunner,
  AudioSink,
  PactlSinkInput,
  AudioSinkInput,
} from "../src/types.js";

export function createFakeRunner(output: string): CommandRunner {
  return async (): Promise<string> => {
    return output;
  };
}

export function createRecordingRunner(
  commands: string[][],
  output: string = "",
): CommandRunner {
  return async (command: string, args: string[]): Promise<string> => {
    commands.push([command, ...args]);
    return output;
  };
}

export function createFakeReadline(answers: string[]): Interface {
  let index = 0;

  const fake = {
    question: async (_prompt: string): Promise<string> => {
      if (index >= answers.length) {
        throw new Error("No more fake answers available.");
      }

      const answer = answers[index];

      if (answer === undefined) {
        throw new Error("No more fake answers available.");
      }

      index++;

      return answer;
    },
  };

  return fake as unknown as Interface;
}

export function createFakeSink(): AudioSink {
  return {
    index: 0,
    name: "test-speakers",
    description: "Speakers",
    state: "RUNNING",
    mute: false,
    volume: 50,
  };
}

export function createFakePactlSinkInput(): PactlSinkInput {
  return {
    index: 0,
    sink: 111,
    mute: false,
    volume: {
      "front-left": {
        value: 65536,
        value_percent: "40%",
        db: "0.00 dB",
      },
      "front-right": {
        value: 65536,
        value_percent: "60%",
        db: "0.00 dB",
      },
    },
    properties: {
      "application.name": "Test Browser",
      "application.icon_name": "test-browser",
      "media.name": "Playback",
    },
  };
}

export function createFakeSinkInput(): AudioSinkInput {
  return {
    index: 0,
    sink: 111,
    applicationName: "Test Browser",
    iconName: "test-browser",
    mediaName: "Playback",
    mute: false,
    volume: 40,
  };
}
