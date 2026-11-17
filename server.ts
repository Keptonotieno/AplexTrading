import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { calculatePositionSizing, computePortfolioMetrics } from './src/lib/forexCalculations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const BOOTSTRAPPED_ADMIN_EMAIL = 'keptonokoth@gmail.com';
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  firestoreDatabaseId: string;
}

const firebaseConfig: FirebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8')
);

interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  isAdmin: boolean;
}

interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
}

// In-memory sliding window rate limiter
const rateBuckets = new Map<string, number[]>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const history = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= maxRequests) {
      res.status(429).json({ error: 'Rate limit exceeded. Please retry shortly.' });
      return;
    }
    history.push(now);
    rateBuckets.set(key, history);
    next();
  };
}

// Verify Firebase ID token via Google Identity Toolkit
async function verifyFirebaseToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 8192) {
    res.status(401).json({ error: 'Invalid authentication token.' });
    return;
  }

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!resp.ok) {
      res.status(401).json({ error: 'Invalid or expired session token.' });
      return;
    }

    const data = (await resp.json()) as {
      users?: Array<{
        localId: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
      }>;
    };

    const userRecord = data.users?.[0];
    if (!userRecord || !userRecord.localId) {
      res.status(401).json({ error: 'Unable to verify account identity.' });
      return;
    }

    const email = (userRecord.email || '').toLowerCase();
    const emailVerified = Boolean(userRecord.emailVerified);
    let isAdmin = emailVerified && email === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

    if (!isAdmin && emailVerified) {
      try {
        const adminDocUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          firebaseConfig.projectId
        )}/databases/${encodeURIComponent(
          firebaseConfig.firestoreDatabaseId
        )}/documents/admins/${encodeURIComponent(userRecord.localId)}`;
        const adminDocResp = await fetch(adminDocUrl, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (adminDocResp.ok) {
          isAdmin = true;
        }
      } catch {
        // Ignore transient lookup failures; default remains false
      }
    }

    req.user = {
      uid: userRecord.localId,
      email,
      emailVerified,
      displayName: userRecord.displayName,
      isAdmin,
    };
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Token verification error:', err);
    res.status(500).json({ error: 'Authentication verification service unavailable.' });
  }
}

function validateImageMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 12) return false;
  if (mimeType === 'image/png') {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (mimeType === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return (
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  // Structured API logging
  app.use('/api', (req, _res, next) => {
    console.log(`[API] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'forex-mentorship-api', timestamp: new Date().toISOString() });
  });

  // Server-side authoritative admin verification check
  app.get('/api/auth/verify-admin', rateLimit(30, 60_000), verifyFirebaseToken, (req: AuthedRequest, res) => {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        authorized: false,
        message: 'Administrator access requires a verified Mentor account.',
      });
      return;
    }
    res.json({ authorized: true, uid: req.user.uid, email: req.user.email });
  });

  // Server-side position sizing & risk calculation endpoint
  app.post('/api/calculations/position-size', rateLimit(60, 60_000), verifyFirebaseToken, (req: AuthedRequest, res) => {
    const body = req.body || {};
    const instrument = String(body.instrument || '');
    const direction = body.direction === 'SELL' ? 'SELL' : 'BUY';
    const accountBalance = Number(body.accountBalance);
    const riskPercent = Number(body.riskPercent);
    const entryPrice = Number(body.entryPrice);
    const stopLoss = Number(body.stopLoss);
    const takeProfit = body.takeProfit !== undefined ? Number(body.takeProfit) : undefined;
    const lotSizeOverride = body.lotSizeOverride !== undefined ? Number(body.lotSizeOverride) : undefined;

    if (!instrument || !Number.isFinite(accountBalance) || !Number.isFinite(riskPercent)) {
      res.status(400).json({ error: 'Invalid calculation inputs.' });
      return;
    }

    const result = calculatePositionSizing({
      instrument,
      direction,
      accountBalance,
      riskPercent,
      entryPrice,
      stopLoss,
      takeProfit,
      lotSizeOverride,
    });
    res.json(result);
  });

  // Server-side portfolio metrics verification endpoint
  app.post('/api/calculations/portfolio', rateLimit(40, 60_000), verifyFirebaseToken, (req: AuthedRequest, res) => {
    const body = req.body || {};
    if (!Array.isArray(body.trades) || !Array.isArray(body.accounts)) {
      res.status(400).json({ error: 'trades and accounts arrays are required.' });
      return;
    }
    const metrics = computePortfolioMetrics({
      trades: body.trades,
      accounts: body.accounts,
      transactions: Array.isArray(body.transactions) ? body.transactions : [],
      violations: Array.isArray(body.violations) ? body.violations : [],
      assessments: Array.isArray(body.assessments) ? body.assessments : [],
      settings: body.settings,
    });
    res.json(metrics);
  });

  // Secure validated chart screenshot upload
  app.post('/api/uploads/screenshot', rateLimit(25, 60_000), verifyFirebaseToken, (req: AuthedRequest, res) => {
    const user = req.user;
    if (!user || !user.emailVerified) {
      res.status(403).json({ error: 'Verified email account required to upload screenshots.' });
      return;
    }

    const { dataUrl, fileName, mimeType } = req.body || {};
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (typeof mimeType !== 'string' || !allowedMimes.includes(mimeType)) {
      res.status(400).json({ error: 'Only PNG, JPEG, and WEBP chart screenshots are permitted.' });
      return;
    }

    if (typeof dataUrl !== 'string' || !dataUrl.includes(';base64,')) {
      res.status(400).json({ error: 'Invalid image payload format.' });
      return;
    }

    const base64Part = dataUrl.split(';base64,')[1];
    if (!base64Part) {
      res.status(400).json({ error: 'Empty image payload.' });
      return;
    }

    const buffer = Buffer.from(base64Part, 'base64');
    const MAX_BYTES = 5 * 1024 * 1024;
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      res.status(400).json({ error: 'Image size must be between 1 byte and 5 MB.' });
      return;
    }

    if (!validateImageMagicBytes(buffer, mimeType)) {
      res.status(400).json({ error: 'File signature does not match declared image MIME type.' });
      return;
    }

    const safeUid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '');
    const userDir = path.join(UPLOADS_DIR, safeUid);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const storedName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const targetPath = path.join(userDir, storedName);
    fs.writeFileSync(targetPath, buffer);

    const safeOriginalName = String(fileName || `chart.${ext}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 140);

    res.status(201).json({
      imageUrl: `/api/screenshots/${safeUid}/${storedName}`,
      fileName: safeOriginalName,
      mimeType,
      fileSize: buffer.length,
    });
  });

  // Protected screenshot download (only owner or verified mentor/admin)
  app.get('/api/screenshots/:uid/:filename', rateLimit(120, 60_000), verifyFirebaseToken, (req: AuthedRequest, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const targetUid = String(req.params.uid || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = path.basename(String(req.params.filename || ''));

    if (!targetUid || !filename || !/^[a-zA-Z0-9_.-]+\.(png|jpg|webp)$/.test(filename)) {
      res.status(400).json({ error: 'Invalid screenshot reference.' });
      return;
    }

    if (user.uid !== targetUid && !user.isAdmin) {
      res.status(403).json({ error: 'Access denied to another student’s chart screenshot.' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, targetUid, filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Screenshot not found.' });
      return;
    }

    res.sendFile(filePath);
  });

  // Production static vs Dev Vite middlewares
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Forex Mentorship server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
