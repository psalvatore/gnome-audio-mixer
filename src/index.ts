import { getSinks, setSinkVolume, setSinkMute } from "./pactl.js";

try {
  await setSinkMute("music_bus", true);
  // await setSinkVolume("music_bus", 100);
  console.log(await getSinks());
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log("Unknown error");
  }
}
