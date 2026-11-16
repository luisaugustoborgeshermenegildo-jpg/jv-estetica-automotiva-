// Worker da JV na Cloudflare: /api/* vai para a API; o resto é o site em dist/.
import { handleApi } from './api.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
