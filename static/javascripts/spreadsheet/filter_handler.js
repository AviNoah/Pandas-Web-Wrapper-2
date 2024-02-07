import { getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";
import { openSheet } from "/scripts/spreadsheet/populate_spreadsheet.js";

function escapeRegExp(string) {
    // Escape regex
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Handle listeners
export function handleFilter(filterView, column) {
    // Submit button
    const submitBtn = document.querySelector('button[name="filter-submit-button"]');
    submitBtn.addEventListener('click', () => {
        if (!submitBtn.classList.contains("disabled")) {
            handleUpdate(column);  // Update only if not disabled - once a change is detected
        }
    });

    // Listen for changes
    submitBtn.classList.add("disabled");  // Disable by default until change is triggered
    filterView.addEventListener('input', detectChange);
    filterView.addEventListener('change', detectChange);


    // Visibility icon
    const visibilityImg = document.querySelector('img[name="visibility-icon"]');
    // Add a listener to toggle View on and off
    visibilityImg.addEventListener('click', () => toggleFilter(visibilityImg));
    visibilityImg.addEventListener('dragstart', (event) => {
        event.preventDefault();  // Prevent dragging the image
    })


    // Delete icon
    const deleteImg = document.querySelector('img[name="delete-icon"]');
    deleteImg.addEventListener('click', () => handleDelete(filterView));
}

function detectChange(filterView, submitBtn) {
    submitBtn.classList.remove("disabled");

    filterView.removeEventListener('input', detectChange);
    filterView.removeEventListener('change', detectChange);
}

function handleUpdate(filterView, column) { }

function handleSubmit(filterView, column) {
    const data = {
        fileId: document.getElementById("spreadsheet").getAttribute('data-id'),
        sheet: getSelectedSheetIndex(),
        column: column,
        method: filterView.querySelector('select[name="filter-selector"]').value,
        input: escapeRegExp(filterView.querySelector('input[name="filter-input"]').value),
        enabled: Boolean(filterView.querySelector('img[name="visibility-icon"]').classList.contains('toggled')),
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

function toggleFilter(visibilityImg) {
    // Toggle view on and off
    let url;
    let alt;
    if (visibilityImg.classList.contains('toggled')) {
        // Toggle off == hide
        visibilityImg.classList.remove('toggled');
        url = "/images/Hide.svg";
        alt = "Hide";
    }
    else {
        // Toggle on == show
        visibilityImg.classList.add('toggled');
        url = "/images/View.svg";
        alt = "Show";
    }

    visibilityImg.setAttribute('alt', alt);

    // Fetch img
    fetch(url)
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to fetch image");

            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            visibilityImg.setAttribute('src', blobUrl)
        })
}

function handleDelete(filterView) {
    // Fetch filter id from data, delete from DB and remove from container parent

}

