#!/usr/bin/env python3
"""
Phase 3 Testing Script
Tests batch analysis and async job processing
"""
import requests
import time
import json
from io import BytesIO
from PIL import Image

API_URL = "http://localhost:8001/api"

def create_test_image():
    """Create a simple test image"""
    img = Image.new('RGB', (100, 100), color='red')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer

def create_test_text():
    """Create test text content"""
    return BytesIO(b"This is a test message. Please verify your bank account within 24 hours or it will be blocked. Click here to update KYC.")

def test_single_analysis():
    """Test 1: Single analysis endpoint"""
    print("\n🧪 TEST 1: Single Analysis")
    print("-" * 50)
    
    files = {'file': ('test.png', create_test_image(), 'image/png')}
    data = {'input_type': 'file'}
    
    response = requests.post(f"{API_URL}/analyze", files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Single analysis SUCCESS")
        print(f"   Report ID: {result.get('report_id', 'N/A')}")
        print(f"   Risk Level: {result.get('scam_assessment', {}).get('risk_level', 'N/A')}")
        return True
    else:
        print(f"❌ Single analysis FAILED: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_cache_hit():
    """Test 2: Cache hit on duplicate content"""
    print("\n🧪 TEST 2: Cache Hit (Duplicate Analysis)")
    print("-" * 50)
    
    # Same content as test 1
    files = {'file': ('test.png', create_test_image(), 'image/png')}
    data = {'input_type': 'file'}
    
    start = time.time()
    response = requests.post(f"{API_URL}/analyze", files=files, data=data)
    elapsed = time.time() - start
    
    if response.status_code == 200:
        print(f"✅ Cache hit SUCCESS")
        print(f"   Response time: {elapsed:.2f}s (should be <1s for cached)")
        if elapsed < 1.0:
            print(f"   🚀 CACHED - Instant response!")
            return True
        else:
            print(f"   ⚠️  Slow response - cache may not be working")
            return False
    else:
        print(f"❌ Cache test FAILED: {response.status_code}")
        return False

def test_batch_analysis():
    """Test 3: Batch analysis with multiple files"""
    print("\n🧪 TEST 3: Batch Analysis (Multiple Files)")
    print("-" * 50)
    
    # Create multiple test files
    files = [
        ('files', ('test1.png', create_test_image(), 'image/png')),
        ('files', ('test2.png', create_test_image(), 'image/png')),
        ('files', ('test3.txt', create_test_text(), 'text/plain')),
    ]
    
    response = requests.post(f"{API_URL}/analyze/batch", files=files)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Batch analysis SUCCESS")
        print(f"   Batch ID: {result.get('batch_id', 'N/A')}")
        print(f"   Total files: {result.get('total_files', 0)}")
        print(f"   Completed: {result.get('summary', {}).get('completed', 0)}")
        print(f"   Processing: {result.get('summary', {}).get('processing', 0)}")
        print(f"   Cached: {result.get('summary', {}).get('cached', 0)}")
        print(f"   Failed: {result.get('summary', {}).get('failed', 0)}")
        
        # Show individual results
        for idx, res in enumerate(result.get('results', [])):
            status = res.get('status', 'unknown')
            filename = res.get('filename', 'unknown')
            print(f"   File {idx+1}: {filename} - {status.upper()}")
        
        return result.get('summary', {}).get('completed', 0) > 0
    else:
        print(f"❌ Batch analysis FAILED: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_analytics():
    """Test 4: Analytics endpoint"""
    print("\n🧪 TEST 4: Analytics Summary")
    print("-" * 50)
    
    response = requests.get(f"{API_URL}/analytics/summary")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Analytics SUCCESS")
        print(f"   Total analyses: {result.get('total_analyses', 0)}")
        print(f"   Recent (24h): {result.get('recent_24h', 0)}")
        print(f"   High risk: {result.get('risk_breakdown', {}).get('high', 0)}")
        print(f"   Medium risk: {result.get('risk_breakdown', {}).get('medium', 0)}")
        print(f"   Low risk: {result.get('risk_breakdown', {}).get('low', 0)}")
        print(f"   Cache hit rate: {result.get('cache_stats', {}).get('hit_rate', 0)}%")
        return True
    else:
        print(f"❌ Analytics FAILED: {response.status_code}")
        return False

def test_history():
    """Test 5: History endpoint"""
    print("\n🧪 TEST 5: Analysis History")
    print("-" * 50)
    
    response = requests.get(f"{API_URL}/history?limit=5")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ History SUCCESS")
        print(f"   Total reports: {result.get('total', 0)}")
        print(f"   Retrieved: {len(result.get('reports', []))}")
        return True
    else:
        print(f"❌ History FAILED: {response.status_code}")
        return False

def main():
    print("\n" + "="*50)
    print("🚀 PHASE 3 - COMPREHENSIVE TESTING")
    print("="*50)
    
    # Check health first
    print("\n🏥 Checking system health...")
    health = requests.get(f"{API_URL}/health").json()
    print(f"Status: {health.get('status')}")
    print(f"MongoDB: {health.get('mongodb')}")
    print(f"Cache: {health.get('cache')}")
    print(f"Celery: {health.get('celery')}")
    print(f"Version: {health.get('version')}")
    
    if health.get('cache') != 'connected':
        print("\n⚠️  WARNING: Cache not connected!")
    
    if health.get('celery') != 'connected':
        print("\n⚠️  WARNING: Celery not connected!")
    
    # Run tests
    results = {
        'single_analysis': test_single_analysis(),
        'cache_hit': test_cache_hit(),
        'batch_analysis': test_batch_analysis(),
        'analytics': test_analytics(),
        'history': test_history(),
    }
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_status in results.items():
        status = "✅ PASS" if passed_status else "❌ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed ({(passed/total*100):.0f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - Phase 3 is 100% COMPLETE!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
