import { getSelectedSheetIndex } from "/resources/javascripts/spreadsheet/sheet_selector_handler.js";

function escapeRegExp(string) {
    // Escape regex
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function addFilter(event, column) {
    // Create filter pop up and attach an event listener to it to send filter data
    const popUp = createPopup(column); // Make popup
    positionPopup(event.target, popUp); // position it under filter img
    document.addEventListener('click', (event) => closeFilterPopup(event));  // Listen to closing
}

function applyFilter(column) {
    const data = {
        fileId: document.getElementById("spreadsheet").getAttribute('data-id'),
        sheet: getSelectedSheetIndex(),
        column: column,
        method: document.getElementById("filter-selector").value,
        input: escapeRegExp(document.getElementById('filter-input').value),
        enabled: Boolean(document.getElementById("visibility-icon").classList.contains('toggled')),
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

function createPopup(column) {
    // Create popup at view target
    const existingPopup = document.querySelector('.filter-popup');
    if (existingPopup) {
        existingPopup.parentNode.removeChild(existingPopup);  // Close existing
    }


    // Create a filter popup element
    const filterPopup = document.createElement('div');
    filterPopup.className = 'filter-popup';
    fetch('/templates/spreadsheet/filter_popup.html').then(response => {
        if (!response.ok) {
            console.error("Failed to fetch filterPopup html file");
            return null;
        }
        return response.text();
    })
        .then(content => {
            filterPopup.innerHTML = content;
            document.body.appendChild(filterPopup);

            const submitBtn = document.getElementById('filter-submit-button');
            // Make the filter submit button run process_input every time it is clicked
            submitBtn.addEventListener('click', () => applyFilter(column));
            submitBtn.classList.add("disabled");

            const handleChange = () => {
                submitBtn.classList.remove("disabled");

                filterPopup.removeEventListener('input', handleChange);
                filterPopup.removeEventListener('change', handleChange);
            };

            filterPopup.addEventListener('input', handleChange);
            filterPopup.addEventListener('change', handleChange);

            const filterImg = document.getElementById('visibility-icon');
            // Add a listener to toggle View on and off
            filterImg.addEventListener('click', (event) => toggleFilter(event));
            filterImg.addEventListener('dragstart', (event) => {
                event.preventDefault();  // Prevent dragging image
            })

            const deleteImg = document.getElementById('delete-icon');
            deleteImg.addEventListener('click', () => closeFilterPopup(filterPopup));

        }).catch(error => console.error(error))

    return filterPopup;
}

function toggleFilter(event) {
    // Toggle view on and off
    const imageDiv = event.target;
    let url;
    let alt;
    if (imageDiv.classList.contains('toggled')) {
        // Toggle off == hide
        imageDiv.classList.remove('toggled');
        url = "/resources/images/Hide.svg";
        alt = "Hide";
    }
    else {
        // Toggle on == show
        imageDiv.classList.add('toggled');
        url = "/resources/images/View.svg";
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

function closeFilterPopup(event) {
    // Function to handle closing the filter popup
    const filterPopup = document.querySelector('.filter-popup');

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