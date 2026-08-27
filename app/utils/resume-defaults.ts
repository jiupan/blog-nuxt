import type { ResumeDocument, ResumeSectionItem, ResumeSectionType, ResumeTemplate } from '~/types/resume'

export function createResumeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptySectionItem(): ResumeSectionItem {
  return {
    id: createResumeId(),
    range: '',
    heading: '',
    badge: '',
    direction: '',
    secondary: '',
    tag: '',
    intro: '',
    stack: '',
    bullets: ''
  }
}

export function inferResumeSectionType(title: string): ResumeSectionType {
  if (/教育|学历|学习/.test(title)) return 'education'
  if (/技能|特长|能力/.test(title)) return 'skills'
  if (/项目/.test(title)) return 'project'
  if (/科研|论文|研究/.test(title)) return 'research'
  if (/校园|社团|学生/.test(title)) return 'campus'
  return 'experience'
}

export function createDefaultResume(): ResumeDocument {
  return {
    title: '林知夏的示例简历',
    layout: {
      template: 'classic',
      sectionGap: 2.2,
      lineHeight: 1.5,
      pageMargin: 5,
      fontSize: 10.3
    },
    content: {
      basic: {
        name: '林知夏',
        birth: '2000-08',
        gender: '女',
        politicalStatus: '群众',
        hometown: '浙江杭州',
        phone: '138 0000 0000',
        email: 'lin.zhixia@example.com',
        avatar: ''
      },
      sections: [
        {
          id: createResumeId(),
          title: '教育背景',
          type: 'education',
          items: [
            {
              ...createEmptySectionItem(),
              range: '2022-09 ~ 2025-06',
              heading: '海川大学（示例院校）',
              badge: '双一流 211',
              direction: '研究方向：智能软件工程',
              tag: '软件工程（硕士）',
              intro: '专业成绩：GPA 3.72 / 4.00｜专业前 10%　主修课程：软件工程、分布式系统、算法设计与分析、数据库系统'
            },
            {
              ...createEmptySectionItem(),
              range: '2018-09 ~ 2022-06',
              heading: '远航理工大学（示例院校）',
              badge: '省重点',
              direction: '',
              tag: '计算机科学（本科）',
              intro: '获得校级优秀毕业生、一等奖学金，参与学院开源技术社团。'
            }
          ]
        },
        {
          id: createResumeId(),
          title: '技能特长',
          type: 'skills',
          items: [{
            ...createEmptySectionItem(),
            bullets: '编程语言：熟悉 Java、TypeScript，具备良好的面向对象设计与编码能力。\n后端框架：熟悉 Spring Boot、MyBatis，了解微服务治理与常见设计模式。\n前端开发：熟悉 Vue 3、Nuxt、TailwindCSS，能够独立完成响应式页面开发。\n存储与缓存：熟悉 PostgreSQL、MySQL、Redis，了解索引优化、事务与分布式锁。\n工程实践：熟悉 Git、Docker、Linux、单元测试及持续集成流程。\n大模型应用：了解 RAG、Function Calling、Prompt Engineering 与多轮对话管理。'
          }]
        },
        {
          id: createResumeId(),
          title: '项目经验',
          type: 'project',
          items: [
            {
              ...createEmptySectionItem(),
              range: '2024-08 ~ 2025-03',
              heading: 'FlowDesk - 团队知识工作台',
              tag: '全栈开发',
              intro: '面向中小团队的知识管理与智能问答平台，支持文档接入、语义检索、引用溯源和对话管理。',
              stack: 'Nuxt、TypeScript、Spring Boot、PostgreSQL、Redis、Docker',
              bullets: '设计文档解析、分块与混合检索流程，提升长文档问答的召回准确率。\n使用 Redis 实现任务状态缓存与访问限流，降低高峰期数据库压力。\n封装统一的权限校验与异常处理模块，减少重复代码并提升接口一致性。\n通过容器化部署和自动化流水线，实现测试环境的一键发布。'
            },
            {
              ...createEmptySectionItem(),
              range: '2024-02 ~ 2024-07',
              heading: 'CloudCoupon - 营销活动平台',
              tag: '后端开发',
              intro: '用于创建、投放和核销营销权益的示例平台，覆盖领取、库存、结算和数据统计等业务。',
              stack: 'Spring Boot、MyBatis-Plus、Redis、RabbitMQ、MySQL',
              bullets: '使用责任链模式拆分活动创建校验规则，提升业务规则的可扩展性。\n通过缓存预热与 Lua 脚本保证库存扣减原子性，避免超发问题。\n引入消息队列异步处理发放记录，缩短核心领取接口响应时间。\n建立关键链路监控指标，便于快速定位库存与消息积压异常。'
            }
          ]
        },
        {
          id: createResumeId(),
          title: '实习经历',
          type: 'experience',
          items: [{
            ...createEmptySectionItem(),
            range: '2023-07 ~ 2023-12',
            heading: '云舟科技（示例公司）',
            tag: '研发实习生',
            intro: '参与企业协作产品的功能开发、接口联调和线上问题排查。',
            bullets: '完成消息中心与个人设置模块开发，按期交付并通过代码评审。\n整理常见故障排查文档，帮助团队缩短重复问题的处理时间。'
          }]
        },
        {
          id: createResumeId(),
          title: '校园经历',
          type: 'campus',
          items: [{
            ...createEmptySectionItem(),
            range: '2020-09 ~ 2021-09',
            heading: '校园开源技术协会',
            tag: '项目负责人',
            bullets: '组织入门分享与结对编程活动，维护协会示例项目和技术文档。'
          }]
        }
      ]
    }
  }
}

export function normalizeResume(value: Partial<ResumeDocument> | null | undefined): ResumeDocument {
  const fallback = createDefaultResume()
  if (!value || typeof value !== 'object') return fallback

  const sections = Array.isArray(value.content?.sections)
      ? value.content.sections.map(section => ({
        id: typeof section.id === 'string' ? section.id : createResumeId(),
        title: typeof section.title === 'string' ? section.title : '未命名栏目',
        type: ['education', 'skills', 'project', 'experience', 'research', 'campus'].includes(section.type)
          ? section.type as ResumeSectionType
          : inferResumeSectionType(section.title || ''),
        items: Array.isArray(section.items)
          ? section.items.map(item => ({ ...createEmptySectionItem(), ...item }))
          : []
      }))
    : fallback.content.sections

  return {
    title: typeof value.title === 'string' ? value.title : fallback.title,
    layout: {
      template: ['classic', 'modern'].includes(value.layout?.template || '')
        ? value.layout?.template as ResumeTemplate
        : fallback.layout.template,
      sectionGap: Number.isFinite(value.layout?.sectionGap) ? Number(value.layout?.sectionGap) : fallback.layout.sectionGap,
      lineHeight: Number.isFinite(value.layout?.lineHeight) ? Number(value.layout?.lineHeight) : fallback.layout.lineHeight,
      pageMargin: Number.isFinite(value.layout?.pageMargin) ? Number(value.layout?.pageMargin) : fallback.layout.pageMargin,
      fontSize: Number.isFinite(value.layout?.fontSize) ? Number(value.layout?.fontSize) : fallback.layout.fontSize
    },
    content: {
      basic: { ...fallback.content.basic, ...(value.content?.basic || {}) },
      sections
    }
  }
}
