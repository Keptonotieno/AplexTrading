import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { calculatePositionSizing, computePortfolioMetrics } from './src/lib/forexCalculations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ALLOWED_ADMIN_EMAILS = new Set(['keptonokoth@gmail.com', 'keptonotieno@gmail.com']);
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
    let isAdmin = emailVerified && ALLOWED_ADMIN_EMAILS.has(email);

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

    const accountType = typeof body.accountType === 'string' ? body.accountType : undefined;

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
      accountType: accountType as never,
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

  // Server-side Gemini AI Trading Pattern Recognition endpoint (analyzes actual logged trades & psychology)
  app.post('/api/ai/pattern-recognition', rateLimit(15, 60_000), verifyFirebaseToken, async (req: AuthedRequest, res) => {
    const user = req.user;
    if (!user || !user.emailVerified) {
      res.status(403).json({ error: 'Verified account required for AI pattern recognition.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'Gemini AI service is not configured on the server.' });
      return;
    }

    const body = req.body || {};
    const rawTrades = Array.isArray(body.trades) ? body.trades : [];
    const rawAssessments = Array.isArray(body.assessments) ? body.assessments : [];
    const rawViolations = Array.isArray(body.violations) ? body.violations : [];
    const studentName = typeof body.studentName === 'string' ? body.studentName.slice(0, 80) : 'Student';

    const sanitizedTrades = rawTrades
      .filter((t: Record<string, unknown>) => t && t.status !== 'draft')
      .slice(0, 120)
      .map((t: Record<string, unknown>) => ({
        instrument: t.instrument,
        direction: t.direction,
        status: t.status,
        session: t.session,
        timeframe: t.timeframe,
        strategy: t.strategy,
        setupGrade: t.setupGrade,
        emotionTag: t.emotionTag,
        mistakeTags: Array.isArray(t.mistakeTags) ? t.mistakeTags.slice(0, 8) : [],
        plannedRiskPercent: t.plannedRiskPercent,
        riskRewardRatio: t.riskRewardRatio,
        netPnl: t.netPnl,
        rMultiple: t.rMultiple,
        planFollowed: t.planFollowed,
        riskViolation: t.riskViolation,
        marketCondition: typeof t.marketCondition === 'string' ? t.marketCondition.slice(0, 60) : undefined,
        entryJustification: typeof t.entryJustification === 'string' ? t.entryJustification.slice(0, 180) : undefined,
        exitJustification: typeof t.exitJustification === 'string' ? t.exitJustification.slice(0, 160) : undefined,
        observations: typeof t.observations === 'string' ? t.observations.slice(0, 160) : undefined,
        lessonsLearned: typeof t.lessonsLearned === 'string' ? t.lessonsLearned.slice(0, 160) : undefined,
        openedAt: t.openedAt,
        closedAt: t.closedAt,
      }));

    if (sanitizedTrades.length === 0) {
      res.status(400).json({
        error: 'Record at least one planned, open, or closed trade before running pattern and prediction diagnostics.',
      });
      return;
    }

    const sanitizedAssessments = rawAssessments.slice(0, 40).map((a: Record<string, unknown>) => ({
      phase: a.phase,
      emotionalState: a.emotionalState,
      confidenceLevel: a.confidenceLevel,
      fomoLevel: a.fomoLevel,
      revengeTendency: a.revengeTendency,
      followsStrategy: a.followsStrategy,
      overtradingOccurred: a.overtradingOccurred,
      closedEmotionally: a.closedEmotionally,
      createdAt: a.createdAt,
    }));

    const sanitizedViolations = rawViolations.slice(0, 30).map((v: Record<string, unknown>) => ({
      policyRule: v.policyRule,
      severity: v.severity,
      thresholdValue: v.thresholdValue,
      actualValue: v.actualValue,
    }));

    const metricsSnapshot =
      body.metrics && typeof body.metrics === 'object' ? body.metrics : undefined;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = [
        `Read and understand how ${studentName} enters their manual Forex trading records, psychology check-ins, and notes below.`,
        `Strictly reference ONLY the numbers, pairs, sessions, strategies, justifications, mistake tags, and behavioural assessments provided below.`,
        `Do NOT invent trades, live market prices, or broker calls.`,
        `1) Identify recurring execution, timing, risk/drawdown, strategy, and psychological patterns with concrete evidence.`,
        `2) Provide data-grounded forward predictions helping the trader prepare their next setups: which setup profile (pair/direction/session/strategy/timeframe) shows the highest predicted edge in their records, expected win-rate range if discipline holds, early drawdown/mistake watch triggers, and how to improve their manual record-keeping.`,
        ``,
        `SUMMARY METRICS: ${JSON.stringify(metricsSnapshot ?? {})}`,
        `MANUAL TRADES (${sanitizedTrades.length}): ${JSON.stringify(sanitizedTrades)}`,
        `PSYCHOLOGY ASSESSMENTS (${sanitizedAssessments.length}): ${JSON.stringify(sanitizedAssessments)}`,
        `RISK VIOLATIONS (${sanitizedViolations.length}): ${JSON.stringify(sanitizedViolations)}`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a disciplined senior Forex risk & performance analyst. Read how the trader records their manual journal entries, detect behavioural and statistical patterns, and provide forward-looking setup & outcome probability guidance strictly derived from their own recorded history. Never invent live market quotes or broker advice.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              predictions: {
                type: Type.OBJECT,
                properties: {
                  nextTradeOutlook: { type: Type.STRING },
                  recommendedSetupFocus: { type: Type.STRING },
                  projectedWinRateRange: { type: Type.STRING },
                  riskWatchTrigger: { type: Type.STRING },
                  recordQualityFeedback: { type: Type.STRING },
                },
                required: [
                  'nextTradeOutlook',
                  'recommendedSetupFocus',
                  'projectedWinRateRange',
                  'riskWatchTrigger',
                  'recordQualityFeedback',
                ],
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              patterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: ['execution', 'risk', 'timing', 'psychology', 'strategy'],
                    },
                    severity: {
                      type: Type.STRING,
                      enum: ['positive', 'caution', 'critical'],
                    },
                    evidence: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                  required: ['title', 'category', 'severity', 'evidence', 'recommendation'],
                },
              },
              psychologyInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              actionPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'summary',
              'predictions',
              'strengths',
              'patterns',
              'psychologyInsights',
              'actionPlan',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({ error: 'AI pattern analyzer returned an empty response.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({
        generatedAt: new Date().toISOString(),
        tradesAnalyzed: sanitizedTrades.length,
        analysis: parsed,
      });
    } catch (err) {
      console.error('[AI Pattern Recognition] Error:', err);
      const message = err instanceof Error ? err.message : 'AI pattern recognition request failed.';
      res.status(502).json({ error: message });
    }
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

  // Protected screenshot deletion (only owner or verified mentor/admin)
  app.delete('/api/screenshots/:uid/:filename', rateLimit(40, 60_000), verifyFirebaseToken, (req: AuthedRequest, res) => {
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
      res.status(403).json({ error: 'Access denied to delete another student’s chart screenshot.' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, targetUid, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ deleted: true });
  });

  // Server-side multimodal Gemini chart screenshot & setup review
  app.post('/api/ai/chart-review', rateLimit(15, 60_000), verifyFirebaseToken, async (req: AuthedRequest, res) => {
    const user = req.user;
    if (!user || !user.emailVerified) {
      res.status(403).json({ error: 'Verified account required for chart analysis.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'Gemini AI service is not configured on the server.' });
      return;
    }

    const body = req.body || {};
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const match = imageUrl.match(/^\/api\/screenshots\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+\.(png|jpg|webp))$/);
    if (!match) {
      res.status(400).json({ error: 'Valid uploaded screenshot URL is required for chart review.' });
      return;
    }

    const targetUid = match[1];
    const filename = path.basename(match[2]);
    const ext = match[3];
    if (user.uid !== targetUid && !user.isAdmin) {
      res.status(403).json({ error: 'Access denied to another student’s chart screenshot.' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, targetUid, filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Screenshot file not found on server.' });
      return;
    }

    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    const trade = body.trade && typeof body.trade === 'object' ? body.trade : {};
    const screenshotMeta = body.screenshot && typeof body.screenshot === 'object' ? body.screenshot : {};

    const tradeContext = {
      instrument: trade.instrument,
      direction: trade.direction,
      status: trade.status,
      session: trade.session,
      timeframe: trade.timeframe,
      strategy: trade.strategy,
      setupGrade: trade.setupGrade,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      exitPrice: trade.exitPrice,
      plannedRiskPercent: trade.plannedRiskPercent,
      riskRewardRatio: trade.riskRewardRatio,
      netPnl: trade.netPnl,
      rMultiple: trade.rMultiple,
      planFollowed: trade.planFollowed,
      entryJustification: typeof trade.entryJustification === 'string' ? trade.entryJustification.slice(0, 500) : undefined,
      lessonsLearned: typeof trade.lessonsLearned === 'string' ? trade.lessonsLearned.slice(0, 400) : undefined,
    };

    const chartContext = {
      stage: screenshotMeta.stage,
      caption: typeof screenshotMeta.caption === 'string' ? screenshotMeta.caption.slice(0, 400) : '',
      marketStructureNotes:
        typeof screenshotMeta.marketStructureNotes === 'string'
          ? screenshotMeta.marketStructureNotes.slice(0, 1500)
          : '',
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const textPrompt = [
        'Inspect this manually uploaded Forex chart screenshot alongside the trader’s recorded trade parameters and market structure notes.',
        'Evaluate how clearly the chart markup and notes align with the logged setup (direction, entry, stop-loss placement, take-profit target, risk-to-reward, and stage).',
        'Do NOT invent live price feeds, broker quotes, or signals—only evaluate what is visible in the chart screenshot and stated in the manual trade log.',
        '',
        `LOGGED TRADE RECORD: ${JSON.stringify(tradeContext)}`,
        `CHART STAGE & NOTES: ${JSON.stringify(chartContext)}`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            { text: textPrompt },
          ],
        },
        config: {
          systemInstruction:
            'You are a senior Forex mentorship chart analyst. Review the trader’s chart screenshot, markups, and recorded trade plan strictly for technical clarity, structural invalidation logic, risk discipline, and documentation quality.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              structureAlignment: {
                type: Type.STRING,
                enum: ['aligned', 'mixed', 'unclear'],
              },
              chartObservations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              riskAndLevelCheck: { type: Type.STRING },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              watchItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              mentorPrepSummary: { type: Type.STRING },
            },
            required: [
              'structureAlignment',
              'chartObservations',
              'riskAndLevelCheck',
              'strengths',
              'watchItems',
              'mentorPrepSummary',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({ error: 'Chart analyzer returned an empty response.' });
        return;
      }

      const review = JSON.parse(rawText);
      res.json({
        generatedAt: new Date().toISOString(),
        review,
      });
    } catch (err) {
      console.error('[AI Chart Review] Error:', err);
      const message = err instanceof Error ? err.message : 'Chart review request failed.';
      res.status(502).json({ error: message });
    }
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
