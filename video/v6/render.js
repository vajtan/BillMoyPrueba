// Orquestador: Chromium (three.js) -> fotogramas JPEG -> ffmpeg + audio sintetizado.
const { chromium } = require('playwright-core');
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const AU = require('./audio');
const FPS = 24;
(async () => {
  const args = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => console.log('PAGE', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForFunction('window.ready===true', null, { timeout: 60000 });
  const sch = await p.evaluate(() => window.init());
  console.log('WPS', sch.wps.toFixed(2)); sch.scenes.forEach(s => console.log(s.name.padEnd(12), s.t0.toFixed(2), s.dur.toFixed(2)));
  if (args[0] === '--shots') {
    const dir = path.join(__dirname, 'preview'); fs.mkdirSync(dir, { recursive: true });
    const only = args[1];
    for (const s of sch.scenes) { if (only && only !== s.name) continue; for (const f of (args[2] ? args[2].split(',').map(Number) : [0.3, 0.8])) { const d = await p.evaluate(t => window.renderFrame(t), s.t0 + s.dur * f); fs.writeFileSync(path.join(dir, `${s.name}_${f}.jpg`), Buffer.from(d.split(',')[1], 'base64')); } }
    await b.close(); return;
  }
  const total = sch.total, buf = AU.makeBuf(total), mus = AU.makeBuf(total);
  sch.scenes.forEach((s, k) => {
    AU.music2(mus, s.t0, s.dur + 0.5, s.music, 300 + k);
    for (const a of s.amb) AU.SFX[a[0]](buf, s.t0, s.dur, ...a.slice(1));
    for (const e of s.sfx) if (AU.SFX[e[1]]) AU.SFX[e[1]](buf, s.t0 + e[0], ...e.slice(2));
    if (k > 0) AU.SFX.swoosh(buf, s.t0 - 0.1);
  });
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * 0.85 + mus[i] * 0.55;
  const wav = path.join(__dirname, '_audio.wav'); AU.writeWav(wav, buf);
  const out = path.join(__dirname, '..', 'vajtan_aventuras_3d_9x16.mp4');
  const ff = execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  const f = spawn(ff, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', String(FPS), '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'medium', '-b:v', '1150k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const nf = Math.round(total * FPS), t0 = Date.now();
  for (let i = 0; i < nf; i++) {
    const d = await p.evaluate(t => window.renderFrame(t), i / FPS);
    const bf = Buffer.from(d.split(',')[1], 'base64');
    if (!f.stdin.write(bf)) await new Promise(r => f.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${nf}  ${((Date.now() - t0) / 1000 / Math.max(1, i)).toFixed(3)} s/f`);
  }
  f.stdin.end(); await new Promise(r => f.on('close', r)); fs.unlinkSync(wav); await b.close(); console.log('OK ->', out);
})();
