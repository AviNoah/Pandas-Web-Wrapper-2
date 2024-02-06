function handleSelect(fileView, dataId) {
    // TODO implement multi select and change view's contents

    console.log("handleSelect executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index will handle communication
    parent.postMessage(JSON.stringify(data), target);
}
