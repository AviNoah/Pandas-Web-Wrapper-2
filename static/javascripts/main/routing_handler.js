// Handle routing data from the iframes
const spreadsheetFrame = document.getElementById('spreadsheetFrame');
const fileManagerFrame = document.getElementById('fileManagerFrame');

window.addEventListener('message', (event) => {
    if (event.origin !== fileManagerFrame)
        return;  // Don't accept any messages not from fileManagerFrame

    // Forward message data to spreadsheetFrame
    spreadsheetFrame.contentWindow.postMessage(event.data, event.origin);
})