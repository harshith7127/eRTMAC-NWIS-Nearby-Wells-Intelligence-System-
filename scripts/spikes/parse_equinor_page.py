import re
import html

source_file = r'C:\Users\pramo\.gemini\antigravity-ide\brain\4e12e941-9910-45ea-a022-b755a0ac248d\.system_generated\steps\959\content.md'
with open(source_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Clean tags to see paragraphs
print("=== HEADINGS & PARAGRAPHS ===")
for p in re.findall(r'<(?:p|h1|h2|h3|li)[^>]*>(.*?)</(?:p|h1|h2|h3|li)>', content, re.DOTALL):
    clean = re.sub(r'<[^>]+>', ' ', p).strip()
    clean = html.unescape(clean)
    clean = ' '.join(clean.split())
    if len(clean) > 20 and not clean.startswith('Copyright'):
        print("-", clean[:120])

print("\n=== LINKS ===")
for m in re.finditer(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', content, re.DOTALL):
    href, link_text = m.groups()
    clean_text = re.sub(r'<[^>]+>', '', link_text).strip()
    clean_text = html.unescape(clean_text)
    clean_text = ' '.join(clean_text.split())
    if any(k in href.lower() or k in clean_text.lower() for k in ['data', 'download', 'databricks', 'azure', 'marketplace', 'village', 'form', 'contact', 'dataset', 'volve', 'license', 'terms']):
        print(f"{clean_text} -> {href}")
