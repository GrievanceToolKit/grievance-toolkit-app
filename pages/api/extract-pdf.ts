import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { extractTextFromPdf } from "@/lib/pdfExtract";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Upload failed" });
    }
    const file = files.file as formidable.File;
    const buffer = fs.readFileSync(file.filepath);
    const text = await extractTextFromPdf(buffer);
    res.status(200).json({ text });
  });
}
