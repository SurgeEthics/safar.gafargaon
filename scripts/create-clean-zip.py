import os
import zipfile
import shutil

exclude_dirs = {'node_modules', '.git', '.aistudio', '.playwright-cli', 'dev-dist', 'aistudio'}
exclude_extensions = {'.zip', '.log', '.map'}

zip_names = [
    'safar-gafargaon-clean-source.zip',
    'safar-gafargaon-latest.zip',
    'safar-gafargaon-final.zip',
]

for folder in ['public', 'dist']:
    if os.path.exists(folder):
        for name in zip_names:
            target = os.path.join(folder, name)
            if os.path.exists(target):
                try:
                    os.remove(target)
                except Exception:
                    pass

output_zip = os.path.join('public', 'safar-gafargaon-clean-source.zip')
count = 0
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.') and d != 'aistudio']
        for file in files:
            if any(file.endswith(ext) for ext in exclude_extensions):
                continue
            if 'public/assets/aistudio' in root or 'assets/aistudio' in root:
                continue
            full_path = os.path.join(root, file)
            arcname = os.path.relpath(full_path, '.')
            zf.write(full_path, arcname)
            count += 1

for name in zip_names[1:]:
    shutil.copyfile(output_zip, os.path.join('public', name))

if os.path.exists('dist'):
    for name in zip_names:
        shutil.copyfile(output_zip, os.path.join('dist', name))

size_mb = os.path.getsize(output_zip) / (1024 * 1024)
print(f"Archive successfully created: {output_zip} ({size_mb:.2f} MB, {count} files)")
