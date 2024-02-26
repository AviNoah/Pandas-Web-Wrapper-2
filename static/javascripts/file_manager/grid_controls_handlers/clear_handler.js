function handleClear() {
    // TODO: After implementing sessions, clear these files from session files
    const dropzone = document.getElementById("drop-zone");
    const choice = confirm("Clear grid? this will remove all files from session!");

    if (!choice)
        return;

    while (dropzone.children.length !== 0)
        dropzone.removeChild(dropzone.firstChild);


    fetch("/files/delete/all",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: "",
        })
        .then(response => {
            if (!response.ok)
                throw new Error("Failed to delete files from session");

            return response.json();
        })
        .then(json => {
            if (!json.hasOwnProperty("message"))
                throw new Error("Json has no message key");

            return json.message;
        })
        .then(message => console.log(message))
        .catch(error => console.error(error));

    data = {};
    target = "/";  // Index homepage will handle communication
    parent.postMessage(JSON.stringify(data), target);
    console.log("Cleared file grid");
}