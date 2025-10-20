#!/usr/bin/env python3
"""
Simple script to check if API keys are properly configured
"""

import os
from dotenv import load_dotenv


def check_api_keys():
    """Check if API keys are properly loaded"""
    print("🔍 Checking API key configuration...")

    # Load environment variables
    load_dotenv()

    # Check each API key
    youtube_key = os.getenv("YOUTUBE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY")

    print(f"📺 YouTube API Key: {'✓ Loaded' if youtube_key else '✗ Missing'}")
    print(f"🤖 OpenAI API Key: {'✓ Loaded' if openai_key else '✗ Missing'}")
    print(f"🗺️  Google Maps API Key: {'✓ Loaded' if google_maps_key else '✗ Missing'}")

    if not openai_key:
        print("\n❌ OpenAI API key is missing!")
        print("Please create a .env file with your OpenAI API key:")
        print("OPENAI_API_KEY=your_api_key_here")
        return False

    # Test OpenAI API key with a simple request
    try:
        from openai import OpenAI

        client = OpenAI(api_key=openai_key)

        print("\n🧪 Testing OpenAI API connection...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10,
        )

        if response.choices and response.choices[0].message.content:
            print("✅ OpenAI API connection successful!")
            return True
        else:
            print("❌ OpenAI API returned empty response")
            return False

    except Exception as e:
        print(f"❌ OpenAI API test failed: {e}")
        return False


if __name__ == "__main__":
    success = check_api_keys()
    if not success:
        print("\n💡 Make sure to:")
        print("1. Create a .env file in the project root")
        print("2. Add your OpenAI API key: OPENAI_API_KEY=your_key_here")
        print("3. Get your API key from: https://platform.openai.com/api-keys")

