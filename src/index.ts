import { execFile } from "node:child_process";

type SinkState = "RUNNING" | "IDLE" | "SUSPENDED"; 

interface AudioSink {
    index: number;
    name: string;
    description: string;
    state: SinkState;
    mute: boolean;
}

execFile("pactl", ["-f", "json", "list", "sinks"], (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }

    if (stderr) {
        console.error(`pactl: ${stderr}`);
        return;
    }

    const pactlSinks: unknown = JSON.parse(stdout);

    if (!Array.isArray(pactlSinks)) {
        console.error("Expected pactl to return an array.");
        return;
    }

    if (!pactlSinks.every(isAudioSink)) {
        console.error("pactl returned an invalid sink.");
        return;
    }

    const sinks: AudioSink[] = pactlSinks.map((sink) => {
        return {
            index: sink.index,
            name: sink.name,
            description: sink.description,
            state: sink.state,
            mute: sink.mute
        };
    });

    console.log(sinks);
});

function isSinkState(state: unknown): state is SinkState {
    return (
        state === "RUNNING" ||
        state === "IDLE" ||
        state === "SUSPENDED"
    );
}

function isAudioSink(value: unknown): value is AudioSink {
    if (typeof value === "object" && value !== null) {
        return (
            "index" in value &&
            typeof value.index === "number" &&

            "name" in value &&
            typeof value.name === "string" &&

            "description" in value &&
            typeof value.description === "string" &&

            "state" in value &&
            isSinkState(value.state) &&

            "mute" in value &&
            typeof value.mute === "boolean"
        );
    }

    return false;
}