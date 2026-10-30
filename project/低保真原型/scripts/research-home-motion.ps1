$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$target=Join-Path $PSScriptRoot '../../参考调研_20261019/首页动效'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach($entry in @(@{name='salesmore';url='https://salesmore.pl/'},@{name='dialedweb';url='https://www.dialedweb.com/'})) {
  $html=(Invoke-WebRequest -UseBasicParsing -Uri $entry.url -TimeoutSec 25).Content
  Set-Content -LiteralPath (Join-Path $target ($entry.name+'.html')) -Value $html -Encoding utf8
  $scripts=[regex]::Matches($html,'<script[^>]+src=["'']([^"'']+)["'']')
  $index=0
  foreach($match in $scripts) {
    $src=$match.Groups[1].Value
    if($src -notmatch 'litespeed/js|/_next/static/chunks/(app/page|app/layout|878-|63-|152-|10-|771-|219-|c15bf)'){continue}
    $uri=[uri]::new([uri]$entry.url,$src).AbsoluteUri
    try {
      $js=(Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 25).Content
      $file=$entry.name+'-'+($index++)+'.js'
      Set-Content -LiteralPath (Join-Path $target $file) -Value $js -Encoding utf8
      Write-Output ($file+' '+$uri)
      foreach($term in @('ScrollTrigger','SplitText','splitType','split-type','stagger','clipPath','clip-path','useScroll','useTransform','framer-motion','lenis')) {
        $hit=[regex]::Match($js,'.{0,100}'+[regex]::Escape($term)+'.{0,200}','IgnoreCase')
        if($hit.Success){Write-Output ($term+': '+$hit.Value)}
      }
    } catch { Write-Output ($uri+' '+$_.Exception.Message) }
  }
}

