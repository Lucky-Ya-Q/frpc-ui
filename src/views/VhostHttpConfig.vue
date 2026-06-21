<script setup>
import { computed, reactive } from 'vue'
import { Download, Plus, Delete, DocumentCopy, CircleCloseFilled, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  buildAccessUrl,
  downloadTextFile,
  downloadTextFiles,
  generateFrpcToml,
  generateStartBat,
  validateFrpcConfig,
} from '@/utils/tomlGenerator'

function createId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

const domainOptions = ['nas.shanyexia.top']

const frpcForm = reactive({
  serverAddr: '101.42.89.25',
  serverPort: 7000,
  password: '',
  proxies: [
    {
      id: createId(),
      name: 'web',
      localPort: 80,
      customDomains: ['nas.shanyexia.top'],
      locations: [],
    },
  ],
})

const frpcToml = computed(() => generateFrpcToml(frpcForm))
const startBat = computed(() => generateStartBat())
const validation = computed(() => validateFrpcConfig(frpcForm))
const isConfigValid = computed(() => validation.value.valid)

function proxyHasError(index) {
  return validation.value.errors.some(
    (error) => error.proxyIndex === index || error.proxyIndices?.includes(index),
  )
}

const accessUrls = computed(() => {
  const urls = []
  for (const proxy of frpcForm.proxies) {
    for (const domain of proxy.customDomains) {
      const paths = proxy.locations?.length ? proxy.locations : ['']
      for (const location of paths) {
        const url = buildAccessUrl(domain, location)
        if (url) urls.push(url)
      }
    }
  }
  return urls
})

const deploySteps = [
  {
    title: '配置 frpc.toml',
    description:
      '在本页配置服务端地址、端口、Token、本地端口、自定义域名与 URL 路径前缀，下载 frpc.toml 到内网机器',
  },
  {
    title: '启动 frpc',
    description: '将 frpc.exe 与 frpc.toml、start.bat 放在同一目录，双击 start.bat 启动',
  },
  {
    title: '域名解析',
    description: '将 customDomains 中的域名 A 记录解析到 frps 服务器 IP',
  },
  {
    title: 'Nginx 反向代理',
    description:
      '在 frps 服务器上配置 Nginx，将域名 80 端口转发到 frps 的 vhostHTTPPort（如 40800）',
  },
]

function addProxy() {
  const sharedDomains = frpcForm.proxies[0]?.customDomains?.length
    ? [...frpcForm.proxies[0].customDomains]
    : []

  frpcForm.proxies.push({
    id: createId(),
    name: `web${frpcForm.proxies.length + 1}`,
    localPort: 8080,
    customDomains: sharedDomains,
    locations: [],
  })
}

function removeProxy(index) {
  if (frpcForm.proxies.length <= 1) {
    ElMessage.warning('至少保留一个代理配置')
    return
  }
  frpcForm.proxies.splice(index, 1)
}

function validateFrpc() {
  if (validation.value.valid) return true
  ElMessage.error(validation.value.errors[0]?.message ?? '配置有误，请检查表单')
  return false
}

function handleDownloadFrpc() {
  if (!validateFrpc()) return
  downloadTextFile('frpc.toml', frpcToml.value)
  ElMessage.success('frpc.toml 已下载')
}

function handleDownloadAll() {
  if (!validateFrpc()) return
  downloadTextFiles([
    { filename: 'frpc.toml', content: frpcToml.value },
    { filename: 'start.bat', content: startBat.value },
  ])
  ElMessage.success('frpc.toml、start.bat 已下载')
}

function handleDownloadScript(content, filename) {
  downloadTextFile(filename, content)
  ElMessage.success(`${filename} 已下载`)
}

async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label} 已复制到剪贴板`)
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>HTTP 虚拟主机配置</h1>
        <p class="subtitle">
          <span>通过自定义域名与 URL 路径访问内网 Web 服务 · 参考</span>
          <el-link
            href="https://gofrp.org/zh-cn/docs/examples/vhost-http/"
            target="_blank"
            type="primary"
          >
            frp 官方文档
          </el-link>
        </p>
      </div>
      <el-button type="primary" :icon="Download" :disabled="!isConfigValid" @click="handleDownloadAll">
        下载配置
      </el-button>
    </header>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="card-header">
              <span>客户端 (frpc)</span>
              <el-tag type="info" size="small">frpc.toml</el-tag>
            </div>
          </template>

          <el-form label-width="140px" label-position="left" autocomplete="off">
            <el-form-item label="服务端地址" required>
              <el-input
                v-model="frpcForm.serverAddr"
                placeholder="例如 1.2.3.4 或 frps.example.com"
                autocomplete="off"
                clearable
              />
            </el-form-item>

            <el-form-item label="服务端端口">
              <div class="field-with-hint">
                <el-input-number
                  v-model="frpcForm.serverPort"
                  :min="1"
                  :max="65535"
                  autocomplete="off"
                />
                <span class="field-hint">通常与 frps 的 bindPort 一致</span>
              </div>
            </el-form-item>

            <el-form-item label="Token" required>
              <div class="field-with-hint">
                <el-input
                  v-model="frpcForm.password"
                  type="password"
                  placeholder="与服务端 auth.token 保持一致"
                  autocomplete="new-password"
                  show-password
                  clearable
                />
                <span class="field-hint">frp 使用 Token 鉴权，对应 auth.token 字段</span>
              </div>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">HTTP 代理列表</el-divider>

          <div
            v-for="(proxy, index) in frpcForm.proxies"
            :key="proxy.id"
            class="proxy-item"
            :class="{ 'proxy-item--error': proxyHasError(index) }"
          >
            <div class="proxy-item-header">
              <span class="proxy-index">代理 #{{ index + 1 }}</span>
              <el-button
                type="danger"
                link
                :icon="Delete"
                :disabled="frpcForm.proxies.length <= 1"
                @click="removeProxy(index)"
              >
                删除
              </el-button>
            </div>

            <el-form label-width="100px" label-position="left" autocomplete="off">
              <el-form-item label="名称">
                <el-input v-model="proxy.name" placeholder="web" autocomplete="off" />
              </el-form-item>

              <el-form-item label="本地端口">
                <div class="field-with-hint">
                  <el-input-number
                    v-model="proxy.localPort"
                    :min="1"
                    :max="65535"
                    autocomplete="off"
                  />
                  <span class="field-hint">内网 Web 服务监听端口</span>
                </div>
              </el-form-item>

              <el-form-item label="自定义域名">
                <el-select
                  v-model="proxy.customDomains"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  autocomplete="off"
                  placeholder="选择或输入域名"
                  style="width: 100%"
                >
                  <el-option
                    v-for="domain in domainOptions"
                    :key="domain"
                    :label="domain"
                    :value="domain"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="URL 路径前缀">
                <div class="field-with-hint">
                  <el-select
                    v-model="proxy.locations"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    autocomplete="off"
                    placeholder="如 /alice，留空表示匹配该域名下所有路径"
                    style="width: 100%"
                  />
                  <span class="field-hint">
                    同一域名下多个代理时，为每人指定不同路径；需兜底代理时可填 /
                  </span>
                </div>
              </el-form-item>
            </el-form>
          </div>

          <el-button :icon="Plus" style="width: 100%" @click="addProxy">添加代理</el-button>
        </el-card>

        <el-card shadow="never" class="section-card">
          <template #header>
            <span>部署步骤</span>
          </template>
          <ol class="deploy-steps">
            <li v-for="(step, index) in deploySteps" :key="step.title" class="deploy-step">
              <span class="deploy-step-index">{{ index + 1 }}</span>
              <div class="deploy-step-body">
                <div class="deploy-step-title">{{ step.title }}</div>
                <div class="deploy-step-desc">{{ step.description }}</div>
              </div>
            </li>
            <li class="deploy-step">
              <span class="deploy-step-index">5</span>
              <div class="deploy-step-body">
                <div class="deploy-step-title">浏览器访问</div>
                <div class="deploy-step-desc">
                  <span v-if="accessUrls.length" class="step-description">
                    访问
                    <template v-for="(url, index) in accessUrls" :key="url">
                      <el-link :href="url" target="_blank" type="primary">
                        {{ url }}
                      </el-link>
                      <span v-if="index < accessUrls.length - 1">、</span>
                    </template>
                    即可访问对应内网 Web 服务
                  </span>
                  <span v-else>填写域名后此处会显示访问地址</span>
                </div>
              </div>
            </li>
          </ol>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="preview-card" :class="{ 'preview-card--invalid': !isConfigValid }">
          <template #header>
            <div class="card-header">
              <span>配置预览</span>
              <el-tag v-if="isConfigValid" type="success" size="small" effect="light">
                <el-icon class="status-tag-icon"><CircleCheckFilled /></el-icon>
                配置有效
              </el-tag>
              <el-tag v-else type="danger" size="small" effect="light">
                <el-icon class="status-tag-icon"><CircleCloseFilled /></el-icon>
                {{ validation.errors.length }} 项待修正
              </el-tag>
            </div>
          </template>

          <ul v-if="!isConfigValid" class="validation-error-list">
            <li v-for="(error, index) in validation.errors" :key="index" class="validation-error-item">
              <el-icon class="validation-error-icon"><WarningFilled /></el-icon>
              <span class="validation-error-text">{{ error.message }}</span>
            </li>
          </ul>

          <div class="preview-list">
            <div class="preview-panel">
              <div class="preview-panel-header">
                <el-tag type="info" size="small">frpc.toml</el-tag>
                <div class="preview-actions">
                  <el-button size="small" :icon="Download" :disabled="!isConfigValid" @click="handleDownloadFrpc">
                    下载
                  </el-button>
                  <el-button
                    size="small"
                    :icon="DocumentCopy"
                    :disabled="!isConfigValid"
                    @click="copyToClipboard(frpcToml, 'frpc.toml')"
                  >
                    复制
                  </el-button>
                </div>
              </div>
              <pre class="toml-preview"><code>{{ frpcToml }}</code></pre>
            </div>

            <div class="preview-panel">
              <div class="preview-panel-header">
                <el-tag type="success" size="small">start.bat</el-tag>
                <div class="preview-actions">
                  <el-button
                    size="small"
                    :icon="Download"
                    @click="handleDownloadScript(startBat, 'start.bat')"
                  >
                    下载
                  </el-button>
                  <el-button
                    size="small"
                    :icon="DocumentCopy"
                    @click="copyToClipboard(startBat, 'start.bat')"
                  >
                    复制
                  </el-button>
                </div>
              </div>
              <pre class="toml-preview"><code>{{ startBat }}</code></pre>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.subtitle :deep(.el-link) {
  font-size: 14px;
  line-height: 1.5;
  vertical-align: baseline;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-with-hint {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.field-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.validation-error-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  border: 1px solid var(--el-color-error-light-7);
  border-radius: 8px;
  overflow: hidden;
}

.validation-error-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-color-error-light-9);
}

.validation-error-item + .validation-error-item {
  border-top: 1px solid var(--el-color-error-light-7);
}

.validation-error-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 14px;
  color: var(--el-color-error);
}

.validation-error-text {
  flex: 1;
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.status-tag-icon {
  margin-right: 4px;
  vertical-align: -2px;
}

.proxy-item--error {
  border-color: var(--el-color-error-light-5);
  border-left-width: 3px;
  border-left-color: var(--el-color-error);
  background: linear-gradient(
    90deg,
    var(--el-color-error-light-9) 0%,
    var(--el-fill-color-lighter) 28px
  );
}

.proxy-item {
  transition:
    border-color 0.2s,
    background-color 0.2s;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.proxy-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.proxy-index {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-description {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.5;
}

.deploy-steps {
  list-style: none;
  margin: 0;
  padding: 0;
}

.deploy-step {
  display: flex;
  gap: 12px;
  position: relative;
  padding-bottom: 24px;
}

.deploy-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: var(--el-border-color-light);
}

.deploy-step-index {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 2px solid var(--el-border-color);
  border-radius: 50%;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
}

.deploy-step-body {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}

.deploy-step-title {
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.deploy-step-desc {
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.6;
}

.preview-card {
  position: sticky;
  top: 20px;
}

.preview-card--invalid :deep(.el-card__header) {
  border-bottom-color: var(--el-color-error-light-7);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.toml-preview {
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

@media (max-width: 992px) {
  .preview-card {
    position: static;
    margin-top: 0;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
