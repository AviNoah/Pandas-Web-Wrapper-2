const folderDiv = document.getElementById('drop-zone');

export function addFiles(passedIds) {
    Array.from(passedIds).forEach(id => {
        const data = JSON.stringify({ fileId: id });
        fetch("/file/get", {
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
                addFileView(blob);
                console.log(`Added file view for ${blob.name}`);
            })

    });
}

function addFileView(file) { }