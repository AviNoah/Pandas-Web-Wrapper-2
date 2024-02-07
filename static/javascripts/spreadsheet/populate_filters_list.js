import { handleFilter } from "/scripts/spreadsheet/filter_handler.js";
import { getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";

export function viewFilterList(event, column) {
    const popUp = createPopup(column); // Make popup
    popUp.then((popUp) => {
        document.body.appendChild(popUp);
        positionPopup(event.target, popUp); // position it under filter img
        document.addEventListener('click', (event) => clickedOutsideOfPopup(event));  // Listen to closing
    })
}

function closePopup() {
    // TODO: Fix this, it doesnt close it correctly
    // Create popup at view target
    const existingPopup = document.querySelector('.filters-list-container');
    if (existingPopup) {
        existingPopup.parentNode.removeChild(existingPopup);  // Close existing
    }

    document.removeEventListener('click', clickedOutsideOfPopup);
}

function createPopup(column) {
    closePopup();  // Close old pop up

    return fetch("/templates/filter/filters_list.html")
        .then(response => {
            if (!response.ok)
                throw new Error("Server failed to retrieve filter list template");

            return response.text();
        })
        .then(content => {
            const container = document.createElement('div');
            container.classList.add('filters-list-container');

            container.innerHTML = content;
            const addFiltersButton = container.querySelector(".add-filter");
            const filtersList = container.querySelector(".filters-list");

            // Make it produce a new filter item when clicked
            addFiltersButton.addEventListener("click", () => addNewFilterView(filtersList, column));

            // Populate filters from DB
            return getFiltersFromDB(column)
                .then((filters) => populateFilterList(filtersList, filters)
                    .then(() => {
                        addSeparators(filtersList);
                        return container;
                    })
                );
        })
        .catch(error => console.error(error));
}

function clickedOutsideOfPopup(event) {
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

function populateFilterList(container, filters) {
    return fetch("/templates/filter/filter.html")
        .then(response => {
            if (!response.ok)
                throw new Error("Server failed to retrieve filter template");

            return response.text();
        })
        .then(content => {
            // Each filter contains input, method, enabled keys 
            Array.from(filters).forEach(filter => {
                const filterItem = document.createElement('div');
                filterItem.classList.add("filter-item");
                filterItem.innerHTML = content;

                populateFilterItem(filterItem, filter);

                container.appendChild(filterItem);
            })
        })
}

function populateFilterItem(filterItem, filterData) {
    // Populate data
    const methodSelector = filterItem.querySelector('select[name="filter-selector"]');
    methodSelector.value = filterData.method;

    const inputField = filterItem.querySelector('input[name="filter-input"]');
    inputField.value = filterData.input;

    const visibilityIcon = filterItem.querySelector('img[name="visibility-icon"]');

    if (filterData.enabled)
        visibilityIcon.classList.add('toggled');
    else
        visibilityIcon.classList.remove('toggled');

    // Add listeners and handling
    handleFilter(filterItem);
}

function addSeparators(container) {
    // Iterate over each child element of the container
    const children = Array.from(container.children);

    // Iterate over the children array and insert separators
    for (let i = 1; i < children.length; i++) {
        const separator = document.createElement('div');
        separator.classList.add('separator');
        container.insertBefore(separator, children[i]);
    }

    return container;
}

function addNewFilterView(container, column) {
    // Add a new filter view to the container
    fetch('/templates/filter/filter.html')
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to fetch filter template");

            return response.text();
        })
        .then(content => {
            const filterItemView = document.createElement('div');
            filterItemView.classList.add('filter-item');
            filterItemView.innerHTML = content;

            handleFilter(filterItemView, column);

            container.insertBefore(filterItemView, container.children[0]);  // Push to top
            return;
        }).catch(error => console.error(error))

    return filterPopup;
}