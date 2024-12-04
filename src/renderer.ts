document.addEventListener("DOMContentLoaded", () => {
  const darkModeToggle = document.getElementById("darkModeToggle") as HTMLButtonElement;
  const fileLabel = document.querySelector("label.custom-file-input") as HTMLLabelElement;

  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    document.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("dark-mode");
    });

    if (fileLabel) {
      fileLabel.classList.toggle("dark-mode");
    }

    darkModeToggle.textContent = document.body.classList.contains("dark-mode")
      ? "Disable Dark Mode"
      : "Enable Dark Mode";
  });

  const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;

  uploadButton.addEventListener("click", async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Please select a file!");
      return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();

    try {
      const result = await (window as any).electronAPI.uploadPdf({ name: file.name, content: arrayBuffer });
      const summaryOutput = document.getElementById("summaryOutput") as HTMLPreElement;
      summaryOutput.textContent = `Summary:\n${result.summary}`;
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("An error occurred while processing the file.");
    }
  });
});
