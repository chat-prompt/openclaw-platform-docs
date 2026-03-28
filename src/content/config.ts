import { defineCollection, z } from 'astro:content';

const strategyBase = z.object({
  title: z.string(),
  order: z.number().optional(),
  description: z.string().optional(),
  publishedAt: z.string().optional(),
});

const overview = defineCollection({ type: 'content', schema: strategyBase });
const platform = defineCollection({ type: 'content', schema: strategyBase });
const content = defineCollection({ type: 'content', schema: strategyBase });
const lecture = defineCollection({ type: 'content', schema: strategyBase });

const meetings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string().optional(),
    participants: z.array(z.string()).optional(),
  }),
});

const insights = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    order: z.number().optional(),
  }),
});

const reports = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string().optional(),
    htmlFile: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const collections = { overview, platform, content, lecture, meetings, insights, reports };
