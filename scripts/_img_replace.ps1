$ErrorActionPreference = 'Stop'
$lines = [IO.File]::ReadAllLines('D:\projects\tuyujia\scripts\_img_replace_info.txt', [Text.Encoding]::UTF8)
$docPath = $lines[0]
$imgPath = $lines[1]
$caption = $lines[2]

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open($docPath)

    $f = $doc.Content.Duplicate
    $f.Find.ClearFormatting()
    if (-not $f.Find.Execute($caption)) { throw 'caption not found' }
    $capPara = $f.Duplicate
    $capPara.Expand(4) | Out-Null

    $picPara = $capPara.Previous(4, 1)
    if ($picPara.InlineShapes.Count -lt 1) { throw 'no inline shape in previous paragraph' }
    $picPara.InlineShapes.Item(1).Delete()

    $target = $picPara.Duplicate
    $target.Collapse(1)   # wdCollapseStart
    $pic = $doc.InlineShapes.AddPicture($imgPath, $false, $true, $target)
    $pic.LockAspectRatio = -1
    $pic.Width = 435
    $pic.Range.ParagraphFormat.Alignment = 1
    $pic.Range.Paragraphs.Item(1).Range.ParagraphFormat.CharacterUnitFirstLineIndent = 0
    $pic.Range.Paragraphs.Item(1).Range.ParagraphFormat.FirstLineIndent = 0

    $doc.Save()
    $doc.Close()
    Write-Host 'DONE'
} finally {
    try { $word.Quit() } catch {}
}
