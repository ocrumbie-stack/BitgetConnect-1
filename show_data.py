#!/usr/bin/env python3
import requests
import json

try:
    response = requests.get('http://localhost:5000/api/futures')
    data = response.json()
    
    print(f"Total Bitget Perpetual Futures Pairs: {len(data)}")
    print("=" * 80)
    print(f"{'#':<3} {'Symbol':<15} {'Price (USD)':<15} {'24h Change':<12} {'Volume (24h)':<18} {'Funding Rate':<12}")
    print("=" * 80)
    
    for i, item in enumerate(data[:50], 1):  # Show first 50
        symbol = item['symbol']
        price = f"${float(item['price']):,.2f}"
        change = f"{float(item['change24h']):.2f}%"
        volume = f"${float(item['volume24h']):,.0f}"
        funding = f"{float(item['fundingRate']):.4f}%"
        
        print(f"{i:<3} {symbol:<15} {price:<15} {change:<12} {volume:<18} {funding:<12}")
    
    if len(data) > 50:
        print(f"... and {len(data) - 50} more pairs")
        
    # Show some statistics
    print("\n" + "=" * 80)
    print("MARKET STATISTICS:")
    print("=" * 80)
    
    # Sort by volume
    sorted_by_volume = sorted(data, key=lambda x: float(x['volume24h']), reverse=True)
    print("\nTop 10 by Volume:")
    for i, item in enumerate(sorted_by_volume[:10], 1):
        print(f"{i:2d}. {item['symbol']:<15} Volume: ${float(item['volume24h']):>15,.0f}")
    
    # Sort by price change
    sorted_by_change = sorted(data, key=lambda x: float(x['change24h']), reverse=True)
    print("\nTop 10 Gainers (24h):")
    for i, item in enumerate(sorted_by_change[:10], 1):
        print(f"{i:2d}. {item['symbol']:<15} Change: {float(item['change24h']):>8.2f}%")
    
    print("\nTop 10 Losers (24h):")
    sorted_by_change_desc = sorted(data, key=lambda x: float(x['change24h']))
    for i, item in enumerate(sorted_by_change_desc[:10], 1):
        print(f"{i:2d}. {item['symbol']:<15} Change: {float(item['change24h']):>8.2f}%")
        
except Exception as e:
    print(f"Error fetching data: {e}")