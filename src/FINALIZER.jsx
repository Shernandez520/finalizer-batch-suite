#target illustrator

/* ==========================================================================
   FINALIZER.jsx                                                        v2.0
   --------------------------------------------------------------------------
   Started by FINALIZER.bat. Does all the Illustrator work for one job:

     for each PDF in the job's FINAL folder (one at a time):
       1. open it
       2. export a PNG exactly as it opened (72 ppi, white background,
          clipped to the artboard), same name as the PDF
       3. hide any visible layer named BACKGROUND (at any depth)
       4. if a layer was hidden, save the PDF in place (same name)
       5. close it

   It never touches documents you already had open, never creates any other
   files in FINAL, and suppresses Illustrator pop-ups (missing fonts etc.)
   so an unattended run can't stall.

   Talks to FINALIZER.bat through small text files in %TEMP%\FINALIZER
   (outside Dropbox):
     job.txt               written by the .bat: RUNID=..., FINAL=...
     started_<RUNID>.txt   written here as soon as the script starts
     progress_<RUNID>.txt  "3 of 7: filename.pdf"
     result_<RUNID>.txt    one line per PDF:  OK|name|notes  or  FAIL|name|reason
                           last line:         END|<RUNID>
   The run ID means a leftover file from an earlier run can never be
   mistaken for this run finishing.
   ========================================================================== */

var FZ = {
    RETRIES: 3,          // attempts for export/save (Dropbox can briefly lock files)
    RETRY_WAIT_MS: 1500,
    LAYER_NAME: "BACKGROUND"
};

function fzTrim(s) { return String(s).replace(/^\s+|\s+$/g, ""); }

// Keeps messages on one line and free of the | separator.
function fzClean(s) { return String(s).replace(/[\r\n|]+/g, " "); }

function fzWorkFolder() { return new Folder(Folder.temp.fsName + "/FINALIZER"); }

function fzReadText(file) {
    file.encoding = "UTF-8";
    if (!file.open("r")) return null;
    var t = file.read();
    file.close();
    return t;
}

function fzWriteText(file, text) {
    file.encoding = "UTF-8";
    if (!file.open("w")) return false;
    file.write(text);
    file.close();
    return true;
}

// job.txt -> { RUNID: "...", FINAL: "..." }
function fzReadJob(file) {
    var job = {}, text = fzReadText(file);
    if (text === null) return job;
    var lines = text.replace(/^﻿/, "").split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        var eq = lines[i].indexOf("=");
        if (eq > 0) job[fzTrim(lines[i].substr(0, eq))] = fzTrim(lines[i].substr(eq + 1));
    }
    return job;
}

function fzRetry(fn, what) {
    var last = "";
    for (var i = 1; i <= FZ.RETRIES; i++) {
        try { fn(); return; } catch (e) { last = e.message; }
        if (i < FZ.RETRIES) $.sleep(FZ.RETRY_WAIT_MS);
    }
    throw new Error("Couldn't " + what + " after " + FZ.RETRIES + " tries (" + last + ")");
}

// Same export settings as FINALIZER v1: 72 ppi (100% scale), white matte,
// no transparency, clipped to the artboard.
function fzExportPng(doc, pngFile) {
    var o = new ExportOptionsPNG24();
    o.antiAliasing = true;
    o.transparency = false;
    o.artBoardClipping = true;
    o.horizontalScale = 100;
    o.verticalScale = 100;
    o.matte = true;
    var white = new RGBColor();
    white.red = 255; white.green = 255; white.blue = 255;
    o.matteColor = white;
    fzRetry(function () { doc.exportFile(pngFile, ExportType.PNG24, o); }, "export the PNG");
    if (!pngFile.exists) throw new Error("The PNG was not created");
}

// Hides every visible layer named BACKGROUND, including sublayers.
// Returns how many were hidden.
function fzHideBackground(layers) {
    var hidden = 0;
    for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        if (fzTrim(L.name).toUpperCase() === FZ.LAYER_NAME && L.visible) {
            try {
                L.visible = false;
            } catch (e) {
                // A locked layer can refuse the change: unlock, hide, relock.
                var wasLocked = L.locked;
                L.locked = false;
                L.visible = false;
                L.locked = wasLocked;
            }
            hidden++;
        }
        hidden += fzHideBackground(L.layers);
    }
    return hidden;
}

// Same PDF settings as FINALIZER v1, except every artboard is kept
// (v1 saved artboard 1 only).
function fzSavePdf(doc, file) {
    var o = new PDFSaveOptions();
    o.preserveEditability = true;
    o.generateThumbnails = true;
    o.optimization = false;
    o.viewAfterSaving = false;
    fzRetry(function () { doc.saveAs(file, o); }, "save the PDF");
}

function fzIsAlreadyOpen(file) {
    for (var d = 0; d < app.documents.length; d++) {
        try { if (app.documents[d].fullName.fsName === file.fsName) return true; } catch (e) {}
    }
    return false;
}

// Returns one result line for the PDF.
function fzProcessPdf(file) {
    var name = decodeURI(file.name), doc = null, notes = [];
    try {
        if (fzIsAlreadyOpen(file)) {
            return "FAIL|" + name + "|It was already open in Illustrator. Close it and run FINALIZER again.";
        }
        doc = app.open(file);

        var png = new File(file.parent.fsName + "/" + name.replace(/\.pdf$/i, "") + ".png");
        fzExportPng(doc, png);

        var artboards = doc.artboards.length;
        if (artboards > 1) notes.push(artboards + " artboards - the PNG shows artboard 1 only; check this file");

        var hidden = fzHideBackground(doc.layers);
        if (hidden > 0) {
            fzSavePdf(doc, file);
            notes.push("BACKGROUND hidden and saved");
        } else {
            notes.push("no visible BACKGROUND layer - PDF left as is");
        }
        return "OK|" + name + "|" + fzClean(notes.join("; "));
    } catch (e) {
        return "FAIL|" + name + "|" + fzClean(e.message);
    } finally {
        if (doc) { try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {} }
    }
}

function fzListPdfs(folder) {
    var files = folder.getFiles(function (f) { return (f instanceof File) && /\.pdf$/i.test(decodeURI(f.name)); });
    files.sort(function (a, b) {
        var x = decodeURI(a.name).toLowerCase(), y = decodeURI(b.name).toLowerCase();
        return x < y ? -1 : (x > y ? 1 : 0);
    });
    return files;
}

function fzRun() {
    var work = fzWorkFolder();
    var jobFile = new File(work.fsName + "/job.txt");
    if (!jobFile.exists) {
        alert("FINALIZER: there's no job waiting.\n\nRight-click a GR#####_LR##### project folder and choose Send to > FINALIZER.");
        return;
    }
    var job = fzReadJob(jobFile);
    if (!job.RUNID || !job.FINAL) {
        alert("FINALIZER: the job file is incomplete. Run FINALIZER again from the Send to menu.");
        return;
    }
    var runId = job.RUNID;
    fzWriteText(new File(work.fsName + "/started_" + runId + ".txt"), "started " + new Date());

    var results = [];
    var oldLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    try {
        var finalFolder = new Folder(job.FINAL);
        if (!finalFolder.exists) {
            results.push("FAIL|(job)|The FINAL folder was not found: " + fzClean(job.FINAL));
        } else {
            var pdfs = fzListPdfs(finalFolder);
            if (!pdfs.length) results.push("FAIL|(job)|No PDFs found in FINAL");
            for (var i = 0; i < pdfs.length; i++) {
                fzWriteText(new File(work.fsName + "/progress_" + runId + ".txt"),
                    (i + 1) + " of " + pdfs.length + ": " + decodeURI(pdfs[i].name));
                results.push(fzProcessPdf(pdfs[i]));
            }
        }
    } catch (e) {
        results.push("FAIL|(job)|" + fzClean(e.message));
    } finally {
        app.userInteractionLevel = oldLevel;
    }
    results.push("END|" + runId);

    // Write under a temporary name, then rename, so the .bat never reads a half-written file.
    var tmp = new File(work.fsName + "/result_" + runId + ".tmp");
    fzWriteText(tmp, results.join("\n") + "\n");
    tmp.rename("result_" + runId + ".txt");
}

if (typeof FZ_NO_AUTORUN === "undefined") {
    try { fzRun(); } catch (e) { alert("FINALIZER error:\n" + e.message + (e.line ? "\n(line " + e.line + ")" : "")); }
}
