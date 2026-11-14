-- Append links to the five original sections created by 20261115000000.
-- The section IDs survive rename and reorder. A deleted section is skipped.
BEGIN;

SELECT "id" FROM "BookmarkPage" WHERE "id" = 1 FOR UPDATE;

WITH entries(position, section_id, title, url, note, avatar) AS (
  VALUES
    ( 1, 1, 'IT之家', 'https://www.ithome.com/', '查看手机、电脑和数码产品资讯。', '/images/link-icons/ithome.webp'),
    ( 2, 1, '阮一峰的网络日志', 'https://www.ruanyifeng.com/blog/', '阅读科技爱好者周刊和阮一峰的技术随笔。', '/images/link-icons/ruanyifeng.webp'),
    ( 3, 1, '少数派', 'https://sspai.com/', '看看数字生活、应用体验和效率实践。', '/images/link-icons/sspai.webp'),
    ( 4, 1, 'V2EX', 'https://www.v2ex.com/', '浏览开发者讨论、项目分享和日常经验。', '/images/link-icons/v2ex.webp'),
    ( 5, 1, '爱范儿', 'https://www.ifanr.com/', '关注消费科技、产品体验与设计。', '/images/link-icons/ifanr.webp'),
    ( 6, 1, '果壳', 'https://www.guokr.com/', '阅读生活科学、健康与技术方面的科普文章。', '/images/link-icons/guokr.webp'),
    ( 7, 1, '人民网', 'https://www.people.com.cn/', '查看新闻报道及各地时事信息。', '/images/link-icons/people.webp'),
    ( 8, 1, '新华网', 'https://www.news.cn/', '阅读国内外新闻、专题和现场报道。', '/images/link-icons/xinhuanet.webp'),
    ( 9, 1, 'Tw93 的博客', 'https://tw93.fun/', '阅读开源项目、设计与开发随笔。', '/images/link-icons/tw93.webp'),
    (10, 1, '张洪 Heo', 'https://blog.zhheo.com/', '浏览个人博客设计、独立项目与生活文章。', '/images/link-icons/zhheo.webp'),
    (11, 1, 'Anthony Fu', 'https://antfu.me/', '浏览开源项目和关于前端工具的文章。', '/images/link-icons/antfu.webp'),
    (12, 1, 'Simon Willison 的博客', 'https://simonwillison.net/', '阅读 AI 工具、开源软件和独立开发的实验记录。', '/images/link-icons/simonwillison.webp'),
    (13, 1, '虎嗅', 'https://www.huxiu.com/', '阅读互联网、商业和消费趋势报道。', '/images/link-icons/huxiu.webp'),
    (14, 2, '百度翻译', 'https://fanyi.baidu.com/', '翻译文字、图片和文档。', '/images/link-icons/baidu-fanyi.webp'),
    (15, 2, '网易有道翻译', 'https://fanyi.youdao.com/', '查词、翻译文本和文档。', '/images/link-icons/youdao-fanyi.webp'),
    (16, 2, '腾讯文档', 'https://docs.qq.com/', '在线创建文档、表格并协作编辑。', '/images/link-icons/tencent-docs.webp'),
    (17, 2, 'WPS Office', 'https://www.wps.cn/', '查看办公套件及云文档入口。', '/images/link-icons/wps.webp'),
    (18, 2, 'Canva 可画', 'https://www.canva.cn/', '使用模板制作海报、演示文稿和社交图片。', '/images/link-icons/canva-cn.webp'),
    (19, 2, '百度网盘', 'https://pan.baidu.com/', '访问网盘文件、上传和分享资料。', '/images/link-icons/baidu-disk.webp'),
    (20, 2, 'QQ 邮箱', 'https://mail.qq.com/', '登录邮箱，收发邮件和管理文件。', '/images/link-icons/tencent-qq-mail.webp'),
    (21, 2, '铁路 12306', 'https://www.12306.cn/', '查询铁路车次和车票，并管理出行订单。', '/images/link-icons/12306.webp'),
    (22, 2, 'Squoosh', 'https://squoosh.app/', '在浏览器里压缩图片并比较画质和文件大小。', '/images/link-icons/squoosh.webp'),
    (23, 2, 'Excalidraw', 'https://excalidraw.com/', '绘制手绘风流程图、草图和协作白板。', '/images/link-icons/excalidraw.webp'),
    (24, 2, 'diagrams.net', 'https://app.diagrams.net/', '制作流程图、架构图和其他结构图。', '/images/link-icons/diagrams.webp'),
    (25, 2, 'Regex101', 'https://regex101.com/', '实时测试正则表达式并查看匹配解释。', '/images/link-icons/regex101.webp'),
    (26, 2, 'StackBlitz', 'https://stackblitz.com/', '无需本地安装即可启动和分享前端项目。', '/images/link-icons/stackblitz.webp'),
    (27, 2, 'Mermaid Live Editor', 'https://mermaid.live/', '用文本编写并预览 Mermaid 图表。', '/images/link-icons/mermaid.webp'),
    (28, 2, 'Can I Use', 'https://caniuse.com/', '查询 Web 特性在不同浏览器版本中的支持情况。', '/images/link-icons/caniuse.webp'),
    (29, 2, 'Photopea', 'https://www.photopea.com/', '在浏览器里编辑 PSD 等格式的图像。', '/images/link-icons/photopea.webp'),
    (30, 2, 'PageSpeed Insights', 'https://pagespeed.web.dev/', '检查网页性能并定位可以改进的环节。', '/images/link-icons/pagespeed.webp'),
    (31, 2, 'Convertio', 'https://convertio.co/zh/', '在浏览器里转换常见文档、图片和音视频格式。', '/images/link-icons/convertio.webp'),
    (32, 2, 'Desmos 图形计算器', 'https://www.desmos.com/calculator', '绘制函数图像，并用滑块观察参数变化。', '/images/link-icons/desmos.webp'),
    (33, 2, '石墨文档', 'https://shimo.im/', '在线写文档、做表格及多人协作。', '/images/link-icons/shimo.webp'),
    (34, 3, 'MDN Web Docs', 'https://developer.mozilla.org/zh-CN/', '查阅 Web API、HTML、CSS 和 JavaScript 参考。', '/images/link-icons/mdn.webp'),
    (35, 3, 'Vue.js 中文文档', 'https://cn.vuejs.org/', '学习模板、响应式和组件的写法。', '/images/link-icons/vuejs.webp'),
    (36, 3, 'Node.js 文档', 'https://nodejs.org/docs/latest/api/', '查阅 Node.js 核心模块和 API。', '/images/link-icons/nodejs.webp'),
    (37, 3, 'Python 中文文档', 'https://docs.python.org/zh-cn/3/', '查阅 Python 教程、语言参考和标准库。', '/images/link-icons/python.webp'),
    (38, 3, 'React 中文文档', 'https://zh-hans.react.dev/', '学习 React 组件、状态和常用 Hook。', '/images/link-icons/react.webp'),
    (39, 3, 'Git 文档', 'https://git-scm.com/doc', '查 Git 命令手册和 Pro Git 教材。', '/images/link-icons/git.webp'),
    (40, 3, '阿里云帮助中心', 'https://help.aliyun.com/', '查询云服务器、对象存储和其他云产品用法。', '/images/link-icons/cloud-aliyun.webp'),
    (41, 3, '腾讯云文档', 'https://cloud.tencent.com/document', '查阅云服务器、数据库和域名解析说明。', '/images/link-icons/cloud-tencent.webp'),
    (42, 3, 'Nuxt 文档', 'https://nuxt.com/docs', '查阅 Nuxt 路由、数据获取和部署指南。', '/images/link-icons/nuxt.webp'),
    (43, 3, 'Vite 中文文档', 'https://cn.vite.dev/', '了解开发服务器、构建配置和插件 API。', '/images/link-icons/vite.webp'),
    (44, 3, 'TypeScript 文档', 'https://www.typescriptlang.org/docs/', '查阅类型系统、配置和迁移指南。', '/images/link-icons/typescript.webp'),
    (45, 3, 'PostgreSQL 文档', 'https://www.postgresql.org/docs/current/', '查阅 SQL、索引、事务和数据库运维说明。', '/images/link-icons/postgresql.webp'),
    (46, 3, 'Prisma 文档', 'https://www.prisma.io/docs', '查阅数据模型、数据库迁移和客户端查询。', '/images/link-icons/prisma.webp'),
    (47, 3, 'Docker 文档', 'https://docs.docker.com/', '学习容器、镜像、Compose 和部署。', '/images/link-icons/docker.webp'),
    (48, 3, 'Kubernetes 中文文档', 'https://kubernetes.io/zh-cn/docs/', '查阅容器编排、集群和应用部署的文档。', '/images/link-icons/kubernetes.webp'),
    (49, 3, 'Rust 文档', 'https://www.rust-lang.org/learn', '从官方教程和示例入门 Rust。', '/images/link-icons/rust.webp'),
    (50, 3, 'Go 文档', 'https://go.dev/doc/', '查看 Go 入门、模块和标准工具链文档。', '/images/link-icons/golang.webp'),
    (51, 3, 'Cloudflare 开发者文档', 'https://developers.cloudflare.com/', '查阅 DNS、Workers 和边缘服务配置文档。', '/images/link-icons/cloudflare.webp'),
    (52, 3, 'web.dev', 'https://web.dev/learn', '系统学习网页性能、无障碍与响应式设计。', '/images/link-icons/webdev.webp'),
    (53, 3, 'Tailwind CSS 文档', 'https://tailwindcss.com/docs', '查找实用类、响应式写法和主题定制说明。', '/images/link-icons/tailwindcss.webp'),
    (54, 3, '博客园', 'https://www.cnblogs.com/', '阅读开发者的技术笔记和问题解决经验。', '/images/link-icons/cnblogs.webp'),
    (55, 3, 'InfoQ 中文站', 'https://www.infoq.cn/', '了解软件架构、工程实践和技术团队经验。', '/images/link-icons/infoq-cn.webp'),
    (56, 4, '小红书', 'https://www.xiaohongshu.com/', '浏览生活经验、旅行攻略和兴趣笔记。', '/images/link-icons/xiaohongshu.webp'),
    (57, 4, '高德地图', 'https://www.amap.com/', '搜索地点，查询驾车、步行和公共交通路线。', '/images/link-icons/amap.webp'),
    (58, 4, '微信读书', 'https://weread.qq.com/', '查找并阅读电子书，浏览读者书评。', '/images/link-icons/qq-reading.webp'),
    (59, 4, '喜马拉雅', 'https://www.ximalaya.com/', '收听有声书、播客和电台节目。', '/images/link-icons/ximalaya.webp'),
    (60, 4, '京东', 'https://www.jd.com/', '查看商品、价格和用户评价。', '/images/link-icons/jd.webp'),
    (61, 4, '淘宝', 'https://www.taobao.com/', '搜索不同店铺的商品和商品详情。', '/images/link-icons/taobao.webp'),
    (62, 4, '腾讯视频', 'https://v.qq.com/', '观看剧集、综艺、电影及纪录片。', '/images/link-icons/tencent-video.webp'),
    (63, 4, '豆瓣', 'https://www.douban.com/', '查找书籍、电影、音乐和读者评论。', '/images/link-icons/douban.webp'),
    (64, 4, '下厨房', 'https://www.xiachufang.com/', '查找家常菜谱和烘焙做法。', '/images/link-icons/xiachufang.webp'),
    (65, 4, '穷游网', 'https://www.qyer.com/', '参考旅行者的路线、游记和目的地经验。', '/images/link-icons/qyer.webp'),
    (66, 4, '携程旅行', 'https://www.ctrip.com/', '查询交通、住宿和目的地信息。', '/images/link-icons/ctrip.webp'),
    (67, 4, '中国天气网', 'https://www.weather.com.cn/', '查看国内城市天气预报和气象信息。', '/images/link-icons/weathercn.webp'),
    (68, 4, '维基百科', 'https://zh.wikipedia.org/', '查找日常知识并沿参考资料继续阅读。', '/images/link-icons/wiki.webp'),
    (69, 4, '央视网视频', 'https://tv.cctv.com/', '观看央视栏目、纪录片和节目回放。', '/images/link-icons/cctv-video.webp'),
    (70, 5, 'Flex 布局教程：语法篇', 'https://www.ruanyifeng.com/blog/2015/07/flex-grammar.html', '用示意图理解 Flex 容器和项目的常用属性。', '/images/link-icons/ruanyifeng.webp'),
    (71, 5, 'CSS Grid 网格布局教程', 'https://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html', '从行列、间距和区域入手理解 CSS Grid。', '/images/link-icons/ruanyifeng.webp'),
    (72, 5, '理解 OAuth 2.0', 'https://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html', '理解授权角色和访问令牌的基本流程。', '/images/link-icons/ruanyifeng.webp'),
    (73, 5, 'Git 分支管理策略', 'https://www.ruanyifeng.com/blog/2012/07/git.html', '了解一种用分支管理开发、发布和修复的思路。', '/images/link-icons/ruanyifeng.webp'),
    (74, 5, '交互式 Flexbox 指南', 'https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/', '拖动示例掌握 Flexbox 的对齐和空间分配。', '/images/link-icons/joshwcomeau.webp'),
    (75, 5, 'HTTP 缓存', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching', '查阅浏览器与共享缓存如何复用和验证响应。', '/images/link-icons/mdn.webp'),
    (76, 5, '跨源资源共享（CORS）', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS', '理解跨源请求的响应头与预检过程。', '/images/link-icons/mdn.webp'),
    (77, 5, '什么是 Core Web Vitals', 'https://web.dev/articles/vitals', '了解衡量加载、交互和视觉稳定性的指标。', '/images/link-icons/webdev.webp'),
    (78, 5, 'Pro Git：分支简介', 'https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell', '从提交和指针理解 Git 分支的工作方式。', '/images/link-icons/git.webp'),
    (79, 5, '如何做好工作', 'https://paulgraham.com/greatwork.html', '围绕好奇心、长期投入和选择方向的长文。', '/images/link-icons/paulgraham.webp'),
    (80, 5, '机械表如何运转', 'https://ciechanow.ski/mechanical-watch/', '用互动图解观察发条、齿轮和擒纵机构。', '/images/link-icons/ciechanowski.webp')
), last_position AS (
  SELECT COALESCE(MAX("sort"), -1) AS position FROM "Bookmark"
), inserted AS (
  INSERT INTO "Bookmark" ("sectionId", "title", "url", "note", "avatar", "status", "sort", "publishedAt")
  SELECT section."id", entries.title, entries.url, entries.note, entries.avatar,
    'PUBLISHED', last_position.position + entries.position, CURRENT_TIMESTAMP
  FROM entries
  JOIN "BookmarkSection" AS section ON section."id" = entries.section_id
  CROSS JOIN last_position
  ORDER BY entries.position
  ON CONFLICT ("url") DO NOTHING
  RETURNING "id"
)
UPDATE "BookmarkPage"
SET "revision" = "revision" + 1
WHERE "id" = 1 AND EXISTS (SELECT 1 FROM inserted);

COMMIT;
