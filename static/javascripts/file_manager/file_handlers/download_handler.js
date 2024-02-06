
function handleDownload(dataId) {
    // TODO: Fix downloading files with hebrew text in them
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

            return response.blob();
        })
        .then(blob => {
            fetch("/files/get/name", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: data
            })
                .then(response => {
                    if (!response.ok)
                        throw new Error("Server did not find file");

                    return response.json();
                })
                .then(json => {
                    if (!json.hasOwnProperty("name"))
                        throw new Error("Response json doesn't have name key");

                    return json.name;
                })
                .then(filename => {

                    // Handle the Blob data, for example, create a URL for downloading
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);

                })
        })
        .catch(error => console.error(error));

}
