#!/usr/bin/env bash
set -e

echo "=== Running PWA Audioguide Automated Test Suite ==="

echo "1/6 Testing YAML Configuration Schemas..."
node tests/test-config.js

echo "2/6 Testing Markdown Parsing & Touch-Swipe Carousel Engine..."
node tests/test-carousel.js

echo "3/6 Testing Dual-Source Audio Player Controller..."
node tests/test-player.js

echo "4/6 Testing Service Worker HTTP Range 206 & Tour Preloader..."
node tests/test-service-worker.js

echo "5/6 Testing UI View Navigation & Application State..."
node tests/test-app-flow.js

echo "6/6 Testing Mock Content, Test Images & Dual-Format Audio..."
node tests/test-mock-assets.js

echo "==================================================="
echo "✓ ALL 6 TEST SUITES PASSED SUCCESSFULLY (100% GREEN)"
echo "==================================================="
