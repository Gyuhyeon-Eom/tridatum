"""Original geometric wordmark, with shared letter spacing and round joins."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
letters='''<g fill="none" stroke="currentColor" stroke-width="7.5" stroke-linecap="square" stroke-linejoin="round"><path d="M14 9v33q0 13 13 13h3M4 25h27"/><path d="M45 55V26m0 13q0-14 18-14h2"/><path d="M80 27v28"/><path d="M128 9v46m0-15c0-21-32-21-32 0s32 21 32 0"/><path d="M176 26v29m0-15c0-21-32-21-32 0s32 21 32 0"/><path d="M201 9v33q0 13 13 13h3M191 25h27"/><path d="M234 26v16c0 19 30 19 30 0V26m0 16v13"/><path d="M284 55V26m0 12c0-18 24-18 24 0v17m0-17c0-18 24-18 24 0v17"/></g><circle class="brand-point" cx="80" cy="10" r="4.6" fill="#81b6a3"/>'''
symbol='''<g fill="none" stroke="currentColor" stroke-width="6.8" stroke-linecap="square" stroke-linejoin="round"><path d="M17 14v30q0 11 10 11h2M9 28h23"/><path d="M56 14v41m0-15c0-19-26-19-26 0s26 19 26 0"/></g>'''
word=f'<svg class="brand-wordmark" viewBox="0 0 340 68" aria-hidden="true">{letters}</svg>'
mark=f'<svg class="brand-monogram" viewBox="0 0 68 68" aria-hidden="true">{symbol}</svg>'
for name,color in [('dark','#17352a'),('light','#eaf1ee')]:
 (ROOT/f'assets/img/logo-{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 68" color="{color}" role="img" aria-label="Tridatum">{letters}</svg>')
(ROOT/'assets/img/logo-symbol.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68" color="#17352a">{symbol}</svg>')
(ROOT/'assets/img/logo-mark.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="18" fill="#17352a"/><g transform="translate(6 6)" color="#eaf1ee">{symbol}</g></svg>')
(ROOT/'assets/js/brand.mjs').write_text('export const WORDMARK = '+repr(word)+';\nexport const MONOGRAM = '+repr(mark)+';\n')
p=ROOT/'partials/header.html';s=p.read_text();a=s.index('<svg');b=s.index('</a>',a);s=s[:a]+word+'\n    '+s[b:];p.write_text(s)
p=ROOT/'partials/footer.html';s=p.read_text();a=s.index('<a class="footer-brand"');b=s.index('</a',a);s=s[:a]+'<a class="footer-brand" href="index.html" aria-label="Tridatum 홈">'+word+s[b:];p.write_text(s)
proof=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640"><rect width="1200" height="640" fill="#eeeee8"/><g transform="translate(100 95) scale(2.5)" color="#17352a">{letters}</g><path d="M80 320H1120" stroke="#d1d5d2"/><rect x="0" y="355" width="1200" height="285" fill="#17352a"/><g transform="translate(90 425) scale(1.4)" color="#eaf1ee">{letters}</g><g transform="translate(1020 430) scale(1.5)" color="#eaf1ee">{symbol}</g></svg>'
(ROOT/'assets/img/brand-study.svg').write_text(proof)
print('Built custom wordmark, td monogram and public chrome.')
