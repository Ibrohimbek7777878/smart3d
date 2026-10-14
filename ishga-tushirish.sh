#!/bin/bash
# Smart3D serverni ishga tushirish
cd "$(dirname "$0")/app"
echo "Smart3D → http://localhost:8811/"
python3 -m http.server 8811
