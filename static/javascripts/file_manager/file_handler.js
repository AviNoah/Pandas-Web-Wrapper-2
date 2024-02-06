function handleSelect(fileView, dataId) {
    console.log("handleSelect executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index will handle communication
    parent.postMessage(JSON.stringify(data), target);
}

function handleEdit(editView, fileView, dataId) {
    console.log("handleEdit executed with dataId:", dataId);

    if (editView.classList.contains('clicked')) {
        editView.classList.remove('clicked');
        return;  // Don't do anything besides marking it as un-clicked
    }

    editView.classList.add('clicked');

    const filenameP = fileView.querySelector('p.file-name');
    const tooltipSpan = fileView.querySelector('span');
    const oldName = filenameP.textContent;

    filenameP.focus();
    filenameP.setAttribute('contenteditable', true);
    const submitRename = function () {
        removeListeners();  // Remove listeners

        const data = JSON.stringify({ filename: filenameP.textContent });
        fetch('/files/update/name/validate', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: data
        })
            .then(response => {
                if (!response.ok) {
                    alert("Invalid file name");
                    throw new Error("Invalid file name");
                }

                return response.json();
            })
            .then(json => {
                if (!json.hasOwnProperty("name"))
                    throw new Error("Response json doesn't have name key");

                return json.name;
            })
            .then((name) => {
                const data = JSON.stringify({ fileId: dataId, name })

                fetch('files/update/name', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: data
                })
                    .then(response => {
                        if (!response.ok)
                            throw new Error("Failed to update name");

                        filenameP.setAttribute('contenteditable', false);
                        filenameP.removeEventListener('keydown');
                        tooltipSpan.textContent = filenameP.textContent;

                    })
            })
            .catch(error => {
                filenameP.textContent = oldName;  // Revert to old name
                filenameP.setAttribute('contenteditable', false);
                console.error(error);
            });

    };

    const pressedEnter = function (event) {
        if (event.key !== "Enter")
            return;  // Ignore any other key


        submitRename();
    }

    const clickedOutside = function (event) {
        if (event.target.classList.contains("edit"))
            return;  // ignore clicking on edit

        if (filenameP.parentElement.contains(event.target) ||
            filenameP.parentElement === event.target)
            return;  // ignore clicking on a text container

        submitRename()
    }

    const clickedEditAgain = function () {
        submitRename();
    }

    const removeListeners = function () {
        editView.classList.remove('clicked');
        document.removeEventListener("click", clickedOutside);
        editView.removeEventListener("click", clickedEditAgain);
        filenameP.removeEventListener("keydown", pressedEnter);
    }

    // Listen until user finishes entering input
    filenameP.addEventListener('keydown', pressedEnter);

    document.addEventListener('click', clickedOutside);

    editView.addEventListener('click', clickedEditAgain);
}

function handleQueryList(fileView, dataId) {
    console.log("handleQueryList executed with dataId:", dataId);
}

function handleDownload(dataId) {
    console.log("handleDownload executed with dataId:", dataId);

    const data = JSON.stringify({ fileId: dataId });

    fetch("/files/get/download", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: data
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Server did not find file");

            // Extract filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = contentDisposition.split('filename=')[1].trim();

            filename = filename.replace(/^_+|_+$"/g, '').replace(/^"+|"+$/g, '');  // Remove trailing white

            response.blob().then(blob => {
                // Handle the Blob data, for example, create a URL for downloading
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            });
        })

        .catch(error => console.error(error));

}

function handleDelete(fileView, dataId) {
    console.log("handleDelete executed with dataId:", dataId);

    const choice = confirm("Are you sure you want to delete this file?");

    if (!choice)
        return;  // User declined

    const data = JSON.stringify({ fileId: dataId });

    fetch("/files/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: data
    })
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to delete file");

            console.log("Deleted file successfully");
            fileView.parentElement.removeChild(fileView);  // Remove view
            return response;
        })
}