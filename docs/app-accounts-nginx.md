# 用 Nginx 保护应用下载账号

不修改 Xboard 后端：前端携带现有登录令牌访问 `/api/v1/user/app-accounts`，Nginx 用 `auth_request` 请求 Xboard 的 `/api/v1/user/info` 验证令牌，通过后读取私有 JSON。此方案允许所有通过该接口鉴权的用户查看账号，不额外检查套餐或订阅状态。

## 1. 确认 Xboard 的鉴权响应

先确认 Nginx 带 `http_auth_request_module`（`nginx -V`），并验证**实际 Xboard API 源站**的 `/api/v1/user/info`：

```sh
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H 'Accept: application/json' \
  https://xboard.example.com/api/v1/user/info
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H 'Accept: application/json' \
  -H 'Authorization: invalid-test-token' \
  https://xboard.example.com/api/v1/user/info
```

缺失、无效和过期令牌应返回 HTTP 401/403，有效令牌应返回 HTTP 200 和真实用户信息。可在浏览器开发者工具中查看登录后的用户信息请求；`Authorization` 使用登录接口返回的原始 `auth_data`，不要自行再加一次 `Bearer`。

**只有上述行为成立才能启用此配置。** `auth_request` 把所有 2xx 当作通过，不会检查 JSON。若你的 Xboard 或前置代理把鉴权错误改成 HTTP 200，必须先修正代理，或增加能检查响应 JSON 的 njs/Lua 鉴权层；不能直接使用本示例。不要把 `proxy_pass` 指向会回退到前端 `index.html` 的路径。

## 2. 将账号文件放到网站目录之外

以 Nginx worker 用户组为 `www-data` 为例（按服务器实际用户组修改）：

```sh
sudo install -d -o root -g www-data -m 750 /etc/moss-private
sudo install -o root -g www-data -m 640 deploy/app-accounts.example.json /etc/moss-private/app-accounts.json
sudoedit /etc/moss-private/app-accounts.json
```

在文件的 `data` 下按应用名填写 `appleId` 和 `password`，两项都非空才显示。参考 [完整空配置](../deploy/app-accounts.example.json)。密码含双引号或反斜杠时按 JSON 规则转义。可用 `python3 -m json.tool /etc/moss-private/app-accounts.json > /dev/null` 检查语法（需要有读取权限）。

前端也兼容最初直接以应用名为键的 JSON（没有外层 `data`）。字段名必须为 `appleId` 和 `password`，值均为字符串，应用名需要与模板一致，例如 `Shadowrocket`、`塔台`。旧版前端仅支持外层 `data`；若暂不更新前端，请使用模板结构。

真实文件不要放进 Git、`public/`、`dist/`，也不能位于任何网站 `root` 或公开 `alias` 目录内。首次创建后，后续部署不要再用空模板覆盖它。

## 3. 配置 Nginx

将 [app-accounts.conf](../deploy/nginx/app-accounts.conf) 复制到服务器，例如 `/etc/nginx/snippets/moss-app-accounts.conf`，修改其中：

- `xboard.example.com`：全部替换成真实 Xboard API 域名，包含 `proxy_pass`、`Host` 和 TLS 名称。
- `/etc/moss-private/app-accounts.json`：实际私有文件路径。
- `/etc/ssl/certs/ca-certificates.crt`：系统 CA 文件路径；示例适用于 Debian/Ubuntu，其他系统按实际位置填写，保留 TLS 证书验证。
- `https://theme.example.com`：允许访问账号接口的前端 Origin，替换时要修改所有 `Access-Control-Allow-Origin`，不带末尾斜杠。当前配置适用于前端 `https://theme.example.com` 请求 API `https://api.example.com`。

在**主题站点的现有 `server {}` 中**添加：

```nginx
include /etc/nginx/snippets/moss-app-accounts.conf;
```

此配置为 `/api/v1/user/app-accounts` 添加精确匹配，不影响其他 Xboard `/api/` 代理。合并并移除已有的同名 `location`，避免重复定义。不要将私有文件另行映射到公开 URL。CDN 必须绕过账号接口缓存，不能使用“缓存所有内容”规则覆盖 `Cache-Control`。

跨域请求会先发不带登录令牌的 `OPTIONS` 预检。本示例在检查令牌之前返回 204，且 `limit_except` 允许 OPTIONS；实际 GET 仍需 Xboard 验证。成功及 401/403 响应均包含指定 Origin 的 CORS 头，允许 `Authorization`、`Content-Type` 和 `Cache-Control` 请求头。不使用 Cookie 鉴权，无需开启 `Access-Control-Allow-Credentials`。避免其他配置或 CDN 再添加重复的 `Access-Control-Allow-Origin`。

```sh
sudo nginx -t
sudo nginx -s reload
```

## 4. 启用前端

在项目根目录 `.env.production.local` 中填写：

```dotenv
VITE_APP_ACCOUNTS_API_PATH=/api/v1/user/app-accounts
```

重新执行 `npm run build` 并部署 `dist/`。这里仅把接口地址写入前端，没有把账号或密码打包进去。如果 `VITE_API_BASE_URL` 指向另一个域名，账号请求也会使用该域名，应在该 API 域名的 Nginx 配置此接口，并确保其允许主题域名发送 `Authorization` 请求头；推荐沿用本项目默认的同源 `/` API 代理。

之后更改 `/etc/moss-private/app-accounts.json` 中的账号，只需保存并刷新页面，不需要重新构建或重载 Nginx。

## 5. 上线验证与旧文件清理

对主题域名重复第 1 步的无令牌、无效令牌测试，将路径改为 `/api/v1/user/app-accounts`，应返回 401/403，且没有账号内容。再在站点登录后验证账号卡片显示、复制功能，并检查接口返回 200 和 `Cache-Control: private, no-store`。过期令牌也必须无法读取；上游故障应拒绝访问。

跨域部署先检查预检（应返回 204 和允许 Origin/方法/请求头）：

```sh
curl -i -X OPTIONS https://api.example.com/api/v1/user/app-accounts \
  -H 'Origin: https://theme.example.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization,content-type,cache-control'
```

删除服务器残留的公开 `app-accounts.json`，清除旧 URL 的 CDN 缓存。示例已经封禁 `/app-accounts.json` 和 `/public/app-accounts.json`；如果旧部署使用子目录，也要封禁对应路径。旧文件若曾包含真实账号，应更换密码。

本仓库提供本地集成测试：`python3 tests/nginx-app-accounts.test.py`。它启动临时 Nginx 和模拟 Xboard，验证访问控制与缓存响应头；不代替实际 Xboard 的鉴权状态码验证。
