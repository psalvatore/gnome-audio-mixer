import type { Interface } from "node:readline/promises";
import type { CommandRunner, AudioSink } from "../src/types.js";

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
