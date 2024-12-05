import { exec } from "child_process";

export function startDockerServices() {
  exec("docker-compose up -d", { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error("Error starting Docker services:", err);
      return;
    }
    console.log(stdout);
  });
}

