import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Setup uploads folder and static route
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage for media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    const safeName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Server-only access tokens storage (never exposed to browser)
const TOKENS_FILE = path.join(__dirname, 'server_tokens.json');
function loadTokens(): Record<string, { accessToken: string; platform: string; pageId?: string; igId?: string }> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Error reading tokens file:', err);
  }
  return {};
}

function saveToken(accountId: string, data: { accessToken: string; platform: string; pageId?: string; igId?: string }) {
  const current = loadTokens();
  current[accountId] = data;
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing token file:', err);
  }
}

function removeToken(accountId: string) {
  const current = loadTokens();
  delete current[accountId];
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error updating token file:', err);
  }
}

// Scheduled posts queue
const SCHEDULED_FILE = path.join(__dirname, 'scheduled_posts.json');
interface ScheduledItem {
  id: string;
  userId: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: string;
  targetAccountIds: string[];
  scheduledFor: string;
  matchingTaskId?: string;
  status: 'scheduled' | 'published' | 'failed';
  error?: string;
  createdAt: string;
}

function loadScheduledPosts(): ScheduledItem[] {
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULED_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Error reading scheduled file:', err);
  }
  return [];
}

function saveScheduledPosts(posts: ScheduledItem[]) {
  try {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing scheduled file:', err);
  }
}

// Helper to determine base URL for redirects and assets
function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

// Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function generateWithRetry(params: {
  contents: string | any;
  config?: any;
}) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      const isUnavailable =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        err?.status === 503;

      if (isUnavailable) {
        console.warn(`Model ${model} busy/unavailable (${msg}), trying next model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * 1. AI Task Parser Endpoint
 */
app.post('/api/ai/parse-tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, userDate, timezone, pages } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const todayDate = userDate || new Date().toISOString().split('T')[0];
    const tz = timezone || 'UTC';

    const systemInstruction = `You are PagePilot AI, an intelligent task scheduler for social media creators and page owners.
You receive a scheduling request from the user in ANY language (e.g. English, Spanish, French, German, Japanese, Korean, Arabic, Portuguese, etc.).
The current local date for the user is: ${todayDate} (${tz} timezone).
The user currently has these registered pages/brands:
${JSON.stringify(pages || [], null, 2)}

Your job is to understand the user's intent, resolve relative date expressions (e.g., "today", "tomorrow", "next Monday", "in 3 days", "viernes", "demain", "mañana", "내일", etc.) relative to ${todayDate}, and output the exact list of tasks to be created in JSON.

Rules:
1. If the user mentions "all pages" or "all 3 pages", create a task for every registered page.
2. If the user mentions a specific platform (e.g. Instagram, TikTok, YouTube, Facebook, X, LinkedIn, Threads), set that platform. If no platform is mentioned, create tasks for the page's active platforms or set platform to 'general'.
3. Always calculate 'targetDate' in exact 'YYYY-MM-DD' format.
4. 'taskType' should be 'one_time' (for specific dates/reminders) or 'daily' (if user asks for daily recurring). Default to 'one_time' unless recurrence is stated.
5. 'priority' should be 'low', 'medium', or 'high'.
6. 'explanation' should be a friendly, concise confirmation message written in the SAME LANGUAGE as the user's input prompt (e.g. "Scheduled 3 posts for tomorrow across your channels" or "3 publicaciones agendadas para mañana").
7. Ensure valid JSON matching the schema.`;

    const response = await generateWithRetry({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: 'Friendly confirmation in the user language.',
            },
            tasks: {
              type: Type.ARRAY,
              description: 'List of tasks to create',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Task title, e.g. "Brand — Instagram post"' },
                  pageId: { type: Type.STRING, description: 'Matching page ID if found, or empty string' },
                  pageName: { type: Type.STRING, description: 'Matching page name if found, or empty string' },
                  platform: { type: Type.STRING, description: 'facebook, instagram, tiktok, youtube, x, linkedin, threads, or general' },
                  targetDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  taskType: { type: Type.STRING, description: '"daily" or "one_time"' },
                  priority: { type: Type.STRING, description: '"low", "medium", or "high"' },
                  notes: { type: Type.STRING, description: 'Optional ideas, content brief or caption guidelines' },
                },
                required: ['title', 'targetDate', 'taskType'],
              },
            },
          },
          required: ['explanation', 'tasks'],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/parse-tasks:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to parse tasks with AI',
    });
  }
});

/**
 * 2. AI Caption Generator Endpoint
 */
app.post('/api/ai/generate-caption', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskTitle, platform, pageName, topicOrNotes, language, tone } = req.body;
    const targetLang = language || 'English';
    const postPlatform = (platform || 'Instagram').toLowerCase();
    const brandContext = pageName ? `for brand "${pageName}"` : '';

    const systemInstruction = `You are an elite social media copywriter and content strategist.
Your task is to write a high-engagement social media caption ${brandContext} tailored specifically for ${postPlatform}.
The caption MUST be written in: ${targetLang}.
Desired tone: ${tone || 'engaging and authentic'}.

Platform nuances to follow:
- Instagram: Punchy hook, line breaks, story or value bullet points, strong Call to Action, 5-8 relevant hashtags.
- TikTok: Ultra-short hook, energetic phrasing, trending question/prompt, 3-5 high-traffic hashtags.
- YouTube: Engaging video/Short description, key takeaway timestamps or links placeholder, searchable tags.
- X (Twitter): Sharp, witty or insight-packed hook within character comfort, 1-2 hashtags, conversational poll/question.
- LinkedIn: Professional yet authentic hook, industry insights/lessons learned, whitespace for readability, career/creator hashtags.
- Facebook: Community-focused discussion starter, shareable message, warm tone.
- Threads: Conversational, candid question or thought that sparks replies.

Output ONLY valid JSON with 'caption' and 'hashtags' array.`;

    const prompt = `Task: ${taskTitle || 'Social post'}
Platform: ${postPlatform}
Topic / Current Notes / Brief: ${topicOrNotes || 'Exciting update and value post for our audience'}
Language: ${targetLang}
Tone: ${tone || 'engaging and authentic'}`;

    const response = await generateWithRetry({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: {
              type: Type.STRING,
              description: 'The complete ready-to-copy social media caption in the requested language',
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Recommended hashtags',
            },
          },
          required: ['caption'],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/generate-caption:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate caption with AI',
    });
  }
});

/**
 * 3. Media Upload Endpoint
 */
app.post('/api/upload', upload.single('media'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No media file provided' });
      return;
    }

    const baseUrl = getBaseUrl(req);
    const mediaUrl = `${baseUrl}/uploads/${req.file.filename}`;
    const isVideo = req.file.mimetype.startsWith('video/');

    res.json({
      url: mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process media upload' });
  }
});

/**
 * 4. Facebook Login OAuth Endpoints
 */
const FB_PERMISSIONS = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

app.get('/api/auth/facebook/url', (req: Request, res: Response): void => {
  const userId = req.query.userId as string;
  const baseUrl = getBaseUrl(req);
  const callbackUrl = `${baseUrl}/api/auth/facebook/callback`;

  const appId = process.env.FB_APP_ID;
  const isConfigured = !!appId && appId !== 'YOUR_FACEBOOK_APP_ID';

  if (!isConfigured) {
    res.json({
      configured: false,
      callbackUrl,
      message: 'Facebook App ID is not yet configured in .env',
    });
    return;
  }

  const state = JSON.stringify({ userId, origin: baseUrl });
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
    callbackUrl
  )}&scope=${encodeURIComponent(FB_PERMISSIONS)}&response_type=code&state=${encodeURIComponent(state)}`;

  res.json({
    configured: true,
    url: authUrl,
    callbackUrl,
  });
});

app.get(['/api/auth/facebook/callback', '/api/auth/facebook/callback/'], async (req: Request, res: Response): Promise<void> => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    res.send(`
      <html><body><script>
        alert("Facebook Login error: ${error_description || error}");
        window.close();
      </script></body></html>
    `);
    return;
  }

  if (!code) {
    res.send(`<html><body><script>window.close();</script></body></html>`);
    return;
  }

  try {
    const baseUrl = getBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/auth/facebook/callback`;
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    // Exchange code for user access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
      callbackUrl
    )}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Token exchange failed');
    }

    const userAccessToken = tokenData.access_token;

    // Fetch user's managed pages and connected Instagram business accounts
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,picture{url},instagram_business_account{id,username,name,profile_picture_url}&access_token=${userAccessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    const pages = accountsData.data || [];
    const stateObj = state ? JSON.parse(decodeURIComponent(state as string)) : {};
    const userId = stateObj.userId;

    const retrievedAccounts: Array<{
      id: string;
      platform: 'facebook' | 'instagram';
      accountType: 'facebook_page' | 'instagram_business';
      name: string;
      pageId: string;
      instagramId?: string;
      pictureUrl?: string;
    }> = [];

    for (const page of pages) {
      const fbAccountId = `fb_${page.id}`;
      // Store token securely on server only
      saveToken(fbAccountId, {
        accessToken: page.access_token,
        platform: 'facebook',
        pageId: page.id,
      });

      retrievedAccounts.push({
        id: fbAccountId,
        platform: 'facebook',
        accountType: 'facebook_page',
        name: page.name,
        pageId: page.id,
        pictureUrl: page.picture?.data?.url,
      });

      // Linked Instagram Professional Account
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        const igAccountId = `ig_${ig.id}`;
        // Store IG token (Facebook page token operates linked IG account)
        saveToken(igAccountId, {
          accessToken: page.access_token,
          platform: 'instagram',
          pageId: page.id,
          igId: ig.id,
        });

        retrievedAccounts.push({
          id: igAccountId,
          platform: 'instagram',
          accountType: 'instagram_business',
          name: `@${ig.username || ig.name || page.name}`,
          pageId: page.id,
          instagramId: ig.id,
          pictureUrl: ig.profile_picture_url || page.picture?.data?.url,
        });
      }
    }

    // Send success postMessage to opener with retrieved accounts payload
    res.send(`
      <!doctype html>
      <html>
        <head><title>Authentication Successful</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2>Connection Successful!</h2>
          <p>Importing your connected accounts...</p>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'FB_AUTH_SUCCESS',
                  accounts: ${JSON.stringify(retrievedAccounts)},
                  userId: "${userId || ''}"
                }, '*');
                setTimeout(() => window.close(), 600);
              } else {
                window.location.href = '/';
              }
            } catch (err) {
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Facebook Auth Error';
    console.error('FB OAuth error:', err);
    res.send(`
      <html><body><script>
        alert("Failed to connect Facebook accounts: ${errorMsg}");
        window.close();
      </script></body></html>
    `);
  }
});

/**
 * Demo connection endpoint when real Facebook App credentials are not yet configured in .env
 */
app.post('/api/auth/facebook/demo', (req: Request, res: Response): void => {
  const { account } = req.body;
  if (account && account.id) {
    saveToken(account.id, {
      accessToken: `demo_token_${account.id}`,
      platform: account.platform,
      pageId: account.pageId,
      igId: account.instagramId,
    });
  }
  res.json({ success: true });
});

/**
 * Remove token endpoint
 */
app.delete('/api/auth/accounts/:accountId', (req: Request, res: Response): void => {
  const accountId = req.params.accountId;
  removeToken(accountId);
  res.json({ success: true });
});

/**
 * 5. Publishing Core Function (Facebook & Instagram Graph API)
 */
async function executePublish(post: {
  caption: string;
  mediaUrl?: string;
  mediaType?: string;
  targetAccountIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const tokens = loadTokens();
  const errors: string[] = [];

  for (const accountId of post.targetAccountIds) {
    const accountInfo = tokens[accountId];

    // If account has real Facebook / Instagram access token
    if (accountInfo && !accountInfo.accessToken.startsWith('demo_token_')) {
      try {
        if (accountInfo.platform === 'facebook' && accountInfo.pageId) {
          if (post.mediaUrl) {
            // Post photo with caption
            const fbPhotoUrl = `https://graph.facebook.com/v19.0/${accountInfo.pageId}/photos`;
            const params = new URLSearchParams({
              url: post.mediaUrl,
              caption: post.caption,
              access_token: accountInfo.accessToken,
            });
            const res = await fetch(fbPhotoUrl, { method: 'POST', body: params });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || 'Facebook photo upload failed');
          } else {
            // Post feed message
            const fbFeedUrl = `https://graph.facebook.com/v19.0/${accountInfo.pageId}/feed`;
            const params = new URLSearchParams({
              message: post.caption,
              access_token: accountInfo.accessToken,
            });
            const res = await fetch(fbFeedUrl, { method: 'POST', body: params });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || 'Facebook post failed');
          }
        } else if (accountInfo.platform === 'instagram' && accountInfo.igId) {
          // Instagram requires media
          if (!post.mediaUrl) {
            throw new Error('Instagram requires an image or video URL to publish a post');
          }
          // Step 1: Create container
          const igContainerUrl = `https://graph.facebook.com/v19.0/${accountInfo.igId}/media`;
          const isVideo = post.mediaType === 'video';
          const params = new URLSearchParams({
            [isVideo ? 'video_url' : 'image_url']: post.mediaUrl,
            caption: post.caption,
            access_token: accountInfo.accessToken,
            ...(isVideo ? { media_type: 'VIDEO' } : {}),
          });
          const containerRes = await fetch(igContainerUrl, { method: 'POST', body: params });
          const containerData = await containerRes.json();
          if (containerData.error) throw new Error(containerData.error.message || 'Instagram container creation failed');

          const creationId = containerData.id;
          // Step 2: Publish container
          const igPublishUrl = `https://graph.facebook.com/v19.0/${accountInfo.igId}/media_publish`;
          const publishParams = new URLSearchParams({
            creation_id: creationId,
            access_token: accountInfo.accessToken,
          });
          const publishRes = await fetch(igPublishUrl, { method: 'POST', body: publishParams });
          const publishData = await publishRes.json();
          if (publishData.error) throw new Error(publishData.error.message || 'Instagram media publish failed');
        }
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    } else {
      // Demo simulated publish (simulate test error if caption contains [test-error])
      if (post.caption && post.caption.toLowerCase().includes('[test error]')) {
        errors.push('Simulated error: Graph API token expired or permission missing');
      }
      // Demo publish succeeded!
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }
  return { success: true };
}

/**
 * 6. Post Publish Endpoint (Publish Now)
 */
app.post('/api/posts/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const { post } = req.body;
    if (!post || !post.targetAccountIds || post.targetAccountIds.length === 0) {
      res.status(400).json({ error: 'Please select at least one connected account' });
      return;
    }

    const result = await executePublish(post);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Publishing failed',
    });
  }
});

/**
 * 7. Post Scheduling Endpoint
 */
app.post('/api/posts/schedule', (req: Request, res: Response): void => {
  try {
    const { post, userId } = req.body;
    if (!post || !post.scheduledFor) {
      res.status(400).json({ error: 'Valid scheduled date/time is required' });
      return;
    }

    const scheduled = loadScheduledPosts();
    // Remove if already exists, append new
    const filtered = scheduled.filter((s) => s.id !== post.id);
    filtered.push({
      ...post,
      userId,
      status: 'scheduled',
    });
    saveScheduledPosts(filtered);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving scheduled post:', err);
    res.status(500).json({ error: 'Failed to register scheduled post' });
  }
});

/**
 * 8. Scheduled Posts Polling / Sync Endpoint
 */
app.get('/api/posts/scheduled-status', (req: Request, res: Response): void => {
  const userId = req.query.userId as string;
  const scheduled = loadScheduledPosts();
  const userItems = userId ? scheduled.filter((s) => s.userId === userId) : scheduled;
  res.json({ items: userItems });
});

/**
 * 9. Server-Side Scheduled Background Worker
 * Automatically publishes due posts and records success or failure
 */
async function processScheduledPosts() {
  const allPosts = loadScheduledPosts();
  const nowIso = new Date().toISOString();

  let modified = false;

  for (const post of allPosts) {
    if (post.status === 'scheduled' && post.scheduledFor && post.scheduledFor <= nowIso) {
      console.log(`[Scheduled Worker] Publishing due post ${post.id} for user ${post.userId}...`);
      const result = await executePublish(post);

      if (result.success) {
        post.status = 'published';
        post.error = undefined;
        console.log(`[Scheduled Worker] Successfully published post ${post.id}`);
      } else {
        post.status = 'failed';
        post.error = result.error;
        console.warn(`[Scheduled Worker] Failed publishing post ${post.id}: ${result.error}`);
      }
      modified = true;
    }
  }

  if (modified) {
    saveScheduledPosts(allPosts);
  }
}

// Run worker every 15 seconds
setInterval(() => {
  processScheduledPosts().catch((err) => console.error('Scheduled worker error:', err));
}, 15000);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PagePilot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
