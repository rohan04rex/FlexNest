import os
import mysql.connector
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
from dotenv import load_dotenv
import jwt
from openai import OpenAI
from fuzzywuzzy import process

load_dotenv()

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME")
    )

def get_user_from_token(authorization: str):
    if not authorization: return None
    try:
        token = authorization.split(" ")[1]
        return jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
    except: return None

# --- Local AI Fallback Data ---
FAQ_DATA = {
    "shipping": "🚚 Standard delivery takes 3-5 business days. Free shipping on orders over $100!",
    "returns": "🔄 30-day hassle-free returns. Ensure items are in original condition.",
    "payment": "💳 We accept Credit Cards, PayPal, and Cash on Delivery.",
    "contact": "📞 Reach us at support@flexnest.com or 1-800-FLEXNEST.",
    "about": "FlexNest is your premium destination for modern style and comfort."
}

def local_chat_fallback(msg, user, conn):
    msg = msg.lower()
    cursor = conn.cursor(dictionary=True)
    
    # 1. Fuzzy FAQ Match
    best_match, score = process.extractOne(msg, list(FAQ_DATA.keys()))
    if score > 70:
        return FAQ_DATA[best_match]

    # 2. Order Tracking
    if "order" in msg or "track" in msg:
        if not user: return "Please log in to track your orders! 🔐"
        cursor.execute("SELECT id, status FROM orders WHERE user_id = %s ORDER BY date DESC LIMIT 1", (user['id'],))
        order = cursor.fetchone()
        if order: return f"Your latest order #ORD-{order['id']} is currently {order['status']}. 📦"
        return "I couldn't find any orders in your history."

    # 3. Suggestions
    if "suggest" in msg or "recommend" in msg:
        cursor.execute("SELECT name, price FROM products WHERE status = 'Available' ORDER BY RAND() LIMIT 2")
        items = cursor.fetchall()
        return "Check these out: " + ", ".join([f"{i['name']} (${i['price']})" for i in items]) + " 🔥"

    return "I'm currently in basic mode. Try asking about 'shipping', 'returns', or 'orders'!"

# --- Recommendation System ---
@app.get("/recommendations")
def get_recommendations(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user: return [] 

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get ALL available products
        cursor.execute("SELECT * FROM products WHERE status = 'Available'")
        all_products = cursor.fetchall()
        
        # 2. Get User History (Orders + Cart)
        cursor.execute("""
            SELECT p.id, p.gender, p.subcategory, p.brand FROM products p 
            WHERE p.id IN (
                SELECT product_id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.user_id = %s
                UNION SELECT product_id FROM cart WHERE user_id = %s
            )
        """, (user['id'], user['id']))
        history = cursor.fetchall()

        if not all_products: return []
        
        # Track IDs to exclude (don't recommend what they already have)
        exclude_ids = [h['id'] for h in history]

        if not history:
            # New user: return random mix of available products
            import random
            return random.sample(all_products, min(len(all_products), 6))

        # 3. Calculate Scores
        df = pd.DataFrame(history)
        pref_g = df['gender'].value_counts().index.tolist()
        pref_s = df['subcategory'].value_counts().index.tolist()
        
        scored = []
        for p in all_products:
            if p['id'] in exclude_ids: continue # SKIP items already owned/in-cart
            
            score = 0
            if p['gender'] in pref_g: score += 10
            if p['subcategory'] in pref_s: score += 5
            
            # Add a tiny bit of "newness" and "randomness" to break ties
            import random
            p['ai_score'] = score + (p['id'] * 0.001) + random.uniform(0, 0.1)
            scored.append(p)

        # 4. Sort and Return
        scored.sort(key=lambda x: x['ai_score'], reverse=True)
        return scored[:6]
    finally:
        cursor.close()
        conn.close()

# --- Chatbot Endpoint ---
class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    conn = get_db_connection()
    
    try:
        # Try OpenAI First
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT name, price FROM products WHERE status = 'Available' LIMIT 5")
        prods = cursor.fetchall()
        prod_list = ", ".join([f"{p['name']} (${p['price']})" for p in prods])

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"You are FlexNest AI. User: {user['email'] if user else 'Guest'}. Items: {prod_list}"},
                {"role": "user", "content": req.message}
            ],
            max_tokens=150
        )
        return {"reply": response.choices[0].message.content}

    except Exception as e:
        print(f"OpenAI Error (Quota/Key): {e}")
        # FALLBACK to Local AI
        reply = local_chat_fallback(req.message, user, conn)
        return {"reply": reply}
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
