import os
import zipfile

output_zip = 'public/safar-gafargaon-latest.zip'
exclude_dirs = {'node_modules', '.git', 'dist', '.aistudio', 'dev-dist'}
exclude_extensions = {'.zip'}

print("Creating clean zip archive...")

if os.path.exists(output_zip):
    try:
        os.remove(output_zip)
    except Exception:
        pass

count = 0
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        # Modify dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
        for file in files:
            if any(file.endswith(ext) for ext in exclude_extensions):
                continue
            full_path = os.path.join(root, file)
            arcname = os.path.relpath(full_path, '.')
            zf.write(full_path, arcname)
            count += 1

size_kb = os.path.getsize(output_zip) / 1024
print(f"Archive successfully created: {output_zip} ({size_kb:.1f} KB, {count} files)")
