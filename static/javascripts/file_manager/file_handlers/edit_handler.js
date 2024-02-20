import { initTooltipTriggerEl } from "/scripts/tooltip/tooltipHandler.js";
import { truncateText } from "/scripts/file_manager/populate_folder.js";


function handleEdit(editView, fileView, dataId) {
    console.log("handleEdit executed with dataId:", dataId);

    const filenameSpan = fileView.querySelector('span.file-name');

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
                        initTooltipTriggerEl(filenameSpan);
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

    // TODO: Fix clicked edit again
    const clickedEditAgain = function (event) {
        event.preventDefault();
        submitRename();
    };

    const removeListeners = function () {
        filenameSpan.classList.remove('editing');
        document.removeEventListener("click", clickedOutside);
        editView.removeEventListener("click", clickedEditAgain);
        filenameSpan.removeEventListener("keydown", pressedEnter);
    };

    if (filenameSpan.classList.contains('editing')) {
        removeListeners();
        return;  // Simply un-toggle.
    };

    filenameSpan.classList.add('editing');

    const oldName = filenameSpan.textContent;
    filenameSpan.focus();
    filenameSpan.setAttribute('contenteditable', true);
    filenameSpan.textContent = filenameSpan.getAttribute('data-tooltip');

    // Listen until user finishes entering input
    filenameSpan.addEventListener('keydown', pressedEnter);

    document.addEventListener('click', clickedOutside);

    editView.addEventListener('click', clickedEditAgain);
}

export { handleEdit };