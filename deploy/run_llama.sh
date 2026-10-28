#!/usr/bin/env bash
# GEETA brain for production: llama.cpp server with vision, 2 parallel slots
# (two kids can be helped at the same time; 12k context each).
set -euo pipefail
cd "$(dirname "$0")/.."
exec ./third_party/llama.cpp/llama-server \
  --model models/geeta-4b/geeta-4b-q4_k_m.gguf \
  --mmproj models/geeta-4b/mmproj-geeta-4b-v2-f16.gguf \
  --host 127.0.0.1 --port 8080 -c 24576 -np 2 -ngl 99
