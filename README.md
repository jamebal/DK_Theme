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

订阅页恢复原客户端卡片、下载、复制、扫码及 URL Scheme 导入，设备默认移动端（iOS）。订阅 URL 保持原样，由后端按客户端请求识别格式。当前 API 未提供格式能力清单，因此没有加入未经验证的 Loon、Sing-box 入口，也没有使用第三方订阅转换服务。

节点缺少明确 `online` / `is_online` 时显示未知，普通 `status` 字段不当作实时在线状态。流量按已返回的上传和下载记录汇总，可能存在统计延迟或不完整月份，不推断缺失记录。

完整分析、删除范围与保留依赖见 [重构报告](docs/refactor-report.md)。

### Komari 节点监控

节点页面保留订阅接口的实际节点列表，将 Komari `common:getNodes` 中非空的 `public_remark` 与实际节点名称做包含匹配（例如 `美国-1` 匹配 `专线 美国-1 | 倍率 1x`），多个匹配优先最长备注；同长度歧义不关联。一个监控主机可以关联多个协议节点，没有备注或隐藏的主机不会关联。

通过 `common:getNodesLatestStatus` 获取在线状态、CPU / 内存 / 磁盘、上下行速率、各探测点延迟 / 丢包；主机信息通过 UUID 关联。实时状态复用页面级 WebSocket（`/api/rpc2`），每 1 秒发送一次 `common:getNodesLatestStatus` 请求，并非主动订阅推送。节点资料单独缓存 5 分钟；连接失败退回 30 秒 HTTP 刷新，采用 1–30 秒指数退避（含随机抖动）重连。页面隐藏或离线时关闭连接、暂停查询，返回页面后重连；离开页面清理连接、计时器和未完成请求。名称关联只在节点列表或监控资料变化时重新计算，无变化卡片跳过渲染。超过 2 分钟的在线上报显示未知，不将节点资料的 `updated_at` 当作在线依据。探测延迟不是用户客户端延迟，流量速率为主机总速率。监控失败不影响订阅节点展示，也不会向 Komari 发送订阅登录凭据。

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
