import { defineCollection, z } from 'astro:content';

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    series: z.literal('notes'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    token: z.string().optional(),
  }),
});

const academy = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    episode: z.number(),
    date: z.string(),
    series: z.literal('academy'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    token: z.string().optional(),
  }),
});

const training = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    episode: z.number(),
    date: z.string(),
    series: z.literal('training'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    token: z.string().optional(),
  }),
});

const setupGuides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    episode: z.number(),
    series: z.literal('setup-guides'),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    cover: z.string().optional(),
    accentColor: z.string().optional(),
    tags: z.array(z.string()).optional(),
    token: z.string().optional(),
  }),
});

const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    episode: z.number(),
    date: z.string(),
    series: z.literal('case-studies'),
    category: z.string().optional(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    cover: z.string().optional(),
    accentColor: z.string().optional(),
    tags: z.array(z.string()).optional(),
    token: z.string().optional(),
  }),
});

const raisingOneBot = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    episode: z.number(),
    date: z.string(),
    series: z.literal('raising-one-bot'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    token: z.string().optional(),
  }),
});

export const collections = { notes, academy, training, 'setup-guides': setupGuides, 'case-studies': caseStudies, 'raising-one-bot': raisingOneBot };
