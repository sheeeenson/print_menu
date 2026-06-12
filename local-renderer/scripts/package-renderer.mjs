import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const macPackageName = 'Print Menu Renderer Mac';
const windowsPackageName = 'Print Menu Renderer Windows';
const includeFfmpeg = process.env.INCLUDE_FFMPEG === '1';

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

const copyIfExists = async (source, target) => {
  if (!existsSync(source)) return false;
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  return true;
};

const copyCommonFiles = async (targetDir) => {
  await mkdir(targetDir, { recursive: true });
  await copyFile(path.join(rootDir, 'package.json'), path.join(targetDir, 'package.json'));
  await copyFile(path.join(rootDir, 'server.js'), path.join(targetDir, 'server.js'));
  await copyFile(path.join(rootDir, 'README.md'), path.join(targetDir, 'README.md'));

  await writeFile(path.join(targetDir, '.gitignore'), 'node_modules/\ndist/\n.env\n.DS_Store\n');
};

const writePackageNotes = async (targetDir, platform) => {
  const launcher = platform === 'mac'
    ? 'Start Print Menu Renderer.command'
    : 'Start Print Menu Renderer.bat';
  const ffmpegName = platform === 'mac' ? 'ffmpeg' : 'ffmpeg.exe';

  await writeFile(path.join(targetDir, 'START_HERE.txt'), [
    'Print Menu Local Renderer',
    '=========================',
    '',
    `1. Open this folder: ${path.basename(targetDir)}`,
    `2. Put ${ffmpegName} into the bin folder if it is not already there.`,
    `3. Double-click: ${launcher}`,
    '4. Keep the launcher window open while exporting MP4/WebM from the website.',
    '',
    'Health check:',
    'http://localhost:3020/health',
    '',
    'Requirements:',
    '- Node.js 18+',
    '- FFmpeg in the bin folder, or FFmpeg available in PATH',
    '- Internet connection on first run to install npm dependencies and Playwright Chromium',
    '',
  ].join('\n'));
};

const zipFolder = async (archiveName, folderName) => {
  const archivePath = path.join(distDir, archiveName);
  await rm(archivePath, { force: true });
  await run('zip', ['-r', '-X', archiveName, folderName], { cwd: distDir });
};

const packageMac = async () => {
  const targetDir = path.join(distDir, macPackageName);
  await rm(targetDir, { recursive: true, force: true });
  await copyCommonFiles(targetDir);
  await writePackageNotes(targetDir, 'mac');
  await copyFile(path.join(rootDir, 'Start Print Menu Renderer.command'), path.join(targetDir, 'Start Print Menu Renderer.command'));
  await mkdir(path.join(targetDir, 'bin'), { recursive: true });

  const ffmpegTarget = path.join(targetDir, 'bin', 'ffmpeg');
  const hasFfmpeg = includeFfmpeg
    ? await copyIfExists(path.join(rootDir, 'bin', 'ffmpeg'), ffmpegTarget)
    : false;

  if (!hasFfmpeg) {
    await writeFile(path.join(targetDir, 'bin', 'PUT_FFMPEG_HERE.txt'), 'Put the Mac ffmpeg executable here and name it ffmpeg.\n');
  }

  await run('chmod', ['+x', path.join(targetDir, 'Start Print Menu Renderer.command')]);
  if (existsSync(ffmpegTarget)) {
    await run('chmod', ['+x', ffmpegTarget]);
  }

  await zipFolder('Print-Menu-Renderer-Mac.zip', macPackageName);
};

const packageWindows = async () => {
  const targetDir = path.join(distDir, windowsPackageName);
  await rm(targetDir, { recursive: true, force: true });
  await copyCommonFiles(targetDir);
  await writePackageNotes(targetDir, 'windows');
  await copyFile(path.join(rootDir, 'Start Print Menu Renderer.bat'), path.join(targetDir, 'Start Print Menu Renderer.bat'));
  await copyFile(path.join(rootDir, 'Start Print Menu Renderer.ps1'), path.join(targetDir, 'Start Print Menu Renderer.ps1'));
  await mkdir(path.join(targetDir, 'bin'), { recursive: true });

  const hasFfmpeg = includeFfmpeg
    ? await copyIfExists(path.join(rootDir, 'bin', 'ffmpeg.exe'), path.join(targetDir, 'bin', 'ffmpeg.exe'))
    : false;

  if (!hasFfmpeg) {
    await writeFile(path.join(targetDir, 'bin', 'PUT_FFMPEG_EXE_HERE.txt'), 'Put the Windows ffmpeg.exe executable here and name it ffmpeg.exe.\n');
  }

  await zipFolder('Print-Menu-Renderer-Windows.zip', windowsPackageName);
};

const printDistSummary = async () => {
  const entries = await readdir(distDir);
  console.log('\nPackages created in:');
  console.log(distDir);
  console.log('');
  console.log(includeFfmpeg ? 'Mode: bundled FFmpeg' : 'Mode: lightweight packages without bundled FFmpeg');
  console.log('');

  for (const entry of entries.sort()) {
    const entryPath = path.join(distDir, entry);
    const entryStat = await stat(entryPath);
    if (entryStat.isFile()) {
      const sizeMb = (entryStat.size / 1024 / 1024).toFixed(2);
      console.log(`- ${entry} (${sizeMb} MB)`);
    }
  }
};

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await packageMac();
await packageWindows();
await printDistSummary();
