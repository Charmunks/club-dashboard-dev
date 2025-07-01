#!/usr/bin/env python3
"""
Database initialization script for Docker deployment
"""

import os
import sys
from datetime import datetime, timezone

# Add the current directory to the Python path
sys.path.insert(0, '/app')

from main import app, db, User
from werkzeug.security import generate_password_hash

def init_database():
    """Initialize the database with tables and test data"""
    print("🔧 Initializing database...")
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Check if admin user exists
            admin_user = User.query.filter_by(email='admin@hackclub.local').first()
            if not admin_user:
                # Create admin user
                admin_user = User(
                    username='admin',
                    email='admin@hackclub.local',
                    first_name='Admin',
                    last_name='User',
                    is_admin=True,
                    created_at=datetime.now(timezone.utc)
                )
                admin_user.set_password('AdminPass123!')
                db.session.add(admin_user)
                
                # Create test user
                test_user = User(
                    username='testuser',
                    email='test@hackclub.local',
                    first_name='Test',
                    last_name='User',
                    is_admin=False,
                    created_at=datetime.now(timezone.utc)
                )
                test_user.set_password('TestPass123!')
                db.session.add(test_user)
                
                db.session.commit()
                print("✅ Test users created:")
                print("   Admin: admin@hackclub.local / AdminPass123!")
                print("   User:  test@hackclub.local / TestPass123!")
            else:
                print("ℹ️  Database already initialized")
                
        except Exception as e:
            print(f"❌ Error initializing database: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    init_database()
