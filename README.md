# Moss · 私有订阅面板

基于 React 19、TypeScript、Vite 8、Tailwind CSS 4 和 React Query，沿用 Xboard API 与 Token 登录。

用户导航仅保留：首页、订阅、节点、设置。支持移动导航与深色模式，无商店、订单、返利、工单或客服入口。

## 开发与构建

使用 Node.js 22.12+ 或 24（系统 Node 20.14 不符合 Vite 8 要求）。

```sh
npm ci
cp .env.example .env
npm run dev
npm run build
npm run lint
```

构建结果在 `dist/`。静态服务器需将前端路由回退至 `index.html`，`/api/` 请求转发至 Xboard。

## 配置

```dotenv
VITE_APP_NAME=Moss
VITE_API_BASE_URL=/
VITE_ENABLE_MOCK=false
VITE_NODE_STATUS_API_PATH=/api/v1/user/server/fetch
VITE_NODE_STATUS_REFRESH_INTERVAL_MS=60000
```

本地演示可显式设置 `VITE_ENABLE_MOCK=true`，使用任意合法邮箱与至少六位密码。演示数据不代表真实服务状态。现有 `.env` 的站点名和后端地址优先于默认配置，修改后需重新构建。

订阅页提供客户端卡片、下载、复制、扫码及 URL Scheme 导入，设备默认移动端（iOS）。订阅 URL 保持原样，由后端按客户端请求识别格式。塔台作为独立订阅工具提供下载入口，需要转换时由用户在应用中操作。

### 应用下载账号（Apple ID）

每个应用都可以单独配置下载账号，包括塔台和客户端列表中的应用。账号必须保存在后端数据库或网站静态目录之外的私有配置中，不能放在 `public/`、`dist/` 或 `VITE_*` 环境变量中。

无需修改 Xboard 后端，可通过 Nginx `auth_request` 复用 `/api/v1/user/info` 的登录鉴权，再读取网站目录之外的私有账号文件。完整步骤见 [Nginx 下载账号部署说明](docs/app-accounts-nginx.md)，附带 [Nginx 配置](deploy/nginx/app-accounts.conf) 和 [账号空模板](deploy/app-accounts.example.json)。必须先确认真实 Xboard 对无效令牌返回 HTTP 401/403，不能返回带错误 JSON 的 HTTP 200。

前端默认关闭账号展示。配置好 Nginx 后，在 `.env.production.local` 中设置接口路径并重新构建：

```dotenv
VITE_APP_ACCOUNTS_API_PATH=/api/v1/user/app-accounts
```

以上路径由附带的 Nginx 配置提供，并非 Xboard 内置接口。前端复用现有 API 客户端发送 `Authorization`，Nginx 将令牌交给 Xboard 验证，通过后返回私有 JSON。成功响应设置 `Cache-Control: private, no-store`，CDN 禁止缓存该接口。私有 JSON 文件结构如下：

```json
{
  "data": {
    "塔台": {
      "appleId": "tower-download@example.com",
      "password": "replace-with-download-password"
    },
    "Shadowrocket": {
      "appleId": "shadowrocket-download@example.com",
      "password": "replace-with-download-password"
    }
  }
}
```

应用名称区分大小写，可用键为：`塔台`、`Shadowrocket`、`Surge`、`sing-box`、`Egern`、`clash-mi`、`Quantumult X`、`Stash`、`v2rayN`、`clash-verge-rev`、`NekoBox`。两项都填写非空字符串才显示账号区域；删除对应应用、留空任一项或返回 `{"data":{}}` 即可隐藏。密码默认隐藏，支持显示和复制。接口未配置、响应格式错误或加载失败时隐藏账号区域；演示模式不会请求账号接口。

修改服务器私有账号文件无需重新构建，刷新页面获取最新值。前端不将账号写入本地持久存储，退出登录清理查询缓存。

**从旧静态文件方案迁移**：从生产静态目录删除旧 `app-accounts.json`，清除 CDN 缓存，并封禁旧路径（部署在子目录时也要封禁对应路径）：

```nginx
location = /app-accounts.json {
    return 404;
}
location = /public/app-accounts.json {
    return 404;
}
```

若旧文件已经填写真实账号并上线，应更换对应密码。登录鉴权只能限制未授权访问，获得展示权限的用户仍能复制账号。上线前验证：不带令牌、无效令牌、过期令牌均无法获取账号；有效授权用户可以获取；旧静态路径不再返回任何账号数据。

节点缺少明确 `online` / `is_online` 时显示未知，普通 `status` 字段不当作实时在线状态。流量按已返回的上传和下载记录汇总，可能存在统计延迟或不完整月份，不推断缺失记录。

完整分析、删除范围与保留依赖见 [重构报告](docs/refactor-report.md)。

### Komari 节点监控

节点页面保留订阅接口的实际节点列表，将 Komari `common:getNodes` 中非空的 `public_remark` 与实际节点名称做包含匹配（例如 `美国-1` 匹配 `专线 美国-1 | 倍率 1x`），多个匹配优先最长备注；同长度歧义不关联。一个监控主机可以关联多个协议节点，没有备注或隐藏的主机不会关联。

通过 `common:getNodesLatestStatus` 获取在线状态、CPU / 内存 / 磁盘、上下行速率、各探测点延迟 / 丢包；主机信息通过 UUID 关联。实时状态复用页面级 WebSocket（`/api/rpc2`），每 1 秒发送一次 `common:getNodesLatestStatus` 请求，并非主动订阅推送。节点资料单独缓存 5 分钟；连接失败退回 30 秒 HTTP 刷新，采用 1–30 秒指数退避（含随机抖动）重连。页面隐藏或离线时关闭连接、暂停查询，返回页面后重连；离开页面清理连接、计时器和未完成请求。名称关联只在节点列表或监控资料变化时重新计算，无变化卡片跳过渲染。超过 2 分钟的在线上报显示未知，不将节点资料的 `updated_at` 当作在线依据。探测延迟不是用户客户端延迟，流量速率为主机总速率。监控失败不影响订阅节点展示，也不会向 Komari 发送订阅登录凭据。

线路质量通过 `public:getPublicPingTasks` 获取线路名称、权重排序和绑定节点，通过 `common:getNodesLatestStatus` 的 `ping` 获取实时延迟与丢包率。展开后以左右两列展示延迟 / 丢包率及色块历史；历史补充调用 `common:getRecords`（`type: ping`、`uuid`、最近 1 小时），按节点共享缓存，每 60 秒刷新。悬停、点击色块或使用左右方向键可查看时间段、平均延迟或丢包比例与失败 / 总样本数；无样本显示灰色，不将缺失记录当作成功。

`VITE_KOMARI_API_URL` 默认 `/api/komari/rpc2`。开发环境在项目根目录 `.env` 或 `.env.development.local` 中配置 Komari 上游地址：

```env
KOMARI_HOST=https://komari.example.com
VITE_KOMARI_API_URL=/api/komari/rpc2
VITE_KOMARI_WS_URL=
```

将示例域名替换为自己的 Komari 域名，`KOMARI_HOST` 填写包含 `http://` 或 `https://` 的源地址，不带 `/api/rpc2` 路径。开发代理会将请求转发到该主机的 `/api/rpc2`，并使用该源地址设置 WebSocket Origin。未配置或留空时不启用开发代理；修改后需要重启开发服务器。`KOMARI_HOST` 仅供 Vite 开发服务器使用，不注入前端，也不配置生产代理。

**生产环境需配置同源反向代理**（避免 Komari 的跨域限制），在主题域名的 Nginx 配置中设置实际的 Komari 主机，示例：

```nginx
location = /api/komari/rpc2 {
    proxy_pass https://komari.example.com/api/rpc2;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_ssl_server_name on;
    proxy_set_header Host komari.example.com;
    proxy_set_header Origin https://komari.example.com;
    proxy_set_header Cookie "";
    proxy_set_header Authorization "";
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
}
```

该 location 应配置在主题所在域名的 server 块中。如果托管在不支持代理的静态平台，需要在 Komari 端允许主题域名的 CORS，再将 `VITE_KOMARI_API_URL` 设置为完整的公开 RPC 地址并重新构建。`VITE_ENABLE_MOCK=true` 时不会请求真实监控接口。

WebSocket 默认从 `VITE_KOMARI_API_URL` 自动生成 `ws://` / `wss://` 地址，也可以通过 `VITE_KOMARI_WS_URL` 单独指定。开发代理已启用 WebSocket Upgrade，生产代理需包含上面的 Upgrade 配置。直接指定跨域 WSS 地址仍受 Komari 的 Origin 校验影响，建议保留同源代理；代理会去除 Cookie / Authorization 后再转发。

Komari 的 WebSocket 升级会校验 Origin，代理必须将 Origin 设置为 `https://komari.example.com`（留空会被拒绝），上面的示例已包含该设置。
