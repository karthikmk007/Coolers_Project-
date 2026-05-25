#!/usr/bin/env bash
# ============================================================
#  CRACKED — ML API startup script
#  Runs the FastAPI recommendation engine on port 8000.
#
#  Before first run:
#    1. Apply migration in Supabase Dashboard SQL Editor:
#       supabase/migrations/002_add_pgvector.sql
#
#    2. Generate + store embeddings (one-time, ~2 min for 482 products):
#       python3 scripts/embed.py
#
#  Then run this script:
#    chmod +x start_ml.sh && ./start_ml.sh
# ============================================================

set -e
cd "$(dirname "$0")"

echo "▶ Starting CRACKED Flavour API …"
python3 -m uvicorn api.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level info
