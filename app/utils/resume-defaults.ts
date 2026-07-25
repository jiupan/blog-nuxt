import type { ResumeDocument, ResumeSectionItem } from '~/types/resume'

export function createResumeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptySectionItem(): ResumeSectionItem {
  return {
    id: createResumeId(),
    range: '',
    heading: '',
    secondary: '',
    tag: '',
    intro: '',
    stack: '',
    bullets: ''
  }
}

export function createDefaultResume(): ResumeDocument {
  return {
    title: '麻得雨的个人简历',
    layout: {
      sectionGap: 2.2,
      lineHeight: 1.5,
      pageMargin: 5,
      fontSize: 10.3
    },
    content: {
      basic: {
        name: '麻得雨',
        birth: '2001-12',
        gender: '男',
        politicalStatus: '共青团员',
        hometown: '陕西渭南',
        phone: '15706078767',
        email: '1765527@qq.com',
        avatar: ''
      },
      sections: [
        {
          id: createResumeId(),
          title: '教育背景',
          items: [
            {
              ...createEmptySectionItem(),
              range: '2024-09 ~ 2027-06',
              heading: '西北大学（双一流 211）',
              tag: '软件工程（硕士）',
              intro: '专业成绩：GPA 3.30 / 4.00｜考研成绩前18%　主修课程：软件工程、分布式系统设计、算法设计与分析'
            },
            {
              ...createEmptySectionItem(),
              range: '2019-09 ~ 2024-06',
              heading: '西北大学（双一流 211）',
              tag: '生物科学（本科）'
            }
          ]
        },
        {
          id: createResumeId(),
          title: '技能特长',
          items: [{
            ...createEmptySectionItem(),
            bullets: '通过大学英语六级（CET-6）考试，能够快速阅读英文文档和书籍，能用英语进行日常交流。\nJava：熟悉 Java 并发编程，了解 JVM、线程池、AQS、CAS。\n框架：熟悉 Spring MVC / Spring Boot，了解 IOC、AOP。\n存储与缓存：熟悉 MySQL / MyBatis，了解事务、索引与锁；熟悉 Redis 数据结构与分布式锁。\n工程工具：熟悉 IDEA、Maven、Git、JUnit、Postman，掌握常用 Linux 命令。\n大模型应用：RAG 检索增强生成、Function Calling、Prompt Engineering、多轮对话管理。'
          }]
        },
        {
          id: createResumeId(),
          title: '项目经验',
          items: [
            {
              ...createEmptySectionItem(),
              range: '2025-08 ~ 2026-01',
              heading: 'AskFlow - 智能问答引擎',
              tag: '后端开发',
              intro: 'AskFlow 是一个企业级 RAG 智能体平台，面向企业文档知识库问答与智能检索场景。',
              stack: 'Spring Boot、MyBatis-Plus、Milvus、Redis、LangChain4j、Sa-Token',
              bullets: '设计双路召回检索架构，基于向量检索与关键词检索并结合重排序提升检索精准度。\n基于 Redis 信号量与 ZSET 实现分布式队列限流，通过 Lua 保证原子操作。\n实现三态熔断器与优先级降级链，自动切换故障模型，保障多模型服务高可用。'
            },
            {
              ...createEmptySectionItem(),
              range: '2025-01 ~ 2025-06',
              heading: '云券 - 优惠券系统',
              tag: '后端开发',
              intro: '面向高并发优惠券领取与平台级分发场景，支持秒杀、分发、结算及搜索等业务。',
              stack: 'Spring Boot 3、Spring Cloud Alibaba、RocketMQ、Redis、MySQL、Sentinel',
              bullets: '基于责任链模式校验商家创建优惠券参数，提升校验逻辑的内聚性与扩展性。\n采用 ShardingSphere 分库分表支撑大规模优惠券模板的高效存储与查询。\n基于 RocketMQ 5.x 延时消息实现用户预约抢券与精准提醒。'
            }
          ]
        },
        {
          id: createResumeId(),
          title: '科研经历',
          items: [{
            ...createEmptySectionItem(),
            stack: 'Python、PyTorch、CUDA、Point-MAE、Point Transformer、TensorBoard',
            bullets: 'Point-ESC: Encoder-Driven Soft Clustering for 3D Point Cloud Pretraining（审核中，IEEE TNNLS）\nPoint-SDCL: Self-Distillation Contrastive Learning via Positive-Negative Interaction and Probabilistic Modeling（审核中，IEEE TVCG）'
          }]
        },
        {
          id: createResumeId(),
          title: '校园经历',
          items: [{
            ...createEmptySectionItem(),
            range: '2021-06 ~ 2022-09',
            heading: '秦岭野生动植物调查项目',
            tag: '组长',
            bullets: '组织野生植物调查数据的整理、统计与可视化分析，对接项目合作单位，同步调查进展与阶段性成果。'
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
        items: Array.isArray(section.items)
          ? section.items.map(item => ({ ...createEmptySectionItem(), ...item }))
          : []
      }))
    : fallback.content.sections

  return {
    title: typeof value.title === 'string' ? value.title : fallback.title,
    layout: {
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
