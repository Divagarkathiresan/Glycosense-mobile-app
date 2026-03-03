import os
import base64
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()

# Get sandbox info
endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Sandbox.json"
request = urllib.request.Request(endpoint, method="GET")
auth_value = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("utf-8")
request.add_header("Authorization", f"Basic {auth_value}")

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))
        print("=== TWILIO WHATSAPP SANDBOX INFO ===\n")
        print(f"Sandbox Number: {data.get('phone_number', 'N/A')}")
        print(f"Join Code: {data.get('pin', 'N/A')}")
        print(f"\nTo join, send this message to {data.get('phone_number', '+1 415 523 8886')}:")
        print(f"  join {data.get('pin', 'your-code')}")
        print(f"\nFull Response:")
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    try:
        print(e.read().decode('utf-8'))
    except:
        pass
except Exception as e:
    print(f"Error: {e}")
