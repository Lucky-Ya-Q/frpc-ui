<script setup></script>

<template>
  <el-config-provider>
    <router-view />
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
</style>
