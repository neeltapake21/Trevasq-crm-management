import os
import sys

# Add project root to sys.path so backend package can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app

# Expose app for Vercel Serverless Function
