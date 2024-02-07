import { getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";
import { openSheet } from "/scripts/spreadsheet/populate_spreadsheet.js";

function escapeRegExp(string) {
    // Escape regex
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function handleFilter(filterView, column) {
    const submitBtn = document.querySelector('button[name="filter-submit-button"]');
    handleSubmit
}

function handleSubmit(column) {
    const data = {
        fileId: document.getElementById("spreadsheet").getAttribute('data-id'),
        sheet: getSelectedSheetIndex(),
        column: column,
        method: document.querySelector('select[name="filter-selector"]').value,
        input: escapeRegExp(document.querySelector('input[name="filter-input"]').value),
        enabled: Boolean(document.querySelector('img[name="visibility-icon"]').classList.contains('toggled')),
    }

    fetch("/filters/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Server did not respond");

            console.log("Added successfully");
            openSheet(getSelectedSheetIndex());  // Show updated table
        })
        .catch(error => console.error(error))
}

function handleDelete() {

}

function toggleFilter(event) {
    // Toggle view on and off
    const imageDiv = event.target;
    let url;
    let alt;
    if (imageDiv.classList.contains('toggled')) {
        // Toggle off == hide
        imageDiv.classList.remove('toggled');
        url = "/images/Hide.svg";
        alt = "Hide";
    }
    else {
        // Toggle on == show
        imageDiv.classList.add('toggled');
        url = "/images/View.svg";
        alt = "Show";
    }

    imageDiv.setAttribute('alt', alt);

    fetch(url)
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to fetch image");

            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            imageDiv.setAttribute('src', blobUrl)
        })
}


