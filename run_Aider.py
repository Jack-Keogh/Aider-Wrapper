import os
import subprocess
import sys

# Add local bin to path dynamically
local_bin = os.path.expanduser(r"~\.local\bin")
os.environ["PATH"] = local_bin + os.pathsep + os.environ["PATH"]

# Aider command arguments
cmd = [
    "aider",
    "--model", "openai/qwen2.5-coder-14b-instruct",
    "--openai-api-base", "http://localhost:1234/v1",
    "--openai-api-key", "lm-studio"
]

print("Starting Aider with local Qwen 14B...")
try:
    subprocess.run(cmd, check=True)
except FileNotFoundError:
    print("Error: Aider is not found. Make sure it's installed via pip.")
except subprocess.CalledProcessError as e:
    print(f"Aider exited with error code {e.returncode}")