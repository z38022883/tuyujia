# -*- coding: utf-8 -*-
"""
将《挑战杯申报书-技术关键与主要技术指标》生成为 Word 文档。
排版约定（无符号，纯格式）：
- 标题：四、技术关键和主要技术指标（居中，黑体）
- 一级小节：（一）（二）（三）（黑体）
- 二级条目：1. 2. 3.（黑体加粗）
- 三级条目：（1）（2）（3）（缩进）
- 正文：宋体，首行缩进两字符，1.5 倍行距
- 表格：主要技术指标
用法：python scripts/build-docx-zhuanbaoshu.py
"""
import re
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

HEI = '黑体'
SONG = '宋体'
LATIN = 'Times New Roman'

def style_run(run, size, bold, east):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.name = LATIN
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    rfonts.set(qn('w:eastAsia'), east)
    rfonts.set(qn('w:ascii'), LATIN)
    rfonts.set(qn('w:hAnsi'), LATIN)

def add_rich(par, text, size=12, bold=False, east=SONG):
    """支持 **加粗** 行内标记，输出不含任何符号。"""
    for part in re.split(r'(\*\*.*?\*\*)', text):
        if not part:
            continue
        if part.startswith('**') and part.endswith('**'):
            style_run(par.add_run(), size, True, east)
            par.runs[-1].text = part[2:-2]
        else:
            style_run(par.add_run(), size, bold, east)
            par.runs[-1].text = part

def para(doc, text='', size=12, bold=False, east=SONG, align=None,
         first_indent=None, left_indent=None, before=0, after=6, line=1.5):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line
    if align is not None:
        p.alignment = align
    if first_indent is not None:
        pf.first_line_indent = Cm(first_indent)
    if left_indent is not None:
        pf.left_indent = Cm(left_indent)
    if text:
        add_rich(p, text, size, bold, east)
    return p

def title(doc, text):
    para(doc, text, size=16, bold=True, east=HEI,
         align=WD_ALIGN_PARAGRAPH.CENTER, before=6, after=18)

def section(doc, text):
    para(doc, text, size=14, bold=True, east=HEI, first_indent=0, left_indent=0,
         before=14, after=8, line=1.4)

def item(doc, text):
    """编号条目标题（1. 2. 3.）：顶格。"""
    para(doc, text, size=12, bold=True, east=HEI, first_indent=0, left_indent=0,
         before=8, after=4)

def label(doc, text):
    """小节内独立小标题（如 指标定义与计算方法 / 口径要点）：顶格，黑体加粗。"""
    para(doc, text, size=13, bold=True, east=HEI, first_indent=0, left_indent=0,
         before=12, after=6)

def sub(doc, text):
    """难点：/ 实现：/ 指标支撑：/ 工作内容： 等，标签加粗，正文首行缩进。"""
    para(doc, text, size=12, first_indent=0.85, after=4)

def bullet(doc, text):
    """小括号条目（（1）（2）…）：顶格，无首行缩进、无左缩进。"""
    para(doc, text, size=12, first_indent=0, left_indent=0, after=2)

def body(doc, text):
    para(doc, text, size=12, first_indent=0.85, after=4)

def make_table(doc, rows, widths=(3.5, 4.8, 7.7)):
    table = doc.add_table(rows=len(rows) + 1, cols=3)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header = ('指标', '数值', '说明')
    for j, h in enumerate(header):
        cell = table.cell(0, j)
        cell.text = ''
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_rich(p, h, size=11, bold=True, east=HEI)
    for i, row in enumerate(rows, start=1):
        for j, val in enumerate(row):
            cell = table.cell(i, j)
            cell.text = ''
            p = cell.paragraphs[0]
            add_rich(p, val, size=10.5, bold=False, east=SONG)
    for i, row in enumerate([header] + rows):
        for j in range(3):
            table.cell(i, j).width = Cm(widths[j])
    return table

def main():
    doc = Document()
    # 页面：A4，页边距
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(2.54)
    sec.bottom_margin = Cm(2.54)
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)

    # ===== 标题与引言 =====
    title(doc, '四、技术关键和主要技术指标')
    body(doc, '本应用为面向失语症患者的图语交互微信小程序，以高语义透明度图符为语言介质，支持文字或语音到图片序列（接收）与图片序列到自然语言句子（表达）的双向转换，服务医患及家属的日常沟通与康复训练。')
    body(doc, '本章节在给出技术关键与主要技术指标的同时，呈现支撑各项指标的研究迭代过程：以评估集驱动，历经三次迭代（评估体系建立、评估集扩充与图库补齐、匹配算法重构），将内容词召回率从 89.8% 提升至 100%，出图精度从 80.1% 提升至 100%，语义反转假阳性由 4 处降为 0。')

    # =====（一）技术关键 =====
    section(doc, '（一）技术关键')

    item(doc, '1. 图片序列到自然语言句子生成')
    sub(doc, '**难点**：失语症患者难以组织语法正确的自然语言，但可以看图点选。系统需要将用户点选的图符序列，还原为语法可读、语义完整、可朗读的中文句子，供照护者理解与语音播放。')
    sub(doc, '**实现**：')
    bullet(doc, '（1）图符按轻、中、重三级词板组织，高频刚需词（如厕所、家、开心、睡觉、医生）经手动排序置前，降低点选成本。')
    bullet(doc, '（2）最近使用板基于已持久化的表达历史动态生成，跨会话生效，减少重复查找。')
    bullet(doc, '（3）图符序列按语境组装为句子并接入语音朗读；接收与表达两端共享同一套图库与语义元数据，保证对方看到的图与己方表达的意一致。')
    sub(doc, '**指标支撑**：15 个新补图符同步进入表达词板；板内排序、最近使用入口均已激活；三级界面下重度患者仅保留核心刚需词，避免信息过载。')

    item(doc, '2. 语音到图片序列匹配（核心技术）')
    sub(doc, '**难点**：语音转写或键盘输入的自然语言粒度与图库词表粒度不匹配。口语中的整体概念（如吃药、肚子疼、张嘴、救护车）易被通用分词器拆散；否定句与正反问（如你饿不饿、要不要）一旦切分错误会造成语义反转，在医疗与安全场景中后果严重。')
    sub(doc, '**实现（全本地、确定性、零模型成本）**：')
    bullet(doc, '（1）词表贪心预分词：以图库标签与同义词构成的 737 词索引为切分词表，采用最长匹配，从原文整体切出吃药、肚子疼、张嘴、再说一次等整体图复合词，从根源解决粒度不匹配问题。')
    bullet(doc, '（2）正反问折叠：对甲不甲结构（饿不饿、麻不麻）及固定短语（是不是、要不要、会不会、能不能、可不可以）在否定合并之前折叠为功能词，杜绝不、不要、不是等否定图假阳性。')
    bullet(doc, '（3）否定复合词合并：将不加开心合并为不开心整体交由后续精确匹配，防止正面词被单独命中造成语义反转。')
    bullet(doc, '（4）五级匹配：按精确标签、同义词、词库同义词、包含匹配逐级降级，并含否定前缀安全限制。')
    bullet(doc, '（5）语义域消歧：利用语义域、排除词、可接受替代图三类元数据对候选图符重排与标注，支撑自动消歧。')
    sub(doc, '**指标支撑**：内容词召回率从 89.8% 提升至 100%（147 比 147），出图精度从 80.1% 提升至 100%，否定反转与假阳性违反由 4 处降为 0，匹配成功率由 0.897 提升至 0.966，全程无网络调用、毫秒级返回。')

    item(doc, '3. 图库高语义透明度设计')
    sub(doc, '**难点**：图符的可用性取决于语义透明度，患者须看到即懂，低透明度的抽象符号会直接失效；同时图符须与失语症患者的认知负荷匹配，宁可整体出图，不可拆分糊图。')
    sub(doc, '**实现**：')
    bullet(doc, '（1）全量选取 ARASAAC 开源图符库，优先写实风格且含 AAC 官方标注的图符，保证直观可懂。')
    bullet(doc, '（2）坚持整体图优先原则：凡存在整体图的复合概念（头疼、肚子疼、吃药、张嘴、深呼吸、救护车、再说一次），一律以整体图为期望单元，不以拆分词凑数。')
    bullet(doc, '（3）词形双向闭环：每个图符以标签与同义词双通道组织，保证词到图（匹配）与图到词（表达）双向可检索。')
    bullet(doc, '（4）歧义元数据：以语义域、排除词、可接受替代图三类元数据支撑自动消歧。')
    bullet(doc, '（5）自动核对：通过关键词与图符的三层核对（无缺口、无断链、词形闭环）对全部样本自动校验。')
    sub(doc, '**指标支撑**：图库规模由 295 扩充至 310 个高语义透明度图符，覆盖 14 个日常高频场景；图库缺口由 15 个降为 0；148 个评估关键词全部有图，111 个图符引用零断链，词形 100% 闭环。')

    item(doc, '4. 分级界面自适应切换')
    sub(doc, '**难点**：失语症患者病情程度差异大，单一界面无法适配所有人。重度患者需要极少的核心词，轻度患者需要更丰富的表达空间。')
    sub(doc, '**实现**：')
    bullet(doc, '（1）提供轻、中、重三档自选档案，程度作用于说、听、康复三项功能的内容与展示。')
    bullet(doc, '（2）重度表达板仅保留核心刚需词，接收侧依据程度调整内容词优先级，保证你好、医生来看你了优先呈现医生而非社交词。')
    bullet(doc, '（3）中度词板扩充至 20 词，纳入你好、再见、对不起、辛苦等高频礼貌词。')
    bullet(doc, '（4）板内排序、最近使用、匹配结果展示均随程度自适应。')
    sub(doc, '**指标支撑**：三级界面下的词板策展、排序与内容过滤由同一份程度档案驱动，接收、表达、康复三端数据一致。')

    item(doc, '5. 小程序性能优化')
    sub(doc, '**难点**：微信小程序内存与首包体积受限，图库检索若逐条遍历，会带来明显延迟。')
    sub(doc, '**实现**：')
    bullet(doc, '（1）图库种子数据一次性载入内存，词表索引预构建为常数时间查询。')
    bullet(doc, '（2）词表贪心预分词采用最长匹配，复杂度为线性，单句毫秒级完成。')
    bullet(doc, '（3）输出图符去重，结果可缓存复用。')
    bullet(doc, '（4）离线评估与线上共用同一匹配器，保证优化可回归、可复现。')
    sub(doc, '**指标支撑**：85 条评估样本全量毫秒级完成；匹配成功率、召回、精度、反转违反、反作弊五项指标均可数秒复现。')

    item(doc, '6. 离线可用方案')
    sub(doc, '**难点**：医院病房与家庭网络常不稳定，沟通工具必须断网可用，不能依赖云端推理或在线词典。')
    sub(doc, '**实现**：')
    bullet(doc, '（1）全部结构化数据（310 图符、737 词词表、分级词板）本地内置，匹配逻辑纯本地、零网络依赖、零外部模型调用。')
    bullet(doc, '（2）图符图片采用可寻址的静态资源，具备缓存与随包发布能力，可离线降级。')
    bullet(doc, '（3）性能与匹配完全由本地确定性规则承担，健康场景语料不出设备，兼顾隐私与低成本。')
    sub(doc, '**指标支撑**：评估工具纯本地可复现，匹配零网络调用，隐私数据不出设备。')

    # =====（二）主要技术指标 =====
    section(doc, '（二）主要技术指标')
    table_rows = [
        ('图库规模', '310 个高语义透明度图符', 'ARASAAC 来源，覆盖 14 个日常高频场景'),
        ('词表检索索引', '737 词', '标签与同义词双向索引，常数时间查询'),
        ('评估集', '85 条真实高频句，14 场景，5 类句式', '涵盖问候、饮食、排泄卫生、症状医疗、情绪、动作、指令、出行、人物、时间、沟通修复、应急、否定应答、天气'),
        ('内容词召回率', '89.8% 提升至 100%（147 比 147）', '接收侧核心指标'),
        ('出图精度', '80.1% 提升至 100%', '输出图符全部命中期望'),
        ('否定反转与假阳性违反', '4 处降为 0', '正反问与否定语义反转归零'),
        ('匹配成功率', '0.897 提升至 0.966', '全程可复现'),
        ('图库缺口', '15 个降为 0', '无断链、无缺词'),
        ('场景覆盖', '13 个场景达到 100% 召回与精度', '沟通修复由 33.3% 提升至 100%'),
        ('整句单词反作弊', '0 命中', '防止整句合成一词的作弊式提分'),
        ('匹配时延', '毫秒级', '最长匹配，本地零网络调用'),
    ]
    make_table(doc, table_rows)

    # 指标定义与计算方法（紧接指标表，格式与正文一致）
    label(doc, '指标定义与计算方法')

    item(doc, '1. 内容词召回率（召回率）')
    sub(doc, '公式：R = H ÷ D × 100%。')
    sub(doc, 'D 为计分项总数，即评估集中角色为内容词且已标注图符的期望词数，复合概念按整体图优先计 1 项；H 为命中数，即输出图符集合（按编号去重）包含期望词主图符编号或任一可接受替代图编号的期望词数。')
    sub(doc, '当前数值：147 比 147，100%（优化前 89.8%）。')

    item(doc, '2. 出图精度（精度）')
    sub(doc, '公式：P = H ÷ M × 100%。')
    sub(doc, 'H 为命中数，同召回率分子，含可接受替代图命中；M 为匹配器实际输出图符总数，按编号去重。')
    sub(doc, '当前数值：147 比 147，100%（优化前 80.1%）。')

    item(doc, '3. 否定反转与假阳性违反数')
    sub(doc, '各样本中，输出图符集合命中该句语义禁止图的累计次数，用于度量语义反转与假阳性错误，例如把"饿不饿"误出为"不"、把"不开心"误出为"开心"。')
    sub(doc, '当前数值：4 处降为 0。')

    item(doc, '4. 匹配成功率')
    sub(doc, '公式：Rm = C ÷ N × 100%。')
    sub(doc, 'C 为匹配成功的分词单元数；N 为参与匹配的分词单元总数，即经贪心分词、正反问折叠、否定合并、功能词剔除等预处理后的分词单元数。')
    sub(doc, '当前数值：0.897 提升至 0.966（参考指标）。')

    item(doc, '5. 整句单分词单元反作弊命中数')
    sub(doc, '计分项不少于 2 的句子，若整句被合并为单个分词单元一次匹配，属作弊式提分，计 1 次并剔除；合法短句（如危险、再见）不计。')
    sub(doc, '当前数值：0。')

    item(doc, '6. 图库缺口数')
    sub(doc, '评估集中角色为内容词但未标注图符（有词无图）的期望词数，用于度量图库覆盖完整性。')
    sub(doc, '当前数值：15 个降为 0。')

    item(doc, '7. 关键词与图符三层核对通过率')
    sub(doc, '无缺口：内容词 100% 已标注图符（148 比 148）。')
    sub(doc, '无断链：评估集引用的全部图符编号 100% 存在于词库（111 比 111）。')
    sub(doc, '词形闭环：期望词的词形被对应图符的标签与同义词直接覆盖，100%。')

    item(doc, '8. 场景覆盖数与场景达标率')
    sub(doc, '场景达标指该场景召回率与精度均达 100%；达标率 = 达标场景数 ÷ 总场景数。')
    sub(doc, '当前数值：14 比 14，即 14 个场景全部达标（100%）。')

    item(doc, '9. 规模类指标')
    sub(doc, '图库规模 310 个高语义透明度图符；词表检索索引 737 词；评估集规模 85 句、14 场景、5 类句式。')

    item(doc, '10. 匹配时延')
    sub(doc, '单句本地匹配耗时，毫秒级。')

    label(doc, '口径要点（保证指标可比）')
    bullet(doc, '（1）整体图优先：复合概念（头疼、吃药、张嘴、救护车）按整体图计 1 项，不以拆分词凑数。')
    bullet(doc, '（2）可接受替代图计入命中：语义歧义但语义可接受的替代图算命中，不计误出。')
    bullet(doc, '（3）输出按图符编号去重后计算输出总数并判定命中。')
    bullet(doc, '（4）反作弊仅在计分项不少于 2 的句子生效。')
    bullet(doc, '（5）每次改动全量回归并逐条对比，指标只升不降。')

    # =====（三）研究迭代过程 =====
    section(doc, '（三）研究迭代过程（评估驱动的三次迭代）')
    body(doc, '本项目采用先建评估、再定根因、逐轮优化、零回归交付的数据驱动研发方法。所有优化均以评估集量化前后指标，杜绝凭感觉调参；每次改动全量回归并逐条对比，确保只变好、不变坏。')

    item(doc, '1. 迭代一：评估集 1.0 与基线建立')
    sub(doc, '**工作内容**：从接收页真实示例短语与高频照护句出发，建立 20 条初始评估集，每条标注句子与期望图符序列，并配套离线评估工具，与线上共用同一匹配器。')
    sub(doc, '**发现的问题**：')
    bullet(doc, '（1）评估口径存在缺陷：合法短句（如危险、再见）被整句单词反作弊误判为作弊，需限定内容词数不少于 2 的句子才计。')
    bullet(doc, '（2）缺少场景与句式维度，无法定位短板。')
    sub(doc, '**方法与产出**：确立内容词召回、出图精度、反作弊三维评估口径与整体图优先评分原则，产出可复现基线。此迭代本身即在打磨评估量尺，先保证尺子正确，再谈测量结果。')

    item(doc, '2. 迭代二：评估集扩充与图库补齐（消除 15 个图库缺口）')
    sub(doc, '**工作内容**：')
    bullet(doc, '（1）评估集由 20 条扩充至 85 条，覆盖 14 个日常场景与多类句式。')
    bullet(doc, '（2）引入反转断言，标注语义上禁止出现的图符，专门抓取语义反转错误。')
    bullet(doc, '（3）引入可接受替代图，标注语义歧义但可接受的图符。')
    bullet(doc, '（4）引入关键词与图符的三层自动核对（无缺口、无断链、词形闭环）。')
    sub(doc, '**发现的问题**：全量诊断暴露 15 个图库缺口与最大短板，即沟通修复场景召回率仅 33.3%，医疗照护动作词（量、检查、打针、张嘴、深呼吸、抬手、扶）与礼貌词（你好、再见、对不起、辛苦）整体缺失。')
    sub(doc, '**方法与产出**：')
    bullet(doc, '（1）调用 ARASAAC 官方接口，按整体图优先补齐 15 个图符，图库由 295 扩充至 310。')
    bullet(doc, '（2）对无独立图的表达以同义词收口（如没事归入放心、别着急归入先别急），完成词形闭环。')
    bullet(doc, '（3）回填评估缺口标识，并将 3 条句子升级为整体图期望。')
    sub(doc, '**指标变化**：评估口径更严（整体图优先，计分项净增 10 个）的背景下，命中数仍净增 10；精度由 76.7% 提升至 79.5%；图库缺口由 15 个降为 0；问候、人物、天气场景达到 100%。')

    item(doc, '3. 迭代三：匹配算法重构（贪心预分词、正反问折叠、口径收敛）')
    sub(doc, '**根因归因**（三类问题均归因到确定性原因，不修表象）：')
    bullet(doc, '（1）未召回 15 处，全部为整体图复合词被通用分词器拆散，且均已存在于词库，属纯粒度问题。')
    bullet(doc, '（2）反转违反 4 处，全部为甲不甲正反问被误合并为否定图。')
    bullet(doc, '（3）精度噪声来自量词后缀一下与趋向补语来（如坐下来）漏出为错误图。')
    sub(doc, '**方法与产出**：')
    bullet(doc, '（1）词表贪心预分词：以 737 词索引为切分词表做最长匹配，整体图复合词从原文整词切出；配套切后丢弃词与图库补词（坐下来）。')
    bullet(doc, '（2）正反问折叠：将甲不甲折叠为单字、固定短语功能化，并置于否定合并之前。')
    bullet(doc, '（3）口径收敛：按整体图优先原则统一评估口径（喝水由拆分为喝加水改为喝水整体图），85 条样本全量对比，实现零回归。')
    sub(doc, '**指标变化**：')
    bullet(doc, '（1）内容词召回率由 89.8% 提升至 100%。')
    bullet(doc, '（2）出图精度由 80.1% 提升至 100%。')
    bullet(doc, '（3）反转违反由 4 处降为 0。')
    bullet(doc, '（4）匹配成功率由 0.897 提升至 0.966。')
    body(doc, '沟通修复场景由 33.3% 提升至 100%，13 个场景达到 100%。')
    sub(doc, '**关键决策**：评估面已 100% 由本地确定性规则覆盖，故不接入大模型，避免云调用成本、延迟与健康数据隐私风险；改以扩充真实输入、量化语义级残差，作为后续是否引入大模型的数据决策点。')

    item(doc, '4. 迭代方法论小结')
    bullet(doc, '（1）评估驱动：先量化基线再谈优化，所有改动均需可复现的前后指标对比。')
    bullet(doc, '（2）根因归因：每条错误归入分词、词库、评估口径三类之一，不修表象、不掩盖。')
    bullet(doc, '（3）零回归保障：每次改动全量回归并逐条对比，指标只升不降。')
    bullet(doc, '（4）口径演进：评估集随理解加深升级，指标可比的前提是口径一致，即整体图优先。')
    bullet(doc, '（5）成本克制：全部优化为本地确定性规则，零模型、零网络成本，为离线可用与隐私友好奠基，这对医疗健康场景尤为关键。')

    out = 'docs/挑战杯申报书-技术关键与主要技术指标.docx'
    doc.save(out)
    print('saved:', out)

if __name__ == '__main__':
    main()
