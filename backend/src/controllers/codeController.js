export async function executeCode(req, res) {
  try {
    const { language, version, files } = req.body;

    if (!language || !version || !files) {
      return res.status(400).json({ message: "language, version, and files are required" });
    }

    const headers = {
      "Content-Type": "application/json",
    };

    // Add Piston API key if provided in env
    if (process.env.PISTON_API_KEY) {
      headers["Authorization"] = process.env.PISTON_API_KEY; // Or whatever header format Piston expects, often Authorization or X-Piston-Key
    }

    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers,
      body: JSON.stringify({
        language,
        version,
        files,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Piston API execution error:", errorText);
      return res.status(response.status).json({ message: `Piston API returned ${response.status}: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error executing code via Piston API:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
