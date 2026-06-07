import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(rootDir, '..');
const distDir = path.join(rootDir, 'dist');

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = execFile(command, args, { cwd: options.cwd || rootDir }, (error, stdout, stderr) => {
    if (error) {
      reject(new Error(stderr || stdout || error.message));
      return;
    }
    resolve({ stdout, stderr });
  });
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
});

const copyCommonFiles = async (targetDir) => {
  await mkdir(targetDir, { recursive: true });
  await copyFile(path.join(rootDir, 'package.json'), path.join(targetDir, 'package.json'));
  await copyFile(path.join(rootDir, 'server.js'), path.join(targetDir, 'server.js'));
  await copyFile(path.join(rootDir, 'README.md'), path.join(targetDir, 'README.md'));
};

const packageMac = async () => {
  const targetDir = path.join(distDir, 'Print Menu Renderer Mac');
  await rm(targetDir, { recursive: true, force: true });
  await copyCommonFiles(targetDir);
  await copyFile(path.join(rootDir, 'Start Print Menu Renderer.command'), path.join(targetDir, 'Start Print Menu Renderer.command'));
  await mkdir(path.join(targetDir, 'bin'), { recursive: true });

  const localFfmpeg = path.join(rootDir, 'bin', 'ffmpeg');
  if (existsSync(localFfmpeg)) {
    await copyFile(localFfmpeg, path.join(targetDir, 'bin', 'ffmpeg'));
  } else {
    await writeFile(path.join(targetDir, 'bin', 'PUT_FFMPEG_HERE.txt'), 'Put the Mac ffmpeg executable here and name it ffmpeg.\n');
  }

  await run('chmod', ['+x', path.join(targetDir, 'Start Print Menu Renderer.command')]);
  if (existsSync(path.join(targetDir, 'bin', 'ffmpeg'))) await run('chmod', ['+x', path.join(targetDir, 'bin', 'ffmpeg')]);
  await run('zip', ['-r', 'Print-Menu-Renderer-Mac.zip', 'Print Menu Renderer Mac'], { cwd: distDir });
};

const packageWindows = async () => {
  const targetDir = path.join(distDir, 'Print Menu Renderer Windows');
  await rm(targetDir, { recursive: true, force: true });
  await copyCommonFiles(targetDir);
  await copyFile(path.join(rootDir, 'Start Print Menu Renderer.bat'), path.join(targetDir, 'Start Print Menu Renderer.bat'));
  await copyFile(path.join(rootDir, 'Start Print Menu Renderer.ps1'), path.join(targetDir, 'Start Print Menu Renderer.ps1'));
  await mkdir(path.join(targetDir, 'bin'), { recursive: true });

  const localFfmpeg = path.join(rootDir, 'bin', 'ffmpeg.exe');
  if (existsSync(localFfmpeg)) {
    await copyFile(localFfmpeg, path.join(targetDir, 'bin', 'ffmpeg.exe'));
  } else {
    await writeFile(path.join(targetDir, 'bin', 'PUT_FFMPEG_EXE_HERE.txt'), 'Put the Windows ffmpeg.exe executable here and name it ffmpeg.exe.\n');
  }

  await run('zip', ['-r', 'Print-Menu-Renderer-Windows.zip', 'Print Menu Renderer Windows'], { cwd: distDir });
};

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await packageMac();
await packageWindows();
console.log(`Packages created in ${distDir}`);
