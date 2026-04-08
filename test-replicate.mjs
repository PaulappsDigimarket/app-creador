import Replicate from "replicate";
import { writeFile } from "node:fs/promises";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const [output] = await replicate.run(
  "black-forest-labs/flux-schnell",
  {
    input: {
      prompt: "minimalist vector logo, flat design, white background, abstract icon for a premium foot lounge brand, teal and navy colors"
    }
  }
);

console.log("URL:", output.url());

await writeFile("logo-test.png", output);
console.log("Imagen guardada como logo-test.png");