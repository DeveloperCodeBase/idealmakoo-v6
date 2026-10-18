/** Build a portable frontend source download from a strict, public-source allowlist.
 * Excludes credentials, Git/runtime state, dependencies and previous build output.
 * It is safe to regenerate before Next's public-asset export without recursion.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir,lstat,mkdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync,unzipSync} from 'fflate';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relativeOutput = 'public/downloads/idealmakoo-source.zip';
const roots = ['src','public','docs','scripts','tests','worker'];
const names = ['README.md','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','next.config.mjs','postcss.config.mjs','tailwind.config.ts','.env.example','.gitignore','.openai/hosting.json'];
const files = new Map();
const skip = relative => relative === relativeOutput || relative.endsWith('.DS_Store') || /(?:^|\/)(?:node_modules|\.git|\.next|\.sites-runtime)(?:\/|$)/.test(relative) || /(?:^|\/)\.env(?:\.[^/]*)?$/.test(relative) && relative !== '.env.example';

async function collect(relative) {
  if (skip(relative)) return;
  let info;
  try { info = await lstat(path.join(root,relative)); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (info.isSymbolicLink()) return;
  if (info.isDirectory()) {
    for (const entry of (await readdir(path.join(root,relative))).sort()) await collect(`${relative}/${entry}`);
  } else if (info.isFile()) files.set(relative, await readFile(path.join(root,relative)));
}
for (const relative of [...names,...roots]) await collect(relative);
if (!files.has('package.json') || !files.has('src/components/Application.tsx')) throw new Error('Refusing an incomplete source archive.');

const digest = createHash('sha256');
const entries = {};
const hashes = {};
for (const [relative,bytes] of [...files].sort(([a],[b]) => a.localeCompare(b,'en'))) {
  const sha = createHash('sha256').update(bytes).digest('hex');
  hashes[relative] = sha;
  digest.update(`${relative}\0${sha}\n`);
  entries[`idealmakoo/${relative}`] = [new Uint8Array(bytes),{mtime:new Date(2000,0,1),level:/\.(?:png|jpe?g|webp|avif|woff2|mp4|zip)$/i.test(relative)?0:6}];
}
const sourceDigest = digest.digest('hex');
const manifest = {format:1,project:'Ideal Makoo frontend',sourceDigest,fileCount:files.size,includes:['source','official-media','docs','tests','lockfile'],excludes:['node_modules','out','.next','runtime-state','credentials'],run:['npm ci','npm run build','npm start'],files:hashes};
entries['idealmakoo/SOURCE-MANIFEST.json'] = [new TextEncoder().encode(JSON.stringify(manifest,null,2)+'\n'),{mtime:new Date(2000,0,1),level:6}];
const archive = zipSync(entries);
const restored = unzipSync(archive);
if (Object.keys(restored).length !== files.size + 1) throw new Error('Source archive entry verification failed.');
for (const [relative,bytes] of files) {
  if (createHash('sha256').update(restored[`idealmakoo/${relative}`]).digest('hex') !== hashes[relative]) throw new Error(`Archive mismatch: ${relative}`);
}
const output = path.join(root,relativeOutput);
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,archive);
if (process.argv.includes('--sync-export')) {
  const exported = path.join(root,'out','downloads','idealmakoo-source.zip');
  await stat(path.join(root,'out','index.html'));
  await mkdir(path.dirname(exported),{recursive:true});
  await copyFile(output,exported);
  // The Worker download is rebuilt separately because its multipart manifest contains this ZIP's digest.
}
console.log(JSON.stringify({archive:output,files:files.size+1,sizeBytes:archive.byteLength,sourceDigest,verified:true}));
