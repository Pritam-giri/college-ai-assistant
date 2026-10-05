import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

const productionSiteUrl = 'https://gpunnaochatbot.vercel.app'
const developmentSiteUrl = 'http://localhost:5173'

const publicRoutes = [
  '/',
  '/about',
  '/help',
  '/departments',
  '/departments/cse',
  '/departments/electronics',
  '/privacy-policy',
  '/terms-and-conditions',
]

function seoFilesPlugin(siteUrl) {
  const origin = new URL(siteUrl).origin
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicRoutes.map((route) => `  <url><loc>${origin}${route}</loc></url>`).join('\n')}\n</urlset>\n`
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /register\nDisallow: /verify-email\nDisallow: /forgot-password\nDisallow: /chatbot\nDisallow: /practicals\nDisallow: /assignments\nSitemap: ${origin}/sitemap.xml\n`

  return {
    name: 'college-seo-files',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] === '/sitemap.xml') {
          response.setHeader('Content-Type', 'application/xml; charset=utf-8')
          response.end(sitemap)
          return
        }
        if (request.url?.split('?')[0] === '/robots.txt') {
          response.setHeader('Content-Type', 'text/plain; charset=utf-8')
          response.end(robots)
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = process.env.VITE_SITE_URL || env.VITE_SITE_URL ||
    (command === 'build' ? productionSiteUrl : developmentSiteUrl)

  return {
    plugins: [react(), seoFilesPlugin(siteUrl)],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
