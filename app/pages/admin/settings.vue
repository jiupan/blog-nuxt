<template>
  <div class="admin-page">
    <AdminPageActions>
      <AdminSaveActions
        :ready="!!form && !loadError"
        :dirty="isDirty"
        :saving="saving"
        :disabled="uploadingControls"
        :undo-disabled="uploadingControls"
        :scope="changedTabs.length > 1 ? `${changedTabs.length} 个分区有未保存修改` : undefined"
        @save="save"
        @undo="resetDraft"
      />
    </AdminPageActions>
    <div v-if="loadError" class="workspace-error" role="alert">
      <span>站点设置加载失败，请重试。</span>
      <UButton color="neutral" variant="outline" @click="reloadSettings()"> 重新加载 </UButton>
    </div>
    <div v-if="form" class="workspace-editor-layout">
      <nav class="workspace-settings-nav" aria-label="设置分类">
        <button
          v-for="tab in visibleTabs"
          :key="tab.value"
          type="button"
          :class="{ 'is-active': activeTab === tab.value }"
          :aria-pressed="activeTab === tab.value"
          @click="selectTab(tab.value)"
        >
          <UIcon :name="settingIcons[tab.value]" class="size-4" />
          {{ tab.label }}
          <span v-if="changedTabs.includes(tab)" class="admin-settings-section-badge" role="img" aria-label="有未保存修改" title="有未保存修改" />
        </button>
        <NuxtLink v-if="selectedTab.area === 'footer'" to="/admin/menus?location=footer">
          <UIcon name="i-lucide-list-tree" class="size-4" />
          分栏链接
          <UIcon name="i-lucide-arrow-up-right" class="size-3" aria-hidden="true" />
        </NuxtLink>
      </nav>
      <section class="admin-panel settings-admin-panel">
        <header class="settings-section-head">
          <h2>{{ currentSettingLabel }}</h2>
          <p>{{ settingDescriptions[activeTab] }}</p>
          <p v-if="changedTabs.some(tab => tab.value !== activeTab)" class="admin-settings-save-scope" role="status">本次保存包含{{ changedTabs.map(tab => tab.label).join('、') }}的修改。</p>
          <p v-if="saveError" class="workspace-error" role="alert">{{ saveError }}</p>
        </header>
        <div v-if="activeTab === 'basic'" class="settings-form">
          <div class="settings-brand-preview">
            <span>
              <img v-if="form.site_logo" :src="form.site_logo" alt="站点标识预览" >
              <UIcon v-else name="i-lucide-feather" class="size-6" />
            </span>
            <div>
              <strong>{{ form.site_title || '站点名称' }}</strong>
              <p>{{ form.site_subtitle || '站点副标题' }}</p>
            </div>
            <small>标识预览</small>
          </div>
          <div class="settings-row">
            <label class="settings-label">站点标题</label>
            <UInput
              v-model="form.site_title"
              icon="i-lucide-type"
              placeholder="站点标题"
              class="settings-control"
            />
            <p class="text-xs text-slate-400">显示在浏览器标题栏和页面头部</p>
          </div>

          <div class="settings-row">
            <label class="settings-label">站点副标题</label>
            <UInput
              v-model="form.site_subtitle"
              icon="i-lucide-text"
              placeholder="站点副标题"
              class="settings-control"
            />
            <p class="text-xs text-slate-400">
              用于首页浏览器标签标题，例如“站点标题 - 站点副标题”
            </p>
          </div>

          <div class="settings-row">
            <label class="settings-label">顶部品牌文字</label>
            <UInput
              v-model="form.site_brand"
              icon="i-lucide-badge"
              placeholder="DYU"
              class="settings-control"
            />
            <p class="text-xs text-slate-400">显示在顶部导航图标右侧，留空时默认显示 DYU</p>
          </div>

          <div class="settings-row">
            <label class="settings-label">Logo URL</label>
            <div class="settings-upload">
              <UInput
                v-model="form.site_logo"
                icon="i-lucide-image"
                placeholder="https://example.com/logo.png"
                class="flex-1"
              />
              <input
                ref="logoInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="uploadFile($event, 'site_logo')"
              >
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-upload"
                :loading="uploading === 'site_logo'"
                @click="logoInputRef?.click()"
              >
                上传
              </UButton>
              <span
                v-if="logoUploaded"
                class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"
              >
                <UIcon name="i-lucide-check" class="size-4" />
                已上传
              </span>
              <span
                v-if="logoUploadError"
                class="inline-flex items-center gap-1 text-sm font-medium text-red-500"
              >
                <UIcon name="i-lucide-alert-circle" class="size-4" />
                上传失败
              </span>
            </div>
            <p class="text-xs text-slate-400">粘贴图片 URL，或点击上传按钮选择本地图片</p>
          </div>

          <div class="settings-row">
            <label class="settings-label">Favicon URL</label>
            <div class="settings-upload">
              <UInput
                v-model="form.site_favicon"
                icon="i-lucide-globe"
                placeholder="https://example.com/favicon.ico"
                class="flex-1"
              />
              <input
                ref="faviconInputRef"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                class="hidden"
                @change="uploadFile($event, 'site_favicon')"
              >
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-upload"
                :loading="uploading === 'site_favicon'"
                @click="faviconInputRef?.click()"
              >
                上传
              </UButton>
              <span
                v-if="faviconUploaded"
                class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"
              >
                <UIcon name="i-lucide-check" class="size-4" />
                已上传
              </span>
              <span
                v-if="faviconUploadError"
                class="inline-flex items-center gap-1 text-sm font-medium text-red-500"
              >
                <UIcon name="i-lucide-alert-circle" class="size-4" />
                上传失败
              </span>
            </div>
            <p class="text-xs text-slate-400">粘贴图片 URL，或点击上传按钮选择本地图片</p>
          </div>

        </div>

        <div v-else-if="activeTab === 'home'" class="settings-form">
          <div class="settings-row">
            <label class="settings-label">首页轮播表情包分组</label>
            <UDropdownMenu
              :items="heroMemeGroupMenuItems"
              :content="{ align: 'start', sideOffset: 6 }"
              :ui="{ content: 'w-[360px] max-w-[calc(100vw-2rem)]' }"
            >
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                icon="i-lucide-smile"
                trailing-icon="i-lucide-chevron-down"
                :label="selectedHeroMemeGroupLabel"
                block
                class="hero-meme-trigger"
              />
            </UDropdownMenu>
            <p v-if="memeGroupsError" class="text-xs text-red-500">
              分组加载失败，请刷新页面或重新登录后重试。
            </p>
            <p class="text-xs text-slate-400">
              轮播文章左侧图标将从该分组随机选取；不选择或分组为空时使用默认图标。
            </p>
          </div>

          <div class="settings-row">
            <label class="settings-checkbox">
              <input
                type="checkbox"
                :checked="form.home_post_card_style === 'archive'"
                @change="toggleHomePostCardStyle"
              >
              <span>首页使用归档卡片样式</span>
            </label>
            <p class="text-sm text-slate-500">
              开启后，电脑端使用与归档页一致的横向列表卡片；手机端仍使用原来的单列大图卡片。
            </p>
          </div>
        </div>

        <div v-else-if="activeTab === 'seo'" class="settings-form">
          <div class="settings-search-preview">
            <small>搜索结果预览</small>
            <strong>{{ form.site_title || '站点标题' }}</strong>
            <p>{{ form.seo_description || '填写站点描述，帮助读者了解博客的主题与内容。' }}</p>
            <span v-if="form.seo_noindex === 'true'">{{ savedFields?.seo_noindex === 'true' ? '已启用全站禁止收录。' : '保存后将要求搜索引擎停止收录全站公开页面。' }}</span>
          </div>
          <div class="settings-row">
            <label class="settings-checkbox">
              <input
                type="checkbox"
                :checked="form.seo_noindex === 'true'"
                @change="toggleNoindex"
              >
              <span>禁止搜索引擎收录</span>
            </label>
            <p class="text-sm text-slate-500">
              为全站添加 noindex 标记，搜索引擎重新抓取后才会更新收录状态。
            </p>
          </div>

          <div class="settings-row">
            <label class="settings-label">站点关键词</label>
            <UTextarea
              v-model="form.seo_keywords"
              :rows="2"
              placeholder="关键词之间用英文逗号分隔"
              class="settings-control"
            />
            <p class="text-sm text-slate-500">用于输出 keywords meta 标签。</p>
          </div>

          <div class="settings-row">
            <label class="settings-label">站点描述</label>
            <UTextarea
              v-model="form.seo_description"
              :rows="2"
              placeholder="请输入站点描述"
              class="settings-control"
            />
            <p class="text-sm text-slate-500">仅对首页生效，其他页面会优先使用页面自身描述。</p>
          </div>
        </div>

        <div v-else-if="activeTab === 'footer'" class="settings-form">
          <div class="settings-row">
            <label class="settings-label">版权信息</label>
            <UInput
              v-model="form.footer_copyright"
              icon="i-lucide-copyright"
              placeholder="©2026 {siteName}"
              class="settings-control"
            />
            <p class="text-sm text-slate-500">
              显示在页脚信息栏，使用
              <code>{siteName}</code>
              代表当前站点标题。留空则隐藏版权信息。
            </p>
          </div>

          <div class="settings-row">
            <label class="settings-label">ICP备案号</label>
            <UInput
              v-model="form.footer_icp"
              icon="i-lucide-file-badge"
              :maxlength="80"
              placeholder="填写实际备案号，未备案请留空"
              class="settings-control"
            />
            <p class="text-sm text-slate-500">显示在页脚信息栏，点击前往工信部备案查询。留空则不显示。</p>
          </div>

          <div class="settings-row">
            <div class="settings-row-head">
              <div>
                <h3 class="settings-label">辅助链接</h3>
                <p class="text-sm text-slate-500">显示在页脚最下方，与版权信息并列。</p>
              </div>
              <UButton type="button" size="sm" icon="i-lucide-plus" variant="outline" @click="footerLinks.push({ id: ++nextFooterLinkId, label: '', to: '' })">添加链接</UButton>
            </div>
            <p v-if="!footerLinks.length" class="text-sm text-slate-500">暂未添加辅助链接。</p>
            <ul v-else class="footer-link-fields settings-control">
              <li v-for="(link, index) in footerLinks" :key="link.id">
                <UInput v-model="link.label" :aria-label="`链接 ${index + 1} 名称`" placeholder="显示名称" />
                <UInput v-model="link.to" :aria-label="`链接 ${index + 1} 地址`" placeholder="/about 或 https://…" />
                <div class="admin-order-buttons">
                  <button type="button" :aria-label="`上移链接 ${index + 1}`" :disabled="index === 0" @click="footerLinks = moveArrayItem(footerLinks, index, index - 1)"><UIcon name="i-lucide-chevron-up" /></button>
                  <button type="button" :aria-label="`下移链接 ${index + 1}`" :disabled="index === footerLinks.length - 1" @click="footerLinks = moveArrayItem(footerLinks, index, index + 1)"><UIcon name="i-lucide-chevron-down" /></button>
                </div>
                <UButton type="button" size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="`移除链接 ${index + 1}`" @click="footerLinks.splice(index, 1)" />
              </li>
            </ul>
            <div v-if="footerLinks.some(link => link.label.trim())" class="footer-link-preview">
              <span>辅助链接预览</span>
              <strong v-for="link in footerLinks.filter(link => link.label.trim())" :key="link.id">{{ link.label }}</strong>
            </div>
          </div>
        </div>

        <div v-else class="settings-form">
          <div class="settings-row">
            <div class="settings-row-head">
              <div>
                <label class="settings-label">底部快捷入口</label>
                <p class="text-sm text-slate-500">
                  返回顶部按钮始终在中间，这里配置的入口会自动均分在左右两侧。
                </p>
              </div>
              <UButton size="sm" icon="i-lucide-plus" @click="addFooterAction"> 添加入口 </UButton>
            </div>

            <AdminSortableList
              :items="footerActionItems"
              :disabled="saving"
              class="footer-action-editor"
              @reorder="footerActionItems = $event"
            >
              <article
                v-for="(item, index) in footerActionItems"
                :key="item.id"
                class="footer-action-item admin-sortable-item"
              >
                <div class="footer-action-order">
                  <AdminDragHandle
                    :label="item.label || `入口${index + 1}`"
                    :disabled="saving"
                  /><span>第 {{ index + 1 }} 个入口</span>
                  <div class="admin-order-buttons">
                    <button
                      type="button"
                      :disabled="saving || index === 0"
                      :aria-label="`上移${item.label || '入口'}`"
                      @click="moveFooterAction(index, -1)"
                    >
                      <UIcon name="i-lucide-chevron-up" /></button
                    ><button
                      type="button"
                      :disabled="saving || index === footerActionItems.length - 1"
                      :aria-label="`下移${item.label || '入口'}`"
                      @click="moveFooterAction(index, 1)"
                    >
                      <UIcon name="i-lucide-chevron-down" />
                    </button>
                  </div>
                </div>
                <div class="footer-action-item-main">
                  <div class="footer-action-preview">
                    <UIcon :name="item.icon || 'i-simple-icons-linktree'" class="size-5" />
                  </div>
                  <UInput v-model="item.label" icon="i-lucide-type" placeholder="显示名称" />
                  <UInput
                    v-model="item.to"
                    icon="i-lucide-link"
                    placeholder="跳转地址（留空则展示图片）"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    :disabled="footerActionItems.length <= 1"
                    @click="removeFooterAction(index)"
                  />
                </div>

                <label
                  class="settings-checkbox footer-action-target-option"
                  :class="{ 'is-disabled': !item.to.trim() }"
                >
                  <input v-model="item.targetBlank" type="checkbox" :disabled="!item.to.trim()" >
                  <span>在新页面打开</span>
                  <small>
                    {{
                      item.to.trim()
                        ? item.targetBlank
                          ? '点击后将在新标签页打开'
                          : '点击后在当前页面打开'
                        : '填写跳转地址后可设置'
                    }}
                  </small>
                </label>

                <div class="footer-action-image-editor">
                  <div v-if="item.image" class="footer-action-image-preview">
                    <img :src="item.image" :alt="`${item.label} 悬浮图片预览`" >
                  </div>
                  <div class="footer-action-image-copy">
                    <strong>悬浮图片</strong>
                    <p>
                      {{
                        item.to.trim()
                          ? '当前填写了跳转地址，前台会优先执行跳转。清空地址后才会展示这张图片。'
                          : '地址留空时，桌面端悬浮、移动端点击图标即可查看图片。'
                      }}
                    </p>
                    <div class="footer-action-image-buttons">
                      <label
                        class="footer-action-upload"
                        :class="{ 'is-loading': uploadingFooterActionId === item.id }"
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          :disabled="uploadingFooterActionId === item.id"
                          @change="uploadFooterActionImage($event, item)"
                        >
                        <UIcon
                          :name="
                            uploadingFooterActionId === item.id
                              ? 'i-lucide-loader-circle'
                              : 'i-lucide-upload'
                          "
                          class="size-4"
                        />
                        {{
                          uploadingFooterActionId === item.id
                            ? '上传中'
                            : item.image
                              ? '替换图片'
                              : '上传图片'
                        }}
                      </label>
                      <button
                        v-if="item.image"
                        type="button"
                        class="footer-action-image-remove"
                        @click="item.image = ''"
                      >
                        <UIcon name="i-lucide-trash-2" class="size-4" />
                        删除图片
                      </button>
                    </div>
                    <small v-if="footerImageUploadErrorId === item.id">
                      上传失败，请使用 JPG、PNG 或 WebP 图片重试。
                    </small>
                  </div>
                </div>

                <div class="footer-icon-grid" aria-label="图标库">
                  <button
                    v-for="icon in visibleFooterActionIcons(item.id)"
                    :key="icon.name"
                    type="button"
                    class="footer-icon-option"
                    :class="{ 'is-active': item.icon === icon.name }"
                    :title="icon.label"
                    @click="item.icon = icon.name"
                  >
                    <UIcon :name="icon.name" class="size-4" />
                  </button>
                </div>
                <button
                  v-if="footerActionIconOptions.length > collapsedFooterIconCount"
                  type="button"
                  class="footer-icon-toggle"
                  :aria-expanded="expandedFooterIconItems.has(item.id)"
                  @click="toggleFooterIconGrid(item.id)"
                >
                  {{
                    expandedFooterIconItems.has(item.id)
                      ? '收起图标'
                      : `展开全部 ${footerActionIconOptions.length} 个图标`
                  }}
                  <UIcon
                    :name="
                      expandedFooterIconItems.has(item.id)
                        ? 'i-lucide-chevron-up'
                        : 'i-lucide-chevron-down'
                    "
                    class="size-4"
                  />
                </button>
              </article>
            </AdminSortableList>
          </div>
        </div>
      </section>
    </div>

    <div v-else-if="!loadError" class="admin-panel grid place-items-center px-5 py-16 text-center">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-slate-300" />
      <p class="mt-3 font-medium text-slate-900">加载中</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { moveArrayItem } from '~/utils/reorder'
import { useAdminUnsavedChanges } from '~/composables/useAdminUnsavedChanges'
import type { ApiResult } from '~~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { parseFooterBottomLinks } from '~/utils/footer-links'
import type { AdminSettingsPayload } from '~~/types/dto/settings'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    to => {
      if (to.query.tab === 'footerMenu') return navigateTo('/admin/menus?location=footer', { replace: true })
    }
  ]
})

type SettingsForm = {
  site_title: string
  site_subtitle: string
  site_brand: string
  site_logo: string
  site_favicon: string
  hero_meme_group: string
  home_post_card_style: string
  seo_noindex: string
  seo_keywords: string
  seo_description: string
  footer_copyright: string
  footer_icp: string
  footer_bottom_links: string
  footer_actions: string
}

type FooterActionItem = {
  id: number
  label: string
  to: string
  icon: string
  image: string
  targetBlank: boolean
}

const settingTabs = [
  { label: '站点信息', value: 'basic', area: 'site', keys: ['site_title', 'site_subtitle', 'site_brand', 'site_logo', 'site_favicon'] },
  { label: '首页展示', value: 'home', area: 'site', keys: ['hero_meme_group', 'home_post_card_style'] },
  { label: '搜索与收录', value: 'seo', area: 'site', keys: ['seo_noindex', 'seo_keywords', 'seo_description'] },
  { label: '版权与备案', value: 'footer', area: 'footer', keys: ['footer_copyright', 'footer_icp', 'footer_bottom_links'] },
  { label: '图标入口', value: 'footerActions', area: 'footer', keys: ['footer_actions'] }
] as const satisfies readonly { label: string; value: string; area: string; keys: readonly (keyof SettingsForm)[] }[]

const siteSettingKeys: (keyof SettingsForm)[] = settingTabs.flatMap(tab => [...tab.keys] as (keyof SettingsForm)[])

const defaultFooterActions =
  '[{"label":"归档","to":"/archive","icon":"i-lucide-archive"},{"label":"我的","to":"/about","icon":"i-lucide-user-round"},{"label":"书签","to":"/link","icon":"i-lucide-link"}]'

const footerActionIconOptions = [
  { label: 'QQ', name: 'i-simple-icons-qq' },
  { label: '微信', name: 'i-simple-icons-wechat' },
  { label: '新浪微博', name: 'i-simple-icons-sinaweibo' },
  { label: 'GitHub', name: 'i-simple-icons-github' },
  { label: 'Gitee', name: 'i-simple-icons-gitee' },
  { label: '哔哩哔哩', name: 'i-simple-icons-bilibili' },
  { label: '知乎', name: 'i-simple-icons-zhihu' },
  { label: '掘金', name: 'i-simple-icons-juejin' },
  { label: 'CSDN', name: 'i-simple-icons-csdn' },
  { label: 'QQ 空间', name: 'i-simple-icons-qzone' },
  { label: '小红书', name: 'i-simple-icons-xiaohongshu' },
  { label: '豆瓣', name: 'i-simple-icons-douban' },
  { label: '快手', name: 'i-simple-icons-kuaishou' },
  { label: 'DeepSeek', name: 'i-simple-icons-deepseek' },
  { label: '支付宝', name: 'i-simple-icons-alipay' },
  { label: '淘宝', name: 'i-simple-icons-taobao' },
  { label: '阿里巴巴', name: 'i-simple-icons-alibabadotcom' },
  { label: '美团', name: 'i-simple-icons-meituan' },
  { label: '百度', name: 'i-simple-icons-baidu' },
  { label: '字节跳动', name: 'i-simple-icons-bytedance' },
  { label: '阿里云', name: 'i-simple-icons-alibabacloud' },
  { label: '搜狗', name: 'i-simple-icons-sogou' },
  { label: '华为', name: 'i-simple-icons-huawei' },
  { label: '小米', name: 'i-simple-icons-xiaomi' },
  { label: 'OPPO', name: 'i-simple-icons-oppo' },
  { label: 'vivo', name: 'i-simple-icons-vivo' },
  { label: '一加', name: 'i-simple-icons-oneplus' },
  { label: '大疆', name: 'i-simple-icons-dji' },
  { label: '联想', name: 'i-simple-icons-lenovo' },
  { label: '携程 Trip.com', name: 'i-simple-icons-tripdotcom' },
  { label: 'Telegram', name: 'i-simple-icons-telegram' },
  { label: 'X', name: 'i-simple-icons-x' },
  { label: 'Facebook', name: 'i-simple-icons-facebook' },
  { label: 'Instagram', name: 'i-simple-icons-instagram' },
  { label: 'YouTube', name: 'i-simple-icons-youtube' },
  { label: 'TikTok', name: 'i-simple-icons-tiktok' },
  { label: 'Discord', name: 'i-simple-icons-discord' },
  { label: 'LinkedIn', name: 'i-simple-icons-linkedin' },
  { label: 'Gmail', name: 'i-simple-icons-gmail' },
  { label: 'RSS', name: 'i-simple-icons-rss' },
  { label: '网易云音乐', name: 'i-simple-icons-neteasecloudmusic' },
  { label: 'Spotify', name: 'i-simple-icons-spotify' },
  { label: 'Steam', name: 'i-simple-icons-steam' },
  { label: 'WordPress', name: 'i-simple-icons-wordpress' },
  { label: 'Blogger', name: 'i-simple-icons-blogger' },
  { label: 'Medium', name: 'i-simple-icons-medium' },
  { label: 'DEV', name: 'i-simple-icons-devdotto' },
  { label: 'Stack Overflow', name: 'i-simple-icons-stackoverflow' },
  { label: 'GitLab', name: 'i-simple-icons-gitlab' },
  { label: 'npm', name: 'i-simple-icons-npm' },
  { label: 'Docker', name: 'i-simple-icons-docker' },
  { label: 'Linktree', name: 'i-simple-icons-linktree' }
]

const collapsedFooterIconCount = 12

type SettingTab = typeof settingTabs[number]['value']
const route = useRoute()
const router = useRouter()
const selectedTab = computed(() => settingTabs.find(tab => tab.value === route.query.tab) ?? settingTabs[0])
const activeTab = computed(() => selectedTab.value.value)
const visibleTabs = computed(() => settingTabs.filter(tab => tab.area === selectedTab.value.area))
const selectTab = (value: SettingTab) => router.replace({ query: { ...route.query, tab: value === 'basic' ? undefined : value } })
const form = ref<SettingsForm | null>(null)
const footerLinks = ref<Array<{ id: number; label: string; to: string }>>([])
let nextFooterLinkId = 0
const savedFields = ref<SettingsForm>()
const footerActionItems = ref<FooterActionItem[]>([])
const expandedFooterIconItems = ref(new Set<number>())
const uploadingFooterActionId = ref<number | null>(null)
const footerImageUploadErrorId = ref<number | null>(null)
const saving = ref(false)
const saveError = ref('')
const uploading = ref<string | null>(null)
const logoUploaded = ref(false)
const faviconUploaded = ref(false)
const logoUploadError = ref(false)
const faviconUploadError = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)
const faviconInputRef = ref<HTMLInputElement | null>(null)

const {
  data,
  error: loadError,
  refresh: reloadSettings
} = await useFetch<ApiResult<AdminSettingsPayload>>('/api/admin/settings')
const { data: memeGroupsData, error: memeGroupsError } = await useFetch<
  ApiResult<Array<{ id: string; name: string }>>
>('/api/admin/gallery/groups')
const heroMemeGroupOptions = computed(() => [
  { label: '不使用表情包（默认图标）', value: '' },
  { label: '未分组', value: 'ungrouped' },
  ...(memeGroupsData.value?.data || []).map((group) => ({ label: group.name, value: group.id }))
])
const selectedHeroMemeGroupLabel = computed(() => {
  return (
    heroMemeGroupOptions.value.find((option) => option.value === form.value?.hero_meme_group)
      ?.label || '请选择表情包分组'
  )
})
const heroMemeGroupMenuItems = computed(() =>
  heroMemeGroupOptions.value.map((option) => ({
    label: option.label,
    icon: form.value?.hero_meme_group === option.value ? 'i-lucide-check' : 'i-lucide-circle',
    onSelect: () => {
      if (form.value) form.value.hero_meme_group = option.value
    }
  }))
)
watch(
  data,
  (val) => {
    if (val?.data && !form.value) {
      form.value = {
        site_title: val.data.site_title,
        site_subtitle: val.data.site_subtitle,
        site_brand: val.data.site_brand,
        site_logo: val.data.site_logo,
        site_favicon: val.data.site_favicon,
        hero_meme_group: val.data.hero_meme_group,
        home_post_card_style: val.data.home_post_card_style,
        seo_noindex: val.data.seo_noindex,
        seo_keywords: val.data.seo_keywords,
        seo_description: val.data.seo_description,
        footer_copyright: val.data.footer_copyright,
        footer_icp: val.data.footer_icp,
        footer_bottom_links: val.data.footer_bottom_links,
        footer_actions: val.data.footer_actions
      }
      loadFooterFields(form.value)
      savedFields.value = currentFields()
    }
  },
  { immediate: true }
)

const { isDirty, markSaved } = useAdminUnsavedChanges(() => currentFields() ?? null)
const changedTabs = computed(() => {
  const current = currentFields()
  const previous = savedFields.value
  return current && previous ? settingTabs.filter(tab => tab.keys.some(key => current[key] !== previous[key])) : []
})
const uploadingControls = computed(() => !!uploading.value || uploadingFooterActionId.value !== null)
const toast = useToast()
const settingIcons: Record<string, string> = {
  basic: 'i-lucide-sliders-horizontal',
  home: 'i-lucide-house',
  seo: 'i-lucide-search',
  footer: 'i-lucide-panel-bottom',
  footerActions: 'i-lucide-grid-2x2'
}
const settingDescriptions: Record<string, string> = {
  basic: '管理站点名称、顶部品牌、Logo 与浏览器标签页图标。',
  home: '管理首页文章卡片样式和轮播文章图标。',
  seo: '编辑搜索摘要和站点收录规则。',
  footer: '管理页脚最下方的版权、备案号和辅助链接。',
  footerActions: '管理页脚品牌区的图标入口。'
}
const currentSettingLabel = computed(() => selectedTab.value.label)

function currentFields(): SettingsForm | undefined {
  if (!form.value) return
  return {
    ...form.value,
    footer_bottom_links: footerLinks.value.map(({ label, to }) => `${label.trim()}|${to.trim()}`).join('\n'),
    footer_actions: JSON.stringify(footerActionItems.value.map(({ label, to, icon, image, targetBlank }) => ({
      label: label.trim(),
      to: to.trim(),
      icon: icon.trim() || 'i-simple-icons-linktree',
      image: image.trim(),
      targetBlank
    })))
  }
}

function loadFooterFields(fields: SettingsForm) {
  footerActionItems.value = parseFooterActionItems(fields.footer_actions)
  footerLinks.value = parseFooterBottomLinks(fields.footer_bottom_links).map(link => ({ ...link, id: ++nextFooterLinkId }))
  expandedFooterIconItems.value.clear()
}

function resetDraft() {
  if (!savedFields.value || saving.value || uploadingControls.value) return
  form.value = { ...savedFields.value }
  loadFooterFields(form.value)
  saveError.value = ''
}

async function save() {
  const current = currentFields()
  if (!current || !savedFields.value || saving.value || uploading.value || uploadingFooterActionId.value !== null) return
  const previous = savedFields.value
  const changed = siteSettingKeys.filter(key => current[key] !== previous[key])
  if (!changed.length) return
  saveError.value = ''
  if (changed.includes('footer_bottom_links')) {
    const invalid = footerLinks.value.findIndex(({ label, to }) => {
      if (!label.trim() || !to.trim() || /[|\r\n]/.test(label + to)) return true
      try { return !['https:', 'http:'].includes(new URL(to.trim(), 'https://footer.invalid').protocol) } catch { return true }
    })
    if (invalid !== -1) {
      void selectTab('footer')
      saveError.value = `请检查第 ${invalid + 1} 条辅助链接。填写名称和站内路径或 HTTP(S) 地址，且不要使用竖线。`
      return
    }
  }
  if (changed.includes('footer_actions') && footerActionItems.value.some(item => !item.label.trim())) {
    void selectTab('footerActions')
    saveError.value = '请填写图标入口的显示名称。'
    return
  }
  if (changed.includes('seo_noindex') && current.seo_noindex === 'true' && !window.confirm('保存后会为全站公开页面添加禁止收录标记。确定保存？')) return
  const submittedSnapshot = JSON.stringify(current)
  saving.value = true
  try {
    const siteSettings = Object.fromEntries(changed.map(key => [key, current[key]]))
    await $fetch('/api/admin/settings', { method: 'PUT', body: siteSettings })
    savedFields.value = current
    markSaved(submittedSnapshot)
    toast.add({ id: 'settings-save', title: '站点设置已保存', color: 'success' })
  } catch (error: unknown) {
    saveError.value = getApiErrorMessage(error, { fallback: '保存设置失败，请重试。' })
  } finally {
    saving.value = false
  }
}

function toggleNoindex(event: Event) {
  if (!form.value) return
  const input = event.target as HTMLInputElement
  form.value.seo_noindex = input.checked ? 'true' : 'false'
}

function toggleHomePostCardStyle(event: Event) {
  if (!form.value) return
  const input = event.target as HTMLInputElement
  form.value.home_post_card_style = input.checked ? 'archive' : 'grid'
}

function parseFooterActionItems(value: string): FooterActionItem[] {
  try {
    const parsed = JSON.parse(value || '[]')
    if (!Array.isArray(parsed)) return parseFooterActionItems(defaultFooterActions)
    const items = parsed
      .map((item, index) => ({
        id: Date.now() + index,
        label: String(item?.label || '').trim(),
        to: String(item?.to || '').trim(),
        icon: String(item?.icon || 'i-simple-icons-linktree').trim() || 'i-simple-icons-linktree',
        image: String(item?.image || '').trim(),
        targetBlank: item?.targetBlank === true
      }))
      .filter((item) => item.label)
    return items
  } catch {
    return parseFooterActionItems(defaultFooterActions)
  }
}

function moveFooterAction(index: number, direction: -1 | 1) {
  footerActionItems.value = moveArrayItem(footerActionItems.value, index, index + direction)
}

function addFooterAction() {
  footerActionItems.value.push({
    id: Date.now(),
    label: '新入口',
    to: '',
    icon: 'i-simple-icons-linktree',
    image: '',
    targetBlank: false
  })
}

function visibleFooterActionIcons(itemId: number) {
  return expandedFooterIconItems.value.has(itemId)
    ? footerActionIconOptions
    : footerActionIconOptions.slice(0, collapsedFooterIconCount)
}

function toggleFooterIconGrid(itemId: number) {
  const next = new Set(expandedFooterIconItems.value)
  if (next.has(itemId)) next.delete(itemId)
  else next.add(itemId)
  expandedFooterIconItems.value = next
}

async function uploadFooterActionImage(event: Event, item: FooterActionItem) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingFooterActionId.value = item.id
  footerImageUploadErrorId.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', {
      method: 'POST',
      body
    })
    item.image = result.data.url
  } catch {
    footerImageUploadErrorId.value = item.id
  } finally {
    uploadingFooterActionId.value = null
    input.value = ''
  }
}

function removeFooterAction(index: number) {
  if (footerActionItems.value.length <= 1) return
  footerActionItems.value.splice(index, 1)
}

async function uploadFile(event: Event, field: 'site_logo' | 'site_favicon') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !form.value) return

  uploading.value = field
  if (field === 'site_logo') logoUploadError.value = false
  else faviconUploadError.value = false
  try {
    const body = new FormData()
    body.append('file', file)
    const url = field === 'site_favicon' ? '/api/admin/upload?purpose=favicon' : '/api/admin/upload'
    const result = await $fetch<{ data: { url: string } }>(url, { method: 'POST', body })
    form.value[field] = result.data.url
    if (field === 'site_logo') {
      logoUploaded.value = true
      setTimeout(() => {
        logoUploaded.value = false
      }, 2000)
    } else {
      faviconUploaded.value = true
      setTimeout(() => {
        faviconUploaded.value = false
      }, 2000)
    }
  } catch {
    if (field === 'site_logo') {
      logoUploadError.value = true
      setTimeout(() => {
        logoUploadError.value = false
      }, 3000)
    } else {
      faviconUploadError.value = true
      setTimeout(() => {
        faviconUploadError.value = false
      }, 3000)
    }
  } finally {
    uploading.value = null
    input.value = ''
  }
}
</script>

<style scoped>
.settings-admin-panel {
  min-height: calc(100vh - 6.5rem);
  background: #ffffff;
}

.settings-tabs {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.35rem;
  overflow-x: auto;
  border-bottom: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 0 0.75rem;
  scrollbar-width: thin;
}

.settings-tab {
  position: relative;
  min-width: 7.5rem;
  min-height: 2.15rem;
  border: 0;
  border-radius: 0.6rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 550;
  outline: none;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}

.settings-tab:hover {
  background: rgba(255, 255, 255, 0.86);
  color: #6554c0;
}

.settings-tab.is-active {
  background: #ffffff;
  color: #6554c0;
  box-shadow: none;
}

.settings-tab.is-active::after {
  position: absolute;
  right: 1rem;
  bottom: -0.57rem;
  left: 1rem;
  height: 2px;
  border-radius: 999px;
  background: #6554c0;
  content: '';
}

.settings-admin-panel :deep(.admin-panel-header) {
  min-height: 56px;
  border-bottom-color: #eef1f4;
  background: #f5f6f8;
  padding: 0 20px;
}

.settings-form {
  display: grid;
}

.footer-link-fields {
  display: grid;
  gap: 8px;
}

.footer-link-fields li {
  display: grid;
  grid-template-columns: minmax(95px, .8fr) minmax(110px, 1.4fr) auto auto;
  gap: 8px;
  align-items: center;
}

.footer-link-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  max-width: 640px;
  padding: 12px;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.footer-link-preview span {
  color: var(--admin-muted);
}

@media (max-width: 540px) {
  .footer-link-fields li {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
  .footer-link-fields li > :first-child {
    grid-column: 1 / -1;
  }
}

.settings-row {
  display: grid;
  gap: 0.45rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 160ms ease;
}

.settings-row:hover {
  background: rgba(248, 250, 252, 0.62);
}

.settings-label {
  color: #334155;
  font-size: 0.86rem;
  font-weight: 550;
}

.settings-row-head {
  display: flex;
  width: min(100%, 760px);
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.settings-control {
  width: min(100%, 644px);
}

.hero-meme-trigger {
  width: min(100%, 360px);
  justify-content: flex-start;
}

.settings-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 550;
}

.settings-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}

.settings-upload {
  display: flex;
  width: min(100%, 760px);
  gap: 0.5rem;
}

.footer-action-editor {
  display: grid;
  width: min(100%, 860px);
  gap: 0.75rem;
}

.footer-action-item {
  display: grid;
  gap: 0.75rem;
  border: 1px solid #e4e7ec;
  border-radius: 0.75rem;
  background: #fff;
  padding: 0.875rem;
}

.footer-action-item-main {
  display: grid;
  grid-template-columns: 2.5rem minmax(8rem, 0.7fr) minmax(12rem, 1fr) auto;
  gap: 0.625rem;
  align-items: center;
}

.footer-action-preview {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 999px;
  background: #111827;
  color: #fff;
}

.footer-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.25rem, 1fr));
  gap: 0.45rem;
}

.footer-action-image-editor {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  border: 1px solid #e8edf4;
  border-radius: 0.65rem;
  background: #f8fafc;
  padding: 0.75rem;
}

.footer-action-target-option {
  width: max-content;
  max-width: 100%;
}

.footer-action-target-option small {
  color: #697386;
  font-size: 0.75rem;
  font-weight: 500;
}

.footer-action-target-option.is-disabled {
  opacity: 0.55;
}

.footer-action-image-preview {
  width: 5rem;
  height: 5rem;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid #dbe3ed;
  border-radius: 0.55rem;
  background: #fff;
}

.footer-action-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.footer-action-image-copy {
  min-width: 0;
}

.footer-action-image-copy strong {
  color: #334155;
  font-size: 0.82rem;
}

.footer-action-image-copy p {
  margin: 0.2rem 0 0.55rem;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.45;
}

.footer-action-image-copy small {
  display: block;
  margin-top: 0.45rem;
  color: #dc2626;
}

.footer-action-image-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.footer-action-upload,
.footer-action-image-remove {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #dbe3ed;
  border-radius: 0.5rem;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 550;
  padding: 0.42rem 0.65rem;
}

.footer-action-upload input {
  display: none;
}

.footer-action-upload.is-loading {
  cursor: wait;
  opacity: 0.65;
}

.footer-action-upload.is-loading svg {
  animation: footer-upload-spin 0.8s linear infinite;
}

.footer-action-image-remove {
  color: #dc2626;
}

@keyframes footer-upload-spin {
  to {
    transform: rotate(360deg);
  }
}

.footer-icon-option {
  display: grid;
  height: 2.25rem;
  place-items: center;
  border: 1px solid #e4e7ec;
  border-radius: 0.5rem;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.footer-icon-option:hover,
.footer-icon-option.is-active {
  border-color: #818cf8;
  background: #efedf8;
  color: #6554c0;
}

.footer-icon-toggle {
  display: inline-flex;
  width: max-content;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 550;
  padding: 0.1rem 0;
}

.footer-icon-toggle:hover {
  color: #6554c0;
}

.settings-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .settings-row-head,
  .settings-upload {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .footer-action-item-main {
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  }

  .footer-action-item-main > :deep(.u-input):nth-of-type(2) {
    grid-column: 1 / -1;
  }

}
</style>

<style scoped>
.settings-admin-panel {
  min-height: 0;
  padding-bottom: 8px;
}
.settings-section-head {
  padding: 24px 28px;
  border-bottom: 1px solid #e4e7ec;
}
.settings-section-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 550;
}
.settings-section-head p {
  margin: 7px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.8;
}
.settings-row {
  padding: 22px 28px;
}
.settings-row:hover {
  background: transparent;
}
.settings-label {
  font-size: 12px;
  font-weight: 500;
}
.settings-control,
.settings-upload {
  width: min(100%, 640px);
}
.settings-row > p {
  max-width: 640px;
  color: #697386;
  font-size: 11px;
  line-height: 1.8;
}
.settings-brand-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 24px 28px 0;
  padding: 20px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fafbfc;
}
.settings-brand-preview > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 9px;
  background: #efedf8;
  color: #8b7daf;
}
.settings-brand-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.settings-brand-preview strong {
  font-size: 15px;
  font-weight: 550;
}
.settings-brand-preview p {
  margin-top: 5px;
  color: #667085;
  font-size: 11px;
}
.settings-brand-preview small {
  margin-left: auto;
  color: #667085;
  font-size: 10px;
}
.settings-search-preview {
  margin: 24px 28px 0;
  padding: 20px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
}
.settings-search-preview small {
  display: block;
  margin-bottom: 12px;
  color: #667085;
  font-size: 11px;
}
.settings-search-preview strong {
  display: block;
  color: #6554c0;
  font-size: 18px;
  font-weight: 500;
}
.settings-search-preview p {
  margin-top: 9px;
  color: #667085;
  font-size: 12px;
  line-height: 1.8;
}
.settings-search-preview > span {
  display: block;
  margin-top: 12px;
  color: #956b2c;
  font-size: 11px;
}
.footer-actions-head {
  background: #fff;
}
.footer-action-card {
  box-shadow: none;
  border-radius: 8px;
}
@media (max-width: 767px) {
  .settings-section-head,
  .settings-row {
    padding: 20px 18px;
  }
  .settings-brand-preview,
  .settings-search-preview {
    margin: 18px 18px 0;
    padding: 16px;
  }
  .settings-brand-preview small {
    display: none;
  }
  .settings-upload {
    flex-wrap: wrap;
  }
}
</style>

<style scoped>
.footer-action-order {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ec;
  color: #697386;
  font-size: 11px;
}
.footer-action-order > .admin-order-buttons {
  margin-left: auto;
}
</style>
