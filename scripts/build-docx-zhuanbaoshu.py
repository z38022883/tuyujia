# -*- coding: utf-8 -*-
"""
《技术关键与主要技术指标》Word 文档生成器（挑战杯申报书章节）。
按评审意见 v2 重写：
- 论文化文风：难点/方案/与现有技术对比/指标融合成段，不按"难点-实现-指标支撑"分条。
- 新增创新点：基础图库 + 自建核心20词。
- 指标定义与计算方法改为表格。
- 研究迭代过程压缩为一段，融入正文，不单独成节。
- 小标题与小括号条目顶格。
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

def body(doc, text):
    para(doc, text, size=12, first_indent=0.85, after=4)

def make_table(doc, rows, widths, header, align_first_col=True):
    table = doc.add_table(rows=len(rows) + 1, cols=len(header))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
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
            if align_first_col and j == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_rich(p, val, size=10.5, bold=False, east=SONG)
    for i in range(len(rows) + 1):
        for j in range(len(header)):
            table.cell(i, j).width = Cm(widths[j])
    return table

def main():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(2.54)
    sec.bottom_margin = Cm(2.54)
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)

    # ===== 标题与引言 =====
    title(doc, '四、技术关键和主要技术指标')

    body(doc, '失语症患者因脑部损伤难以组织语言，医患及家属的日常沟通十分困难。本作品以高语义透明度图符为语言介质，构建图语交互系统，支持语音或文字到图片序列（接收）与图片序列到自然语言句子（表达）的双向转换，覆盖日常沟通与康复训练场景。系统采用评估驱动的方法迭代优化，最终实现内容词召回率与出图精度均达 100%，语义反转假阳性降至 0，全链路本地化、断网可用、隐私友好。')

    body(doc, '研究过程中，系统先建立覆盖 14 个日常高频场景的 85 句评估集，据此定位并补齐图库缺口、重构匹配算法，经两轮共四次迭代使内容词召回率由 89.8% 提升至 100%，出图精度由 80.1% 提升至 100%，语义反转假阳性由 4 处降为 0，全程零回归。以下给出六项关键技术、性能指标及其计算方法。')

    # =====（一）技术关键 =====
    section(doc, '（一）技术关键')

    item(doc, '1. 图片序列到自然语言句子生成')
    body(doc, '失语症患者难以组织语法正确的句子，但能看图点选，因此系统需将点选的图符序列还原为语法可读、语义完整、可朗读的中文句子。图符按轻、中、重三级词板组织，高频刚需词（厕所、家、开心、睡觉、医生等）经排序置前，最近使用板基于已持久化的表达历史动态生成；图符序列按语境组装为句子并接入语音朗读。相对同类"固定句式点选"方案，本系统接收与表达两端共享同一套图库与语义元数据，保证"对方看到的图与己方表达的意一致"，并随患者程度自适应内容与展示。')

    item(doc, '2. 语音到图片序列匹配（核心技术）')
    body(doc, '语音转写或键盘输入的自然语言，其粒度常与图库词表粒度不匹配：口语中的整体概念（吃药、肚子疼、张嘴、救护车）易被通用分词器拆散，否定句与正反问（你饿不饿、要不要）切分错误更会造成语义反转，在医疗与安全场景后果严重。本方案采用全本地、确定性的处理：以图库标签与同义词构成的 737 词索引做词表贪心预分词，整体图复合词从原文整词切出；对"甲不甲"正反问在否定合并前折叠为功能词，杜绝"不、不要、不是"等否定图假阳性；否定复合词（不开心）整体匹配，防止正面词误出；再经五级匹配与语义域消歧得到最终图符序列。相对依赖通用分词或在线大模型的方案，本方案零网络、零模型成本、毫秒级返回，健康语料不出设备。最终内容词召回率 100%、出图精度 100%、匹配成功率 0.966。')

    item(doc, '3. 图库高语义透明度设计')
    body(doc, '图符的可用性取决于语义透明度，患者须看到即懂。系统以开源 ARASAAC 图符库为基础，**自建面向失语症高频场景的核心词集（20 词）并纳入分级词板**，形成"基础图库＋自建核心词"的图库体系；坚持整体图优先，头疼、吃药、张嘴等复合概念一律以整体图计；图符以标签与同义词双向闭环组织，保证词图互查；配语义域、排除词、可接受替代图三类元数据自动消歧。相对直接搬运通用图库的方案，本系统图库与评估集自动三层核对（无缺口、无断链、词形闭环），覆盖 14 个日常场景、310 个图符，图库缺口为 0。')

    item(doc, '4. 分级界面自适应切换')
    body(doc, '失语症患者病情程度差异大，单一界面难以适配所有人。系统提供轻、中、重三档自选档案，程度作用于说、听、康复三项功能的内容与展示：重度表达板仅保留核心刚需词，中度词板扩充至 20 词并纳入你好、再见、对不起、辛苦等高频礼貌词，接收侧按程度调整内容词优先级。相对固定词板方案，本系统由同一份程度档案驱动接收、表达、康复三端，保证三端数据一致。')

    item(doc, '5. 小程序性能优化')
    body(doc, '微信小程序内存与首包体积受限。系统将图库种子数据一次性载入内存，词表索引预构建为常数时间查询，词表贪心预分词为线性复杂度，单句毫秒级完成；输出图符去重、结果可缓存复用。评估工具与线上共用同一匹配器，85 句全量评估毫秒级完成，召回、精度、反转违反、反作弊等指标均可数秒复现，保证优化可回归、可复现。')

    item(doc, '6. 离线可用方案')
    body(doc, '医院病房与家庭网络常不稳定，沟通工具必须断网可用。全部结构化数据（310 图符、737 词词表、分级词板）本地内置，匹配逻辑纯本地、零网络依赖、零外部模型调用；图符图片为可寻址静态资源，可缓存并随包发布，支持离线降级；健康场景语料不出设备。相对云端推理方案，本系统离线可用、成本低、隐私友好。')

    # =====（二）主要技术指标 =====
    section(doc, '（二）主要技术指标')

    body(doc, '表 1 主要技术指标总表')
    table_rows = [
        ('图库规模', '310 个高语义透明度图符', 'ARASAAC 基础图库＋自建核心词，覆盖 14 个日常高频场景'),
        ('词表检索索引', '737 词', '标签与同义词双向索引，常数时间查询'),
        ('评估集', '85 句，14 场景，5 类句式', '问候、饮食、症状医疗、情绪、沟通修复等'),
        ('内容词召回率', '100%（147 比 147）', '接收侧核心指标'),
        ('出图精度', '100%（147 比 147）', '输出图符全部命中期望'),
        ('否定反转与假阳性违反', '0 处', '语义反转与假阳性归零'),
        ('匹配成功率', '0.966', '全程可复现'),
        ('图库缺口', '0 个', '无断链、无缺词'),
        ('场景达标率', '14 比 14，100%', '全部场景召回与精度均达 100%'),
        ('整句单词反作弊命中', '0', '防"整句合成一词"式作弊提分'),
        ('匹配时延', '毫秒级', '本地零网络调用'),
    ]
    make_table(doc, table_rows, (3.6, 4.6, 7.4), ('指标', '数值', '说明'))

    para(doc, '', after=4)

    body(doc, '表 2 指标定义与计算方法')
    def_rows = [
        ('内容词召回率', 'R = H ÷ D × 100%', 'D 为计分项总数，即评估集中角色为内容词且已标注图符的期望词数，复合概念按整体图优先计 1 项；H 为命中数，即输出图符集合（按编号去重）包含期望词主图符编号或任一可接受替代图编号的期望词数。', '147 比 147，100%'),
        ('出图精度', 'P = H ÷ M × 100%', 'H 为命中数，同召回率分子，含可接受替代图命中；M 为匹配器实际输出图符总数，按编号去重。', '147 比 147，100%'),
        ('否定反转与假阳性违反数', '累计计数', '输出图符集合命中该句语义禁止图的累计次数，如把"饿不饿"误出为"不"。', '4 处降为 0'),
        ('匹配成功率', 'Rm = C ÷ N × 100%', 'C 为匹配成功的分词单元数；N 为参与匹配的分词单元总数（经贪心分词、正反问折叠、否定合并、功能词剔除等预处理后）。', '0.897 提升至 0.966'),
        ('整句单词反作弊命中数', '计数', '计分项不少于 2 的句子，若整句被合并为单个分词单元一次匹配，计 1 次并剔除；合法短句不计。', '0'),
        ('图库缺口数', '计数', '评估集中角色为内容词但未标注图符（有词无图）的期望词数。', '15 个降至 0'),
        ('关键词与图符三层核对', '通过率', '无缺口（内容词 100% 有图）、无断链（引用图符 100% 在库）、词形闭环（期望词被图符标签与同义词覆盖）。', '三项均 100%'),
        ('场景达标率', '达标场景数 ÷ 总场景数', '场景召回率与精度均达 100% 即达标。', '14 比 14，100%'),
        ('规模类指标', '图库 310 图符；词表 737 词；评估集 85 句', '规模类非比率指标。', '达到设计规模'),
        ('匹配时延', '单句本地匹配耗时', '毫秒级，零网络调用。', '毫秒级'),
    ]
    make_table(doc, def_rows, (3.4, 3.6, 7.6, 2.6), ('指标', '计算公式', '定义与口径', '当前数值'))

    para(doc, '', after=4)
    body(doc, '口径要点：整体图优先，复合概念（头疼、吃药、张嘴、救护车）按整体图计 1 项，不以拆分词凑数；可接受替代图计入命中，语义歧义但可接受者不算误出；输出按图符编号去重后计算输出总数并判定命中；反作弊仅在计分项不少于 2 的句子生效；每次改动全量回归并逐条对比，指标只升不降。')

    out = 'docs/技术关键与主要技术指标.docx'
    doc.save(out)
    print('saved:', out)

if __name__ == '__main__':
    main()
