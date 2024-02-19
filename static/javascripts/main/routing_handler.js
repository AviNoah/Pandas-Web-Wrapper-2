// Handle routing data from the iframes

window.addEventListener('message', (event) => {
    const spreadsheetFrame = document.getElementById('spreadsheetFrame');
    const fileManagerFrame = document.getElementById('fileManagerFrame');
    // Reject any messages not from fileManagerFrame
    if (!fileManagerFrame.baseURI.startsWith(event.origin))
        return;

    // Forward message data to spreadsheetFrame
    spreadsheetFrame.contentWindow.postMessage(event.data, event.origin);
})