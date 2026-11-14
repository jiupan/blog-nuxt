-- Initial directory entries from https://www.zibll.com/friendship-links.
-- Append to the existing order and preserve entries already collected by URL.
WITH entries AS (
  SELECT * FROM (VALUES
    (1, '百度搜索', 'https://www.baidu.com/', 'TOOL', 'RECOMMENDED', '搜索中文网页、图片和资讯。'),
    (2, 'Google 搜索', 'https://www.google.com.hk/', 'TOOL', 'RECOMMENDED', '查找全球网页、图片和其他公开信息。'),
    (3, '必应搜索', 'https://cn.bing.com/', 'TOOL', 'RECOMMENDED', '微软的网页、图片和视频搜索。'),
    (4, '360 搜索', 'https://www.so.com/', 'TOOL', 'RECOMMENDED', '搜索中文网页和资讯。'),
    (5, '搜狗搜索', 'https://www.sogou.com/', 'TOOL', 'RECOMMENDED', '支持中文网页与微信公众号内容检索。'),
    (6, '雅虎搜索', 'https://search.yahoo.com/', 'TOOL', 'RECOMMENDED', '查找英文网页和资讯。'),
    (7, 'TinyPNG', 'https://tinypng.com/', 'TOOL', 'RECOMMENDED', '在线压缩 WebP、PNG 和 JPEG 图片。'),
    (8, 'Iconfont', 'https://www.iconfont.cn/', 'TOOL', 'RECOMMENDED', '查找矢量图标，为网页和应用整理图标集。'),
    (9, 'Iconfinder', 'https://www.iconfinder.com/', 'TOOL', 'RECOMMENDED', '按风格和授权查找图标与插图。'),
    (10, 'Flaticon', 'https://www.flaticon.com/', 'TOOL', 'RECOMMENDED', '检索图标、贴纸和成套素材。'),
    (11, '字体天下', 'https://www.fonts.net.cn/', 'TOOL', 'RECOMMENDED', '在线预览和查找中英文字体。'),
    (12, '花瓣网', 'https://huaban.com/', 'TOOL', 'RECOMMENDED', '浏览和收藏设计参考图。'),
    (13, '必应图片', 'https://cn.bing.com/images/', 'TOOL', 'RECOMMENDED', '按关键词和尺寸等条件查找图片。'),
    (14, 'GitHub', 'https://github.com/', 'SITE', 'TECH', '托管代码、浏览开源项目并参与协作。'),
    (15, 'Gitee（码云）', 'https://gitee.com/', 'SITE', 'TECH', '浏览和托管 Git 仓库。'),
    (16, '稀土掘金', 'https://juejin.cn/', 'SITE', 'TECH', '阅读开发者分享的技术实践和学习笔记。'),
    (17, 'CSDN', 'https://www.csdn.net/', 'SITE', 'TECH', '查阅技术博客、问答与开发资料。'),
    (18, 'SegmentFault 思否', 'https://segmentfault.com/', 'SITE', 'TECH', '查找和讨论编程问题。'),
    (19, '开源中国', 'https://www.oschina.net/', 'SITE', 'TECH', '跟踪开源项目和技术资讯。'),
    (20, '菜鸟教程', 'https://www.runoob.com/', 'SITE', 'TECH', '查阅编程入门教程和在线示例。'),
    (21, 'W3School', 'https://www.w3school.com.cn/', 'SITE', 'TECH', '学习 HTML、CSS、JavaScript 等 Web 基础。'),
    (22, '后盾人', 'https://www.houdunren.com/', 'SITE', 'TECH', '查看编程课程与开发者讨论。'),
    (23, 'WordPress', 'https://cn.wordpress.org/', 'SITE', 'TECH', '获取 WordPress 中文版及建站资料。'),
    (24, '百度搜索资源平台', 'https://ziyuan.baidu.com/', 'SITE', 'TECH', '提交网站资源并查看百度搜索相关数据。'),
    (25, '360 站长平台', 'https://zhanzhang.so.com/', 'SITE', 'TECH', '管理网站在 360 搜索中的收录和数据。'),
    (26, '子比主题演示', 'https://demo.zibll.com/', 'SITE', 'TECH', '查看子比 WordPress 主题的界面和功能。'),
    (27, '子比主题购买', 'https://www.zibll.com/pay-zibll', 'SITE', 'TECH', '查看子比主题版本和购买信息。'),
    (28, '子比社区', 'https://www.zibll.com/forums', 'SITE', 'TECH', '交流子比主题和 WordPress 建站问题。'),
    (29, '子比主题文档', 'https://www.zibll.com/%e4%b8%bb%e9%a2%98%e6%96%87%e6%a1%a3', 'SITE', 'TECH', '查阅子比主题的配置和使用教程。'),
    (30, '知乎', 'https://www.zhihu.com/', 'SITE', 'RECOMMENDED', '阅读问答、专栏和经验分享。'),
    (31, '微博', 'https://weibo.com/', 'SITE', 'RECOMMENDED', '关注创作者、热门话题和实时消息。'),
    (32, '百度新闻', 'https://news.baidu.com/', 'SITE', 'RECOMMENDED', '浏览聚合新闻和热点事件。'),
    (33, '腾讯网', 'https://www.qq.com/', 'SITE', 'RECOMMENDED', '查看新闻、科技、财经和体育资讯。'),
    (34, '今日头条', 'https://www.toutiao.com/', 'SITE', 'RECOMMENDED', '浏览新闻、创作者内容和时事热点。'),
    (35, '凤凰新闻', 'https://news.ifeng.com/', 'SITE', 'RECOMMENDED', '阅读国内外新闻与时事评论。'),
    (36, '网易新闻', 'https://news.163.com/', 'SITE', 'RECOMMENDED', '查看新闻报道和专题。'),
    (37, 'ZAKER 新闻', 'https://www.myzaker.com/', 'SITE', 'RECOMMENDED', '浏览来自多家媒体的新闻和专栏。'),
    (38, '澎湃新闻', 'https://www.thepaper.cn/', 'SITE', 'RECOMMENDED', '阅读时政、社会与文化报道。'),
    (39, '央视新闻', 'https://news.cctv.com/', 'SITE', 'RECOMMENDED', '查看央视新闻报道和视频。'),
    (40, '新浪娱乐', 'https://ent.sina.com.cn/', 'SITE', 'RECOMMENDED', '关注影视、音乐和娱乐资讯。'),
    (41, '哔哩哔哩（bilibili）', 'https://www.bilibili.com/', 'SITE', 'LIFE', '观看创作者视频、动画和直播。'),
    (42, '爱奇艺', 'https://www.iqiyi.com/', 'SITE', 'LIFE', '观看电影、剧集、综艺和纪录片。'),
    (43, '优酷', 'https://www.youku.com/', 'SITE', 'LIFE', '查找剧集、综艺和电影。'),
    (44, '芒果 TV', 'https://www.mgtv.com/', 'SITE', 'LIFE', '观看综艺、剧集和电视节目。'),
    (45, '搜狐视频', 'https://tv.sohu.com/', 'SITE', 'LIFE', '观看剧集、自制节目和短视频。'),
    (46, '西瓜视频', 'https://www.ixigua.com/', 'SITE', 'LIFE', '浏览知识、生活和娱乐视频。'),
    (47, '土豆视频', 'https://www.tudou.com/', 'SITE', 'LIFE', '浏览短视频和影视内容。'),
    (48, '抖音', 'https://www.douyin.com/', 'SITE', 'LIFE', '浏览短视频和直播。'),
    (49, '快手', 'https://www.kuaishou.com/', 'SITE', 'LIFE', '观看生活短视频和直播。'),
    (50, '虎牙直播', 'https://www.huya.com/', 'SITE', 'LIFE', '观看游戏直播和电竞赛事。'),
    (51, '网易云音乐', 'https://music.163.com/', 'SITE', 'LIFE', '听音乐、探索歌单和播客。'),
    (52, 'QQ 音乐', 'https://y.qq.com/', 'SITE', 'LIFE', '查找歌曲、专辑和歌单。'),
    (53, '酷我音乐', 'https://www.kuwo.cn/', 'SITE', 'LIFE', '在线听歌和浏览音乐榜单。'),
    (54, '酷狗音乐', 'https://www.kugou.com/', 'SITE', 'LIFE', '听音乐和有声内容。'),
    (55, '全民 K 歌', 'https://kg.qq.com/', 'SITE', 'LIFE', '浏览翻唱作品和线上K歌内容。')
  ) AS source(position, title, url, category, group_name, note)
), last_position AS (
  SELECT COALESCE(MAX("sort"), -1) AS position FROM "Bookmark"
)
INSERT INTO "Bookmark" ("title", "url", "category", "friendGroup", "note", "status", "sort", "publishedAt")
SELECT entries.title, entries.url, entries.category::"BookmarkCategory", entries.group_name::"FriendLinkGroup",
       entries.note, 'PUBLISHED', last_position.position + entries.position, CURRENT_TIMESTAMP
FROM entries CROSS JOIN last_position
ORDER BY entries.position
ON CONFLICT ("url") DO NOTHING;
