#!/usr/bin/env python3
"""
Test script for translation API
Run this after starting the backend server
"""

import requests

API_URL = "http://127.0.0.1:8000"

def test_translation():
    # Test Tamil translation
    response = requests.post(f"{API_URL}/translate", json={
        "texts": ["Hello World", "Dashboard", "Health Dashboard"],
        "target_lang": "ta"
    })
    print("Tamil Translation:")
    print(response.json())
    print()
    
    # Test Hindi translation
    response = requests.post(f"{API_URL}/translate", json={
        "texts": ["Hello World", "Dashboard", "Health Dashboard"],
        "target_lang": "hi"
    })
    print("Hindi Translation:")
    print(response.json())

if __name__ == "__main__":
    try:
        test_translation()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the backend server is running on http://127.0.0.1:8000")
