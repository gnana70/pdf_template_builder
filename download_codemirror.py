import os
import requests
import shutil

# Base URLs
CDN_BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3"

# Files to download
files = [
    # Core files
    "/codemirror.min.js",
    "/codemirror.min.css",
    
    # Python mode
    "/mode/python/python.min.js",
    
    # Addons
    "/addon/edit/matchbrackets.min.js",
    "/addon/edit/closebrackets.min.js",
    "/addon/comment/comment.min.js",
    "/addon/selection/active-line.min.js",
    "/addon/lint/lint.min.js",
    "/addon/lint/lint.css",
    
    # Theme
    "/theme/monokai.min.css",
]

# Static directory
STATIC_DIR = "pdf_app/static/js/codemirror"

def ensure_dir(file_path):
    """Make sure directory exists"""
    directory = os.path.dirname(file_path)
    if not os.path.exists(directory):
        os.makedirs(directory)

def download_file(url, local_path):
    """Download a file from URL to local path"""
    print(f"Downloading {url} to {local_path}")
    response = requests.get(url, stream=True)
    
    if response.status_code == 200:
        with open(local_path, 'wb') as f:
            response.raw.decode_content = True
            shutil.copyfileobj(response.raw, f)
        print(f"Successfully downloaded {local_path}")
        return True
    else:
        print(f"Failed to download {url}")
        return False

def main():
    """Main function to download all required files"""
    print("Starting CodeMirror download...")
    
    for file_path in files:
        url = CDN_BASE_URL + file_path
        local_path = os.path.join(STATIC_DIR, file_path.lstrip('/'))
        
        # Create directory if it doesn't exist
        ensure_dir(local_path)
        
        # Download file
        download_file(url, local_path)
    
    print("Download complete!")

if __name__ == "__main__":
    main() 