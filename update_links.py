import os

files = ['index.html', 'about.html', 'menu.html']
for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('visionxsystems-logo.svg', 'visionxsystems-logo.png')
    content = content.replace('href="https://visionxsystems.com"', 'href="https://visionxsys.com"')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
