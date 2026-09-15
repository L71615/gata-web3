# GATE 本地仪表盘

启动方式：

```powershell
.\ui-start.bat
```

脚本会自动检查 `.env`、安装依赖、编译项目、启动扫描器和本地仪表盘，然后打开浏览器。

浏览器地址：

```text
http://127.0.0.1:8787
```

仪表盘包含：

- 候选币数量与风险评分
- 流动性、成交量和 5 分钟买卖数量
- 纸上仓位与已实现 PnL
- 最近审计事件
- 每 5 秒自动刷新

测试启动：

```powershell
.\ui-start.bat -Test
```

只启动仪表盘、不启动扫描器：

```powershell
$env:UI_START_SCANNER="false"
node ui/server.mjs
```

UI 默认只读，不会发起交易。实盘签名仍由交易程序的显式配置控制。
