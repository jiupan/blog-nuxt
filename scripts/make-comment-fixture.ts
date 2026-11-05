import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

/**
 * 生成一份人工构造的上游备份夹具。
 *
 * 真实备份在仓库外，开发期需要一份可控样本来演练导入工具。
 * 夹具刻意覆盖这些边界：中文 slug、带 .html 的旧路径、主评论与两级回复、
 * 隐藏与已删除、跨文章父子、缺失父节点、孤儿回复、表情与图片、
 * 没有点赞字段、以及一条数字状态标记。
 */

const HOST = process.env.FIXTURE_HOST ?? 'https://legacy.example.com'

type FixtureComment = {
  _id: string
  url: string
  pid: string
  rid: string
  ruser: string
  nick: string
  mail: string
  link: string
  ua: string
  ip: string
  comment: string
  created: string
  status: string
  like?: number
}

const comments: FixtureComment[] = [
  {
    _id: 'root-1',
    url: `${HOST}/hello-nuxt-blog`,
    pid: '',
    rid: '',
    ruser: '',
    nick: '路人甲',
    mail: 'a@example.com',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.10',
    comment: '第一篇，**写得不错**。\n\n```ts\nconsole.log(1)\n```',
    created: '2023-04-01T08:00:00.000Z',
    status: '',
    like: 3
  },
  {
    _id: 'reply-1',
    url: `${HOST}/hello-nuxt-blog`,
    pid: 'root-1',
    rid: 'root-1',
    ruser: '路人甲',
    nick: '博主',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.11',
    comment: '谢谢！后面会继续写。',
    created: '2023-04-01T09:30:00.000Z',
    status: ''
  },
  {
    _id: 'reply-2',
    url: `${HOST}/hello-nuxt-blog`,
    pid: 'reply-1',
    rid: 'root-1',
    ruser: '博主',
    nick: '访客乙',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.12',
    comment: '同问，部署到自己的服务器要改配置吗？',
    created: '2023-04-01T10:15:00.000Z',
    status: ''
  },
  {
    _id: 'root-2',
    url: `${HOST}/archives/old-slug.html`,
    pid: '',
    rid: '',
    ruser: '',
    nick: '访客丙',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.13',
    comment: '旧链接的评论：换到新地址了。<img src="https://cdn.legacy.example.com/img/1.png?token=secret">',
    created: '2023-05-02T12:00:00.000Z',
    status: 'hidden',
    like: 0
  },
  {
    _id: 'root-3',
    url: `${HOST}/中文标题`,
    pid: '',
    rid: '',
    ruser: '',
    nick: '很长的昵称用来测试截断行为一二三四五六七八九十一二三四五六七八九十',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.14',
    comment: '中文 slug 的评论。<img class="emoji" src="https://twikoo.example.com/emoji/1.png">',
    created: '2023-06-03T13:00:00.000Z',
    status: 'deleted'
  },
  {
    _id: 'reply-3',
    url: `${HOST}/hello-nuxt-blog`,
    pid: 'missing-root',
    rid: 'missing-root',
    ruser: '不存在的人',
    nick: '访客丁',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.15',
    comment: '这条的父评论不在备份里。',
    created: '2023-07-04T14:00:00.000Z',
    status: ''
  },
  {
    _id: 'root-4',
    url: `${HOST}/hello-nuxt-blog`,
    pid: '',
    rid: '',
    ruser: '',
    nick: '访客戊',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.16',
    comment: '这条没有点赞字段，历史点赞数应当留空。',
    created: '2023-08-05T15:00:00.000Z',
    status: '0'
  },
  {
    _id: 'root-5',
    url: `${HOST}/hello-nuxt-blog`,
    pid: '',
    rid: '',
    ruser: '',
    nick: '',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.17',
    comment: '',
    created: '2023-09-06T16:00:00.000Z',
    status: ''
  },
  {
    _id: 'reply-4',
    url: `${HOST}/archives/old-slug.html`,
    pid: 'root-1',
    rid: 'root-1',
    ruser: '路人甲',
    nick: '访客己',
    mail: '',
    link: '',
    ua: 'Mozilla/5.0',
    ip: '203.0.113.18',
    comment: '跨文章的父子关系。',
    created: '2023-10-07T17:00:00.000Z',
    status: ''
  }
]

const outputPath = resolve(process.argv[2] ?? 'fixtures/twikoo-comments.sample.json')

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(comments, null, 2)}\n`, 'utf8')

process.stdout.write(`夹具已写入 ${outputPath}（${comments.length} 条）\n`)
