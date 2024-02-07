import { addFilter } from "/scripts/spreadsheet/filter_handler.js";

export function viewFilterList(event, column) {
    const popUp = createPopup(column); // Make popup
    positionPopup(event.target, popUp); // position it under filter img
    document.addEventListener('click', (event) => closeFilterPopup(event));  // Listen to closing
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

    fetch("/templates/filter/filter_list.html")
        .then(response => {
            if (!response.ok)
                throw new Error("Server failed to retrieve filter template");

            return response.text();
        })
        .then(content => {
            const container = document.createElement('div');
            container.classList.add('filters-list-container');

            container.innerHTML = content;
            const filters_list = container.querySelector('filters-list');
            const filters = getFiltersFromDB();
            filters.then()

        })
        .catch(error => console.error(error));

    const filtersListDiv = document.createElement('div');
    filtersListDiv.classList.add("filters-list");

    // Create add button
    const addFilterDiv = document.createElement('div');
    addFilterDiv.classList.add('add-filter');
    addFilterDiv.classList.add('filter-item');
    addFilterDiv.addEventListener('click', () => addFilter(container, column));

    filtersListDiv.appendChild(addFilterDiv);

    // Populate filters list from DB

    return filtersListDiv;
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

function getFiltersFromDB() { }

function populateFilterList() { }