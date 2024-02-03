import { addFilter } from "/resources/javascripts/spreadsheet/filter_handler.js";

const spreadsheetElement = document.getElementById('spreadsheet');
spreadsheetElement.setAttribute('data-id', '1');  // Will be changed when clicking on another file

function updateSpreadsheetElement(sheet, editable = false) {
    // Convert sheet data to HTML with grid lines
    const html = XLSX.utils.sheet_to_html(sheet, { editable: editable, showGridLines: true });

    // Display the HTML in the spreadsheet div
    spreadsheetElement.innerHTML = html;

    // Mark header rows as header-cell
    const firstRowCells = spreadsheetElement.querySelectorAll('tr:first-child td');

    fetch('/templates/spreadsheet/header_cell.html')
        .then(response => {
            if (!response.ok)
                throw new Error("Server did not respond");

            return response.text;
        })
        .then(content => {
            firstRowCells.forEach(cell => {
                const oldText = cell.textContent;

                cell.classList.add('header-cell');
                cell.innerHTML = content;

                cell.querySelector('div[name="cell-name"]').textContent = oldText;

                // Apply filter when the filter image is clicked; cellIndex is 0-based
                filterImg.addEventListener('click', (event) => addFilter(event, cell.cellIndex));
            })
        })
        .catch(error => console.error(error));
}

// Fetch sheet and call to updateSpreadsheet
function openSheet(sheet_num) {
    data = { fileId: spreadsheetElement.getAttribute('data-id'), sheet: sheet_num };

    fetch('/files/get/sheet', {
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

function openFile(id) {
    const data = JSON.stringify({ fileId: id })

    fetch('/files/get/sheet_count', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: data,
    })
        .then(response => {
            if (!response)
                throw new Error("Server didn't respond");

            return response.json();
        })
        .then(json => {
            if (!json.hasOwnProperty('sheets'))
                throw new Error("Sheet count was not included in response");

            return json.sheets;
        })
        .then(sheet_count => {
            spreadsheetElement.setAttribute('data-id', id);
            openSheet(0);  // Start at first sheet, sheets are 0-based indices

            adjustSpinner(sheet_count);
        })
        .catch(error => console.error(error));
}

document.addEventListener('DOMContentLoaded', openFile(5));