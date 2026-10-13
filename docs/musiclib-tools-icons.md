# 工具箱图标

工具箱沿用 StudioLive 的设备剪影语言与 musiclib 的暖色配色。和弦查询的 keyboard 直接复用本地 StudioLive32S/src/web/app.js 的 Universal Control 图标，仅更换 CSS 类名，保留 SVG 几何与 viewBox。素材来源及版权说明见外层 docs/youth-studiolive-icons.md。节拍器、简谱音符与歌词文档剪影为本次绘制。图标内联于 musiclib-tools.js，随工具箱缓存，无新增网络请求。

用户随后限定本轮仅调整 musiclib 箭头。下拉、进入、返回和收起箭头使用 StudioLive AUX 选择器的 16×16、1.5px 折线轮廓；下拉箭头的背景盒距右侧 16px，实际轮廓距边约 20px，右侧文字留白 44px。保留原生 select 的选项与键盘行为，在系统强制颜色模式恢复原生箭头。其他图标沿用上一版。

本轮构建与 26 项工具箱流程通过；另检查 320、390、1280px 的深浅主题共 6 种布局，四个下拉框的箭头内距、文字留白和键盘选调均通过。
