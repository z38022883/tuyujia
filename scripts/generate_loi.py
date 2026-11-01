# -*- coding: utf-8 -*-
"""生成规范排版的《合作意向书》Word 文档。"""
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

OUT = r"D:\projects\tuyujia\合作意向书.docx"

SONG = "宋体"
HEI = "黑体"

doc = Document()

# ---------- 页面设置 ----------
sec = doc.sections[0]
sec.top_margin = Cm(3.0)
sec.bottom_margin = Cm(2.5)
sec.left_margin = Cm(2.8)
sec.right_margin = Cm(2.6)

# ---------- 默认样式 ----------
normal = doc.styles["Normal"]
normal.font.name = SONG
normal.font.size = Pt(14)
normal.element.rPr.rFonts.set(qn("w:eastAsia"), SONG)
normal.paragraph_format.space_before = Pt(0)
normal.paragraph_format.space_after = Pt(0)
normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE


def set_run(run, name=SONG, size=14, bold=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)


def add_para(text="", name=SONG, size=14, bold=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
             indent=True, before=0, after=0):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if indent:
        pf.first_line_indent = Pt(size * 2)
    if text:
        set_run(p.add_run(text), name=name, size=size, bold=bold)
    return p


# ---------- 标题 ----------
add_para("合作意向书", name=HEI, size=22, bold=True,
         align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, after=18)

# ---------- 双方信息 ----------
for line in ("甲方：＿＿＿＿＿＿＿＿＿＿ 公司",
             "乙方：＿＿＿＿＿＿＿＿＿＿ 学生团队 / 个人",
             "项目名称：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿"):
    add_para(line, indent=False)

add_para()

# ---------- 前言 ----------
add_para("为促进校企合作、实现优势互补，甲乙双方本着平等自愿、诚实信用、互利共赢的原则，"
         "就上述项目达成如下初步合作意向：")

# ---------- 条款 ----------
clauses = [
    "一、甲方提供：需求、指导、资源 / 经费等支持；",
    "二、乙方负责：调研、设计 / 开发、交付成果；",
    "三、合作期限：＿＿＿＿年＿＿月＿＿日至＿＿＿＿年＿＿月＿＿日；",
    "四、成果与知识产权归属：＿＿＿＿＿＿＿＿＿＿＿＿＿＿；",
    "五、双方对合作信息予以保密，未经对方书面同意，不得向第三方披露；具体权利义务以双方签订的正式协议为准。",
]
for c in clauses:
    add_para(c)

add_para()

# ---------- 结尾 ----------
add_para("本意向书自双方签字（盖章）之日起生效，一式两份，甲乙双方各执一份。")

add_para()
add_para()

# ---------- 签署栏（无边框两列表格，右对齐） ----------
table = doc.add_table(rows=1, cols=2)
table.alignment = WD_TABLE_ALIGNMENT.RIGHT
table.autofit = False

left, right = table.rows[0].cells
left.width = Cm(8.5)
right.width = Cm(8.5)

for cell, lines in ((left, ("甲方（盖章）：", "＿＿＿＿＿＿＿＿＿＿", "", "乙方（签字）：", "＿＿＿＿＿＿＿＿＿＿")),
                    (right, ("日期：", "＿＿＿＿年＿＿月＿＿日", "", "", ""))):
    cell.paragraphs[0].text = ""
    first = True
    for ln in lines:
        if first:
            p = cell.paragraphs[0]
            first = False
        else:
            p = cell.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        if ln:
            set_run(p.add_run(ln))

# 表格上方提示
add_para()

doc.core_properties.title = "合作意向书"
doc.core_properties.author = ""

doc.save(OUT)
print("saved:", OUT)
