const API_URL = 'https://functions.poehali.dev/adbbc088-2415-4c2d-9837-c49859d8e67e';

export interface ApiUser {
  user_id: number;
  username: string;
  balance: number;
  password?: string;
}

export interface ApiTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  timestamp: number;
}

export interface ApiPvPBet {
  id: number;
  creator: string;
  amount: number;
  creator_id: number;
}

export interface ApiPvPResult {
  winner_id: number;
  is_winner: boolean;
  creator_username: string;
}

async function apiCall(action: string, method: string = 'POST', data?: any): Promise<any> {
  const url = method === 'GET' ? `${API_URL}?action=${action}&${new URLSearchParams(data || {})}` : API_URL;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (method === 'POST' && data) {
    options.body = JSON.stringify({ action, ...data });
  }
  
  const response = await fetch(url, options);
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Ошибка сервера');
  }
  
  return result;
}

export async function register(username: string, password: string): Promise<ApiUser> {
  return apiCall('register', 'POST', { username, password });
}

export async function login(username: string, password: string): Promise<ApiUser> {
  return apiCall('login', 'POST', { username, password });
}

export async function getBalance(userId: number): Promise<number> {
  const result = await apiCall('balance', 'GET', { user_id: userId });
  return result.balance;
}

export async function updateBalance(
  userId: number, 
  amount: number, 
  type: string, 
  description: string
): Promise<number> {
  const result = await apiCall('update-balance', 'POST', {
    user_id: userId,
    amount,
    type,
    description
  });
  return result.balance;
}

export async function getTransactions(userId: number): Promise<ApiTransaction[]> {
  const result = await apiCall('transactions', 'GET', { user_id: userId });
  return result.transactions;
}

export async function createPvPBet(userId: number, amount: number): Promise<number> {
  const result = await apiCall('pvp-create', 'POST', { user_id: userId, amount });
  return result.bet_id;
}

export async function getPvPBets(): Promise<ApiPvPBet[]> {
  const result = await apiCall('pvp-list', 'GET');
  return result.bets;
}

export async function respondToPvPBet(
  betId: number, 
  userId: number, 
  amount: number
): Promise<ApiPvPResult> {
  return apiCall('pvp-respond', 'POST', { bet_id: betId, user_id: userId, amount });
}

export async function getAdminUsers(adminCode: string): Promise<ApiUser[]> {
  const response = await fetch(`${API_URL}?action=admin-users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Code': adminCode
    }
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Ошибка доступа');
  }
  
  return result.users;
}

export async function adminUpdateBalance(
  adminCode: string,
  username: string, 
  amount: number
): Promise<number> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Code': adminCode
    },
    body: JSON.stringify({
      action: 'admin-update-balance',
      username,
      amount
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Ошибка обновления');
  }
  
  return result.balance;
}
