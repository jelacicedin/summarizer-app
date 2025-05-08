import { Message } from "../interface";

const paperIdElement = document.getElementById("paper-id")!;
const summaryBox = document.getElementById("summary") as HTMLTextAreaElement;
const correctionBox = document.getElementById(
  "chatbox-input"
) as HTMLTextAreaElement;
const promptBox = document.getElementById(
  "prompt-input"
) as HTMLTextAreaElement;
const reloadButton = document.getElementById(
  "reload-summary"
) as HTMLButtonElement;
const sendCorrectionButton = document.getElementById(
  "send-correction"
) as HTMLButtonElement;
const saveButton = document.getElementById("save-summary") as HTMLButtonElement;

let messageThread: Message[] = [];

let defaultSystemMessage: Message;

document.addEventListener("DOMContentLoaded", async () => {
  const defaultRoleContent = await window.electronAPI.getDefaultRole();
  defaultSystemMessage = {
    role: "system",
    content: defaultRoleContent,
  };
});

const defaultPrompt =
  "Please summarize the key contributions, methods, and results of this scientific paper.";

// Track initialized paper ID to prevent reinitialization
let initializedPaperId: number | null = null;

// Listen for the "open-summarization-modal" event
window.modalAPI.onSummarizationModal((paperId: number) => {
  console.log("Received paperId in renderer:", paperId);
  handleModalInitialization(paperId);
});

// Reload summary with new prompt
reloadButton.addEventListener("click", async () => {
  const prompt = promptBox.value.trim();
  messageThread = [defaultSystemMessage, { role: "user", content: prompt }];
  summaryBox.value = "⏳ Regenerating summary...";

  const result = await window.modalAPI.summarizeDocument(
    initializedPaperId!,
    JSON.parse(JSON.stringify(messageThread))
  );
  messageThread.push({ role: "assistant", content: result.summary });
  summaryBox.value = result.summary;

  await window.dbAPI.saveConversation(
    initializedPaperId!,
    JSON.stringify(messageThread)
  );
});

// Send correction to refine summary
sendCorrectionButton.addEventListener("click", async () => {
  const correction = correctionBox.value.trim();
  if (!correction) return;

  messageThread.push({ role: "user", content: correction });
  summaryBox.value = "⏳ Applying correction...";

  const result = await window.modalAPI.summarizeDocument(
    initializedPaperId!,
    JSON.parse(JSON.stringify(messageThread))
  );

  messageThread.push({ role: "assistant", content: result.summary });
  summaryBox.value = result.summary;
  correctionBox.value = "";

  await window.dbAPI.saveConversation(
    initializedPaperId!,
    JSON.stringify(messageThread)
  );
});

// Save summary only
saveButton.addEventListener("click", async () => {
  await window.dbAPI.updateDocument(initializedPaperId!, {
    [`stage1Summary`]: summaryBox.value,
  });

  window.close();
});

// Handle modal initialization
async function handleModalInitialization(paperId: number) {
  if (initializedPaperId === paperId) {
    console.log(`Modal for paper ID ${paperId} is already initialized.`);
    return; // Prevent multiple initializations for the same paper ID
  }

  console.log("Initializing modal for paper ID:", paperId);
  initializedPaperId = paperId;

  paperIdElement.textContent = `Paper ID: ${paperId}`;

  const saved = await window.dbAPI.getConversation(paperId);
  messageThread = saved
    ? JSON.parse(saved)
    : [defaultSystemMessage, { role: "user", content: defaultPrompt }];

  const lastSummary =
    [...messageThread].reverse().find((m) => m.role === "assistant")?.content ||
    "";

  promptBox.value =
    messageThread.find((m) => m.role === "user")?.content || defaultPrompt;
  summaryBox.value = lastSummary;
  correctionBox.value = "";
}

window.electronAPI?.on("toggle-dark-mode", () => toggleDarkMode());

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  document.querySelectorAll("th, td, tr").forEach((element) => {
    element.classList.toggle("dark-mode");
  });
  document.querySelectorAll(".responsive-input").forEach((input) => {
    input.classList.toggle("dark-mode");
  });

  document.querySelectorAll("h1, p, textarea, button").forEach((element) => {
    element.classList.toggle("dark-mode");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const dropdown = document.getElementById(
    "prompt-dropdown"
  ) as HTMLSelectElement;
  const promptInput = document.getElementById(
    "prompt-input"
  ) as HTMLTextAreaElement;

  // Fetch prompts from the main process
  const prompts: Record<string, string> = await window.electronAPI.getPrompts();

  // Handle dropdown selection
  dropdown.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement;
    const selectedPrompt = target.value ?? "";
    if (selectedPrompt && prompts[selectedPrompt]) {
      promptInput.value = prompts[selectedPrompt];
    }
  });
});
