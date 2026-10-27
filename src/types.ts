export type CommandRunner = (
  command: string,
  args: string[],
) => Promise<string>;

export type SinkState = "RUNNING" | "IDLE" | "SUSPENDED";

export type AudioEventAction = "new" | "change" | "remove";

export type AudioEventResource = "sink" | "sink-input";

export interface AudioEvent {
  action: AudioEventAction;
  resource: AudioEventResource;
  index: number;
}

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

export interface AudioSinkInput {
  index: number;
  sink: number;
  applicationName: string;
  iconName: string;
  mediaName: string;
  mute: boolean;
  volume: number;
}

export interface PactlSinkInput {
  index: number;
  sink: number;
  mute: boolean;
  volume: PactlVolumeProp;
  properties: Record<string, string>;
}

export interface PactlVolumeProp {
  [key: string]: PactlVolumeChannel;
}

export interface PactlVolumeChannel {
  value: number;
  value_percent: string;
  db: string;
}

export interface CliServices {
  getSinks: () => Promise<AudioSink[]>;
  setSinkVolume: (name: string, volume: number) => Promise<void>;
  setSinkMute: (name: string, muted: boolean) => Promise<void>;
  getSinkInputs: () => Promise<AudioSinkInput[]>;
  setSinkInputVolume: (index: number, volume: number) => Promise<void>;
  setSinkInputMute: (index: number, muted: boolean) => Promise<void>;
}
