import type { CommandRunner } from "../src/types.js";

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
