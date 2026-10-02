import { getSinks } from "./pactl.js";

try {
    const sinks = await getSinks();
    console.log(sinks);
} catch (error) {
    if (error instanceof Error) {
        console.log(error.message);
    } else {
        console.log("Unknown error");
    }
}