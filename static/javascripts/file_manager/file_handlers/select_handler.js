function handleSelect(fileView, dataId) {
    // TODO implement multi select and change view's contents
    // TODO when selecting a file it should close the filters pop up

    console.log("handleSelect executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index will handle communication
    parent.postMessage(JSON.stringify(data), target);
}
