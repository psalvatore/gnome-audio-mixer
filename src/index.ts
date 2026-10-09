import { getSinks, setSinkVolume } from "./pactl.js";

try {
  await setSinkVolume("music_bus", 100);
  const sinks = await getSinks();
  console.log(sinks);
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log("Unknown error");
  }
}
