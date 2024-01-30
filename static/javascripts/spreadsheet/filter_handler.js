
function escapeRegExp(string) {
    // Escape regex
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Function to create a filter popup element
function createFilterPopup(filename, column) {
    // Check if a filter popup already exists and remove it
    const existingPopup = document.querySelector('.filter-popup');
    if (existingPopup) {
        existingPopup.parentNode.removeChild(existingPopup);
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

            // Make the filter submit button run process_input every time it is clicked
            document.getElementById('filter_submit_button').addEventListener('click', () => applyFilter(filename, column));
        }).catch(error => console.error(error))

    return filterPopup;
}

// Function to handle closing the filter popup
function closeFilterPopup(event) {
    const filterPopup = document.querySelector('.filter-popup');

    // Check if the clicked element or its parent is outside the filter popup
    if (!filterPopup)
        return;  // Not initialized yet

    if (event.target === filterPopup || filterPopup.contains(event.target)) {
        return;  // An element inside filterPopup was selected
    }

    // An element outside of filterPopup was selected
    filterPopup.style.display = 'none';
    document.removeEventListener('click', closeFilterPopup);
}

function addFilter(event, column) {
    // Show filter pop up at column

    const filename = sessionStorage.getItem('selected-file');
    const filterPopup = createFilterPopup(filename, column);

    // Get the position of the clicked filter image
    const rect = event.target.getBoundingClientRect();

    let right = rect.left + scrollX

    // Make sure it doesn't overflow
    right = Math.max(250, right);

    // Set the position of the filter popup relative to the clicked filter image
    filterPopup.style.position = 'absolute';
    filterPopup.style.right = `${window.innerWidth - right}px`; // Include horizontal scroll
    filterPopup.style.top = `${rect.bottom + window.scrollY}px`; // Include vertical scroll

    filterPopup.style.display = 'block';

    document.addEventListener('click', (event) => closeFilterPopup(event));
}

function applyFilter(filename, column) {
    // Get selected sheet
    const sheetNum = getSelectedSheetIndex();

    // Get the selected filter type
    const selection = document.getElementById('filter_selector').value;

    // Get the filter input value
    const patternInput = document.getElementById('filter_input').value;

    console.log(`Pattern input is: ${patternInput} for selection ${selection} on column ${column}`)

    const escapedPatternInput = escapeRegExp(patternInput);

    // by default make it enabled because it has been added from the spreadsheet view
    const data = { 'filename': filename, 'sheet': sheetNum, 'column': column, 'method': selection, 'input': escapedPatternInput, 'enabled': true };

    // Save new filter
    fetch("/filter/update", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            // Check if it's successful
            if (!response.ok) {
                throw new Error(`Failed to add error`);
            }

            changeSheet();  // Update sheet with new filter
            return response.json();
        })
        .then(responseData => {
            // Log the response data
            console.log(responseData);
        })
        .catch(error => {
            // Handle errors
            console.error("Error:", error);
        });
}
