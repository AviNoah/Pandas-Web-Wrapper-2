// Handle routing data from the iframes
const spreadsheetFrame = document.getElementById('spreadsheetFrame');
const fileManagerFrame = document.getElementById('fileManagerFrame');

window.addEventListener('message', (event) => {
    // Reject any messages not from fileManagerFrame
    if (event.origin !== fileManagerFrame.src)
        return;

    // Forward message data to spreadsheetFrame
    spreadsheetFrame.contentWindow.postMessage(event.data, event.origin);
})