export type CommandRunner = (
  command: string,
  args: string[],
) => Promise<string>;

export type SinkState = "RUNNING" | "IDLE" | "SUSPENDED";

export interface AudioSink {
  index: number;
  name: string;
  description: string;
  state: SinkState;
  mute: boolean;
  volume: number;
}

export interface PactlSink {
  index: number;
  name: string;
  description: string;
  state: SinkState;
  mute: boolean;
  volume: PactlVolumeProp;
}

export interface PactlVolumeProp {
  [key: string]: PactlVolumeChannel;
}

export interface PactlVolumeChannel {
  value: number;
  value_percent: string;
  db: string;
}
