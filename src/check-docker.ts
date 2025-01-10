import { exec } from "child_process";

import { fileURLToPath } from 'url';
import path from "path"


// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startDockerServices() {
  exec("docker-compose up -d", { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error("Error starting Docker services:", err);
      return;
    }
    console.log(stdout);
  });
}

