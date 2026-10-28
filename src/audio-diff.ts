import type {
  AudioSink,
  AudioSinkInput,
  SinkChanges,
  SinkInputChanges,
} from "./types.js";

export function getSinkChanges(
  previous: AudioSink[],
  current: AudioSink[],
): SinkChanges {
  const added: AudioSink[] = [];
  const removed: AudioSink[] = [];
  const updated: AudioSink[] = [];
  const currentIndexes = new Set(current.map((sink) => sink.index));
  const previousSinks = new Map(previous.map((sink) => [sink.index, sink]));

  for (const curr of current) {
    const prev = previousSinks.get(curr.index);

    if (prev === undefined) {
      added.push(curr);
    } else if (curr.volume !== prev.volume || curr.mute !== prev.mute) {
      updated.push(curr);
    }
  }

  for (const prev of previous) {
    if (!currentIndexes.has(prev.index)) {
      removed.push(prev);
    }
  }

  return {
    added: added,
    removed: removed,
    updated: updated,
  };
}

export function getSinkInputChanges(
  previous: AudioSinkInput[],
  current: AudioSinkInput[],
): SinkInputChanges {
  const added: AudioSinkInput[] = [];
  const removed: AudioSinkInput[] = [];
  const updated: AudioSinkInput[] = [];
  const currentIndexes = new Set(current.map((sinkInput) => sinkInput.index));
  const previousSinkInputs = new Map(
    previous.map((sinkInput) => [sinkInput.index, sinkInput]),
  );

  for (const curr of current) {
    const prev = previousSinkInputs.get(curr.index);

    if (prev === undefined) {
      added.push(curr);
    } else if (
      curr.volume !== prev.volume ||
      curr.mute !== prev.mute ||
      curr.sink !== prev.sink
    ) {
      updated.push(curr);
    }
  }

  for (const prev of previous) {
    if (!currentIndexes.has(prev.index)) {
      removed.push(prev);
    }
  }

  return {
    added: added,
    removed: removed,
    updated: updated,
  };
}
