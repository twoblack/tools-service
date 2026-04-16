# ECharts Render Service

基于 Puppeteer + Express 的 ECharts 服务端渲染服务，接收 ECharts option 配置，返回 PNG 图片的 Base64 编码。

## 项目结构

```
├── Dockerfile          # 应用镜像
├── Dockerfile.base     # 基础镜像（含 Chromium，只需构建一次）
├── render-service.js   # 主服务
├── echarts.min.js      # ECharts 本地文件
├── package.json
├── start.bat           # Windows 一键启动脚本
└── test-case.cmd       # 测试用例
```

## 快速开始

### 第一步：构建基础镜像（只需执行一次）

基础镜像包含 Chromium 及相关依赖，构建较慢，但后续重新构建应用镜像时不会重复执行。

```bash
docker build -f Dockerfile.base -t myapp-base:latest .
```

### 第二步：构建应用镜像

```bash
docker build -t render-service:latest .
```

### 第三步：启动服务

**Windows（推荐）：**

直接运行 `start.bat`，或手动执行：

```cmd
docker run -d --name render-service -p 3000:3000 -v .:/app/ -v /app/node_modules render-service:latest
```

修改代码后重启容器：

```cmd
docker restart render-service
```

## API

### 健康检查

```
GET /health
```

返回：
```json
{ "status": "ok" }
```

### 渲染图表

```
POST /render
Content-Type: application/json
```

请求体：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| option | object | ✅ | ECharts option 配置 |
| width | number | ❌ | 图片宽度，默认 800 |
| height | number | ❌ | 图片高度，默认 600 |

返回：
```json
{
  "success": true,
  "data": "<base64 encoded PNG>"
}
```

## 测试

### 渲染柱状图并保存为 PNG

```cmd
curl -X POST http://localhost:3000/render ^
  -H "Content-Type: application/json" ^
  -d "{\"option\":{\"xAxis\":{\"type\":\"category\",\"data\":[\"Mon\",\"Tue\",\"Wed\"]},\"yAxis\":{\"type\":\"value\"},\"series\":[{\"type\":\"bar\",\"data\":[120,200,150]}]}}" ^
  -o response.json && python -c "import json,base64; r=json.load(open('response.json')); open('output.png','wb').write(base64.b64decode(r['data'])) if r.get('success') else print('FAIL:',r)"
```

成功后会在当前目录生成 `output.png`。

## 配置

`render-service.js` 顶部 `CONFIG` 对象可调整以下参数：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| PAGE_POOL_SIZE | 10 | Page 池大小，决定最大并发数 |
| RENDER_TIMEOUT | 10000 | 渲染超时时间（ms） |
| WIDTH | 800 | 默认图片宽度（px） |
| HEIGHT | 600 | 默认图片高度（px） |

## 注意事项

- ECharts 以本地文件内联方式加载，避免网络请求导致超时
- 渲染时关闭动画（`animation: false`），确保截图时图表已完全绘制
- 使用 Page 池复用 Chromium 页面，提升并发性能