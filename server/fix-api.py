#!/usr/bin/env python3
"""
API Fixes Script
Removes duplicate endpoints and adds authentication middleware
"""

import re

# Read the file
with open('index.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Original file: {len(lines)} lines")

# Step 1: Remove duplicate weather endpoint (lines 623-660, 0-indexed: 622-659)
# Step 2: Remove duplicate AI endpoints (lines 1305-1339, 0-indexed: 1304-1338)
# Step 3: Remove duplicate analytics ROI (lines 1394-1459, 0-indexed: 1393-1458)

# We need to remove from bottom to top to preserve line numbers
ranges_to_remove = [
    (1393, 1459),  # Analytics ROI duplicate
    (1304, 1340),  # AI endpoints duplicates
    (622, 661),    # Weather duplicate
]

# Remove lines (from bottom to top)
for start, end in ranges_to_remove:
    print(f"Removing lines {start+1}-{end} ({end-start} lines)")
    del lines[start:end]

print(f"After removing duplicates: {len(lines)} lines")

# Step 2: Add authMiddleware to endpoints
# Define patterns to find and replace
auth_additions = [
    # Admin endpoints
    (r"app\.post\('/api/admin/seed',\s*async", "app.post('/api/admin/seed', authMiddleware, async"),
    (r"app\.get\('/api/admin/transactions',\s*async", "app.get('/api/admin/transactions', authMiddleware, async"),
    (r"app\.delete\('/api/admin/transactions/:id',\s*async", "app.delete('/api/admin/transactions/:id', authMiddleware, async"),
    
    # Maintenance endpoints
    (r"app\.post\('/api/maintenance',\s*async", "app.post('/api/maintenance', authMiddleware, async"),
    (r"app\.put\('/api/maintenance/:id/complete',\s*async", "app.put('/api/maintenance/:id/complete', authMiddleware, async"),
    (r"app\.delete\('/api/maintenance/:id',\s*async", "app.delete('/api/maintenance/:id', authMiddleware, async"),
    
    # Units endpoints
    (r"app\.post\('/api/units',\s*async", "app.post('/api/units', authMiddleware, async"),
    (r"app\.put\('/api/units/:id',\s*async", "app.put('/api/units/:id', authMiddleware, async"),
    
    # Routes endpoints
    (r"app\.post\('/api/routes',\s*async", "app.post('/api/routes', authMiddleware, async"),
    (r"app\.put\('/api/routes/:id',\s*async", "app.put('/api/routes/:id', authMiddleware, async"),
    (r"app\.delete\('/api/routes/:id',\s*async", "app.delete('/api/routes/:id', authMiddleware, async"),
    
    # Bookings endpoints
    (r"app\.post\('/api/bookings',\s*async", "app.post('/api/bookings', authMiddleware, async"),
    (r"app\.patch\('/api/bookings/:id',\s*async", "app.patch('/api/bookings/:id', authMiddleware, async"),
    (r"app\.delete\('/api/bookings/:id',\s*async", "app.delete('/api/bookings/:id', authMiddleware, async"),
    
    # Team members endpoints
    (r"app\.post\('/api/team-members',\s*async", "app.post('/api/team-members', authMiddleware, async"),
    (r"app\.put\('/api/team-members/:id',\s*async", "app.put('/api/team-members/:id', authMiddleware, async"),
    (r"app\.delete\('/api/team-members/:id',\s*async", "app.delete('/api/team-members/:id', authMiddleware, async"),
    
    # IoT endpoint
    (r"app\.post\('/api/iot/telemetry',\s*async", "app.post('/api/iot/telemetry', authMiddleware, async"),
]

# Apply authentication additions
content = ''.join(lines)
auth_count = 0
for pattern, replacement in auth_additions:
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        auth_count += 1
        print(f"Added auth to: {pattern}")

print(f"\nAdded authentication to {auth_count} endpoints")

# Write the modified content
with open('index.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFinal file: {len(content.splitlines())} lines")
print("✅ API fixes applied successfully!")
print("\nChanges made:")
print("- Removed 3 duplicate endpoint blocks (~100 lines)")
print(f"- Added authMiddleware to {auth_count} endpoints")
print("\nPlease restart the server: npm run dev")
