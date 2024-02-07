import { addFilter } from "/scripts/spreadsheet/filter_handler.js";

export function populateFilterList(event, column) {
    const popUp = createPopup(column); // Make popup
    positionPopup(event.target, popUp); // position it under filter img
    document.addEventListener('click', (event) => closeFilterPopup(event));  // Listen to closing
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
    closePopupHelper(filterPopup);
}

function closePopupHelper(filterPopup) {
    filterPopup.style.display = 'none';
    document.removeEventListener('click', closeFilterPopup);
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