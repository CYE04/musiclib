# 分享卡片字体

`MaShanZheng-Regular.ttf` 来自 [Google Fonts / Ma Shan Zheng](https://github.com/google/fonts/tree/main/ofl/mashanzheng)，以同目录 `MaShanZheng-OFL.txt` 的 SIL Open Font License 1.1 授权分发。

分享卡片使用本地文件，在预览和导出前加载。没有「可画影流体-简」字体文件或授权；界面提供风格接近的手写体及原有衬线、简约字体切换。

## 新增风格

| 界面名称 | 字体与官方来源 | 本地文件 | 授权 |
| --- | --- | --- | --- |
| 清瘦行书 | [Long Cang](https://github.com/google/fonts/tree/main/ofl/longcang) | `LongCang-Regular.woff2` | `LongCang-OFL.txt` |
| 文艺宋体 | [ZCOOL XiaoWei](https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei) | `ZCOOLXiaoWei-Regular.woff2` | `ZCOOLXiaoWei-OFL.txt` |
| 活泼童趣 | [ZCOOL KuaiLe](https://github.com/google/fonts/tree/main/ofl/zcoolkuaile) | `ZCOOLKuaiLe-Regular.woff2` | `ZCOOLKuaiLe-OFL.txt` |
| 复古窄体 | [ZCOOL QingKe HuangYou](https://github.com/google/fonts/tree/main/ofl/zcoolqingkehuangyou) | `ZCOOLQingKeHuangYou-Regular.woff2` | `ZCOOLQingKeHuangYou-OFL.txt` |
| 拉丁手写 | [Caveat](https://github.com/google/fonts/tree/main/ofl/caveat) | `Caveat-Variable.woff2` | `Caveat-OFL.txt` |

全部以随附 SIL Open Font License 1.1 分发。WOFF2 由官方 TTF 使用 FontTools 4.67.0 无损压缩，不删减字符；转换前后检查 cmap 一致。Caveat 保留变量轴，使用默认常规字重。新增文件总计约 9.1 MB，单款约 0.17–2.95 MB。

面板另保留灵动手写（Ma Shan Zheng）、经典衬线和简约黑体，共八种。只有选中的字体才会加载；不把新增字体加入首页或安装预缓存。已有 Service Worker 可按需缓存同源请求，未缓存字体离线不可用时使用设备字体，不阻止图片导出。

Caveat 专用于意大利语等拉丁文字，包含常用意大利语重音字符；中文自动使用设备衬线字体。其他字体缺少的字符也沿字体栈回退，不替换歌词文字。
