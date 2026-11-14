UPDATE "BookmarkPage" SET "title" = '发现值得收藏的网站。'
WHERE "id" = 1 AND "title" = '一起发现有趣的独立博客。' AND "intro" = '';

UPDATE "MenuItem" SET "title" = '网站导航'
WHERE ("url" IN ('/link', '/link/') OR ("type" = 'PAGE' AND "targetSlug" = 'link'))
  AND "title" IN ('书签', '友链');
