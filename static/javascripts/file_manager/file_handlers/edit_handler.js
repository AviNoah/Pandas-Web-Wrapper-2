function truncateText(text, maxLength = 20) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...'; // Truncate text if it exceeds maxLength
    } else {
        return text;
    }
}

function handleEdit(editView, fileView, dataId) {
    console.log("handleEdit executed with dataId:", dataId);

    const filenameSpan = fileView.querySelector('span.file-name');

    if (filenameSpan.classList.contains('editing')) {
        filenameSpan.classList.remove('editing');
        return;  // Simply un-toggle.
    };

    const submitRename = function () {
        removeListeners();  // Remove listeners

        const data = JSON.stringify({ filename: filenameSpan.textContent });
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

                        const newName = filenameSpan.textContent;
                        filenameSpan.textContent = truncateText(newName);
                        filenameSpan.setAttribute('data-tooltip', newName);
                        filenameSpan.setAttribute('contenteditable', false);
                    })
            })
            .catch(error => {
                filenameSpan.textContent = oldName;  // Revert to old name
                filenameSpan.setAttribute('contenteditable', false);
                console.error(error);
            });

    };

    const pressedEnter = function (event) {
        if (event.key !== "Enter")
            return;  // Ignore any other key


        submitRename();
    };

    const clickedOutside = function (event) {
        if (event.target.classList.contains("edit"))
            return;  // ignore clicking on edit

        if (filenameSpan.parentElement.contains(event.target) ||
            filenameSpan.parentElement === event.target)
            return;  // ignore clicking on a text container

        submitRename()
    };

    const clickedEditAgain = function () {
        submitRename();
    };

    const removeListeners = function () {
        filenameSpan.classList.remove('editing');
        document.removeEventListener("click", clickedOutside);
        editView.removeEventListener("click", clickedEditAgain);
        filenameSpan.removeEventListener("keydown", pressedEnter);
    };

    filenameSpan.classList.add('editing');

    const oldName = filenameSpan.textContent;
    filenameSpan.focus();
    filenameSpan.setAttribute('contenteditable', true);


    // Listen until user finishes entering input
    filenameSpan.addEventListener('keydown', pressedEnter);

    document.addEventListener('click', clickedOutside);

    editView.addEventListener('click', clickedEditAgain);
}