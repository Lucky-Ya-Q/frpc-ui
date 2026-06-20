function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function formatDomains(domains) {
  return `[${domains.map((d) => quote(d)).join(', ')}]`
}

export function generateFrpcToml({ serverAddr, serverPort, password, proxies }) {
  const lines = [
    `serverAddr = ${quote(serverAddr)}`,
    `serverPort = ${serverPort}`,
    '',
    'auth.method = "token"',
    `auth.token = ${quote(password)}`,
    '',
  ]

  proxies.forEach((proxy) => {
    lines.push('[[proxies]]')
    lines.push(`name = ${quote(proxy.name)}`)
    lines.push('type = "http"')
    lines.push(`localPort = ${proxy.localPort}`)
    lines.push(`customDomains = ${formatDomains(proxy.customDomains)}`)
    lines.push('')
  })

  return `${lines.join('\n').trimEnd()}\n`
}

export function generateStartBat() {
  return `@echo off
cd /d "%~dp0"
frpc.exe -c frpc.toml
pause
`
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFiles(files) {
  files.forEach(({ filename, content }, index) => {
    setTimeout(() => downloadTextFile(filename, content), index * 150)
  })
}
