import { spawn } from "child_process";

export async function buildAllFiles(): Promise<void> {
  await new Promise<void>((resolve, reject): void => {
    let child = spawn("tsc", [], {stdio: 'inherit'});
    child.on("exit", () => {
      resolve();
    });
  });
}

