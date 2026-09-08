# Moss 重构报告

## 原项目分析

React 19 + TypeScript + Vite 8；Tailwind 4 + Radix/shadcn 风格组件；React Query 管理请求缓存；React Hook Form + Zod 处理认证表单；Axios 访问 API。

`src/router.tsx` 使用 React Router 7、lazy 和 Suspense，`ProtectedLayout` 依据 AuthContext 的 hydrated / token 控制访问。没有前端角色或细粒度权限，实际授权由 Xboard 后端决定。`src/features/auth/auth-context.tsx` 获取 user/info 和 user/getSubscribe；`src/lib/api/client.ts` 注入 Authorization，401 清除 Token 并返回登录；`src/lib/storage.ts` 保存 Token。

桌面和移动导航共用 `app-sidebar.tsx` / `nav-main.tsx`，移动端由 Sidebar 的 Sheet 承载。`nav-user.tsx` 原本只有账户信息与退出登录，没有钱包等额外下拉入口。

| 功能 | 原页面 / 路由 | 入口与组件 | API / 处理结果 |
| --- | --- | --- | --- |
| 工单、客服 | tickets-page / /tickets | Sidebar、SupportDialog | services/tickets.ts；ticket/fetch/save/reply/close。移除入口、route，确认专用页面无依赖后删除 |
| 邀请、返利、佣金、提现 | invite-page / /invite | Sidebar，Dashboard 余额/返利，section-cards | services/invite.ts；invite/fetch/save、comm/config、ticket/withdraw、transfer。移除全部可达 UI 和页面 |
| 知识库、公告 | knowledge-page / /knowledge | Sidebar、SupportDialog、客户端教程链接 | services/knowledge.ts；knowledge/fetch、notice/fetch。删除页面及教程入口 |
| 套餐商店 | plans-page / /plans | Sidebar，购买/结算按钮 | user.ts 的 getPlans；orders.ts 的 order/save/checkout。删除专用页面及路由 |
| 订单、支付记录 | orders-page / /orders | Sidebar、订单详情和支付弹窗 | orders.ts；order/fetch/detail/getPaymentMethod/cancel/checkout。删除专用页面及路由 |
| 余额、钱包、优惠券 | Dashboard、section-cards、plans/orders | 余额卡片和购买流程 | user.balance / commission_balance、订单相关金额与结算字段。UI 全部移除 |
| 充值、礼品卡 | 未发现独立页面或路由 | 未发现独立可用入口 | 不新增；金额相关类型暂保留 |
| 公开注册、邀请码 | register-page / /register | 登录页注册链接 | auth.ts 中 registerSchema/register。移除页面及路由，保留认证服务代码 |

处理顺序为先移除导航与 UI，再移除 route，最后删除仅由这些路由或旧 Dashboard 使用的专用页面和组件。旧路径统一经过现有 wildcard 回到首页或登录，不保留空壳页面。

## 最终界面

- 首页：套餐、上传+下载总用量、额度、剩余流量、百分比、到期、剩余天数、订阅状态、原始订阅链接与复制。
- 订阅：恢复原项目的客户端卡片、下载、导入、二维码与设备筛选，设备默认移动端，系统默认 iOS。没有真实链接时不出现导入按钮，也不使用示例 URL 补位。
- 节点：名称、接口地区、协议、倍率、明确的在线状态；未知数据不伪造成在线。不展示标签、线路营销、虚构检测时间。
- 流量信息统一放在首页：保留原有交互趋势图与周摘要，独立流量页面及其导航、路由已移除。
- 设置：邮箱、修改密码、订阅重置确认。移除邮件提醒等次要设置 UI。
- 认证：保留登录、忘记密码、Token 协议及退出；退出清理 React Query 缓存。初始化错误被捕获；重置后先清除旧链接再拉取新链接。

设计移除全局渐变、外部字体、远程客户端图标、地球动画、大屏卡片和多层装饰。默认品牌 Moss，已有 `.env` 站点名仍优先。保留主题切换和响应式侧栏，移动端点导航后自动收起。

## 删除与依赖保留

删除六个专用页面（工单、邀请、订单、商店、知识库、注册），以及 section-cards、auth-globe。原有 chart-area-interactive、traffic-weekly-summary 已按后续反馈恢复供首页使用。重写首页、订阅、节点、设置四个核心页面；新增 subscription-link 共享组件。独立 traffic-page 已在后续合并中删除。移除 cobe；qrcode、@types/qrcode 随订阅页扫码导入恢复，未引入新的依赖种类。

仍保留传统业务的 services/invite.ts、orders.ts、tickets.ts、knowledge.ts、getPlans、register 和部分 mock/type。这些独立服务目前无 UI 调用，保留是分阶段精简策略，并非声称核心页面仍依赖它们。

user.ts、auth.ts、settings.ts、types.ts、mock.ts、Axios、认证表单、Radix 基础组件被正常功能共用，不能整文件删除。钱包/佣金的后端字段仍在类型中，但不会渲染。提醒服务也保留而无 UI 调用。

## 能力边界

getSubscribe 没有客户端格式能力清单；没有后端代码证明 Loon / Sing-box 支持，不凭客户端名字添加 flag 参数。现有导入保留 URL 原样和客户端识别行为，实际原生客户端兼容性需要真实服务验证。

流量接口未声明完整月份覆盖范围，页面明确说明总计只含已返回记录。节点只信任明确 online/is_online 字段，不能把普通 status（可能只是启用状态）当健康检测。

不修改后端，前端移除注册等入口并不等于关闭后端对应 API。

## 后续最值得精简

将共享 mock/type 按核心功能拆分后，删除无调用的销售 API、金额格式化工具和未使用基础 UI。确认实际 Xboard 版本支持的订阅格式后，再评估 Loon / Sing-box 是否值得加入。现有 export:release 脚本硬编码其他机器目录，后续应改成可配置的本地输出目录。

## 验证结果

- Node 24.4.1 下 `npm run build` 通过（包含 `tsc -b`），`npm run lint` 通过，`git diff --check` 通过。
- 浏览器使用本机显式 mock 环境完成登录、五个导航页面、复制订阅反馈、390×844 移动菜单自动收起、桌面/移动深色布局检查。
- 直接访问旧 `/orders` 路径正确回到 `/dashboard`；页面无销售菜单。所检查页面的浏览器 warn/error 日志为空。
- 未使用真实用户凭据进行后端联调，未提交真实密码修改或订阅重置，未启动原生客户端导入。上述操作的服务端结果仍需在实际部署环境验证。
- 系统默认 Node 20.14 有 Vite 引擎版本提示，最终验证使用已有 Node 24；npm 用户配置中的 python/ptyhon 提示与本次代码无关。


## 首页视觉调整

按用户反馈恢复原用户中心的欢迎区域、套餐与到期卡片、右侧流量进度、下方交互趋势图和周摘要。只移除账户余额卡片及整段「补充指标 / 账户提醒与周期信息」，不恢复返利、重置时间与通知设置。套餐/到期两张卡片自动铺满，不留余额占位；保留订阅复制入口和上传+下载统计修正。其他精简后的导航与页面维持不变。本轮 build、TypeScript、ESLint、diff 检查通过。


## 合并流量入口

按用户反馈删除独立流量页、桌面/移动共用的流量菜单及 `/traffic` 路由。最终导航为首页、订阅、节点、设置。首页趋势图、周摘要及共享 traffic API 保留。旧 `/traffic` 地址由通配路由回到首页（未登录时返回登录页）。


## 订阅页视觉调整

按用户反馈恢复原订阅页的客户端卡片、设备类型/系统平台筛选、下载、复制与扫码导入。默认设备为移动端，默认系统为 iOS；切换设备时同步选择对应系统，避免出现短暂的空列表。恢复原下载配置及二维码依赖，但不恢复知识库教程链接。订阅地址缺失时显示空状态，不使用演示地址补位。
