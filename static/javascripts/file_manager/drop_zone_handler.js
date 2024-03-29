import { addFiles } from "./populate_folder.js";

// Handle dropping files into folder
const dropArea = document.getElementById('drop-zone')

function handleDragEnter() {
    dropArea.classList.add('dragover');
}

function handleDragLeave() {
    dropArea.classList.remove('dragover');
}

function handleDragOver(e) {
    e.preventDefault();
    handleDragEnter();
}

function handleDrop(e) {
    e.preventDefault();
    handleDragLeave();

    // Check if the drop occurred on the zone or its children
    if (dropArea.contains(e.target)) {
        handleDroppedFiles(e);  // Accept dropped files
    }
}

function handleDroppedFiles(event) {
    const files = Array.from(event.dataTransfer.files);

    // Create a FormData object
    const formDataAllFiles = new FormData();
    files.forEach((file, index) => {
        formDataAllFiles.append(`file${index}`, file, file.name);
        formDataAllFiles.append(`index`, index);
    });

    fetch('/files/validate', {
        method: "POST",
        body: formDataAllFiles
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to validate files, upload failed");

            return response.json();
        })
        .then(json => {
            if (!json.hasOwnProperty('acceptedIndices')) {
                throw new Error("Response from server does not contain acceptedIndices");
            }
            return json
        })
        .then(json => {
            // Separate accepted and dropped files
            const acceptedIndices = json.acceptedIndices;
            const passedFiles = [];
            const failedFiles = [];
            files.forEach((file, index) => {
                if (acceptedIndices.includes(String(index))) {
                    passedFiles.push(file);
                } else {
                    failedFiles.push(file);
                }
            });

            return { passed: passedFiles, dropped: failedFiles };
        })
        .then(({ passed, dropped }) => {
            if (dropped)
                console.warn(`Warning: these files have invalid extensions and have been dropped: ${dropped.join(", ")}`);
            return passed;
        })
        .then(passedFiles => {
            const formDataPassedFiles = new FormData();

            passedFiles.forEach((file, index) => {
                formDataPassedFiles.append(`file${index}`, file, file.name);
            })

            return { formData: formDataPassedFiles, passedFiles: passedFiles };
        })
        .then(({ formData, passedFiles }) => {

            fetch('/files/upload', {
                method: 'POST',
                body: formData,
            })
                .then(response => {
                    if (!response.ok)
                        console.error("Server didn't receive files.");

                    return response.json();
                })
                .then(json => {
                    if (!json.hasOwnProperty('passed')) {
                        throw new Error("Response from server does not contain passed files");
                    }
                    return json;
                })
                .then(json => {
                    // TODO attach the ID returned from the database to each of the created file-views.
                    const passedIds = json.passed;

                    if (passedFiles.length > 0) {
                        console.log('Files added successfully');
                        addFiles(passedIds);  // Send only valid files
                    }
                })
                .catch(error => {
                    console.error(`These files weren't added successfully ${passedFiles}\n${error}`);
                });
        })
        .catch(error => console.error(error));
}

function handlePopulated(container) {
    // Check if the container has any children
    if (container.children.length > 0) {
        // Add the "populated" tag if it has children
        container.classList.add('populated');
    } else {
        // Remove the "populated" tag if it has no children
        container.classList.remove('populated');
    }
}

// Create a new instance of MutationObserver
const observePopulation = new MutationObserver(() => {
    // Call handlePopulated function whenever there's a change
    handlePopulated(dropArea);
});

// Configure the MutationObserver to observe child list changes
const config = { childList: true };

// Start observing the target node for configured mutations
observePopulation.observe(dropArea, config);

// Attach event listeners
document.addEventListener('dragenter', handleDragEnter);
document.addEventListener('dragleave', handleDragLeave);
document.addEventListener('dragover', handleDragOver);
document.addEventListener('drop', handleDrop);