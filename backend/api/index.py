import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для казино: регистрация, авторизация, управление балансом, PvP ставки
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Admin-Code',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        body_data = json.loads(event.get('body', '{}')) if event.get('body') else {}
        action = body_data.get('action') or event.get('queryStringParameters', {}).get('action')
        
        if method == 'POST' and action == 'register':
            username = body_data.get('username')
            password = body_data.get('password')
            
            if not username or not password:
                return response(400, {'error': 'Заполните все поля'})
            
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cur.fetchone():
                return response(400, {'error': 'Юзернейм занят'})
            
            cur.execute("INSERT INTO users (username, password, balance) VALUES (%s, %s, 0) RETURNING id", (username, password))
            user_id = cur.fetchone()[0]
            conn.commit()
            
            return response(200, {'user_id': user_id, 'username': username, 'balance': 0})
        
        elif method == 'POST' and action == 'login':
            username = body_data.get('username')
            password = body_data.get('password')
            
            cur.execute("SELECT id, username, balance FROM users WHERE username = %s AND password = %s", (username, password))
            user = cur.fetchone()
            
            if not user:
                return response(400, {'error': 'Неверный логин или пароль'})
            
            return response(200, {'user_id': user[0], 'username': user[1], 'balance': user[2]})
        
        elif method == 'GET' and action == 'balance':
            user_id = event.get('queryStringParameters', {}).get('user_id')
            
            cur.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
            balance = cur.fetchone()
            
            if not balance:
                return response(404, {'error': 'Пользователь не найден'})
            
            return response(200, {'balance': balance[0]})
        
        elif method == 'POST' and action == 'update-balance':
            user_id = body_data.get('user_id')
            amount = body_data.get('amount')
            trans_type = body_data.get('type', 'unknown')
            description = body_data.get('description', '')
            
            cur.execute("UPDATE users SET balance = balance + %s WHERE id = %s RETURNING balance", (amount, user_id))
            new_balance = cur.fetchone()
            
            if not new_balance:
                return response(404, {'error': 'Пользователь не найден'})
            
            cur.execute("INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)", 
                       (user_id, trans_type, amount, description))
            conn.commit()
            
            return response(200, {'balance': new_balance[0]})
        
        elif method == 'GET' and action == 'transactions':
            user_id = event.get('queryStringParameters', {}).get('user_id')
            
            cur.execute("SELECT id, type, amount, description, created_at FROM transactions WHERE user_id = %s ORDER BY created_at DESC LIMIT 50", (user_id,))
            transactions = cur.fetchall()
            
            result = [{'id': t[0], 'type': t[1], 'amount': t[2], 'description': t[3], 'timestamp': int(t[4].timestamp() * 1000)} for t in transactions]
            
            return response(200, {'transactions': result})
        
        elif method == 'POST' and action == 'pvp-create':
            creator_id = body_data.get('user_id')
            amount = body_data.get('amount')
            
            cur.execute("SELECT balance FROM users WHERE id = %s", (creator_id,))
            balance = cur.fetchone()
            
            if not balance or balance[0] < amount:
                return response(400, {'error': 'Недостаточно средств'})
            
            cur.execute("INSERT INTO pvp_bets (creator_id, amount, status) VALUES (%s, %s, 'active') RETURNING id", (creator_id, amount))
            bet_id = cur.fetchone()[0]
            conn.commit()
            
            return response(200, {'bet_id': bet_id})
        
        elif method == 'GET' and action == 'pvp-list':
            cur.execute("""
                SELECT pb.id, u.username, pb.amount, pb.creator_id 
                FROM pvp_bets pb 
                JOIN users u ON pb.creator_id = u.id 
                WHERE pb.status = 'active'
                ORDER BY pb.created_at DESC
            """)
            bets = cur.fetchall()
            
            result = [{'id': b[0], 'creator': b[1], 'amount': b[2], 'creator_id': b[3]} for b in bets]
            
            return response(200, {'bets': result})
        
        elif method == 'POST' and action == 'pvp-respond':
            bet_id = body_data.get('bet_id')
            opponent_id = body_data.get('user_id')
            opponent_amount = body_data.get('amount')
            
            cur.execute("SELECT creator_id, amount FROM pvp_bets WHERE id = %s AND status = 'active'", (bet_id,))
            bet = cur.fetchone()
            
            if not bet:
                return response(404, {'error': 'Ставка не найдена'})
            
            creator_id, creator_amount = bet
            
            if creator_id == opponent_id:
                return response(400, {'error': 'Нельзя ответить на свою ставку'})
            
            cur.execute("SELECT balance FROM users WHERE id = %s", (opponent_id,))
            balance = cur.fetchone()
            
            if not balance or balance[0] < opponent_amount:
                return response(400, {'error': 'Недостаточно средств'})
            
            total_pool = creator_amount + opponent_amount
            opponent_chance = (opponent_amount / total_pool) * 100
            
            import random
            rand = random.random() * 100
            winner_id = opponent_id if rand < opponent_chance else creator_id
            
            cur.execute("UPDATE users SET balance = balance + %s WHERE id = %s", (opponent_amount, creator_id))
            cur.execute("UPDATE users SET balance = balance - %s WHERE id = %s", (opponent_amount, opponent_id))
            
            if winner_id == opponent_id:
                cur.execute("UPDATE users SET balance = balance + %s WHERE id = %s", (creator_amount, opponent_id))
                cur.execute("UPDATE users SET balance = balance - %s WHERE id = %s", (creator_amount, creator_id))
                
                cur.execute("INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)", 
                           (opponent_id, 'pvp_win', creator_amount, f'PvP победа'))
                cur.execute("INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)", 
                           (creator_id, 'pvp_loss', -creator_amount, f'PvP проигрыш'))
            else:
                cur.execute("INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)", 
                           (creator_id, 'pvp_win', opponent_amount, f'PvP победа'))
                cur.execute("INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)", 
                           (opponent_id, 'pvp_loss', -opponent_amount, f'PvP проигрыш'))
            
            cur.execute("UPDATE pvp_bets SET status = 'completed', opponent_id = %s, opponent_amount = %s, winner_id = %s WHERE id = %s", 
                       (opponent_id, opponent_amount, winner_id, bet_id))
            conn.commit()
            
            cur.execute("SELECT username FROM users WHERE id = %s", (creator_id,))
            creator_username = cur.fetchone()[0]
            
            return response(200, {'winner_id': winner_id, 'is_winner': winner_id == opponent_id, 'creator_username': creator_username})
        
        elif method == 'GET' and action == 'admin-users':
            admin_code = event.get('headers', {}).get('x-admin-code') or event.get('headers', {}).get('X-Admin-Code')
            
            if admin_code != 'DJJDIDHDHXIEU':
                return response(403, {'error': 'Доступ запрещён'})
            
            cur.execute("SELECT id, username, password, balance FROM users ORDER BY created_at DESC")
            users = cur.fetchall()
            
            result = [{'id': u[0], 'username': u[1], 'password': u[2], 'balance': u[3]} for u in users]
            
            return response(200, {'users': result})
        
        elif method == 'POST' and action == 'admin-update-balance':
            admin_code = event.get('headers', {}).get('x-admin-code') or event.get('headers', {}).get('X-Admin-Code')
            
            if admin_code != 'DJJDIDHDHXIEU':
                return response(403, {'error': 'Доступ запрещён'})
            
            username = body_data.get('username')
            amount = body_data.get('amount')
            
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            user = cur.fetchone()
            
            if not user:
                return response(404, {'error': 'Пользователь не найден'})
            
            user_id = user[0]
            trans_type = 'deposit' if amount > 0 else 'withdrawal'
            description = 'Пополнение админом' if amount > 0 else 'Вывод средств'
            
            cur.execute("UPDATE users SET balance = GREATEST(0, balance + %s) WHERE id = %s RETURNING balance", (amount, user_id))
            new_balance = cur.fetchone()[0]
            
            cur.execute("INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)", 
                       (user_id, trans_type, amount, description))
            conn.commit()
            
            return response(200, {'balance': new_balance})
        
        return response(404, {'error': 'Неизвестный маршрут'})
        
    except Exception as e:
        conn.rollback()
        return response(500, {'error': str(e)})
    
    finally:
        cur.close()
        conn.close()

def response(status: int, body: dict) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body),
        'isBase64Encoded': False
    }
