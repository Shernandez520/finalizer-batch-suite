// Runs FINALIZER.jsx against a mocked Illustrator, backed by a real temp
// folder on disk, so the job hand-off, per-file processing and result file
// can be checked without Illustrator.   Usage:  node tests/jsx_harness.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ---------- ExtendScript File / Folder over the real filesystem ----------
class FsItem {
  constructor(p) { this.fsName = path.resolve(String(p)); }
  get name() { return encodeURI(path.basename(this.fsName)); }
  get exists() { return fs.existsSync(this.fsName); }
  get parent() { return new Folder(path.dirname(this.fsName)); }
}
class File extends FsItem {
  open(mode) { this._mode = mode; this._buf = mode === 'r' ? (this.exists ? fs.readFileSync(this.fsName, 'utf8') : null) : ''; return mode !== 'r' || this._buf !== null; }
  read() { return this._buf; }
  write(s) { this._buf += s; }
  close() { if (this._mode === 'w') fs.writeFileSync(this.fsName, this._buf); }
  rename(n) { const t = path.join(path.dirname(this.fsName), n); fs.renameSync(this.fsName, t); this.fsName = t; return true; }
}
class Folder extends FsItem {
  getFiles(filter) {
    return fs.readdirSync(this.fsName).map(n => {
      const p = path.join(this.fsName, n);
      return fs.statSync(p).isDirectory() ? new Folder(p) : new File(p);
    }).filter(f => !filter || filter(f));
  }
}

// ---------- Mock Illustrator ----------
function layer(name, visible, sub, locked) {
  const L = { name, layers: sub || [], locked: !!locked, _v: visible };
  Object.defineProperty(L, 'visible', { get: () => L._v, set: v => { if (L.locked) throw new Error('locked'); L._v = v; } });
  return L;
}
function makeApp(fixtures) {
  const app = {
    documents: [], userInteractionLevel: 'DISPLAY', saved: [], exported: [], interactionDuringOpen: [],
    open(file) {
      app.interactionDuringOpen.push(app.userInteractionLevel);
      const fx = fixtures[path.basename(file.fsName)] || {};
      if (fx.openFails) throw new Error('could not open');
      const doc = {
        fullName: new File(file.fsName), layers: fx.layers || [], artboards: { length: fx.artboards || 1 },
        _saveFails: fx.saveFails || 0,
        exportFile(f, type, o) {
          assert.strictEqual(o.horizontalScale, 100); assert.strictEqual(o.matte, true); assert.strictEqual(o.matteColor.red, 255);
          assert.strictEqual(o.transparency, false);
          if (!fx.exportNoFile) fs.writeFileSync(f.fsName, 'png'); app.exported.push(path.basename(f.fsName));
        },
        saveAs(f, o) {
          if (doc._saveFails-- > 0) throw new Error('file locked');
          assert.strictEqual(o.preserveEditability, true); assert.strictEqual(o.artboardRange, undefined);
          app.saved.push(path.basename(f.fsName));
        },
        close() { app.documents.splice(app.documents.indexOf(doc), 1); }
      };
      app.documents.push(doc);
      return doc;
    }
  };
  return app;
}

function runJsx(tempRoot, app) {
  const ctx = {
    File, Folder, app, alert: m => { ctx.alerts.push(m); }, alerts: [],
    $: { sleep() {} }, RGBColor: function () {}, ExportOptionsPNG24: function () {}, PDFSaveOptions: function () {},
    ExportType: { PNG24: 'PNG24' }, SaveOptions: { DONOTSAVECHANGES: 'no' },
    UserInteractionLevel: { DONTDISPLAYALERTS: 'NONE' }
  };
  ctx.Folder.temp = new Folder(tempRoot);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/FINALIZER.jsx'), 'utf8').replace(/^#target.*$/m, ''), ctx);
  return ctx;
}

function setup(pdfNames, extra) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fz-'));
  const tmp = path.join(root, 'temp'); fs.mkdirSync(path.join(tmp, 'FINALIZER'), { recursive: true });
  const fin = path.join(root, 'ROP Dropbox (Team) & Co', 'GR58980_LR13694', 'FINAL'); fs.mkdirSync(fin, { recursive: true });
  pdfNames.forEach(n => fs.writeFileSync(path.join(fin, n), 'pdf'));
  (extra || []).forEach(n => fs.writeFileSync(path.join(fin, n), 'x'));
  fs.writeFileSync(path.join(tmp, 'FINALIZER', 'job.txt'), 'RUNID=12345\r\nFINAL=' + fin + '\r\n');
  return { root, tmp, fin, result: () => fs.readFileSync(path.join(tmp, 'FINALIZER', 'result_12345.txt'), 'utf8').trim().split('\n') };
}

let pass = 0; const ok = (n, fn) => { fn(); pass++; console.log('  ok -', n); };

ok('Processes every PDF, exports PNGs, hides BACKGROUND, saves only changed files', () => {
  const t = setup(['GR58980_LR13694_FC_V2.pdf', 'GR58980_LR13694_SC_V2.pdf', 'GR58980_LR13694_FL_V1.pdf'], ['GR58980_LR13694_FINAL.zip']);
  const bgFC = layer('BACKGROUND', true), bgSC = layer('Art', true, [layer('background ', true)]);
  const app = makeApp({
    'GR58980_LR13694_FC_V2.pdf': { layers: [layer('Art', true), bgFC] },
    'GR58980_LR13694_SC_V2.pdf': { layers: [bgSC] },
    'GR58980_LR13694_FL_V1.pdf': { layers: [layer('BACKGROUND', false)] }
  });
  runJsx(t.tmp, app);
  const r = t.result();
  assert.strictEqual(r.length, 4);
  assert.ok(r.slice(0, 3).every(l => l.startsWith('OK|')), r.join('\n'));
  assert.strictEqual(r[3], 'END|12345');
  assert.strictEqual(bgFC.visible, false); assert.strictEqual(bgSC.layers[0].visible, false);
  assert.deepStrictEqual(app.saved.sort(), ['GR58980_LR13694_FC_V2.pdf', 'GR58980_LR13694_SC_V2.pdf']);
  assert.strictEqual(app.exported.length, 3);
  const files = fs.readdirSync(t.fin).sort();
  assert.deepStrictEqual(files, ['GR58980_LR13694_FC_V2.pdf', 'GR58980_LR13694_FC_V2.png', 'GR58980_LR13694_FINAL.zip',
    'GR58980_LR13694_FL_V1.pdf', 'GR58980_LR13694_FL_V1.png', 'GR58980_LR13694_SC_V2.pdf', 'GR58980_LR13694_SC_V2.png'], 'no extra files in FINAL');
  assert.strictEqual(app.documents.length, 0, 'all docs closed');
  assert.ok(app.interactionDuringOpen.every(l => l === 'NONE'), 'dialogs suppressed while opening');
  assert.strictEqual(app.userInteractionLevel, 'DISPLAY', 'restored afterwards');
  assert.ok(fs.existsSync(path.join(t.tmp, 'FINALIZER', 'started_12345.txt')));
  assert.ok(!fs.existsSync(path.join(t.tmp, 'FINALIZER', 'result_12345.tmp')), 'temp result renamed');
});

ok('PNG is exported BEFORE the background is hidden (PNG shows the file as opened)', () => {
  const t = setup(['A.pdf']);
  const bg = layer('BACKGROUND', true);
  const app = makeApp({ 'A.pdf': { layers: [bg] } });
  const origOpen = app.open;
  app.open = f => { const d = origOpen(f); const ex = d.exportFile; d.exportFile = (...a) => { assert.strictEqual(bg.visible, true); ex(...a); }; return d; };
  runJsx(t.tmp, app);
  assert.ok(t.result()[0].startsWith('OK|A.pdf'));
});

ok('Never touches documents that were already open', () => {
  const t = setup(['A.pdf']);
  const app = makeApp({ 'A.pdf': { layers: [] } });
  const userDoc = { fullName: new File('/somewhere/else/client_logo.ai'), close() { throw new Error('closed user doc!'); } };
  app.documents.push(userDoc);
  runJsx(t.tmp, app);
  assert.strictEqual(app.documents.length, 1); assert.strictEqual(app.documents[0], userDoc);
  assert.ok(t.result()[0].startsWith('OK|A.pdf'));
});

ok('Failures are reported per file, and other files still run', () => {
  const t = setup(['A.pdf', 'B.pdf', 'C.pdf']);
  const app = makeApp({ 'A.pdf': { openFails: true }, 'B.pdf': { exportNoFile: true }, 'C.pdf': { layers: [layer('BACKGROUND', true)], saveFails: 99 } });
  runJsx(t.tmp, app);
  const r = t.result();
  assert.ok(/^FAIL\|A\.pdf\|could not open/.test(r[0]), r[0]);
  assert.ok(/^FAIL\|B\.pdf\|The PNG was not created/.test(r[1]), r[1]);
  assert.ok(/^FAIL\|C\.pdf\|Couldn't save the PDF after 3 tries/.test(r[2]), r[2]);
  assert.strictEqual(r[3], 'END|12345');
  assert.strictEqual(app.documents.length, 0);
});

ok('Dropbox lock: save succeeds on a retry', () => {
  const t = setup(['A.pdf']);
  const app = makeApp({ 'A.pdf': { layers: [layer('BACKGROUND', true)], saveFails: 2 } });
  runJsx(t.tmp, app);
  assert.ok(t.result()[0].startsWith('OK|A.pdf|BACKGROUND hidden'));
});

ok('Locked BACKGROUND layer is still hidden and stays locked', () => {
  const t = setup(['A.pdf']);
  const bg = layer('BACKGROUND', true, [], true);
  runJsx(t.tmp, makeApp({ 'A.pdf': { layers: [bg] } }));
  assert.strictEqual(bg.visible, false); assert.strictEqual(bg.locked, true);
});

ok('Multiple artboards flagged in the notes', () => {
  const t = setup(['A.pdf']);
  runJsx(t.tmp, makeApp({ 'A.pdf': { artboards: 3 } }));
  assert.ok(/3 artboards/.test(t.result()[0]));
});

ok('A file already open by the user is refused, not closed', () => {
  const t = setup(['A.pdf']);
  const app = makeApp({});
  const mine = { fullName: new File(path.join(t.fin, 'A.pdf')), close() { throw new Error('closed!'); } };
  app.documents.push(mine);
  runJsx(t.tmp, app);
  assert.ok(/^FAIL\|A\.pdf\|It was already open/.test(t.result()[0]));
  assert.strictEqual(app.documents[0], mine);
});

ok('No job file -> friendly alert, no result written', () => {
  const t = setup(['A.pdf']);
  fs.unlinkSync(path.join(t.tmp, 'FINALIZER', 'job.txt'));
  const ctx = runJsx(t.tmp, makeApp({}));
  assert.strictEqual(ctx.alerts.length, 1);
  assert.ok(!fs.existsSync(path.join(t.tmp, 'FINALIZER', 'result_12345.txt')));
});

ok('Missing FINAL folder -> FAIL line + END (the .bat stops instead of hanging)', () => {
  const t = setup([]);
  fs.writeFileSync(path.join(t.tmp, 'FINALIZER', 'job.txt'), 'RUNID=12345\nFINAL=' + path.join(t.root, 'nope'));
  runJsx(t.tmp, makeApp({}));
  const r = t.result();
  assert.ok(r[0].startsWith('FAIL|(job)|The FINAL folder was not found')); assert.strictEqual(r[1], 'END|12345');
});

console.log(`\n${pass} tests passed`);
