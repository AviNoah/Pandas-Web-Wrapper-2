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

function handleSelect(fileView, dataId) {
    // TODO implement multi select
    // TODO when selecting a file it should close the filters pop up
    toggleSelect(fileView);
    showIfSelected(fileView);

    console.log("handleSelect executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index will handle communication
    parent.postMessage(JSON.stringify(data), target);
}

function toggleSelect(fileView) {
    // Toggle selection
    if (fileView.classList.contains('select'))
        fileView.classList.remove('select');
    else
        fileView.classList.add('select');
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