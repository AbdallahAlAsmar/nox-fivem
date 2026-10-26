#!/usr/bin/env python3

import os
import subprocess
from datetime import datetime

# Check if today's report exists
TODAY = datetime.now().strftime("%Y-%m-%d")
REPORT_FILE = os.path.expanduser(f"~/nox-fivem/security-report-{TODAY}.md")

if not os.path.exists(REPORT_FILE):
    # Run the security audit script
    audit_script = os.path.expanduser("~/nox-fivem/daily-security-audit.py")
    subprocess.run(["python", audit_script], check=True)
else:
    print(f"Security report for {TODAY} already exists. Skipping audit.")