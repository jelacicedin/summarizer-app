# 🧠 PDF Summarizer App

An Electron-based desktop app for uploading, editing, summarizing, and exporting PDF document metadata. It includes AI-powered summarization workflows and supports multi-stage approval, searchable tables, dark mode, and persistent storage via PostgreSQL.

---

## 🚀 Features

- 📄 Upload single files or scan entire folders
- ✍️ Editable title, authors, and multi-stage summaries
- ✅ 3-stage approval workflow with auto-propagation of summaries
- 🔍 Live search by title, author, and approval stage
- 🧠 AI-powered summarization modal (supports Chat-style editing)
- 🕶️ Dark mode toggle
- 📦 Export to Markdown
- 🧹 Delete documents with confirmation
- 🧭 Tracks "last modified" timestamp
- 🔄 Auto-refresh every 10 seconds

---

## 🧱 Tech Stack

- **Electron** + **TypeScript** – cross-platform desktop framework
- **PostgreSQL** – persistent storage (via Sequelize ORM)
- **Docker Compose** – easy PostgreSQL deployment
- **Node.js** – backend API bridge and database access
- **Sequelize** – typed model definitions and migrations

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) >= v18
- [Docker + Docker Compose](https://docs.docker.com/compose/)
- (Optional) Yarn: `npm install --global yarn`

---

## 🐘 Getting Started with PostgreSQL (via Docker Compose)

1. Clone the repository:
   ```bash
   git clone https://github.com/jelacicedin/summarizer-app.git
   cd pdf-summarizer ```
2. Create a .env file (or copy the example):

 ```
OPENAI_API_KEY=...
PROJECT=...
ORGANIZATION=...
HOST=localhost
DATABASE=app_db
USERNAME=user
PASSWORD=password

# Prompt templates for different platforms
DEFAULT_ROLE_CHATGPT=You are a helpful assistant tasked with writing a Markdown-formatted summary of a research paper that is optimized for sharing on social media (e.g., LinkedIn, Twitter, or a blog). Please:Use a **concise, engaging tone** suitable for a technical but non-expert audience. Start with a short, attention-grabbing one-line summary or title.Follow with **key contributions**, **methods**, and **results** in separate bullet points or short paragraphs. Include any interesting findings or implications. Format the response in **Markdown**, using headers, bullet points, and bold text where appropriate.Avoid overly technical jargon unless essential. This summary will be seen by researchers, engineers, and decision-makers who want to quickly grasp the value of the paper.
LINKEDIN_PROMPT=Write a professional summary suitable for LinkedIn.
WEBSITE_PROMPT=Create a summary suitable for a website.
MARKDOWN_PROMPT=Generate a summary in Markdown format.
 ```
3. Start PostgreSQL with Docker:

 ```bash
Copy
Edit
docker-compose up -d
 ```
This will launch a postgres container on port 5432 with the credentials from your .env.

🔧 Install & Run the App
Install dependencies:

 ```bash
npm install
 ```
Build TypeScript:

 ```bash
npm run build
 ```
Start the app:

 ```bash
npm start
 ```
You should now see the Electron window load with the document table.

📂 Folder Structure

```
├── dist/               # Compiled Electron backend files
├── assets/             # CSS files and static assets
├── database.ts         # Sequelize models and queries
├── main.ts             # Electron main process
├── preload.ts          # Context bridge between main and renderer
├── renderer.ts         # Main frontend logic (table rendering, events)
├── summarization.ts    # Summarization modal logic
├── index.html          # Main UI
├── summarization.html  # Summarization modal UI
├── docker-compose.yml  # PostgreSQL container setup
├── .env                # PostgreSQL connection credentials
└── ...
 ```
🐳 docker-compose.yml Example
 ```yaml

version: '3'
services:
  db:
    image: postgres:15
    container_name: pdf_summarizer_db
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pdf_summarizer
      POSTGRES_USER: user
      POSTGRES_PASSWORD: yourpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
 ```
🛠 Useful Scripts
 ```bash
npm run build        # Compile TypeScript to dist/
npm start            # Start the Electron app
npm run watch        # Watch files for changes
 ```
🧪 Testing the Database Connection
If you want to verify DB connectivity from a Node REPL:

 ```ts
import { sequelize } from "./dist/database.js";
await sequelize.authenticate();
 ```
🧯 Troubleshooting
Missing addDocument export error: Run rm -rf dist && tsc to rebuild from scratch.
Emoji not rendering? Install fonts-noto-color-emoji on Linux or whatever platform you may be running this on.
Empty search results? Ensure the title/author fields are .value, not .textContent.

🙌 Credits

Created by Edin and the grindset 💪

UI + Data + AI all baked into one focused Electron app.

