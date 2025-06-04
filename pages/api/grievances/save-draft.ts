import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

const dbFilePath = path.join(process.cwd(), "public", "grievances.json");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let data;
  try {
    data = req.body;
    if (!data.summary || !data.description || !data.grievance_type || !data.files || !data.violations) {
      return res.status(400).json({ error: "Missing field" });
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  try {
    let existing = [];
    try {
      const file = await fs.readFile(dbFilePath, "utf8");
      existing = JSON.parse(file);
    } catch {
      // File does not exist or is empty
    }
    existing.push({ ...data, status: "Draft", savedAt: new Date().toISOString() });
    await fs.writeFile(dbFilePath, JSON.stringify(existing, null, 2));
    return res.status(201).json({ message: "Draft saved" });
  } catch (err) {
    console.error("[SAVE ERROR]", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
