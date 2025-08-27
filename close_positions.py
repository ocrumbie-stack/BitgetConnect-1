#!/usr/bin/env python3
"""
Script to close all open positions via direct API call to the server.
This bypasses any routing issues and directly closes positions.
"""

import requests
import json

def close_all_positions():
    """Close all open positions by calling the server endpoints."""
    
    # List of positions to close based on the console logs
    positions_to_close = [
        {"symbol": "BTCUSDT", "side": "short"},
        {"symbol": "LTCUSDT", "side": "long"}
    ]
    
    base_url = "http://localhost:5000"
    
    print("🚀 Starting position closure process...")
    
    for position in positions_to_close:
        try:
            print(f"📋 Closing {position['symbol']} {position['side']} position...")
            
            # Try the position close endpoint
            response = requests.post(
                f"{base_url}/api/positions/close",
                json=position,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                print(f"✅ Successfully closed {position['symbol']} {position['side']}")
                print(f"Response: {response.json()}")
            else:
                print(f"⚠️ Failed to close {position['symbol']}: {response.status_code}")
                print(f"Error: {response.text[:200]}")
                
                # Try alternative endpoint
                alt_response = requests.post(
                    f"{base_url}/api/close-position",
                    json=position,
                    headers={'Content-Type': 'application/json'}
                )
                
                if alt_response.status_code == 200:
                    print(f"✅ Alternative endpoint worked for {position['symbol']}")
                else:
                    print(f"❌ Both endpoints failed for {position['symbol']}")
                    
        except Exception as e:
            print(f"💥 Exception closing {position['symbol']}: {e}")
    
    # Check final bot status
    try:
        print("\n🔍 Checking final bot status...")
        bot_response = requests.get(f"{base_url}/api/bot-executions")
        if bot_response.status_code == 200:
            bots = bot_response.json()
            active_bots = [bot for bot in bots if bot.get('status') == 'active']
            print(f"📊 Active bots remaining: {len(active_bots)}")
            
            if len(active_bots) == 0:
                print("🎉 SUCCESS: All bots terminated!")
            else:
                print(f"⚠️ Still have {len(active_bots)} active bots")
                for bot in active_bots[:3]:  # Show first 3
                    print(f"  - {bot.get('tradingPair')} ({bot.get('botName', 'Unknown')})")
        
    except Exception as e:
        print(f"💥 Failed to check bot status: {e}")

if __name__ == "__main__":
    close_all_positions()