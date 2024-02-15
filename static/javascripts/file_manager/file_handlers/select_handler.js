const excel_logo_states = {
    select: { url: "/images/excel_logo_opened.svg", alt: "Excel logo opened" },
    deselect: { url: "/images/excel_logo_closed.svg", alt: "Excel logo closed" },
}

// Preload images
function preloadImages(imageStates) {
    for (let stateKey in imageStates) {
        const img = new Image();
        const url = imageStates[stateKey].url;
        try {
            img.src = url;
        } catch (error) {
            console.error(`Failed to fetch ${url}: ${error}`);
        }
    }
}

function handleSelect(event, fileView, dataId) {
    if (!event.shiftKey)
        deselectAll(fileView.parentElement);  // If shift is not held, deselect all.

    toggleSelect(fileView);
    showIfSelected(fileView);

    showSpreadsheet(dataId);
}

function showSpreadsheet(dataId) {
    // Show the spreadsheet of the given dataId
    console.log("showSpreadsheet executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index homepage will handle communication
    parent.postMessage(JSON.stringify(data), target);
}

function toggleSelect(fileView) {
    // Toggle selection
    if (fileView.classList.contains('select'))
        deselect(fileView);
    else
        select(fileView);
}

function deselect(fileView) {
    fileView.classList.remove('select');
}

function select(fileView) {
    fileView.classList.add('select');
}

function deselectAll(container) {
    const fileViews = container.querySelectorAll('.file-view');
    Array.from(fileViews).forEach(fileView => {
        deselect(fileView);
        showIfSelected(fileView);  // Update img for all
    });
}

function showIfSelected(fileView) {
    let imageState = excel_logo_states.deselect;

    if (fileView.classList.contains('select'))
        imageState = excel_logo_states.select;

    const fileImg = fileView.querySelector('.file-icon');
    fileImg.setAttribute('src', imageState.url);
    fileImg.setAttribute('alt', imageState.alt);
}

// Preload images on DOM content load
document.addEventListener('DOMContentLoaded', () => preloadImages(excel_logo_states));