# travel/ — OpenAA 美国旅游攻略栏目

## 目录职责

| 目录 | 用途 |
|---|---|
| `tools/build.mjs` | 构建脚本：读取 data 生成全部静态 HTML，同步根 sitemap |
| `tools/validate.mjs` | 验证脚本：检查 title/desc/canonical/h1/内链/图片 |
| `data/articles.json` | 9 篇文章的正文数据（含来源、核实日期） |
| `data/images.json` | 图片授权记录（URL、作者、许可、核实日期） |
| `content/new-york/` | 预留：未来 Markdown 内容源（当前数据在 data/） |
| `styles/` | 预留：样式已内联在 build.mjs 的 CSS 常量中 |
| `tests/` | 预留：验证逻辑在 tools/validate.mjs |

## 新增文章

1. 在 `data/articles.json` 追加文章对象（参考现有字段）
2. 在 `data/images.json` 登记图片授权（必填：imageUrl、sourcePage、photographer、license、verifiedAt）
3. `node travel/tools/build.mjs` → `node travel/tools/validate.mjs`
4. 提交推送，GitHub Pages 自动部署

## 图片授权记录

每张图片必须有：原始页面、作者/机构、许可名称、署名要求、核实日期。
不使用 AI 生成图；授权不明宁可不用。

## SEO 检查

- validate.mjs：title 唯一、description 唯一、单 h1、canonical、内链有效、图片 alt
- sitemap：构建时自动同步到根 `/sitemap.xml`（去重）

## 发布流程

构建 → 验证 0 错误 → 推送 main → Actions 部署 → 线上抽查（HTTP 200、标题、图片、手机布局）
