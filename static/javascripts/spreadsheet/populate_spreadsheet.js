// Get reference to spreadsheet element div
const spreadsheetElement = document.getElementById('spreadsheet');

// Get reference to the selected sheet spinner element
const selectedSheetSpinner = document.getElementById('sheetSelector');
selectedSheetSpinner.addEventListener('change', changeSheet);

// Function to handle changes in the selected sheet spinner
function changeSheet() {
    data = { filename: sessionStorage.getItem("selected-file"), sheet: getSelectedSheetIndex() }

    fetch('/file/get/sheet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return response.blob();  // Return the response as a blob
    }).then(blob => {
        reader = new FileReader();

        reader.onload = function (event) {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });

            const sheetName = workbook.SheetNames[0];  // /file/get/sheet returns only one sheet.
            const sheet = workbook.Sheets[sheetName];

            // Update the spreadsheet element
            updateSpreadsheetElement(sheet);
        }

        reader.readAsBinaryString(blob);
        // Return a Promise to maintain the asynchronous behavior
        return Promise.resolve("Changed sheet successfully");
    }).catch(error => console.error("Error while parsing selected workbook :", error));
}

function updateSpreadsheetElement(sheet, editable = false) {
    // Convert sheet data to HTML with grid lines
    const html = XLSX.utils.sheet_to_html(sheet, { editable: editable, showGridLines: true });

    // Display the HTML in the spreadsheet div
    spreadsheetElement.innerHTML = html;

    // Mark header rows as header-cell
    const firstRowCells = spreadsheetElement.querySelectorAll('tr:first-child td');
    firstRowCells.forEach(cell => {
        cell.classList.add('header-cell');

        // Create a wrapper div for proper spacing
        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('wrapper')

        // Design header cell
        const filterImg = document.createElement('img');
        filterImg.alt = 'Filter';
        filterImg.classList.add("filter");

        // Fetch src
        fetch('/resources/images/Filter.svg')
            .then(response => {
                if (!response.ok) {
                    throw new Error("Could not retrieve filter src");
                }
                return response.url; // Return the URL from the response
            })
            .then(imageUrl => {
                // Set the src attribute of the image element
                filterImg.src = imageUrl;
            })
            .catch(error => console.error('Error fetching image:', error));



        const cellName = document.createTextNode(cell.textContent);

        wrapperDiv.appendChild(cellName);
        wrapperDiv.appendChild(filterImg);

        // Clear the original content and append the wrapper div
        cell.innerHTML = '';
        cell.appendChild(wrapperDiv);

        // Apply filter when the filter image is clicked
        filterImg.addEventListener('click', (event) => addFilter(event, cell.cellIndex));  // cellIndex is 0-based
    });
}

function openFile(filePromise, filename, sheetCount) {
    filePromise.then((file) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                const data = event.target.result;  // Result of file read
                const workbook = XLSX.read(data, { type: 'binary' })

                // Always start on the first page
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                updateSpreadsheetElement(sheet);

                // Adjust the spinner based on the number of sheets
                adjustSpinner(sheetCount);

                // Save file name to sessionStorage.
                sessionStorage.setItem('selected-file', filename);
            } catch (error) {
                console.error("Error reading the Excel file:", error);
            }
        }

        reader.readAsBinaryString(file);
    });
}


// TODO: Remove test file later
document.addEventListener('DOMContentLoaded', function (event) {
    fetch("/spreadsheet/upload/test_file")
        .then(response => {
            if (!response.ok) {
                throw new Error('Test file was not retrieved');
            }
            if (!response.headers.has('File-Name'))
                throw new Error("File name was not specified in headers");

            const filename = response.headers.get('File-Name');
            const sheetCount = response.headers.get('Sheet-Count');

            return { blob: response.blob(), filename: filename, sheetCount: sheetCount };  // Extract response as blob
        })
        .then(({ blob, filename, sheetCount }) => {
            openFile(blob, filename, sheetCount);
        })
        .catch(error => {
            console.error('Error fetching the test file:', error);
        });
});
