import os
import re

files = ['index.html', 'about.html', 'menu.html']

for filename in files:
    if not os.path.exists(filename): continue
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace email
    content = content.replace('ahsansheikh786543@gmail.com', 'mrkhanburgerhouse@gmail.com')
    
    # 2. Replace timings and remove placeholder
    pattern = r'<p><i class="fa-solid fa-clock" aria-hidden="true"></i>.*?(?:12:00 PM.*?2:00 AM).*?(?:<em.*?>\(placeholder\)</em>).*?</p>'
    replacement = '<p><i class="fa-solid fa-clock" aria-hidden="true"></i> Mon - Sun: 05:00 PM - 04:00 AM</p>'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL | re.IGNORECASE)
    
    pattern2 = r'<p>Mon - Sun: 12:00 PM - 2:00 AM <em[^>]*>\(placeholder\)</em></p>'
    replacement2 = '<p>Mon - Sun: 05:00 PM - 04:00 AM</p>'
    content = re.sub(pattern2, replacement2, content, flags=re.DOTALL | re.IGNORECASE)
    
    # 3. Remove testimonials section
    test_pattern = r'<!-- ============================= Testimonials ============================= -->\s*<section class="testimonials section" id="testimonials">.*?</section>'
    content = re.sub(test_pattern, '', content, flags=re.DOTALL)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
