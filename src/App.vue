<script setup></script>

<template>
  <el-config-provider>
    <div class="app-layout">
      <main class="app-main">
        <router-view />
      </main>

      <footer class="app-footer">
        <p class="footer-desc">
          基于 frp 的 HTTP 虚拟主机配置生成器，帮你把内网 Web 服务安全、便捷地暴露到公网。配置完成后下载
          frpc.toml 即可一键部署。
        </p>
        <nav class="footer-links" aria-label="相关链接">
          <a class="footer-link-item" href="https://freefrp.net/" target="_blank" rel="noopener noreferrer">
            <span class="footer-link-title">Free FRP</span>
            <span class="footer-link-desc">免费 FRP 内网穿透服务</span>
          </a>
          <a
            class="footer-link-item"
            href="https://www.shanyexia.top/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="footer-link-title">山野下</span>
            <span class="footer-link-desc">作品集与书签库</span>
          </a>
          <a
            class="footer-link-item"
            href="https://github.com/fatedier/frp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="footer-link-title">frp</span>
            <span class="footer-link-desc">官方开源项目与文档</span>
          </a>
        </nav>
      </footer>
    </div>
  </el-config-provider>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--el-bg-color-page);
  font-family:
    'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial,
    sans-serif;
}

#app {
  min-height: 100vh;
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
}

.app-footer {
  margin-top: auto;
  padding: 28px 20px 32px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  text-align: center;
}

.footer-desc {
  max-width: 640px;
  margin: 0 auto 20px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.footer-links {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
}

.footer-link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 140px;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  text-decoration: none;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.footer-link-item:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.footer-link-title {
  color: var(--el-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.footer-link-desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}
</style>
