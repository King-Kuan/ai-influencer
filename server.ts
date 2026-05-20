import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { createCampaign, processSinglePost } from './src/server/campaignService.ts';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    })
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const { userId, idea, tone, audience, frequency, preferredHours } = req.body;
      const campaign = await createCampaign(userId, { idea, tone, audience, frequency, preferredHours });
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/campaigns", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const snap = await db.collection('campaigns').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
      const campaigns = snap.docs.map(doc => doc.data());
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cron/post", async (req, res) => {
    // Protect cron endpoint
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const now = new Date();
      // Look for posts scheduled for right now (allowing a small window)
      // We'll look for anything pending where scheduledTime <= now
      const snap = await db.collection('scheduled_posts')
        .where('status', '==', 'pending')
        .where('scheduledTime', '<=', admin.firestore.Timestamp.fromDate(now))
        .limit(5)
        .get();

      const results = [];
      for (const doc of snap.docs) {
        try {
          await processSinglePost(doc.id);
          results.push({ id: doc.id, status: 'success' });
        } catch (err: any) {
          results.push({ id: doc.id, status: 'failed', error: err.message });
        }
      }
      res.json({ processed: results.length, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
