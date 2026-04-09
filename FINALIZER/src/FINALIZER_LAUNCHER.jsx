// FINALIZER_Launcher.jsx
// Explicitly run by Illustrator via -run flag.

(function () {
    if (app.documents.length === 0) {
        alert("No documents open for FINALIZER.");
        return;
    }

    // Path to helper script
    var helperFile = File("C:/Users/Public/FINALIZER/FINALIZER_Helper.jsx");
    if (!helperFile.exists) {
        alert("FINALIZER_Helper.jsx not found at C:/Users/Public/FINALIZER/");
        return;
    }

    // FINAL folder = folder of first open document
    var finalFolder = app.documents[0].fullName.parent;

    // Snapshot list of open docs (Illustrator mutates app.documents during close)
    var docs = [];
    for (var i = 0; i < app.documents.length; i++) {
        docs.push(app.documents[i]);
    }

    // Process each PDF
    for (var j = 0; j < docs.length; j++) {
        app.activeDocument = docs[j];
        $.evalFile(helperFile);
    }

    // Create DONE flag
    var doneFile = File(finalFolder.fsName + "/FINALIZER_DONE.flag");
    if (doneFile.open("w")) {
        doneFile.write("DONE " + new Date());
        doneFile.close();
    }
})();