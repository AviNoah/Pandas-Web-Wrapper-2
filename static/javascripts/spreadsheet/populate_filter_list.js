import { addFilter } from "/scripts/spreadsheet/filter_handler.js";

export function populateFilterList(event, column) {
    const popUp = createPopup(column); // Make popup
    positionPopup(event.target, popUp); // position it under filter img
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