import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'change-me-now'

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id
  })

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: { username, passwordHash, role: 'ADMIN', status: 'ACTIVE' }
  })

  const category = await prisma.category.upsert({
    where: { slug: 'notes' },
    update: {},
    create: { name: '随笔', slug: 'notes' }
  })

  const tag = await prisma.tag.upsert({
    where: { slug: 'nuxt' },
    update: {},
    create: { name: 'Nuxt', slug: 'nuxt' }
  })

  await prisma.post.upsert({
    where: { slug: 'hello-nuxt-blog' },
    update: {},
    create: {
      title: '第一篇博客',
      slug: 'hello-nuxt-blog',
      summary: '这是一篇由种子数据创建的示例文章，用来验证前后台闭环。',
      content: '## 你好\n\n博客已经可以从数据库读取文章。\n\n```ts\nconsole.log("Nuxt Blog")\n```',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: category.id,
      tags: {
        create: [{ tagId: tag.id }]
      }
    }
  })
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
