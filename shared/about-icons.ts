const brands = [
  ['OpenJDK', 'openjdk', 'Java JDK JVM'],
  ['Python', 'python'],
  ['Spring', 'spring'],
  ['Spring Boot', 'springboot'],
  ['Kotlin', 'kotlin'],
  ['Scala', 'scala'],
  ['JavaScript', 'javascript', 'JS'],
  ['TypeScript', 'typescript', 'TS'],
  ['Node.js', 'nodedotjs', 'Node'],
  ['Go', 'go', 'Golang'],
  ['Rust', 'rust'],
  ['C', 'c'],
  ['C++', 'cplusplus', 'CPP'],
  ['C#', 'dotnet', 'CSharp .NET Dotnet'],
  ['PHP', 'php'],
  ['Ruby', 'ruby'],
  ['Swift', 'swift'],
  ['Dart', 'dart'],
  ['HTML', 'html5'],
  ['CSS', 'css'],
  ['Vue.js', 'vuedotjs', 'Vue'],
  ['Nuxt', 'nuxt'],
  ['React', 'react'],
  ['Next.js', 'nextdotjs', 'Next'],
  ['Svelte', 'svelte'],
  ['Angular', 'angular'],
  ['Flutter', 'flutter'],
  ['Vite', 'vite'],
  ['Django', 'django'],
  ['FastAPI', 'fastapi'],
  ['Flask', 'flask'],
  ['OpenAI', 'openai', 'AI ChatGPT GPT'],
  ['Claude', 'claude', 'AI Anthropic'],
  ['PyTorch', 'pytorch', 'AI ML'],
  ['TensorFlow', 'tensorflow', 'AI ML'],
  ['Hugging Face', 'huggingface', 'AI ML'],
  ['LangChain', 'langchain', 'AI LLM'],
  ['Ollama', 'ollama', 'AI LLM'],
  ['OpenCV', 'opencv', 'AI CV'],
  ['Jupyter', 'jupyter', 'Notebook'],
  ['NumPy', 'numpy'],
  ['pandas', 'pandas'],
  ['MySQL', 'mysql'],
  ['PostgreSQL', 'postgresql', 'Postgres SQL'],
  ['SQLite', 'sqlite'],
  ['Redis', 'redis'],
  ['MongoDB', 'mongodb'],
  ['Prisma', 'prisma'],
  ['Docker', 'docker'],
  ['Kubernetes', 'kubernetes', 'K8s'],
  ['Linux', 'linux'],
  ['Nginx', 'nginx'],
  ['Git', 'git'],
  ['GitHub', 'github'],
  ['GitLab', 'gitlab'],
  ['Terraform', 'terraform']
] as const

export const aboutIcons = [
  { label: '人工智能', name: 'i-lucide-brain-circuit', aliases: 'AI LLM ML 大模型 深度学习 机器学习' },
  { label: '机器人', name: 'i-lucide-bot', aliases: 'AI Agent 智能体' },
  { label: '星光', name: 'i-lucide-sparkles', aliases: 'AI 生成式 AI' },
  { label: '代码', name: 'i-lucide-code-xml', aliases: 'Code 编程 开发' },
  { label: '终端', name: 'i-lucide-terminal', aliases: 'Terminal CLI 命令行' },
  { label: '数据库', name: 'i-lucide-database', aliases: 'Database SQL 数据' },
  { label: '云服务', name: 'i-lucide-cloud', aliases: 'Cloud AWS Azure GCP 云计算' },
  { label: '服务器', name: 'i-lucide-server', aliases: 'Server 运维 部署' },
  ...brands.map(([label, slug, aliases]) => ({ label, name: `i-simple-icons-${slug}`, aliases: aliases ?? '' }))
]

export function searchAboutIcons(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return aboutIcons.filter(icon => {
    const terms = `${icon.label} ${icon.aliases} ${icon.name}`.toLowerCase()
    return words.every(word => terms.includes(word))
  })
}
