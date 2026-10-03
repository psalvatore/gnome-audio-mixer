export type SinkState = "RUNNING" | "IDLE" | "SUSPENDED";

export interface AudioSink {
  index: number;
  name: string;
  description: string;
  state: SinkState;
  mute: boolean;
}
