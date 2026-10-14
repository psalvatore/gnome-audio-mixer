import { displayMainMenu } from "./cli.js";

try {
  await displayMainMenu();
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log("Unknown error");
  }
}
