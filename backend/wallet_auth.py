"""
Wallet-based authentication using EIP-191 signatures.
Users sign a message with their wallet to authenticate.
"""

import jwt
import os
import time
from datetime import datetime, timedelta
from typing import Optional, Dict
from eth_account.messages import encode_defunct
from eth_account import Account

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Message to sign (users sign this to prove wallet ownership)
SIGN_MESSAGE = "Sign this message to authenticate with SatoshisEye\nTimestamp: {timestamp}"


def generate_sign_message(timestamp: int) -> str:
    """Generate the message for users to sign"""
    return SIGN_MESSAGE.format(timestamp=timestamp)


def create_jwt_token(wallet_address: str) -> str:
    """Create a JWT token for an authenticated wallet"""
    payload = {
        'wallet_address': wallet_address.lower(),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_jwt_token(token: str) -> Optional[Dict]:
    """Verify a JWT token and return the payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_signature(wallet_address: str, message: str, signature: str) -> bool:
    """
    Verify that a signature was created by the wallet address for the given message.
    Uses EIP-191 standard (personal_sign).
    """
    try:
        print(f"[VERIFY] Starting verification for {wallet_address[:10]}...")
        print(f"[VERIFY] Message: {message[:50]}...")
        print(f"[VERIFY] Signature: {signature[:20]}...")
        
        # Encode the message using EIP-191 standard
        message_hash = encode_defunct(text=message)
        print(f"[VERIFY] Message hash created")
        
        # Recover the address from the signature
        recovered_address = Account.recover_message(message_hash, signature=signature)
        print(f"[VERIFY] Recovered address: {recovered_address}")
        print(f"[VERIFY] Expected address: {wallet_address}")
        
        # Compare addresses (case-insensitive)
        match = recovered_address.lower() == wallet_address.lower()
        print(f"[VERIFY] Match result: {match}")
        return match
    except Exception as e:
        print(f"[VERIFY] Signature verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def extract_token_from_header(auth_header: str) -> Optional[str]:
    """Extract JWT token from Authorization header"""
    if not auth_header:
        return None
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]
