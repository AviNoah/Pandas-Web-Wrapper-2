import { initTooltipTriggerEl } from "/scripts/tooltip/tooltipHandler.js";

const folderDiv = document.getElementById('drop-zone');

export function addFiles(passedIds) {
    Array.from(passedIds).forEach(id => {
        const data = JSON.stringify({ fileId: id });
        fetch("/files/get/name", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: data
        })
            .then(response => {
                if (!response.ok)
                    throw new Error("Server did not respond");

                return response.json();
            })
            .then(json => {
                if (!json.hasOwnProperty("name") || !json.hasOwnProperty("ext"))
                    throw new Error("Name or ext keys are missing from response");

                return { name: json.name, ext: json.ext };
            })
            .then(({ name, ext }) => {
                addFileView(name, id);
                console.log(`Added file view for ${name + ext}`);
            })
            .catch(error => console.error(error))

    });
}

// Function to truncate text
function truncateText(text, maxLength = 20) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...'; // Truncate text if it exceeds maxLength
    } else {
        return text;
    }
}

function addFileView(filename, id) {
    const fileViewDiv = document.createElement('div');

    // Check if the template is already cached
    const templateContent = sessionStorage.getItem("fileViewTemplate")
    if (templateContent === null) {
        console.error('Template was not found in cache!');
        return;
    }

    fileViewDiv.innerHTML = templateContent;

    // Update file name
    const tooltipTriggerDiv = fileViewDiv.querySelector('.tooltip.file-name');
    tooltipTriggerDiv.textContent = truncateText(filename, 20);
    tooltipTriggerDiv.setAttribute('data-tooltip', filename);
    initTooltipTriggerEl(tooltipTriggerDiv);

    const buttons = fileViewDiv.querySelector('.buttons-wrapper').children;
    Array.from(buttons).forEach(initTooltipTriggerEl);

    // Append filename data to element
    fileViewDiv.setAttribute('data-id', id);
    fileViewDiv.classList.add('file-view');

    folderDiv.appendChild(fileViewDiv);
}

function loadFilesFromDB() {
    // Add files from DB to view
    const dropArea = document.getElementById('drop-zone')

    fetch("/files/get/all")
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to retrieve files");

            return response.json();
        })
        .then(fileIds => {
            // Files is a list of valid ids
            if (fileIds.length > 0) {
                addFiles(fileIds)
                dropArea.classList.add('populated');  // Mark as already populated - remove hint to drag files
            }
        })
        .catch(error => console.error(error))
}

function fetchTemplates() {
    // Fetch file view template
    fetch("/templates/file_manager/file.html")
        .then(response => {
            if (!response.ok)
                throw new Error("Failed fetching file view template");

            return response.text();
        })
        .then((content) => {
            // Cache template
            sessionStorage.setItem('fileViewTemplate', content);
        })
        .catch(error => console.error(error));
}

// Don't allow any image from the folder to be dragged.
folderDiv.addEventListener('dragstart', (event) => {
    if (event.target.tagName === 'IMG')
        event.preventDefault();
})


// TODO: maybe we want each tab to have its own environment? consider disabling this
document.addEventListener('DOMContentLoaded', () => {
    loadFilesFromDB();
    fetchTemplates();
})