import { addFilter } from "/scripts/spreadsheet/filter_handler.js";
import { getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";

export function viewFilterList(event, column) {
    const popUp = createPopup(column); // Make popup
    popUp.then((popUp) => {
        positionPopup(event.target, popUp); // position it under filter img
        document.addEventListener('click', (event) => closeFilterPopup(event));  // Listen to closing
    })
}

function closePopup() {
    // Create popup at view target
    const existingPopup = document.querySelector('.filters-list-container');
    if (existingPopup) {
        existingPopup.parentNode.removeChild(existingPopup);  // Close existing
    }

    document.removeEventListener('click', closeFilterPopup);
}

function createPopup(column) {
    closePopup();  // Close old pop up

    return fetch("/templates/filter/filter_list.html")
        .then(response => {
            if (!response.ok)
                throw new Error("Server failed to retrieve filter template");

            return response.text();
        })
        .then(content => {
            const container = document.createElement('div');
            container.classList.add('filters-list-container');

            container.innerHTML = content;
            const addFiltersButton = container.querySelector("add-filter");
            const filtersList = container.querySelector('filters-list');

            // Make it produce a new filter item when clicked
            addFiltersButton.addEventListener("click", () => addFilter(filtersList, column));

            // Populate filters from DB
            const filters = getFiltersFromDB(column);
            return filters.then(filters => {
                populateFilterList(container, filters);
                return filtersList
            })
        })
        .catch(error => console.error(error));
}

function closeFilterPopup(event) {
    // Function to handle closing the filter popup
    const filterPopup = document.querySelector('.filters-list-container');

    // Check if the clicked element or its parent is outside the filter popup
    if (!filterPopup)
        return;  // Not initialized yet

    if (event.target === filterPopup || filterPopup.contains(event.target)) {
        return;  // An element inside filterPopup was selected
    }

    // An element outside of filterPopup was selected
    closePopup();
}

function positionPopup(target, popup) {
    // Position popup at target
    const rect = target.getBoundingClientRect();

    // Position from the right top corner

    let right = rect.left + scrollX

    // Make sure it doesn't overflow
    right = Math.max(250, right);

    // Set the position of the filter popup relative to the clicked filter image
    popup.style.position = 'absolute';
    popup.style.right = `${window.innerWidth - right}px`; // Include horizontal scroll
    popup.style.top = `${rect.bottom + window.scrollY}px`; // Include vertical scroll

    popup.style.display = 'block';
}

function getFiltersFromDB(column) {
    const fileId = document.getElementById('spreadsheet').getAttribute('data-id');
    const sheet = getSelectedSheetIndex();
    const data = JSON.stringify({ fileId: fileId, sheet: sheet, column: column });

    return fetch("/filters/get/at", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: data
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Server couldn't find filters for specified column");

            return response.json();
        })
        .catch(error => console.error(error));
}

function populateFilterList(container, filters) { }