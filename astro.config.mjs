// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
  site: 'https://bboya-viewer.vercel.app',
  trailingSlash: 'never',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm],
  },
  redirects: {
    '/team-guides': '/case-studies/handbook',
    '/team-guides/guide-01-workspace': '/case-studies/handbook/guide-01-workspace',
    '/team-guides/guide-02-armor': '/case-studies/handbook/guide-02-armor',
    '/team-guides/guide-03-soul': '/case-studies/handbook/guide-03-soul',
    '/team-guides/guide-04-teamwork': '/case-studies/handbook/guide-04-teamwork',
    '/claude-code': '/case-studies/claude-code',
    '/claude-code/subagent-and-acp': '/case-studies/claude-code/subagent-and-acp',
    '/claude-code/codex-voice-training': '/case-studies/claude-code/codex-voice-training',
    '/claude-code/codex-action-training': '/case-studies/claude-code/codex-action-training',
    '/claude-code/claude-code-bboya': '/case-studies/claude-code/claude-code-bboya',
    '/claude-code/claude-code-slack': '/case-studies/claude-code/claude-code-slack',
  },
});
