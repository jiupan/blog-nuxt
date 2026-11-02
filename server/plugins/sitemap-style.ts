export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:output', (context) => {
    context.sitemap = context.sitemap.replace(
      /^(<\?xml[^?]*\?>)/,
      '$1\n<?xml-stylesheet type="text/css" href="/sitemap.css"?>'
    )
  })
})
