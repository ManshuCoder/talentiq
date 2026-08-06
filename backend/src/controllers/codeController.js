import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execAsync = util.promisify(exec);

export async function executeCode(req, res) {
  try {
    const { language, version, files } = req.body;

    if (!language || !version || !files) {
      return res.status(400).json({ message: "language, version, and files are required" });
    }

    const headers = {
      "Content-Type": "application/json",
    };

    // Try Piston API first if key is provided
    if (process.env.PISTON_API_KEY) {
      headers["Authorization"] = process.env.PISTON_API_KEY;
      
      try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers,
          body: JSON.stringify({ language, version, files }),
        });

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        } else if (response.status !== 401) {
           const errorText = await response.text();
           return res.status(response.status).json({ message: `Piston API returned ${response.status}: ${errorText}` });
        }
        // If 401, fall through to local execution fallback
      } catch (e) {
        console.error("Piston API fetch failed, falling back to local execution:", e);
      }
    }

    // LOCAL EXECUTION FALLBACK
    const code = files[0].content;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-exec-'));
    let output = '';
    let stderr = '';

    try {
      if (language === 'javascript') {
        const filePath = path.join(tmpDir, 'main.js');
        fs.writeFileSync(filePath, code);
        const { stdout, stderr: err } = await execAsync(`node ${filePath}`, { timeout: 5000 });
        output = stdout;
        stderr = err;
      } else if (language === 'python') {
        const filePath = path.join(tmpDir, 'main.py');
        fs.writeFileSync(filePath, code);
        const { stdout, stderr: err } = await execAsync(`python ${filePath}`, { timeout: 5000 });
        output = stdout;
        stderr = err;
      } else {
        return res.status(400).json({ message: `Local fallback execution not supported for language: ${language}` });
      }
    } catch (err) {
      stderr = err.stderr || err.message;
      output = err.stdout || '';
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    return res.status(200).json({
      run: {
        output: output,
        stderr: stderr
      }
    });

  } catch (error) {
    console.error("Error executing code:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
