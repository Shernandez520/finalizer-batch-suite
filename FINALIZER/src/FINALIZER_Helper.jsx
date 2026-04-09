// FINALIZER_Helper.jsx
// Behavior:
// - Export PNG exactly as the PDF appears when opened.
// - AFTER export, turn OFF any visible BACKGROUND layers.
// - Save PDF using PDFSaveOptions so visibility changes are written.

(function () {
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var docPath = doc.fullName;
    var docFolder = docPath.parent;
    var docName = docPath.name;

    // PNG name
    var baseName = docName.replace(/\.pdf$/i, "");
    var pngFile = File(docFolder.fsName + "/" + baseName + ".png");

    // --- 1) Export PNG exactly as-is ---
    try {
        var opts = new ExportOptionsPNG24();
        opts.antiAliasing = true;
        opts.transparency = false;
        opts.artBoardClipping = true;
        opts.horizontalScale = 100;
        opts.verticalScale = 100;
        opts.matte = true;

        var white = new RGBColor();
        white.red = 255; white.green = 255; white.blue = 255;
        opts.matteColor = white;

        doc.exportFile(pngFile, ExportType.PNG24, opts);
    } catch (e1) {}

    // --- 2) Turn OFF any visible BACKGROUND layers ---
    try {
        for (var i = 0; i < doc.layers.length; i++) {
            var lyr = doc.layers[i];
            if (lyr.name && lyr.name.toUpperCase() === "BACKGROUND") {
                if (lyr.visible) {
                    lyr.visible = false;
                }
            }
        }
    } catch (e2) {}

    // --- 3) Save PDF using PDFSaveOptions (critical!) ---
    try {
        var pdfOpts = new PDFSaveOptions();
        pdfOpts.preserveEditability = true;
        pdfOpts.generateThumbnails = true;
        pdfOpts.optimization = false;
        pdfOpts.viewAfterSaving = false;
        pdfOpts.artboardRange = "1";

        doc.saveAs(doc.fullName, pdfOpts);
    } catch (e3) {}

    // --- 4) Close the PDF ---
    try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e4) {}
})();