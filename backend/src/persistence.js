// Minimal crash-recovery + dedupe persistence.
//
// The council recommended "a tiny SQLite layer for dedupe + crash recovery —
// not history". For a single-user bounded cache a debounced JSON snapshot is
// even simpler (zero native deps) and does the same job: survive a restart
// without losing last-known state or re-delivering messages. Swap for SQLite
// later only if the cache outgrows a single JSON write.

var fs = require('fs');
var path = require('path');
var config = require('./config');
var cache = require('./cache');

var SNAPSHOT = config.snapshotPath;
var timer = null;
var DEBOUNCE_MS = 2000;

function ensureDir() {
  var dir = path.dirname(SNAPSHOT);
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveNow() {
  try {
    ensureDir();
    var tmp = SNAPSHOT + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache.exportState()));
    fs.renameSync(tmp, SNAPSHOT);   // atomic replace
  } catch (e) {
    console.error('[persistence] snapshot write failed:', e.message);
  }
}

function scheduleSave() {
  if (timer) return;
  timer = setTimeout(function () { timer = null; saveNow(); }, DEBOUNCE_MS);
}

function load() {
  try {
    if (fs.existsSync(SNAPSHOT)) {
      var state = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
      cache.importState(state);
      console.log('[persistence] restored snapshot from ' + SNAPSHOT);
    }
  } catch (e) {
    console.error('[persistence] snapshot load failed:', e.message);
  }
}

function init() {
  load();
  cache.setOnChange(scheduleSave);
  // Flush on shutdown so we don't lose the last debounce window.
  process.on('SIGTERM', function () { saveNow(); process.exit(0); });
  process.on('SIGINT', function () { saveNow(); process.exit(0); });
}

module.exports = { init: init, saveNow: saveNow };
