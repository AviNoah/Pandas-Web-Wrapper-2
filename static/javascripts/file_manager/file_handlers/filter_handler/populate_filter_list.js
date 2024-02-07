function handleFilterList(fileView, dataId) {
    console.log("handleQueryList executed with dataId:", dataId);

    const sheet = new Promise(getSheet());
    const filters = sheet.then(sheet => new Promise(getFilters(dataId, sheet)));
    const container = filters.then(filtersList => new Promise(populateFilterList(filtersList)));

    container.then(container => {
        // Adjust position and make visible
        fileView.appendChild(container);
        container.setAttribute('display', 'block');
    })
}

function getSheet() {
    // TODO: get selected sheet, for now we will use sheet 1 (adjusted to 0)
    return 0;
}

function getFilters(fileId, sheet) {
    const data = JSON.stringify({ fileId: fileId, sheet: sheet });

    return fetch('/filters/get/for_sheet', {
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
            return Array.from(json);
        })
        .catch(error => console.error(error));
}

function populateFilterList(filters) {

    return fetch('/templates/filter/filter.html')
        .then(response => {
            if (!response.ok)
                throw new Error("Could not retrieve filter template");

            return response.text;
        })
        .then(content => {
            const container = document.createElement('div');
            container.classList.add('filters-list-container');

            filters.forEach(filter => {
                // Filter contains the following keys: input, method, enabled, column
                
            })

            return container
        })
}