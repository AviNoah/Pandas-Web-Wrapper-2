function handleClear() {
    // TODO: After implementing sessions, clear these files from session files
    const dropzone = document.getElementById("drop-zone");
    const choice = confirm("Clear grid? this will remove all files from session!");

    if (!choice)
        return;

    while (dropzone.children.length !== 0)
        dropzone.removeChild(dropzone.firstChild);

    data = {};
    target = "/";  // Index homepage will handle communication
    parent.postMessage(JSON.stringify(data), target);
    console.log("Cleared file grid");
}