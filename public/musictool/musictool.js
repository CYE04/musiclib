/* ✦ Designed & Built by YuEn © 2025–2026 ✦ */

/* musictool.js — 音乐工具箱*/
(function(){
'use strict';

/* ── 注入 HTML ── */
const root = document.getElementById('music-toolbox');
if(!root) return;

root.innerHTML = `
<!-- HUB -->
<div class="mt-hub" id="mt-hub">
  <div class="mt-hub-title">
    <h1>音 乐 工 具 箱</h1>
    <p>MUSIC TOOLS · 赞美诗工作站</p>
  </div>
  <div class="mt-tool-grid">
    <div class="mt-tool-card c1" id="mt-card-lrc">
      <div class="mt-tool-icon">🎵</div>
      <div class="mt-tool-name">歌词编辑器</div>
      <div class="mt-tool-desc">LRC 时间轴打轴<br>导入 / 导出 .lrc 文件</div>
      <div class="mt-tool-arrow">OPEN →</div>
    </div>
    <div class="mt-tool-card c2" id="mt-card-jf">
      <div class="mt-tool-icon">♩</div>
      <div class="mt-tool-name">简谱编辑器</div>
      <div class="mt-tool-desc">音符输入 · 和弦标注<br>导出 JSON 文件</div>
      <div class="mt-tool-arrow">OPEN →</div>
    </div>
  </div>
</div>

<!-- TOOLVIEW -->
<div class="mt-toolview" id="mt-toolview">
  <div class="mt-topbar">
    <button class="mt-back" id="mt-back">← 返回</button>
    <span class="mt-nav-label">工具箱 /</span>
    <span class="mt-nav-name" id="mt-nav-name"></span>
    <button class="mt-help-btn" id="mt-help-btn" title="使用教程">?</button>
  </div>
  <div class="mt-body">

    <!-- LRC -->
    <div class="mt-panel" id="mt-panel-lrc">
      <audio id="mt-audio"></audio>
      <div class="mt-lrc-top">
        <div class="mt-lrc-progbar" id="mt-progbar">
          <div class="mt-lrc-progfill" id="mt-progfill"></div>
        </div>
        <div class="mt-lrc-controls">
          <span class="mt-lrc-time" id="mt-time">[00:00.00]</span>
          <button class="mt-play-btn" id="mt-playbtn">▶</button>
          <div class="mt-vol-wrap">
            <span class="mt-vol-label">音量</span>
            <input type="range" class="mt-vol-range" id="mt-vol" min="0" max="1" step="0.01" value="1">
          </div>
        </div>
      </div>
      <div class="mt-lrc-body">
        <div class="mt-lrc-left">
          <button class="mt-side-btn" id="mt-btn-music">⬆ 上传音乐</button>
          <input type="file" id="mt-music-file" accept="audio/*" style="display:none">
          <div class="mt-hover-group" id="mt-hg-lyric">
            <button class="mt-side-btn" id="mt-btn-lyric">⬆ 上传歌词</button>
            <input type="file" id="mt-lyric-file" accept=".lrc" style="display:none">
            <div class="mt-sub-btns">
              <button class="mt-side-btn mt-sub-btn" id="mt-btn-txt">📄 上传文本</button>
              <input type="file" id="mt-txt-file" accept=".txt" style="display:none">
              <button class="mt-side-btn mt-sub-btn" id="mt-btn-find">🔍 查找歌词</button>
            </div>
          </div>
          <button class="mt-side-btn" id="mt-btn-create">📄 创建歌词</button>
          <div class="mt-hover-group" id="mt-hg-dl">
            <button class="mt-side-btn" id="mt-btn-dl">⬇ 下载歌词</button>
            <div class="mt-sub-btns">
              <button class="mt-side-btn mt-sub-btn" id="mt-btn-dl-twin">⬇ 下载双语LRC</button>
            </div>
          </div>
        </div>
        <div class="mt-lrc-center" id="mt-lrc-center">
          <div class="mt-info-row">
            <div class="mt-info-dot"></div>
            <button class="mt-info-btn" id="mt-btn-info">add info</button>
          </div>
          <div id="mt-lines"></div>
        </div>
        <div class="mt-lrc-right">
          <div>
            <span class="mt-r-label">偏移</span>
            <div class="mt-offset-row">
              <input type="number" class="mt-offset-inp" id="mt-offset" value="0" step="0.1">
              <span class="mt-offset-unit">s</span>
            </div>
            <button class="mt-apply-btn" id="mt-btn-offset">应用偏移</button>
          </div>
          <div>
            <span class="mt-r-label">同步滚动</span>
            <div class="mt-toggle-row">
              <div class="mt-toggle on" id="mt-toggle"></div>
              <span class="mt-toggle-lbl" id="mt-toggle-lbl">开</span>
            </div>
          </div>
          <button class="mt-add-end-btn" id="mt-btn-addend">+ 新增歌词</button>
        </div>
      </div>
    </div>

    <!-- 简谱 iframe -->
    <div class="mt-panel mt-panel-jf" id="mt-panel-jf">
      <iframe id="mt-jf-iframe" src="" title="简谱编辑器"></iframe>
    </div>
  </div>
</div>

<!-- Modal: info -->
<div class="mt-modal-overlay" id="mt-modal-info">
  <div class="mt-modal-box">
    <div class="mt-modal-title">Add Info · 歌曲信息</div>
    <div class="mt-modal-row"><label>歌手 Artist</label><input class="mt-modal-inp" id="mt-meta-ar" placeholder="赞美之泉"></div>
    <div class="mt-modal-row"><label>歌名 Title</label><input class="mt-modal-inp" id="mt-meta-ti" placeholder="展开清晨的翅膀"></div>
    <div class="mt-modal-row"><label>专辑 Album</label><input class="mt-modal-inp" id="mt-meta-al"></div>
    <div class="mt-modal-row"><label>制作 By</label><input class="mt-modal-inp" id="mt-meta-by"></div>
    <div class="mt-modal-footer">
      <button class="mt-modal-ok" id="mt-info-ok">确定</button>
      <button class="mt-modal-cancel" id="mt-info-cancel">取消</button>
    </div>
  </div>
</div>

<!-- Modal: create -->
<div class="mt-modal-overlay" id="mt-modal-create">
  <div class="mt-modal-box">
    <div class="mt-modal-title">创建歌词 · 每行一句</div>
    <div class="mt-modal-warn">⚠️ 这会删除当前所有歌词，确认继续吗？</div>
    <textarea class="mt-modal-ta" id="mt-create-ta" placeholder="第一行歌词&#10;第二行歌词&#10;第三行歌词"></textarea>
    <div class="mt-modal-footer">
      <button class="mt-modal-ok" id="mt-create-ok">创建</button>
      <button class="mt-modal-cancel" id="mt-create-cancel">取消</button>
    </div>
  </div>
</div>

<div class="mt-modal-overlay" id="mt-modal-txt">
  <div class="mt-modal-box">
    <div class="mt-modal-title">上传文本 · 粘贴歌词</div>
    <textarea class="mt-modal-ta" id="mt-txt-ta" placeholder="粘贴纯文本歌词，每行一句&#10;（不需要时间戳）"></textarea>
    <div class="mt-modal-footer">
      <button class="mt-modal-ok" id="mt-txt-ok">导入</button>
      <button class="mt-modal-cancel" id="mt-txt-cancel">取消</button>
    </div>
  </div>
</div>

<!-- 教程弹窗 -->
<div class="mt-tut-overlay" id="mt-tut">
  <div class="mt-tut-box">
    <button class="mt-tut-close" id="mt-tut-close">✕</button>
    <div class="mt-tut-icon" id="mt-tut-icon">🎵</div>
    <div class="mt-tut-step-label" id="mt-tut-step-label">步骤 1 / 4</div>
    <div class="mt-tut-title" id="mt-tut-title"></div>
    <div class="mt-tut-desc" id="mt-tut-desc"></div>
    <div class="mt-tut-items" id="mt-tut-items"></div>
    <div class="mt-tut-footer">
      <div class="mt-tut-dots" id="mt-tut-dots"></div>
      <div class="mt-tut-btns">
        <button class="mt-tut-nevershow" id="mt-tut-atlas" style="display:none;">📖 记号图鉴</button>
        <button class="mt-tut-nevershow" id="mt-tut-never">以后不再显示</button>
        <button class="mt-tut-skip" id="mt-tut-skip">跳过</button>
        <button class="mt-tut-next" id="mt-tut-next">下一步 →</button>
      </div>
    </div>
  </div>
</div>
`;

/* ── 路由 ── */
const hub      = $('mt-hub');
const toolview = $('mt-toolview');
const navName  = $('mt-nav-name');
const panels   = { lrc: $('mt-panel-lrc'), jf: $('mt-panel-jf') };

function $(id){ return document.getElementById(id); }

const jianpuHTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>简谱编辑器</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Noto+Serif+SC:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0e0e10;--panel:#18181c;--panel2:#222228;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.14);
  --ink:rgba(255,255,255,0.88);--ink2:rgba(255,255,255,0.44);--ink3:rgba(255,255,255,0.18);
  --accent:#7c6af7;--accent2:#a89af9;--red:#f27c6a;--green:#6af2a8;--sel:#f0c040;
  /* 歌词分行配色：第 1 行主色，第 2/3/4 行蓝/绿/紫区分（暗底用提亮版） */
  --ly2:#7FB0FF;--ly3:#52C994;--ly4:#C88FEC;
  color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:
  radial-gradient(circle at top right,rgba(124,106,247,0.12),transparent 28%),
  radial-gradient(circle at bottom left,rgba(240,192,64,0.08),transparent 26%),
  var(--bg);
color:var(--ink);font-family:'Space Mono',monospace;height:100vh;overflow:hidden;display:flex;flex-direction:column;}

.topbar{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-shrink:0;background:rgba(24,24,28,0.9);backdrop-filter:blur(12px);}
.strict-toggle{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--ink2);cursor:pointer;user-select:none;padding:5px 9px;border-radius:6px;border:1px solid var(--border2);background:var(--panel2);white-space:nowrap;}
.strict-toggle input{cursor:pointer;margin:0;}
.strict-toggle:has(input:checked){color:var(--accent);border-color:var(--accent);background:rgba(124,106,247,0.12);}
.strict-toggle:has(input:disabled){opacity:0.55;cursor:not-allowed;}
.strict-toggle:has(input:disabled) input{cursor:not-allowed;}
.dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);}
.topbar-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--ink2);}
.topbar-title span{color:var(--accent2);}
.topbar-tabs{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end;}
.top-tab{padding:6px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border:1px solid var(--border);border-radius:5px;background:transparent;color:var(--ink2);font-family:'Space Mono',monospace;transition:.12s;}
.top-tab.on{background:var(--accent);color:#fff;border-color:var(--accent);}

/* 左右布局：预览（top-area）在左，编辑区（mid-bar + bottom-area）在右；中间分隔条可拖动改比例 */
.work-wrap{flex:1;min-height:0;display:flex;flex-direction:row;overflow:hidden;}
.work-right{flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;}
.top-area{flex:0 0 auto;width:var(--split-x,55%);min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:14px 16px 10px;position:relative;}
.top-panel{flex:1;overflow-y:auto;overflow-x:hidden;padding:18px;border:1px solid var(--border);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));display:none;position:relative;box-shadow:0 18px 40px rgba(0,0,0,0.24);}
.top-panel.on{display:block;}

/* 左右对调：预览换到右边 */
.work-wrap.swap .top-area{order:3;}
.work-wrap.swap .split-x{order:2;}
.work-wrap.swap .work-right{order:1;}

/* 预览拖动把手：抓住它拖到另一侧即可换边 */
.preview-grip{position:absolute;top:10px;left:10px;z-index:5;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;font-size:10px;letter-spacing:1px;color:var(--ink2);background:var(--panel2);border:1px solid var(--border2);border-radius:8px;cursor:grab;touch-action:none;user-select:none;opacity:.6;transition:opacity .12s,color .12s,border-color .12s;}
.preview-grip:hover{opacity:1;color:var(--accent);border-color:var(--accent);}
.preview-grip:active{cursor:grabbing;opacity:1;}
.work-wrap.moving .top-area{outline:2px dashed var(--accent);outline-offset:-3px;}
.work-wrap.moving .top-panel{pointer-events:none;}
body.mt-moving,body.mt-moving *{user-select:none !important;cursor:grabbing !important;}

/* 竖向分隔条（预览 ↔ 编辑区），拖动改左右比例 */
.split-x{flex:0 0 12px;align-self:stretch;position:relative;cursor:col-resize;touch-action:none;background:transparent;z-index:3;}
.split-x::before{content:"";position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;border-radius:2px;background:var(--border2);transition:background .12s,width .12s;}
.split-x:hover::before,.split-x.on::before{background:var(--accent);width:3px;}

/* 编辑区竖排：段落编辑在上，音符键盘在下，中间分隔条拖动改高度 */
.bottom-area{flex:1;min-height:0;display:grid;grid-template-columns:1fr;grid-template-rows:var(--split-y,54%) 12px minmax(0,1fr);padding:10px 16px 16px;}

/* 横向分隔条（段落 ↔ 键盘） */
.split-y{position:relative;cursor:row-resize;touch-action:none;background:transparent;z-index:3;}
.split-y::before{content:"";position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:2px;border-radius:2px;background:var(--border2);transition:background .12s,height .12s;}
.split-y:hover::before,.split-y.on::before{background:var(--accent);height:3px;}

/* 拖动分隔条时禁止选中，避免误选文字 */
body.mt-resizing,body.mt-resizing *{user-select:none !important;}

/* ── 左：段落编辑 ── */
.seg-pane{min-width:0;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015));box-shadow:0 18px 40px rgba(0,0,0,0.2);}
.seg-pane-inner{padding:12px;flex:1;overflow-y:auto;}
.sec-block{border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;background:rgba(255,255,255,0.02);}
.sec-head{display:flex;align-items:center;gap:6px;padding:9px 12px;background:rgba(34,34,40,0.92);border-bottom:1px solid var(--border);}
.sec-name-input{background:transparent;border:none;color:var(--ink);font-family:'Space Mono',monospace;font-size:13px;font-weight:700;outline:none;flex:1;}
.sec-btn{font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--border2);background:transparent;color:var(--ink2);cursor:pointer;font-family:'Space Mono',monospace;}
.sec-btn:hover{background:var(--border);color:var(--ink);}
.sec-btn.del{color:var(--red);}
.row-block{border-bottom:1px solid var(--border);padding:8px 12px;}
.row-block:last-child{border-bottom:none;}
.row-meta{display:flex;align-items:center;gap:6px;margin-bottom:4px;}
.row-idx{font-size:8px;color:var(--ink3);}
.bold-toggle{display:flex;align-items:center;gap:3px;font-size:9px;color:var(--ink2);cursor:pointer;}
.bold-toggle input{accent-color:var(--accent);}
.row-del{margin-left:auto;background:none;border:none;color:var(--ink3);cursor:pointer;font-size:11px;}
.row-del:hover{color:var(--red);}

.seg-table{width:100%;border-collapse:collapse;}
.seg-table th{font-size:9px;color:var(--ink3);padding:2px 3px;text-align:left;letter-spacing:1px;border-bottom:1px solid var(--border);}
.seg-table td{padding:1px 2px;vertical-align:middle;}
.seg-table input{background:var(--panel2);border:1px solid var(--border);border-radius:3px;color:var(--ink);font-family:'Space Mono',monospace;font-size:12px;padding:3px 5px;outline:none;transition:border-color .12s;width:100%;}
.seg-table input:focus{border-color:var(--accent);}
.inp-chord{max-width:62px;}
.inp-lyric{max-width:80px;}
.btn-del-seg{background:none;border:none;color:var(--ink3);cursor:pointer;font-size:11px;}
.btn-del-seg:hover{color:var(--red);}
.btn-ins-sp{background:none;border:1px solid var(--border);border-radius:3px;color:var(--ink3);cursor:pointer;font-size:8px;font-family:'Space Mono',monospace;padding:1px 3px;line-height:1.4;flex:none;}
.btn-ins-sp:hover{color:var(--accent2);border-color:var(--accent2);}
.drag-handle{cursor:grab;color:var(--ink3);font-size:11px;padding:0 2px;user-select:none;}
.drag-handle:hover{color:var(--ink2);}
.seg-row{transition:opacity .15s;}
.seg-row.dragging{opacity:0.35;}
.seg-row.drag-over{border-left:2px solid var(--accent);}
.btn-add-seg{font-size:9px;color:var(--accent2);background:none;border:none;cursor:pointer;margin-top:4px;font-family:'Space Mono',monospace;}
.add-row-btn{width:100%;padding:5px;border-radius:5px;border:1px dashed rgba(106,242,168,0.3);background:transparent;font-family:'Space Mono',monospace;font-size:9px;color:var(--green);cursor:pointer;margin-top:5px;}
.add-row-btn:hover{background:rgba(106,242,168,0.06);border-color:var(--green);}
.add-sec-btn{width:calc(100% - 24px);padding:9px 10px;border-radius:10px;border:1px dashed var(--border2);background:rgba(255,255,255,0.01);font-family:'Space Mono',monospace;font-size:10px;color:var(--accent2);cursor:pointer;margin:0 12px 10px;display:block;}
.add-sec-btn:hover{border-color:var(--accent);background:rgba(124,106,247,0.08);}

/* ── 中间状态栏 ── */
.mid-bar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:9px 16px;background:rgba(34,34,40,0.92);border-top:1px solid var(--border);border-bottom:1px solid var(--border2);flex-shrink:0;backdrop-filter:blur(12px);}
.mid-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);font-size:10px;color:var(--ink3);line-height:1;}
.mid-pill strong{color:var(--ink);font-size:10px;font-weight:700;}
.mid-pill.accent strong{color:var(--accent2);}
.mid-pill.warn strong{color:var(--sel);}
.mid-pill.active{background:rgba(106,242,168,0.12);border-color:rgba(106,242,168,0.35);color:rgba(255,255,255,0.72);}
.mid-pill.active strong{color:var(--green);}
.mid-pill.featured{background:rgba(124,106,247,0.12);border-color:rgba(124,106,247,0.28);}
.mid-pill.featured strong{color:#d6cdfd;}
.mid-loc{font-size:10px;color:var(--ink2);}
.mid-sel{font-size:10px;color:var(--sel);}
.mid-tip{font-size:9px;color:var(--ink3);}

/* ── 右：键盘 ── */
.kbd-pane{min-width:0;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px;border:1px solid var(--border);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015));box-shadow:0 18px 40px rgba(0,0,0,0.2);}
.kbd-pane::-webkit-scrollbar,.seg-pane-inner::-webkit-scrollbar,.top-panel::-webkit-scrollbar{width:8px;height:8px;}
.kbd-pane::-webkit-scrollbar-thumb,.seg-pane-inner::-webkit-scrollbar-thumb,.top-panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:999px;}
.kbd-toolbar,.kbd-main,.kbd-actions,.kbd-hintline{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,0.025);}
.kbd-toolbar{display:grid;grid-template-columns:1.2fr 1.5fr .9fr;gap:10px;padding:10px;}
.kbd-main{display:grid;grid-template-columns:148px 1fr;gap:10px;padding:10px;}
.kbd-note-panel,.kbd-func-panel{min-width:0;}
.kbd-func-panel{display:flex;flex-direction:column;gap:10px;}
.kbd-group{padding-bottom:2px;}
.kbd-actions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;padding:10px;}
.kbd-hintline{display:flex;flex-wrap:wrap;gap:8px;padding:8px 10px;font-size:9px;color:var(--ink2);}
.kbd-hintline span{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,0.04);}
.kbd-hintline kbd{font-family:'Space Mono',monospace;font-size:9px;color:var(--ink);background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:5px;padding:2px 6px;}
.kbd-label{font-size:8px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink3);margin-bottom:4px;}
.kbd-row{display:flex;gap:4px;flex-wrap:wrap;}
.kbd-btn{font-family:'Space Mono',monospace;font-size:11px;padding:6px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink2);cursor:pointer;transition:all .1s;min-width:28px;text-align:center;line-height:1;}
.shortcut{font-size:7px;opacity:0.42;display:block;margin-top:2px;}
.numpad{display:grid;grid-template-columns:repeat(3,40px);gap:4px;}
.numpad .kbd-btn{font-size:15px;font-weight:700;padding:8px 0;width:40px;color:var(--ink);min-width:0;}
.kbd-btn.zero{font-size:13px;font-weight:700;color:var(--ink);width:100%;margin-top:4px;padding:8px 0;}
.kbd-func-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.dual-builder{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,0.025);padding:10px;display:flex;flex-direction:column;gap:8px;}
.dual-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink3);}
.dual-head strong{color:var(--ink2);font-weight:700;font-size:10px;letter-spacing:0;text-transform:none;}
.dual-row{display:flex;flex-direction:column;gap:5px;}
.dual-row-top{display:flex;align-items:center;gap:6px;}
.dual-row-tag{width:30px;font-size:9px;color:var(--ink3);font-family:'Space Mono',monospace;flex-shrink:0;}
.dual-inp{flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--ink);font-family:'Space Mono',monospace;font-size:12px;padding:6px 8px;outline:none;}
.dual-inp:focus{border-color:var(--accent);}
.dual-clear{padding:6px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink2);cursor:pointer;font-size:10px;font-family:'Space Mono',monospace;}
.dual-clear:hover{color:var(--ink);border-color:var(--accent2);}
.dual-picks{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;}
.dual-pick{padding:5px 0;border-radius:5px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink2);cursor:pointer;font-family:'Space Mono',monospace;font-size:10px;line-height:1;}
.dual-pick:hover{border-color:var(--accent);color:var(--ink);}
.dual-pick.wide{grid-column:span 2;}
.dual-tools{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding-top:2px;}
.dual-tool{padding:6px 9px;border-radius:6px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink2);cursor:pointer;font-family:'Space Mono',monospace;font-size:10px;line-height:1;}
.dual-tool.on{background:var(--accent);border-color:var(--accent);color:#fff;}
.dual-tool:hover{color:var(--ink);}
.dual-preview{font-size:10px;color:var(--ink2);font-family:'Space Mono',monospace;display:flex;align-items:center;gap:6px;}
.dual-preview code{font-size:12px;color:var(--ink);background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:3px 6px;}
.dual-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.dual-action{padding:8px;border-radius:6px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:.4px;}
.dual-action.main{background:var(--accent2);border-color:var(--accent2);color:#fff;}
.dual-action:hover{opacity:.9;}

/* ── 跨格子房子线（preview 层） ── */
.prev-volta{display:inline-flex;align-items:flex-end;position:relative;}
.prev-volta::before{content:'';position:absolute;top:calc(var(--volta-top,2px) - var(--volta-rail,0px));left:0;right:0;height:10px;border-top:1.5px solid var(--accent2);border-left:1.5px solid var(--accent2);pointer-events:none;box-sizing:border-box;}
.prev-volta.closed::before{border-right:1.5px solid var(--accent2);}
.prev-volta::after{content:attr(data-v);position:absolute;top:calc(var(--volta-top,2px) + 1px - var(--volta-rail,0px));left:3px;font-size:8px;color:var(--accent2);pointer-events:none;font-family:'Space Mono',monospace;}

/* 状态栏 */
/* ── 输入状态栏（总音符/八度/时值/附点/段落/房子线） ── */
.kbd-istate{display:flex;align-items:center;flex-wrap:wrap;gap:0;padding:4px 8px;background:var(--bg);border-radius:5px;border:1px solid var(--border);margin-bottom:5px;min-height:24px;font-family:'Space Mono',monospace;}
.kbd-istate-item{font-size:10px;color:var(--ink3);white-space:nowrap;padding:0 7px 0 0;}
.kbd-istate-item span{color:var(--ink2);}
.kbd-istate-item.hi span{color:var(--accent2);}

.kbd-status{display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--panel2);border-radius:5px;border:1px solid var(--border);margin-bottom:8px;min-height:28px;}
.kbd-status-loc{font-size:9px;color:var(--ink2);white-space:nowrap;}
.kbd-status-sel{font-size:9px;color:var(--sel);margin-left:4px;white-space:nowrap;}
.kbd-status-tip{font-size:8px;color:var(--ink3);margin-left:auto;}

/* ── 房子线（token 式，和连音线一样） ── */
.jp-volta{display:inline-flex;align-items:flex-end;position:relative;padding-top:0;}
.jp-volta::before{content:'';position:absolute;top:var(--jp-volta-top,3px);left:0;right:0;height:10px;border-top:1.5px solid var(--accent2);border-left:1.5px solid var(--accent2);pointer-events:none;box-sizing:border-box;}
.jp-volta.v-close::before{border-right:1.5px solid var(--accent2);}
.jp-volta::after{content:attr(data-v);position:absolute;top:calc(var(--jp-volta-top,3px) + 1px);left:3px;font-size:10px;line-height:1;color:var(--accent2);pointer-events:none;font-family:'Space Mono',monospace;}

.kbd-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:4px;}
/* 导航记号是独立一个 .kbd-group，靠 .kbd-func-grid 的两列网格自然落到右列
   （即「临时记号」正下方、「小节线·反复」右边）。不要再在格子里套第二层分栏。 */
.kbd-row{display:flex;gap:4px;flex-wrap:wrap;}
.kbd-btn{font-family:'Space Mono',monospace;font-size:12px;padding:7px 10px;border-radius:5px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink2);cursor:pointer;transition:all .1s;min-width:30px;text-align:center;line-height:1;}
.kbd-btn:hover{background:var(--panel);color:var(--ink);border-color:var(--accent);}
.kbd-btn.on{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 0 8px rgba(124,106,247,0.4);}
.kbd-btn.action{color:var(--red);border-color:rgba(242,124,106,0.25);}
.kbd-btn.action:hover{background:rgba(242,124,106,0.1);}
.kbd-btn.slur-btn{color:var(--green);border-color:rgba(106,242,168,0.25);}
.kbd-btn.slur-btn:hover{background:rgba(106,242,168,0.08);}
.kbd-btn.slur-btn.on{background:var(--green);color:#000;border-color:var(--green);}
.tie-span-control{display:inline-flex;align-items:stretch;gap:4px;flex-wrap:wrap;max-width:100%;}
.tie-span-picker{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--ink2);white-space:nowrap;}
.tie-span-input{width:48px;min-width:0;box-sizing:border-box;padding:6px 4px;border:1px solid var(--border2);border-radius:5px;background:var(--panel2);color:var(--ink);font:inherit;text-align:center;}
.tie-span-input:focus{outline:1px solid var(--accent);border-color:var(--accent);}
.tie-span-input:invalid{border-color:var(--red);}
.tie-span-hint{font-size:9px;color:var(--ink3);line-height:1.6;margin-top:5px;}
.shortcut{font-size:7px;opacity:0.4;display:block;margin-top:1px;}

/* 九宫格 */
.numpad{display:grid;grid-template-columns:repeat(3,44px);gap:4px;}
.numpad .kbd-btn{font-size:16px;font-weight:700;padding:9px 0;width:44px;color:var(--ink);min-width:0;}
.numpad .kbd-btn:hover{color:var(--accent2);}
.kbd-btn.zero{font-size:14px;font-weight:700;color:var(--ink);width:100%;margin-top:4px;}

/* ── token 格子 ── */
.tok-field{background:var(--panel2);border:1px solid var(--border);border-radius:3px;color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;padding:2px 4px;min-height:22px;display:flex;flex-wrap:wrap;gap:2px;align-items:center;cursor:pointer;width:100%;box-sizing:border-box;}
.tok-field.n-active{border-color:var(--accent);}
.tok-chip{padding:1px 4px;border-radius:2px;cursor:pointer;white-space:nowrap;user-select:none;}
.tok-chip:hover{background:var(--border2);}
/* 选中 = 黄色高亮 */
.tok-chip.sel{background:var(--sel);color:#000;}
/* 插入游标：在选中起点前显示绿竖线 */
.tok-chip.cursor{border-left:2px solid var(--green);}
.tok-chip.sel.cursor{border-left:2px solid #000;}
/* 末尾游标 */
.tok-end{color:var(--ink3);cursor:pointer;font-size:8px;padding:1px 3px;user-select:none;}
.tok-end.cursor{color:var(--green);}
.tok-dual-inline{display:none;align-items:center;gap:4px;margin-top:3px;}
.tok-dual-inline.on{display:flex;}
.tok-dual-inline .lbl{font-size:8px;color:var(--ink3);font-family:'Space Mono',monospace;white-space:nowrap;}
.tok-dual-inline .slash{font-size:10px;color:var(--ink3);}
.tok-dual-inline .in{width:36px;background:var(--panel2);border:1px solid var(--border);border-radius:4px;color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;padding:3px 4px;outline:none;}
.tok-dual-inline .in:focus{border-color:var(--accent);}
.tok-dual-inline .btn{padding:4px 6px;border-radius:4px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink2);font-family:'Space Mono',monospace;font-size:9px;cursor:pointer;line-height:1;}
.tok-dual-inline .btn:hover{border-color:var(--accent2);color:var(--ink);}
.tok-meta-inline{display:flex;align-items:center;gap:4px;margin-top:4px;flex-wrap:wrap;}
.tok-meta-inline .lbl{font-size:8px;color:var(--ink3);font-family:'Space Mono',monospace;white-space:nowrap;}
.tok-meta-inline .in{width:58px;background:var(--panel2);border:1px solid var(--border);border-radius:4px;color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;padding:3px 4px;outline:none;}
.tok-meta-inline .in:focus{border-color:var(--accent);}

/* ── 导入弹窗 ── */
.import-overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);align-items:center;justify-content:center;}
.import-overlay.open{display:flex;}
.import-box{background:var(--panel);border:1px solid var(--border2);border-radius:14px;padding:18px;width:520px;max-width:95vw;}
.import-box textarea{width:100%;height:180px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;padding:8px;resize:vertical;outline:none;line-height:1.6;}
.import-box textarea:focus{border-color:var(--accent);}
.import-btns{display:flex;gap:8px;margin-top:10px;}
.import-ok{flex:1;padding:8px;border-radius:6px;border:none;background:var(--accent);color:#fff;font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;}
.import-ok:hover{opacity:.85;}
.import-cancel{padding:8px 16px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--ink2);font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;}
.import-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:8px;}
.import-err{font-size:9px;color:var(--red);margin-top:6px;min-height:14px;}

.code-box{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:10px;color:var(--ink2);white-space:pre;overflow-x:auto;max-height:100%;line-height:1.8;}
.copy-btn{margin-top:8px;width:100%;padding:8px;border-radius:6px;border:1px solid var(--border2);background:var(--panel2);color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;}
.copy-btn:hover{background:var(--accent);border-color:var(--accent);}



/* 编辑器 A4 纸张背景 - 匹配帖子显示宽度 */
/* 帖子 sw-wrap+sw-lb = 各16px padding，共32px per side
   top-panel 已有 16px padding per side
   所以 previewWrap margin = 32-16 = 16px per side */
#top-preview{
  background-image:repeating-linear-gradient(
    to bottom,
    transparent 0px, transparent 35px,
    rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 36px
  );
}
#previewWrap{
  width:694px; /* 平板竖屏(768px)实测 sw-lb 宽度 */
  max-width:calc(100% - 2px);
  padding:12px 0;
  min-height:200px;
  border-left:1px solid rgba(255,255,255,0.15);
  border-right:1px solid rgba(255,255,255,0.15);
  position:relative;
}
#previewWrap::before{
  content:'帖子内容区';
  position:absolute;top:4px;right:4px;
  font-size:8px;letter-spacing:1px;
  color:rgba(255,255,255,0.2);
  pointer-events:none;
  font-family:monospace;
}

/* 预览 */
.prev-sec{margin-bottom:20px;}
.prev-sec-name{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.prev-sec-name::after{content:'';flex:1;height:1px;background:var(--border);}
.prev-row{--volta-rail:0px;--volta-top:2px;--row-note-height:0px;display:flex;flex-wrap:nowrap;align-items:flex-end;margin-bottom:10px;overflow-x:auto;padding-top:0;padding-bottom:2px;}
.prev-row.has-volta{--volta-rail:0px;}
.prev-row.has-volta .p-n{margin-top:var(--volta-rail)}
.prev-seg{display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:4px;flex-shrink:0;}
/* 严格对位（align:"strict"）预览：每音位一列、三层居中共轴，与 youth/musiclib 成品一致 */
.prev-seg.p-slot{align-items:center !important;font-size:16px;min-width:19.2px;margin:0 2px;}
/* CECP-CHORD-FIT：和弦零宽，完全不参与列宽（长和弦不再撑开数字间距）。
   前两个字对中(=老版位置)，第三个字起零宽悬挂向右延伸；字号一律不变。 */
.prev-seg.p-slot .p-chord{min-width:0;width:0;overflow:visible;white-space:pre;display:flex;flex-direction:row;justify-content:center;align-items:flex-end;font-size:16px;min-height:17px;}
.prev-seg.p-slot .p-chord > *{flex:0 0 auto;}
.prev-seg.p-slot .p-chord .p-chord-head{white-space:pre;}
.prev-seg.p-slot .p-chord .p-chord-tail{display:inline-block;width:0;min-width:0;overflow:visible;white-space:pre;}
.prev-seg.p-slot .p-chord.p-chord-mid .p-chord-tail{width:auto;}
.prev-seg.p-slot.cf-tight{margin-left:0;margin-right:0;min-width:14.4px;}
.prev-seg.p-slot:has(.jp-aug){margin-right:11px;}
.prev-seg.p-slot.cf-tight[data-bb]{margin-right:8px;}
/* 断梁 ! 的编辑器提示：虚线小竖杠，零宽不影响布局，仅 musictool 预览可见 */
.prev-seg.p-slot .p-n{position:relative;}
.mt-bb-mark{position:absolute;right:-4px;top:0;bottom:2px;width:0;border-left:2px dashed var(--accent2);opacity:.55;pointer-events:none;}
.prev-seg.p-slot .p-chord.p-chord-multi{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px;line-height:1.1;}
.prev-seg.p-slot .p-chord-multi .p-chord-stk{display:block;line-height:1.2;}
/* 叠和弦(上下两个)跟单和弦一样大 */
.prev-seg.p-slot .p-chord-multi .chord-chip{font-size:1em;}
.prev-seg.p-slot .p-lyric{min-height:var(--row-lyric-height,0px);text-align:center;padding:0 1px;}
.prev-seg.p-slot .p-lyric .p-punct{display:inline-block;width:0;overflow:visible;white-space:pre;pointer-events:none;}
.prev-seg.p-slot.p-punct-gap{margin-right:8px;}
.prev-seg.p-barslot{min-width:0;margin:0 3px;}
.strict-label-row{display:block;margin:0 0 2px;line-height:1;}
.p-chord{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:var(--accent2);margin-bottom:2px;min-height:13px;white-space:nowrap;}
.p-chord.empty{visibility:hidden;}
.p-n{font-family:'Space Mono',monospace;color:var(--ink);margin-bottom:1px;line-height:1.2;display:flex;align-items:flex-end;min-height:var(--row-note-height);}
.p-lyric{min-height:var(--row-lyric-height,0px);font-family:'Noto Serif SC',serif;font-size:18px;font-weight:600;color:var(--ink);}
/* 加粗＝真的更重一档。字体常只有 400/700，700→800 可能毫无变化，再叠一层极细横向 text-shadow 兜底。 */
.p-lyric.bold{font-weight:800;text-shadow:.32px 0 0 currentColor,-.32px 0 0 currentColor;}
.p-lyric2{margin-top:1px;color:var(--ly2);}.p-lyric3{margin-top:1px;color:var(--ly3);}.p-lyric4{margin-top:1px;color:var(--ly4);}

/* 音符结构 */
.jp-wrap{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;min-width:1em;}
.jp-plain{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;min-width:1em;}
.jp-plain-top{height:12px;}.jp-plain-sym{font-size:15px;line-height:1;text-align:center;display:inline-flex;align-items:center;justify-content:center;width:1em;height:1em;}.jp-plain-sym.is-dash{position:relative;top:-0.12em;}.jp-plain-bot{height:16px;}
.jp-dot-top,.jp-dot-bot{width:1em;font-size:15px;line-height:.32;color:var(--ink);text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px;position:relative;}
.jp-dot-top{height:8px;justify-content:flex-end;top:-2px;}.jp-dot-bot{height:8px;justify-content:flex-start;}
/* 八度点画成 CSS 实心圆：比字形的 · 更粗更清楚，尺寸与水平对中都不受字体影响 */
.jp-dot-top>span,.jp-dot-bot>span{display:block;width:4px;height:4px;border-radius:50%;background:currentColor;font-size:0;line-height:0;flex:0 0 auto;}
/* 低音点贴近数字；有减时线(8分/16分)时改为贴近下划线。只用 top 位移，盒高恒定 → 不影响整体排版 */
.jp-wrap .jp-dot-bot{top:-10.5px;}
.jp-wrap:has(.jp-u1-line) .jp-dot-bot{top:-1px;}
.jp-wrap:has(.jp-u2-line) .jp-dot-bot{top:2px;}
.jp-lines-wrap{width:1em;display:inline-flex;flex-direction:column;align-items:stretch;padding-bottom:4px;position:relative;}
.jp-num-row{width:1em;display:inline-flex;align-items:center;justify-content:center;position:relative;padding-bottom:3px;}
.jp-num{font-size:19px;line-height:1;display:inline-flex;align-items:center;justify-content:center;text-align:center;width:1em;height:1em;position:relative;top:-0.12em;}
/* 附点/延音点：同款实心圆；上下对准数字墨迹中心，左右保持原来的间距 */
.jp-aug{position:absolute;right:-5px;top:50%;transform:translateY(-50%) translateY(0.5px);width:4px;height:4px;border-radius:50%;background:currentColor;font-size:0;line-height:0;pointer-events:none;}
.jp-u1-line{display:block;position:absolute;left:0;right:0;bottom:3px;height:1.5px;background:var(--ink);pointer-events:none;z-index:1;}
.jp-u2-line{display:block;position:absolute;left:0;right:0;bottom:0;height:1.5px;background:var(--ink);pointer-events:none;z-index:1;}
.jp-slur{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px);}
.jp-slur::before{content:'';position:absolute;top:var(--jp-nav-arc-top,2px);left:15%;right:15%;height:8px;border-top:1.5px solid var(--ink);border-left:1.5px solid var(--ink);border-right:1.5px solid var(--ink);border-radius:50% 50% 0 0/100% 100% 0 0;}
.jp-slur-open{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px);}
.jp-slur-open::before{content:'';position:absolute;top:var(--jp-nav-arc-top,2px);left:15%;right:-4px;height:8px;border-top:1.5px solid var(--ink);border-left:1.5px solid var(--ink);border-radius:50% 0 0 0/100% 0 0 0;}
.jp-slur-close{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px);}
.jp-slur-close::before{content:'';position:absolute;top:var(--jp-nav-arc-top,2px);left:-4px;right:15%;height:8px;border-top:1.5px solid var(--ink);border-right:1.5px solid var(--ink);border-radius:0 50% 0 0/0 100% 0 0;}
/* ── 双连音线（~ token：连接左右相邻两音，可与连音组共享音符） ── */
.jp-tie{display:inline-flex;width:0;height:0;position:relative;overflow:visible;pointer-events:none;}
.jp-tie::before{content:'';position:absolute;left:var(--tie-l,-0.75em);top:var(--tie-t,-34px);width:var(--tie-w,1.5em);height:8px;border-top:1.5px solid var(--ink);border-left:1.5px solid var(--ink);border-right:1.5px solid var(--ink);border-radius:50% 50% 0 0/100% 100% 0 0;}
.jp-tuplet{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px);margin-right:1px;}
.jp-tuplet-br{position:absolute;top:2px;left:2px;right:2px;height:8px;border-top:1.5px solid var(--ink);border-left:1.5px solid var(--ink);border-right:1.5px solid var(--ink);border-radius:3px 3px 0 0;pointer-events:none;}
.jp-tuplet-num{position:absolute;top:-1px;left:50%;transform:translateX(-50%);font-size:8px;line-height:1;padding:0 3px;background:var(--bg);color:var(--ink);pointer-events:none;}

/* ── 小节线 ── */
.jp-bar{display:inline-flex;flex-direction:column;align-items:flex-start;vertical-align:bottom;}
.jp-bar-top{height:12px;}.jp-bar-bot{height:16px;}
.jp-bar-mid{display:inline-flex;align-items:stretch;height:26px;}
.jb-thin{width:1.5px;background:currentColor;flex-shrink:0;}
.jb-thick{width:3.5px;background:currentColor;flex-shrink:0;}
.jb-dots{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:6px;flex-shrink:0;}
.jb-dot{width:3px;height:3px;border-radius:50%;background:currentColor;}
.jp-timesig{display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-end;vertical-align:bottom;flex-shrink:0;min-width:1.42em;margin:0 5px 0 2px;position:relative;top:-1px;line-height:1;}
.jp-timesig-pad{display:block;width:100%;flex-shrink:0;}
.jp-timesig-pad-top{height:2px;}
.jp-timesig-pad-bot{height:3px;}
.jp-timesig-stack{display:inline-flex;flex-direction:column;align-items:stretch;justify-content:center;min-width:1.42em;line-height:1;}
.jp-timesig-top,.jp-timesig-bot{display:flex;align-items:center;justify-content:center;min-width:1.42em;text-align:center;font-size:18px;font-weight:700;line-height:1;}
.jp-timesig-top{padding:0 1px 2px;border-bottom:1.6px solid currentColor;margin-bottom:1px;}
.jp-timesig-bot{padding-top:0;}

/* ── 延长号 ── */
.jp-fermata{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;position:relative;padding-top:18px;}
.jp-fermata::before{content:'';position:absolute;top:2px;left:50%;transform:translateX(-50%);width:14px;height:7px;border-top:2px solid currentColor;border-left:2px solid currentColor;border-right:2px solid currentColor;border-radius:7px 7px 0 0/7px 7px 0 0;pointer-events:none;box-sizing:border-box;}
.jp-fermata::after{content:'';position:absolute;top:9px;left:50%;transform:translateX(-50%);width:3.5px;height:3.5px;border-radius:50%;background:currentColor;pointer-events:none;}
.jp-dual{display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-end;vertical-align:bottom;line-height:1;margin:0 .04em;}
.jp-dual-top,.jp-dual-bot{display:inline-flex;align-items:flex-end;}
.jp-dual-top{margin-bottom:-5px;}
.jp-dual-top .jp-dot-bot{height:2px;}
.jp-dual-bot .jp-dot-top{height:2px;}
.jp-dual .jp-dual-top .jp-dot-bot,.jp-dual .jp-dual-bot .jp-dot-top{top:0;}

/* ── 批量填歌词 modal ── */
.lyfill-overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);align-items:center;justify-content:center;}
.lyfill-overlay.open{display:flex;}
.lyfill-box{background:var(--panel);border:1px solid var(--border2);border-radius:14px;padding:18px;width:480px;max-width:95vw;}
.lyfill-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:6px;}
.lyfill-hint{font-size:9px;color:var(--ink2);margin-bottom:10px;line-height:1.6;}
.lyfill-ta{width:100%;height:110px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--ink);font-family:'Space Mono',monospace;font-size:12px;padding:8px;resize:vertical;outline:none;line-height:1.6;}
.lyfill-ta:focus{border-color:var(--accent);}
.lyfill-scope{display:flex;gap:10px;margin:8px 0 6px;}
.lyfill-scope label{display:flex;align-items:center;gap:4px;font-size:9px;color:var(--ink2);cursor:pointer;font-family:'Space Mono',monospace;}
.lyfill-stats{font-size:9px;min-height:14px;margin-top:4px;}
.lyfill-stats.warn{color:#f0c040;}.lyfill-stats.ok{color:var(--green);}
.lyfill-btns{display:flex;gap:8px;margin-top:10px;}
.lyfill-ok{flex:1;padding:8px;border-radius:6px;border:none;background:var(--accent);color:#fff;font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;}
.lyfill-ok:hover{opacity:.85;}
.lyfill-cancel{padding:8px 16px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--ink2);font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;}
.tool-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;height:100%;}
.tool-card{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,0.025);padding:12px;min-height:0;overflow:auto;}
.tool-title{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:8px;font-family:'Space Mono',monospace;}
.tool-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;}
.tool-row input,.tool-row select{background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--ink);font-family:'Space Mono',monospace;font-size:11px;padding:6px 8px;outline:none;}
.tool-row input:focus,.tool-row select:focus{border-color:var(--accent);}
.tool-btn{padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:rgba(255,255,255,0.035);color:var(--ink);font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;}
.tool-btn:hover{border-color:var(--accent);color:#fff;}
.tool-btn.main{background:var(--accent);border-color:var(--accent);color:#fff;}
.tool-output{font-family:'Space Mono',monospace;font-size:10px;line-height:1.7;color:var(--ink2);white-space:pre-wrap;}
.tool-issue{padding:6px 8px;border-radius:7px;margin-bottom:5px;border:1px solid var(--border);background:rgba(255,255,255,0.025);}
.tool-issue.warn{border-color:rgba(240,192,64,.35);color:#f0c040;}
.tool-issue.ok{border-color:rgba(106,242,168,.25);color:var(--green);}
.tool-issue.bad{border-color:rgba(242,124,106,.35);color:var(--red);}
.tool-preview-box{border:1px solid var(--border);border-radius:9px;background:rgba(0,0,0,.16);padding:10px;max-height:260px;overflow:auto;}
.inp-chord.warn{border-color:rgba(240,192,64,.8)!important;box-shadow:0 0 0 1px rgba(240,192,64,.15);}

/* ── 检查状态 modal ── */
.check-overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);align-items:center;justify-content:center;}
.check-overlay.open{display:flex;}
.check-box{background:var(--panel);border:1px solid var(--border2);border-radius:14px;padding:18px;width:420px;max-width:95vw;max-height:80vh;overflow-y:auto;}
.check-title{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:12px;}
.check-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.check-row:last-child{border-bottom:none;}
.check-sec-name{font-size:10px;color:var(--ink2);flex:1;font-family:'Space Mono',monospace;}
.check-nums{font-size:10px;font-family:'Space Mono',monospace;}
.check-ok{color:var(--green);}.check-warn{color:#f0c040;}
.check-total{margin-top:10px;padding-top:10px;border-top:1px solid var(--border2);font-size:10px;font-family:'Space Mono',monospace;color:var(--ink);}

/* ── 编辑体验增强（搜索 / 移动 / 定位） ── */
:root{--flash-bg:rgba(124,106,247,0.32);}
.seg-search{display:flex;align-items:center;gap:6px;padding:10px 12px 0;flex-shrink:0;}
.seg-search input{flex:1;min-width:0;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--ink);font-family:'Space Mono',monospace;font-size:11px;padding:6px 8px;outline:none;}
.seg-search input:focus{border-color:var(--accent);}
.seg-search-count{font-size:9px;color:var(--ink3);font-family:'Space Mono',monospace;white-space:nowrap;min-width:30px;text-align:center;}
.sec-btn:disabled{opacity:.3;cursor:default;pointer-events:none;}
.seg-vcol{display:inline-flex;flex-direction:column;opacity:0;transition:opacity .12s;}
.seg-row:hover .seg-vcol,.seg-vcol:focus-within{opacity:1;}
.btn-seg-vert{background:none;border:none;color:var(--ink3);cursor:pointer;font-size:7px;line-height:1.3;padding:1px 2px;font-family:'Space Mono',monospace;}
.btn-seg-vert:hover{color:var(--accent2);}
.btn-seg-vert:disabled{opacity:.25;cursor:default;pointer-events:none;}
.seg-del-wrap{display:flex;align-items:center;gap:2px;justify-content:flex-end;}
.row-block.row-empty{background:rgba(240,192,64,0.05);}
.row-empty-tag{font-size:8px;color:var(--sel);border:1px dashed rgba(240,192,64,0.5);border-radius:4px;padding:0 4px;line-height:1.5;}
@keyframes segFlashKF{0%{background-color:var(--flash-bg);}100%{background-color:rgba(124,106,247,0);}}
.seg-flash{animation:segFlashKF 1.2s ease-out;}
.seg-hit{background:rgba(240,192,64,0.10);}
.seg-hit-cur{background:rgba(240,192,64,0.26);outline:1px solid rgba(240,192,64,0.55);}
.seg-row-sel{background:rgba(240,192,64,0.16);}
#previewWrap .prev-seg{cursor:pointer;border-radius:4px;}
#previewWrap .prev-seg:hover{background:rgba(124,106,247,0.10);box-shadow:0 0 0 1px rgba(124,106,247,0.38);}
#previewWrap .sec-label{cursor:grab;touch-action:none;}
#previewWrap .sec-label:active{cursor:grabbing;}
/* 和弦/歌词输入框：聚焦时原地浮起放大，方便编辑长内容 */
.seg-table .inp-chord:focus,.seg-table .inp-lyric:focus{
  position:absolute;top:-2px;z-index:40;
  max-width:none;width:230px;
  font-size:13px!important;opacity:1!important;
  padding:5px 7px;
  background:var(--panel);
  border-color:var(--accent);
  box-shadow:0 6px 18px rgba(0,0,0,0.45),0 0 0 1px var(--accent);
}
.seg-table .inp-chord:focus{left:0;}
.seg-table .inp-lyric:focus{right:0;}
/* 输入框浮起时，{sp} 按钮挪到浮层旁边并压在浮层之上，保持可点 */
.seg-table .inp-chord:focus + .btn-ins-sp,
.seg-table .inp-lyric:focus + .btn-ins-sp{
  position:absolute;top:4px;z-index:41;
  background:var(--panel);color:var(--accent2);border-color:var(--accent2);
}
.seg-table .inp-chord:focus + .btn-ins-sp{left:234px;}
.seg-table .inp-lyric:focus + .btn-ins-sp{right:-26px;}

@media (prefers-color-scheme: light){
  :root{
    --bg:#f3f6fc;--panel:#ffffff;--panel2:#ebf0fa;
    --border:rgba(17,24,39,0.10);--border2:rgba(17,24,39,0.18);
    --ink:rgba(17,24,39,0.92);--ink2:rgba(17,24,39,0.64);--ink3:rgba(17,24,39,0.40);
    --accent:#4a6cff;--accent2:#6d7dff;--red:#d95f5f;--green:#1f9f6c;--sel:#c08a10;
    /* 亮底：三种都要够深 */
    --ly2:#123C8F;--ly3:#0E4F33;--ly4:#5C2178;
    color-scheme:light;
  }
  body{
    background:
      radial-gradient(circle at top right,rgba(74,108,255,0.14),transparent 28%),
      radial-gradient(circle at bottom left,rgba(208,158,50,0.12),transparent 26%),
      var(--bg);
  }
  .topbar{background:rgba(255,255,255,0.9);}
  .top-panel,.seg-pane,.kbd-pane{
    background:linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.94));
    box-shadow:0 18px 36px rgba(15,23,42,0.10);
  }
  .sec-head,.mid-bar{background:rgba(236,242,252,0.92);}
  .mid-pill{background:rgba(17,24,39,0.04);border-color:rgba(17,24,39,0.08);}
  .mid-pill.active{background:rgba(31,159,108,0.14);border-color:rgba(31,159,108,0.35);color:rgba(18,23,36,0.72);}
  .mid-pill.featured{background:rgba(92,109,255,0.14);border-color:rgba(92,109,255,0.28);}
  .mid-pill.featured strong{color:#3a4bdd;}
  .kbd-pane::-webkit-scrollbar-thumb,.seg-pane-inner::-webkit-scrollbar-thumb,.top-panel::-webkit-scrollbar-thumb{background:rgba(17,24,39,0.16);}
  .kbd-toolbar,.kbd-main,.kbd-actions,.kbd-hintline,.dual-builder{background:rgba(255,255,255,0.82);}
  .kbd-hintline span{background:rgba(17,24,39,0.04);}
  .kbd-hintline kbd{background:rgba(17,24,39,0.08);border-color:rgba(17,24,39,0.18);}
  .kbd-btn.on{box-shadow:0 0 8px rgba(74,108,255,0.35);}
  #top-preview{
    background-image:repeating-linear-gradient(
      to bottom,
      transparent 0px, transparent 35px,
      rgba(17,24,39,0.06) 35px, rgba(17,24,39,0.06) 36px
    );
  }
  #previewWrap{
    border-left:1px solid rgba(17,24,39,0.16);
    border-right:1px solid rgba(17,24,39,0.16);
  }
  #previewWrap::before{color:rgba(17,24,39,0.30);}
  :root{--flash-bg:rgba(74,108,255,0.24);}
  .seg-hit{background:rgba(192,138,16,0.12);}
  .seg-hit-cur{background:rgba(192,138,16,0.28);outline-color:rgba(192,138,16,0.55);}
  .seg-row-sel{background:rgba(192,138,16,0.18);}
  #previewWrap .prev-seg:hover{background:rgba(74,108,255,0.10);box-shadow:0 0 0 1px rgba(74,108,255,0.35);}
  .row-block.row-empty{background:rgba(192,138,16,0.06);}
  .seg-table .inp-chord:focus,.seg-table .inp-lyric:focus{
    box-shadow:0 6px 18px rgba(15,23,42,0.20),0 0 0 1px var(--accent);
  }
}

@media (max-width: 1100px){
  .work-wrap{flex-direction:column;}
  .top-area{flex:1 1 42%;width:auto;min-width:0;min-height:280px;}
  .work-right{flex:1 1 58%;}
  .split-x,.split-y,.preview-grip{display:none;}
  .work-wrap.swap .top-area,.work-wrap.swap .work-right{order:0;}
  .bottom-area{grid-template-columns:1fr;grid-template-rows:minmax(320px,1fr) minmax(320px,1fr);}
  .kbd-toolbar{grid-template-columns:1fr;}
  .tool-grid{grid-template-columns:1fr;}
  .kbd-main{grid-template-columns:1fr;}
  .kbd-actions{grid-template-columns:repeat(3,minmax(0,1fr));}
  .kbd-func-grid{grid-template-columns:1fr;}
  .dual-picks{grid-template-columns:repeat(6,minmax(0,1fr));}
}

@media (max-width: 760px){
  .topbar{align-items:flex-start;flex-direction:column;}
  .topbar-tabs{margin-left:0;justify-content:flex-start;}
  .top-area{padding:12px 12px 8px;}
  .bottom-area{padding:0 12px 12px;gap:12px;}
  .top-panel,.seg-pane,.kbd-pane{border-radius:14px;}
  .mid-bar{padding:10px 12px;}
  .kbd-actions{grid-template-columns:repeat(2,minmax(0,1fr));}
  .dual-actions{grid-template-columns:1fr;}
}
</style>
</head>
<body>

<div class="topbar">
  <div class="dot"></div>
  <div class="topbar-title">简谱编辑器 <span>v3.1</span></div>
  <div class="topbar-tabs">
    <button class="top-tab" data-action="import" type="button">导入</button>
    <button class="top-tab" data-action="bulk-lyric" type="button" title="批量填歌词">⌨ 填歌词</button>
    <button class="top-tab" data-action="check" type="button" title="检查音符与歌词数量">⚑ 检查</button>
    <button class="top-tab on" data-action="justify" type="button" title="预览行两端对齐（只影响预览排版，不改数据）">⇔ 对齐</button>
    <button class="top-tab" id="btnSwapSides" type="button" title="左右对调：预览与编辑区互换左右">⇆ 对调</button>
    <button class="top-tab on" data-top-tab="preview" type="button">预览</button>
    <button class="top-tab" data-top-tab="tools" type="button">工具</button>
    <button class="top-tab" data-top-tab="code" type="button">代码</button>
  </div>
  <label id="strictToggleWrap" class="strict-toggle" title="严格对位：和弦/歌词按音位对齐、@占空位（规则建歌时定死，有音符后锁定，改模式请新建/重做）"><input type="checkbox" id="strictToggle" checked onchange="onStrictToggle(this)"> 严格对位</label>
  <button id="strictFillBtn" class="strict-toggle" type="button" onclick="strictAutoFillClick()" title="按音位数把每格和弦/歌词尾部不足的位自动补 @（内部跳过仍需手打 @）" style="display:none;cursor:pointer;">补 @ 对齐</button>
</div>

<div class="import-overlay" id="importOverlay">
  <div class="import-box">
    <div class="import-label">粘贴 简谱数组代码（[ ... ] 或 var SECTIONS = [...]）</div>
    <textarea id="importTA" placeholder="sections: [&#10;  { name: '主歌', lines: [ ... ] },&#10;],"></textarea>
    <div class="import-err" id="importErr"></div>
    <div class="import-btns">
      <button class="import-ok" onclick="doImport()">导入</button>
      <button class="import-cancel" onclick="closeImport()">取消</button>
    </div>
  </div>
</div>

<div class="work-wrap">
<div class="top-area">
  <div class="preview-grip" id="previewGrip" title="拖动把预览移到另一侧">⠿ 换边</div>
  <div class="top-panel on" id="top-preview"><div id="previewWrap"></div></div>
  <div class="top-panel" id="top-code">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">ID（文件名）
        <input id="meta-id" placeholder="zmzq-shunfu" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">歌名
        <input id="meta-title" placeholder="顺服" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">艺人
        <input id="meta-artist" placeholder="赞美之泉" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">副标题 / 词曲
        <input id="meta-sub" placeholder="余盈盈 词曲" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">原调
        <input id="meta-key" placeholder="A" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">拍号
        <input id="meta-timesign" placeholder="4/4" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">BPM
        <input id="meta-bpm" placeholder="72" type="number" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="grid-column:1/-1;font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">YouTube 链接
        <input id="meta-youtube" placeholder="https://youtu.be/..." style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="grid-column:1/-1;font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">MP3 <span style="color:var(--ink3);font-weight:normal;">（可填 URL 或文件名）</span>
        <input id="meta-mp3" placeholder="https://... 或 song.mp3" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="grid-column:1/-1;font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">封面图 cover <span style="color:var(--ink3);font-weight:normal;">（默认 https://cecpadua.github.io/resouces/covers/）</span>
        <input id="meta-cover" placeholder="song.jpg 或完整 URL" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="grid-column:1/-1;font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">歌词文件 lrc <span style="color:var(--ink3);font-weight:normal;">（默认 https://cecpadua.github.io/resouces/lyrics/）</span>
        <input id="meta-lrc" placeholder="song.lrc 或完整 URL" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
      <label style="grid-column:1/-1;font-size:9px;color:var(--ink2);font-family:'Space Mono',monospace;letter-spacing:1px;">乐谱图 scoreImg <span style="color:var(--ink3);font-weight:normal;">（默认 https://cecpadua.github.io/resouces/scoreIMG/）</span>
        <input id="meta-scoreimg" placeholder="songC.jpg 或完整 URL" style="width:100%;margin-top:3px;padding:5px 7px;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--ink);font-size:11px;font-family:'Space Mono',monospace;">
      </label>
    </div>
    <div class="code-box" id="codeBox"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
      <button class="copy-btn" onclick="copyCode()" style="margin-top:0;">复制 sections 数组</button>
      <button class="copy-btn" onclick="copyFullJson()" style="margin-top:0;background:var(--accent);border-color:var(--accent);color:#fff;">复制完整 JSON 文件</button>
    </div>
  </div>
  <div class="top-panel" id="top-tools">
    <div class="tool-grid">
      <div class="tool-card">
        <div class="tool-title">检查与整理</div>
        <div class="tool-row">
          <button class="tool-btn main" data-tool-action="check" type="button">重新检查</button>
          <button class="tool-btn" data-tool-action="format" type="button">整理格式</button>
          <button class="tool-btn" data-tool-action="play-line" type="button">播放当前行</button>
          <button class="tool-btn" data-tool-action="play-song" type="button">播放整首</button>
          <button class="tool-btn" data-tool-action="stop" type="button">停止</button>
        </div>
        <div id="toolCheckOut" class="tool-output"></div>
      </div>
      <div class="tool-card">
        <div class="tool-title">试移调</div>
        <div class="tool-row">
          <span style="font-size:10px;color:var(--ink3);">原调</span>
          <input id="tool-from-key" value="C" style="width:58px;">
          <span style="font-size:10px;color:var(--ink3);">目标</span>
          <input id="tool-to-key" value="D" style="width:58px;">
          <button class="tool-btn main" data-tool-action="transpose" type="button">预览</button>
        </div>
        <div id="toolTransposeOut" class="tool-output tool-preview-box"></div>
      </div>
    </div>
  </div>
</div>

<div class="split-x" id="splitX" title="拖动调整预览 / 编辑区宽度"></div>
<div class="work-right">
<!-- ── 中间状态 + 位置栏 ── -->
<div class="mid-bar">
  <span class="mid-pill accent"><strong id="statusLoc">点击左边格子开始编辑</strong></span>
  <span class="mid-pill">音符 <strong id="is-total">0</strong></span>
  <span class="mid-pill">八度 <strong id="is-oct">中</strong></span>
  <span class="mid-pill">时值 <strong id="is-dur">4分</strong></span>
  <span class="mid-pill" id="is-dot-pill">附点 <strong id="is-dot">关</strong></span>
  <span class="mid-pill" id="is-fermata-pill">延长号 <strong id="is-fermata">关</strong></span>
  <span class="mid-pill accent">房子线 <strong id="is-volta">无</strong></span>
  <span class="mid-pill warn">选区 <strong id="is-select">0</strong></span>
  <span class="mid-pill">剪贴板 <strong id="is-clip">空</strong></span>
  <span class="mid-sel" id="statusSel"></span>
  <span class="mid-tip" id="statusTip"></span>
</div>

<div class="bottom-area">
  <div class="seg-pane">
    <datalist id="secLabelPresets">
      <option value="Intro"></option>
      <option value="Verse"></option>
      <option value="Pre-Chorus"></option>
      <option value="Chorus"></option>
      <option value="Bridge"></option>
      <option value="Outro"></option>
      <option value="To Chorus"></option>
    </datalist>
    <div class="seg-search">
      <input id="segSearchInput" placeholder="搜索歌词 / 和弦 / 简谱 / 段落名… (⌘F)" autocomplete="off">
      <span class="seg-search-count" id="segSearchCount"></span>
      <button class="sec-btn" onclick="segSearchPrev()" title="上一个 (Shift+Enter)" type="button">↑</button>
      <button class="sec-btn" onclick="segSearchNext()" title="下一个 (Enter)" type="button">↓</button>
    </div>
    <div class="seg-pane-inner" id="sectionsWrap"></div>
    <button class="add-sec-btn" onclick="addSection()">+ 新增段落</button>
    <button class="add-sec-btn" onclick="openBulkLyric()" style="color:var(--accent2);border-color:rgba(124,106,247,0.3);">⌨ 批量填歌词</button>
  </div>

  <div class="split-y" id="splitY" title="拖动调整段落 / 键盘高度"></div>

  <div class="kbd-pane">
    <div class="kbd-toolbar">
      <div>
        <div>
          <div class="kbd-label">八度 <span style="color:var(--ink3);font-size:7px;">↑ ↓</span></div>
          <div class="kbd-row">
            <button class="kbd-btn" id="oct-low2" onclick="setOct('low2')" style="padding:7px 8px;min-width:34px;font-size:11px;">低2</button>
            <button class="kbd-btn" id="oct-low1" onclick="setOct('low1')" style="padding:7px 8px;min-width:34px;font-size:11px;">低1</button>
            <button class="kbd-btn on" id="oct-mid"  onclick="setOct('mid')"  style="padding:7px 8px;min-width:34px;font-size:11px;">中</button>
            <button class="kbd-btn" id="oct-high1" onclick="setOct('high1')" style="padding:7px 8px;min-width:34px;font-size:11px;">高1</button>
            <button class="kbd-btn" id="oct-high2" onclick="setOct('high2')" style="padding:7px 8px;min-width:34px;font-size:11px;">高2</button>
          </div>
        </div>
      </div>
      <div>
        <div class="kbd-label">音值 <span style="color:var(--ink3);font-size:7px;">Q W E R T</span></div>
        <div class="kbd-row">
          <button class="kbd-btn" id="dur-whole" onclick="setDur('whole')" style="padding:8px 10px;min-width:42px;font-size:11px;">全<span class="shortcut">Q</span></button>
          <button class="kbd-btn" id="dur-half" onclick="setDur('half')" style="padding:8px 10px;min-width:42px;font-size:11px;">½<span class="shortcut">W</span></button>
          <button class="kbd-btn on" id="dur-quarter" onclick="setDur('quarter')" style="padding:8px 10px;min-width:42px;font-size:11px;">¼<span class="shortcut">E</span></button>
          <button class="kbd-btn" id="dur-eighth" onclick="setDur('eighth')" style="padding:8px 10px;min-width:42px;font-size:11px;">⅛<span class="shortcut">R</span></button>
          <button class="kbd-btn" id="dur-16th" onclick="setDur('16th')" style="padding:8px 10px;min-width:42px;font-size:11px;">¹⁄₁₆<span class="shortcut">T</span></button>
        </div>
      </div>
      <div>
          <div class="kbd-label">输入模式 <span style="color:var(--ink3);font-size:7px;">I / O</span></div>
          <div class="kbd-row">
            <button class="kbd-btn on" id="mode-insert" onclick="setInputMode('insert')" style="padding:7px 10px;font-size:10px;">插入 I</button>
            <button class="kbd-btn" id="mode-overwrite" onclick="setInputMode('overwrite')" style="padding:7px 10px;font-size:10px;">覆盖 O</button>
          </div>
        </div>
    </div>

    <div class="kbd-main">
      <div class="kbd-note-panel">
        <div class="kbd-label">音符</div>
        <div class="numpad">
          <button class="kbd-btn" onclick="inputNote(1)">1</button>
          <button class="kbd-btn" onclick="inputNote(2)">2</button>
          <button class="kbd-btn" onclick="inputNote(3)">3</button>
          <button class="kbd-btn" onclick="inputNote(4)">4</button>
          <button class="kbd-btn" onclick="inputNote(5)">5</button>
          <button class="kbd-btn" onclick="inputNote(6)">6</button>
          <button class="kbd-btn" onclick="inputNote(7)" style="grid-column:span 3;max-width:44px;">7</button>
        </div>
        <button class="kbd-btn zero" onclick="inputNote(0)">0 休止</button>
      </div>

      <div class="kbd-func-panel">
        <div class="kbd-func-grid">
          <div class="kbd-group">
            <div class="kbd-label">基础符号</div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="inputSpecial('-')" style="padding:6px 8px;">— 延音<span class="shortcut">\\</span></button>
              <button class="kbd-btn" id="dot-btn" onclick="toggleDot()" style="padding:6px 8px;">· 附点 关<span class="shortcut">,</span></button>
              <button class="kbd-btn" id="fermata-btn" onclick="toggleFermata()" style="padding:6px 8px;">𝄐 延长号 关<span class="shortcut">F</span></button>
              <button class="kbd-btn" onclick="appendTok(buildSpacerTok())" style="padding:6px 8px;">␣ 空格<span class="shortcut">Space</span></button>
            </div>
          </div>
          <div class="kbd-group">
            <div class="kbd-label">临时记号</div>
            <div class="kbd-row">
              <button class="kbd-btn" id="acc-sharp" onclick="setAccidental('#')" style="padding:6px 10px;">♯ 升<span class="shortcut">K</span></button>
              <button class="kbd-btn" id="acc-flat" onclick="setAccidental('b')" style="padding:6px 10px;">♭ 降<span class="shortcut">J</span></button>
              <button class="kbd-btn" id="acc-natural" onclick="setAccidental('=')" style="padding:6px 10px;">♮ 还原<span class="shortcut">H</span></button>
              <button class="kbd-btn" onclick="setAccidental('')" style="padding:6px 8px;">清除</button>
            </div>
          </div>
          <div class="kbd-group">
            <div class="kbd-label">小节线 · 反复</div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendTok('|')" style="padding:6px 8px;">| 小节线<span class="shortcut">B</span></button>
              <button class="kbd-btn" onclick="appendTok('||')" style="padding:6px 8px;">|| 双小节<span class="shortcut">M</span></button>
              <button class="kbd-btn" onclick="appendTok('!')" title="断梁：让前后下划线音符不连成一梁（严格对位；不占音位、不用写 @）" style="padding:6px 8px;">! 断梁<span class="shortcut">!</span></button>
              <button class="kbd-btn" onclick="appendTok('||/')" style="padding:6px 8px;">||/ 终止线</button>
              <button class="kbd-btn" onclick="appendTok('|:')" style="padding:6px 8px;">|: 反复开</button>
              <button class="kbd-btn" onclick="appendTok(':|')" style="padding:6px 8px;">:| 反复结</button>
              <button class="kbd-btn" onclick="appendTok('|:|')" style="padding:6px 8px;">|:| 反复段</button>
            </div>
          </div>
          <div class="kbd-group">
            <div class="kbd-label">导航记号　<span style="opacity:.6;font-weight:400;">左＝挂小节线　右＝挂音符上</span></div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendNavTok('fine')" title="曲终：终止线 + Fine，挂在小节线处" style="padding:6px 8px;flex:1 1 0;">Fine 曲终</button>
              <button class="kbd-btn" onclick="appendTok('*fine')" title="Fine 画在前一个音符正上方：不画小节线、不占音位（chord/歌词不用补 @）" style="padding:6px 8px;flex:1 1 0;">Fine 挂音</button>
            </div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendNavTok('dc')" title="D.C. 从头反复（Da Capo），挂在小节线处" style="padding:6px 8px;flex:1 1 0;">D.C. 从头</button>
              <button class="kbd-btn" onclick="appendTok('*dc')" title="D.C. 画在前一个音符正上方：不画小节线、不占音位（chord/歌词不用补 @）" style="padding:6px 8px;flex:1 1 0;">D.C. 挂音</button>
            </div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendNavTok('ds')" title="D.S. 回到记号（Dal Segno），挂在小节线处" style="padding:6px 8px;flex:1 1 0;">D.S. 大反复</button>
              <button class="kbd-btn" onclick="appendTok('*ds')" title="D.S. 画在前一个音符正上方：不画小节线、不占音位（chord/歌词不用补 @）" style="padding:6px 8px;flex:1 1 0;">D.S. 挂音</button>
            </div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendNavTok('coda')" title="Coda 尾声记号（大跳跃），挂在小节线处" style="padding:6px 8px;flex:1 1 0;">Coda 尾声</button>
              <button class="kbd-btn" onclick="appendTok('*coda')" title="Coda 画在前一个音符正上方：不画小节线、不占音位（chord/歌词不用补 @）" style="padding:6px 8px;flex:1 1 0;">Coda 挂音</button>
            </div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendNavTok('segno')" title="Segno 记号（配合 D.S. 使用），挂在小节线处" style="padding:6px 8px;flex:1 1 0;">Segno 记号</button>
              <button class="kbd-btn" onclick="appendTok('*segno')" title="Segno 画在前一个音符正上方：不画小节线、不占音位（chord/歌词不用补 @）" style="padding:6px 8px;flex:1 1 0;">Segno 挂音</button>
            </div>
          </div>
          <div class="kbd-group">
            <div class="kbd-label">连音 · 连音符 · 拍号</div>
            <div class="kbd-row">
              <button class="kbd-btn" onclick="appendInlineTimeSignToken()" style="padding:6px 8px;">拍号记号</button>
              <button class="kbd-btn slur-btn" id="slur-btn" onclick="toggleSlur()" style="padding:6px 8px;">( ) 连音<span class="shortcut">[ / S</span></button>
              <button class="kbd-btn slur-btn" onclick="appendTok('~')" title="双连音线：插在两个音之间，弧线连接左右相邻两音" style="padding:6px 8px;">⌒ 双连音<span class="shortcut">N</span></button>
              <span class="tie-span-control">
                <button class="kbd-btn slur-btn" onclick="appendSpanTie()" title="按右侧数字向前连接音位；Shift+N 使用相同数字" style="padding:6px 8px;">⌒ 跨音连<span class="shortcut">⇧N</span></button>
                <label class="tie-span-picker">往前 <input id="tie-span" class="tie-span-input" type="number" min="1" step="1" required value="2" inputmode="numeric" aria-label="往前连接音位数" aria-describedby="tie-span-hint" oninput="setTieSpan()"> 音位</label>
              </span>
              <button class="kbd-btn slur-btn" id="xslur-btn" onclick="toggleXSlur()" style="padding:6px 8px;">跨线开<span class="shortcut">D</span></button>
              <button class="kbd-btn slur-btn" onclick="closeXSlur()" style="padding:6px 8px;">跨线结<span class="shortcut">X</span></button>
              <button class="kbd-btn slur-btn" id="t3-btn" onclick="toggleTuplet(3)" style="padding:6px 8px;">3连</button>
              <button class="kbd-btn slur-btn" id="t5-btn" onclick="toggleTuplet(5)" style="padding:6px 8px;">5连</button>
            </div>
            <div class="tie-span-hint" id="tie-span-hint">延音横线也算音位；空格、小节线不计。连线在下一个音上收口。</div>
          </div>
        </div>
        <div class="kbd-group">
          <div class="kbd-label">房子线</div>
          <div class="kbd-row">
            <button class="kbd-btn" onclick="appendTok('[v1')" style="padding:6px 8px;color:var(--accent2);border-color:rgba(124,106,247,0.3);" title="插入第1房子线开始">1. 房开</button>
            <button class="kbd-btn" onclick="appendTok('[v2')" style="padding:6px 8px;color:var(--accent2);border-color:rgba(124,106,247,0.3);" title="插入第2房子线开始">2. 房开</button>
            <button class="kbd-btn" onclick="appendCustomVolta()" style="padding:6px 8px;color:var(--accent2);border-color:rgba(124,106,247,0.3);" title="插入自定义房子线开始">自定义房</button>
            <button class="kbd-btn" onclick="appendTok(']v')" style="padding:6px 8px;color:var(--accent2);border-color:rgba(124,106,247,0.3);" title="插入房子线结束">房结</button>
            <button class="kbd-btn" onclick="appendCustomToken()" style="padding:6px 8px;color:var(--green);border-color:rgba(106,242,168,0.25);" title="插入自定义 token（可输入双行 1/5）">自定义Tok</button>
          </div>
        </div>
      </div>
    </div>

    <div class="dual-builder">
      <div class="dual-head">
        <span>双行简谱可视化输入</span>
        <strong id="dual-mode-stat">4分</strong>
      </div>

      <div class="dual-row">
        <div class="dual-row-top">
          <span class="dual-row-tag">上行</span>
          <input id="dual-top" class="dual-inp" placeholder="例如 1 或 1' 或 sp">
          <button class="dual-clear" onclick="clearDualRow('top')">清</button>
        </div>
        <div class="dual-picks">
          <button class="dual-pick" onclick="dualPick('top','1')">1</button>
          <button class="dual-pick" onclick="dualPick('top','2')">2</button>
          <button class="dual-pick" onclick="dualPick('top','3')">3</button>
          <button class="dual-pick" onclick="dualPick('top','4')">4</button>
          <button class="dual-pick" onclick="dualPick('top','5')">5</button>
          <button class="dual-pick" onclick="dualPick('top','6')">6</button>
          <button class="dual-pick" onclick="dualPick('top','7')">7</button>
          <button class="dual-pick" onclick="dualPick('top','0')">0</button>
          <button class="dual-pick wide" onclick="dualPick('top','sp')">sp</button>
          <button class="dual-pick wide" onclick="dualPick('top','-')">-</button>
        </div>
      </div>

      <div class="dual-row">
        <div class="dual-row-top">
          <span class="dual-row-tag">下行</span>
          <input id="dual-bot" class="dual-inp" placeholder="例如 5 或 5, 或 sp">
          <button class="dual-clear" onclick="clearDualRow('bot')">清</button>
        </div>
        <div class="dual-picks">
          <button class="dual-pick" onclick="dualPick('bot','1')">1</button>
          <button class="dual-pick" onclick="dualPick('bot','2')">2</button>
          <button class="dual-pick" onclick="dualPick('bot','3')">3</button>
          <button class="dual-pick" onclick="dualPick('bot','4')">4</button>
          <button class="dual-pick" onclick="dualPick('bot','5')">5</button>
          <button class="dual-pick" onclick="dualPick('bot','6')">6</button>
          <button class="dual-pick" onclick="dualPick('bot','7')">7</button>
          <button class="dual-pick" onclick="dualPick('bot','0')">0</button>
          <button class="dual-pick wide" onclick="dualPick('bot','sp')">sp</button>
          <button class="dual-pick wide" onclick="dualPick('bot','-')">-</button>
        </div>
      </div>

      <div class="dual-tools">
        <button class="dual-tool on" id="dual-dur-quarter" onclick="setDualDur('quarter')">4分</button>
        <button class="dual-tool" id="dual-dur-eighth" onclick="setDualDur('eighth')">8分</button>
        <button class="dual-tool" id="dual-dur-16th" onclick="setDualDur('16th')">16分</button>
        <button class="dual-tool" id="dual-dot-btn" onclick="toggleDualDot()">附点</button>
        <button class="dual-tool" id="dual-fermata-btn" onclick="toggleDualFermata()">延长号</button>
      </div>

      <div class="dual-preview">预览 token: <code id="dual-preview">1/5</code></div>

      <div class="dual-actions">
        <button class="dual-action main" onclick="insertDualToken()">插入双行</button>
        <button class="dual-action" onclick="clearDualBuilder()">重置面板</button>
      </div>
    </div>

    <div class="kbd-actions">
      <button class="kbd-btn action" onclick="deleteSelected()" style="padding:8px 10px;">⌫ 删除<span class="shortcut">Bksp</span></button>
      <button class="kbd-btn action" onclick="undoAction()" style="padding:8px 10px;">↩ 撤销<span class="shortcut">⌘Z</span></button>
      <button class="kbd-btn action" onclick="clearN()" style="padding:8px 10px;">✕ 清空</button>
      <button class="kbd-btn" onclick="copySeg()" style="padding:8px 10px;color:var(--green);border-color:rgba(106,242,168,0.25);" title="复制整格 (Alt+C)">⬡ 复制格<span class="shortcut">Alt+C</span></button>
      <button class="kbd-btn" onclick="pasteSeg()" style="padding:8px 10px;color:var(--green);border-color:rgba(106,242,168,0.25);" title="粘贴到后面 (Alt+V)">⬡ 粘贴格<span class="shortcut">Alt+V</span></button>
      <button class="kbd-btn" onclick="pasteSegReplace()" style="padding:8px 10px;color:var(--green);border-color:rgba(106,242,168,0.25);" title="覆盖当前格 (Alt+R)">⬡ 覆盖格<span class="shortcut">Alt+R</span></button>
    </div>

    <div class="kbd-hintline">
      <span><kbd>\</kbd> 延音</span>
      <span><kbd>,</kbd> 附点</span>
      <span><kbd>F</kbd> 延长号</span>
      <span><kbd>B</kbd> 小节线</span>
      <span><kbd>M</kbd> 双小节</span>
      <span><kbd>/</kbd> 双行面板</span>
      <span><kbd>I / O</kbd> 插入 / 覆盖</span>
      <span><kbd>↑ / ↓</kbd> 八度</span>
      <span><kbd>Alt+C/V/R</kbd> 格子复制 / 粘贴 / 覆盖</span>
    </div>
  </div>
</div><!-- bottom-area -->
</div><!-- work-right -->
</div><!-- work-wrap -->

<script>
/* ════════════════════════════════════════
   数据
════════════════════════════════════════ */
/* 默认空白起始（原示例谱已删）：一个段落 + 一行 + 一个空格子，打开即可编辑。 */
var data=[
  {name:'主歌',lines:[
    {bold:false,segs:[
      {chord:"", n:"", lyric:""},
    ]}
  ]},
];

/* ════════════════════════════════════════
   编辑器状态
════════════════════════════════════════ */
var curSi=-1, curLi=-1, curGi=-1;
// 游标位置（插入点）：-1 = 末尾，>=0 = 在 curTok 前面插入
var curTok=-1;
// 多选范围（含）：selA 是锚点，selB 是终点
var selA=-1, selB=-1;

var oct='mid', dur='quarter', dotOn=false, fermataOn=false, slurOn=false, xslurOn=false, tupletOn=0;
var tieSpanChoice=2;
var MT_TIE_SPAN_KEY='mt_tie_span_v1';
var dualDur='quarter', dualDot=false, dualFermata=false;
var inlineDualTop='1', inlineDualBot='5';
var accidental='';
var inputMode='insert';
var tokClipboard=[]; // 存 token 数组
var segClipboard=null; // 存格子数组（单格 = 长度 1）

/* ════════════════════════════════════════
   撤销
════════════════════════════════════════ */
var undoStack=[];
function saveUndo(){
  undoStack.push(JSON.stringify({d:data,si:curSi,li:curLi,gi:curGi,ct:curTok,sa:selA,sb:selB}));
  if(undoStack.length>80)undoStack.shift();
}
function undoAction(){
  if(!undoStack.length)return;
  var s=JSON.parse(undoStack.pop());
  data=s.d; curSi=s.si; curLi=s.li; curGi=s.gi; curTok=s.ct; selA=s.sa; selB=s.sb;
  clearSegSel();
  renderEditor();
  if(curSi>=0)reactivate();
}

/* ════════════════════════════════════════
   工具函数
════════════════════════════════════════ */
function getToks(){
  if(curSi<0)return[];
  var n=data[curSi].lines[curLi].segs[curGi].n;
  return(n&&n.trim())?n.trim().split(/\\s+/):[];
}
function setToks(toks){
  data[curSi].lines[curLi].segs[curGi].n=toks.join(' ');
}
function getSelRange(){
  if(selA<0||selB<0)return null;
  return{lo:Math.min(selA,selB),hi:Math.max(selA,selB)};
}
function clearSel(){selA=-1;selB=-1;}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
/* ==== SA-CONFORMANCE-REGION-A-BEGIN ====
   shared/strict-align.conformance.js reads between these ASCII markers to run the shared
   test cases against this copy. Markers only, no logic change. Move them with the code. */
function normalizeTimeSignValue(sig){
  var m=String(sig||'').trim().replace(/\\s+/g,'').replace(/\uFF0F/g,'/').match(/^(\\d{1,2})\\/(\\d{1,2})$/);
  return m?(m[1]+'/'+m[2]):'';
}
function extractInlineTimeSignToken(tok){
  var m=String(tok||'').trim().match(/^\\[(?:ts|timesign|meter):([^\\]]+)\\]$/i);
  return m?normalizeTimeSignValue(m[1]):'';
}
/* ── 严格对位（align:"strict"）纯函数 —— 与 shared/strict-align.js 同一套判定。
   srcdoc iframe 隔离，无法 import CecpStrictAlign，故内联于此；判定改动须四/五处同步。
   注意：本模板是字符串，正则里的反斜杠一律双写（\\s、\\{、\\[…）。 */
function saIsDualAtom(tk){
  if(!tk||tk==='/'||tk==='／'||tk==='!'||tk.charAt(0)==='~'||tk.charAt(0)==='*')return false;
  if(tk==='('||tk===')'||tk==='(['||tk==='])'||tk==='}'||tk==='[v1'||tk==='[v2'||tk===']v')return false;
  if(isBarlineTok(tk))return false;
  if(/^\\{(3|5)$/.test(tk))return false;
  if(extractInlineTimeSignToken(tk))return false;
  if(/^\\[v:(.+)\\]$/.test(tk))return false;
  return true;
}
function saTokenizeN(nStr){
  var s=String(nStr||'').trim();if(!s)return [];
  var rawToks=s.split(/\\s+/),toks=[],ti=0;
  while(ti<rawToks.length){
    if(ti+2<rawToks.length && (rawToks[ti+1]==='/'||rawToks[ti+1]==='／') && saIsDualAtom(rawToks[ti]) && saIsDualAtom(rawToks[ti+2])){
      toks.push(rawToks[ti]+'/'+rawToks[ti+2]);ti+=3;continue;
    }
    toks.push(rawToks[ti]);ti++;
  }
  return toks;
}
function saSplitSlots(nStr){return saTokenizeN(nStr).filter(saIsDualAtom);}
function saSplitChordStack(tok){
  if(tok==null)return [];
  return String(tok).split(',').map(function(s){return s.trim();}).filter(function(s){return s.length;});
}
function saParseFieldTokens(str){var s=String(str==null?'':str).trim();return s?s.split(/\\s+/):[];}
/* 歌词智能分词（仅 lyric）——同 shared/strict-align.js：中文连写每字一位、@拖腔、标点粘前字、英文按空格。
   纯 charCode+indexOf 分类，模板内无需转义。改动先改 shared 跑测试再同步回此处。 */
var SA_LYRIC_PUNCT='，。、；：？！…—―～·「」『』（）〔〕【】《》〈〉“”‘’,.;:?!(){}';
function saIsLyricPunctChar(ch){return SA_LYRIC_PUNCT.indexOf(ch)>=0;}
function saIsLyricWordChar(ch){var c=ch.charCodeAt(0);return (c>=48&&c<=57)||(c>=65&&c<=90)||(c>=97&&c<=122)||ch==="'"||ch==='-';}
function saIsLyricSpaceChar(ch){var c=ch.charCodeAt(0);return c===32||c===9||c===10||c===13||c===12288;}
function saTokenizeLyric(str){
  var arr=Array.from(String(str==null?'':str)),toks=[],buf='';
  function flush(){if(buf){toks.push(buf);buf='';}}
  for(var i=0;i<arr.length;i++){
    var ch=arr[i];
    if(saIsLyricSpaceChar(ch)){flush();continue;}
    if(ch==='@'){flush();toks.push('@');continue;}
    if(saIsLyricPunctChar(ch)){
      if(buf)buf+=ch;
      else if(toks.length&&toks[toks.length-1]!=='@')toks[toks.length-1]+=ch;
      else buf+=ch;
      continue;
    }
    if(saIsLyricWordChar(ch)){buf+=ch;continue;}
    flush();toks.push(ch);
  }
  flush();
  return toks;
}
/* 尾随标点拆分（悬挂渲染用）：说，→ base:说 / punct:，；同 shared/strict-align.js。 */
function saSplitTrailingPunct(s){
  s=String(s==null?'':s);
  var i=s.length;
  while(i>0&&saIsLyricPunctChar(s.charAt(i-1)))i--;
  if(i===0)return {base:s,punct:''};
  return {base:s.slice(0,i),punct:s.slice(i)};
}
/* 和弦智能分词（仅 chord）：空格分隔 + @ 自分隔，使 C@@@G@ = C @ @ @ G @；真和弦整体保留、C,G 不拆。同 shared/strict-align.js。 */
function saTokenizeChord(str){
  var s=String(str==null?'':str).trim();
  if(!s)return [];
  var raw=s.split(/\\s+/),out=[];
  for(var i=0;i<raw.length;i++){
    var t=raw[i],buf='';
    for(var j=0;j<t.length;j++){
      var ch=t.charAt(j);
      if(ch==='@'){if(buf){out.push(buf);buf='';}out.push('@');}
      else buf+=ch;
    }
    if(buf)out.push(buf);
  }
  return out;
}
function saAlignField(raw,slotCount,isLyric){
  var toks=isLyric?saTokenizeLyric(raw):saTokenizeChord(raw),vals=[];
  for(var i=0;i<slotCount;i++){var t=i<toks.length?toks[i]:null;vals.push((t==='@'||t==null)?null:t);}
  return {vals:vals,count:toks.length};
}
function saAlignRow(nStr,chord,lyrics){
  var lys=lyrics==null?[]:(Array.isArray(lyrics)?lyrics:[lyrics]);
  var slots=saSplitSlots(nStr),n=slots.length,warnings=[];
  var cf=saAlignField(chord,n);
  /* kind 字段与 shared/strict-align.js 对齐（over/under）：一致性测试抓到这里原先漏了它。
     musictool 自己的校对面板不读 kind，但少一个字段就是行为分家，补上保持四份一致。 */
  if(cf.count!==n)warnings.push({field:'chord',kind:cf.count>n?'over':'under',need:n,got:cf.count,slot:Math.min(cf.count,n)+1});
  var outLy=[];
  for(var k=0;k<lys.length;k++){var lf=saAlignField(lys[k],n,true);outLy.push(lf.vals);if(lf.count!==n)warnings.push({field:k===0?'lyric':'lyric'+(k+1),kind:lf.count>n?'over':'under',need:n,got:lf.count,slot:Math.min(lf.count,n)+1});}
  return {slotCount:n,slots:slots,chords:cf.vals,lyrics:outLy,warnings:warnings};
}
/* ==== SA-CONFORMANCE-REGION-A-END ==== */
function getSegInlineTimeSign(seg){
  if(!seg)return'';
  return normalizeTimeSignValue(seg.timeSign||seg.ts||seg.meter||'');
}
function setSegInlineTimeSign(seg,raw){
  if(!seg)return;
  var trimmed=String(raw||'').trim();
  if(!trimmed){
    delete seg.timeSign;
    delete seg.ts;
    delete seg.meter;
    return;
  }
  seg.timeSign=normalizeTimeSignValue(trimmed)||trimmed;
  delete seg.ts;
  delete seg.meter;
}
var NOTE_MAP={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
var NOTES_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
var NOTES_FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
var FLAT_KEYS={F:1,Bb:1,Eb:1,Ab:1,Db:1,Gb:1,Cb:1};
function parseKeyName(key){
  var m=String(key||'').trim().match(/^([A-G](?:#|b)?)(.*)$/);
  return m?{root:m[1],suf:m[2]||''}:{root:'C',suf:''};
}
function trKeyName(key,st,useFlat){
  var p=parseKeyName(key),n=NOTE_MAP[p.root];
  if(n===undefined)return key;
  return (useFlat?NOTES_FLAT:NOTES_SHARP)[(n+st+120)%12]+p.suf;
}
/* ═══════════ CECP-SONG-EXT v1 BEGIN ═══════════
   共享模块：{sp} 专属空格渲染 + 移调占位补偿。
   本块在以下三个文件中逐字节相同（权威版本 = shared/song-ext.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/song-ext.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 经 CMS 部署会丢失一层反斜杠），
   转义字符一律用 String.fromCharCode 构造。 */
var SP_TOKEN='{sp}';
var SP_TAB=String.fromCharCode(9);
var SP_HANGUL_FILLER=String.fromCharCode(0x3164);
var SP_IDEO_SPACE=String.fromCharCode(0x3000);
var SP_WIDTH_CACHE={};
function spHasToken(text){
  return String(text||'').indexOf(SP_TOKEN)>=0;
}
function spStripTokens(text){
  return String(text||'').split(SP_TOKEN).join('');
}
function spMeasureWidth(el,sample){
  if(!el||!document.body)return 0;
  var cs=getComputedStyle(el);
  var key=sample+'|'+cs.font+'|'+cs.letterSpacing+'|'+cs.wordSpacing+'|'+cs.lineHeight;
  if(Object.prototype.hasOwnProperty.call(SP_WIDTH_CACHE,key))return SP_WIDTH_CACHE[key];
  var probe=document.createElement('span');
  probe.style.cssText='position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;pointer-events:none;';
  probe.style.font=cs.font;
  probe.style.letterSpacing=cs.letterSpacing;
  probe.style.wordSpacing=cs.wordSpacing;
  probe.style.lineHeight=cs.lineHeight;
  probe.textContent=sample;
  document.body.appendChild(probe);
  var w=probe.getBoundingClientRect().width;
  probe.remove();
  SP_WIDTH_CACHE[key]=w;
  return w;
}
function spAppendGap(el,cls,width){
  var gap=document.createElement('span');
  gap.className=cls;
  gap.setAttribute('aria-hidden','true');
  gap.style.display='inline-block';
  gap.style.width=width+'px';
  gap.textContent=' ';
  el.appendChild(gap);
}
function spSetContent(el,text,kind,fallback){
  var raw=String(text||'');
  if(raw.indexOf(SP_TOKEN)<0){fallback(el,raw);return;}
  var sample=kind==='chord'?'0':'我';
  var cls=kind==='chord'?'chord-gap sp-gap':'lyric-gap sp-gap';
  var width=spMeasureWidth(el,sample);
  el.textContent='';
  var parts=raw.split(SP_TOKEN);
  for(var i=0;i<parts.length;i++){
    if(i>0)spAppendGap(el,cls,width);
    if(parts[i]){
      var sub=document.createElement('span');
      el.appendChild(sub);
      fallback(sub,parts[i]);
    }
  }
}
function setChordContentEx(el,text,fallback){
  spSetContent(el,text,'chord',fallback);
}
function setLyricContentEx(el,text,fallback){
  spSetContent(el,text,'lyric',fallback);
}
function spIsGapChar(ch){
  return ch===' '||ch===SP_TAB||ch===SP_HANGUL_FILLER;
}
function spTokenizeChord(text){
  var raw=String(text||''),out=[],i=0,cur='';
  function flushText(){
    if(cur){out.push({gap:false,text:cur});cur='';}
  }
  while(i<raw.length){
    var isSp=raw.substr(i,SP_TOKEN.length)===SP_TOKEN;
    var ch=raw.charAt(i);
    if(isSp||spIsGapChar(ch)){
      flushText();
      var units=[];
      while(i<raw.length){
        if(raw.substr(i,SP_TOKEN.length)===SP_TOKEN){
          units.push(SP_TOKEN);i+=SP_TOKEN.length;continue;
        }
        var gc=raw.charAt(i);
        if(spIsGapChar(gc)){units.push(gc);i++;continue;}
        break;
      }
      out.push({gap:true,units:units});
      continue;
    }
    cur+=ch;i++;
  }
  flushText();
  return out;
}
function spResizeGapRun(units,len){
  var mapped=[];
  for(var i=0;i<units.length;i++){
    var u=units[i];
    mapped.push(u===SP_HANGUL_FILLER?SP_IDEO_SPACE:u);
  }
  if(!mapped.length||len<=0)return '';
  var out='';
  for(var j=0;j<len;j++)out+=mapped[j%mapped.length];
  return out;
}
function trChordEx(text,st,useFlat,trChordFn){
  var raw=String(text||'');
  if(raw.indexOf(SP_TOKEN)<0)return trChordFn(raw,st,useFlat);
  var parts=spTokenizeChord(raw),out='',i=0;
  while(i<parts.length){
    var part=parts[i];
    if(part.gap){out+=part.units.join('');i++;continue;}
    var tr=trChordFn(part.text,st,useFlat);
    out+=tr;
    if(i+1<parts.length&&parts[i+1].gap){
      var units=parts[i+1].units;
      var nextLen=units.length+(Array.from(part.text).length-Array.from(tr).length);
      if(nextLen<0)nextLen=0;
      if(nextLen===0&&i+2<parts.length&&!parts[i+2].gap)nextLen=1;
      out+=spResizeGapRun(units,nextLen);
      i+=2;continue;
    }
    i++;
  }
  return out;
}
function segIsLabelBlock(seg){
  return !!seg&&typeof seg==='object'&&typeof seg.label==='string';
}
function segIsRenderableBlock(seg){
  if(!seg||typeof seg!=='object')return false;
  if(segIsLabelBlock(seg))return true;
  return typeof seg.chord!=='undefined'||typeof seg.n!=='undefined'||typeof seg.lyric!=='undefined'||typeof seg.lyric2!=='undefined'||typeof seg.lyric3!=='undefined'||typeof seg.lyric4!=='undefined';
}
var SEC_LABEL_COLORS=[
  ['pre-chorus','prechorus','pre chorus','前副歌','导歌','#0d9488'],
  ['chorus','副歌','#e8590c'],
  ['verse','主歌','#2f6fdb'],
  ['bridge','桥段','桥','#7c3aed'],
  ['intro','前奏','#6b7280'],
  ['outro','ending','尾奏','尾声','#b45309']
];
var SEC_LABEL_FALLBACK=['#db2777','#0891b2','#4f46e5','#65a30d','#9333ea','#0284c7'];
function secLabelColor(text){
  var t=String(text||'').toLowerCase();
  for(var i=0;i<SEC_LABEL_COLORS.length;i++){
    var grp=SEC_LABEL_COLORS[i];
    for(var j=0;j<grp.length-1;j++){
      if(grp[j]&&t.indexOf(grp[j])>=0)return grp[grp.length-1];
    }
  }
  var h=0;
  for(var k=0;k<t.length;k++)h=(h*31+t.charCodeAt(k))%997;
  return SEC_LABEL_FALLBACK[h%SEC_LABEL_FALLBACK.length];
}
var SEC_LABEL_TOP_GAP_PX=3;
function segRenderLabelBlock(seg,row){
  var holder=document.createElement('span');
  holder.className='sec-label-holder';
  holder.style.cssText='display:inline-block;width:0;overflow:visible;vertical-align:top;position:relative;align-self:stretch;';
  holder.setAttribute('aria-hidden','true');
  var tag=document.createElement('span');
  var jump=seg.style==='jump';
  tag.className='sec-label'+(jump?' sec-label-jump':'');
  var color=secLabelColor(seg.label);
  var dx=Number(seg.dx)||0;
  var dy=Number(seg.dy)||0;   // 上下偏移(可拖)：正=往下,可把标记拖到谱下方当 Fine 用
  var base='display:inline-block;position:absolute;left:'+dx+'px;top:'+(16+dy)+'px;white-space:nowrap;line-height:1.4;font-size:0.58em;padding:0 7px;border-radius:999px;box-sizing:border-box;letter-spacing:0.4px;z-index:2;';
  if(jump){
    tag.style.cssText=base+'font-style:italic;font-weight:600;color:'+color+';border:1px solid '+color+';background:transparent;opacity:0.92;';
  }else{
    tag.style.cssText=base+'font-weight:700;color:#ffffff;border:1px solid '+color+';background:'+color+';';
  }
  tag.textContent=String(seg.label||'');
  holder.appendChild(tag);
  /* 给段落标记让出一条带(把和弦顶上去)并把徽章定位到和弦下方。
     ⚠️ 这里必须能重试：makeSecLabel 是在内存里拼行时调用的，
     youth 这类「先拼好整首再交给宿主 append」的路径，首帧 holder.isConnected 还是 false。
     老代码是一次性 rAF + 直接 return，于是回调永远没跑成 —— 徽章停在初始 top:16px、
     和弦也没让位，两者就撞在一起（严格模式因为 layoutStrictArcsAll 每次都会重设
     .p-chord 的 marginBottom，所以看不出问题）。 */
  function placeSecLabel(keepChordHeight){
    if(!holder.isConnected)return false;
    var scope=holder.closest?holder.closest('.prev-row'):null;
    if(!scope)return false;
    var pillH=tag.offsetHeight||13;
    var band=pillH+SEC_LABEL_TOP_GAP_PX*2;
    var chords=scope.querySelectorAll('.p-chord');
    for(var i=0;!keepChordHeight&&i<chords.length;i++){
      chords[i].style.marginBottom=(2+band)+'px';
    }
    var ref=holder.nextElementSibling;
    while(ref&&!(ref.querySelector&&ref.querySelector('.p-chord')))ref=ref.nextElementSibling;
    if(!ref){
      ref=holder.previousElementSibling;
      while(ref&&!(ref.querySelector&&ref.querySelector('.p-chord')))ref=ref.previousElementSibling;
    }
    var ch=ref?ref.querySelector('.p-chord'):scope.querySelector('.p-chord');
    if(ch){
      var hr=holder.getBoundingClientRect();
      var cr=ch.getBoundingClientRect();
      var scale=(holder.offsetHeight&&hr.height)?(hr.height/holder.offsetHeight):1;
      if(!scale)scale=1;
      tag.style.top=((cr.bottom-hr.top)/scale+SEC_LABEL_TOP_GAP_PX+dy)+'px';
    }
    return true;
  }
  holder.cecpPlaceSecLabel=placeSecLabel;   // 宿主布局settle后可再调一次
  if(typeof requestAnimationFrame==='function'){
    var tries=0;
    (function retry(){
      if(placeSecLabel())return;
      if(++tries>40)return;                 // 约 40 帧兜底，避免节点永远不入档时空转
      requestAnimationFrame(retry);
    })();
  }
  return holder;
}
/* ═══════════ CECP-SONG-EXT v1 END ═══════════ */

/* ═══════════ CECP-CHORD-STYLE v1 BEGIN ═══════════
   共享模块：和弦文字视觉样式（按根音固定配色的纯文字，不加任何底色/边框）。
   本块在以下三个文件中逐字节相同（权威版本 = shared/chord-style.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/chord-style.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 经 CMS 部署会丢失一层反斜杠），
   转义字符一律用 String.fromCharCode 构造。
   硬性约束：只做视觉，不改布局——和弦按等宽字体与歌词逐字对齐，
   因此不用 padding/border/margin/outline，只改 color。
   字号、行高、margin、min-height 全部继承宿主 .p-chord 原样。
   2026-08 起去掉了底色与描边小片（用户反馈更占地方）：
   和弦回到纯文字，仅靠颜色区分根音。这条约束原本就写在这里，
   后来 padding 被加了进来，现在改回来了。
   配色规则：同根音共用一色（G/G7/Gsus4/Gm 同色），12 音名 12 色，
   色相按半音序直接展开（pc*30°）：常见进行（I-IV-V、关系小调）
   的根音相距纯四/五度或小三度，映射后色差足够大，
   同一首歌里的常用和弦颜色能明显区分；
   文字对比度优先：浅色主题深字(L20%)、深色主题浅字(L84%)，
   直接压在宿主背景上（不再有自己的底色）。这两个亮度值是去底色后实测过的：
   压在 #F4EFE7 / #101613 上最差对比度 5.71 / 9.85，均过 WCAG AA(4.5)。
   ⚠️ 别把浅色调到 28%，G/A/B 那几个黄绿色相会掉到 3.3~4.1，投影上发虚；
   深浅主题分别取色：优先 html[data-resolved-theme]，
   无该属性的宿主回退 prefers-color-scheme。 */
var CHORD_STYLE_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
var CHORD_STYLE_SHARP=String.fromCharCode(0x266F);
var CHORD_STYLE_FLAT=String.fromCharCode(0x266D);
var CHORD_STYLE_GAPS=' '+String.fromCharCode(9)+String.fromCharCode(160)+String.fromCharCode(0x3164)+String.fromCharCode(0x3000);
function chordStyleIsGapChar(ch){
  return CHORD_STYLE_GAPS.indexOf(ch)>=0;
}
/* 根音 -> 半音音级（0..11）；找不到可识别根音时返回 -1（不上色）。
   规则：根音必须在 token 开头（允许若干前置左括号，兼容 "(C/G)"），
   根音（含变音记号）之后若紧跟小写字母，必须是合法和弦后缀首字母
   （m/s/a/d，如 m7、sus4、add9、dim），否则视为普通单词不上色——
   这样可排除写在 chord 字段里的 "Fine"、"Chorus"、"Coda"、
   "To Chorus" 这类段落标记文本。 */
function chordStylePitchClass(token){
  var s=String(token||'');
  var i=0;
  while(i<s.length&&s.charAt(i)==='(')i++;
  var ch=s.charAt(i);
  if(!Object.prototype.hasOwnProperty.call(CHORD_STYLE_PC,ch))return -1;
  var pc=CHORD_STYLE_PC[ch];
  var j=i+1;
  var nx=s.charAt(j);
  if(nx==='#'||nx===CHORD_STYLE_SHARP){pc=(pc+1)%12;j++;}
  else if(nx==='b'||nx===CHORD_STYLE_FLAT){pc=(pc+11)%12;j++;}
  var after=s.charAt(j);
  if(after>='a'&&after<='z'&&'msad'.indexOf(after)<0)return -1;
  return pc;
}
/* 音级 -> 色相：半音序直接展开再整体旋转，C=210°（蓝），确定性映射。 */
function chordStyleHue(pc){
  return (pc*30+210)%360;
}
function chordStyleEnsureCss(){
  if(typeof document==='undefined'||!document.head)return;
  if(document.getElementById('cecp-chord-style'))return;
  var st=document.createElement('style');
  st.id='cecp-chord-style';
  var light='',dark='',i,h;
  for(i=0;i<12;i++){
    h=chordStyleHue(i);
    light+='.chord-chip.chord-pc'+i+'{color:hsl('+h+',90%,20%);}';
    dark+='.chord-chip.chord-pc'+i+'{color:hsl('+h+',72%,84%);}';
  }
  // Theme context must not outrank the light paper's local chord palette.
  var darkAttr=dark.split('.chord-chip.').join(':where(html[data-resolved-theme="dark"]:not([data-sheet-theme="light"])) .chord-chip.');
  var darkAuto=dark.split('.chord-chip.').join(':where(html:not([data-resolved-theme="light"]):not([data-sheet-theme="light"])) .chord-chip.');
  st.textContent=
    light+darkAttr+
    '@media (prefers-color-scheme: dark){'+darkAuto+'}'+
    '.sw-score .chord-chip, .sw-page .chord-chip, .cf-jianpu .chord-chip { font-weight:700; }';
  document.head.appendChild(st);
}
/* 把一个文本节点按 gap 字符切成若干节点，返回 [{gap,node}...]；
   只有内容/gap 混排时才真正拆分 DOM。 */
function chordStyleSplitText(node){
  var s=node.nodeValue||'',pieces=[],cur='',curGap=null,out=[],i;
  for(i=0;i<s.length;i++){
    var g=chordStyleIsGapChar(s.charAt(i));
    if(curGap===null)curGap=g;
    if(g!==curGap){pieces.push({gap:curGap,text:cur});cur='';curGap=g;}
    cur+=s.charAt(i);
  }
  if(cur)pieces.push({gap:curGap,text:cur});
  if(pieces.length<=1){
    out.push({gap:pieces.length?pieces[0].gap:true,node:node});
    return out;
  }
  var parent=node.parentNode;
  for(i=0;i<pieces.length;i++){
    var tn=document.createTextNode(pieces[i].text);
    parent.insertBefore(tn,node);
    out.push({gap:pieces[i].gap,node:tn});
  }
  parent.removeChild(node);
  return out;
}
function chordChipWalk(parent){
  var nodes=[],n,i;
  for(n=parent.firstChild;n;n=n.nextSibling)nodes.push(n);
  var run=[];
  function flush(){
    if(!run.length)return;
    var text='',k;
    for(k=0;k<run.length;k++)text+=run[k].nodeValue;
    var pc=chordStylePitchClass(text);
    if(pc>=0){
      var chip=document.createElement('span');
      chip.className='chord-chip chord-pc'+pc;
      parent.insertBefore(chip,run[0]);
      for(k=0;k<run.length;k++)chip.appendChild(run[k]);
    }
    run=[];
  }
  for(i=0;i<nodes.length;i++){
    n=nodes[i];
    if(n.nodeType===3){
      var pieces=chordStyleSplitText(n);
      for(var j=0;j<pieces.length;j++){
        if(pieces[j].gap)flush();
        else run.push(pieces[j].node);
      }
    }else if(n.nodeType===1){
      flush();
      var c=' '+String(n.className||'')+' ';
      if(c.indexOf('gap')<0)chordChipWalk(n);
    }else{
      flush();
    }
  }
  flush();
}
/* 对一个 .p-chord 元素做视觉装饰：内容设置完成后调用。
   同一元素内多个和弦（以空白/占位分隔）各自成片、各自取色。 */
function chordChipDecorate(root){
  if(!root||root.nodeType!==1)return;
  var cls=' '+String(root.className||'')+' ';
  if(cls.indexOf(' empty ')>=0)return;
  if(root.querySelector&&root.querySelector('.chord-chip'))return;
  chordStyleEnsureCss();
  chordChipWalk(root);
}
/* ═══════════ CECP-CHORD-STYLE v1 END ═══════════ */

/* ═══════════ CECP-JUSTIFY-ROWS v1 BEGIN ═══════════
   共享模块：简谱行内两端对齐（justify）。
   本块在以下三个文件中逐字节相同（权威版本 = shared/justify-rows.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/justify-rows.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 的副本位于 jianpuHTML 模板字符串内，
   经 CMS 部署还会再丢一层反斜杠）。
   硬性约束：只改 .prev-seg 的 inline margin-right，
   绝不插入/删除/移动任何元素——musictool 点击定位用 data-loc，
   shared/lyric-hl.js 用 .prev-seg 的索引定位歌词高亮，
   元素数量或顺序一旦变化全部错位。
   工作方式：在未缩放坐标系（transform:scale 之前）执行；
   每次先按 data-ml-just 标记还原上次写入的 margin，再重新测量分摊，
   保证 resize / 重渲染幂等，margin 不会叠加复利。
   短行不拉伸：自然宽 < ratio*maxW（默认 0.62）的行保持左对齐，
   类似文本 justify 对最后一行的惯例。 */
function justifyScoreRowsClear(scope){
  if(!scope||!scope.querySelectorAll)return;
  scope.querySelectorAll('[data-ml-just]').forEach(function(seg){
    seg.style.marginRight='';
    seg.removeAttribute('data-ml-just');
  });
}
function justifyScoreRows(rowList,opts){
  opts=opts||{};
  var ratio=(opts.ratio==null)?0.62:opts.ratio;
  var rows=Array.prototype.slice.call(rowList||[]);
  if(!rows.length)return 0;
  /* 1. 还原上次 justify 写入的 margin（幂等基线） */
  rows.forEach(function(row){justifyScoreRowsClear(row);});
  /* 2. inline-flex 测各行自然宽度（与 measureNaturalScore 同法） */
  var widths=rows.map(function(row){
    var prev=row.style.display;
    var prevW=row.style.width;
    row.style.display='inline-flex';
    row.style.width='max-content';
    /* 必须用 offsetWidth：flex 容器的 scrollWidth 不含子项 margin，
       而最终行宽是含 margin 的，两者不是同一个量 -> 严格模式每列都有 margin
       (列间距/悬挂标点间隙)，列数越多误差越大，各行拉不齐(实测差 15px)。 */
    var w=row.offsetWidth;
    row.style.display=prev;
    row.style.width=prevW;
    return w;
  });
  var maxW=0;
  widths.forEach(function(w){if(w>maxW)maxW=w;});
  if(opts.targetWidth && opts.targetWidth > maxW) maxW = opts.targetWidth;
  if(!maxW)return 0;
  /* 3. 先集中读（offsetWidth / computed margin），后集中写，避免逐格回流 */
  var plans=[];
  rows.forEach(function(row,idx){
    var w=widths[idx];
    var extra=maxW-w;
    if(extra<=0||w<ratio*maxW)return;
    var segs=Array.prototype.slice.call(row.querySelectorAll('.prev-seg'));
    if(segs.length<2)return;
    segs.pop(); /* DOM 顺序最后一个 seg 不加 margin，保住行尾对齐 */
    var total=0;
    var items=segs.map(function(seg){
      var sw=seg.offsetWidth;
      total+=sw;
      return {
        seg:seg,
        w:sw,
        base:parseFloat(getComputedStyle(seg).marginRight)||0
      };
    });
    if(total<=0)return;
    plans.push({row:row,items:items,extra:extra,total:total});
  });
  plans.forEach(function(plan){
    plan.items.forEach(function(item){
      item.seg.style.marginRight=(item.base+plan.extra*item.w/plan.total)+'px';
      item.seg.setAttribute('data-ml-just','1');
    });
  });
  /* 收尾校正：写完之后逐行实测，把残差补到最后一个参与分摊的 seg 上。
     「量」和「写」之间只要有任何东西改过宽度（网页字体晚到、谱图加载、
     宿主容器重排），一次性按比例分摊就会不准，而且没人再纠正 ——
     实测老格式歌各行会差十几 px，行尾参差不齐。
     这一刀让本函数自己保证后置条件：该拉伸的行，右端严格对齐到同一个 maxW。 */
  plans.forEach(function(plan){
    if(!plan.items.length)return;
    /* 只校正老格式行：严格对位行的 p-slot 列宽和弦避让已经由 strict 分支负责，
       这里保持原来的 strict 水平布局不变。 */
    if(plan.row.querySelector('.prev-seg.p-slot'))return;
    var prev=plan.row.style.display;
    var prevW=plan.row.style.width;
    plan.row.style.display='inline-flex';
    plan.row.style.width='max-content';
    var now=plan.row.offsetWidth;
    plan.row.style.display=prev;
    plan.row.style.width=prevW;
    var diff=maxW-now;
    if(diff>0.5||diff<-0.5){
      var last=plan.items[plan.items.length-1];
      var v=(parseFloat(last.seg.style.marginRight)||0)+diff;
      if(v<0)v=0;
      last.seg.style.marginRight=v+'px';
    }
  });
  return plans.length;
}
/* ═══════════ CECP-JUSTIFY-ROWS v1 END ═══════════ */

/* ═══════════ CECP-CHORD-FIT v1 BEGIN ═══════════
   共享模块：严格对位（align:"strict"）下的和弦排版。
   本块在以下三个文件中逐字节相同（权威版本 = shared/chord-fit.js）：
     musiclib-react-migration/public/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/chord-fit.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符、反引号、以及美元号紧跟大括号
   （musictool.js 的副本位于 jianpuHTML 模板字符串内，
   经 CMS 部署还会再丢一层反斜杠）。转义一律用 String.fromCharCode 构造。

   只作用于严格模式（.prev-seg.p-slot 结构）；老格式的歌一个像素都不动。

   解决的问题：严格模式下每个音位是一个竖列，和弦 .p-chord 参与列宽计算，
   于是 F#sus4 这种长和弦会把整列撑宽 → 数字之间的间距被拉大 → 整行自然宽度变大
   → fitRows 按「可用宽度 / 自然宽度」缩放，行越宽整首谱缩得越小。

   规则（用户 2026-08-15 定的）：
   1. .p-chord 零宽 + overflow 可见 → 和弦完全不参与列宽，数字位置只由数字/歌词决定。
   2. 对中核心 = 前两个「字」；斜杠和括号不算字（所以 C/E 是 2 个字、整体对中）。
      一个字就那个字对中，两个字就两个字对中 —— 与老版逐像素相同。
      第 3 个字起是「尾巴」，零宽悬挂、只向右延伸，不影响任何人的位置。
   3. 紧邻的下一个音位马上也有和弦时，这个和弦退回老版「整段整体对中」
      （左右都伸），否则右延伸会把后面的音位推开，反而比老版更宽。
   4. 头和尾一样大，绝不为了省地方缩小尾巴（用户明确否过）。
      严格模式的和弦基准字号 16px（老格式仍是 12px，不受影响）——
      零宽之后放大不撑列宽，所以敢放大。
   5. 只有两个和弦真的会撞上时，才在那一处局部加最小间距（写 padding，
      不碰 margin-right —— 那是 justifyScoreRows 的地盘）。
   6. 收紧要**同时**满足两个条件，缺一不收：
      ① 这一段是连续 >=4 个「歌词空位」（前奏/间奏/拖腔）；
      ② **这一行确实长** —— 自然宽 >= 全曲最宽行 * CHORD_FIT_LONG_ROW。
      收紧的意义是「别让这行拖着整首谱缩小」，行本来就不长的话收了白收，
      只会显得局促（用户 2026-08-16：「一行太长的时候才需要缩紧，位置够就正常对齐」）。
      收紧只改列的 margin/min-width，不改字号、不改和弦、不改和弦的位置关系。

   与既有代码的分工（都不要碰）：
   - .prev-seg 的 marginRight = justifyScoreRows 的
   - .p-chord 的 marginBottom = layoutStrictArcsAll / placeSecLabel 的
   - 本块只写：列的 paddingLeft / paddingRight，以及 .p-chord 上的 p-chord-mid 类。 */

var CHORD_FIT_GAP=4;          /* 两个和弦之间的最小安全间距(px, scale=1) */
var CHORD_FIT_EMPTY_RUN=4;    /* 连续这么多个「歌词空位」才触发收紧（用户定的：4 个以上 @） */
var CHORD_FIT_LONG_ROW=0.9;   /* 还要这行确实长：自然宽 >= 最宽行 * 这个比例才收紧，位置够就正常排 */
var CHORD_FIT_TIGHT=0.3;      /* 收紧强度参考值：列外边距归零 + 最小列宽 1.2em -> 0.9em，约省三成横向占位 */

/* 空白字符：普通空格 / TAB / NBSP / 韩文填充符 ㅤ / 全角空格 */
var CHORD_FIT_BLANKS=' '+String.fromCharCode(9)+String.fromCharCode(160)+String.fromCharCode(0x3164)+String.fromCharCode(0x3000);
function chordFitIsBlank(s){
  var t=String(s||''),i;
  for(i=0;i<t.length;i++){ if(CHORD_FIT_BLANKS.indexOf(t.charAt(i))<0)return false; }
  return true;
}
/* 对中核心的长度：数到第 2 个「字」为止；斜杠与括号不算字。
   C -> 1(整个)、F# -> 2、C/E -> 3(整个,因为 / 不算字)、Gm7 -> 2、F#sus4 -> 2 */
function chordFitHeadLen(text){
  var s=String(text||''),n=0,i,c;
  for(i=0;i<s.length;i++){
    c=s.charAt(i);
    if(c!=='/'&&c!=='('&&c!==')')n++;
    if(n>=2)return i+1;
  }
  return s.length;
}
/* 把一个和弦元素的文字拆成 头 + 尾 两个 span。幂等。
   注意：setChordContent 在 Apple 设备上是「一个字符一个文本节点」，
   所以这里要吃下任意多个连续文本节点；一旦混进元素子节点
   （{sp} 的 chord-gap 占位块）就原样放过——放过也没关系：
   零宽 + 整体对中，仍然不撑列宽，只是没有右延伸。 */
function chordFitSplitOne(host){
  if(!host||host.nodeType!==1)return;
  if(host.querySelector&&host.querySelector('.p-chord-head'))return;
  var nodes=[],txt='',n,i;
  for(n=host.firstChild;n;n=n.nextSibling){
    if(n.nodeType!==3)return;
    nodes.push(n);
    txt+=(n.nodeValue||'');
  }
  if(!nodes.length||!txt||chordFitIsBlank(txt))return;
  var k=chordFitHeadLen(txt);
  var head=document.createElement('span');
  head.className='p-chord-head';
  head.appendChild(document.createTextNode(txt.slice(0,k)));
  for(i=0;i<nodes.length;i++)host.removeChild(nodes[i]);
  host.appendChild(head);
  if(k<txt.length){
    var tail=document.createElement('span');
    tail.className='p-chord-tail';
    tail.appendChild(document.createTextNode(txt.slice(k)));
    host.appendChild(tail);
  }
}
/* 建列时调用：setChordContentEx + chordChipDecorate 之后，对一个 .p-chord 生效。
   叠和弦(逗号)每一层 .p-chord-stk 各自拆。 */
function chordFitPrepare(el){
  if(!el||el.nodeType!==1)return;
  var cls=' '+String(el.className||'')+' ';
  if(cls.indexOf(' empty ')>=0)return;
  var stks=el.querySelectorAll?el.querySelectorAll('.p-chord-stk'):null;
  var hosts=[],i;
  if(stks&&stks.length){ for(i=0;i<stks.length;i++)hosts.push(stks[i]); }
  else hosts.push(el);
  for(i=0;i<hosts.length;i++){
    var chip=hosts[i].querySelector?hosts[i].querySelector('.chord-chip'):null;
    chordFitSplitOne(chip||hosts[i]);
  }
}
/* 量一个元素里「真正画出来的墨迹」左右边界。
   .p-chord 是零宽盒子，量盒子恒为 0，必须用 Range。 */
function chordFitInk(el){
  var rg=document.createRange();
  rg.selectNodeContents(el);
  var r=rg.getBoundingClientRect();
  return { L:r.left, R:r.right, w:r.width };
}
/* 这一列的歌词是不是空的（所有歌词行都只有 @ / 空白） */
function chordFitSlotBlank(col){
  var ls=col.querySelectorAll('.p-lyric'),i;
  if(!ls.length)return true;
  for(i=0;i<ls.length;i++){ if(!chordFitIsBlank(ls[i].textContent||''))return false; }
  return true;
}
/* 给一行里「连续 >=CHORD_FIT_EMPTY_RUN 个空歌词音位」的那几段打 cf-tight。
   小节线列不算音位：既不打断连续，也不参与收紧。 */
function chordFitMarkTightRuns(cols){
  var run=[],i,j;
  function flush(){
    if(run.length>=CHORD_FIT_EMPTY_RUN){
      for(j=0;j<run.length;j++)run[j].classList.add('cf-tight');
    }
    run=[];
  }
  for(i=0;i<cols.length;i++){
    if(cols[i].classList.contains('p-barslot'))continue;
    if(chordFitSlotBlank(cols[i]))run.push(cols[i]);
    else flush();
  }
  flush();
}
/* 幂等还原：清掉上一轮写的所有东西 */
function layoutStrictChordsClear(scope){
  if(!scope||!scope.querySelectorAll)return;
  var a=scope.querySelectorAll('[data-cfgap]'),i;
  for(i=0;i<a.length;i++){
    a[i].style.paddingLeft='';
    a[i].style.paddingRight='';
    a[i].removeAttribute('data-cfgap');
  }
  var m=scope.querySelectorAll('.p-chord-mid');
  for(i=0;i<m.length;i++)m[i].classList.remove('p-chord-mid');
  var n=scope.querySelectorAll('.cf-tight');
  for(i=0;i<n.length;i++)n[i].classList.remove('cf-tight');
}
/* 一行：（可选的）空歌词收紧 + 定对中模式 + 只在真会撞时局部加距离。返回是否动过布局。
   allowTight 省略视为 false —— 收紧要不要做由整首那一层判断，单行调用不擅自收。 */
function layoutStrictChords(row,allowTight){
  if(!row||!row.querySelectorAll)return false;
  var all=row.querySelectorAll('.prev-seg.p-slot');
  if(!all.length)return false;
  var cols=[],i;
  for(i=0;i<all.length;i++)cols.push(all[i]);

  var prevDisp=row.style.display;
  row.style.display='inline-flex';        /* 摊到自然宽再量，免得被容器挤扁量歪 */

  /* 音位序号（小节线/拍号列不算音位） */
  var slotNo=[],sn=0;
  for(i=0;i<cols.length;i++){
    slotNo.push(cols[i].classList.contains('p-barslot')?-1:sn++);
  }
  /* 先收紧「连续空歌词」的那几段：它改列宽，必须排在下面的量之前。
     allowTight 由 layoutStrictChordsAll 按「这行够不够长」给，不长就不收。 */
  if(allowTight)chordFitMarkTightRuns(cols);

  var items=[];
  for(i=0;i<cols.length;i++){
    var ch=cols[i].querySelector('.p-chord');
    if(!ch)continue;
    if((' '+String(ch.className||'')+' ').indexOf(' empty ')>=0)continue;
    if(chordFitIsBlank(ch.textContent||''))continue;
    items.push({col:cols[i],slot:slotNo[i],ch:ch});
  }
  /* 紧邻下一个音位就有和弦 -> 这个和弦退回老版整段整体对中 */
  for(i=0;i<items.length-1;i++){
    if(items[i].slot>=0&&items[i+1].slot-items[i].slot===1){
      items[i].ch.classList.add('p-chord-mid');
    }
  }
  var changed=false,prevR=null,m,need,host,base;
  for(i=0;i<items.length;i++){
    m=chordFitInk(items[i].ch);
    if(prevR!==null&&m.L<prevR+CHORD_FIT_GAP){
      need=prevR+CHORD_FIT_GAP-m.L;
      /* 推前一列的右内边距：本列连同后面所有音位一起右移，音位之间的基础间距不变。
         没有前一列(行首/volta 首列)就推自己的左内边距，效果一样。 */
      host=items[i].col.previousElementSibling;
      if(host&&host.style){
        base=parseFloat(host.style.paddingRight)||0;
        host.style.paddingRight=(base+need).toFixed(2)+'px';
        host.setAttribute('data-cfgap','1');
      }else{
        host=items[i].col;
        base=parseFloat(host.style.paddingLeft)||0;
        host.style.paddingLeft=(base+need).toFixed(2)+'px';
        host.setAttribute('data-cfgap','1');
      }
      changed=true;
      m=chordFitInk(items[i].ch);
    }
    prevR=m.R;
  }
  /* 行首/行尾溢出兜底：让整行的盒子把和弦墨迹整个包住，
     否则 justify 量不到、导出/投影会被裁掉。 */
  if(items.length){
    var rr=row.getBoundingClientRect();
    var over=chordFitInk(items[items.length-1].ch).R-rr.right;
    if(over>0.5){
      host=cols[cols.length-1];
      base=parseFloat(host.style.paddingRight)||0;
      host.style.paddingRight=(base+over).toFixed(2)+'px';
      host.setAttribute('data-cfgap','1');
      changed=true;
    }
    var under=rr.left-chordFitInk(items[0].ch).L;
    if(under>0.5){
      host=cols[0];
      base=parseFloat(host.style.paddingLeft)||0;
      host.style.paddingLeft=(base+under).toFixed(2)+'px';
      host.setAttribute('data-cfgap','1');
      changed=true;
    }
  }
  row.style.display=prevDisp;
  return changed;
}
/* 整首：逐行做「连续空歌词收紧 + 和弦避让」。
   非严格模式(没有 .p-slot)全程 no-op。 */
function layoutStrictChordsAll(scope){
  if(!scope||!scope.querySelectorAll)return false;
  var list=scope.querySelectorAll('.prev-row'),rows=[],i;
  for(i=0;i<list.length;i++){ if(list[i].querySelector('.prev-seg.p-slot'))rows.push(list[i]); }
  if(!rows.length)return false;
  layoutStrictChordsClear(scope);

  /* 先量各行的自然宽（此时还没加任何收紧/避让），用来判断哪些行「确实长」。
     只有拖着整首谱缩小的那些行才值得收紧；位置够的行收了白收，只会显得局促。 */
  var widths=[],maxW=0,prevDisp,w;
  for(i=0;i<rows.length;i++){
    prevDisp=rows[i].style.display;
    rows[i].style.display='inline-flex';
    w=rows[i].offsetWidth;
    rows[i].style.display=prevDisp;
    widths.push(w);
    if(w>maxW)maxW=w;
  }
  var changed=false,longEnough;
  for(i=0;i<rows.length;i++){
    longEnough=(maxW>0&&widths[i]>=maxW*CHORD_FIT_LONG_ROW);
    if(layoutStrictChords(rows[i],longEnough))changed=true;
  }
  return changed;
}
/* 本块要求的 CSS（三个宿主各自带前缀注入，规则文字保持一致）：

  .prev-seg.p-slot .p-chord{min-width:0;width:0;overflow:visible;white-space:pre;
    display:flex;flex-direction:row;justify-content:center;align-items:flex-end;
    font-size:16px;min-height:17px;}
    -- 字号 16px 是严格模式专属（基础 .p-chord 仍是 12px，老格式歌不受影响）。
       和弦零宽之后放大不再撑开列宽，实测 12/14/15/16px 行自然宽恒为同一值，
       代价只是碰撞避让多一两处。用户 2026-08-15 选的 +4。
  .prev-seg.p-slot .p-chord > *{flex:0 0 auto;}
    -- 这条必须有：musiclib 有全局 reset #music-library *{min-width:0}，
       零宽 flex 容器里的 .chord-chip 会被 flex-shrink 压成 0 宽，
       和弦就贴到音符中心右边而不是对中。
  .prev-seg.p-slot .p-chord.p-chord-multi{flex-direction:column;align-items:center;justify-content:flex-end;}
  .prev-seg.p-slot .p-chord .p-chord-head{white-space:pre;}
  .prev-seg.p-slot .p-chord .p-chord-tail{display:inline-block;width:0;min-width:0;overflow:visible;white-space:pre;}
  .prev-seg.p-slot .p-chord.p-chord-mid .p-chord-tail{width:auto;}
  .prev-seg.p-slot.cf-tight{margin-left:0;margin-right:0;min-width:14.4px;}
  .prev-seg.p-slot:has(.jp-aug){margin-right:11px;}
  .prev-seg.p-slot.cf-tight[data-bb]{margin-right:8px;}
    -- 断梁的「断口」就是两列之间的空隙（connectStrictBeams 遇到 data-bb 不连梁）。
       cf-tight 把 margin 归零之后断口跟着变 0，断梁等于白写 —— 前奏/间奏这种
       没歌词的行首当其冲。实测有歌词 8px、收紧后 0px。这条把断口捞回来。
    -- 附点 .jp-aug 是零宽绝对定位(right:-5px)，会贴到下一个音符上（实测间隙
       只剩 3.6px，而正常音符之间是 16.5px），分不清点属于哪个音；给带附点的
       音位补出间距。特异度 (0,4,0) 高于 cf-tight，所以收紧段里也保得住。
    -- 连续 >=4 个空歌词音位的那一段：横向占位收紧约三成（外边距 2px->0、最小列宽 1.2em->0.9em）。
*/
/* ═══════════ CECP-CHORD-FIT v1 END ═══════════ */
/* justifyRows 开关：musictool 预览默认开启，顶栏「⇔ 对齐」按钮可切换对比 */
var justifyRowsOn=true;
/* ── {sp} 编辑器辅助（musictool 专用，禁止反斜杠） ── */
function mtSetPlainText(el,text){el.textContent=String(text||'');}
function mtMakeSpBtn(inp,commit){
  var b=document.createElement('button');
  b.type='button';
  b.className='btn-ins-sp';
  b.textContent='{sp}';
  b.title='在光标处插入 {sp} 占位空格';
  // 按下时不抢焦点：输入框保持聚焦（浮层不收起），光标位置保留
  b.addEventListener('pointerdown',function(e){e.preventDefault();});
  b.onclick=function(){
    var v=inp.value;
    var start=inp.selectionStart,end=inp.selectionEnd;
    if(typeof start!=='number'){start=v.length;end=v.length;}
    inp.value=v.slice(0,start)+SP_TOKEN+v.slice(end);
    if(commit)commit(inp.value);
    inp.focus();
    var pos=start+SP_TOKEN.length;
    if(inp.setSelectionRange)inp.setSelectionRange(pos,pos);
  };
  return b;
}
function mtWrapWithSpBtn(inp,commit){
  var wrap=document.createElement('div');
  wrap.className='sp-wrap';
  wrap.style.cssText='display:flex;align-items:center;gap:2px;position:relative;min-height:23px;';
  wrap.appendChild(inp);
  wrap.appendChild(mtMakeSpBtn(inp,commit));
  return wrap;
}
/* 合法和弦 token 判定（同 CECP-CHORD-STYLE chordStylePitchClass 的思路，禁止反斜杠）：
   根音 A-G 须在 token 开头（允许前置括号），可跟 #/b，
   其后若为小写字母则首字母限 m/s/a/d ——
   排除写在 chord 字段里的 "Fine"/"To Chorus" 等段落标记。 */
function isChordLikeToken(token){
  var s=String(token||'').trim();
  var i=0;
  while(i<s.length&&s.charAt(i)==='(')i++;
  var ch=s.charAt(i);
  if(ch<'A'||ch>'G')return false;
  var j=i+1;
  var nx=s.charAt(j);
  if(nx==='#'||nx==='b')j++;
  var after=s.charAt(j);
  if(after>='a'&&after<='z'&&'msad'.indexOf(after)<0)return false;
  return true;
}
function trChordToken(raw,st,useFlat){
  raw=String(raw||'');
  if(!isChordLikeToken(raw))return raw;
  var m=raw.match(/^([A-G](?:#|b)?)([^A-G]*)(.*)$/);
  if(m&&m[1]&&!m[3]){
    var rest=m[2]||'';
    rest=rest.replace(/\\/\\s*([A-G](?:#|b)?)/g,function(_,bass){return '/'+trKeyName(bass,st,useFlat);});
    return trKeyName(m[1],st,useFlat)+rest;
  }
  return raw.replace(/(^|[^A-Za-z#b])([A-G](?:#|b)?)(maj|min|dim|aug|sus|add|m(?!aj)|[0-9+\\-#b°øº⁰¹²³⁴⁵⁶⁷⁸⁹]*)(\\/\\s*([A-G](?:#|b)?))?(?=$|[^A-Za-z#b])/g,function(_,lead,root,suf,bassPart,bassRoot){
    var out=trKeyName(root,st,useFlat)+(suf||'');
    if(bassPart)out+='/'+trKeyName(bassRoot,st,useFlat);
    return lead+out;
  });
}
function trChordText(ch,st,useFlat){
  if(!ch)return ch;
  return String(ch).split(/([ \\t\\u3164]+)/).map(function(part){
    return /[^\\s\\u3164]/.test(part)?trChordToken(part,st,useFlat):part;
  }).join('');
}
function chordLooksSuspicious(ch){
  var s=String(ch||'').trim();
  if(!s)return false;
  var cleaned=s.replace(/(^|[^A-Za-z#b])([A-G](?:#|b)?)(maj|min|dim|aug|sus|add|m(?!aj)|[0-9+\\-#b°øº⁰¹²³⁴⁵⁶⁷⁸⁹]*)(\\/\\s*([A-G](?:#|b)?))?(?=$|[^A-Za-z#b])/g,' ');
  return /(^|[^A-Za-z])[H-Z](?:#|b)?(?:m|maj|min|sus|dim|aug|add|\\d|\\/|$)/.test(cleaned);
}
function resolveMediaUrl(value,base){
  var v=String(value||'').trim();
  if(!v)return '';
  if(/^(https?:)?\\/\\//i.test(v)||/^data:/i.test(v)||v.charAt(0)==='/')return v;
  return base+encodeURI(v).replace(/#/g,'%23');
}

/* ════════════════════════════════════════
   选择操作
════════════════════════════════════════ */
function clickToken(ti, shiftKey){
  if(shiftKey && selA>=0){
    // 扩展选区
    selB=ti;
  } else {
    // 新选区，单选
    selA=ti; selB=ti;
  }
  curTok=ti; // 游标跟随
  renderEditor(curSi,curLi,true);
  reactivate();
}

function clickEnd(shiftKey){
  if(shiftKey && selA>=0){
    // 扩展到末尾：selB = length（用特殊值表示末尾）
    var toks=getToks();
    selB=toks.length; // 超出 = 末尾游标
  } else {
    clearSel();
  }
  curTok=-1;
  renderEditor(curSi,curLi,true);
  reactivate();
}

/* ════════════════════════════════════════
   插入 / 覆盖
════════════════════════════════════════ */
function appendTok(tok){ insertToks([tok]); }
function setTieSpan(report){
  var input=document.getElementById('tie-span'),raw=input.value,n=Number(raw);
  var valid=/^[0-9]+$/.test(raw)&&Number.isSafeInteger(n)&&n>0;
  input.setCustomValidity(valid?'':'请输入大于 0 的整数');
  if(!valid){if(report){input.reportValidity();input.focus();}return false;}
  tieSpanChoice=n;
  try{localStorage.setItem(MT_TIE_SPAN_KEY,String(n));}catch(e){}
  return true;
}
function appendSpanTie(){if(setTieSpan(true))appendTok(tieSpanChoice===1?'~':'~'+tieSpanChoice);}
function initTieSpan(){
  try{var saved=localStorage.getItem(MT_TIE_SPAN_KEY);if(saved){var n=Number(saved);if(/^[0-9]+$/.test(saved)&&Number.isSafeInteger(n)&&n>0)tieSpanChoice=n;}}catch(e){}
  document.getElementById('tie-span').value=String(tieSpanChoice);
}
/* 导航记号按钮：若插入点前一个 token 是小节线，就合并成「小节线+记号」(如 ||coda)，
   这样任意小节线都能配任意导航记号；否则按老样子单独插入(用各自默认小节线)。 */
function appendNavTok(nav){
  if(curSi<0){ appendTok(nav); return; }
  var toks=getToks();
  var at=(curTok>=0?curTok:toks.length);
  var prev=at>0?toks[at-1]:'';
  var BARS={'|':1,'||':1,'||/':1,'|]':1,'|:':1,':|':1,'|:|':1};
  if(BARS[prev]){
    saveUndo();
    toks[at-1]=prev+nav;
    setToks(toks);
    renderEditor();reactivate();
    return;
  }
  appendTok(nav);
}
function inputSpecial(tok){ insertToks([tok]); }
function appendCustomVolta(){
  var label=prompt('输入房线标签，例如 1.2、1.3、2.3');
  if(!label)return;
  label=String(label).trim();
  if(!label)return;
  appendTok('[v:'+label+']');
}
function appendCustomToken(){
  if(curSi<0){alert('请先点选一个简谱格子');return;}
  var raw=prompt('输入 token（可一次输入多个，用空格分隔）\\n双行简谱示例：1/5 2/5 3/6\\n行内拍号示例：[ts:2/4]');
  if(raw===null)return;
  var toks=String(raw).trim().split(/\\s+/).filter(Boolean);
  if(!toks.length)return;
  insertToks(toks);
}
function appendInlineTimeSignToken(){
  if(curSi<0){alert('请先点选一个简谱格子');return;}
  var raw=prompt('输入行内拍号，例如 2/4、3/4、6/8');
  if(raw===null)return;
  var ts=normalizeTimeSignValue(raw);
  if(!ts){alert('拍号格式请用 2/4、3/4、6/8 这种写法');return;}
  insertToks(['[ts:'+ts+']']);
}
function dualInput(which){
  return document.getElementById(which==='bot'?'dual-bot':'dual-top');
}
function dualDurLabel(v){
  return v==='eighth'?'8分':(v==='16th'?'16分':'4分');
}
function updateDualToolUI(){
  ['quarter','eighth','16th'].forEach(function(k){
    var btn=document.getElementById('dual-dur-'+k);
    if(btn)btn.classList.toggle('on',dualDur===k);
  });
  var dotBtn=document.getElementById('dual-dot-btn');
  if(dotBtn)dotBtn.classList.toggle('on',dualDot);
  var fmBtn=document.getElementById('dual-fermata-btn');
  if(fmBtn)fmBtn.classList.toggle('on',dualFermata);
  var stat=document.getElementById('dual-mode-stat');
  if(stat){
    var txt=dualDurLabel(dualDur);
    if(dualDot)txt+=' +附点';
    if(dualFermata)txt+=' +延长';
    stat.textContent=txt;
  }
}
function setDualDur(v){
  dualDur=v;
  updateDualToolUI();
  refreshDualPreview();
}
function toggleDualDot(){
  dualDot=!dualDot;
  updateDualToolUI();
  refreshDualPreview();
}
function toggleDualFermata(){
  dualFermata=!dualFermata;
  updateDualToolUI();
  refreshDualPreview();
}
function dualPick(which,val){
  var el=dualInput(which);
  if(!el)return;
  el.value=val;
  refreshDualPreview();
}
function clearDualRow(which){
  var el=dualInput(which);
  if(!el)return;
  el.value='';
  refreshDualPreview();
}
function applyDualStyle(base){
  var tok=String(base||'').trim().replace(/\s+/g,'');
  if(!tok)return '';
  if(tok==='-'||tok.indexOf('|')>=0)return tok;
  var isSpace=/^sp/.test(tok);
  var hasDur=/_{1,2}$/.test(tok);
  var hasDot=tok.indexOf('·')>=0;
  var hasFermata=/\^$/.test(tok);
  var out=tok;
  if(!hasDot && dualDot && !isSpace)out+='·';
  if(!hasDur){
    if(dualDur==='eighth')out+='_';
    else if(dualDur==='16th')out+='__';
  }
  if(!hasFermata && dualFermata && !isSpace && out!=='-')out+='^';
  return out;
}
function buildDualToken(){
  var topEl=dualInput('top');
  var botEl=dualInput('bot');
  var topRaw=topEl?String(topEl.value||'').trim():'';
  var botRaw=botEl?String(botEl.value||'').trim():'';
  if(!topRaw&&!botRaw)return '';
  var topTok=applyDualStyle(topRaw||'sp');
  var botTok=applyDualStyle(botRaw||'sp');
  return topTok+'/'+botTok;
}
function applyInlineDualStyle(base){
  var tok=String(base||'').trim().replace(/\s+/g,'');
  if(!tok)return '';
  if(tok==='-'||tok.indexOf('|')>=0)return tok;
  var isSpace=/^sp/.test(tok);
  var hasDur=/_{1,2}$/.test(tok);
  var hasDot=tok.indexOf('·')>=0;
  var hasFermata=/\^$/.test(tok);
  var out=tok;
  if(!hasDot && dotOn && !isSpace)out+='·';
  if(!hasDur){
    if(dur==='eighth')out+='_';
    else if(dur==='16th')out+='__';
  }
  if(!hasFermata && fermataOn && !isSpace && out!=='-')out+='^';
  return out;
}
function buildInlineDualToken(topRaw,botRaw){
  var top=String(topRaw||'').trim();
  var bot=String(botRaw||'').trim();
  if(!top&&!bot)return '';
  return applyInlineDualStyle(top||'sp')+'/'+applyInlineDualStyle(bot||'sp');
}
function inlineShiftOct(step){
  var os=['low2','low1','mid','high1','high2'];
  var i=os.indexOf(oct);
  var ni=i+step;
  if(ni>=0&&ni<os.length)setOct(os[ni]);
}
function inlineApplyBasicToken(inp,key){
  if(/^[0-7]$/.test(key)){inp.value=buildTok(parseInt(key,10));return true;}
  if(key===' '){inp.value=buildSpacerTok();return true;}
  if(key==='\\\\' || key==='-'){inp.value='-';return true;}
  return false;
}
function insertInlineDualToken(si,li,gi,topRaw,botRaw){
  var tok=buildInlineDualToken(topRaw,botRaw);
  if(!tok){alert('请先输入上行或下行音符');return;}
  inlineDualTop=String(topRaw||'').trim()||inlineDualTop;
  inlineDualBot=String(botRaw||'').trim()||inlineDualBot;
  if(curSi!==si||curLi!==li||curGi!==gi){
    curSi=si;curLi=li;curGi=gi;curTok=-1;clearSel();
  }
  insertToks([tok]);
}
function refreshDualPreview(){
  var pv=document.getElementById('dual-preview');
  if(!pv)return;
  var tok=buildDualToken();
  pv.textContent=tok||'（待输入）';
}
function insertDualToken(){
  if(curSi<0){alert('请先点选一个简谱格子');return;}
  var tok=buildDualToken();
  if(!tok){alert('请先输入上行或下行音符');return;}
  insertToks([tok]);
}
function clearDualBuilder(){
  var topEl=dualInput('top');
  var botEl=dualInput('bot');
  if(topEl)topEl.value='1';
  if(botEl)botEl.value='5';
  dualDur='quarter';
  dualDot=false;
  dualFermata=false;
  updateDualToolUI();
  refreshDualPreview();
}
function initDualBuilder(){
  var topEl=dualInput('top');
  var botEl=dualInput('bot');
  if(topEl&&!topEl.value)topEl.value='1';
  if(botEl&&!botEl.value)botEl.value='5';
  [topEl,botEl].forEach(function(el){
    if(!el)return;
    el.addEventListener('input',refreshDualPreview);
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        e.preventDefault();
        insertDualToken();
      }
    });
  });
  updateDualToolUI();
  refreshDualPreview();
}

function insertToks(tokArr){
  if(curSi<0)return;
  saveUndo();
  var toks=getToks();
  var range=getSelRange();

  if(range){
    // 有选区：替换选区内容
    var hi=Math.min(range.hi, toks.length-1);
    var lo=range.lo;
    toks.splice(lo, hi-lo+1, ...tokArr);
    curTok=lo+tokArr.length; if(curTok>=toks.length)curTok=-1;
    clearSel();
  } else if(inputMode==='overwrite' && curTok>=0 && curTok<toks.length){
    // 覆盖单个
    toks.splice(curTok,1,...tokArr);
    curTok=curTok+tokArr.length; if(curTok>=toks.length)curTok=-1;
  } else if(curTok>=0 && curTok<toks.length){
    // 插入在游标前
    toks.splice(curTok,0,...tokArr);
    curTok=curTok+tokArr.length;
  } else {
    // 追加到末尾
    toks.push(...tokArr);
    curTok=-1;
  }
  setToks(toks);
  renderEditor(curSi,curLi);
  reactivate();
  updateInputState();
}

function inputNote(n){
  var tok=buildTok(n);
  if(n!==0 && accidental) accidental='';
  var extra=[];
  if(n!==0 && dur==='whole'){extra=['-','-','-'];}
  else if(n!==0 && dur==='half'){extra=['-'];}
  insertToks([tok,...extra]);
  syncAccidentalUI();
}

function deleteSelected(){
  if(curSi<0)return;
  saveUndo();
  var toks=getToks();
  var range=getSelRange();
  if(range){
    var hi=Math.min(range.hi, toks.length-1);
    var lo=range.lo;
    toks.splice(lo, hi-lo+1);
    curTok=toks.length===0?-1:Math.min(lo,toks.length-1);
    clearSel();
  } else if(curTok>=0 && curTok<toks.length){
    toks.splice(curTok,1);
    if(toks.length===0)curTok=-1;
    else curTok=Math.min(curTok,toks.length-1);
  } else {
    toks.pop();
    curTok=-1;
  }
  setToks(toks);
  renderEditor(curSi,curLi);
  reactivate();
  updateInputState();
}

function clearN(){
  if(curSi<0)return;
  saveUndo();
  data[curSi].lines[curLi].segs[curGi].n='';
  curTok=-1; clearSel();
  renderEditor(curSi,curLi); reactivate();
}

/* ════════════════════════════════════════
   复制 / 剪切 / 粘贴
════════════════════════════════════════ */
function copyToks(){
  if(curSi<0)return;
  var toks=getToks();
  var range=getSelRange();
  if(range){
    var hi=Math.min(range.hi,toks.length-1);
    tokClipboard=toks.slice(range.lo,hi+1);
  } else if(curTok>=0&&curTok<toks.length){
    tokClipboard=[toks[curTok]];
  }
  updateStatus();
}
function cutToks(){copyToks();deleteSelected();}
function pasteToks(){
  if(tokClipboard.length)insertToks(tokClipboard.slice());
}
/* ── 格子多选（Shift+点击同一行的另一个格子） ── */
var segSelAnchor=-1, segSelEnd=-1;
function getSegSelRange(){
  if(segSelAnchor<0||segSelEnd<0)return null;
  return {lo:Math.min(segSelAnchor,segSelEnd),hi:Math.max(segSelAnchor,segSelEnd)};
}
function clearSegSel(){segSelAnchor=-1;segSelEnd=-1;}
function segSelectTo(gi){
  if(curSi<0)return;
  if(segSelAnchor<0)segSelAnchor=curGi;
  segSelEnd=gi;
  markSegSel();
  updateStatus();
}
function markSegSel(){
  document.querySelectorAll('.seg-row-sel').forEach(function(el){el.classList.remove('seg-row-sel');});
  var r=getSegSelRange();
  if(!r||curSi<0)return;
  for(var g=r.lo;g<=r.hi;g++){
    var row=document.querySelector('.seg-row[data-loc="'+curSi+'-'+curLi+'-'+g+'"]');
    if(row)row.classList.add('seg-row-sel');
  }
}
/* segClipboard 现在是数组：单格 = 长度 1 */
function copySeg(){
  if(curSi<0)return;
  var segs=data[curSi].lines[curLi].segs;
  var r=getSegSelRange();
  if(r){
    var hi=Math.min(r.hi,segs.length-1);
    segClipboard=JSON.parse(JSON.stringify(segs.slice(r.lo,hi+1)));
  }else{
    segClipboard=JSON.parse(JSON.stringify([segs[curGi]]));
  }
  updateStatus();
}
function cutSeg(){
  if(curSi<0)return;
  copySeg();
  saveUndo();
  var segs=data[curSi].lines[curLi].segs;
  var r=getSegSelRange();
  if(r){
    var hi=Math.min(r.hi,segs.length-1);
    segs.splice(r.lo,hi-r.lo+1);
    clearSegSel();
    if(segs.length){curGi=Math.min(r.lo,segs.length-1);renderEditor();reactivate();}
    else{curSi=-1;curLi=-1;curGi=-1;renderEditor();updateStatus();}
  }else{
    segs.splice(curGi,1);
    if(segs.length){curGi=Math.min(curGi,segs.length-1);renderEditor();reactivate();}
    else{curSi=-1;curLi=-1;curGi=-1;renderEditor();updateStatus();}
  }
}
function pasteSeg(){
  if(!segClipboard||!segClipboard.length||curSi<0)return;
  saveUndo();
  var copies=JSON.parse(JSON.stringify(segClipboard));
  // 粘贴到当前格子后面
  var segs=data[curSi].lines[curLi].segs;
  Array.prototype.splice.apply(segs,[curGi+1,0].concat(copies));
  curGi=curGi+copies.length;
  clearSegSel();
  renderEditor();reactivate();
}
function pasteSegReplace(){
  if(!segClipboard||!segClipboard.length||curSi<0)return;
  saveUndo();
  var copies=JSON.parse(JSON.stringify(segClipboard));
  var segs=data[curSi].lines[curLi].segs;
  var r=getSegSelRange();
  var lo=r?r.lo:curGi;
  var cnt=r?(Math.min(r.hi,segs.length-1)-r.lo+1):1;
  Array.prototype.splice.apply(segs,[lo,cnt].concat(copies));
  curGi=Math.min(lo+copies.length-1,segs.length-1);
  clearSegSel();
  renderEditor();reactivate();
}

/* ════════════════════════════════════════
   游标移动
════════════════════════════════════════ */
function moveCursor(dir){
  if(curSi<0)return;
  clearSel();
  var toks=getToks();
  if(dir==='left'){
    if(curTok===-1)curTok=toks.length>0?toks.length-1:-1;
    else if(curTok>0)curTok--;
  } else {
    if(curTok>=0&&curTok<toks.length-1)curTok++;
    else curTok=-1;
  }
  renderEditor(curSi,curLi,true); reactivate();
}

/* ════════════════════════════════════════
   focusSeg + 状态栏
════════════════════════════════════════ */
function focusSeg(si,li,gi,reset){
  if(reset||(si!==curSi||li!==curLi||gi!==curGi)){curTok=-1;clearSel();clearSegSel();markSegSel();}
  curSi=si;curLi=li;curGi=gi;
  reactivate();
  updateStatus();
  updateInputState();
}

function reactivate(){
  document.querySelectorAll('.tok-field').forEach(function(el){el.classList.remove('n-active');});
  if(curSi<0)return;
  var f=document.querySelector('.tok-field[data-key="'+curSi+'-'+curLi+'-'+curGi+'"]');
  if(f)f.classList.add('n-active');
  updateStatus();
}

function updateStatus(){
  var loc=document.getElementById('statusLoc');
  var sel=document.getElementById('statusSel');
  var tip=document.getElementById('statusTip');
  var selectStat=document.getElementById('is-select');
  var clipStat=document.getElementById('is-clip');
  var segClipTxt=(segClipboard&&segClipboard.length)?segClipboard.length+' 格':(tokClipboard.length?tokClipboard.length+' 项':'空');
  if(curSi<0){
    loc.textContent='点击左边格子开始编辑';
    sel.textContent=''; tip.textContent='';
    if(selectStat)selectStat.textContent='0';
    if(clipStat)clipStat.textContent=segClipTxt;
    return;
  }
  loc.textContent=data[curSi].name+' 行'+(curLi+1)+' 格'+(curGi+1);
  var segRange=getSegSelRange();
  var range=getSelRange();
  var toks=getToks();
  if(segRange){
    var scnt=segRange.hi-segRange.lo+1;
    sel.textContent='已选 '+scnt+' 格';
    tip.textContent='Alt+C复制 Alt+X剪切 Alt+R覆盖替换 | Esc取消';
    if(selectStat)selectStat.textContent=String(scnt);
  } else if(range){
    var cnt=Math.min(range.hi,toks.length-1)-range.lo+1;
    sel.textContent='已选 '+cnt+' 个';
    tip.textContent='⌘C复制 ⌘X剪切 ⌘V粘贴 | Alt+C/V/R 格子操作';
    if(selectStat)selectStat.textContent=String(cnt);
  } else if(segClipboard&&segClipboard.length){
    sel.textContent='已复制 '+segClipboard.length+' 格';
    tip.textContent='Alt+V插到后面 Alt+R覆盖当前 | 剪贴板: '+(tokClipboard.length?tokClipboard.join(' '):'空');
    if(selectStat)selectStat.textContent='0';
  } else if(tokClipboard.length){
    sel.textContent='';
    tip.textContent='剪贴板: '+tokClipboard.join(' ');
    if(selectStat)selectStat.textContent='0';
  } else {
    sel.textContent=''; tip.textContent='Alt+C 复制格子 · Shift+点击另一格可多选';
    if(selectStat)selectStat.textContent='0';
  }
  if(clipStat){
    clipStat.textContent=segClipTxt;
  }
}

/* ════════════════════════════════════════
   设置函数
════════════════════════════════════════ */
function setInputMode(m){
  inputMode=m;
  document.getElementById('mode-insert').classList.toggle('on',m==='insert');
  document.getElementById('mode-overwrite').classList.toggle('on',m==='overwrite');
}
function setOct(o){
  oct=o;
  ['low2','low1','mid','high1','high2'].forEach(function(x){document.getElementById('oct-'+x).classList.toggle('on',x===o);});
  updateInputState();
}
function setDur(d){
  dur=d;
  ['whole','half','quarter','eighth','16th'].forEach(function(x){document.getElementById('dur-'+x).classList.toggle('on',x===d);});
  updateInputState();
}
function syncAccidentalUI(){
  var ids={ '#':'acc-sharp', b:'acc-flat', '=':'acc-natural' };
  Object.keys(ids).forEach(function(k){
    var btn=document.getElementById(ids[k]);
    if(btn)btn.classList.toggle('on',accidental===k);
  });
}
function setAccidental(v){
  accidental=accidental===v?'':v;
  syncAccidentalUI();
}
function syncToggleUI(){
  var dotBtn=document.getElementById('dot-btn');
  if(dotBtn){
    dotBtn.classList.toggle('on',dotOn);
    dotBtn.innerHTML='· 附点 '+(dotOn?'开':'关')+'<span class="shortcut">,</span>';
  }
  var fermataBtn=document.getElementById('fermata-btn');
  if(fermataBtn){
    fermataBtn.classList.toggle('on',fermataOn);
    fermataBtn.innerHTML='𝄐 延长号 '+(fermataOn?'开':'关')+'<span class="shortcut">F</span>';
  }
  var dotPill=document.getElementById('is-dot-pill');
  if(dotPill){
    dotPill.classList.toggle('active',dotOn);
    dotPill.innerHTML='附点 <strong id="is-dot">'+(dotOn?'开':'关')+'</strong>';
  }
  var fermataPill=document.getElementById('is-fermata-pill');
  if(fermataPill){
    fermataPill.classList.toggle('active',fermataOn);
    fermataPill.innerHTML='延长号 <strong id="is-fermata">'+(fermataOn?'开':'关')+'</strong>';
  }
}
function toggleDot(){dotOn=!dotOn;syncToggleUI();updateInputState();}
function toggleFermata(){fermataOn=!fermataOn;syncToggleUI();updateInputState();}
function toggleXSlur(){
  xslurOn=!xslurOn;
  document.getElementById('xslur-btn').classList.toggle('on',xslurOn);
  if(xslurOn)appendTok('([');
}
function closeXSlur(){xslurOn=false;document.getElementById('xslur-btn').classList.remove('on');appendTok('])'); }
function toggleSlur(){
  slurOn=!slurOn;
  document.getElementById('slur-btn').classList.toggle('on',slurOn);
  appendTok(slurOn?'(':')');
}
function refreshTupletBtns(){
  document.getElementById('t3-btn').classList.toggle('on',tupletOn===3);
  document.getElementById('t5-btn').classList.toggle('on',tupletOn===5);
}
function toggleTuplet(n){
  if(tupletOn===n){tupletOn=0;refreshTupletBtns();appendTok('}');return;}
  if(tupletOn!==0)appendTok('}');
  tupletOn=n;refreshTupletBtns();appendTok('{'+n);
}
function buildTok(n){
  var s=''+n;
  if(n!==0){
    if(accidental)s=accidental+s;
    if(oct==='high1')s+="'";else if(oct==='high2')s+="''";
    else if(oct==='low1')s+=',';else if(oct==='low2')s+=',,';
  }
  if(dotOn)s+='·';
  if(dur==='eighth')s+='_';else if(dur==='16th')s+='__';
  if(fermataOn)s+='^';
  return s;
}
function buildSpacerTok(){
  var s='sp';if(dur==='eighth')s+='_';else if(dur==='16th')s+='__';return s;
}

/* ════════════════════════════════════════
   渲染编辑器
════════════════════════════════════════ */
// 拖动状态
var dragSrc={si:-1,li:-1,gi:-1};
// 拖完统一收回 draggable（替代每次 mousedown 挂 once 监听）
document.addEventListener('dragend',function(){
  document.querySelectorAll('.seg-row[draggable="true"]').forEach(function(r){r.draggable=false;});
});

function renderEditor(onlySi,onlyLi,skipPreview){
  var wrap=document.getElementById('sectionsWrap');
  var _keepScroll=wrap.scrollTop;
  var oldRow=typeof onlySi==='number'&&typeof onlyLi==='number'?wrap.querySelector('.row-block[data-row="'+onlySi+'-'+onlyLi+'"]'):null;
  var partial=!!(oldRow&&data[onlySi]&&data[onlySi].lines[onlyLi]);
  if(!partial)wrap.innerHTML='';
  data.forEach(function(sec,si){
    if(partial&&si!==onlySi)return;
    var sb=partial?oldRow.parentNode:document.createElement('div');
    if(!partial){sb.className='sec-block';
    sb.setAttribute('data-si',si);
    var sh=document.createElement('div');sh.className='sec-head';
    sh.innerHTML='<input class="sec-name-input" value="'+esc(sec.name)+'" oninput="data['+si+'].name=this.value;schedulePreview('+si+',-1)">'+
      '<button class="sec-btn" onclick="addLine('+si+')">+行</button>'+
      '<button class="sec-btn" onclick="moveSection('+si+',-1)" title="段落上移"'+(si===0?' disabled':'')+'>↑</button>'+
      '<button class="sec-btn" onclick="moveSection('+si+',1)" title="段落下移"'+(si===data.length-1?' disabled':'')+'>↓</button>'+
      '<button class="sec-btn del" onclick="delSection('+si+')">删</button>';
    sb.appendChild(sh);
    }

    sec.lines.forEach(function(line,li){
      if(partial&&li!==onlyLi)return;
      var rb=document.createElement('div');rb.className='row-block'+(line.segs.length?'':' row-empty');
      rb.setAttribute('data-row',si+'-'+li);
      var rm=document.createElement('div');rm.className='row-meta';
      rm.innerHTML='<span class="row-idx">ROW '+(li+1)+'</span>'+
        (line.segs.length?'':'<span class="row-empty-tag">空行</span>')+
        '<label class="bold-toggle"><input type="checkbox" '+(line.bold?'checked':'')+' onchange="data['+si+'].lines['+li+'].bold=this.checked;schedulePreview('+si+','+li+')"> 副歌</label>'+
        '<button class="sec-btn" onclick="moveLine('+si+','+li+',-1)" title="上移"'+(li===0?' disabled':'')+'>↑</button>'+
        '<button class="sec-btn" onclick="moveLine('+si+','+li+',1)" title="下移"'+(li===sec.lines.length-1?' disabled':'')+'>↓</button>'+
        '<button class="row-del" onclick="delLine('+si+','+li+')">✕</button>';
      rb.appendChild(rm);

      var tbl=document.createElement('table');tbl.className='seg-table';
      tbl.innerHTML='<tr><th style="width:16px;"></th><th style="width:64px;">和弦</th><th>简谱</th><th style="width:76px;">歌词</th><th style="width:34px;"></th></tr>';

      line.segs.forEach(function(seg,gi){
        var key=si+'-'+li+'-'+gi;
        var isActive=(si===curSi&&li===curLi&&gi===curGi);
        var tr=document.createElement('tr');
        tr.className='seg-row';
        tr.setAttribute('data-loc',key);

        // 拖动
        tr.addEventListener('dragstart',function(e){
          dragSrc={si:si,li:li,gi:gi};
          tr.classList.add('dragging');
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setData('text/plain','');
        });
        tr.addEventListener('dragend',function(){
          tr.classList.remove('dragging');
          document.querySelectorAll('.seg-row').forEach(function(r){r.classList.remove('drag-over');});
        });
        tr.addEventListener('dragover',function(e){
          e.preventDefault();e.dataTransfer.dropEffect='move';
          tr.classList.add('drag-over');
        });
        tr.addEventListener('dragleave',function(){tr.classList.remove('drag-over');});
        tr.addEventListener('drop',function(e){
          e.preventDefault();tr.classList.remove('drag-over');
          if(dragSrc.si<0||dragSrc.si!==si||dragSrc.li!==li||dragSrc.gi===gi)return;
          saveUndo();
          var segs=data[si].lines[li].segs;
          var item=segs.splice(dragSrc.gi,1)[0];
          var tgi=gi>dragSrc.gi?gi-1:gi;
          segs.splice(tgi,0,item);
          if(curSi===si&&curLi===li&&curGi===dragSrc.gi){
            for(var i=0;i<segs.length;i++){if(segs[i]===item)curGi=i;}
          }
          dragSrc={si:-1,li:-1,gi:-1};
          renderEditor();if(curSi>=0)reactivate();
        });

        // 手柄
        var tdH=document.createElement('td');
        var h=document.createElement('span');h.className='drag-handle';h.textContent='⠿';h.title='拖动排序';
        tr.draggable=false;
        h.addEventListener('mousedown',function(){tr.draggable=true;});
        h.addEventListener('mouseup',function(){tr.draggable=false;});
        tdH.appendChild(h);tr.appendChild(tdH);

        // 段落标记行（label 块专属 UI）
        if(segIsLabelBlock(seg)){
          tr.className='seg-row seg-row-label';
          var tdLab=document.createElement('td');tdLab.colSpan=3;
          var wrapLab=document.createElement('div');
          wrapLab.style.cssText='display:flex;align-items:center;gap:6px;padding:2px 0;';
          var pill=document.createElement('span');
          pill.textContent=String(seg.label||'')||'标记';
          var pillColor=secLabelColor(seg.label);
          if(seg.style==='jump'){
            pill.style.cssText='flex:none;font-size:9px;font-weight:600;font-style:italic;letter-spacing:0.4px;color:'+pillColor+';border:1px solid '+pillColor+';background:transparent;padding:0 7px;border-radius:999px;line-height:1.5;';
          }else{
            pill.style.cssText='flex:none;font-size:9px;font-weight:700;letter-spacing:0.4px;color:#ffffff;border:1px solid '+pillColor+';background:'+pillColor+';padding:0 7px;border-radius:999px;line-height:1.5;';
          }
          var inpLab=document.createElement('input');
          inpLab.value=seg.label||'';
          inpLab.setAttribute('list','secLabelPresets');
          inpLab.placeholder='标记文字…';
          inpLab.style.cssText='max-width:110px;';
          inpLab.oninput=(function(si,li,gi,pill){return function(){
            data[si].lines[li].segs[gi].label=this.value;
            pill.textContent=this.value||'标记';
            var c=secLabelColor(this.value);
            if(data[si].lines[li].segs[gi].style!=='jump'){pill.style.background=c;pill.style.borderColor=c;}
            else{pill.style.color=c;pill.style.borderColor=c;}
            schedulePreview(si,li);
          };})(si,li,gi,pill);
          var jmpWrap=document.createElement('label');
          jmpWrap.style.cssText='display:flex;align-items:center;gap:3px;font-size:9px;color:var(--ink3);cursor:pointer;white-space:nowrap;flex:none;';
          var jmpCb=document.createElement('input');
          jmpCb.type='checkbox';
          jmpCb.checked=seg.style==='jump';
          jmpCb.style.cssText='width:auto;margin:0;';
          jmpCb.onchange=(function(si,li,gi){return function(){
            saveUndo();
            if(this.checked)data[si].lines[li].segs[gi].style='jump';
            else delete data[si].lines[li].segs[gi].style;
            renderEditor();
          };})(si,li,gi);
          jmpWrap.appendChild(jmpCb);
          jmpWrap.appendChild(document.createTextNode('跳转样式'));
          // 横向偏移（px，可负；不影响锚点格子，只微调标记位置）
          var dxWrap=document.createElement('label');
          dxWrap.style.cssText='display:flex;align-items:center;gap:3px;font-size:9px;color:var(--ink3);white-space:nowrap;flex:none;';
          dxWrap.appendChild(document.createTextNode('偏移'));
          var dxInp=document.createElement('input');
          dxInp.type='number';
          dxInp.step='5';
          dxInp.placeholder='0';
          dxInp.value=(seg.dx!=null&&seg.dx!=='')?seg.dx:'';
          dxInp.title='标记横向偏移（px，正右负左；也可先用拖动/▲▼换锚点格子再微调）';
          dxInp.style.cssText='width:56px;';
          dxInp.oninput=(function(si,li,gi){return function(){
            var v=Number(this.value);
            if(this.value===''||isNaN(v)||v===0)delete data[si].lines[li].segs[gi].dx;
            else data[si].lines[li].segs[gi].dx=v;
            schedulePreview(si,li);
          };})(si,li,gi);
          dxWrap.appendChild(dxInp);
          dxWrap.appendChild(document.createTextNode('px'));
          wrapLab.appendChild(pill);
          wrapLab.appendChild(inpLab);
          wrapLab.appendChild(jmpWrap);
          wrapLab.appendChild(dxWrap);
          tdLab.appendChild(wrapLab);tr.appendChild(tdLab);
          var tdDelLab=document.createElement('td');
          var delWrapLab=document.createElement('div');delWrapLab.className='seg-del-wrap';
          delWrapLab.appendChild(mkSegVCol(si,li,gi));
          var btnDelLab=document.createElement('button');btnDelLab.className='btn-del-seg';btnDelLab.textContent='✕';
          btnDelLab.onclick=(function(si,li,gi){return function(){saveUndo();delSeg(si,li,gi);};})(si,li,gi);
          delWrapLab.appendChild(btnDelLab);
          tdDelLab.appendChild(delWrapLab);tr.appendChild(tdDelLab);
          tbl.appendChild(tr);
          return;
        }

        // 和弦
        var tdC=document.createElement('td');
        var inpC=document.createElement('input');inpC.className='inp-chord'+(chordLooksSuspicious(seg.chord)?' warn':'');inpC.value=seg.chord||'';
        if(chordLooksSuspicious(seg.chord))inpC.title='这个和弦可能无法识别，导出仍会保留原文';
        inpC.oninput=(function(si,li,gi){return function(){data[si].lines[li].segs[gi].chord=this.value;schedulePreview(si,li);};})(si,li,gi);
        tdC.appendChild(mtWrapWithSpBtn(inpC,(function(si,li,gi){return function(v){data[si].lines[li].segs[gi].chord=v;schedulePreview(si,li);};})(si,li,gi)));tr.appendChild(tdC);

        // token field
        var tdN=document.createElement('td');
        var tf=document.createElement('div');
        tf.className='tok-field'+(isActive?' n-active':'');
        tf.setAttribute('data-key',key);
        tf.onclick=(function(si,li,gi){return function(e){
          if(e.target===tf){
            if(e.shiftKey&&curSi===si&&curLi===li&&curGi!==gi){segSelectTo(gi);return;}
            if(curSi===si&&curLi===li&&curGi===gi)clickEnd(e.shiftKey);
            else focusSeg(si,li,gi,true);
          }
        };})(si,li,gi);
        if(seg.n&&seg.n.trim()){
          seg.n.trim().split(/\\s+/).forEach(function(tok,ti){
            var chip=document.createElement('span');
            var classes='tok-chip';
            if(isActive){
              var range=getSelRange();
              if(range&&ti>=range.lo&&ti<=Math.min(range.hi,seg.n.trim().split(/\\s+/).length-1))classes+=' sel';
              if(curTok===ti)classes+=' cursor';
            }
            chip.className=classes;chip.textContent=tok;
            chip.onclick=(function(si,li,gi,ti){return function(e){
              e.stopPropagation();
              if(e.shiftKey&&curSi===si&&curLi===li&&curGi!==gi){segSelectTo(gi);return;}
              if(curSi===si&&curLi===li&&curGi===gi)clickToken(ti,e.shiftKey);
              else{curSi=si;curLi=li;curGi=gi;selA=ti;selB=ti;curTok=ti;renderEditor();reactivate();}
            };})(si,li,gi,ti);
            tf.appendChild(chip);
          });
        }
        var endSpan=document.createElement('span');
        endSpan.className='tok-end'+(isActive&&curTok===-1?' cursor':'');
        endSpan.textContent='▏';
        endSpan.onclick=(function(si,li,gi){return function(e){
          e.stopPropagation();
          if(e.shiftKey&&curSi===si&&curLi===li&&curGi!==gi){segSelectTo(gi);return;}
          if(curSi===si&&curLi===li&&curGi===gi)clickEnd(e.shiftKey);
          else focusSeg(si,li,gi,true);
        };})(si,li,gi);
        tf.appendChild(endSpan);
        tdN.appendChild(tf);
        var dq=document.createElement('div');
        dq.className='tok-dual-inline'+(isActive?' on':'');
        var dql=document.createElement('span');dql.className='lbl';dql.textContent='上下';
        dq.appendChild(dql);
        var dinTop=document.createElement('input');dinTop.className='in';dinTop.placeholder='上';dinTop.value=inlineDualTop;
        dinTop.readOnly=true;
        var slash=document.createElement('span');slash.className='slash';slash.textContent='/';
        var dinBot=document.createElement('input');dinBot.className='in';dinBot.placeholder='下';dinBot.value=inlineDualBot;
        dinBot.readOnly=true;
        var dqbtn=document.createElement('button');dqbtn.className='btn';dqbtn.textContent='+双行';
        [dinTop,dinBot].forEach(function(el){
          el.addEventListener('click',function(e){e.stopPropagation();if(!isActive)focusSeg(si,li,gi,true);});
          el.addEventListener('keydown',function(e){
            var k=e.key;
            if(k==='Enter'){
              e.preventDefault();e.stopPropagation();
              insertInlineDualToken(si,li,gi,dinTop.value,dinBot.value);
              return;
            }
            if(k==='Backspace' || k==='Delete'){
              e.preventDefault();e.stopPropagation();
              el.value='';
              inlineDualTop=dinTop.value;inlineDualBot=dinBot.value;
              return;
            }
            if(e.metaKey||e.ctrlKey||e.altKey)return;
            if(inlineApplyBasicToken(el,k)){
              e.preventDefault();e.stopPropagation();
              inlineDualTop=dinTop.value;inlineDualBot=dinBot.value;
              return;
            }
            if(k==='ArrowUp'){e.preventDefault();e.stopPropagation();inlineShiftOct(1);return;}
            if(k==='ArrowDown'){e.preventDefault();e.stopPropagation();inlineShiftOct(-1);return;}
            if(k==='q'||k==='Q'){e.preventDefault();e.stopPropagation();setDur('whole');return;}
            if(k==='w'||k==='W'){e.preventDefault();e.stopPropagation();setDur('half');return;}
            if(k==='e'||k==='E'){e.preventDefault();e.stopPropagation();setDur('quarter');return;}
            if(k==='r'||k==='R'){e.preventDefault();e.stopPropagation();setDur('eighth');return;}
            if(k==='t'||k==='T'){e.preventDefault();e.stopPropagation();setDur('16th');return;}
            if(k===','){e.preventDefault();e.stopPropagation();toggleDot();return;}
            if(k==='f'||k==='F'){e.preventDefault();e.stopPropagation();toggleFermata();return;}
            if(k.length===1){
              e.preventDefault();e.stopPropagation();
              return;
            }
          });
        });
        dqbtn.onclick=(function(si,li,gi){return function(e){
          e.preventDefault();e.stopPropagation();
          insertInlineDualToken(si,li,gi,dinTop.value,dinBot.value);
        };})(si,li,gi);
        dq.appendChild(dinTop);dq.appendChild(slash);dq.appendChild(dinBot);dq.appendChild(dqbtn);
        tdN.appendChild(dq);
        var tsWrap=document.createElement('div');
        tsWrap.className='tok-meta-inline';
        var tsLbl=document.createElement('span');tsLbl.className='lbl';tsLbl.textContent='拍号';
        var tsInp=document.createElement('input');tsInp.className='in';tsInp.placeholder='2/4';tsInp.value=seg.timeSign||seg.ts||seg.meter||'';
        tsInp.oninput=(function(si,li,gi){return function(){
          setSegInlineTimeSign(data[si].lines[li].segs[gi],this.value);
          schedulePreview(si,li);
        };})(si,li,gi);
        tsWrap.appendChild(tsLbl);tsWrap.appendChild(tsInp);
        tdN.appendChild(tsWrap);
        tr.appendChild(tdN);

        // 歌词（上行 + 可选下行）
        var tdL=document.createElement('td');tdL.style.cssText='vertical-align:middle;';
        var inpL=document.createElement('input');inpL.className='inp-lyric';inpL.value=seg.lyric||'';
        inpL.style.display='block';
        inpL.oninput=(function(si,li,gi){return function(){data[si].lines[li].segs[gi].lyric=this.value;schedulePreview(si,li);};})(si,li,gi);
        tdL.appendChild(mtWrapWithSpBtn(inpL,(function(si,li,gi){return function(v){data[si].lines[li].segs[gi].lyric=v;schedulePreview(si,li);};})(si,li,gi)));
        var inpL2=document.createElement('input');inpL2.className='inp-lyric';inpL2.value=seg.lyric2||'';
        inpL2.placeholder='下行…';inpL2.style.cssText='display:block;margin-top:2px;font-size:9px;opacity:0.7;';
        inpL2.oninput=(function(si,li,gi){return function(){data[si].lines[li].segs[gi].lyric2=this.value;schedulePreview(si,li);};})(si,li,gi);
        tdL.appendChild(mtWrapWithSpBtn(inpL2,(function(si,li,gi){return function(v){data[si].lines[li].segs[gi].lyric2=v;schedulePreview(si,li);};})(si,li,gi)));
        var inpL3=document.createElement('input');inpL3.className='inp-lyric';inpL3.value=seg.lyric3||'';
        inpL3.placeholder='第三行…';inpL3.style.cssText='display:block;margin-top:2px;font-size:9px;opacity:0.7;';
        inpL3.oninput=(function(si,li,gi){return function(){data[si].lines[li].segs[gi].lyric3=this.value;schedulePreview(si,li);};})(si,li,gi);
        tdL.appendChild(mtWrapWithSpBtn(inpL3,(function(si,li,gi){return function(v){data[si].lines[li].segs[gi].lyric3=v;schedulePreview(si,li);};})(si,li,gi)));
        var inpL4=document.createElement('input');inpL4.className='inp-lyric';inpL4.value=seg.lyric4||'';
        inpL4.placeholder='第四行…';inpL4.style.cssText='display:block;margin-top:2px;font-size:9px;opacity:0.7;';
        inpL4.oninput=(function(si,li,gi){return function(){data[si].lines[li].segs[gi].lyric4=this.value;schedulePreview(si,li);};})(si,li,gi);
        tdL.appendChild(mtWrapWithSpBtn(inpL4,(function(si,li,gi){return function(v){data[si].lines[li].segs[gi].lyric4=v;schedulePreview(si,li);};})(si,li,gi)));tr.appendChild(tdL);

        // 删除 + 上下移
        var tdD=document.createElement('td');
        var delWrap=document.createElement('div');delWrap.className='seg-del-wrap';
        delWrap.appendChild(mkSegVCol(si,li,gi));
        var btnD=document.createElement('button');btnD.className='btn-del-seg';btnD.textContent='✕';
        btnD.onclick=(function(si,li,gi){return function(){saveUndo();delSeg(si,li,gi);};})(si,li,gi);
        delWrap.appendChild(btnD);
        tdD.appendChild(delWrap);tr.appendChild(tdD);
        tbl.appendChild(tr);
      });

      // + 格子
      var trAdd=document.createElement('tr');
      var tdAdd=document.createElement('td');tdAdd.colSpan=5;tdAdd.style.paddingTop='3px';
      var ab=document.createElement('button');ab.className='btn-add-seg';ab.textContent='+ 格子';
      ab.onclick=(function(si,li){return function(){saveUndo();addSeg(si,li);};})(si,li);
      tdAdd.appendChild(ab);
      var albBtn=document.createElement('button');albBtn.className='btn-add-seg';albBtn.textContent='+ 段落标记';albBtn.style.marginLeft='10px';
      albBtn.title='插入段落标记（Chorus / Bridge…），插入后可改文字、拖动排序';
      albBtn.onclick=(function(si,li){return function(){saveUndo();addLabelSeg(si,li);};})(si,li);
      tdAdd.appendChild(albBtn);
      trAdd.appendChild(tdAdd);tbl.appendChild(trAdd);

      rb.appendChild(tbl);
      if(partial)oldRow.replaceWith(rb);else sb.appendChild(rb);
    });

    if(!partial){
    var arb=document.createElement('button');arb.className='add-row-btn';arb.textContent='+ 新行';
    arb.onclick=(function(si){return function(){saveUndo();addLine(si);};})(si);
    sb.appendChild(arb);
    wrap.appendChild(sb);
    }
  });
  wrap.scrollTop=_keepScroll;
  segSearchRefresh();
  markSegSel();
  if(!skipPreview){if(partial)schedulePreview(onlySi,onlyLi);else renderPreview();}
}

/* ▲▼ 格子上下移动按钮列 */
function mkSegVCol(si,li,gi){
  var col=document.createElement('span');col.className='seg-vcol';
  var segCnt=data[si].lines[li].segs.length;
  var up=document.createElement('button');up.className='btn-seg-vert';up.textContent='▲';up.title='上移一格（行首时移到上一行末尾）';up.type='button';
  if(li===0&&gi===0)up.disabled=true;
  up.onclick=(function(si,li,gi){return function(e){e.stopPropagation();moveSegVert(si,li,gi,-1);};})(si,li,gi);
  var dn=document.createElement('button');dn.className='btn-seg-vert';dn.textContent='▼';dn.title='下移一格（行尾时移到下一行开头）';dn.type='button';
  if(li>=data[si].lines.length-1&&gi>=segCnt-1)dn.disabled=true;
  dn.onclick=(function(si,li,gi){return function(e){e.stopPropagation();moveSegVert(si,li,gi,1);};})(si,li,gi);
  col.appendChild(up);col.appendChild(dn);
  return col;
}

function addSection(){saveUndo();data.push({name:'新段落',lines:[{bold:false,segs:[{chord:'',n:'',lyric:''}]}]});renderEditor();}
function moveSection(si,dir){
  var ni=si+dir;
  if(ni<0||ni>=data.length)return;
  var oldTopA=elTop('.sec-block[data-si="'+si+'"]');
  var oldTopB=elTop('.sec-block[data-si="'+ni+'"]');
  saveUndo();
  var tmp=data[si];data[si]=data[ni];data[ni]=tmp;
  if(curSi===si)curSi=ni;else if(curSi===ni)curSi=si;
  renderEditor();if(curSi>=0)reactivate();
  var movedEl=document.querySelector('.sec-block[data-si="'+ni+'"]');
  var otherEl=document.querySelector('.sec-block[data-si="'+si+'"]');
  flipFromTops([{el:movedEl,oldTop:oldTopA},{el:otherEl,oldTop:oldTopB}]);
  revealMoved(movedEl);
}
function delSection(si){saveUndo();data.splice(si,1);if(curSi===si){curSi=-1;curLi=-1;curGi=-1;}renderEditor();}
function addLine(si){saveUndo();data[si].lines.push({bold:false,segs:[{chord:'',n:'',lyric:''}]});renderEditor();}
function moveLine(si,li,dir){
  var ni=li+dir;
  if(ni<0||ni>=data[si].lines.length)return;
  var oldTopA=elTop('.row-block[data-row="'+si+'-'+li+'"]');
  var oldTopB=elTop('.row-block[data-row="'+si+'-'+ni+'"]');
  saveUndo();
  var tmp=data[si].lines[li];data[si].lines[li]=data[si].lines[ni];data[si].lines[ni]=tmp;
  if(curSi===si&&curLi===li)curLi=ni;else if(curSi===si&&curLi===ni)curLi=li;
  renderEditor();if(curSi>=0)reactivate();
  var movedEl=document.querySelector('.row-block[data-row="'+si+'-'+ni+'"]');
  var otherEl=document.querySelector('.row-block[data-row="'+si+'-'+li+'"]');
  flipFromTops([{el:movedEl,oldTop:oldTopA},{el:otherEl,oldTop:oldTopB}]);
  revealMoved(movedEl);
}
function delLine(si,li){saveUndo();data[si].lines.splice(li,1);renderEditor();}
function addSeg(si,li){data[si].lines[li].segs.push({chord:'',n:'',lyric:''});renderEditor();}
function addLabelSeg(si,li){data[si].lines[li].segs.push({label:'Chorus'});renderEditor();}
function delSeg(si,li,gi){clearSegSel();data[si].lines[li].segs.splice(gi,1);renderEditor();}
/* 格子上下移动一格：同一行内与相邻格子交换；行首再上移→上一行末尾，行尾再下移→下一行开头 */
function moveSegVert(si,li,gi,dir){
  var lines=data[si]&&data[si].lines;
  if(!lines||!lines[li])return;
  var segs=lines[li].segs;
  var nli,ngi;
  var swapWith=gi+dir;
  if(swapWith>=0&&swapWith<segs.length){
    // 同行内交换
    saveUndo();
    var tmp=segs[swapWith];segs[swapWith]=segs[gi];segs[gi]=tmp;
    if(curSi===si&&curLi===li){
      if(curGi===gi)curGi=swapWith;
      else if(curGi===swapWith)curGi=gi;
    }
    nli=li;ngi=swapWith;
  }else{
    // 跨行：行首上移 / 行尾下移
    var ti=li+dir;
    if(ti<0||ti>=lines.length)return;
    saveUndo();
    var seg=segs.splice(gi,1)[0];
    if(dir<0){lines[ti].segs.push(seg);ngi=lines[ti].segs.length-1;}
    else{lines[ti].segs.unshift(seg);ngi=0;}
    nli=ti;
    if(curSi===si){
      if(curLi===li){
        if(curGi===gi){curLi=ti;curGi=ngi;}
        else if(curGi>gi)curGi--;
      }else if(curLi===ti&&dir>0){curGi++;}
    }
  }
  renderEditor();if(curSi>=0)reactivate();
  revealMoved(document.querySelector('.seg-row[data-loc="'+si+'-'+nli+'-'+ngi+'"]'));
}

/* ════════════════════════════════════════
   移动/定位可视反馈：flash + FLIP + 滚动跟随
════════════════════════════════════════ */
function elTop(sel){
  var el=document.querySelector(sel);
  return el?el.getBoundingClientRect().top:null;
}
function flashEl(el){
  if(!el)return;
  el.classList.remove('seg-flash');
  void el.offsetWidth;
  el.classList.add('seg-flash');
  setTimeout(function(){el.classList.remove('seg-flash');},1300);
}
function revealMoved(el){
  if(!el)return;
  flashEl(el);
  // 等 FLIP 过渡（180ms）结束后再跟随滚动，避免按旧位置计算
  setTimeout(function(){
    if(el.isConnected)el.scrollIntoView({block:'nearest',behavior:'smooth'});
  },230);
}
/* FLIP：先记录旧位置，重渲染后反向位移再过渡归零 */
function flipFromTops(items){
  var moved=[];
  items.forEach(function(it){
    if(!it.el||it.oldTop==null)return;
    var d=it.oldTop-it.el.getBoundingClientRect().top;
    if(Math.abs(d)<1)return;
    it.el.style.transition='none';
    it.el.style.transform='translateY('+d+'px)';
    moved.push(it.el);
  });
  if(!moved.length)return;
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    moved.forEach(function(el){
      el.style.transition='transform 180ms ease';
      el.style.transform='';
    });
    setTimeout(function(){
      moved.forEach(function(el){el.style.transition='';el.style.transform='';});
    },240);
  });});
}
/* 预览里直接拖动段落标记：水平拖 = 调整 dx 偏移；原地点击 = 定位编辑行 */
function startLabelDrag(ev,si,li,gi,tag){
  var seg=data[si]&&data[si].lines[li]&&data[si].lines[li].segs[gi];
  if(!seg||!segIsLabelBlock(seg))return;
  ev.preventDefault();
  ev.stopPropagation();
  var startX=ev.clientX, startY=ev.clientY;
  var baseDx=Number(seg.dx)||0, baseDy=Number(seg.dy)||0;
  // 预览可能被 fitPreview 整体缩放，把屏幕位移换算回内容像素
  var scale=1;
  var inner=document.querySelector('#previewWrap .prev-inner');
  if(inner&&inner.offsetWidth){
    var ir=inner.getBoundingClientRect();
    if(ir.width)scale=ir.width/inner.offsetWidth;
  }
  var baseTop=(parseFloat(tag.style.top)||0)-baseDy;   // 当前 top 已含 dy，取出基线
  var moved=false;
  function delta(e2){return (e2.clientX-startX)/scale;}
  function deltaY(e2){return (e2.clientY-startY)/scale;}
  function onMove(e2){
    var d=delta(e2),dy2=deltaY(e2);
    if(Math.abs(d)>3||Math.abs(dy2)>3)moved=true;
    if(moved){tag.style.left=(baseDx+d)+'px';tag.style.top=(baseTop+baseDy+dy2)+'px';}
  }
  function onUp(e2){
    document.removeEventListener('pointermove',onMove);
    document.removeEventListener('pointerup',onUp);
    if(!moved){previewSegClick(si,li,gi);return;}
    var nv=Math.round(baseDx+delta(e2)), nvy=Math.round(baseDy+deltaY(e2));
    saveUndo();
    if(nv===0)delete seg.dx;else seg.dx=nv;
    if(nvy===0)delete seg.dy;else seg.dy=nvy;
    renderEditor();
  }
  document.addEventListener('pointermove',onMove);
  document.addEventListener('pointerup',onUp);
}
/* 预览点击 → 编辑区定位 */
function previewSegClick(si,li,gi){
  var seg=data[si]&&data[si].lines[li]&&data[si].lines[li].segs[gi];
  if(!seg)return;
  if(!segIsLabelBlock(seg))focusSeg(si,li,gi,true);
  var row=document.querySelector('.seg-row[data-loc="'+si+'-'+li+'-'+gi+'"]');
  if(row){
    row.scrollIntoView({block:'center',behavior:'smooth'});
    flashEl(row);
  }
}

/* ════════════════════════════════════════
   编辑器内搜索定位
════════════════════════════════════════ */
var segSearchTerm='';
var segSearchHits=[];
var segSearchIdx=-1;
var segSearchTimer=null;
function segSearchCollect(){
  segSearchHits=[];
  var t=segSearchTerm.toLowerCase();
  if(!t)return;
  function has(v){return typeof v==='string'&&v.toLowerCase().indexOf(t)>=0;}
  data.forEach(function(sec,si){
    if(has(sec.name))segSearchHits.push({type:'sec',si:si});
    sec.lines.forEach(function(line,li){
      line.segs.forEach(function(seg,gi){
        var hit=segIsLabelBlock(seg)
          ?has(seg.label)
          :(has(seg.lyric)||has(seg.lyric2)||has(seg.lyric3)||has(seg.lyric4)||has(seg.chord)||has(seg.n));
        if(hit)segSearchHits.push({type:'seg',si:si,li:li,gi:gi});
      });
    });
  });
}
function segSearchHitEl(h){
  if(!h)return null;
  if(h.type==='sec')return document.querySelector('.sec-block[data-si="'+h.si+'"] .sec-head');
  return document.querySelector('.seg-row[data-loc="'+h.si+'-'+h.li+'-'+h.gi+'"]');
}
function segSearchMark(){
  document.querySelectorAll('.seg-hit,.seg-hit-cur').forEach(function(el){
    el.classList.remove('seg-hit');el.classList.remove('seg-hit-cur');
  });
  segSearchHits.forEach(function(h,i){
    var el=segSearchHitEl(h);
    if(el)el.classList.add(i===segSearchIdx?'seg-hit-cur':'seg-hit');
  });
  var cnt=document.getElementById('segSearchCount');
  if(cnt)cnt.textContent=segSearchTerm?(segSearchHits.length?(segSearchIdx+1)+'/'+segSearchHits.length:'0/0'):'';
}
function segSearchJump(){
  var h=segSearchHits[segSearchIdx];
  segSearchMark();
  if(!h)return;
  if(h.type==='seg'){
    var seg=data[h.si]&&data[h.si].lines[h.li]&&data[h.si].lines[h.li].segs[h.gi];
    if(seg&&!segIsLabelBlock(seg))focusSeg(h.si,h.li,h.gi,true);
  }
  var el=segSearchHitEl(h);
  if(el)el.scrollIntoView({block:'center',behavior:'smooth'});
}
function segSearchStep(d){
  if(!segSearchTerm)return;
  segSearchCollect();
  var len=segSearchHits.length;
  if(!len){segSearchIdx=-1;segSearchMark();return;}
  segSearchIdx=((segSearchIdx+d)%len+len)%len;
  segSearchJump();
}
function segSearchNext(){segSearchStep(1);}
function segSearchPrev(){segSearchStep(-1);}
function segSearchClear(){
  segSearchTerm='';segSearchHits=[];segSearchIdx=-1;
  var inp=document.getElementById('segSearchInput');
  if(inp)inp.value='';
  segSearchMark();
}
/* renderEditor 重建 DOM 后按当前搜索词重新标注 */
function segSearchRefresh(){
  if(!segSearchTerm)return;
  segSearchCollect();
  if(segSearchIdx>=segSearchHits.length)segSearchIdx=segSearchHits.length?0:-1;
  segSearchMark();
}
function initSegSearch(){
  var inp=document.getElementById('segSearchInput');
  if(!inp)return;
  inp.addEventListener('input',function(){
    if(segSearchTimer)clearTimeout(segSearchTimer);
    segSearchTimer=setTimeout(function(){
      segSearchTerm=inp.value.trim();
      segSearchIdx=segSearchTerm?0:-1;
      segSearchCollect();
      if(!segSearchHits.length)segSearchIdx=-1;
      segSearchJump();
    },150);
  });
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();if(e.shiftKey)segSearchPrev();else segSearchNext();return;}
    if(e.key==='Escape'){e.preventDefault();segSearchClear();inp.blur();return;}
  });
}

/* ════════════════════════════════════════
   音符渲染
════════════════════════════════════════ */
/* 导航记号可与任意小节线组合：写法 = 小节线token + 记号名 连写，如 ||coda、:|fine、|:|segno。
   单写 coda/dc/... 时用各自的默认小节线（向后兼容）。不用正则(musictool 模板内禁反斜杠)。 */
/* ==== SA-CONFORMANCE-REGION-B-BEGIN ==== see region A note ==== */
function barNavOf(tok){
  var NAVS={fine:'||/',dc:'||',ds:'||',coda:'|',segno:'|'};
  var t=String(tok||'');
  for(var n in NAVS){
    if(t.length>=n.length&&t.slice(-n.length)===n){
      var pre=t.slice(0,t.length-n.length);
      if(pre==='')return {bar:NAVS[n],nav:n};
      if(pre==='|'||pre==='||'||pre==='||/'||pre==='|]'||pre==='|:'||pre===':|'||pre==='|:|')return {bar:pre,nav:n};
    }
  }
  return {bar:t,nav:''};
}
function isBarlineTok(tok){
  var b=barNavOf(tok).bar;
  return b==='|'||b==='||'||b==='||/'||b==='|]'||b==='|:'||b===':|'||b==='|:|';
}
/* ==== SA-CONFORMANCE-REGION-B-END ==== */
function makeBarline(tok){
  var _bn=barNavOf(tok),bar=_bn.bar,nav=_bn.nav;
  var o=document.createElement('span');o.className='jp-bar';
  var top=document.createElement('span');top.className='jp-bar-top';o.appendChild(top);
  var mid=document.createElement('span');mid.className='jp-bar-mid';
  function thin(){var l=document.createElement('span');l.className='jb-thin jp-bar-stroke';return l;}
  function thick(){var l=document.createElement('span');l.className='jb-thick jp-bar-stroke';return l;}
  function gap(px){var g=document.createElement('span');g.style.width=px+'px';g.style.flexShrink='0';return g;}
  function dots(){var d=document.createElement('span');d.className='jb-dots';var d1=document.createElement('span');d1.className='jb-dot';var d2=document.createElement('span');d2.className='jb-dot';d.appendChild(d1);d.appendChild(d2);return d;}
  if(bar==='|'){mid.appendChild(thin());}
  else if(bar==='||'){mid.appendChild(thin());mid.appendChild(gap(2));mid.appendChild(thin());}
  else if(bar==='||/'||bar==='|]'){mid.appendChild(thin());mid.appendChild(gap(2));mid.appendChild(thick());}
  else if(bar==='|:'){mid.appendChild(thick());mid.appendChild(gap(1.5));mid.appendChild(thin());mid.appendChild(gap(3));mid.appendChild(dots());}
  else if(bar===':|'){mid.appendChild(dots());mid.appendChild(gap(3));mid.appendChild(thin());mid.appendChild(gap(1.5));mid.appendChild(thick());}
  else if(bar==='|:|'){mid.appendChild(dots());mid.appendChild(gap(3));mid.appendChild(thin());mid.appendChild(gap(1.5));mid.appendChild(thick());mid.appendChild(gap(2));mid.appendChild(thick());mid.appendChild(gap(1.5));mid.appendChild(thin());mid.appendChild(gap(3));mid.appendChild(dots());}
  else if(nav==='coda'||nav==='segno'){mid.appendChild(thin());}
  o.appendChild(mid);
  var bot=document.createElement('span');bot.className='jp-bar-bot';o.appendChild(bot);
  if(nav==='coda'||nav==='segno'){
    top.style.cssText='display:flex;align-items:flex-end;justify-content:center;height:22px;line-height:1;';
    if(nav==='coda'){
      top.innerHTML='<svg viewBox="0 0 26 30" width="18" height="18" style="display:block;overflow:visible"><ellipse cx="13" cy="15" rx="6.4" ry="9.4" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="13" y1="2.6" x2="13" y2="27.4" stroke="currentColor" stroke-width="1.7"/><line x1="2.6" y1="15" x2="23.4" y2="15" stroke="currentColor" stroke-width="1.7"/></svg>';
    }else{ top.innerHTML='<svg viewBox="4 -759 546 786" width="10" height="14" style="display:block;overflow:visible"><path transform="scale(1,-1)" d="M135 665C141 665 148 663 151 652L153 645C160 618 175 559 226 559C267 559 295 583 295 626C295 641 292 657 287 673C271 719 204 736 153 736C83 736 4 650 4 551C4 527 9 502 20 477C52 404 197 315 205 312C209 310 211 308 211 304C211 300 209 295 205 288C198 274 54 15 54 15C52 11 51 6 51 2C51 -14 63 -27 79 -27C89 -27 99 -21 104 -12C104 -12 259 268 262 274C262 273 270 279 274 279C289 276 489 217 489 122C489 83 465 57 431 52L428 51C407 51 390 65 390 96V107C390 145 365 173 337 173C333 173 329 172 325 171C288 162 254 146 254 106C254 45 316 -8 375 -8C388 -8 402 -6 417 -1C497 26 550 91 550 174C550 183 549 193 548 203C533 313 375 402 363 408C351 415 346 419 346 424C346 426 347 428 348 430C353 438 508 717 508 717C511 722 512 726 512 731C512 747 499 759 484 759C474 759 464 754 459 745C459 745 300 458 294 449C291 444 289 441 285 441C282 441 279 442 275 444C266 447 115 505 89 550C83 561 75 582 75 603C75 630 87 658 129 665ZM415 466C415 435 441 409 472 409C504 409 529 435 529 466C529 498 504 523 472 523C441 523 415 498 415 466ZM140 264C140 295 115 321 83 321C52 321 26 295 26 264C26 232 52 207 83 207C115 207 140 232 140 264Z" fill="currentColor"/></svg>'; }
    o.style.alignItems='center';
  } else if(nav==='fine'||nav==='dc'||nav==='ds'){
    bot.textContent=(nav==='fine')?'Fine':(nav==='dc'?'D.C.':'D.S.');
    bot.style.cssText='display:flex;align-items:flex-start;justify-content:center;height:16px;font-family:"Noto Serif SC",Georgia,serif;font-style:italic;font-size:9.5px;line-height:1;white-space:nowrap;padding-top:2px;';
    o.style.alignItems='center';
  }
  if(nav){o.setAttribute('data-jp-nav-base-height',top.style.height||'22px');o.setAttribute('data-jp-nav',nav);o.setAttribute('data-jp-nav-above',(nav==='coda'||nav==='segno')?'1':'0');}
  return o;
}
/* CECP-CHORD-HEIGHT-BEGIN
   三个渲染器使用同一条和弦高度线，只按实际音符、弧线、导航记号和房子避让。
   编辑器 srcdoc 内联块，禁止反斜杠及反引号。 */
function scoreHeightRows(scope){
  if(!scope)return [];
  var rows=[].slice.call(scope.querySelectorAll('.prev-row'));
  if(scope.matches&&scope.matches('.prev-row'))rows.unshift(scope);
  return rows;
}
function scoreHeightScale(el){var r=el.getBoundingClientRect();return el.offsetWidth?r.width/el.offsetWidth:1;}
function scoreNormalizeNotes(scope){
  scoreHeightRows(scope).forEach(function(row){
    row.style.setProperty('--volta-rail','0px');
    row.style.setProperty('--row-lyric-height','0px');
    var lyricHeight=0;
    [].forEach.call(row.querySelectorAll('.p-lyric'),function(lyric){lyricHeight=Math.max(lyricHeight,lyric.offsetHeight);});
    if(lyricHeight)row.style.setProperty('--row-lyric-height',lyricHeight+'px');
    row.style.setProperty('--row-note-height','0px');
    var height=0;
    [].forEach.call(row.querySelectorAll('.p-n'),function(lane){height=Math.max(height,lane.offsetHeight);});
    if(height)row.style.setProperty('--row-note-height',height+'px');
  });
}
function scoreResetChordHeight(scope){
  scoreHeightRows(scope).forEach(function(row){
    if(row.cecpChordPaddingTop!=null){row.style.paddingTop=row.cecpChordPaddingTop;delete row.cecpChordPaddingTop;}
    [].forEach.call(row.querySelectorAll('.p-chord'),function(chord){chord.style.marginBottom='';});
  });
}
function scoreHeightObstacles(row){
  var rects=[];
  [].forEach.call(row.querySelectorAll('.jp-num,.jp-plain-sym,.jp-dot-top > span,.jp-navmark svg,[data-jp-nav-above="1"] .jp-bar-top svg,.strict-arc-svg > div,.strict-arc-svg path,.strict-arc-svg text,.strict-arc-tup text'),function(el){var r=el.getBoundingClientRect();if(r.width&&r.height)rects.push(r);});
  [].forEach.call(row.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close,.jp-tie'),function(group){
    var r=group.getBoundingClientRect(),s=scoreHeightScale(group),ps=getComputedStyle(group,'::before');
    if(ps.content==='none')return;
    function length(value){return String(value).indexOf('%')>=0?(parseFloat(value)||0)*group.offsetWidth/100:parseFloat(value)||0;}
    var left=r.left+length(ps.left)*s,right=group.classList.contains('jp-tie')?left+length(ps.width)*s:r.right-length(ps.right)*s;
    if(right>left)rects.push({left:left,right:right,top:r.top+length(ps.top)*s});
  });
  return rects;
}
function scoreHeightHouses(row,obstacles){
  var rails=[];
  [].slice.call(row.querySelectorAll('.prev-volta,.jp-volta')).reverse().forEach(function(house){
    var r=house.getBoundingClientRect(),s=scoreHeightScale(house),ceiling=Infinity;
    obstacles.concat(rails).forEach(function(o){if(o.left<r.right&&o.right>r.left)ceiling=Math.min(ceiling,o.top);});
    if(!isFinite(ceiling)||!s)return;
    var top=ceiling-12*s;
    house.style.setProperty(house.classList.contains('jp-volta')?'--jp-volta-top':'--volta-top',((top-r.top)/s).toFixed(3)+'px');
    rails.push({left:r.left,right:r.right,top:top});
  });
  return rails;
}
var scoreChordMeasureContext;
function scoreChordInk(chord,scale){
  var range=document.createRange();range.selectNodeContents(chord);
  var r=range.getBoundingClientRect();if(!r.height)r=chord.getBoundingClientRect();
  var stacks=chord.querySelectorAll('.p-chord-stk'),last=stacks.length?stacks[stacks.length-1]:chord;
  var text=last.querySelector('.chord-chip')||last,cs=getComputedStyle(text),descent=0,inkDescent=0;
  if(!scoreChordMeasureContext)scoreChordMeasureContext=document.createElement('canvas').getContext('2d');
  if(scoreChordMeasureContext){
    scoreChordMeasureContext.font=cs.font||cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    var metrics=scoreChordMeasureContext.measureText(text.textContent||'');
    if(isFinite(metrics.fontBoundingBoxDescent)&&isFinite(metrics.actualBoundingBoxDescent)){
      descent=metrics.fontBoundingBoxDescent;inkDescent=Math.max(0,metrics.actualBoundingBoxDescent);
    }
  }
  return {baseline:r.bottom-descent*scale,descent:inkDescent};
}
function scoreLayoutChordRows(scope){
  scoreHeightRows(scope).forEach(function(row){
    if(!row.isConnected||!row.querySelector('.p-n'))return;
    var s=scoreHeightScale(row);if(!s)return;
    var obstacles=scoreHeightObstacles(row),rails=scoreHeightHouses(row,obstacles),ceiling=Infinity;
    obstacles.concat(rails).forEach(function(o){ceiling=Math.min(ceiling,o.top);});
    if(!isFinite(ceiling))return;
    var labelBand=0;
    [].forEach.call(row.querySelectorAll('.sec-label-holder .sec-label'),function(tag){labelBand=Math.max(labelBand,tag.offsetHeight+6);});
    var chords=[],inkDescent=0;
    [].forEach.call(row.querySelectorAll('.p-chord'),function(chord){var ink=scoreChordInk(chord,s);inkDescent=Math.max(inkDescent,ink.descent);chords.push({chord:chord,ink:ink});});
    var target=ceiling-(3+labelBand+inkDescent)*s;
    var anchor=row.querySelector('.jp-num,.jp-plain-sym'),oldTop=anchor?anchor.getBoundingClientRect().top-row.getBoundingClientRect().top:0;
    var changes=[];
    chords.forEach(function(item){
      var margin=parseFloat(getComputedStyle(item.chord).marginBottom)||0;
      changes.push({chord:item.chord,margin:margin+(item.ink.baseline-target)/s});
    });
    changes.forEach(function(change){change.chord.style.marginBottom=change.margin.toFixed(3)+'px';});
    if(!chords.length){
      var inset=(row.getBoundingClientRect().top-ceiling)/s+2;
      if(inset>0){
        if(row.cecpChordPaddingTop==null)row.cecpChordPaddingTop=row.style.paddingTop;
        row.style.paddingTop=((parseFloat(getComputedStyle(row).paddingTop)||0)+inset).toFixed(3)+'px';
      }
    }
    var delta=anchor?(anchor.getBoundingClientRect().top-row.getBoundingClientRect().top-oldTop)/s:0;
    if(Math.abs(delta)>.01){[].forEach.call(row.querySelectorAll('.strict-arc-svg'),function(host){host.style.top=((parseFloat(host.style.top)||0)+delta).toFixed(3)+'px';});}
    scoreHeightHouses(row,scoreHeightObstacles(row));
    [].forEach.call(row.querySelectorAll('.sec-label-holder'),function(holder){if(holder.cecpPlaceSecLabel)holder.cecpPlaceSecLabel(true);});
  });
}
/* CECP-CHORD-HEIGHT-END */
/* CECP-JP-NAVIGATION-BEGIN
   与 youth / musictool / musiclib 同步。此块在编辑器 srcdoc 中，禁止反斜杠及反引号。
   反复圆点不参与导航记号的中心计算；上方记号为经过它的连音线留出空间。 */
function jpNoteArcTop(atom){
  var box=atom.getBoundingClientRect();
  if(!atom.querySelector('.jp-navmark'))return box.top;
  var top=Infinity,scale=atom.offsetWidth?box.width/atom.offsetWidth:1;
  [].forEach.call(atom.querySelectorAll('.jp-num,.jp-plain-sym,.jp-dot-top > span'),function(note){var r=note.getBoundingClientRect();if(r.height)top=Math.min(top,r.top);});
  return top===Infinity?box.top:top-4*(scale||1);
}
function jpResetNavigation(scope){
  if(!scope)return;
  [].forEach.call(scope.querySelectorAll('[data-jp-nav],.jp-navmark'),function(el){
    var mark=el.classList.contains('jp-navmark')?el:el.querySelector('.jp-bar-top,.jp-bar-bot');
    if(!mark)return;
    mark.style.transform='';mark.style.paddingBottom='';
    if(el.hasAttribute('data-jp-nav')){
      mark=el.querySelector(el.getAttribute('data-jp-nav-above')==='1'?'.jp-bar-top':'.jp-bar-bot');
      if(mark){mark.style.transform='';mark.style.paddingBottom='';if(el.getAttribute('data-jp-nav-above')==='1')mark.style.height=el.getAttribute('data-jp-nav-base-height')||'22px';}
    }
  });
  [].forEach.call(scope.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close'),function(group){group.style.removeProperty('--jp-nav-arc-top');});
}
function jpPrepareLegacyNavigation(scope){
  if(!scope)return;
  [].forEach.call(scope.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close'),function(group){
    if(!group.querySelector('[data-jp-nav],.jp-navmark'))return;
    var gr=group.getBoundingClientRect(),scale=group.offsetWidth?gr.width/group.offsetWidth:1;
    if(!gr.width||!scale)return;
    var noteTop=Infinity;
    [].forEach.call(group.querySelectorAll('.jp-num,.jp-dot-top:not(:empty)'),function(note){var r=note.getBoundingClientRect();if(r.height)noteTop=Math.min(noteTop,r.top);});
    if(noteTop===Infinity)return;
    var ps=getComputedStyle(group,'::before');
    var height=parseFloat(ps.height)||8;
    var layer=Math.max(0,(parseFloat(getComputedStyle(group).paddingTop)||12)-12);
    group.style.setProperty('--jp-nav-arc-top',((noteTop-gr.top)/scale-height-3-layer).toFixed(3)+'px');
  });
}
function jpLayoutNavigation(scope){
  if(!scope)return false;
  [].forEach.call(scope.querySelectorAll('[data-jp-nav],.jp-navmark'),function(el){
    var attached=el.classList.contains('jp-navmark');
    var above=attached||el.getAttribute('data-jp-nav-above')==='1';
    var mark=attached?el:el.querySelector(above?'.jp-bar-top':'.jp-bar-bot');
    if(!mark)return;
    var paint=mark.querySelector('svg')||mark,mr=paint.getBoundingClientRect();
    if(!mr.width||!mr.height)return;
    var natural=parseFloat(getComputedStyle(paint).height)||paint.offsetHeight;
    var scale=natural?mr.height/natural:1;if(!scale||!isFinite(scale))scale=1;
    if(!attached){
      var strokes=[].slice.call(el.querySelectorAll('.jp-bar-stroke'));
      if(strokes.length){
        var left=Infinity,right=-Infinity;
        strokes.forEach(function(stroke){var r=stroke.getBoundingClientRect();left=Math.min(left,r.left);right=Math.max(right,r.right);});
        mark.style.transform='translateX('+(((left+right-mr.left-mr.right)/2)/scale).toFixed(3)+'px)';
        mr=paint.getBoundingClientRect();
      }
    }
    if(!above)return;
    var row=el.closest('.prev-row')||el.closest('.sw-lrow')||el.closest('.p-notes');if(!row)return;
    var ceiling=Infinity;
    [].forEach.call(row.querySelectorAll('.strict-arc-svg > div,.strict-arc-svg path,.strict-arc-tup text'),function(arc){
      var r=arc.getBoundingClientRect();
      if(r.width&&r.height&&r.left<mr.right&&r.right>mr.left)ceiling=Math.min(ceiling,r.top);
    });
    [].forEach.call(row.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close,.jp-tie'),function(group){
      var gr=group.getBoundingClientRect(),gs=group.offsetWidth?gr.width/group.offsetWidth:scale;
      var ps=getComputedStyle(group,'::before'),top=parseFloat(ps.top),left=parseFloat(ps.left)||0,right=parseFloat(ps.right)||0;
      if(String(ps.left).indexOf('%')>=0)left=group.offsetWidth*left/100;
      if(String(ps.right).indexOf('%')>=0)right=group.offsetWidth*right/100;
      var width=parseFloat(ps.width)||0;
      var arcRight=group.classList.contains('jp-tie')?gr.left+(left+width)*gs:gr.right-right*gs;
      if((gr.width||width)&&isFinite(top)&&gr.left+left*gs<mr.right&&arcRight>mr.left)ceiling=Math.min(ceiling,gr.top+top*gs);
    });
    var anchors=attached?el.parentElement.querySelectorAll('.jp-num,.jp-plain-sym,.jp-dot-top > span'):el.querySelectorAll('.jp-bar-stroke');
    [].forEach.call(anchors,function(anchor){var r=anchor.getBoundingClientRect();if(r.width&&r.height)ceiling=Math.min(ceiling,r.top);});
    if(ceiling===Infinity)return;
    var move=(ceiling-mr.bottom)/scale-4;
    if(Math.abs(move)<.25)return;
    mark.style.transform=(mark.style.transform||'')+' translateY('+move.toFixed(3)+'px)';
  });
  // 只移动记号墨迹，不再次增高音格或累加预留空间。
}
var jpBaseLayoutArcs=layoutStrictArcs;
layoutStrictArcs=function(row){jpResetNavigation(row);scoreResetChordHeight(row);scoreNormalizeNotes(row);jpBaseLayoutArcs(row);jpPrepareLegacyNavigation(row);jpLayoutNavigation(row);scoreLayoutChordRows(row);};
var jpBaseLayoutArcsAll=layoutStrictArcsAll;
layoutStrictArcsAll=function(scope){jpResetNavigation(scope);scoreResetChordHeight(scope);scoreNormalizeNotes(scope);jpBaseLayoutArcsAll(scope);jpPrepareLegacyNavigation(scope);jpLayoutNavigation(scope);scoreLayoutChordRows(scope);};
var jpBaseLayoutNoteArcs=layoutJpArcs;
layoutJpArcs=function(lane){jpResetNavigation(lane);jpBaseLayoutNoteArcs(lane);jpPrepareLegacyNavigation(lane);jpLayoutNavigation(lane);var row=lane&&lane.closest('.prev-row');if(row)scoreLayoutChordRows(row);};
/* CECP-JP-NAVIGATION-END */

/* ── 导航记号挂在音符正上方：写法 = 星号 + 记号名，如 1 *coda、3_ *segno ──
   与小节线写法(||coda / :|fine)并存；星号前缀这一档不画小节线、不占音位（isDualAtom 已判 false，
   所以 chord/lyric 不用补 @）。记号用绝对定位挂在前一个音符上，不参与布局 → 不会把行撑高。
   注意：本文件这段在 srcdoc 模板字符串里，注释中绝对不能出现反引号，否则模板会提前终止。 */
var JP_NOTE_NAVS={fine:'Fine',dc:'D.C.',ds:'D.S.',coda:1,segno:1};
function noteNavOf(tok){
  var t=String(tok||'');
  if(t.charAt(0)!=='*')return '';
  var n=t.slice(1);
  return JP_NOTE_NAVS[n]?n:'';
}
function makeNoteNavMark(nav){
  var m=document.createElement('span');
  m.className='jp-navmark';
  m.style.cssText='display:flex;align-items:flex-end;justify-content:center;line-height:1;pointer-events:none;white-space:nowrap;margin-bottom:2px;flex:0 0 auto;';
  if(nav==='coda'){
    m.innerHTML='<svg viewBox="0 0 26 30" width="16" height="16" style="display:block;overflow:visible"><ellipse cx="13" cy="15" rx="6.4" ry="9.4" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="13" y1="2.6" x2="13" y2="27.4" stroke="currentColor" stroke-width="1.7"/><line x1="2.6" y1="15" x2="23.4" y2="15" stroke="currentColor" stroke-width="1.7"/></svg>';
  }else if(nav==='segno'){
    m.innerHTML='<svg viewBox="4 -759 546 786" width="9" height="13" style="display:block;overflow:visible"><path transform="scale(1,-1)" d="M135 665C141 665 148 663 151 652L153 645C160 618 175 559 226 559C267 559 295 583 295 626C295 641 292 657 287 673C271 719 204 736 153 736C83 736 4 650 4 551C4 527 9 502 20 477C52 404 197 315 205 312C209 310 211 308 211 304C211 300 209 295 205 288C198 274 54 15 54 15C52 11 51 6 51 2C51 -14 63 -27 79 -27C89 -27 99 -21 104 -12C104 -12 259 268 262 274C262 273 270 279 274 279C289 276 489 217 489 122C489 83 465 57 431 52L428 51C407 51 390 65 390 96V107C390 145 365 173 337 173C333 173 329 172 325 171C288 162 254 146 254 106C254 45 316 -8 375 -8C388 -8 402 -6 417 -1C497 26 550 91 550 174C550 183 549 193 548 203C533 313 375 402 363 408C351 415 346 419 346 424C346 426 347 428 348 430C353 438 508 717 508 717C511 722 512 726 512 731C512 747 499 759 484 759C474 759 464 754 459 745C459 745 300 458 294 449C291 444 289 441 285 441C282 441 279 442 275 444C266 447 115 505 89 550C83 561 75 582 75 603C75 630 87 658 129 665ZM415 466C415 435 441 409 472 409C504 409 529 435 529 466C529 498 504 523 472 523C441 523 415 498 415 466ZM140 264C140 295 115 321 83 321C52 321 26 295 26 264C26 232 52 207 83 207C115 207 140 232 140 264Z" fill="currentColor"/></svg>';
  }else{
    m.textContent=JP_NOTE_NAVS[nav];
    m.style.fontFamily='"Noto Serif SC",Georgia,serif';m.style.fontStyle='italic';m.style.fontSize='10px';
  }
  return m;
}
/* host 可以是音符本体(.jp-wrap/.jp-plain)，也可以是严格模式的音位列(内含 .jp-wrap) */
function attachNoteNavMark(host,nav){
  if(!host||!nav)return false;
  var cn=String(host.className||'');
  var anchor=(cn.indexOf('jp-wrap')>=0||cn.indexOf('jp-plain')>=0)?host
            :(host.querySelector('.jp-wrap')||host.querySelector('.jp-plain')||host);
  /* 作为普通 flex 子元素插在音符最上面，而不是绝对定位：
     .jp-wrap 是 vertical-align:bottom、.p-n 是 align-items:flex-end，
     所以音符本身不动，只是音符泳道往上长高 → 上面的和弦行被自动顶开，不会被挡。 */
  var _m=makeNoteNavMark(nav);
  /* 尽量贴近音符：音符上方那个八度点盒子(.jp-dot-top 8px / .jp-plain-top 12px)在没有高音点时
     是空的，会白白撑出一段距离 —— 空的就用负 margin 收掉，只留 2px；有高音点则保持让位。 */
  var _dt=anchor.querySelector('.jp-dot-top'), _pt=anchor.querySelector('.jp-plain-top');
  if(_dt&&!_dt.firstElementChild)_m.style.marginBottom='-3.7px';
  else if(_pt&&!_dt)_m.style.marginBottom='-7.7px';
  anchor.insertBefore(_m, anchor.firstChild);
  return true;
}
function makeTimeSignature(sig){
  var norm=normalizeTimeSignValue(sig);
  if(!norm)return document.createDocumentFragment();
  var parts=norm.split('/');
  var o=document.createElement('span');o.className='jp-timesig';o.setAttribute('data-ts',norm);
  var topPad=document.createElement('span');topPad.className='jp-timesig-pad jp-timesig-pad-top';o.appendChild(topPad);
  var stack=document.createElement('span');stack.className='jp-timesig-stack';
  var top=document.createElement('span');top.className='jp-timesig-top';top.textContent=parts[0];
  var bot=document.createElement('span');bot.className='jp-timesig-bot';bot.textContent=parts[1];
  stack.appendChild(top);stack.appendChild(bot);o.appendChild(stack);
  var botPad=document.createElement('span');botPad.className='jp-timesig-pad jp-timesig-pad-bot';o.appendChild(botPad);
  return o;
}
function makeJpPlain(sym){
  var pl=document.createElement('span');pl.className='jp-plain';
  var t=document.createElement('span');t.className='jp-plain-top';pl.appendChild(t);
  var s=document.createElement('span');s.className='jp-plain-sym'+(sym==='-'?' is-dash':'');s.textContent=sym;pl.appendChild(s);
  s.style.display='inline-flex';
  s.style.alignItems='center';
  s.style.justifyContent='center';
  s.style.width='1em';
  s.style.height='1em';
  if(sym==='-'){
    s.style.fontSize='19px';
    s.style.position='relative';
    s.style.top='-0.12em';
    s.style.lineHeight='1';
    s.style.overflow='visible';
    s.textContent='';
    var dashLine=document.createElement('span');
    dashLine.className='jp-dash-line';
    styleJpDashLineEl(dashLine);
    s.appendChild(dashLine);
  }
  var b=document.createElement('span');b.className='jp-plain-bot';pl.appendChild(b);
  return pl;
}
function setDots(el,cnt){
  el.innerHTML='';
  for(var i=0;i<cnt;i++){var d=document.createElement('span');d.textContent='·';el.appendChild(d);}
}
function styleJpNumEl(el){
  if(!el)return;
  el.style.display='inline-flex';
  el.style.alignItems='center';
  el.style.justifyContent='center';
  el.style.textAlign='center';
  el.style.width='1em';
  el.style.height='1em';
  el.style.position='relative';
  el.style.top='-0.12em';
}
function styleJpAugEl(el){
  if(!el)return;
  el.style.position='absolute';
  el.style.right='-5px';
  el.style.top='50%';
  el.style.transform='translateY(-50%) translateY(0.5px)';
  el.style.width='4px';
  el.style.height='4px';
  el.style.borderRadius='50%';
  el.style.background='currentColor';
  el.style.fontSize='0';
  el.style.lineHeight='0';
  el.style.pointerEvents='none';
}
function styleJpDashLineEl(el){
  if(!el)return;
  el.style.position='absolute';
  el.style.left='0.22em';
  el.style.right='0.22em';
  el.style.top='50%';
  el.style.height='1.5px';
  el.style.transform='translateY(-50%)';
  el.style.background='currentColor';
  el.style.borderRadius='2px';
  el.style.pointerEvents='none';
}
function styleJpAccEl(el){
  if(!el)return;
  el.style.position='absolute';
  el.style.left='-0.32em';
  el.style.top='-0.08em';
  el.style.transform='none';
  el.style.fontSize='12px';
  el.style.fontWeight='700';
  el.style.lineHeight='1';
  el.style.pointerEvents='none';
}
function makeJpUnderlineLine(level){
  var ln=document.createElement('span');
  ln.className=level===2?'jp-u2-line':'jp-u1-line';
  ln.style.display='block';
  ln.style.position='absolute';
  ln.style.left='0';
  ln.style.right='0';
  ln.style.bottom=level===2?'0':'3px';
  ln.style.height='1.5px';
  ln.style.background='currentColor';
  ln.style.pointerEvents='none';
  ln.style.zIndex='1';
  return ln;
}
function parseDualJpToken(tok){
  var raw=String(tok||'').replace(/\uFF0F/g,'/');
  var idx=raw.indexOf('/');
  if(idx<0||idx!==raw.lastIndexOf('/'))return null;
  var top=raw.slice(0,idx).trim();
  var bot=raw.slice(idx+1).trim();
  if(!top&&!bot)return null;
  return {top:top||'sp',bot:bot||'sp'};
}
function makeDualJpToken(pair){
  var w=document.createElement('span');w.className='jp-dual';
  var t=document.createElement('span');t.className='jp-dual-top';t.appendChild(parseJpToken(pair.top,{inDual:true}));w.appendChild(t);
  var b=document.createElement('span');b.className='jp-dual-bot';b.appendChild(parseJpToken(pair.bot,{inDual:true}));w.appendChild(b);
  return w;
}
function getVoltaStartLabel(nStr){
  if(!nStr)return '';
  var m=nStr.match(/\\[v:([^\\]\\s]+)\\]/);
  if(m&&m[1])return m[1];
  if(nStr.indexOf('[v1')>=0)return '1';
  if(nStr.indexOf('[v2')>=0)return '2';
  return '';
}
function hasVoltaEnd(nStr){
  return !!(nStr&&nStr.indexOf(']v')>=0);
}
function parseJpToken(tok,opts){
  opts=opts||{};
  tok=String(tok||'');
  if(isBarlineTok(tok))return makeBarline(tok);
  var dual=!opts.inDual?parseDualJpToken(tok):null;
  if(dual)return makeDualJpToken(dual);
  if(!tok||tok==='-'||tok===' ')return makeJpPlain(tok);
  var hasFermata=false;
  if(tok.slice(-1)==='^'){hasFermata=true;tok=tok.slice(0,-1);}
  if(tok==='sp'||tok==='sp_'||tok==='sp__'){
    var fk=tok==='sp__'?'0__':tok==='sp_'?'0_':'0';
    var el=parseJpToken(fk);
    el.className+=' jp-sp';
    var ns=el.querySelector('.jp-num')||el.querySelector('.jp-plain-sym');
    if(ns)ns.style.visibility='hidden';
    return el;
  }
  var zm=tok.match(/^(0·?)(_*)$/);
  if(zm){
    var w=document.createElement('span');w.className='jp-wrap';
    var td=document.createElement('span');td.className='jp-dot-top';w.appendChild(td);
    var lw=document.createElement('span');lw.className='jp-lines-wrap';
    var nr=document.createElement('span');nr.className='jp-num-row';
    var ns=document.createElement('span');ns.className='jp-num';ns.textContent='0';styleJpNumEl(ns);nr.appendChild(ns);
    if(zm[1].indexOf('·')>-1){var ag=document.createElement('span');ag.className='jp-aug';ag.textContent='·';styleJpAugEl(ag);ns.appendChild(ag);}
    var ul=zm[2].length;
    lw.appendChild(nr);
    if(ul>=1)lw.appendChild(makeJpUnderlineLine(1));
    if(ul===2)lw.appendChild(makeJpUnderlineLine(2));
    w.appendChild(lw);
    var bd=document.createElement('span');bd.className='jp-dot-bot';w.appendChild(bd);
    return w;
  }
  var num=tok,isH=0,isL=0,isDot=false,ul=0;
  if(num.slice(-2)==='__'){ul=2;num=num.slice(0,-2);}
  else if(num.slice(-1)==='_'){ul=1;num=num.slice(0,-1);}
  if(num.indexOf('·')>-1){isDot=true;num=num.replace(/·/g,'');}
  var hm=num.match(/^(.+?)('+)$/);if(hm){isH=hm[2].length;num=hm[1];}
  var lm=num.match(/^(.+?)(,+)$/);if(lm){isL=lm[2].length;num=lm[1];}
  var acc='';
  var am=num.match(/^([#b\u266f\u266d\u266e=])([0-7])$/);
  if(am){acc=am[1]==='#'?'\u266f':am[1]==='b'?'\u266d':am[1]==='='?'\u266e':am[1];num=am[2];}
  var w=document.createElement('span');w.className='jp-wrap'+(acc?' has-acc':'');
  if(acc)w.style.minWidth='1.35em';
  var td=document.createElement('span');td.className='jp-dot-top';setDots(td,isH>=2?2:isH);w.appendChild(td);
  var lw=document.createElement('span');lw.className='jp-lines-wrap';
  var nr=document.createElement('span');nr.className='jp-num-row';
  if(acc){var ac=document.createElement('span');ac.className='jp-acc';ac.textContent=acc;styleJpAccEl(ac);nr.appendChild(ac);}
  var ns=document.createElement('span');ns.className='jp-num';ns.textContent=num;styleJpNumEl(ns);nr.appendChild(ns);
  if(isDot){var ag=document.createElement('span');ag.className='jp-aug';ag.textContent='·';styleJpAugEl(ag);ns.appendChild(ag);}
  lw.appendChild(nr);
  if(ul>=1)lw.appendChild(makeJpUnderlineLine(1));
  if(ul===2)lw.appendChild(makeJpUnderlineLine(2));
  w.appendChild(lw);
  var bd=document.createElement('span');bd.className='jp-dot-bot';setDots(bd,isL>=2?2:isL);w.appendChild(bd);
  if(hasFermata){var fw=document.createElement('span');fw.className='jp-fermata';fw.appendChild(w);return fw;}
  return w;
}
function makeTuplet(n){
  var w=document.createElement('span');w.className='jp-tuplet';
  var br=document.createElement('span');br.className='jp-tuplet-br';w.appendChild(br);
  var nm=document.createElement('span');nm.className='jp-tuplet-num';nm.textContent=String(n);w.appendChild(nm);
  return w;
}
/* ── 连音线（~ token）与弧线分层 ─────────────────
   ~N 语义（数字计数）：
     ~   = 连接左侧第 1 个可见音 → 右侧第 1 个可见音
     ~2  = 连接左侧第 2 个可见音 → 右侧第 1 个可见音（跨过 1 个音）；~3 以此类推
     计数时 sp 占位、小节线、拍号一律跳过且不可作端点；
     ( ) 组与三连音边界透明（计数穿过，可跨组、可写在组内）；
     左侧不足 N 个音或右侧无音时该弧不画。
   分层（几何嵌套 + 类型权重）：
     范围重叠（不含只共享端点）的 ~ 之间：窄的贴音符在下、宽的抬高在上；
     ( ) 组/三连音弧线永远比与其相接或重叠的 ~ 至少高一层（含共享端点）；
     每升一层抬高 JP_ARC_LAYER_STEP px；无 ~ 的行完全不处理（逐像素回归）。 */
var JP_ARC_LAYER_STEP=6;
function makeJpTie(span){
  var tie=document.createElement('span');
  tie.className='jp-tie';
  tie.setAttribute('data-tie-span',span>0?span:1);
  return tie;
}
function layoutJpArcs(lane){
  if(!lane||!lane.isConnected)return;
  var atoms=[],ties=[],groups=[];
  (function walk(node){
    for(var c=node.firstElementChild;c;c=c.nextElementSibling){
      var cn=String(c.className||'');
      if(cn.indexOf('jp-tie')>=0){ties.push({el:c,pos:atoms.length,span:parseInt(c.getAttribute('data-tie-span'),10)||1});continue;}
      if(cn.indexOf('jp-bar')>=0||cn.indexOf('jp-timesig')>=0||cn.indexOf('jp-sp')>=0)continue;
      if(cn.indexOf('jp-slur')>=0||cn.indexOf('jp-tuplet')>=0){
        var s0=atoms.length;
        walk(c);
        if(atoms.length>s0)groups.push({el:c,start:s0,end:atoms.length-1});
        continue;
      }
      if(cn.indexOf('jp-wrap')>=0||cn.indexOf('jp-plain')>=0||cn.indexOf('jp-dual')>=0)atoms.push(c);
    }
  })(lane);
  if(!ties.length)return;
  var arcs=[];
  ties.forEach(function(t){
    var s=t.pos-t.span,e=t.pos;
    if(s<0||e>=atoms.length){t.el.style.display='none';return;}
    t.el.style.display='';
    arcs.push({kind:'tie',el:t.el,start:s,end:e,layer:0});
  });
  groups.forEach(function(g){arcs.push({kind:'group',el:g.el,start:g.start,end:g.end,layer:0});});
  // tie 之间只算内部重叠（共享端点=同层，链式弧并排）；组与 tie 相接（含共享端点）即算重叠
  function overlaps(a,b){
    if(a.kind==='tie'&&b.kind==='tie')return a.start<b.end&&b.start<a.end;
    return a.start<=b.end&&b.start<=a.end;
  }
  // 先放全部 ~（窄→宽），再放组（窄→宽）：组永远压在与其重叠的 ~ 之上
  var order=arcs.slice().sort(function(a,b){
    if(a.kind!==b.kind)return a.kind==='tie'?-1:1;
    var wa=a.end-a.start,wb=b.end-b.start;
    return wa!==wb?wa-wb:a.start-b.start;
  });
  var placed=[];
  order.forEach(function(a){
    var m=0;
    placed.forEach(function(p){if(overlaps(a,p)&&p.layer>m)m=p.layer;});
    a.layer=m+1;
    placed.push(a);
  });
  arcs.forEach(function(a){
    if(a.kind==='group'){
      if(a.layer>1)a.el.style.setProperty('--slur-pad',(12+(a.layer-1)*JP_ARC_LAYER_STEP)+'px');
      return;
    }
    var p=atoms[a.start],n=atoms[a.end],tr=a.el.getBoundingClientRect();
    var pr=p.getBoundingClientRect(),nr=n.getBoundingClientRect();
    var scale=p.offsetWidth?(pr.width/p.offsetWidth):1;
    if(!scale)scale=1;
    var minTop=Infinity;
    for(var k=a.start;k<=a.end;k++){
      var noteTop=jpNoteArcTop(atoms[k]);
      if(noteTop<minTop)minTop=noteTop;
    }
    var x1=(pr.left+pr.width/2-tr.left)/scale;
    var x2=(nr.left+nr.width/2-tr.left)/scale;
    var topY=(minTop-tr.top)/scale-9-(a.layer-1)*JP_ARC_LAYER_STEP;
    a.el.style.setProperty('--tie-l',x1.toFixed(1)+'px');
    a.el.style.setProperty('--tie-w',Math.max(8,x2-x1).toFixed(1)+'px');
    a.el.style.setProperty('--tie-t',topY.toFixed(1)+'px');
  });
}
/* ~ token 解析：~ =1；~~ / ~2 =2；~~~ / ~3 =3 … 返回 0 表示不是 tie token */
function jpTieSpan(t){
  if(!t||t.charAt(0)!=='~')return 0;
  var rest=t.slice(1);
  if(!rest)return 1;
  if(/^~+$/.test(rest))return rest.length+1;
  if(/^[0-9]+$/.test(rest)){var n=parseInt(rest,10);return n>0?n:0;}
  return 0;
}
function renderNStr(nStr,opts){
  opts=opts||{};
  var div=document.createElement('div');div.className='p-n';
  var headTimeSign=normalizeTimeSignValue(opts.inlineTimeSign||'');
  if(headTimeSign)div.appendChild(makeTimeSignature(headTimeSign));
  if(!nStr||!nStr.trim())return div;
  var hasTie=false;
  function appendRenderedTok(parent,tk){
      var noteNav=noteNavOf(tk);if(noteNav){attachNoteNavMark(parent.lastElementChild,noteNav);return;}
    var ts2=jpTieSpan(tk);
    if(ts2){parent.appendChild(makeJpTie(ts2));hasTie=true;return;}
    var inlineTs=extractInlineTimeSignToken(tk);
    parent.appendChild(inlineTs?makeTimeSignature(inlineTs):parseJpToken(tk));
  }
  function isDualAtom(tk){
    if(!tk||tk==='/'||tk==='／'||tk==='!'||tk.charAt(0)==='~'||tk.charAt(0)==='*')return false;
    if(tk==='('||tk===')'||tk==='(['||tk==='])'||tk==='}'||tk==='[v1'||tk==='[v2'||tk===']v')return false;
    if(isBarlineTok(tk))return false;
    if(/^\\{(3|5)$/.test(tk))return false;
    if(extractInlineTimeSignToken(tk))return false;
    if(/^\\[v:(.+)\\]$/.test(tk))return false;
    return true;
  }
  var rawToks=nStr.trim().split(/\\s+/),toks=[],ti=0;
  while(ti<rawToks.length){
    if(ti+2<rawToks.length && (rawToks[ti+1]==='/'||rawToks[ti+1]==='／') && isDualAtom(rawToks[ti]) && isDualAtom(rawToks[ti+2])){
      toks.push(rawToks[ti]+'/'+rawToks[ti+2]);
      ti+=3;
      continue;
    }
    toks.push(rawToks[ti]);
    ti++;
  }
  var i=0;
  while(i<toks.length){
    var t=toks[i];
    var inlineTs=extractInlineTimeSignToken(t);
    if(inlineTs){div.appendChild(makeTimeSignature(inlineTs));i++;continue;}
    var tieSpan=jpTieSpan(t);
    if(tieSpan){div.appendChild(makeJpTie(tieSpan));hasTie=true;i++;continue;}
    var _nnav=noteNavOf(t);if(_nnav){attachNoteNavMark(div.lastElementChild,_nnav);i++;continue;}   // *coda/*segno/… 挂在前一个音符上方
    if(t==='('){var sl=document.createElement('span');sl.className='jp-slur';i++;while(i<toks.length&&toks[i]!==')')appendRenderedTok(sl,toks[i++]);div.appendChild(sl);i++;continue;}
    if(t==='(['){var so=document.createElement('span');so.className='jp-slur-open';i++;while(i<toks.length&&toks[i]!=='])') appendRenderedTok(so,toks[i++]);div.appendChild(so);i++;continue;}
    if(t==='])'){var sc=document.createElement('span');sc.className='jp-slur-close';i++;if(i<toks.length)appendRenderedTok(sc,toks[i++]);div.appendChild(sc);continue;}
    if(t==='[v1'||t==='[v2'||t===']v'||/^\\[v:(.+)\\]$/.test(t)){i++;continue;} // 跨格volta由renderPreview层处理
    var tm=t.match(/^\\{(3|5)$/);if(tm){var tn=parseInt(tm[1],10);var tp=makeTuplet(tn);i++;while(i<toks.length&&toks[i]!=='}')appendRenderedTok(tp,toks[i++]);div.appendChild(tp);i++;continue;}
    if(t==='}'){i++;continue;}
    appendRenderedTok(div,t);i++;
  }
  if(hasTie&&typeof requestAnimationFrame==='function'){
    requestAnimationFrame(function(){layoutJpArcs(div);});
  }
  return div;
}
var mtFitFrame=0,mtPreviewFitTimer=0;
function fitPreview(){
  if(mtPreviewFitTimer)clearTimeout(mtPreviewFitTimer);mtPreviewFitTimer=0;
  if(mtFitFrame)return;
  mtFitFrame=requestAnimationFrame(function(){
    mtFitFrame=0;
    var wrap=document.getElementById('previewWrap');
    var inner=wrap.querySelector('.prev-inner');
    if(!inner)return;
    inner.style.transform='';inner.style.transformOrigin='';inner.style.width='';inner.style.marginBottom='';
    /* CECP-CHORD-FIT：和弦避让要排在 justify 与量宽之前 —— 它给个别列加 padding，
       两者都得把这些 padding 算进行宽。它内部逐行临时 inline-flex 量自然宽，不怕容器挤压。 */
    if(STRICT_MODE)layoutStrictChordsAll(inner);
    if(justifyRowsOn)justifyScoreRows(inner.querySelectorAll('.prev-row'));
    else justifyScoreRowsClear(inner);
    // 版面居中：内容最大宽度 SCORE_MAXW，窄屏两侧留 SCORE_PAD；内容缩到 ≤ 此宽度并水平居中。
    // 编辑预览只缩小、不放大真实尺寸。导出在 musiclib，与本预览无关。
    var rawAvail=wrap.clientWidth;
    if(!rawAvail)return;
    var SCORE_MAXW=1000,SCORE_PAD=16;   // ← 平板实测后可调这个数
    var avail=Math.max(1,Math.min(rawAvail-SCORE_PAD*2,SCORE_MAXW));
    var maxW=0;
    var measuredRows=inner.querySelectorAll('.prev-row');
    measuredRows.forEach(function(row){row.style.display='inline-flex';});
    measuredRows.forEach(function(row){if(row.scrollWidth>maxW)maxW=row.scrollWidth;});
    measuredRows.forEach(function(row){row.style.display='';});
    if(!maxW)return;
    inner.style.width=maxW+'px';
    /* ⚠️ 梁/弧必须排在 inner.style.width 定死之后：之前行还被容器挤着
       (.prev-row 是 flex，窄屏上音位列会被 flex-shrink 压扁)，那时量到的坐标是压缩过的，
       撑开后弧线会整体左移——屏幕越窄偏得越多，宽屏因为容器≈自然宽所以看不出来。 */
    if(STRICT_MODE){
      inner.querySelectorAll('.prev-row').forEach(connectStrictBeams);
    }
    layoutStrictArcsAll(inner);
    positionVoltaRails(inner);
    var scale=maxW>avail?avail/maxW:1;
    var visualW=maxW*scale;
    var centerX=Math.max(0,(rawAvail-visualW)/2);
    inner.style.transform='translateX('+centerX.toFixed(1)+'px)'+(scale<1?(' scale('+scale+')'):'');
    inner.style.transformOrigin='left top';
    if(scale<1){var h=inner.offsetHeight;inner.style.marginBottom=(h*(scale-1))+'px';}
  });
}
/* 网页字体(Space Mono / Noto Serif SC)是异步加载的：justify 与量宽若在字体到位前跑，
   量到的是回退字体的宽度，字体一到行宽就变、两端对齐就散了（实测各行差十几 px）。
   youth 与 musiclib 都有这个兜底(fonts.ready 后重跑 fitRows)，musictool 一直漏了。 */
if(document.fonts&&document.fonts.ready){
  document.fonts.ready.then(function(){ try{fitPreview();}catch(e){} });
}

  /* Keep the ending rail between chords and notes, in unscaled layout coordinates. */
  function positionVoltaRails(scope){scoreLayoutChordRows(scope);
  }
function normalizePreviewRowHeights(scope,rowList){
  var rows=rowList||(scope?Array.prototype.slice.call(scope.querySelectorAll('.prev-row')):[]);
  rows.forEach(function(row){row.style.setProperty('--row-note-height','0px');});
  var heights=rows.map(function(row){
    var maxH=0;
    row.querySelectorAll('.p-n').forEach(function(noteLane){maxH=Math.max(maxH,noteLane.offsetHeight||0);});
    return maxH;
  });
  rows.forEach(function(row,i){if(heights[i])row.style.setProperty('--row-note-height',heights[i]+'px');});
}

var STRICT_MODE=true;   // 严格对位模式：**新建默认开**（用户 2026-07-26 要求）/ import 老歌会自动关；建歌时定死，存盘写 align
/* 严格对位模式 UI：建歌时定死——一旦有音符即锁定，不能再切（改模式=新建/重做，符合§8不做切换开关）。 */
function strictHasNotes(){
  return data.some(function(sec){return (sec.lines||[]).some(function(l){return (l.segs||[]).some(function(s){return s.n&&s.n.trim();});});});
}
function updateStrictUi(){
  var cb=document.getElementById('strictToggle');if(!cb)return;
  cb.checked=!!STRICT_MODE;
  cb.disabled=strictHasNotes();
  var fb=document.getElementById('strictFillBtn');if(fb)fb.style.display=STRICT_MODE?'inline-flex':'none';
}
function onStrictToggle(cb){
  if(strictHasNotes()){cb.checked=STRICT_MODE;return;}  // 已有音符：锁定不可切
  STRICT_MODE=cb.checked;
  renderEditor();
}
/* 自动补齐 @：按 n 的音位数，把 chord/歌词尾部不足的位补 @（已够/超出不动，超出由校验提示）。 */
function strictFillField(val,slotCount){
  var toks=String(val==null?'':val).trim();
  toks=toks?toks.split(/\\s+/):[];
  while(toks.length<slotCount)toks.push('@');
  return toks.join(' ');
}
function strictAutoFill(){
  data.forEach(function(sec){(sec.lines||[]).forEach(function(line){(line.segs||[]).forEach(function(seg){
    var n=String(seg.n||'').trim();if(!n)return;
    var sc=saSplitSlots(n).length;if(!sc)return;
    seg.chord=strictFillField(seg.chord,sc);
    seg.lyric=strictFillField(seg.lyric,sc);
    if(seg.lyric2!=null&&String(seg.lyric2).trim())seg.lyric2=strictFillField(seg.lyric2,sc);
    if(seg.lyric3!=null&&String(seg.lyric3).trim())seg.lyric3=strictFillField(seg.lyric3,sc);
    if(seg.lyric4!=null&&String(seg.lyric4).trim())seg.lyric4=strictFillField(seg.lyric4,sc);
  });});});
}
function strictAutoFillClick(){ if(!STRICT_MODE)return; strictAutoFill(); renderEditor(); renderPreview(); }
/* 严格对位一个 seg 渲染成每音位一列（复用 parseJpToken/makeBarline，不另建渲染器）。
   预览与 youth/musiclib 成品逐像素一致：@ 不显示。点任一列 = 定位该 seg 编辑。 */
function buildStrictSegColumnsMT(seg, container, psi, pli, pgi, bold){
  var NB=String.fromCharCode(160);
  var toks=saTokenizeN(seg.n||'');
  var lyricFields=[seg.lyric||''];
  if(seg.lyric2!=null)lyricFields.push(seg.lyric2);
  if(seg.lyric3!=null)lyricFields.push(seg.lyric3);
  if(seg.lyric4!=null)lyricFields.push(seg.lyric4);
  var aligned=saAlignRow(seg.n||'', seg.chord||'', lyricFields);
  var nLy=aligned.lyrics.length, slot=0, pendingSlurOpen=0, pendingSlurClose=0, pendingTupletN=0, lastSlotCol=null;
  function onClick(){previewSegClick(psi,pli,pgi);}
  function lyRow(val,j){var l=document.createElement('div');l.className='p-lyric'+(j?' p-lyric'+(j+1):'')+(bold?' bold':'');if(val==null){setLyricContentEx(l,NB,mtSetPlainText);return l;}var lsp=saSplitTrailingPunct(String(val));if(lsp.punct){setLyricContentEx(l,lsp.base||NB,mtSetPlainText);var pun=document.createElement('span');pun.className='p-punct';pun.textContent=lsp.punct;l.appendChild(pun);}else{setLyricContentEx(l,String(val),mtSetPlainText);}return l;}
  toks.forEach(function(tok){
    if(tok==='!'){var lc=container.lastElementChild;
      if(lc){lc.setAttribute('data-bb','1');
        /* 编辑器可见提示：断梁本身不占音位、不画任何东西，写的时候看不见容易写错，
           所以在前一个音的右侧挂一条虚线小竖杠。零宽绝对定位，不影响任何布局；
           只有 musictool 有这段，musiclib/youth 的成品谱不会出现。 */
        var _bn=lc.querySelector('.p-n');
        if(_bn&&!_bn.querySelector('.mt-bb-mark')){var _bm=document.createElement('span');_bm.className='mt-bb-mark';_bm.title='断梁 !';_bn.appendChild(_bm);}
      }
      return;}  // 断梁标记
    var _nnav=noteNavOf(tok);if(_nnav){attachNoteNavMark(container.lastElementChild,_nnav);return;}   // *coda/*segno/… 挂在前一个音位的音符上方
    if(saIsDualAtom(tok)){
      var col=document.createElement('div');col.className='prev-seg p-slot';col.setAttribute('data-loc',psi+'-'+pli+'-'+pgi);col.addEventListener('click',onClick);
      if(pendingSlurOpen){col.setAttribute('data-slur-open',pendingSlurOpen);pendingSlurOpen=0;}
      var _isSp=(tok==='sp'||tok==='sp_'||tok==='sp__');if(_isSp)col.setAttribute('data-sp','1');
      if(pendingSlurClose&&!_isSp){col.setAttribute('data-tie-close',((+col.getAttribute('data-tie-close'))||0)+pendingSlurClose);pendingSlurClose=0;}   // ~ 收口跳过 sp(同老版 layoutJpArcs：原子不含 sp)
      if(pendingTupletN){col.setAttribute('data-tuplet-open',pendingTupletN);pendingTupletN=0;}
      var chVal=aligned.chords[slot];
      var c=document.createElement('div');c.className='p-chord'+(chVal?'':' empty');
      if(chVal){
        var stack=saSplitChordStack(chVal);
        if(stack.length<=1){ setChordContentEx(c, chVal, mtSetPlainText); chordChipDecorate(c); }
        else { c.className+=' p-chord-multi'; stack.slice().reverse().forEach(function(sym){ var ln=document.createElement('div');ln.className='p-chord-stk'; setChordContentEx(ln, sym, mtSetPlainText); chordChipDecorate(ln); c.appendChild(ln); }); }
      } else { setChordContentEx(c, NB, mtSetPlainText); }
      chordFitPrepare(c);      // CECP-CHORD-FIT：拆成「前两字(对中) + 尾巴(零宽右延伸)」
      col.appendChild(c);
      var nWrap=document.createElement('div');nWrap.className='p-n';nWrap.appendChild(parseJpToken(tok));col.appendChild(nWrap);
      for(var j=0;j<nLy;j++){col.appendChild(lyRow(aligned.lyrics[j][slot],j));}
      if(col.querySelector('.p-punct'))col.classList.add('p-punct-gap');
      container.appendChild(col);slot++;lastSlotCol=col;
    } else if(isBarlineTok(tok)){
      var b=document.createElement('div');b.className='prev-seg p-slot p-barslot';b.setAttribute('data-loc',psi+'-'+pli+'-'+pgi);b.addEventListener('click',onClick);
      var bc=document.createElement('div');bc.className='p-chord empty';setChordContentEx(bc,NB,mtSetPlainText);b.appendChild(bc);
      var bn=document.createElement('div');bn.className='p-n';bn.appendChild(makeBarline(tok));b.appendChild(bn);
      for(var j2=0;j2<nLy;j2++){b.appendChild(lyRow(NB,j2));}
      container.appendChild(b);
    } else if(extractInlineTimeSignToken(tok)){
      var t2=document.createElement('div');t2.className='prev-seg p-slot p-barslot';
      var tn=document.createElement('div');tn.className='p-n';tn.appendChild(makeTimeSignature(extractInlineTimeSignToken(tok)));t2.appendChild(tn);
      container.appendChild(t2);
    } else if(tok==='('||tok==='(['){ pendingSlurOpen++; }
    else if(tok===')'||tok==='])'){ if(lastSlotCol)lastSlotCol.setAttribute('data-slur-close',((+lastSlotCol.getAttribute('data-slur-close'))||0)+1); }
    else if(tok==='{3'||tok==='{5'){ pendingTupletN=parseInt(tok.slice(1),10); }
    else if(tok==='}'){ if(lastSlotCol)lastSlotCol.setAttribute('data-tuplet-close','1'); }
        else if(tok.charAt(0)==='~'){var tieSpan=jpTieSpan(tok)||1;var tieCols=[].slice.call(container.querySelectorAll('.prev-seg.p-slot')).filter(function(c){return !c.classList.contains('p-barslot')&&!c.getAttribute('data-sp');});var tieStart=tieCols[tieCols.length-tieSpan];if(tieStart){tieStart.setAttribute('data-tie-open',((+tieStart.getAttribute('data-tie-open'))||0)+1);pendingSlurClose++;}}
  });
}
/* 严格对位「连梁」：相邻下划线音位补齐减时线贴上；小节线/sp/非下划线天然断开。
   幂等；在 justifyScoreRows 之后、缩放之前跑（自然坐标 scale≈1）。 */
function connectStrictBeams(row){
  if(!row)return;
  var slots=[].slice.call(row.querySelectorAll('.prev-seg.p-slot'));
  slots.forEach(function(c){[].forEach.call(c.querySelectorAll('.jp-u1-line,.jp-u2-line'),function(u){u.style.right='';u.style.left='';});});
  ['jp-u1-line','jp-u2-line'].forEach(function(cls){
    for(var i=0;i<slots.length-1;i++){
      var a=slots[i],b=slots[i+1];
      if(a.classList.contains('p-barslot')||b.classList.contains('p-barslot'))continue;
      if(a.getAttribute('data-bb'))continue;  // 断梁标记
      var ua=a.querySelector('.'+cls),ub=b.querySelector('.'+cls);
      if(!ua||!ub)continue;
      var ra=ua.getBoundingClientRect(),rb=ub.getBoundingClientRect();
      var scale=ua.offsetWidth?(ra.width/ua.offsetWidth):1;if(!scale)scale=1;
      var gap=(rb.left-ra.right)/scale;
      if(gap>0.3)ua.style.right=(-(gap+1))+'px';
    }
  });
}
/* 严格对位：连音线弧 + 三连音括号。读列上的 data-slur-open/close、data-tuplet-open/close，
   栈式配对（支持嵌套、跨小节；跨行留后续），画 SVG 覆盖层。在缩放前跑（自然坐标，随后随整板缩放）。 */
function layoutStrictArcs(row){
  if(!row)return;
  var prev=row.querySelector('.strict-arc-svg');if(prev)prev.remove();
  [].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){ch.style.marginBottom='';});  // 清上次抬升
  var slots=[].slice.call(row.querySelectorAll('.prev-seg.p-slot')).filter(function(c){return !c.classList.contains('p-barslot');});
  if(!slots.length)return;
  var stack=[],groups=[],tupOpen=null,tups=[];
  slots.forEach(function(col){
    var so=(+col.getAttribute('data-slur-open'))||0, sc=(+col.getAttribute('data-slur-close'))||0;
    var to=(+col.getAttribute('data-tuplet-open'))||0, tc=col.getAttribute('data-tuplet-close'),k;
    for(k=0;k<so;k++)stack.push(col);
    for(k=0;k<sc;k++){var st=stack.pop();if(st)groups.push({start:st,end:col});}
    if(to)tupOpen={start:col,n:to};
    if(tc&&tupOpen){tups.push({start:tupOpen.start,end:col,n:tupOpen.n});tupOpen=null;}
  });
  if(!groups.length&&!tups.length)return;
  var probe=slots[0].querySelector('.jp-num'),scale=1;
  if(probe&&probe.offsetWidth){var pr=probe.getBoundingClientRect();scale=pr.width/probe.offsetWidth;}
  if(!scale)scale=1;
  var rr=row.getBoundingClientRect();
  function box(col){var el=col.querySelector('.jp-num')||col.querySelector('.jp-plain-sym')||col.querySelector('.p-n')||col;var r=el.getBoundingClientRect(),rr=row.getBoundingClientRect();var _t=r.top,_od=col.querySelector('.jp-dot-top');if(_od){var _or=_od.getBoundingClientRect();if(_or.height&&_or.top<_t)_t=_or.top;}   // 高音点在数字上方：弧线要抬到点之上,免得压住看不清
      return {cx:(r.left+r.width/2-rr.left)/scale,top:(_t-rr.top)/scale};}
  function ix(c){return slots.indexOf(c);}
  var NS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(NS,'svg');svg.setAttribute('class','strict-arc-svg');
  svg.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:4;';
  var maxD=0;
  groups.forEach(function(g){var gs=ix(g.start),ge=ix(g.end);g._d=0;groups.forEach(function(h){if(h===g)return;var hs=ix(h.start),he=ix(h.end);if(hs<=gs&&ge<=he&&(he-hs)>(ge-gs))g._d++;});if(g._d>maxD)maxD=g._d;});
  var STEP=7,BASE=9,reserve=0;
  if(groups.length)reserve=Math.max(reserve,15+maxD*STEP);
  if(tups.length)reserve=Math.max(reserve,20);
  [].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){if(reserve)ch.style.marginBottom=reserve+'px';});  // 整行和弦统一抬到弧线之上（一行一个高度）
  groups.forEach(function(g){
    var lift=maxD-g._d,arcH=BASE+lift*STEP;  // 外层弧高、内层弧低（内层在里面）
    var a=box(g.start),b=box(g.end),y=Math.min(a.top,b.top)-2;
    var p=document.createElementNS(NS,'path');
    p.setAttribute('d','M '+a.cx.toFixed(1)+' '+y.toFixed(1)+' Q '+((a.cx+b.cx)/2).toFixed(1)+' '+(y-arcH*2).toFixed(1)+' '+b.cx.toFixed(1)+' '+y.toFixed(1));
    p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.4');p.setAttribute('stroke-linecap','round');
    svg.appendChild(p);
  });
  tups.forEach(function(g){
    var a=box(g.start),b=box(g.end),x1=a.cx-4,x2=b.cx+4,y=Math.min(a.top,b.top)-7;
    var p=document.createElementNS(NS,'path');
    p.setAttribute('d','M '+x1.toFixed(1)+' '+(y+4)+' L '+x1.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+(y+4));
    p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.2');svg.appendChild(p);
    var t=document.createElementNS(NS,'text');t.setAttribute('x',((x1+x2)/2).toFixed(1));t.setAttribute('y',(y-2).toFixed(1));t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.setAttribute('fill','currentColor');t.textContent=g.n;svg.appendChild(t);
  });
  row.style.position='relative';row.appendChild(svg);
}
/* 整首级连音弧：栈跨 row 配对（支持跨行连音——上行画开口弧、下行画收口弧）+ 三连音括号。
   逐行算 reserve 抬升整行和弦到弧上（一行一个高度）。缩放前跑，box 每次重测 row rect。 */
function layoutStrictArcsAll(scope){
  if(!scope)return;
  var rows=[].slice.call(scope.querySelectorAll('.prev-row'));
  if(!rows.length)return;
  rows.forEach(function(row){var s=row.querySelector('.strict-arc-svg');if(s)s.remove();[].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){ch.style.marginBottom='';});});
  var all=[];
  rows.forEach(function(row){[].slice.call(row.querySelectorAll('.prev-seg.p-slot')).forEach(function(col){if(!col.classList.contains('p-barslot'))all.push({col:col,row:row});});});
  if(!all.length)return;
  var sstack=[],ystack=[],sgroups=[],tstack=[],tgroups=[];
  all.forEach(function(s,i){
    var so=(+s.col.getAttribute('data-slur-open'))||0,sc=(+s.col.getAttribute('data-slur-close'))||0,to=(+s.col.getAttribute('data-tuplet-open'))||0,tc=s.col.getAttribute('data-tuplet-close'),k;
    for(k=0;k<so;k++)sstack.push(i);
    for(k=0;k<sc;k++){var st=sstack.pop();if(st!=null)sgroups.push({s:st,e:i});}
      var yc=(+s.col.getAttribute('data-tie-close'))||0,yo=(+s.col.getAttribute('data-tie-open'))||0;   // ~ 连音独立栈：同列先收后开(链式 1~1~1 = 相邻小弧,同老版)
      for(k=0;k<yc;k++){var yt=ystack.pop();if(yt!=null)sgroups.push({s:yt,e:i,tie:1});}
      for(k=0;k<yo;k++)ystack.push(i);
    if(to)tstack.push({i:i,n:to});
    if(tc){var tt=tstack.pop();if(tt)tgroups.push({s:tt.i,e:i,n:tt.n});}
  });
  var dangles=[];while(sstack.length){var _ds=sstack.pop();if(_ds!=null)dangles.push(_ds);}while(ystack.length){var _dy=ystack.pop();if(_dy!=null)dangles.push(_dy);}   // 未闭合的 ( ：先画到行尾的开口半弧，边写边可见
    if(!sgroups.length&&!tgroups.length&&!dangles.length)return;
  sgroups.forEach(function(g){g._d=0;sgroups.forEach(function(h){if(h===g)return;if(h.s<=g.s&&g.e<=h.e&&(h.e-h.s)>(g.e-g.s))g._d++;});});
  var maxD=0;sgroups.forEach(function(g){if(g._d>maxD)maxD=g._d;});
  var STEP=7,BASE=9,NS='http://www.w3.org/2000/svg';
  function rIx(r){return rows.indexOf(r);}
  rows.forEach(function(row){
    var here=[];
    sgroups.forEach(function(g){var sr=all[g.s].row,er=all[g.e].row,ri=rIx(row),si=rIx(sr),ei=rIx(er);
      if(sr===row&&er===row)here.push({g:g,m:'full'});
      else if(sr===row)here.push({g:g,m:'open'});
      else if(er===row)here.push({g:g,m:'close'});
      else if(ri>si&&ri<ei)here.push({g:g,m:'thru'});
    });
    dangles.forEach(function(_ds){if(all[_ds].row===row)here.push({g:{s:_ds,e:_ds,_d:0},m:'open'});});
      var tHere=tgroups.filter(function(g){return all[g.s].row===row&&all[g.e].row===row;});
    if(!here.length&&!tHere.length)return;
    var reserve=0;if(here.length)reserve=Math.max(reserve,13+maxD*8);if(tHere.length)reserve=Math.max(reserve,20);
    [].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){if(reserve)ch.style.marginBottom=reserve+'px';});
    var cols=[].slice.call(row.querySelectorAll('.prev-seg.p-slot')).filter(function(c){return !c.classList.contains('p-barslot');});
    var probe=cols[0]&&cols[0].querySelector('.jp-num'),scale=1;
    if(probe&&probe.offsetWidth){var pr=probe.getBoundingClientRect();scale=pr.width/probe.offsetWidth;}if(!scale)scale=1;
    function box(col){var el=col.querySelector('.jp-num')||col.querySelector('.jp-plain-sym')||col.querySelector('.p-n')||col;var r=el.getBoundingClientRect(),rr=row.getBoundingClientRect();var _t=r.top,_od=col.querySelector('.jp-dot-top');if(_od){var _or=_od.getBoundingClientRect();if(_or.height&&_or.top<_t)_t=_or.top;}   // 高音点在数字上方：弧线要抬到点之上,免得压住看不清
      return {cx:(r.left+r.width/2-rr.left)/scale,top:(_t-rr.top)/scale};}
    function rowW(){return row.getBoundingClientRect().width/scale;}
    // 旧渲染器 .jp-slur 同款：CSS 边框拱形(border-top/left/right + border-radius:50%/100% = 半椭圆拱)。全=拱、open=左半(左圆右平)、close=右半。三连音括号仍用 SVG。
    var host=document.createElement('div');host.className='strict-arc-svg';host.style.cssText='position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:4;color:currentColor;';
    var ARCH=9,STK=1.5,GAP=2,ASTEP=8,firstCol=cols[0],lastCol=cols[cols.length-1];
    function edge(col,side){var el=col.querySelector('.jp-num')||col.querySelector('.jp-plain-sym')||col.querySelector('.p-n')||col;var r=el.getBoundingClientRect(),rr=row.getBoundingClientRect();return ((side==='r'?r.right:r.left)-rr.left)/scale;}
    here.forEach(function(it){
      var g=it.g,lift=maxD-g._d,L,W,nt,cls;
      if(it.m==='full'){var a=box(all[g.s].col),b=box(all[g.e].col);var pad=0;   /* 端点一律精确对音位中心：相邻弧共享同一坐标才能无缝(slur 原来探出 2px 会跟 tie 重叠) */L=a.cx-pad;W=(b.cx-a.cx)+pad*2;nt=Math.min(a.top,b.top);for(var _k=g.s+1;_k<g.e;_k++){var _mt=box(all[_k].col).top;if(_mt<nt)nt=_mt;}cls='f';}
      else if(it.m==='open'){var a2=box(all[g.s].col);L=a2.cx;W=(edge(lastCol,'r')+4)-a2.cx;nt=a2.top;cls='o';}
      else if(it.m==='close'){var b2=box(all[g.e].col);L=edge(firstCol,'l')-4;W=b2.cx-L;nt=b2.top;cls='c';}
      else {L=edge(firstCol,'l')-4;W=(edge(lastCol,'r')+4)-L;nt=box(cols[0]).top;cls='t';}
      if(W<8)W=8;
      var top=nt-GAP-ARCH-lift*ASTEP;
      var css='position:absolute;box-sizing:border-box;pointer-events:none;left:'+L.toFixed(1)+'px;top:'+top.toFixed(1)+'px;width:'+W.toFixed(1)+'px;height:'+ARCH+'px;border:'+STK+'px solid currentColor;border-bottom:none;';
      if(cls==='f')css+='border-radius:50% 50% 0 0/100% 100% 0 0;';
      else if(cls==='o')css+='border-right:none;border-radius:50% 0 0 0/100% 0 0 0;';
      else if(cls==='c')css+='border-left:none;border-radius:0 50% 0 0/0 100% 0 0;';
      else css+='border-left:none;border-right:none;';
      var div=document.createElement('div');div.style.cssText=css;host.appendChild(div);
    });
    if(tHere.length){
      var svg=document.createElementNS(NS,'svg');svg.setAttribute('class','strict-arc-tup');svg.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:4;';
      tHere.forEach(function(g){var a=box(all[g.s].col),b=box(all[g.e].col),x1=a.cx-4,x2=b.cx+4,y=Math.min(a.top,b.top)-7;var p=document.createElementNS(NS,'path');p.setAttribute('d','M '+x1.toFixed(1)+' '+(y+4)+' L '+x1.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+(y+4));p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.2');svg.appendChild(p);var t=document.createElementNS(NS,'text');t.setAttribute('x',((x1+x2)/2).toFixed(1));t.setAttribute('y',(y-2).toFixed(1));t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.setAttribute('fill','currentColor');t.textContent=g.n;svg.appendChild(t);});
      host.appendChild(svg);
    }
    row.style.position='relative';row.appendChild(host);
  });
}
/* Input events never rebuild the whole song. Structural edits still use renderPreview(). */
var mtPreviewFrame=0,mtPreviewRows={},mtPreviewFull=false,mtCodeTimer=0;
function cancelScheduledPreview(){
  if(mtPreviewFrame)cancelAnimationFrame(mtPreviewFrame);
  mtPreviewFrame=0;mtPreviewRows={};mtPreviewFull=false;
}
function scheduleCode(){
  if(mtCodeTimer)clearTimeout(mtCodeTimer);
  mtCodeTimer=setTimeout(renderCode,180);
}
function schedulePreview(si,li){
  if(typeof si!=='number'||typeof li!=='number')mtPreviewFull=true;
  else mtPreviewRows[si+'-'+li]=[si,li];
  mtDraftSaveSoon();
  if(!mtPreviewFrame)mtPreviewFrame=requestAnimationFrame(flushPreview);
}
function flushPreview(){
  var rows=mtPreviewRows,full=mtPreviewFull;
  cancelScheduledPreview();
  var inner=document.querySelector('#previewWrap .prev-inner');
  if(full||!inner){renderPreview();return;}
  var changed=[];
  var keys=Object.keys(rows);
  for(var i=0;i<keys.length;i++){
    var si=rows[keys[i]][0],li=rows[keys[i]][1],sec=data[si];
    var section=inner.querySelector('[data-preview-section="'+si+'"]');
    if(!sec||!section){renderPreview();return;}
    section.querySelector('.prev-sec-name').textContent=sec.name;
    if(li<0)continue;
    var old=section.querySelectorAll('[data-preview-line="'+si+'-'+li+'"]');
    if(!old.length||!sec.lines[li]){renderPreview();return;}
    var fragment=buildPreviewLine(sec.lines[li],si,li);
    Array.prototype.forEach.call(fragment.childNodes,function(node){if(node.classList.contains('prev-row'))changed.push(node);});
    section.insertBefore(fragment,old[0]);
    Array.prototype.forEach.call(old,function(node){node.remove();});
  }
  normalizePreviewRowHeights(null,changed);
  if(changed.length){
    if(mtPreviewFitTimer)clearTimeout(mtPreviewFitTimer);
    mtPreviewFitTimer=setTimeout(fitPreview,100);
  }
  scheduleCode();
  updateStrictUi();
}
function buildPreviewLine(line,psi,pli){
  var fragment=document.createDocumentFragment();
      var row=document.createElement('div');row.className='prev-row'+(line.bold?' bold':'');
      var voltaWrap=null;
      line.segs.forEach(function(seg,pgi){
        if(!segIsRenderableBlock(seg))return;
        if(segIsLabelBlock(seg)){
          var lb=segRenderLabelBlock(seg,row);
          var lbTag=lb.firstChild;
          if(lbTag){
            lbTag.title='按住左右拖动调整位置 · 点击定位编辑行';
            lbTag.addEventListener('pointerdown',function(ev){startLabelDrag(ev,psi,pli,pgi,lbTag);});
          }
          if(STRICT_MODE){   // 严格模式：段落标记独立一行(不与弧线/和弦挤)
            var lwRow=document.createElement('div');lwRow.className='strict-label-row';
            if(lbTag){lbTag.style.position='relative';lbTag.style.top=((Number(seg.dy)||0))+'px';lbTag.style.fontSize='13px';lwRow.appendChild(lbTag);}
            else lwRow.appendChild(lb);
            fragment.appendChild(lwRow);
            return;
          }
          (voltaWrap||row).appendChild(lb);
          return;
        }
        if(STRICT_MODE){
          var _vs=getVoltaStartLabel(seg.n);
          if(_vs){row.classList.add('has-volta');voltaWrap=document.createElement('span');voltaWrap.className='prev-volta';voltaWrap.setAttribute('data-v',_vs+'.');}
          buildStrictSegColumnsMT(seg,(voltaWrap||row),psi,pli,pgi,line.bold);
          if(voltaWrap&&hasVoltaEnd(seg.n)){voltaWrap.classList.add('closed');row.appendChild(voltaWrap);voltaWrap=null;}
          return;
        }
        var s=document.createElement('div');s.className='prev-seg';
        s.setAttribute('data-loc',psi+'-'+pli+'-'+pgi);
        s.addEventListener('click',function(){previewSegClick(psi,pli,pgi);});
        var c=document.createElement('div');c.className='p-chord'+(seg.chord?'':' empty');setChordContentEx(c,seg.chord||String.fromCharCode(160),mtSetPlainText);chordChipDecorate(c);s.appendChild(c);
        s.appendChild(renderNStr(seg.n||'',{inlineTimeSign:getSegInlineTimeSign(seg)}));
        var l=document.createElement('div');l.className='p-lyric'+(line.bold?' bold':'');setLyricContentEx(l,seg.lyric||'',mtSetPlainText);s.appendChild(l);
        if(seg.lyric2){var l2=document.createElement('div');l2.className='p-lyric p-lyric2'+(line.bold?' bold':'');setLyricContentEx(l2,seg.lyric2,mtSetPlainText);s.appendChild(l2);}
        if(seg.lyric3){var l3=document.createElement('div');l3.className='p-lyric p-lyric3'+(line.bold?' bold':'');setLyricContentEx(l3,seg.lyric3,mtSetPlainText);s.appendChild(l3);}
        if(seg.lyric4){var l4=document.createElement('div');l4.className='p-lyric p-lyric4'+(line.bold?' bold':'');setLyricContentEx(l4,seg.lyric4,mtSetPlainText);s.appendChild(l4);}
        // 检测 volta 开始（indexOf 避免反斜杠在 CMS 里丢失）
        var _vn=getVoltaStartLabel(seg.n);
        if(_vn){
          row.classList.add('has-volta');
          voltaWrap=document.createElement('span');
          voltaWrap.className='prev-volta';
          voltaWrap.setAttribute('data-v',_vn+'.');
        }
        (voltaWrap||row).appendChild(s);
        // 检测 volta 结束
        if(voltaWrap&&hasVoltaEnd(seg.n)){
          voltaWrap.classList.add('closed');
          row.appendChild(voltaWrap);
          voltaWrap=null;
        }
      });
      if(voltaWrap)row.appendChild(voltaWrap); // 未闭合的 volta
  fragment.appendChild(row);
  Array.prototype.forEach.call(fragment.childNodes,function(node){node.setAttribute('data-preview-line',psi+'-'+pli);});
  return fragment;
}
function renderPreview(){
  cancelScheduledPreview();
  var wrap=document.getElementById('previewWrap');wrap.innerHTML='';
  var inner=document.createElement('div');inner.className='prev-inner';

  // scoreImg 预览
  var scoreUrl=resolveMediaUrl((document.getElementById('meta-scoreimg')&&document.getElementById('meta-scoreimg').value)||'','https://cecpadua.github.io/resouces/scoreIMG/');
  if(scoreUrl){
    var si=document.createElement('div');si.style.cssText='margin-bottom:12px;';
    var img=document.createElement('img');img.src=scoreUrl;
    img.style.cssText='max-width:100%;border-radius:6px;border:1px solid var(--border);display:block;';
    img.onerror=function(){si.style.display='none';};
    si.appendChild(img);inner.appendChild(si);
  }

  data.forEach(function(sec,psi){
    var ps=document.createElement('div');ps.className='prev-sec';ps.setAttribute('data-preview-section',psi);
    var pn=document.createElement('div');pn.className='prev-sec-name';pn.textContent=sec.name;ps.appendChild(pn);
    sec.lines.forEach(function(line,pli){
      ps.appendChild(buildPreviewLine(line,psi,pli));
    });
    inner.appendChild(ps);
  });
  wrap.appendChild(inner);
  normalizePreviewRowHeights(inner);
  fitPreview();
  renderCode();
  updateStrictUi();
}
function jq(s){ return JSON.stringify(s); }
function renderCode(){
  if(mtCodeTimer)clearTimeout(mtCodeTimer);mtCodeTimer=0;
  // 输出合法 JSON，可直接存成 .json 文件
  var lines=['"sections": ['];
  data.forEach(function(sec,si){
    var last=si===data.length-1;
    lines.push('  {');
    lines.push('    "name": '+jq(sec.name)+',');
    lines.push('    "lines": [');
    sec.lines.forEach(function(line,li){
      var lastLine=li===sec.lines.length-1;
      var isObj=line.bold;
      if(isObj){
        lines.push('      { "b": true, "line": [');
      } else {
        lines.push('      [');
      }
      line.segs.forEach(function(seg,gi){
        var lastSeg=gi===line.segs.length-1;
        if(segIsLabelBlock(seg)){
          var lobj={label:seg.label};
          if(seg.style)lobj.style=seg.style;
          if(Number(seg.dx))lobj.dx=Number(seg.dx);
          if(Number(seg.dy))lobj.dy=Number(seg.dy);
          lines.push('        '+JSON.stringify(lobj)+(lastSeg?'':','));
          return;
        }
        if(!segIsRenderableBlock(seg)){
          lines.push('        '+JSON.stringify(seg)+(lastSeg?'':','));
          return;
        }
        var obj={chord:seg.chord||''};
        var segTimeSign=getSegInlineTimeSign(seg)||String(seg.timeSign||seg.ts||seg.meter||'').trim();
        if(segTimeSign)obj.timeSign=segTimeSign;
        if(seg.n&&seg.n.trim())obj.n=seg.n;
        obj.lyric=seg.lyric||'';
        if(seg.lyric2)obj.lyric2=seg.lyric2;
        if(seg.lyric3)obj.lyric3=seg.lyric3;
        if(seg.lyric4)obj.lyric4=seg.lyric4;
        lines.push('        '+JSON.stringify(obj)+(lastSeg?'':','));
      });
      lines.push(line.bold?'      ]}'+(!lastLine?',':''):'      ]'+(!lastLine?',':''));
    });
    lines.push('    ]');
    lines.push('  }'+(last?'':','));
  });
  lines.push(']');
  document.getElementById('codeBox').textContent=lines.join('\\n');
}
function copyCode(){
  renderCode();
  navigator.clipboard.writeText(document.getElementById('codeBox').textContent).then(function(){
    var btns=document.querySelectorAll('.copy-btn');btns[0].textContent='已复制 ✓';
    setTimeout(function(){btns[0].textContent='复制 sections 数组';},2000);
  });
}
function copyFullJson(){
  if(STRICT_MODE){strictAutoFill();renderEditor();}  // 严格对位：存盘前按音位补齐尾部 @
  // Build sections array from codeBox (already rendered JSON)
  renderCode();
  var secText=document.getElementById('codeBox').textContent;
  // Extract just the array part (between first [ and last ])
  var firstBracket=secText.indexOf('[');
  var lastBracket=secText.lastIndexOf(']');
  var secArr=secText.slice(firstBracket,lastBracket+1);

  var bpm=parseInt(document.getElementById('meta-bpm').value)||72;
  var now=new Date();
  var pad=function(n){return n<10?'0'+n:n;};
  var ts=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
  var song={
    version:'1',
    created:'YuEn',
    createdTime:ts,
    id:document.getElementById('meta-id').value||'song-id',
    title:document.getElementById('meta-title').value||'',
    artist:document.getElementById('meta-artist').value||'',
    sub:document.getElementById('meta-sub').value||'',
    origKey:document.getElementById('meta-key').value||'C',
    timeSign:normalizeTimeSignValue((document.getElementById('meta-timesign')||{}).value)||'4/4',
    bpm:bpm,
    mp3:(document.getElementById('meta-mp3')||{}).value||'',
    cover:resolveMediaUrl(document.getElementById('meta-cover').value||'','https://cecpadua.github.io/resouces/covers/'),
    lrc:resolveMediaUrl(document.getElementById('meta-lrc').value||'','https://cecpadua.github.io/resouces/lyrics/'),
    youtube:document.getElementById('meta-youtube').value||'',
    scoreImg:resolveMediaUrl(document.getElementById('meta-scoreimg').value||'','https://cecpadua.github.io/resouces/scoreIMG/')
  };
  if(STRICT_MODE) song.align='strict';  // 严格对位：写入 align，让 youth/musiclib 走 strict 分支

  // Build JSON string manually to embed sections as raw JSON (already valid)
  var lines=[];
  lines.push('{');
  Object.keys(song).forEach(function(k){
    var v=song[k];
    if(typeof v==='number') lines.push('  "'+k+'": '+v+',');
    else lines.push('  "'+k+'": '+JSON.stringify(v)+',');
  });
  lines.push('  "sections": '+secArr);
  lines.push('}');
  var fullJson=lines.join('\\n');

  // Validate before copying
  try{
    JSON.parse(fullJson);
  }catch(e){
    alert('JSON 格式有误: '+e.message);
    return;
  }

  navigator.clipboard.writeText(fullJson).then(function(){
    var btns=document.querySelectorAll('.copy-btn');
    btns[1].textContent='已复制 ✓';
    setTimeout(function(){btns[1].textContent='复制完整 JSON 文件';},2000);
  });
}
function switchTop(name,btn){
  /* 只清面板 tab 的 on；data-action 类按钮（如「⇔ 对齐」）自管开关态 */
  document.querySelectorAll('.top-tab[data-top-tab]').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.top-panel').forEach(function(p){p.classList.remove('on');});
  var targetBtn=btn||document.querySelector('.top-tab[data-top-tab="'+name+'"]');
  if(targetBtn)targetBtn.classList.add('on');
  var panel=document.getElementById('top-'+name);
  if(panel)panel.classList.add('on');
  if(name==='tools')runToolCheck();
}
function bindTopbarActions(){
  var bar=document.querySelector('.topbar-tabs');
  if(!bar||bar.__bound)return;
  bar.__bound=true;
  bar.addEventListener('click',function(e){
    var btn=e.target.closest('button');
    if(!btn)return;
    var tab=btn.getAttribute('data-top-tab');
    var action=btn.getAttribute('data-action');
    if(tab){switchTop(tab,btn);return;}
    if(action==='import')openImport();
    else if(action==='bulk-lyric')openBulkLyric();
    else if(action==='check')openCheck();
    else if(action==='justify')toggleJustifyRows(btn);
  });
}
function toggleJustifyRows(btn){
  justifyRowsOn=!justifyRowsOn;
  btn=btn||document.querySelector('.top-tab[data-action="justify"]');
  if(btn)btn.classList.toggle('on',justifyRowsOn);
  fitPreview();
}
function bindToolActions(){
  var panel=document.getElementById('top-tools');
  if(!panel||panel.__bound)return;
  panel.__bound=true;
  panel.addEventListener('click',function(e){
    var btn=e.target.closest('button[data-tool-action]');
    if(!btn)return;
    var action=btn.getAttribute('data-tool-action');
    if(action==='check')runToolCheck();
    else if(action==='format')formatScoreData();
    else if(action==='play-line')playCurrentLine();
    else if(action==='play-song')playWholeSong();
    else if(action==='stop')stopToolPlayback();
    else if(action==='transpose')previewTranspose();
  });
}

/* ════════════════════════════════════════
   键盘
════════════════════════════════════════ */
document.addEventListener('keydown',function(e){
  var el=document.activeElement;
  // ⌘F / Ctrl+F → 聚焦编辑器搜索框（含焦点在输入框内时）
  if((e.metaKey||e.ctrlKey)&&(e.key==='f'||e.key==='F')){
    var sInp=document.getElementById('segSearchInput');
    if(sInp){e.preventDefault();sInp.focus();sInp.select();return;}
  }
  if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')return;
  var isMeta=e.metaKey||e.ctrlKey;
  var k=e.key;
  if(isMeta){
    if(k==='z'||k==='Z'){e.preventDefault();undoAction();return;}
    if(k==='c'||k==='C'){e.preventDefault();copyToks();return;}
    if(k==='x'||k==='X'){e.preventDefault();cutToks();return;}
    if(k==='v'||k==='V'){e.preventDefault();pasteToks();return;}
    return;
  }
  // Alt/Option 快捷键：格子级别操作
  // 用 e.code 而不是 e.key，因为 Mac Option+字母 会产生特殊字符
  if(e.altKey){
    var code=e.code||'';
    if(code==='KeyC'){e.preventDefault();copySeg();return;}
    if(code==='KeyV'){e.preventDefault();pasteSeg();return;}
    if(code==='KeyR'){e.preventDefault();pasteSegReplace();return;}
    if(code==='KeyX'){e.preventDefault();cutSeg();return;}
    return;
  }
  if(k==='/' || k==='／'){
    e.preventDefault();
    var dualTop=document.getElementById('dual-top');
    if(dualTop){dualTop.focus();dualTop.select();}
    else appendCustomToken();
    return;
  }
  if(curSi<0)return;
  if(k==='#'||k==='k'||k==='K'){e.preventDefault();setAccidental('#');return;}
  if(k==='j'||k==='J'){e.preventDefault();setAccidental('b');return;}
  if(k==='='||k==='h'||k==='H'){e.preventDefault();setAccidental('=');return;}
  if(/^[0-7]$/.test(k)){e.preventDefault();inputNote(parseInt(k));return;}
  if(k===' '){e.preventDefault();appendTok(buildSpacerTok());return;}
  if(k==='\\\\' || k==='-'){e.preventDefault();inputSpecial('-');return;}
  if(k==='Backspace'){e.preventDefault();deleteSelected();return;}
  if(k==='Escape'){e.preventDefault();clearSel();clearSegSel();renderEditor();reactivate();updateStatus();return;}
  if(k==='ArrowLeft'){e.preventDefault();moveCursor('left');return;}
  if(k==='ArrowRight'){e.preventDefault();moveCursor('right');return;}
  if(k==='ArrowUp'){e.preventDefault();var os=['low2','low1','mid','high1','high2'];var i=os.indexOf(oct);if(i<os.length-1)setOct(os[i+1]);return;}
  if(k==='ArrowDown'){e.preventDefault();var os=['low2','low1','mid','high1','high2'];var i=os.indexOf(oct);if(i>0)setOct(os[i-1]);return;}
  if(k===','){e.preventDefault();toggleDot();return;}
  if(k==='[' || k==='s' || k==='S'){e.preventDefault();toggleSlur();return;}
  if(k==='d'||k==='D'){e.preventDefault();toggleXSlur();return;}
  if(k==='x' || k==='X'){e.preventDefault();closeXSlur();return;}
  if(k==='f' || k==='F'){e.preventDefault();toggleFermata();return;}
  if(k==='b' || k==='B'){e.preventDefault();appendTok('|');return;}
  if(k==='m' || k==='M'){e.preventDefault();appendTok('||');return;}
  if(k==='!'){e.preventDefault();appendTok('!');return;}  // 断梁
  if(k==='n'){e.preventDefault();appendTok('~');return;}
  if(k==='N'){e.preventDefault();appendSpanTie();return;}
  if(k==='i'||k==='I'){e.preventDefault();setInputMode('insert');return;}
  if(k==='o'||k==='O'){e.preventDefault();setInputMode('overwrite');return;}
  if(k==='q'||k==='Q'){e.preventDefault();setDur('whole');return;}
  if(k==='w'||k==='W'){e.preventDefault();setDur('half');return;}
  if(k==='e'||k==='E'){e.preventDefault();setDur('quarter');return;}
  if(k==='r'||k==='R'){e.preventDefault();setDur('eighth');return;}
  if(k==='t'||k==='T'){e.preventDefault();setDur('16th');return;}
});

/* ════════════════════════════════════════
   导入
════════════════════════════════════════ */
function openImport(){
  document.getElementById('importOverlay').classList.add('open');
  document.getElementById('importTA').value='';
  document.getElementById('importErr').textContent='';
  setTimeout(function(){document.getElementById('importTA').focus();},50);
}
function closeImport(){document.getElementById('importOverlay').classList.remove('open');}
function doImport(){
  var raw=document.getElementById('importTA').value.trim();
  var err=document.getElementById('importErr');err.textContent='';
  try{
    STRICT_MODE = /"align"\\s*:\\s*"strict"/.test(raw);  // 导入 align:"strict" → 严格对位模式（缺字段=老规则）
    var arrStr=raw;
    // 找第一个 [ 到最后一个 ]，支持所有格式：
    // sections: [...],  /  var SECTIONS = [...];  / 直接粘贴数组
    var firstBracket=raw.indexOf('[');
    if(firstBracket>=0){
      var lastBracket=raw.lastIndexOf(']');
      if(lastBracket>firstBracket)arrStr=raw.slice(firstBracket,lastBracket+1);
    }
    var parsed=eval('('+arrStr+')');
    if(!Array.isArray(parsed))throw new Error('不是数组');
    saveUndo();
    var keepSeg=function(seg){return !!seg&&typeof seg==='object';};
    data=parsed.map(function(sec){
      return{name:sec.name||'',lines:(sec.lines||[]).map(function(line){
        if(Array.isArray(line))return{bold:false,segs:line.filter(keepSeg)};
        return{bold:!!line.b,segs:(line.line||[]).filter(keepSeg)};
      })};
    });
    curSi=-1;curLi=-1;curGi=-1;curTok=-1;clearSel();
    closeImport();renderEditor();updateStrictUi();
  }catch(e){err.textContent='解析失败：'+e.message;}
}
document.getElementById('importOverlay').addEventListener('click',function(e){if(e.target===this)closeImport();});


/* ════════════════════════════════════════
   批量填歌词
════════════════════════════════════════ */
function _getLyricSlots(scopeSi){
  // 返回所有有音符的 seg 引用（n 非空）
  // scopeSi >= 0 时只处理该段落
  var slots=[];
  var secs=(scopeSi>=0)?[{sec:data[scopeSi],si:scopeSi}]:data.map(function(s,i){return{sec:s,si:i};});
  secs.forEach(function(item){
    item.sec.lines.forEach(function(line,li){
      line.segs.forEach(function(seg,gi){
        if(seg.n&&seg.n.trim())slots.push({seg:seg,si:item.si,li:li,gi:gi});
      });
    });
  });
  return slots;
}
function _lyfillScope(){
  var el=document.querySelector('input[name="lyfill-scope"]:checked');
  return el?el.value:'all';
}
function openBulkLyric(){
  document.getElementById('lyfillOverlay').classList.add('open');
  document.getElementById('lyfillTA').value='';
  document.getElementById('lyfillStats').textContent='';
  document.getElementById('lyfillStats').className='lyfill-stats';
  setTimeout(function(){document.getElementById('lyfillTA').focus();},50);
}
function closeBulkLyric(){
  document.getElementById('lyfillOverlay').classList.remove('open');
}
function updateLyfillStats(){
  var text=document.getElementById('lyfillTA').value.replace(/\\s/g,'');
  var scope=_lyfillScope();
  var scopeSi=(scope==='cur'&&curSi>=0)?curSi:-1;
  var slots=_getLyricSlots(scopeSi);
  var el=document.getElementById('lyfillStats');
  if(!text){el.textContent='';el.className='lyfill-stats';return;}
  var msg='歌词字数: '+text.length+'  /  音符格数: '+slots.length;
  if(text.length===slots.length){el.className='lyfill-stats ok';msg+='  ✓ 完全匹配';}
  else if(text.length>slots.length){el.className='lyfill-stats warn';msg+='  ⚠ 歌词多 '+(text.length-slots.length)+' 字（多余部分忽略）';}
  else{el.className='lyfill-stats warn';msg+='  ⚠ 歌词少 '+(slots.length-text.length)+' 字（剩余格子将清空）';}
  el.textContent=msg;
}
function applyBulkLyric(){
  var text=document.getElementById('lyfillTA').value.replace(/\\s/g,'');
  if(!text){closeBulkLyric();return;}
  var scope=_lyfillScope();
  var scopeSi=(scope==='cur'&&curSi>=0)?curSi:-1;
  var slots=_getLyricSlots(scopeSi);
  saveUndo();
  slots.forEach(function(item,i){
    item.seg.lyric=i<text.length?text[i]:'';
  });
  closeBulkLyric();
  renderEditor();
  if(curSi>=0)reactivate();
}
setTimeout(function(){
  var lyfillOverlay=document.getElementById('lyfillOverlay');
  if(lyfillOverlay)lyfillOverlay.addEventListener('click',function(e){if(e.target===this)closeBulkLyric();});
  var lyfillTA=document.getElementById('lyfillTA');
  if(lyfillTA)lyfillTA.addEventListener('input',updateLyfillStats);
  var radios=document.querySelectorAll('input[name="lyfill-scope"]');
  radios.forEach(function(r){r.addEventListener('change',updateLyfillStats);});
},0);

/* ════════════════════════════════════════
   工具：检查 / 格式化 / 试移调 / 试听
════════════════════════════════════════ */
function eachSeg(fn){
  data.forEach(function(sec,si){
    (sec.lines||[]).forEach(function(line,li){
      (line.segs||[]).forEach(function(seg,gi){fn(seg,line,sec,si,li,gi);});
    });
  });
}
function escapeRegExpText(s){
  return String(s||'').split('').map(function(ch){
    return '. * + ? ^ $ { } ( ) | [ ] \\\\'.indexOf(ch)>=0?'\\\\'+ch:ch;
  }).join('');
}
function countOpen(str,needle){return (String(str||'').match(new RegExp(escapeRegExpText(needle),'g'))||[]).length;}
function collectToolIssues(){
  var issues=[],totalN=0,totalL=0;
  data.forEach(function(sec,si){
    var noteCount=0,lyricCount=0;
    (sec.lines||[]).forEach(function(line,li){
      (line.segs||[]).forEach(function(seg,gi){
        var loc=(sec.name||('段落 '+(si+1)))+' / 行 '+(li+1)+' / 格 '+(gi+1);
        var n=String(seg.n||'').trim();
        if(n){noteCount++;totalN++;if(seg.lyric&&String(seg.lyric).trim()){lyricCount++;totalL++;}}
        if(n){
          if(countOpen(n,'(')!==countOpen(n,')'))issues.push({kind:'warn',text:loc+'：圆括号可能未配对'});
          if(countOpen(n,'([')!==countOpen(n,'])'))issues.push({kind:'warn',text:loc+'：跨线连音 ([ / ]) 可能未配对'});
          if(countOpen(n,'{3')+countOpen(n,'{5')!==countOpen(n,'}'))issues.push({kind:'warn',text:loc+'：连音组 {3/{5 可能未闭合'});
          if(/\\[v/.test(n)&&n.indexOf(']v')<0)issues.push({kind:'warn',text:loc+'：房子线开始后没有在同格结束，可确认后续格是否有 ]v'});
          if(/[｜／]/.test(n))issues.push({kind:'warn',text:loc+'：含全角符号，点“整理格式”可统一'});
          if(n&&/[|]/.test(n)===false&&n.split(/\s+/).length>=6)issues.push({kind:'warn',text:loc+'：这一格音符较长但没有小节线，建议确认'});
        }
        if(chordLooksSuspicious(seg.chord))issues.push({kind:'bad',text:loc+'：和弦 “'+seg.chord+'” 可能写错'});
        if(STRICT_MODE&&n){  // 严格对位：按音位校验和弦/各行歌词 token 数
          var _lf=[seg.lyric||''];if(seg.lyric2!=null)_lf.push(seg.lyric2);if(seg.lyric3!=null)_lf.push(seg.lyric3);if(seg.lyric4!=null)_lf.push(seg.lyric4);
          saAlignRow(n,seg.chord||'',_lf).warnings.forEach(function(w){issues.push({kind:'warn',text:loc+'：'+w.field+' 有 '+w.got+' 个 token 对 '+w.need+' 个音位，第 '+w.slot+' 个音位起对不上'});});
        }
      });
    });
    if(!STRICT_MODE&&noteCount!==lyricCount)issues.push({kind:'warn',text:(sec.name||('段落 '+(si+1)))+'：歌词 '+lyricCount+' / 音符格 '+noteCount});
  });
  if(STRICT_MODE)issues.unshift({kind:issues.some(function(x){return x.kind==='warn'||x.kind==='bad';})?'warn':'ok',text:'严格对位：和弦/歌词按音位校验（'+totalN+' 个音符格）'});
  else issues.unshift({kind:(totalN===totalL?'ok':'warn'),text:'合计：歌词 '+totalL+' / 音符格 '+totalN+(totalN===totalL?'，匹配':'，有未填歌词')});
  if(issues.length===1&&issues[0].kind==='ok')issues.push({kind:'ok',text:'结构检查没有发现明显问题'});
  return issues;
}
function renderToolIssues(targetId){
  var out=document.getElementById(targetId||'toolCheckOut');
  if(!out)return;
  var issues=collectToolIssues();
  out.innerHTML=issues.map(function(it){return '<div class="tool-issue '+it.kind+'">'+esc(it.text)+'</div>';}).join('');
}
function runToolCheck(){renderToolIssues('toolCheckOut');}
function normalizeNText(n){
  return String(n||'').replace(/｜/g,'|').replace(/／/g,'/').replace(/\s+/g,' ').trim();
}
function formatScoreData(){
  saveUndo();
  eachSeg(function(seg){
    seg.chord=String(seg.chord||'').replace(/\s+/g,' ').trim();
    seg.n=normalizeNText(seg.n);
    ['lyric','lyric2','lyric3','lyric4'].forEach(function(k){if(seg[k]!=null)seg[k]=String(seg[k]).trim();});
  });
  renderEditor();
  runToolCheck();
}
function previewTranspose(){
  var from=parseKeyName((document.getElementById('tool-from-key')||{}).value||'C');
  var to=parseKeyName((document.getElementById('tool-to-key')||{}).value||'C');
  var a=NOTE_MAP[from.root],b=NOTE_MAP[to.root];
  var out=document.getElementById('toolTransposeOut');
  if(a===undefined||b===undefined){out.textContent='调名无法识别';return;}
  var st=(b-a+12)%12,useFlat=!!FLAT_KEYS[to.root],lines=[];
  eachSeg(function(seg,line,sec,si,li,gi){
    if(seg.chord&&String(seg.chord).trim()){
      lines.push((sec.name||('段落 '+(si+1)))+' L'+(li+1)+'-'+(gi+1)+': '+seg.chord+'  =>  '+trChordEx(seg.chord,st,useFlat,trChordText));
    }
  });
  out.textContent=lines.length?lines.join('\\n'):'当前没有和弦可预览';
}
var toolAudioCtx=null,toolPlayTimers=[];
function stopToolPlayback(){
  toolPlayTimers.forEach(function(t){clearTimeout(t);});
  toolPlayTimers=[];
}
function getToolAudioCtx(){
  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  if(!toolAudioCtx)toolAudioCtx=new AC();
  if(toolAudioCtx.resume)toolAudioCtx.resume();
  return toolAudioCtx;
}
function tokenToMidi(tok,key){
  tok=String(tok||'').trim();
  if(!tok||tok==='sp'||tok.indexOf('|')>=0||tok==='-'||tok==='('||tok===')'||tok==='{'||tok==='}')return null;
  var m=tok.match(/^([#b=]?)([0-7])([,']*)(?:[·_^]*)/);
  if(!m||m[2]==='0')return null;
  var degree=parseInt(m[2],10),scale=[0,0,2,4,5,7,9,11];
  var base=NOTE_MAP[parseKeyName(key||'C').root];if(base===undefined)base=0;
  var semi=scale[degree]+base+60;
  if(m[1]==='#')semi++; else if(m[1]==='b')semi--;
  for(var i=0;i<m[3].length;i++){semi+=m[3][i]==="'"?12:-12;}
  return semi;
}
function tokDuration(tok,bpm){
  var beat=60/(bpm||72),s=String(tok||'');
  var d=s.indexOf('__')>=0?beat/4:(s.indexOf('_')>=0?beat/2:beat);
  if(s.indexOf('·')>=0)d*=1.5;
  if(s==='-')d=beat;
  return Math.max(.08,d);
}
function playMidi(midi,when,dur){
  var ac=getToolAudioCtx();if(!ac||midi==null)return;
  var osc=ac.createOscillator(),gain=ac.createGain();
  osc.type='sine';
  osc.frequency.value=440*Math.pow(2,(midi-69)/12);
  gain.gain.setValueAtTime(0.0001,when);
  gain.gain.exponentialRampToValueAtTime(0.12,when+0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001,when+Math.max(0.05,dur*.86));
  osc.connect(gain);gain.connect(ac.destination);
  osc.start(when);osc.stop(when+dur);
}
function collectPlayTokens(scopeLine){
  var items=[];
  eachSeg(function(seg,line,sec,si,li,gi){
    if(scopeLine&&!(si===curSi&&li===curLi))return;
    String(seg.n||'').split(/\s+/).forEach(function(tok){if(tok)items.push(tok);});
  });
  return items;
}
function playTokens(tokens){
  stopToolPlayback();
  var ac=getToolAudioCtx();if(!ac)return;
  var bpm=parseInt((document.getElementById('meta-bpm')||{}).value,10)||72;
  var key=(document.getElementById('meta-key')||{}).value||'C';
  var t=ac.currentTime+0.06;
  tokens.forEach(function(tok){
    if(tok.charAt(0)==='~')return; // 连音线不占时值
    var dur=tokDuration(tok,bpm),midi=tokenToMidi(tok,key);
    if(midi!=null)playMidi(midi,t,Math.min(dur,1.2));
    t+=dur;
  });
}
function playCurrentLine(){
  if(curSi<0){runToolCheck();return;}
  playTokens(collectPlayTokens(true));
}
function playWholeSong(){playTokens(collectPlayTokens(false));}

/* ════════════════════════════════════════
   检查状态（音符 / 歌词 对照）
════════════════════════════════════════ */
function openCheck(){
  var content=document.getElementById('checkContent');
  content.innerHTML='';
  collectToolIssues().forEach(function(it){
    var row=document.createElement('div');
    row.className='check-row';
    var nm=document.createElement('span');nm.className='check-sec-name';nm.textContent=it.text;row.appendChild(nm);
    var nums=document.createElement('span');nums.className='check-nums '+(it.kind==='ok'?'check-ok':(it.kind==='bad'?'check-warn':'check-warn'));
    nums.textContent=it.kind==='ok'?'✓':'⚠';
    row.appendChild(nums);content.appendChild(row);
  });
  document.getElementById('checkOverlay').classList.add('open');
}
function closeCheck(){
  document.getElementById('checkOverlay').classList.remove('open');
}
setTimeout(function(){
  var checkOverlay=document.getElementById('checkOverlay');
  if(checkOverlay)checkOverlay.addEventListener('click',function(e){if(e.target===this)closeCheck();});
},0);


/* ════════════════════════════════════════
   输入状态栏更新
════════════════════════════════════════ */
var _durLabel={whole:'全音符',half:'2分',quarter:'4分',eighth:'8分','16th':'16分'};
var _octLabel={low2:'低2',low1:'低1',mid:'中',high1:'高1',high2:'高2'};
function updateInputState(){
  // 总音符：统计全部 data 中有 n 的 seg
  var total=0;
  data.forEach(function(sec){sec.lines.forEach(function(line){line.segs.forEach(function(seg){if(seg.n&&seg.n.trim())total++;});});});
  var _si=document.getElementById('is-total');if(_si)_si.textContent=total;
  var _so=document.getElementById('is-oct');if(_so)_so.textContent=_octLabel[oct]||oct;
  var _sd=document.getElementById('is-dur');if(_sd)_sd.textContent=_durLabel[dur]||dur;
  var _ss=document.getElementById('is-sec');if(_ss)_ss.textContent=(curSi>=0&&data[curSi])?data[curSi].name:'无';
  // 房子线：当前格子的 n 里是否含有 volta token
  var voltaStr='无';
  if(curSi>=0&&curLi>=0&&curGi>=0){
    var curN=(data[curSi]&&data[curSi].lines[curLi]&&data[curSi].lines[curLi].segs[curGi])||{};
    var vl=getVoltaStartLabel(curN.n);
    if(vl)voltaStr=vl+'房';
    else if(hasVoltaEnd(curN.n))voltaStr='房尾';
  }
  var voltaEl=document.getElementById('is-volta');
  if(voltaEl)voltaEl.textContent=voltaStr;
  syncToggleUI();
  var voltaPill=voltaEl&&voltaEl.parentElement;
  if(voltaPill){
    voltaPill.classList.toggle('featured',voltaStr!=='无');
    voltaPill.classList.toggle('accent',voltaStr==='无');
  }
  var clip=document.getElementById('is-clip');
  if(clip)clip.textContent=(segClipboard&&segClipboard.length)?segClipboard.length+' 格':(tokClipboard.length?tokClipboard.length+' 项':'空');
  syncAccidentalUI();
}

// scoreImg 变更时刷新预览
(function(){
  var el=document.getElementById('meta-scoreimg');
  if(el)el.addEventListener('input',function(){schedulePreview();});
})();

// Expose handlers for inline onclick/oninput hooks rendered in HTML strings.
Object.assign(window, {
  openImport: openImport,
  closeImport: closeImport,
  doImport: doImport,
  openBulkLyric: openBulkLyric,
  closeBulkLyric: closeBulkLyric,
  applyBulkLyric: applyBulkLyric,
  openCheck: openCheck,
  closeCheck: closeCheck,
  switchTop: switchTop,
  copyCode: copyCode,
  copyFullJson: copyFullJson,
  addSection: addSection,
  addLine: addLine,
  delSection: delSection,
  moveLine: moveLine,
  moveSection: moveSection,
  moveSegVert: moveSegVert,
  segSearchNext: segSearchNext,
  segSearchPrev: segSearchPrev,
  delLine: delLine,
  setOct: setOct,
  setDur: setDur,
  setInputMode: setInputMode,
  setAccidental: setAccidental,
  inputNote: inputNote,
  inputSpecial: inputSpecial,
  appendTok: appendTok,
  setTieSpan: setTieSpan,
  appendSpanTie: appendSpanTie,
  appendNavTok: appendNavTok,
  appendInlineTimeSignToken: appendInlineTimeSignToken,
  appendCustomVolta: appendCustomVolta,
  appendCustomToken: appendCustomToken,
  setDualDur: setDualDur,
  toggleDualDot: toggleDualDot,
  toggleDualFermata: toggleDualFermata,
  dualPick: dualPick,
  clearDualRow: clearDualRow,
  insertDualToken: insertDualToken,
  clearDualBuilder: clearDualBuilder,
  toggleDot: toggleDot,
  toggleSlur: toggleSlur,
  toggleXSlur: toggleXSlur,
  closeXSlur: closeXSlur,
  toggleTuplet: toggleTuplet,
  deleteSelected: deleteSelected,
  undoAction: undoAction,
  clearN: clearN,
  copySeg: copySeg,
  pasteSeg: pasteSeg,
  pasteSegReplace: pasteSegReplace,
  runToolCheck: runToolCheck,
  formatScoreData: formatScoreData,
  previewTranspose: previewTranspose,
  playCurrentLine: playCurrentLine,
  playWholeSong: playWholeSong,
  stopToolPlayback: stopToolPlayback
});

/* ══════════════════════════════════════════
   草稿自动缓存 —— 防误触「返回上一页」丢失编辑
   存 localStorage(同源,教程 key 已在用)；回来自动恢复 + 顶部提示 + 轻拦截返回。
   本块在 srcdoc 模板内：不用反引号、不用正则。
════════════════════════════════════════════ */
var MT_DRAFT_KEY='mt_draft_v1';
var MT_META_IDS=['id','title','artist','sub','key','timesign','bpm','mp3','cover','lrc','youtube','scoreimg'];
function mtCollectMeta(){
  var m={};
  MT_META_IDS.forEach(function(k){var el=document.getElementById('meta-'+k);if(el)m[k]=el.value;});
  return m;
}
function mtApplyMeta(m){
  if(!m)return;
  MT_META_IDS.forEach(function(k){var el=document.getElementById('meta-'+k);if(el&&m[k]!=null)el.value=m[k];});
}
function mtDraftMeaningful(p){
  if(!p||!p.data)return false;
  if(p.meta&&(p.meta.title||p.meta.artist||(p.meta.id&&p.meta.id!=='song-id')))return true;
  var found=false;
  (p.data||[]).forEach(function(sec){(sec.lines||[]).forEach(function(ln){(ln.segs||[]).forEach(function(sg){
    if(!sg)return;
    if((sg.n&&String(sg.n).trim())||(sg.lyric&&String(sg.lyric).trim())||(sg.chord&&String(sg.chord).trim())||sg.label)found=true;
  });});});
  return found;
}
function mtDraftSave(){
  try{
    var payload={v:1,t:Date.now(),strict:!!STRICT_MODE,meta:mtCollectMeta(),data:data};
    if(!mtDraftMeaningful(payload)){localStorage.removeItem(MT_DRAFT_KEY);return;}
    localStorage.setItem(MT_DRAFT_KEY,JSON.stringify(payload));
  }catch(e){}
}
var mtDraftTimer=null;
function mtDraftSaveSoon(){
  if(mtDraftTimer)clearTimeout(mtDraftTimer);
  mtDraftTimer=setTimeout(mtDraftSave,600);
}
function mtDraftLoad(){
  try{var raw=localStorage.getItem(MT_DRAFT_KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}
}
function mtDraftClear(){try{localStorage.removeItem(MT_DRAFT_KEY);}catch(e){}}
function mtDraftBanner(text,onClear){
  var old=document.getElementById('mt-draft-banner');if(old)old.remove();
  var bar=document.createElement('div');
  bar.id='mt-draft-banner';
  bar.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:10px;z-index:99999;display:flex;align-items:center;gap:10px;background:rgba(20,22,28,0.94);color:#eaf2ff;border:1px solid rgba(120,180,255,0.35);border-radius:12px;padding:8px 14px;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,0.35);max-width:92vw;';
  var span=document.createElement('span');span.textContent=text;bar.appendChild(span);
  if(onClear){
    var clr=document.createElement('button');
    clr.textContent='清空重来';
    clr.style.cssText='cursor:pointer;background:rgba(255,90,90,0.18);color:#ff9c9c;border:1px solid rgba(255,90,90,0.4);border-radius:8px;padding:4px 10px;font-size:12px;';
    clr.onclick=function(){onClear();bar.remove();};
    bar.appendChild(clr);
  }
  var x=document.createElement('button');
  x.textContent='×';
  x.style.cssText='cursor:pointer;background:transparent;color:#9fb3d0;border:none;font-size:18px;line-height:1;padding:0 4px;';
  x.onclick=function(){bar.remove();};
  bar.appendChild(x);
  document.body.appendChild(bar);
  setTimeout(function(){var b=document.getElementById('mt-draft-banner');if(b===bar)bar.remove();},9000);
}
function mtResetFresh(){
  saveUndo();
  data=[{name:'主歌',lines:[{bold:false,segs:[{chord:'',n:'',lyric:''}]}]}];
  curSi=-1;curLi=-1;curGi=-1;curTok=-1;clearSel();
  STRICT_MODE=true;   // 新建一律回到严格模式（默认开）
  MT_META_IDS.forEach(function(k){if(k==='key'||k==='timesign'||k==='bpm')return;var el=document.getElementById('meta-'+k);if(el)el.value='';});
  mtDraftClear();
  renderEditor();if(typeof updateStrictUi==='function')updateStrictUi();
}
function mtDraftRestoreOnBoot(){
  var p=mtDraftLoad();
  if(!mtDraftMeaningful(p))return;
  try{data=p.data;STRICT_MODE=!!p.strict;mtApplyMeta(p.meta);curSi=-1;curLi=-1;curGi=-1;curTok=-1;clearSel();}catch(e){}
  try{renderEditor();}catch(e){}
  try{renderPreview();}catch(e){}
  try{if(typeof updateStrictUi==='function')updateStrictUi();}catch(e){}
  // banner 延后一拍再加：冷启动时外层打开简谱的代码可能还会动 body/iframe，同步加会被冲掉
  setTimeout(function(){try{mtDraftBanner('已恢复上次未保存的编辑',mtResetFresh);}catch(e){}},180);
}
/* 轻拦截误触返回：常驻一个历史态吸收一次返回；被吸收后下次编辑自动重新武装 */
var mtGuardActive=false;
function mtArmBackGuard(){if(mtGuardActive)return;try{history.pushState({mtGuard:1},'');mtGuardActive=true;}catch(e){}}
window.addEventListener('popstate',function(){
  mtDraftSave();
  if(mtGuardActive){mtGuardActive=false;mtDraftBanner('已存草稿 · 再返回一次即退出编辑',null);}
});
/* 把自动保存 + 重新武装挂到 renderEditor（包裹，不动大函数本体） */
if(typeof renderEditor==='function'){
  var _mtOrigRenderEditor=renderEditor;
  renderEditor=function(){var r=_mtOrigRenderEditor.apply(this,arguments);if(!arguments[2])mtDraftSaveSoon();mtArmBackGuard();return r;};
}
/* meta 输入框改动也触发自动保存 */
MT_META_IDS.forEach(function(k){var el=document.getElementById('meta-'+k);if(el)el.addEventListener('input',mtDraftSaveSoon);});
/* 切走/隐藏/卸载那一刻立即存一次兜底 */
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')mtDraftSave();});
window.addEventListener('pagehide',mtDraftSave);

/* 初始化 */
bindTopbarActions();
bindToolActions();
refreshTupletBtns();
initTieSpan();
initSegSearch();
renderEditor();
updateInputState();
initDualBuilder();
mtArmBackGuard();
mtDraftRestoreOnBoot();

/* ── 可拖动分隔条：预览↔编辑区（左右）、段落↔键盘（上下）+ 左右对调，尺寸记忆 ── */
(function initSplitters(){
  var root=document.documentElement;
  var wrap=document.querySelector('.work-wrap');
  if(!wrap)return;
  var splitX=document.getElementById('splitX');
  var splitY=document.getElementById('splitY');
  var bottom=document.querySelector('.bottom-area');
  var LS_X='mt-split-x',LS_Y='mt-split-y',LS_SWAP='mt-swap';
  function clamp(v,a,b){return v<a?a:(v>b?b:v);}
  /* 恢复上次尺寸 / 对调状态 */
  try{
    var vx=localStorage.getItem(LS_X); if(vx)root.style.setProperty('--split-x',vx);
    var vy=localStorage.getItem(LS_Y); if(vy)root.style.setProperty('--split-y',vy);
    if(localStorage.getItem(LS_SWAP)==='1')wrap.classList.add('swap');
  }catch(e){}
  function save(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function bindDrag(handle,onMove,onEnd){
    if(!handle)return;
    handle.addEventListener('pointerdown',function(e){
      e.preventDefault();
      try{handle.setPointerCapture(e.pointerId);}catch(_){}
      handle.classList.add('on');
      document.body.classList.add('mt-resizing');
      function mv(ev){onMove(ev);}
      function up(){
        try{handle.releasePointerCapture(e.pointerId);}catch(_){}
        handle.classList.remove('on');
        document.body.classList.remove('mt-resizing');
        handle.removeEventListener('pointermove',mv);
        handle.removeEventListener('pointerup',up);
        handle.removeEventListener('pointercancel',up);
        onEnd&&onEnd();
      }
      handle.addEventListener('pointermove',mv);
      handle.addEventListener('pointerup',up);
      handle.addEventListener('pointercancel',up);
    });
  }
  /* 左右：拖动改预览宽度（对调后预览在右，按右缘计算） */
  bindDrag(splitX,function(e){
    var r=wrap.getBoundingClientRect(); if(!r.width)return;
    var pct=wrap.classList.contains('swap')
      ? (r.right-e.clientX)/r.width*100
      : (e.clientX-r.left)/r.width*100;
    root.style.setProperty('--split-x',clamp(pct,22,74).toFixed(2)+'%');
  },function(){save(LS_X,root.style.getPropertyValue('--split-x'));if(typeof fitPreview==='function')fitPreview();});
  /* 上下：拖动改段落编辑高度 */
  bindDrag(splitY,function(e){
    var r=bottom.getBoundingClientRect(); if(!r.height)return;
    var pct=(e.clientY-r.top)/r.height*100;
    root.style.setProperty('--split-y',clamp(pct,20,80).toFixed(2)+'%');
  },function(){save(LS_Y,root.style.getPropertyValue('--split-y'));});
  /* 双击分隔条恢复默认比例 */
  if(splitX)splitX.addEventListener('dblclick',function(){root.style.removeProperty('--split-x');save(LS_X,'');});
  if(splitY)splitY.addEventListener('dblclick',function(){root.style.removeProperty('--split-y');save(LS_Y,'');});
  /* 左右对调 */
  var swapBtn=document.getElementById('btnSwapSides');
  function applySwap(on){
    wrap.classList.toggle('swap',on);
    if(swapBtn)swapBtn.classList.toggle('on',on);
    save(LS_SWAP,on?'1':'0');
    if(typeof fitPreview==='function')fitPreview();
  }
  if(swapBtn){
    swapBtn.classList.toggle('on',wrap.classList.contains('swap'));
    swapBtn.addEventListener('click',function(){applySwap(!wrap.classList.contains('swap'));});
  }
  /* 抓住预览把手拖到另一侧即换边：拖过中线实时吸附，松手落定 */
  var grip=document.getElementById('previewGrip');
  if(grip)grip.addEventListener('pointerdown',function(e){
    e.preventDefault();
    try{grip.setPointerCapture(e.pointerId);}catch(_){}
    document.body.classList.add('mt-moving');
    wrap.classList.add('moving');
    function mv(ev){
      var r=wrap.getBoundingClientRect(); if(!r.width)return;
      wrap.classList.toggle('swap', ev.clientX > r.left+r.width/2);
    }
    function up(){
      try{grip.releasePointerCapture(e.pointerId);}catch(_){}
      document.body.classList.remove('mt-moving');
      wrap.classList.remove('moving');
      grip.removeEventListener('pointermove',mv);
      grip.removeEventListener('pointerup',up);
      grip.removeEventListener('pointercancel',up);
      applySwap(wrap.classList.contains('swap'));
    }
    grip.addEventListener('pointermove',mv);
    grip.addEventListener('pointerup',up);
    grip.addEventListener('pointercancel',up);
  });
})();
</script>
<!-- ── 批量填歌词 modal ── -->
<div class="lyfill-overlay" id="lyfillOverlay">
  <div class="lyfill-box">
    <div class="lyfill-label">批量填歌词</div>
    <div class="lyfill-hint">粘入歌词文字（连续字符），按顺序自动填入有音符的格子。已有歌词会被覆盖。空格与换行会被忽略。</div>
    <textarea class="lyfill-ta" id="lyfillTA" placeholder="请在这里粘入歌词…"></textarea>
    <div class="lyfill-scope">
      <label><input type="radio" name="lyfill-scope" value="all" checked> 全部段落</label>
      <label><input type="radio" name="lyfill-scope" value="cur"> 仅当前段落</label>
    </div>
    <div class="lyfill-stats" id="lyfillStats"></div>
    <div class="lyfill-btns">
      <button class="lyfill-ok" onclick="applyBulkLyric()">填入</button>
      <button class="lyfill-cancel" onclick="closeBulkLyric()">取消</button>
    </div>
  </div>
</div>

<!-- ── 检查状态 modal ── -->
<div class="check-overlay" id="checkOverlay">
  <div class="check-box">
    <div class="check-title">音符 / 歌词 对照检查</div>
    <div id="checkContent"></div>
    <div style="margin-top:12px;text-align:right;">
      <button class="lyfill-cancel" onclick="closeCheck()">关闭</button>
    </div>
  </div>
</div>

</body>
</html>`;

function openTool(id, name){
  navName.textContent = name;
  hub.style.display = 'none';
  toolview.classList.add('on');
  Object.values(panels).forEach(p => p.classList.remove('on'));
  panels[id].classList.add('on');
  if(id === 'lrc' && !localStorage.getItem(TUT_KEY)) setTimeout(tutOpen, 400);
  if(id === 'jf'  && !localStorage.getItem(TUT_KEY_JF)) setTimeout(tutOpenJF, 400);
  if(id === 'jf'){
    const fr = $('mt-jf-iframe');
    if(!fr.srcdoc && !fr._loaded){
      fr._loaded = true;
      fr.srcdoc = jianpuHTML;
    }
  }
}
function closeTool(){
  toolview.classList.remove('on');
  hub.style.display = '';
  audio.pause();
  updatePlayBtn();
}

$('mt-card-lrc').onclick = () => openTool('lrc','歌词编辑器');
$('mt-card-jf').onclick  = () => openTool('jf','简谱编辑器');
$('mt-back').onclick     = closeTool;
$('mt-help-btn').onclick = () => {
  const isJF = $('mt-panel-jf').classList.contains('on');
  if(isJF){ tutIdxJF=0; tutRenderJF(); $('mt-tut-next').onclick = () => { if(tutIdxJF < tutStepsJF.length-1){ tutIdxJF++; tutRenderJF(); } else tutCloseJF(); }; $('mt-tut-close').onclick=tutCloseJF; $('mt-tut-skip').onclick=tutCloseJF; $('mt-tut-never').onclick=()=>{ localStorage.setItem(TUT_KEY_JF,'1'); tutCloseJF(); }; }
  else { tutIdx=0; tutRender(); $('mt-tut-next').onclick = () => { if(tutIdx < tutSteps.length-1){ tutIdx++; tutRender(); } else tutClose(); }; $('mt-tut-close').onclick=tutClose; $('mt-tut-skip').onclick=tutClose; $('mt-tut-never').onclick=()=>{ localStorage.setItem(TUT_KEY,'1'); tutClose(); }; }
  $('mt-tut').classList.add('open');
};

/* ── LRC 播放器 ── */
const audio = $('mt-audio');
let lrcData = [], autoScroll = true, curIdx = -1;

audio.addEventListener('timeupdate', () => { updateTimeClock(); updateProg(); if(autoScroll) highlightPlaying(); });
audio.addEventListener('play',  updatePlayBtn);
audio.addEventListener('pause', updatePlayBtn);
audio.addEventListener('ended', updatePlayBtn);

function fmt(s){ const m=Math.floor(s/60),sec=s%60; return String(m).padStart(2,'0')+':'+sec.toFixed(2).padStart(5,'0'); }
function fmtLRC(s){ return '['+fmt(s)+']'; }
function updateTimeClock(){ $('mt-time').textContent='['+fmt(audio.currentTime)+']'; }
function updateProg(){ if(audio.duration) $('mt-progfill').style.width=(audio.currentTime/audio.duration*100)+'%'; }
function updatePlayBtn(){ $('mt-playbtn').textContent = audio.paused ? '▶' : '⏸'; }

function highlightPlaying(){
  const t = audio.currentTime;
  let idx = -1;
  lrcData.forEach((l,i) => { if(l.time !== null && l.time <= t) idx = i; });
  if(idx === curIdx) return;
  curIdx = idx;
  document.querySelectorAll('.mt-ly-row').forEach((r,i) => r.classList.toggle('playing', i===idx));
  if(idx >= 0 && autoScroll){
    const rows = document.querySelectorAll('.mt-ly-row');
    if(rows[idx]) rows[idx].scrollIntoView({block:'center',behavior:'smooth'});
  }
}

$('mt-playbtn').onclick = () => { audio.paused ? audio.play() : audio.pause(); };
$('mt-progbar').onclick = e => {
  if(!audio.duration) return;
  const r = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
};
$('mt-vol').oninput = e => { audio.volume = e.target.value; };

/* 上传音乐 */
$('mt-btn-music').onclick = () => $('mt-music-file').click();
$('mt-music-file').onchange = function(){ if(this.files[0]){ audio.src=URL.createObjectURL(this.files[0]); audio.load(); }};

/* 上传歌词 */
$('mt-btn-lyric').onclick = () => $('mt-lyric-file').click();
$('mt-lyric-file').onchange = function(){
  if(!this.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const parsed = [];
    const timeMap = {}; // 相同时间戳合并为双语（用 | 连接）
    e.target.result.split('\n').forEach(l => {
      const mm = l.match(/^\[(ar|ti|al|by):([^\]]*)\]/i);
      if(mm){ const k=mm[1].toLowerCase(),v=mm[2].trim(); $('mt-meta-'+k) && ($('mt-meta-'+k).value=v); return; }
      const m = l.match(/^\[(\d+):(\d+\.\d+)\](.*)/);
      if(m){
        const t = parseInt(m[1])*60+parseFloat(m[2]);
        const txt = m[3].trim();
        const key = t.toFixed(2);
        if(timeMap[key] !== undefined){
          // 双语LRC：相同时间戳 → 合并用 | 连接
          parsed[timeMap[key]].text += ' | ' + txt;
        } else {
          timeMap[key] = parsed.length;
          parsed.push({time:t, text:txt});
        }
      }
    });
    if(parsed.length){ lrcData=parsed; renderLines(); }
  };
  reader.readAsText(this.files[0]);
};

/* 上传文本 */
$('mt-btn-txt').onclick = () => $('mt-modal-txt').classList.add('open');
$('mt-txt-file').onchange = function(){
  if(!this.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    lrcData = e.target.result.split('\n').map(t => ({time:null, text:t.trim()})).filter(l=>l.text);
    renderLines();
  };
  reader.readAsText(this.files[0]);
};
$('mt-txt-ok').onclick = () => {
  const raw = $('mt-txt-ta').value;
  if(!raw.trim()) return;
  lrcData = raw.split('\n').map(t => ({time:null, text:t.trim()})).filter(l=>l.text);
  $('mt-modal-txt').classList.remove('open');
  $('mt-txt-ta').value = '';
  renderLines();
};
$('mt-txt-cancel').onclick = () => { $('mt-modal-txt').classList.remove('open'); };

/* 查找歌词 */
$('mt-btn-find').onclick = () => window.open('https://music.liuzhijin.cn/', '_blank');

/* 创建歌词 */
$('mt-btn-create').onclick  = () => $('mt-modal-create').classList.add('open');
$('mt-create-cancel').onclick = () => $('mt-modal-create').classList.remove('open');
$('mt-create-ok').onclick = () => {
  const raw = $('mt-create-ta').value.trim();
  if(!raw) return;
  lrcData = raw.split('\n').map(t => ({time:null, text:t}));
  $('mt-modal-create').classList.remove('open');
  renderLines();
};

/* 下载歌词 */
function buildLRCmeta(){
  const ar=$('mt-meta-ar').value, ti=$('mt-meta-ti').value,
        al=$('mt-meta-al').value, by=$('mt-meta-by').value;
  const lines=[];
  if(ar) lines.push('[ar:'+ar+']');
  if(ti) lines.push('[ti:'+ti+']');
  if(al) lines.push('[al:'+al+']');
  if(by) lines.push('[by:'+by+']');
  return {lines, ti};
}
function doDownloadLRC(twin){
  const {lines, ti} = buildLRCmeta();
  if(!twin){
    lrcData.forEach(l => { if(l.time!==null) lines.push(fmtLRC(l.time)+l.text); });
  } else {
    // 双语LRC：同一时间戳出现两次，分别为 | 左边和右边
    const left=[], right=[];
    lrcData.forEach(l => {
      if(l.time===null) return;
      const parts = l.text.split(/(?<!\\)\|/); // 按未转义 | 分割
      left.push({time:l.time, text:(parts[0]||'').trim()});
      right.push({time:l.time, text:(parts[1]||'').trim()});
    });
    left.forEach(l => lines.push(fmtLRC(l.time)+l.text));
    right.forEach(l => lines.push(fmtLRC(l.time)+l.text));
  }
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));
  a.download=(ti||'lyrics')+'.lrc';
  a.click();
}
$('mt-btn-dl').onclick = () => doDownloadLRC(false);
$('mt-btn-dl-twin').onclick = () => doDownloadLRC(true);

/* Info modal */
$('mt-btn-info').onclick   = () => $('mt-modal-info').classList.add('open');
$('mt-info-ok').onclick    = () => $('mt-modal-info').classList.remove('open');
$('mt-info-cancel').onclick= () => $('mt-modal-info').classList.remove('open');

/* 偏移 */
$('mt-btn-offset').onclick = () => {
  const offset = parseFloat($('mt-offset').value)||0;
  if(!offset) return;
  lrcData.forEach(l => { if(l.time!==null) l.time=Math.max(0,l.time+offset); });
  $('mt-offset').value='0';
  renderLines();
};

/* 同步滚动 toggle */
$('mt-toggle').onclick = () => {
  autoScroll = !autoScroll;
  $('mt-toggle').classList.toggle('on', autoScroll);
  $('mt-toggle-lbl').textContent = autoScroll ? '开' : '关';
};

/* 新增歌词（末尾） */
$('mt-btn-addend').onclick = () => {
  lrcData.push({time:null, text:''});
  renderLines();
  setTimeout(()=>{ const inp=document.querySelectorAll('.mt-ly-inp'); if(inp.length) inp[inp.length-1].focus(); },50);
};

/* ── 渲染歌词列表 ── */
function renderLines(){
  const wrap = $('mt-lines');
  const st   = $('mt-lrc-center').scrollTop;
  wrap.innerHTML = '';
  lrcData.forEach((l, i) => {
    const row = document.createElement('div');
    row.className = 'mt-ly-row' + (i===curIdx?' playing':'');

    // 时间戳（双击编辑）
    const tsWrap = document.createElement('div');
    tsWrap.className = 'mt-ly-ts-wrap';
    const ts = document.createElement('span');
    ts.className = 'mt-ly-time' + (l.time===null?' unstamped':'');
    ts.textContent = l.time!==null ? fmtLRC(l.time) : '[--:--.--]';
    if(l.time!==null) ts.onclick = () => { audio.currentTime=l.time; };
    // 双击进入编辑模式
    ts.ondblclick = (e) => {
      e.stopPropagation();
      const inp = document.createElement('input');
      inp.type='text'; inp.className='mt-ly-time-edit';
      inp.value = l.time!==null ? fmtLRC(l.time) : '[00:00.00]';
      inp.select();
      const commit = () => {
        const m = inp.value.match(/\[?(\d+):(\d+\.\d+)\]?/);
        if(m){ lrcData[i].time = parseInt(m[1])*60+parseFloat(m[2]); }
        renderLines();
      };
      inp.onblur = commit;
      inp.onkeydown = e2 => { if(e2.key==='Enter') inp.blur(); if(e2.key==='Escape'){ inp.onblur=null; tsWrap.replaceChild(ts,inp); } };
      tsWrap.replaceChild(inp, ts);
      inp.focus(); inp.select();
    };
    tsWrap.appendChild(ts);
    row.appendChild(tsWrap);

    // 打轴圆圈
    const sb = document.createElement('button');
    sb.className='mt-ly-stamp'; sb.textContent='○';
    sb.onclick = () => stampLine(i);
    row.appendChild(sb);

    // 文字输入
    const inp = document.createElement('input');
    inp.type='text'; inp.className='mt-ly-inp'; inp.value=l.text;
    inp.oninput = () => lrcData[i].text = inp.value;
    inp.onkeydown = e => {
      if(e.key==='Enter'){ e.preventDefault(); addAfter(i); }
      if(e.key==='Tab'){
        e.preventDefault(); stampLine(i);
        const all=document.querySelectorAll('.mt-ly-inp');
        if(all[i+1]) all[i+1].focus();
      }
    };
    row.appendChild(inp);

    // 悬停操作
    const act = document.createElement('div');
    act.className='mt-ly-actions';
    act.innerHTML=`<button class="mt-ly-act update" onclick="mtLRC.updateTime(${i})">更新时间</button>`
                 +`<button class="mt-ly-act add"    onclick="mtLRC.addAfter(${i})">新增歌词</button>`
                 +`<button class="mt-ly-act del"    onclick="mtLRC.delLine(${i})">删除歌词</button>`;
    row.appendChild(act);
    wrap.appendChild(row);
  });
  $('mt-lrc-center').scrollTop = st;
}

function stampLine(i){ lrcData[i].time=audio.currentTime; renderLines(); }
function addAfter(i){
  lrcData.splice(i+1,0,{time:null,text:''});
  renderLines();
  setTimeout(()=>{ const all=document.querySelectorAll('.mt-ly-inp'); if(all[i+1]) all[i+1].focus(); },50);
}
function delLine(i){ lrcData.splice(i,1); renderLines(); }
function updateTime(i){ lrcData[i].time=audio.currentTime; renderLines(); }

/* 暴露给 inline onclick 使用 */
window.mtLRC = { stampLine, addAfter, delLine, updateTime };

/* 键盘快捷键 */
document.addEventListener('keydown', e => {
  if(!$('mt-panel-lrc').classList.contains('on')) return;
  const tag = document.activeElement.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA') return;
  if(e.key===' '){ e.preventDefault(); audio.paused?audio.play():audio.pause(); }
  if(e.key==='ArrowLeft'){ e.preventDefault(); audio.currentTime=Math.max(0,audio.currentTime-3); }
  if(e.key==='ArrowRight'){ e.preventDefault(); audio.currentTime=Math.min(audio.duration||0,audio.currentTime+3); }
});

/* 点击 modal 背景关闭 */
['mt-modal-info','mt-modal-create'].forEach(id => {
  $(id).addEventListener('click', e => { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });
});


/* ── 教程系统 ── */
const TUT_KEY = 'mt_lrc_tut_done';

const tutSteps = [
  {
    icon: '🎵',
    title: '欢迎使用歌词编辑器',
    desc: '几步教你快速上手 LRC 时间轴打轴',
    items: [
      '支持导入 .lrc 歌词文件，或从零创建',
      '上传音频后可边播放边打时间轴',
      '导出标准 LRC 格式，可直接用于播放器'
    ]
  },
  {
    icon: '⬆',
    title: '步骤 1：准备音乐与歌词',
    desc: '从左侧栏开始操作',
    items: [
      '点「上传音乐」选择 MP3/M4A 等音频文件',
      '点「上传歌词」导入已有 .lrc 文件',
      '或点「创建歌词」输入纯文字歌词，每行一句'
    ]
  },
  {
    icon: '○',
    title: '步骤 2：打时间轴',
    desc: '播放音乐，对准每句歌词点击打轴',
    items: [
      '点顶部 ▶ 播放音乐',
      '点每行左边的圆圈 ○ 给该行打上当前时间',
      '快捷键：Tab 打轴并跳下一行，Space 播放/暂停，← → 快退快进 3 秒'
    ]
  },
  {
    icon: '⬇',
    title: '步骤 3：导出歌词',
    desc: '打好时间轴后下载 LRC 文件',
    items: [
      '点「add info」可填写歌手、歌名等信息',
      '右侧「偏移」可整体调整所有时间轴',
      '点左侧「下载歌词」导出 .lrc 文件'
    ]
  }
];

let tutIdx = 0;

function tutRender(){
  const step = tutSteps[tutIdx];
  $('mt-tut-icon').textContent = step.icon;
  $('mt-tut-step-label').textContent = '步骤 ' + (tutIdx+1) + ' / ' + tutSteps.length;
  $('mt-tut-title').textContent = step.title;
  $('mt-tut-desc').textContent = step.desc;

  const itemsEl = $('mt-tut-items');
  itemsEl.innerHTML = step.items.map(t =>
    `<div class="mt-tut-item"><div class="mt-tut-item-dot"></div><span>${t}</span></div>`
  ).join('');

  const dotsEl = $('mt-tut-dots');
  dotsEl.innerHTML = tutSteps.map((_,i) =>
    `<div class="mt-tut-dot${i===tutIdx?' active':''}"></div>`
  ).join('');

  const isLast = tutIdx === tutSteps.length - 1;
  $('mt-tut-next').textContent = isLast ? '开始使用 ✓' : '下一步 →';
  const atlas = $('mt-tut-atlas'); if(atlas) atlas.style.display = 'none';  // 图鉴只属于简谱教程
}

function tutOpen(){
  tutIdx = 0;
  tutRender();
  $('mt-tut').classList.add('open');
}
function tutClose(){
  $('mt-tut').classList.remove('open');
  localStorage.setItem(TUT_KEY, '1');
}

$('mt-tut-close').onclick = tutClose;
$('mt-tut-skip').onclick  = tutClose;
$('mt-tut-never').onclick = () => { localStorage.setItem(TUT_KEY,'1'); tutClose(); };
$('mt-tut-next').onclick  = () => {
  if(tutIdx < tutSteps.length - 1){ tutIdx++; tutRender(); }
  else tutClose();
};


/* ── 简谱编辑器教程 ── */
const TUT_KEY_JF = 'mt_jf_tut_done';

const tutStepsJF = [
  {
    icon: '♩',
    title: '欢迎使用简谱编辑器',
    desc: '快速了解如何用简谱编辑器编写乐谱',
    items: [
      '支持完整简谱（数字音符 1-7）输入',
      '可标注和弦、升降号、连音线',
      '导出 JSON 格式，方便保存与分享'
    ]
  },
  {
    icon: '🎼',
    title: '步骤 1：输入音符',
    desc: '用数字键盘输入简谱音符',
    items: [
      '数字 1-7 对应 Do-Si 七个音',
      '0 表示休止符，点击音符可加上下点（高低八度）',
      '双行简谱写法：上行/下行，例如 1/5',
      '左边面板选择调号、拍号与速度'
    ]
  },
  {
    icon: '🎵',
    title: '步骤 2：添加歌词与和弦',
    desc: '为每个音符标注文字与和弦',
    items: [
      '点击音符下方输入对应歌词',
      '点击音符上方输入和弦标记（如 C, Am, G7）',
      '支持临时记号 ♯ / ♭ / ♮'
    ]
  },
  {
    icon: '⌒',
    title: '步骤 3：连音与衔接',
    desc: '在「连音 · 连音符 · 拍号」里选择连接方式',
    items: [
      '普通 N 连接相邻两音；Shift+N 使用「往前」数字，默认 2，可改成 3、12 等',
      '~3 表示从记号向前数 3 个音位，连接到右侧下一个音；延音横线也算，空格和小节线不算',
      '多段无缝衔接：1 - - ~3 1 - - - ~4 1，中间的 1 不需要再套括号',
      '想看实际谱面和更多例子，可以打开「记号图鉴」'
    ]
  },
  {
    icon: '💾',
    title: '步骤 4：保存与导出',
    desc: '完成编辑后保存你的简谱',
    items: [
      '点「导出 JSON」保存为文件',
      '下次可点「导入 JSON」重新载入',
      '也可直接复制简谱字符串分享给他人'
    ]
  }
];

let tutIdxJF = 0;

function tutRenderJF(){
  const step = tutStepsJF[tutIdxJF];
  $('mt-tut-icon').textContent = step.icon;
  $('mt-tut-step-label').textContent = '步骤 ' + (tutIdxJF+1) + ' / ' + tutStepsJF.length;
  $('mt-tut-title').textContent = step.title;
  $('mt-tut-desc').textContent = step.desc;
  $('mt-tut-items').innerHTML = step.items.map(t =>
    `<div class="mt-tut-item"><div class="mt-tut-item-dot"></div><span>${t}</span></div>`
  ).join('');
  $('mt-tut-dots').innerHTML = tutStepsJF.map((_,i) =>
    `<div class="mt-tut-dot${i===tutIdxJF?' active':''}"></div>`
  ).join('');
  $('mt-tut-next').textContent = tutIdxJF === tutStepsJF.length-1 ? '开始使用 ✓' : '下一步 →';
  // 记号图鉴入口（只在简谱教程显示）→ 打开与 musictool.js 同目录的 教程.html
  const atlas = $('mt-tut-atlas');
  if(atlas){
    atlas.style.display = '';
    atlas.onclick = () => {
      const s = document.querySelector('script[src*="musictool.js"]');
      const url = s ? s.src.replace(/musictool\.js(\?.*)?$/, '教程.html') : '教程.html';
      window.open(url, '_blank', 'noopener');
    };
  }
}

function tutOpenJF(){
  tutIdxJF = 0;
  // Rebind next button for JF flow
  $('mt-tut-next').onclick = () => {
    if(tutIdxJF < tutStepsJF.length-1){ tutIdxJF++; tutRenderJF(); }
    else tutCloseJF();
  };
  $('mt-tut-close').onclick = tutCloseJF;
  $('mt-tut-skip').onclick  = tutCloseJF;
  tutRenderJF();
  $('mt-tut').classList.add('open');
}
function tutCloseJF(){
  $('mt-tut').classList.remove('open');
  localStorage.setItem(TUT_KEY_JF, '1');
  // Restore LRC handlers
  $('mt-tut-next').onclick  = () => { if(tutIdx < tutSteps.length-1){ tutIdx++; tutRender(); } else tutClose(); };
  $('mt-tut-close').onclick = tutClose;
  $('mt-tut-skip').onclick  = tutClose;
}

renderLines();

/* ── 持续隐藏侧边栏（防止动态插入） ── */
(function hideSidebar(){
  const SELECTORS = [
    'aside',
    '[class*="sidebar"]',
    '[class*="side-bar"]',
    '[id*="sidebar"]',
    '[id*="side-bar"]',
    '#header-menu',
    'footer',
    '.mt-10',
  ];
  function hideAll(){
    SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display','none','important');
        el.style.setProperty('width','0','important');
        el.style.setProperty('min-width','0','important');
        el.style.setProperty('visibility','hidden','important');
      });
    });
    // 让 section.mx-auto 保持单列
    document.querySelectorAll('section.mx-auto').forEach(el => {
      el.style.setProperty('grid-template-columns','1fr','important');
      el.style.setProperty('max-width','100%','important');
    });
  }
  hideAll();
  const observer = new MutationObserver(hideAll);
  observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });
})();

})();
