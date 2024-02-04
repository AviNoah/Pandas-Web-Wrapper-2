function handleSelect(event, dataId) {
    console.log("handleSelect executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index will handle communication
    parent.postMessage(JSON.stringify(data), target);
}

function handleEdit(event, dataId) {
    console.log("handleEdit executed with dataId:", dataId);
}

function handleQueryList(event, dataId) {
    console.log("handleQueryList executed with dataId:", dataId);
}

function handleDownload(event, dataId) {
    console.log("handleDownload executed with dataId:", dataId);
}

function handleDelete(event, dataId) {
    console.log("handleDelete executed with dataId:", dataId);
}