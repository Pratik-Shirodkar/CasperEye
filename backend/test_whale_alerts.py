#!/usr/bin/env python3
"""
Quick test script for whale alerts
Run: python backend/test_whale_alerts.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 60)
print("🐋 WHALE ALERTS TEST")
print("=" * 60)

# Test 1: Check environment
print("\n1️⃣  Checking environment...")
sns_arn = os.getenv('SNS_TOPIC_ARN')
threshold = os.getenv('WHALE_ALERT_THRESHOLD_BTC', '10')
aws_region = os.getenv('AWS_REGION', 'us-east-1')

print(f"   SNS_TOPIC_ARN: {sns_arn if sns_arn else '❌ NOT SET'}")
print(f"   WHALE_ALERT_THRESHOLD_BTC: {threshold}")
print(f"   AWS_REGION: {aws_region}")

# Test 2: Check boto3
print("\n2️⃣  Checking boto3...")
try:
    import boto3
    print("   ✅ boto3 installed")
except ImportError:
    print("   ❌ boto3 not installed")
    print("   Run: pip install boto3")
    sys.exit(1)

# Test 3: Check AWS credentials
print("\n3️⃣  Checking AWS credentials...")
try:
    sts = boto3.client('sts', region_name=aws_region)
    identity = sts.get_caller_identity()
    print(f"   ✅ AWS credentials found")
    print(f"   Account: {identity['Account']}")
except Exception as e:
    print(f"   ⚠️  AWS credentials not configured: {e}")
    print("   Run: aws configure")

# Test 4: Initialize whale alert service
print("\n4️⃣  Initializing WhaleAlertService...")
try:
    from whale_alerts import WhaleAlertService
    service = WhaleAlertService()
    print(f"   ✅ Service initialized")
    print(f"   Enabled: {service.enabled}")
except Exception as e:
    print(f"   ❌ Failed to initialize: {e}")
    sys.exit(1)

# Test 5: Test alert (if SNS configured)
print("\n5️⃣  Testing alert...")
if service.enabled:
    try:
        service.send_alert(15.5, 'bc1q_test_address', 'Test Provider')
        print("   ✅ Alert sent successfully!")
        print("   Check your email for the notification")
    except Exception as e:
        print(f"   ❌ Failed to send alert: {e}")
else:
    print("   ⚠️  SNS not configured, skipping alert test")
    print("   To enable:")
    print("   1. Create SNS topic: aws sns create-topic --name WhaleAlerts")
    print("   2. Set SNS_TOPIC_ARN in .env")
    print("   3. Subscribe email: aws sns subscribe --topic-arn <ARN> --protocol email --notification-endpoint <email>")

print("\n" + "=" * 60)
print("✅ Test complete!")
print("=" * 60)
