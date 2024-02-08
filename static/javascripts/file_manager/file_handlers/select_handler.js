function handleSelect(fileView, dataId) {
    // TODO implement multi select and change view's contents
    // TODO when selecting a file it should close the filters pop up

    // TODO: FIX THIS
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
    let img_url = "/images/excel_logo_closed.svg";
    let alt = "Excel logo closed";
    if (fileView.classList.contains('selected')) {
        img_url = "/images/excel_logo_opened.svg";
        alt = "Excel logo opened";
    }

    const fileImg = fileView.querySelector('.file-icon');
    fileImg.setAttribute('alt', alt);

    // Fetch img
    fetch(img_url)
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to fetch image");

            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            fileImg.setAttribute('src', blobUrl);
        })
        .catch(error => console.error(error));
}