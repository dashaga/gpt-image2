#!/usr/bin/env python3
"""
Extract 1-second thumbnails from 20 R2 seedance videos,
upload to R2 images/seedance-covers/, and update seedance-data.json.
"""

import json
import os
import re
import subprocess
import sys
import tempfile

import boto3
from botocore.config import Config

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "seedance-data.json")

R2_ACCOUNT_ID  = "2dc4f07fc8159b16d56f859dd7f588a1"
R2_ACCESS_KEY  = "fd535ce08ab677bc4a9819b42382b681"
R2_SECRET_KEY  = "99735fac223b442c67afaf399d672bd4de8a60457622a3eda82f21e18b5a2584"
R2_BUCKET      = "gptimage2-storage"
R2_ENDPOINT    = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
R2_DOMAIN      = "https://assets.gptimage2.it.com"
COVER_PREFIX   = "images/seedance-covers"

R2_VIDEO_HOST  = "assets.gptimage2.it.com"

FFMPEG = "/opt/homebrew/bin/ffmpeg"

# ── R2 client ─────────────────────────────────────────────────────────────────
s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

def extract_frame(video_url: str, out_path: str) -> bool:
    """Use ffmpeg to grab the frame at t=1s from a remote URL."""
    cmd = [
        FFMPEG, "-y",
        "-ss", "1",           # seek to 1 second
        "-i", video_url,
        "-frames:v", "1",
        "-q:v", "3",          # JPEG quality 2-5, lower = better
        "-f", "image2",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=60)
    if result.returncode != 0:
        print(f"  ffmpeg error:\n{result.stderr.decode()[-400:]}", file=sys.stderr)
        return False
    return True

def upload_to_r2(local_path: str, r2_key: str) -> str:
    """Upload file to R2, return public URL."""
    with open(local_path, "rb") as f:
        s3.put_object(
            Bucket=R2_BUCKET,
            Key=r2_key,
            Body=f,
            ContentType="image/jpeg",
            CacheControl="public, max-age=31536000, immutable",
        )
    return f"{R2_DOMAIN}/{r2_key}"

def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    r2_items = [item for item in data if R2_VIDEO_HOST in item.get("url", "")]
    print(f"Found {len(r2_items)} R2 video(s) to process.\n")

    errors = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for idx, item in enumerate(r2_items, 1):
            video_url = item["url"]
            # derive key from video filename: abc123.mp4 → abc123.jpg
            stem = re.search(r"/([^/]+)\.mp4$", video_url)
            if not stem:
                print(f"[{idx}] SKIP — cannot parse URL: {video_url}")
                continue
            hash_name = stem.group(1)
            r2_key    = f"{COVER_PREFIX}/{hash_name}.jpg"
            cover_url = f"{R2_DOMAIN}/{r2_key}"

            print(f"[{idx}/{len(r2_items)}] {item['title']}")
            print(f"  video : {video_url}")
            print(f"  cover : {cover_url}")

            local_jpg = os.path.join(tmpdir, f"{hash_name}.jpg")

            # Extract frame
            if not extract_frame(video_url, local_jpg):
                errors.append(video_url)
                print("  ✗ ffmpeg failed, skipping.\n")
                continue

            # Upload
            try:
                upload_to_r2(local_jpg, r2_key)
                print(f"  ✓ uploaded\n")
            except Exception as e:
                errors.append(video_url)
                print(f"  ✗ upload error: {e}\n")
                continue

            # Patch cover field in-place on the original data list
            item["cover"] = cover_url

    # Write updated JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nUpdated {DATA_FILE}")

    if errors:
        print(f"\n⚠  {len(errors)} error(s):")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print(f"✓ All {len(r2_items)} covers generated and data file updated.")

if __name__ == "__main__":
    main()
