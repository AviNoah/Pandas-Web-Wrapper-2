import { getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";
import { openSheet } from "/scripts/spreadsheet/populate_spreadsheet.js";

function escapeRegExp(string) {
    // Escape regex
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function addFilter(container, column) {
    // Create filter pop up and attach an event listener to it to send filter data
    const popUp = createPopup(column); // Make popup
}

function applyFilter(column) {
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

function createPopup(column) {
    // Create a filter popup element
    const filterPopup = document.createElement('div');
    filterPopup.className = 'filter-popup';
    fetch('/templates/filter/filter.html').then(response => {
        if (!response.ok) {
            console.error("Failed to fetch filterPopup html file");
            return null;
        }
        return response.text();
    })
        .then(content => {
            filterPopup.innerHTML = content;
            document.body.appendChild(filterPopup);

            const submitBtn = document.querySelector('button[name="filter-submit-button"]');

            submitBtn.addEventListener('click', () => {
                if (!submitBtn.classList.contains("disabled")) {
                    applyFilter(column);  // Apply only if not disabled
                }
            });
            submitBtn.classList.add("disabled");

            const handleChange = () => {
                submitBtn.classList.remove("disabled");

                filterPopup.removeEventListener('input', handleChange);
                filterPopup.removeEventListener('change', handleChange);
            };

            filterPopup.addEventListener('input', handleChange);
            filterPopup.addEventListener('change', handleChange);

            const filterImg = document.querySelector('img[name="visibility-icon"]');
            // Add a listener to toggle View on and off
            filterImg.addEventListener('click', (event) => toggleFilter(event));
            filterImg.addEventListener('dragstart', (event) => {
                event.preventDefault();  // Prevent dragging image
            })

            const deleteImg = document.querySelector('img[name="delete-icon"]');
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
