import { viewFilterList, closePopup } from "/scripts/spreadsheet/populate_filters_list.js"
import { adjustSpinner, getSelectedSheetIndex } from "/scripts/spreadsheet/sheet_selector_handler.js";
import { initTooltipTriggerEl } from "/scripts/tooltip/tooltipHandler.js";

const spreadsheetElement = document.getElementById('spreadsheet');

function updateSpreadsheetElement(sheet, editable = false) {
    // Convert sheet data to HTML with grid lines
    const html = XLSX.utils.sheet_to_html(sheet, { editable: editable, showGridLines: true });

    closePopup();  // Close filters list pop up

    // Display the HTML in the spreadsheet div
    spreadsheetElement.innerHTML = html;

    // Mark header rows as header-cell
    const firstRowCells = spreadsheetElement.querySelectorAll('tr:first-child td');

    return new Promise((resolve, reject) => {
        const content = sessionStorage.getItem("headerCellTemplate");
        if (content === null)
            reject();

        firstRowCells.forEach(cell => {
            const oldText = cell.textContent;

            cell.classList.add('header-cell');
            cell.innerHTML = content;

            cell.querySelector('div[name="cell-name"]').textContent = oldText;

            const cellFilterImg = cell.querySelector('img[name="cell-filter"]');
            initTooltipTriggerEl(cellFilterImg);
            // Apply filter when the filter image is clicked; cellIndex is 0-based
            cellFilterImg.addEventListener('click', (event) => viewFilterList(event, cell.cellIndex));
        })

        resolve();
    });
}

// Fetch sheet and call to updateSpreadsheet
export function openSheet(sheet_num) {
    const data = { fileId: spreadsheetElement.getAttribute('data-id'), sheet: sheet_num };

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
        const reader = new FileReader();

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

// Add event listener to enable switching sheets
const selectedSheetSpinner = document.getElementById('sheetSelector');
selectedSheetSpinner.addEventListener('change', () => {
    openSheet(getSelectedSheetIndex());
});

function cacheTemplate(url, name) {
    // Cache template
    fetch(url)
        .then(response => {
            if (!response.ok)
                throw new Error("Server failed to retrieve template");

            return response.text();
        })
        .then((content) => {
            // Cache template
            sessionStorage.setItem(name, content);
        })
        .catch(error => console.error(error));
}


function fetchTemplates() {
    cacheTemplate("/templates/spreadsheet/header_cell.html", "headerCellTemplate");
}

window.addEventListener('message', (event) => {
    // Reject any messages not from parent of iframe
    if (event.source !== parent)
        return;

    const jsonData = JSON.parse(event.data);
    const fileId = parseInt(jsonData.fileId, 10);
    const s = document.getElementById('spreadsheet');

    openFile(fileId);
    s.setAttribute('data-id', fileId);
})

// Preload templates on DOM content load
document.addEventListener('DOMContentLoaded', fetchTemplates);