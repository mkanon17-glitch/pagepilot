import { PageBrand, TaskItem } from '../types';

export interface ParseTasksResponse {
  explanation: string;
  tasks: Array<{
    title: string;
    pageId?: string;
    pageName?: string;
    platform?: string;
    targetDate: string;
    taskType: 'daily' | 'one_time';
    priority?: 'low' | 'medium' | 'high';
    notes?: string;
  }>;
}

export interface GenerateCaptionResponse {
  caption: string;
  hashtags?: string[];
}

export async function parseTasksWithAI(
  prompt: string,
  userDate: string,
  timezone: string,
  pages: PageBrand[]
): Promise<ParseTasksResponse> {
  const simplifiedPages = pages.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    platforms: p.platforms,
  }));

  const res = await fetch('/api/ai/parse-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      userDate,
      timezone,
      pages: simplifiedPages,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to process AI prompt (${res.status})`);
  }

  return res.json();
}

export async function generateCaptionWithAI(params: {
  taskTitle: string;
  platform?: string;
  pageName?: string;
  topicOrNotes?: string;
  language?: string;
  tone?: string;
}): Promise<GenerateCaptionResponse> {
  const res = await fetch('/api/ai/generate-caption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate caption (${res.status})`);
  }

  return res.json();
}
