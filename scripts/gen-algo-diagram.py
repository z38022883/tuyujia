# -*- coding: utf-8 -*-
"""生成接收匹配算法机制图（申报表 图5-1）· 横向五阶段流水线版。

结构参考：全本地 / 确定性 / 零模型成本 中文口语理解管线的分列机制图。
内容与代码一一对应：src/utils/text-to-image-matcher.ts
  vocabSegment → foldAorNotA → mergeNegation/功能词剔除 → 五级级联匹配 → 输出去噪
"""
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib import font_manager

font_manager.fontManager.addfont(r"C:\Windows\Fonts\msyh.ttc")
plt.rcParams["font.family"] = "Microsoft YaHei"

OUT = sys.argv[1] if len(sys.argv) > 1 else r"D:\projects\tuyujia\docs\图5-1_接收匹配算法机制图.png"

W = 22.0
DPI = 160

# ------------------------------------------------------------------ 配色
C_IO, C_IO_E = "#DDE9F5", "#4A6C8F"
C_BOX, C_BOX_E = "#FFFFFF", "#9FB4C8"
C_MECH = "#EAF1F8"
C_RES, C_RES_E = "#FBF3DC", "#C9A227"
C_OK, C_OK_E = "#EAF4EA", "#7FA372"
C_PREP, C_PREP_E = "#FBEFD6", "#B08A2E"
C_MATCH = "#1F4E79"
C_OUT = "#7A3E6B"
C_BANNER = "#F2F6FA"
C_TXT = "#22303C"
C_LINE = "#7A8A99"

# ------------------------------------------------------------------ 栅格
M = 0.26
BAN_H = 0.40
BAR_H = 0.56
TOP_GAP = 0.24
IN_W, OUT_W, GAP = 1.86, 1.58, 0.34
N = 5
STAGE_W = (W - 2 * M - IN_W - OUT_W - GAP * (N + 1)) / N
IN_X = M
STAGE_X = [IN_X + IN_W + GAP + i * (STAGE_W + GAP) for i in range(N)]
OUT_X = STAGE_X[-1] + STAGE_W + GAP

FS_BOX, FS_RES, FS_MECH, FS_NOTE = 8.5, 8.4, 8.2, 7.4
LH = lambda size: size / 72.0 * 1.62
CHAR_W = lambda size, w: (w - 0.44) * 72 / size * 0.99
BOX_H = 0.56
BOX_GAP = 0.25
MECH_GAP = 0.22
NOTE_GAP = 0.18
RES_H = 0.46


def fit(s, max_chars):
    lines, cur, width = [], "", 0.0
    for ch in s:
        cw = 1.0 if ord(ch) > 255 else 0.55
        if width + cw > max_chars and cur:
            lines.append(cur)
            cur, width = ch, cw
        else:
            cur += ch
            width += cw
    if cur:
        lines.append(cur)
    return lines


STAGES = [
    dict(
        no="①", name="词表贪心预分词", code="vocabSegment()",
        tag="预处理 · 切分粒度对齐词表",
        headc=C_PREP, heade=C_PREP_E,
        mech="机制：正向最大匹配 FMM\n切分词表 = 图库词 737 ＋ 功能词 ＋ 丢弃词",
        boxes=[
            "输入：从句子左端开始扫描",
            "取最长词长 4 → 1 倒序试命中词表",
            "命中即整词切出，游标右移该词长",
            "未命中则输出单字，游标 + 1",
            "重复至句尾，复杂度 O(句长 × 4)",
        ],
        branch=[],
        note="要点：吃药 / 肚子疼 / 张嘴 / 救护车 / 看电视 等整体图复合词整词切出，避免被通用分词拆散后无法命中整体图，"
             "也消除 吃 / 药 式半截图噪声。",
        res="输出：待匹配的 token 单元序列",
    ),
    dict(
        no="②", name="正反问折叠", code="foldAorNotA()",
        tag="预处理 · 语义反转保护",
        headc=C_PREP, heade=C_PREP_E,
        mech="机制：检测 A不A（甲不甲 / A没A）\n口语疑问结构，非真否定",
        boxes=[
            "扫描三分窗口 (t, 不, t) 与 (t, 没, t)",
            "命中 A不A 且 A 为单字 → 折叠为单个 A",
            "对 是不是 / 要不要 / 会不会 / 能不能 / 可不可以 整词功能化",
            "真否定 不疼了 / 不是的 / 不开心 / 别着急 不折叠",
            "折叠结果交后续：单字保留，功能短语丢弃",
        ],
        branch=[],
        note="要点：必须早于否定合并执行，防止 不 被误合并或误拆出 不(p_no) / 不要(p_dont_want) / 不是(p_not) 等反转图。",
        res="输出：饿 / 麻 等单字 ＋ 待丢弃的功能短语",
    ),
    dict(
        no="③", name="否定合并与功能词剔除", code="mergeNegation() · FUNCTION_WORDS · DROP_WORDS",
        tag="预处理 · 去噪保义",
        headc=C_PREP, heade=C_PREP_E,
        mech="机制：单字否定词 ＋ 相伴词 → 复合词\n不 ＋ 开心 → 不开心",
        boxes=[
            "否定前缀 不/没/别/勿/莫/未 与其后 token 合并",
            "功能词剔除（11）：需要/要/该/应该/感觉/好像/起来/下来/上来/上去/下去",
            "切后丢弃词（8）：一下/我们/咱们/是不是/要不要/会不会/能不能/可不可以",
            "碎片清理（15）：了/的/吧/呢/啊/哦/呀/吗/把/着/过/这/那/之/么",
            "保留词进入五级级联匹配",
        ],
        branch=[],
        note="要点：否定语义以整体图命中，减少噪声；不 不单独参与包含匹配，\"不开心\" 不会被匹配到 \"开心\"，反转在此被双重拦截。",
        res="输出：我 / 不饿 / 吃药（整体图）/ 肚子疼 / 再说一次",
    ),
    dict(
        no="④", name="五级级联匹配", code="matchToken() · pickBestCandidate()",
        tag="匹配 · 自上而下试探，命中即停",
        headc=C_MATCH, heade=C_MATCH,
        mech="机制：L1 → L5 逐级下探，命中即停\n阶段基分 400 / 300 / 200",
        boxes=[
            "L1 精确匹配 labels.zh",
            "L2 匹配 synonyms 同义词集",
            "L3 词库同义词链（lexicon）",
            "L4 包含匹配（≥2 字标签）",
            "L5 词表贪心拆解兜底",
        ],
        branch=[True, True, True, True, False],
        sub_note="已命中整体图的词不拆解",
        note="要点：同级内 语义域 ＋40 分重排，命中排除词表判负（-∞）；含否定前缀的 token 跳过 L4；"
             "五级全未命中则安全 miss，不猜图。",
        res="输出：图符单元（每 token 一个）",
    ),
    dict(
        no="⑤", name="输出去噪与呈现", code="matchTextToImages() · 接收页复核",
        tag="输出 · 去重 ＋ 反作弊 ＋ 人工修正",
        headc=C_OUT, heade=C_OUT,
        mech="机制：编号去重 ＋ 反作弊判定\n＋ 人工修正闭环",
        boxes=[
            "按图符编号去重，重复图卡只留一张",
            "整句合并为单词反作弊：计分项 ≥ 2 时计 1 次并剔除",
            "统计匹配成功率 = 匹配成功单元 C ÷ 单元总数 N",
            "接收页 换图 / 删除 / 前后排序 修正",
            "修正序列写入历史，回流同义词闭环",
        ],
        branch=[],
        note="要点：未命中（matchType = none）的分词单元不出图；每次改动全量回归、逐条对比，"
             "指标只升不降（matchRate 0.897 → 0.966）。",
        res="输出：图符序列（按编号去重）",
    ),
]

# ------------------------------------------------------------------ 纵向尺寸（各列统一）
mech_h = max(0.205 * len(st["mech"].split("\n")) + 0.18 for st in STAGES)
sub_h = 0.30
note_lines = {st["no"]: len(fit(st["note"], CHAR_W(FS_NOTE, STAGE_W))) for st in STAGES}
note_h = max(n * LH(FS_NOTE) for n in note_lines.values()) + 0.16

COL_H = (BAR_H + MECH_GAP + mech_h + MECH_GAP + 5 * BOX_H + 4 * BOX_GAP
         + NOTE_GAP + sub_h + NOTE_GAP + note_h + NOTE_GAP + RES_H)
TOP_BAN_Y = M + BAN_H + 0.26 + COL_H + TOP_GAP
H = TOP_BAN_Y + BAN_H + M
BOT_BAN_Y = M
COL_TOP = TOP_BAN_Y - TOP_GAP
COL_BOT = COL_TOP - COL_H

fig = plt.figure(figsize=(W, H), dpi=DPI)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")


def box(x, y, w, h, fc, ec, lw=1.1, r=0.07, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle=f"round,pad=0.04,rounding_size={r}",
                                fc=fc, ec=ec, lw=lw, zorder=z))


def txt(x, y, s, size=8.6, color=C_TXT, ha="center", va="center", bold=False, z=6):
    ax.text(x, y, s, fontsize=size, color=color, ha=ha, va=va,
            fontweight="bold" if bold else "normal", zorder=z)


def arrow(x1, y1, x2, y2, color=C_LINE, lw=1.3, z=4):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=11,
                                 color=color, lw=lw, shrinkA=0, shrinkB=0, zorder=z))


def vflow(x, ytop, ybot, color=C_LINE, lw=1.3, label=None, lcolor="#C0504D"):
    arrow(x, ytop, x, ybot, color=color, lw=lw)
    if label:
        txt(x + 0.20, (ytop + ybot) / 2, label, size=6.8, color=lcolor)


def draw_stage(st, x):
    w = STAGE_W
    y = COL_TOP
    # 标题条
    box(x, y - BAR_H, w, BAR_H, st["headc"], st["heade"], lw=1.2, r=0.08)
    fg = "#FFFFFF" if st["headc"] != C_PREP else "#5A3D00"
    txt(x + 0.12, y - BAR_H * 0.38, f'{st["no"]} {st["name"]}', size=10.6,
        color=fg, ha="left", bold=True)
    txt(x + 0.12, y - BAR_H * 0.78, st["code"], size=6.8,
        color="#EAF2FA" if st["headc"] != C_PREP else "#6B4A00", ha="left")
    txt(x + w - 0.10, y - BAR_H * 0.38, st["tag"], size=7.2, color=fg, ha="right")
    y -= BAR_H + MECH_GAP

    # 机制标签
    box(x + 0.10, y - mech_h, w - 0.20, mech_h, C_MECH, "#B9C8D6", lw=1.0, r=0.06)
    ty = y - 0.10
    for ln in st["mech"].split("\n"):
        txt(x + 0.22, ty, ln, size=FS_MECH, color="#41618A", ha="left")
        ty -= 0.205
    y -= mech_h + MECH_GAP

    # 五级主体
    for i, b in enumerate(st["boxes"]):
        box(x + 0.18, y - BOX_H, w - 0.36, BOX_H, C_BOX, C_BOX_E, lw=1.0, r=0.06)
        lines = fit(b, CHAR_W(FS_BOX, w))
        ly = y - BOX_H / 2 + (len(lines) - 1) * LH(FS_BOX) / 2
        for ln in lines:
            txt(x + w / 2, ly, ln, size=FS_BOX)
            ly -= LH(FS_BOX)
        if i < 4:
            if st["branch"] and st["branch"][i]:
                vflow(x + w / 2, y - BOX_H, y - BOX_H - BOX_GAP + 0.02, color="#C0504D", label="否")
                arrow(x + w - 0.36, y - BOX_H / 2, x + w - 0.02, y - BOX_H / 2,
                      color="#4A7A4A", lw=1.2)
                txt(x + w - 0.20, y - BOX_H / 2 + 0.14, "是", size=6.8, color="#4A7A4A")
            else:
                vflow(x + w / 2, y - BOX_H, y - BOX_H - BOX_GAP + 0.02)
        y -= BOX_H + BOX_GAP

    y -= NOTE_GAP - BOX_GAP + MECH_GAP
    # ④ 补充提示
    if st.get("sub_note"):
        box(x + 0.10, y - sub_h, w - 0.20, sub_h, C_MECH, "#B9C8D6", lw=1.0, r=0.06)
        txt(x + w / 2, y - sub_h / 2, st["sub_note"], size=7.4, color="#41618A")
        y -= sub_h + NOTE_GAP

    # 要点
    box(x + 0.10, y - note_h, w - 0.20, note_h, "#F7F9FC", "#B9C8D6", lw=1.0, r=0.06)
    ty = y - 0.10
    for ln in fit(st["note"], CHAR_W(FS_NOTE, w)):
        txt(x + 0.22, ty, ln, size=FS_NOTE, color="#41618A", ha="left")
        ty -= LH(FS_NOTE)
    y -= note_h + NOTE_GAP

    # 结论
    box(x + 0.14, y - RES_H, w - 0.28, RES_H, C_OK, C_OK_E, lw=1.2, r=0.07)
    txt(x + w / 2, y - RES_H / 2, st["res"], size=FS_RES, color="#2F5D2F", bold=True)
    return y - RES_H


# ------------------------------------------------------------------ 顶/底横幅
box(M, TOP_BAN_Y, W - 2 * M, BAN_H, C_BANNER, "#B9C8D6", lw=1.0, r=0.05)
txt(M + 0.16, TOP_BAN_Y + BAN_H / 2, "接收匹配算法机制", size=12.0, color="#14304F",
    ha="left", bold=True)
txt(W / 2 + 0.5, TOP_BAN_Y + BAN_H / 2,
    "全本地 · 确定性 · 零模型成本：一次预处理 → 一次级联匹配 → 一次去噪", size=12.0,
    color="#14304F", bold=True)
box(M, BOT_BAN_Y, W - 2 * M, BAN_H, C_BANNER, "#B9C8D6", lw=1.0, r=0.05)
txt(W / 2, BOT_BAN_Y + BAN_H / 2,
    "代码：src/utils/text-to-image-matcher.ts（vocabSegment / foldAorNotA / mergeNegation / matchToken / splitByLexicon）"
    "　｜　数据：pictograms.json 310 图符 ＋ _lexicon-index.json 737 词　｜　golden 85 句 / 14 场景：召回 100%（147/147）· 精度 100% · 反转 0",
    size=8.4, color="#4A5A6A")

# ------------------------------------------------------------------ 输入列
iy = COL_TOP
box(IN_X, iy - BAR_H, IN_W, BAR_H, C_IO, C_IO_E, lw=1.2, r=0.07)
txt(IN_X + IN_W / 2, iy - BAR_H * 0.62, "输入", size=10.4, color="#2F5D2F", bold=True)
txt(IN_X + IN_W / 2, iy - BAR_H * 0.25, "中文自然语句", size=7.6, color="#3A6B3A")
iy -= BAR_H + 0.30
box(IN_X, iy - 0.92, IN_W, 0.92, C_BOX, C_BOX_E, lw=1.1, r=0.08)
txt(IN_X + IN_W / 2, iy - 0.26, "输入句", size=8.6, bold=True, color="#14304F")
txt(IN_X + IN_W / 2, iy - 0.62, "我不饿，不要\n肚子疼，再说一次", size=8.6)
iy -= 0.92 + 0.34
txt(IN_X + IN_W / 2, iy + 0.02, "① 切分结果", size=8.2, color="#7A4A00", bold=True)
iy -= 0.18
for t in ["我", "不饿", "不要", "肚子疼", "再说一次"]:
    box(IN_X + 0.10, iy - 0.54, IN_W - 0.20, 0.54, C_RES, C_RES_E, lw=1.0, r=0.06)
    txt(IN_X + IN_W / 2, iy - 0.27, t, size=9.0, color="#5A4200")
    iy -= 0.54 + 0.22

# ------------------------------------------------------------------ 输出列
box(OUT_X, COL_TOP - BAR_H, OUT_W, BAR_H, C_IO, C_IO_E, lw=1.2, r=0.07)
txt(OUT_X + OUT_W / 2, COL_TOP - BAR_H * 0.62, "输出", size=10.4, color="#2F5D2F", bold=True)
txt(OUT_X + OUT_W / 2, COL_TOP - BAR_H * 0.25, "图符序列", size=7.6, color="#3A6B3A")
oy = COL_TOP - BAR_H - 0.32
for t in ["我", "不饿", "不吃药", "肚子疼", "再说一次"]:
    box(OUT_X + 0.10, oy - 0.68, OUT_W - 0.20, 0.68, C_BOX, C_OK_E, lw=1.1, r=0.06)
    box(OUT_X + OUT_W / 2 - 0.17, oy - 0.37, 0.34, 0.22, "#EAF4EA", C_OK_E, lw=0.9, r=0.04)
    txt(OUT_X + OUT_W / 2, oy - 0.52, t, size=8.2, color="#2F5D2F")
    oy -= 0.68 + 0.22

# ------------------------------------------------------------------ 阶段列
for i, st in enumerate(STAGES):
    draw_stage(st, STAGE_X[i])

# 输入 → ①
arrow(IN_X + IN_W + 0.02, COL_TOP - BAR_H / 2, STAGE_X[0] - 0.02, COL_TOP - BAR_H / 2,
      color="#B08A2E", lw=1.8)

# 列间箭头：串联各列结论框
res_y = COL_BOT + RES_H / 2
for i in range(N - 1):
    arrow(STAGE_X[i] + STAGE_W + 0.02, res_y, STAGE_X[i + 1] - 0.02, res_y,
          color="#4A6C8F", lw=1.8)
arrow(STAGE_X[-1] + STAGE_W + 0.02, res_y, OUT_X - 0.02, res_y, color="#7A3E6B", lw=1.8)

fig.savefig(OUT, facecolor="white")
print("saved", OUT, "画布 %.2f x %.2f  COL_BOT=%.2f" % (W, H, COL_BOT))
