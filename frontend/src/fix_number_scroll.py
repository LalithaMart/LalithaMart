import re
import glob

def fix_inputs(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all <input type="number" and replace with <input type="number" onWheel={(e) => e.target.blur()}
    # Only if not already present
    if 'onWheel={(e) => e.target.blur()}' not in content:
        content = re.sub(
            r'<input\s+type="number"',
            r'<input type="number" onWheel={(e) => e.target.blur()}',
            content
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

for file in glob.glob('e:/Lalitha Mart/frontend/src/pages/**/*.jsx', recursive=True):
    fix_inputs(file)
