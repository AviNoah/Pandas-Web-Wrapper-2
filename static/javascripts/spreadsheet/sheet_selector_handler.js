
const selectedSheetSpinner = document.getElementById('sheetSelector');
// Function to adjust the selected sheet spinner properties
export function adjustSpinner(sheetCount) {
    // Set the value to 1 and change the maximum value to sheet count
    selectedSheetSpinner.value = 1;
    selectedSheetSpinner.max = sheetCount;
}

// Function to fetch index adjusted for 0-based indexing
export function getSelectedSheetIndex() {
    return selectedSheetSpinner.value - 1;
}
