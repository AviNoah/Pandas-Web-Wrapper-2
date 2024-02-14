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

function addFileView(filename, id) {
    const fileViewDiv = document.createElement('div');

    // Check if the template is already cached
    const templateContent = sessionStorage.getItem("fileViewTemplate")
    if (templateContent === null) {
        console.error('Template was not found in cache!');
        return;
    }

    processTemplate(templateContent, filename, id, fileViewDiv);
}

// Function to process template content and add file view
function processTemplate(templateContent, filename, id, fileViewDiv) {
    fileViewDiv.innerHTML = templateContent;

    // Update file name
    const paragraphDiv = fileViewDiv.querySelector('p');
    paragraphDiv.textContent = filename;

    const tooltipDiv = fileViewDiv.querySelector('span');
    tooltipDiv.textContent = filename;
    handleTooltip(tooltipDiv);

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