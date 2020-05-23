import { exec } from 'child_process';

export async function buildAllFiles(): Promise<void> {
  await new Promise<void>((resolve, reject): void => {
    let child = exec('tsc');
    child.stdout.on('data', (chunk): void => {
      console.log(chunk);
    });
    child.stderr.on('data', (chunk): void => {
      console.log(chunk);
    });
    child.on('close', () => {
      resolve();
    });
  });
}
