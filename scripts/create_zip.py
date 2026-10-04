import os
import zipfile
import sys
import time

def create_project_zip():
    source_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    # Save zip in parent directory (c:\Users\mail2\Downloads\121final.zip)
    output_zip = os.path.abspath(os.path.join(source_dir, '..', '121final.zip'))
    
    print(f"Creating zip archive of: {source_dir}")
    print(f"Target destination: {output_zip}")
    
    excluded_dirs = {
        'node_modules',
        '.git',
        '__pycache__',
        '.pytest_cache',
        '.next',
        '.vscode',
        '.idea'
    }
    
    excluded_extensions = {
        '.pyc',
        '.pyo',
        '.zip'
    }

    start_time = time.time()
    file_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in excluded_extensions:
                    continue
                if file.endswith('.zip'):
                    continue
                
                file_path = os.path.join(root, file)
                # Compute relative path inside zip
                rel_path = os.path.relpath(file_path, source_dir)
                
                try:
                    file_size = os.path.getsize(file_path)
                    zipf.write(file_path, arcname=rel_path)
                    file_count += 1
                    total_uncompressed_bytes += file_size
                except Exception as e:
                    print(f"Warning: could not add {rel_path}: {e}")

    elapsed = time.time() - start_time
    zip_size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    uncomp_mb = total_uncompressed_bytes / (1024 * 1024)

    print(f"\nSuccessfully created zip archive!")
    print(f"Location: {output_zip}")
    print(f"Files archived: {file_count}")
    print(f"Uncompressed size: {uncomp_mb:.2f} MB")
    print(f"Compressed size: {zip_size_mb:.2f} MB")
    print(f"Time taken: {elapsed:.2f}s")

if __name__ == '__main__':
    create_project_zip()
