function handleFilterList(fileView, dataId) {
    console.log("handleQueryList executed with dataId:", dataId);

    const sheet = new Promise(getSheet());
    const filters = sheet.then(sheet => new Promise(getFilters(dataId, sheet)));
    const filterListDiv = filters.then(filtersList => new Promise(populateFilterList(filtersList)));

    filterListDiv.then(div => {
        fileView.appendChild(div);
        const container = document.createElement('div');
        container.classList.add('filters-list-container');

        container.setAttribute('display', 'block');

        // Adjust position

    })
}

function getSheet() {
    // TODO: get selected sheet, for now we will use sheet 1 (adjusted to 0)
    return 0;
}

function getFilters(fileId, sheet) {
    const data = JSON.stringify({ fileId: fileId, sheet: sheet });

    fetch('/filters/get/for_sheet', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: data
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to fetch filters");

            return response.json();
        })
        .then(json => {
            Array.from(json).forEach(filter => {
                // Filter is a dict

            })
        })
}

function populateFilterList(filters) {

}