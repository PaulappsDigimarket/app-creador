import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ status: "ok", message: "DigiMarket RD Factory API is running on Vercel" });
}
