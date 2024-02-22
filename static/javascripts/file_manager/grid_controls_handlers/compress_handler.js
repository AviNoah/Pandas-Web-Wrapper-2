function handleCompress() {
    // Return all files from dropArea

    fetch("/files/get/all/compressed")
        .then(response => {
            if (!response.ok)
                throw new Error("Unable to fetch files, compression failed");

            return response.blob();
        })
        .then(blob => {
            // Handle the Blob data, for example, create a URL for downloading
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "files.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

        })
        .catch(error => console.error(error));
}
