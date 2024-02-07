import { getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";
import { openSheet } from "/scripts/spreadsheet/populate_spreadsheet.js";

function escapeRegExp(string) {
    // Escape regex
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Handle listeners
export function handleFilter(filterView, column) {
    // Submit button
    const submitBtn = filterView.querySelector('button[name="filter-submit-button"]');
    submitBtn.addEventListener('click', () => {
        if (!submitBtn.classList.contains("disabled")) {
            handleUpdate(filterView, column);  // Update only if not disabled - once a change is detected
        }
    });

    // Listen for changes
    submitBtn.classList.add("disabled");  // Disable by default until change is triggered
    filterView.addEventListener('input', () => detectChange(filterView, submitBtn));
    filterView.addEventListener('change', () => detectChange(filterView, submitBtn));


    // Visibility icon
    const visibilityImg = filterView.querySelector('img[name="visibility-icon"]');
    showVisibilityIcon(visibilityImg);

    // Add a listener to toggle View on and off
    visibilityImg.addEventListener('click', () => {
        detectChange(filterView, submitBtn);
        toggleVisibilityIcon(visibilityImg);  // Flip state
        showVisibilityIcon(visibilityImg);
    });
    visibilityImg.addEventListener('dragstart', (event) => {
        event.preventDefault();  // Prevent dragging the image
    })


    // Delete icon
    const deleteImg = filterView.querySelector('img[name="delete-icon"]');
    deleteImg.addEventListener('click', () => handleDelete(filterView));
}

function detectChange(filterView, submitBtn) {
    submitBtn.classList.remove("disabled");

    filterView.removeEventListener('input', detectChange);
    filterView.removeEventListener('change', detectChange);
}

// Submitting changes
function handleUpdate(filterView, column) {
    // Register filter in DB if it has no ID yet
    const filterId = filterView.getAttribute('data-id');
    if (filterId)
        updateFilter(filterView, filterId);
    else
        addFilter(filterView, column);

    // Disable submit button until new change
    const submitBtn = filterView.querySelector('button[name="filter-submit-button"]');
    submitBtn.classList.add("disabled");  // Disable by default until change is triggered

}

function addFilter(filterView, column) {
    // Data for relationships should be attached to data
    const data = {
        fileId: document.getElementById("spreadsheet").getAttribute('data-id'),
        sheet: getSelectedSheetIndex(),
        column: column,
        method: filterView.querySelector('select[name="filter-selector"]').value,
        input: escapeRegExp(filterView.querySelector('input[name="filter-input"]').value),
        enabled: filterView.querySelector('img[name="visibility-icon"]').classList.contains('toggled'),
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

            return response.json();
        })
        .then(json => {
            if (!json.hasOwnProperty('filterId'))
                throw new Error("Server did not return filter id");

            return json.filterId;
        })
        .then(filterId => {
            filterView.setAttribute('data-id', filterId);  // update id data
            openSheet(getSelectedSheetIndex());  // Show updated table

            console.log("Added filter successfully");
        })
        .catch(error => console.error(error))
}

function updateFilter(filterView, filterId) {
    const data = {
        filterId: filterId,
        method: filterView.querySelector('select[name="filter-selector"]').value,
        input: escapeRegExp(filterView.querySelector('input[name="filter-input"]').value),
        enabled: filterView.querySelector('img[name="visibility-icon"]').classList.contains('toggled'),
    }

    // POST to back-end and request update
    fetch("/filters/update", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Server did not respond");


            openSheet(getSelectedSheetIndex());  // Show updated table
            console.log("Updated filter successfully");
        })
        .catch(error => console.error(error));
}

// Toggling visibility
function toggleVisibilityIcon(visibilityImg) {
    if (visibilityImg.classList.contains('toggled'))
        visibilityImg.classList.remove('toggled');
    else
        visibilityImg.classList.add('toggled');
}

function showVisibilityIcon(visibilityImg) {
    // Toggle view on and off
    let url;
    let alt;
    if (visibilityImg.classList.contains('toggled')) {
        // Toggle on == show
        url = "/images/View.svg";
        alt = "Show";
    }
    else {
        // Toggle off == hide
        url = "/images/Hide.svg";
        alt = "Hide";
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

// Removing filter
function handleDelete(filterView) {
    // Fetch filter id from data, delete from DB and remove from container parent
    const choice = confirm("Are you sure you wish to delete this filter?");
    if (!choice)
        return;  // User cancelled action

    const filterId = filterView.getAttribute('data-id');
    if (filterId)
        removeFromDB(filterId);  // Only remove if registered in DB

    filterView.parentElement.removeChild(filterView);  // Remove self from filter list div
}

function removeFromDB(filterId) {
    const data = { filterId: filterId };

    fetch("/filters/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Server did not respond, failed to delete");
        })
}

