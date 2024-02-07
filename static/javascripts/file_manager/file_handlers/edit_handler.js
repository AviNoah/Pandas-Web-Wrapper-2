function handleEdit(editView, fileView, dataId) {
    console.log("handleEdit executed with dataId:", dataId);

    const filenameP = fileView.querySelector('p.file-name');

    if (filenameP.classList.contains('editing')) {
        filenameP.classList.remove('editing');
        return;  // Don't do anything besides marking it as un-editing
    }

    filenameP.classList.add('editing');

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

                fetch('/files/update/name', {
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
                        tooltipSpan.textContent = filenameP.textContent;  // Update contents of tooltip
                        handleTooltip(fileView.querySelector('span'));
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
        filenameP.classList.remove('editing');
        document.removeEventListener("click", clickedOutside);
        editView.removeEventListener("click", clickedEditAgain);
        filenameP.removeEventListener("keydown", pressedEnter);
    }

    // Listen until user finishes entering input
    filenameP.addEventListener('keydown', pressedEnter);

    document.addEventListener('click', clickedOutside);

    editView.addEventListener('click', clickedEditAgain);
}

function handleTooltip(tooltipSpan) {
    // TODO: Fix where tool tip spawns
    // Disable/enable tooltipSpan depending on length of file name
    if (tooltipSpan.textContent.length < 18)
        tooltipSpan.classList.add('short');
    else
        tooltipSpan.classList.remove('short');
}