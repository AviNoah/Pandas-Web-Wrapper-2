const folderDiv = document.getElementById('drop-zone');

export function addFiles(passedIds) {
    Array.from(passedIds).forEach(id => {
        const data = JSON.stringify({ fileId: id });
        fetch("/files/get", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: data
        })
            .then(response => {
                if (!response.ok)
                    throw new Error("Server did not respond");

                return response.blob();
            })
            .then(blob => {
                addFileView(blob, id);
                console.log(`Added file view for ${blob.name}`);
            })
            .catch(error => console.error(error))

    });
}

function addFileView(file, id) {
    const fileViewDiv = document.createElement('div');

    // Make file-view
    fetch("/templates/file_manager/file.html")
        .then(response => {
            if (!response.ok)
                throw new console.error("Failed fetching file view template");

            return response.text();
        })
        .then((content) => {
            fileViewDiv.innerHTML = content;

            // Update file name
            const paragraphDiv = fileViewDiv.querySelector('p');
            paragraphDiv.textContent = file.name;

            const tooltipDiv = fileViewDiv.querySelector('span');
            tooltipDiv.textContent = file.name;

            // Append filename data to element
            fileViewDiv.setAttribute('data-file-id', id);
            fileViewDiv.classList.add('file-view');

            folderDiv.appendChild(fileViewDiv);
        })
        .catch(error => console.error(error));
}