/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { Product, CustomBar, Review, Order, CartItem, SommelierResponse } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure data folder exists for persistence
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

// Helper to load/save JSON data safely
function readJSONFile<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultValue;
  }
}

function writeJSONFile<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// Pre-seeded standard products
const PRODUCTS: Product[] = [
  {
    id: "prod-noir",
    name: "The Noir Collection",
    description: "Our signature collection of intense single-origin dark chocolates with delicate gold leaf accents. Rich, complex, and deeply luxurious with subtle floral notes.",
    price: 18,
    category: "dark",
    spec: "Dark 75%",
    tag: "Single Origin",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxdxgC4Lxtb_RIdABRm71QpYxy4vy12AH7bKrgujayiheCdecVtXjySNf9aUVOrycGC4L8CxOLPrdfmz4q7KbH18-LoXcfAQ3PGAXSktvpRwj6VCzVc3RPS5F6Hs8JHcmUnrxQ-ujBSOaQ3pMUXQwNPpC8j3Yq_pBewusd4vkwCb0COn6T6N79G0oGizmTGRnaRfrJ5GWP_6b2eDczcikB7fg6MYoCLHn0zCgNjoGxMsUn9XfTKl_Dt0UTctyqjodH4yIrQFAoLpo"
  },
  {
    id: "prod-velvet",
    name: "The Velvet Praliné",
    description: "Decadently creamy milk chocolate bonbons with hand-painted pastel details. Filled with roasted hazelnut butter and crispy wafer flakes for the perfect textural bite.",
    price: 22,
    category: "milk",
    spec: "Hazelnut Filling",
    tag: "Award Winning",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBn6XKlCEhSog8oX_v9cAFCm8XA4l6i-l2ESRW14pVmVcAyAYhCBy2J66ooJZCaOU7i-N0vQA1iKFcQhdBtcIWG78xoj4oTnY4p-7nZY3yf-2qrCorOipyNn6MUr_iGkQUO0v36zm3x9_OlD5mAL2SYU3GACjo5mrV6jZARmuPm1i4YO8O2VDnoFJac6VpxNCHSVghRrEnqwf9zU4xuB8_KCeuNPYdRdiyVo5269CuxpTodXWgfoQmz71I2-lRn8E-mqzBMtnA0oOw"
  },
  {
    id: "prod-gift",
    name: "Seasonal Gifting Box",
    description: "An elegant, gold-embossed presentation drawer containing a hand-selected arrangement of our seasonal truffles, liquid caramels, and fruit-infused discs.",
    price: 35,
    category: "gifting",
    spec: "Assorted Selection",
    tag: "Limited Edition",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYUtlnPAjVXkYSQ3BDeQmrPBpR1pshsftWThsfa77MzIHXVlMSKlGXsJ5jey_UTtGH4hE0TS8WWOpiKdwntB3GXA0W_jhj3EQkP4AfSMHe2zlObrtwN6rI8Uo5n94UC9DtWjPhCdhvfXeNOpQLAJrumis5RcdOaFWMlXSAy4q9oqeir5mcjlMixnCTIyBfjU7LBWZzuoGLLatEGhBOlv_zZIrhMZrtdK_9Si2Ujqu6kr8GPPX0Go6TSTRR23y5fuFUcfN_vK9MN1E"
  },
  {
    id: "prod-salt",
    name: "Chili & Fleur de Sel Bar",
    description: "A balanced fusion of intense dark chocolate with a warm kick of cayenne pepper and flakes of hand-harvested sea salt. A modern, thrilling flavor journey.",
    price: 16,
    category: "dark",
    spec: "Dark 70%",
    tag: "Gourmet Accent",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB0XrxIjlfL1lHeB6jm02igMzc3S25C1wYX7JWqC70_4GbTMaxYEVSrl8WsLRS1yPn6g7mfAZbypHVGsjBiiPDX7A4QTDfPfFAdpZK10sl2OmzKoQo9zvTnIfJ4HOp03meDzKGQS2Rwqziu1W1iw5Zf2lL804ZOmOvYtUjxcW7FbLv753BDIpPUzhR5jLJxXOvwybFnX0ZBbzlZ9rnwxAxyufqjbAE8dz3SG8mY43eaLrKJlt2x0LwtiKuuH_zpCy2mXNgDzOB1go0"
  }
];

// Pre-seeded reviews
const DEFAULT_REVIEWS: Review[] = [
  {
    id: "rev-1",
    name: "Sophia Vance",
    rating: 5,
    comment: "The custom chocolate creator is pure genius! I designed a Milk Velvet bar with roasted sea salt, caramelized hazelnuts, and edible gold flakes. The AI Sommelier pairing recommended a medium roast pour-over coffee, and it was a heavenly match.",
    date: "June 25, 2026"
  },
  {
    id: "rev-2",
    name: "Julian Moreau",
    rating: 5,
    comment: "Exquisite truffles. The single-origin dark chocolate from the Noir Collection has a beautifully balanced acidity and a silky, luxurious melt. Luxe Cocoa has re-defined artisanal chocolates.",
    date: "June 18, 2026"
  },
  {
    id: "rev-3",
    name: "Elena Rostova",
    rating: 4,
    comment: "Ordered the Seasonal Gifting Box for an anniversary. The gold-foil wrapper is gorgeous and the truffles inside are extremely creative—especially the passionfruit caramel.",
    date: "June 10, 2026"
  }
];

// In-memory + persistent store
let reviews: Review[] = readJSONFile<Review[]>("reviews.json", DEFAULT_REVIEWS);
let orders: Order[] = readJSONFile<Order[]>("orders.json", []);

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes

// 1. Get Product Catalog
app.get("/api/products", (req, res) => {
  res.json(PRODUCTS);
});

// 2. Reviews Endpoints
app.get("/api/reviews", (req, res) => {
  res.json(reviews);
});

app.post("/api/reviews", (req, res) => {
  const { name, rating, comment } = req.body;
  if (!name || !rating || !comment) {
    return res.status(400).json({ error: "Name, rating, and comment are required." });
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    name,
    rating: Number(rating),
    comment,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  reviews.unshift(newReview);
  writeJSONFile("reviews.json", reviews);
  res.status(201).json(newReview);
});

// 3. Orders Endpoints
app.post("/api/orders", (req, res) => {
  const { name, email, address, specialInstructions, items, subtotal, delivery, total } = req.body;

  if (!name || !email || !address || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Customer details and cart items are required." });
  }

  const newOrder: Order = {
    id: `order-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    name,
    email,
    address,
    specialInstructions,
    items,
    subtotal: Number(subtotal),
    delivery: Number(delivery),
    total: Number(total),
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  writeJSONFile("orders.json", orders);
  res.status(201).json(newOrder);
});

app.get("/api/orders/customer/:email", (req, res) => {
  const email = req.params.email.toLowerCase().trim();
  const customerOrders = orders.filter((o) => o.email.toLowerCase().trim() === email);
  res.json(customerOrders);
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }
  res.json(order);
});

// 3.5 Admin Endpoints
app.get("/api/admin/orders", (req, res) => {
  res.json(orders);
});

app.patch("/api/admin/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const validStatuses = ["Pending", "Crafting", "Dispatched", "Delivered"];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found." });
  }

  orders[orderIndex].status = status as "Pending" | "Crafting" | "Dispatched" | "Delivered";
  writeJSONFile("orders.json", orders);
  res.json(orders[orderIndex]);
});

app.delete("/api/admin/reviews/:id", (req, res) => {
  const reviewId = req.params.id;
  const initialLength = reviews.length;
  reviews = reviews.filter((r) => r.id !== reviewId);
  if (reviews.length === initialLength) {
    return res.status(404).json({ error: "Review not found." });
  }
  writeJSONFile("reviews.json", reviews);
  res.json({ success: true, message: "Review deleted successfully" });
});

// 4. AI Sommelier Pairing Route
app.post("/api/sommelier", async (req, res) => {
  const { type, productId, customBar } = req.body;

  let descriptionPrompt = "";

  if (type === "product") {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    descriptionPrompt = `The customer is exploring our premier chocolate item: '${product.name}', described as: '${product.description}'. The specific variety is: '${product.spec}' and has the tag '${product.tag}'.`;
  } else if (type === "custom") {
    if (!customBar) {
      return res.status(400).json({ error: "Custom chocolate details are missing." });
    }
    const inclusionsList = customBar.inclusions && customBar.inclusions.length > 0
      ? customBar.inclusions.join(", ")
      : "no additional toppings (pure chocolate bar)";
    descriptionPrompt = `The customer has crafted a bespoke, custom chocolate bar at our craft station.
- Base Chocolate: ${customBar.base}
- Premium Toppings/Inclusions: ${inclusionsList}
- Custom wrapper message: "${customBar.wrapperMessage || 'None'}"
- Custom Bar Name given by user: "${customBar.customName || 'Bespoke Blend'}"`;
  } else {
    return res.status(400).json({ error: "Invalid sommelier request type." });
  }

  const prompt = `${descriptionPrompt}

As a world-renowned chocolate sommelier and sensory expert, analyze the flavor profile and generate an elegant, poetic, and highly immersive sensory review. Provide:
1. "aroma": An evocative description of the bouquet when the wrapping is peeled back.
2. "palate": The progression of flavor notes on the tongue, detail sweet/bitter/fruity/spicy transitions.
3. "mouthfeel": The velvetiness, texture, rate of melt, and finish of the cocoa.
4. "pairingNotes": A professional beverage pairing recommendation (e.g. particular single-origin coffees, aged teas, grand cru red wine, or botanical infusions) with a brief, sophisticated explanation.
5. "poem": A beautiful, luxurious 2-line sensory poetic verse celebrating this specific cocoa creation.

Respond STRICTLY in valid JSON matching the schema of a chocolate sensory card. Do not include markdown wraps like \`\`\`json outside the JSON content itself.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aroma: { type: Type.STRING, description: "Aroma bouquet description" },
            palate: { type: Type.STRING, description: "Progression of flavor notes on the tongue" },
            mouthfeel: { type: Type.STRING, description: "Texture and melt finish description" },
            pairingNotes: { type: Type.STRING, description: "Sommelier beverage pairing recommendations" },
            poem: { type: Type.STRING, description: "Poetic 2-line cocoa verse" },
          },
          required: ["aroma", "palate", "mouthfeel", "pairingNotes", "poem"],
        },
      },
    });

    const resultText = response.text?.trim() || "{}";
    const sommelierResult = JSON.parse(resultText) as SommelierResponse;
    res.json(sommelierResult);
  } catch (error) {
    console.error("Gemini API Error in Sommelier route:", error);
    // Provide a beautiful, context-aware fallback so the user experience is flawless
    const isCustom = type === "custom";
    const fallback: SommelierResponse = {
      aroma: isCustom
        ? `Delicate high notes of warm ${customBar?.base || "cocoa"} dance with the sweet accents of ${customBar?.inclusions?.join(", ") || "pure chocolate"} in an enchanting botanical fragrance.`
        : "Rich, enveloping roasted cocoa notes greet the senses, carrying warm whispers of Madagascar vanilla and aged wood.",
      palate: isCustom
        ? `On the palate, the silkiness of the ${customBar?.base || "cocoa"} base slowly releases its complex characteristics, accented beautifully by the textured complexity of ${customBar?.inclusions?.join(" and ") || "artisanal crafting"}.`
        : "A smooth, elegant opening of dense dark fruit, transitioning gracefully into roasted chestnut and a subtle, pleasant bitterness that lingers perfectly.",
      mouthfeel: "Perfect structural tempering yields an immaculate snap, melting progressively into a warm, buttery coating of absolute velvet.",
      pairingNotes: isCustom
        ? "We highly recommend pairing this custom masterpiece with a slow-drip roasted Ethiopian coffee or an aged Oolong tea to let the sweet inclusions shine."
        : "Pairs beautifully with an espresso of high acidity, a vintage ruby port, or a loose-leaf Earl Grey tea with notes of bergamot.",
      poem: isCustom
        ? `"${customBar?.customName || "Bespoke Blend"}" - a canvas of pure delight,\nCrafted by hand, to make the senses bright.`
        : "Born of the sun, refined by loving hands,\nA silky song from ancient, soil-kissed lands."
    };
    res.json(fallback);
  }
});

// Setup Vite & Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LUXE COCOA SERVER] Running on http://localhost:${PORT}`);
  });
}

// Export app for serverless environments (like Vercel)
export default app;

if (!process.env.VERCEL) {
  startServer();
}
