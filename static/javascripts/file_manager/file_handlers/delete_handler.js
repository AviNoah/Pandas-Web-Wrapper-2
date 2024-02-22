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

            if (fileView.classList.contains('select')) {
                // Close spreadsheet
                parent.postMessage(JSON.stringify({}), "/");
            }
            fileView.parentElement.removeChild(fileView);  // Remove view
            return response;
        })
}