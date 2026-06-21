function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function formatStringList(items) {
  return `[${items.map((item) => quote(item)).join(', ')}]`
}

export function normalizeLocation(path) {
  const trimmed = String(path ?? '').trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function buildAccessUrl(domain, location) {
  const trimmedDomain = domain?.trim()
  if (!trimmedDomain) return ''

  const normalized = normalizeLocation(location)
  if (!normalized || normalized === '/') {
    return `http://${trimmedDomain}`
  }
  return `http://${trimmedDomain}${normalized}`
}

function formatRouteLabel(domain, location) {
  const normalized = normalizeLocation(location) || '/'
  if (normalized === '/') {
    return `${domain}（全部路径）`
  }
  return `${domain}${normalized}`
}

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

function isValidDomain(domain) {
  if (!domain) return false
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4.test(domain)) {
    return domain.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255)
  }
  const hostname =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$|^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
  return hostname.test(domain)
}

function isValidLocationPath(path) {
  if (!path || path === '/') return true
  if (/[\s?#:]/.test(path)) return false
  return /^\/[\w./-]*$/.test(path)
}

/**
 * @returns {{ valid: boolean, errors: { message: string, proxyIndex?: number }[] }}
 */
export function validateFrpcConfig({ serverAddr, serverPort, password, proxies }) {
  /** @type {{ message: string, proxyIndex?: number }[]} */
  const errors = []

  if (!serverAddr?.trim()) {
    errors.push({ message: '请填写服务端地址' })
  }

  if (!isValidPort(serverPort)) {
    errors.push({ message: '服务端端口需在 1–65535 之间' })
  }

  if (!password?.trim()) {
    errors.push({ message: '请填写 Token' })
  }

  const nameOwners = new Map()
  const routeOwners = new Map()

  proxies.forEach((proxy, index) => {
    const proxyLabel = proxy.name?.trim() || `代理 #${index + 1}`

    if (!proxy.name?.trim()) {
      errors.push({ message: `${proxyLabel}：请填写代理名称`, proxyIndex: index })
    } else {
      const owners = nameOwners.get(proxy.name.trim()) ?? []
      owners.push(proxyLabel)
      nameOwners.set(proxy.name.trim(), owners)
    }

    if (!isValidPort(proxy.localPort)) {
      errors.push({
        message: `${proxyLabel}：本地端口需在 1–65535 之间`,
        proxyIndex: index,
      })
    }

    const domains = proxy.customDomains ?? []
    if (!domains.length) {
      errors.push({
        message: `${proxyLabel}：至少需要一个自定义域名`,
        proxyIndex: index,
      })
    }

    const normalizedDomains = []
    for (const domain of domains) {
      const trimmedDomain = domain?.trim()
      if (!trimmedDomain) {
        errors.push({
          message: `${proxyLabel}：存在空的自定义域名`,
          proxyIndex: index,
        })
        continue
      }
      if (!isValidDomain(trimmedDomain)) {
        errors.push({
          message: `${proxyLabel}：域名「${trimmedDomain}」格式不正确`,
          proxyIndex: index,
        })
        continue
      }
      if (normalizedDomains.includes(trimmedDomain)) {
        errors.push({
          message: `${proxyLabel}：域名「${trimmedDomain}」重复配置`,
          proxyIndex: index,
        })
      } else {
        normalizedDomains.push(trimmedDomain)
      }
    }

    const paths = proxy.locations?.length ? proxy.locations : ['']
    const normalizedPaths = []
    for (const location of paths) {
      const raw = String(location ?? '').trim()
      if (proxy.locations?.length && !raw) {
        errors.push({
          message: `${proxyLabel}：存在空的 URL 路径前缀`,
          proxyIndex: index,
        })
        continue
      }

      const normalizedPath = normalizeLocation(location) || '/'
      if (!isValidLocationPath(normalizedPath)) {
        errors.push({
          message: `${proxyLabel}：路径「${raw}」格式不正确，需以 / 开头且不能含空格或 ?#`,
          proxyIndex: index,
        })
        continue
      }

      if (normalizedPaths.includes(normalizedPath)) {
        errors.push({
          message: `${proxyLabel}：路径「${normalizedPath === '/' ? '全部路径' : normalizedPath}」重复配置`,
          proxyIndex: index,
        })
      } else {
        normalizedPaths.push(normalizedPath)
      }
    }

    for (const trimmedDomain of normalizedDomains) {
      for (const normalizedPath of normalizedPaths) {
        const routeKey = `${trimmedDomain}${normalizedPath}`
        const routeLabel = formatRouteLabel(trimmedDomain, normalizedPath)
        const owners = routeOwners.get(routeKey) ?? []
        owners.push({ proxyLabel, routeLabel, proxyIndex: index })
        routeOwners.set(routeKey, owners)
      }
    }
  })

  for (const [, owners] of nameOwners) {
    if (owners.length > 1) {
      errors.push({
        message: `代理名称重复：${owners.map((name) => `「${name}」`).join('与')}`,
      })
    }
  }

  for (const [, owners] of routeOwners) {
    if (owners.length > 1) {
      const routeLabel = owners[0].routeLabel
      const proxyNames = owners.map((owner) => `「${owner.proxyLabel}」`).join('与')
      errors.push({
        message: `路由冲突：${proxyNames} 都使用了 ${routeLabel}`,
        proxyIndices: owners.map((owner) => owner.proxyIndex),
      })
    }
  }

  return { valid: errors.length === 0, errors }
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
    lines.push(`customDomains = ${formatStringList(proxy.customDomains)}`)

    const locations = (proxy.locations ?? [])
      .map(normalizeLocation)
      .filter(Boolean)
    if (locations.length) {
      lines.push(`locations = ${formatStringList(locations)}`)
    }

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
