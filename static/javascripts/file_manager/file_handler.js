function handleSelect(event, dataId) {
    console.log("handleSelect executed with dataId:", dataId);
    data = { fileId: dataId };
    target = "/";  // Index will handle communication
    parent.postMessage(JSON.stringify(data), target);
}

function handleEdit(event, dataId) {
    console.log("handleEdit executed with dataId:", dataId);
}

function handleQueryList(event, dataId) {
    console.log("handleQueryList executed with dataId:", dataId);
}

function handleDownload(event, dataId) {
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

function handleDelete(event, dataId) {
    console.log("handleDelete executed with dataId:", dataId);
}