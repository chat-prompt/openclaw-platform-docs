import { defineCollection, z } from 'astro:content';

const flexSchema = z.object({
  title: z.string(),
  date: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  category: z.string().optional(),
  publishedAt: z.string().optional(),
  participants: z.array(z.string()).optional(),
  source: z.string().optional(),
  duration: z.string().optional(),
  htmlFile: z.string().optional(),
});

const openclawContent = defineCollection({ type: 'content', schema: flexSchema });
const openclawPlatform = defineCollection({ type: 'content', schema: flexSchema });

export const collections = {
  'openclaw-content': openclawContent,
  'openclaw-platform': openclawPlatform,
};
