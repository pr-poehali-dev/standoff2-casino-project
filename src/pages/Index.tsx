import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import * as api from '@/lib/api';

type Screen = 'welcome' | 'role-select' | 'auth' | 'player-menu' | 'admin-panel';
type PlayerScreen = 'shop' | 'roulette' | 'pvp' | 'history';
type RouletteResult = 'loss' | 'x1' | 'x2' | 'mystery';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [playerScreen, setPlayerScreen] = useState<PlayerScreen>('shop');
  const [isLogin, setIsLogin] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentUsername, setCurrentUsername] = useState('');
  const [balance, setBalance] = useState(0);
  
  const [transactions, setTransactions] = useState<api.ApiTransaction[]>([]);
  const [secretCode, setSecretCode] = useState('');
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<RouletteResult | null>(null);
  const [mysteryChoice, setMysteryChoice] = useState<number | null>(null);
  
  const [pvpBets, setPvpBets] = useState<api.ApiPvPBet[]>([]);
  const [newBetAmount, setNewBetAmount] = useState(10);
  const [respondBetAmount, setRespondBetAmount] = useState(10);
  
  const [adminCode, setAdminCode] = useState('');
  const [adminUsers, setAdminUsers] = useState<api.ApiUser[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCommand, setAdminCommand] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem('casino_user_id');
    const savedUsername = localStorage.getItem('casino_username');
    if (savedUserId && savedUsername) {
      setCurrentUserId(parseInt(savedUserId));
      setCurrentUsername(savedUsername);
      loadUserData(parseInt(savedUserId));
    }
  }, []);

  useEffect(() => {
    if (playerScreen === 'pvp' && screen === 'player-menu') {
      loadPvPBets();
    }
  }, [playerScreen, screen]);

  useEffect(() => {
    if (playerScreen === 'history' && currentUserId) {
      loadTransactions();
    }
  }, [playerScreen, currentUserId]);

  const loadUserData = async (userId: number) => {
    try {
      const userBalance = await api.getBalance(userId);
      setBalance(userBalance);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions(currentUserId);
      setTransactions(data);
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
    }
  };

  const loadPvPBets = async () => {
    try {
      const bets = await api.getPvPBets();
      setPvpBets(bets);
    } catch (error) {
      console.error('Ошибка загрузки ставок:', error);
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      toast.error('Заполните все поля');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    try {
      const user = await api.register(username, password);
      setCurrentUserId(user.user_id);
      setCurrentUsername(user.username);
      setBalance(user.balance);
      
      localStorage.setItem('casino_user_id', user.user_id.toString());
      localStorage.setItem('casino_username', user.username);
      
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      toast.success('Регистрация успешна!');
      setScreen('player-menu');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации');
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Заполните все поля');
      return;
    }
    
    try {
      const user = await api.login(username, password);
      setCurrentUserId(user.user_id);
      setCurrentUsername(user.username);
      setBalance(user.balance);
      
      localStorage.setItem('casino_user_id', user.user_id.toString());
      localStorage.setItem('casino_username', user.username);
      
      setUsername('');
      setPassword('');
      toast.success(`Добро пожаловать, ${user.username}!`);
      setScreen('player-menu');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа');
    }
  };

  const updateUserBalance = async (amount: number, type: string, description: string) => {
    try {
      const newBalance = await api.updateBalance(currentUserId, amount, type, description);
      setBalance(newBalance);
    } catch (error) {
      console.error('Ошибка обновления баланса:', error);
    }
  };

  const spinRoulette = () => {
    if (betAmount < 10) {
      toast.error('Минимальная ставка 10 голды');
      return;
    }
    
    if (balance < betAmount) {
      toast.error('Недостаточно голды');
      return;
    }
    
    setIsSpinning(true);
    setRouletteResult(null);
    
    let result: RouletteResult;
    
    const codeMatch = secretCode.match(/HDJDUS\s+(X2|X\?)\s*(\d*)/i);
    
    if (codeMatch) {
      const [, prize, position] = codeMatch;
      if (prize.toUpperCase() === 'X2') {
        result = 'x2';
      } else if (prize === 'X?') {
        result = 'mystery';
        if (position) {
          setMysteryChoice(parseInt(position));
        }
      } else {
        result = getRandomResult();
      }
    } else {
      result = getRandomResult();
    }
    
    setTimeout(() => {
      setIsSpinning(false);
      setRouletteResult(result);
      
      if (result === 'loss') {
        updateUserBalance(-betAmount, 'loss', `Рулетка: проигрыш`);
        toast.error(`Проигрыш! -${betAmount} голды`);
      } else if (result === 'x1') {
        toast.info('X1 - ваша ставка возвращена');
      } else if (result === 'x2') {
        updateUserBalance(betAmount, 'win', `Рулетка: X2`);
        toast.success(`X2! +${betAmount} голды`);
      }
    }, 4000);
  };

  const getRandomResult = (): RouletteResult => {
    const rand = Math.random() * 100;
    if (rand < 80) return 'loss';
    if (rand < 98) return 'x1';
    if (rand < 99) return 'x2';
    return 'mystery';
  };

  const handleMysteryChoice = (door: number) => {
    const prizes = [2, 5, 20];
    const shuffled = prizes.sort(() => Math.random() - 0.5);
    const chosenDoor = mysteryChoice || door;
    const multiplier = shuffled[chosenDoor - 1];
    const winAmount = betAmount * multiplier - betAmount;
    
    updateUserBalance(winAmount, 'win', `Рулетка: X${multiplier}`);
    toast.success(`X${multiplier}! +${winAmount} голды`);
    setRouletteResult(null);
    setMysteryChoice(null);
  };

  const createPvPBet = async () => {
    if (newBetAmount < 10) {
      toast.error('Минимальная ставка 10 голды');
      return;
    }
    
    if (balance < newBetAmount) {
      toast.error('Недостаточно голды');
      return;
    }
    
    try {
      await api.createPvPBet(currentUserId, newBetAmount);
      toast.success('Ставка создана!');
      setNewBetAmount(10);
      loadPvPBets();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания ставки');
    }
  };

  const respondToBet = async (bet: api.ApiPvPBet) => {
    if (bet.creator_id === currentUserId) {
      toast.error('Нельзя ответить на свою ставку');
      return;
    }
    
    if (respondBetAmount < 10) {
      toast.error('Минимальная ставка 10 голды');
      return;
    }
    
    if (balance < respondBetAmount) {
      toast.error('Недостаточно голды');
      return;
    }
    
    try {
      const result = await api.respondToPvPBet(bet.id, currentUserId, respondBetAmount);
      
      if (result.is_winner) {
        toast.success(`Победа! +${bet.amount} голды`);
      } else {
        toast.error(`Проигрыш! -${respondBetAmount} голды`);
      }
      
      loadUserData(currentUserId);
      loadPvPBets();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка ответа на ставку');
    }
  };

  const handleAdminLogin = async () => {
    if (adminCode === 'DJJDIDHDHXIEU') {
      setIsAdminLoggedIn(true);
      toast.success('Вход в админ-панель');
      try {
        const users = await api.getAdminUsers(adminCode);
        setAdminUsers(users);
      } catch (error: any) {
        toast.error(error.message || 'Ошибка загрузки пользователей');
      }
    } else {
      toast.error('Неверный код');
    }
  };

  const executeAdminCommand = async () => {
    const match = adminCommand.match(/^\/п\s+(\S+)\s+([\+\-])(\d+)$/);
    
    if (!match) {
      toast.error('Формат: /п [юзер] +100 или -100');
      return;
    }
    
    const [, targetUser, operation, amountStr] = match;
    const amount = parseInt(amountStr);
    const delta = operation === '+' ? amount : -amount;
    
    try {
      await api.adminUpdateBalance(adminCode, targetUser, delta);
      toast.success(`${operation}${amount} голды для ${targetUser}`);
      setAdminCommand('');
      
      const users = await api.getAdminUsers(adminCode);
      setAdminUsers(users);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка выполнения команды');
    }
  };

  const filteredUsers = adminSearch 
    ? adminUsers.filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase()))
    : adminUsers;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {screen === 'welcome' && (
          <Card className="bg-card border-2 border-gold/30 p-8 animate-fade-in">
            <div className="text-center space-y-6">
              <div className="mb-8">
                <h1 className="text-6xl font-bold text-gold gold-glow mb-2">F12F13</h1>
                <p className="text-xl text-amber">КАЗИНО STANDOFF 2</p>
              </div>
              
              <div className="bg-muted/50 border border-gold/20 rounded-lg p-6 space-y-4">
                <Icon name="Send" className="mx-auto text-gold" size={48} />
                <p className="text-lg text-white">Для использования подпишитесь на Telegram канал</p>
                <Button 
                  className="w-full bg-gold text-black hover:bg-amber font-semibold text-lg py-6"
                  onClick={() => {
                    window.open('https://t.me/f12f12f12f12f12f12f12', '_blank');
                    setTimeout(() => setScreen('role-select'), 500);
                  }}
                >
                  <Icon name="ExternalLink" className="mr-2" />
                  Подписаться и продолжить
                </Button>
              </div>
            </div>
          </Card>
        )}

        {screen === 'role-select' && (
          <Card className="bg-card border-2 border-gold/30 p-8 animate-slide-up">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-gold gold-glow mb-8">Выберите роль</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Button
                  className="h-48 bg-gradient-to-br from-gold to-amber text-black hover:from-amber hover:to-gold font-bold text-2xl transition-all transform hover:scale-105"
                  onClick={() => {
                    setIsLogin(false);
                    setScreen('auth');
                  }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="User" size={64} />
                    <span>Я ИГРОК</span>
                  </div>
                </Button>
                
                <Button
                  className="h-48 bg-gradient-to-br from-muted to-muted/50 text-gold hover:from-muted/80 hover:to-muted/30 font-bold text-2xl border-2 border-gold/30 transition-all transform hover:scale-105"
                  onClick={() => setScreen('admin-panel')}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="Shield" size={64} />
                    <span>Я АДМИН</span>
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {screen === 'auth' && (
          <Card className="bg-card border-2 border-gold/30 p-8 animate-fade-in">
            <div className="max-w-md mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-gold gold-glow text-center">
                {isLogin ? 'Вход' : 'Регистрация'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Юзернейм</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input border-gold/30 text-white"
                    placeholder="Введите юзернейм"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-white mb-2 block">Пароль</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-gold/30 text-white"
                    placeholder="Введите пароль"
                  />
                </div>
                
                {!isLogin && (
                  <div>
                    <label className="text-sm text-white mb-2 block">Повтор пароля</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-input border-gold/30 text-white"
                      placeholder="Повторите пароль"
                    />
                  </div>
                )}
                
                <Button
                  className="w-full bg-gold text-black hover:bg-amber font-semibold py-6"
                  onClick={isLogin ? handleLogin : handleRegister}
                >
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </Button>
                
                <button
                  className="w-full text-sm text-gold hover:text-amber transition-colors"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                </button>
                
                <Button
                  variant="outline"
                  className="w-full border-gold/30 text-gold hover:bg-gold/10"
                  onClick={() => setScreen('role-select')}
                >
                  Назад
                </Button>
              </div>
            </div>
          </Card>
        )}

        {screen === 'player-menu' && (
          <div className="space-y-4">
            <Card className="bg-card border-2 border-gold/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gold gold-glow">F12F13 CASINO</h2>
                  <p className="text-sm text-gray-400">Игрок: {currentUsername}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Баланс</p>
                  <p className="text-3xl font-bold text-gold">{balance} 💰</p>
                </div>
              </div>
            </Card>

            <Tabs value={playerScreen} onValueChange={(v) => setPlayerScreen(v as PlayerScreen)}>
              <TabsList className="grid w-full grid-cols-4 bg-muted">
                <TabsTrigger value="shop" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                  <Icon name="Store" className="mr-2" size={20} />
                  Магазин
                </TabsTrigger>
                <TabsTrigger value="roulette" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                  <Icon name="CircleDot" className="mr-2" size={20} />
                  Рулетка
                </TabsTrigger>
                <TabsTrigger value="pvp" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                  <Icon name="Swords" className="mr-2" size={20} />
                  PvP
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                  <Icon name="History" className="mr-2" size={20} />
                  История
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shop" className="space-y-4 mt-4">
                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">💳 Пополнение баланса</h3>
                  <div className="bg-muted/50 border border-gold/20 rounded-lg p-4 mb-4">
                    <p className="text-white mb-2">Для пополнения баланса:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
                      <li>Купите скин у админа за нужное количество голды</li>
                      <li>Отправьте скриншот покупки</li>
                      <li>Голда будет зачислена на ваш баланс</li>
                    </ol>
                  </div>
                  <Button
                    className="w-full bg-gold text-black hover:bg-amber font-semibold"
                    onClick={() => window.open('https://t.me/Aks1kx_bot', '_blank')}
                  >
                    <Icon name="MessageCircle" className="mr-2" />
                    Перейти в чат к админу
                  </Button>
                </Card>

                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">💖 Поддержать автора</h3>
                  <Input
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="bg-input border-gold/30 text-white mb-2"
                    placeholder="Введите код поддержки"
                  />
                  <p className="text-xs text-gray-400">
                    Получите код у автора для активации бонусов
                  </p>
                </Card>

                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">💸 Вывод средств</h3>
                  <p className="text-sm text-gray-400 mb-4">Минимальная сумма вывода: 200 голды</p>
                  <Button
                    className="w-full bg-gold text-black hover:bg-amber font-semibold"
                    disabled={balance < 200}
                    onClick={() => window.open('https://t.me/Aks1kx_bot', '_blank')}
                  >
                    <Icon name="ArrowDownToLine" className="mr-2" />
                    Вывести средства
                  </Button>
                </Card>
              </TabsContent>

              <TabsContent value="roulette" className="space-y-4 mt-4">
                <Card className="bg-card border-2 border-gold/30 p-8">
                  <div className="text-center space-y-6">
                    <h3 className="text-3xl font-bold text-gold gold-glow">🎰 РУЛЕТКА</h3>
                    
                    <div className={`w-64 h-64 mx-auto border-4 border-gold rounded-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/30 ${isSpinning ? 'animate-spin-roulette' : ''}`}>
                      <div className="text-6xl">
                        {isSpinning ? '🎲' : rouletteResult === 'loss' ? '💀' : rouletteResult === 'x1' ? '😐' : rouletteResult === 'x2' ? '💰' : rouletteResult === 'mystery' ? '❓' : '🎯'}
                      </div>
                    </div>
                    
                    {rouletteResult && (
                      <div className="text-xl font-bold animate-fade-in">
                        {rouletteResult === 'loss' && <span className="text-red-500">ПРОИГРЫШ</span>}
                        {rouletteResult === 'x1' && <span className="text-white">X1 - ВОЗВРАТ</span>}
                        {rouletteResult === 'x2' && <span className="text-gold">X2 - ПОБЕДА!</span>}
                        {rouletteResult === 'mystery' && <span className="text-amber">ВЫБЕРИ ДВЕРЬ!</span>}
                      </div>
                    )}
                    
                    {rouletteResult === 'mystery' && (
                      <div className="grid grid-cols-3 gap-4 animate-slide-up">
                        {[1, 2, 3].map(door => (
                          <Button
                            key={door}
                            className="h-32 bg-gradient-to-br from-gold to-amber text-black hover:from-amber hover:to-gold font-bold text-xl"
                            onClick={() => handleMysteryChoice(door)}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Icon name="DoorOpen" size={48} />
                              <span>ДВЕРЬ {door}</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {!rouletteResult && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm text-white">Ставка (минимум 10)</label>
                          <Input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                            className="bg-input border-gold/30 text-white text-center text-xl"
                            min={10}
                          />
                        </div>
                        
                        <Button
                          className="w-full bg-gold text-black hover:bg-amber font-semibold py-6 text-xl"
                          onClick={spinRoulette}
                          disabled={isSpinning || balance < betAmount}
                        >
                          <Icon name="Play" className="mr-2" />
                          КРУТИТЬ ({betAmount} 💰)
                        </Button>
                        
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>💀 Проигрыш - ???%</p>
                          <p>😐 X1 (возврат) - ???%</p>
                          <p>💰 X2 - ???%</p>
                          <p>❓ X? (X2/X5/X20) - ???%</p>
                        </div>
                      </>
                    )}
                    
                    {rouletteResult && !isSpinning && rouletteResult !== 'mystery' && (
                      <Button
                        className="w-full bg-gold text-black hover:bg-amber font-semibold"
                        onClick={() => setRouletteResult(null)}
                      >
                        Крутить снова
                      </Button>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="pvp" className="space-y-4 mt-4">
                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">⚔️ Создать ставку</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newBetAmount}
                      onChange={(e) => setNewBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                      className="bg-input border-gold/30 text-white"
                      placeholder="Сумма ставки"
                      min={10}
                    />
                    <Button
                      className="bg-gold text-black hover:bg-amber font-semibold"
                      onClick={createPvPBet}
                    >
                      Создать
                    </Button>
                  </div>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gold">Активные ставки</h3>
                  {pvpBets.length === 0 ? (
                    <Card className="bg-card border border-gold/30 p-6 text-center text-gray-400">
                      Нет активных ставок
                    </Card>
                  ) : (
                    pvpBets.map(bet => (
                      <Card key={bet.id} className="bg-card border border-gold/30 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{bet.creator}</p>
                            <p className="text-gold text-lg font-bold">{bet.amount} 💰</p>
                          </div>
                          {bet.creator_id !== currentUserId && (
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                value={respondBetAmount}
                                onChange={(e) => setRespondBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                                className="w-24 bg-input border-gold/30 text-white"
                                min={10}
                              />
                              <Button
                                className="bg-gold text-black hover:bg-amber font-semibold"
                                onClick={() => respondToBet(bet)}
                              >
                                Ответить
                              </Button>
                            </div>
                          )}
                          {bet.creator_id === currentUserId && (
                            <span className="text-sm text-gray-400">Ваша ставка</span>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">📊 История транзакций</h3>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Нет транзакций</p>
                    ) : (
                      transactions.map(transaction => (
                        <Card key={transaction.id} className="bg-muted/30 border border-gold/20 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{transaction.description}</p>
                              <p className="text-xs text-gray-400">{formatDate(transaction.timestamp)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {transaction.amount >= 0 ? '+' : ''}{transaction.amount} 💰
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            <Button
              variant="outline"
              className="w-full border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => {
                setScreen('role-select');
                setCurrentUserId(0);
                setCurrentUsername('');
                setBalance(0);
                localStorage.removeItem('casino_user_id');
                localStorage.removeItem('casino_username');
              }}
            >
              Выйти
            </Button>
          </div>
        )}

        {screen === 'admin-panel' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="bg-card border-2 border-gold/30 p-6">
              <h2 className="text-3xl font-bold text-gold gold-glow text-center mb-6">
                <Icon name="Shield" className="inline mr-2" />
                АДМИН-ПАНЕЛЬ
              </h2>
              
              {!isAdminLoggedIn && (
                <div className="max-w-md mx-auto space-y-4">
                  <Input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="bg-input border-gold/30 text-white"
                    placeholder="Введите код админа"
                  />
                  <Button
                    className="w-full bg-gold text-black hover:bg-amber font-semibold"
                    onClick={handleAdminLogin}
                  >
                    Войти
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gold/30 text-gold hover:bg-gold/10"
                    onClick={() => setScreen('role-select')}
                  >
                    Назад
                  </Button>
                </div>
              )}
              
              {isAdminLoggedIn && (
                <Tabs defaultValue="users" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 bg-muted">
                    <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                      <Icon name="Users" className="mr-2" size={20} />
                      Пользователи
                    </TabsTrigger>
                    <TabsTrigger value="console" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                      <Icon name="Terminal" className="mr-2" size={20} />
                      Консоль
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="users" className="space-y-4">
                    <Input
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="bg-input border-gold/30 text-white"
                      placeholder="Поиск по юзернейму..."
                    />
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Нет пользователей</p>
                      ) : (
                        filteredUsers.map(user => (
                          <Card key={user.id} className="bg-muted/50 border-2 border-gold/30 p-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-400">Юзернейм</p>
                                <p className="text-white font-semibold">{user.username}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Пароль</p>
                                <p className="text-white font-mono text-sm">{user.password}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Баланс</p>
                                <p className="text-gold font-bold">{user.balance} 💰</p>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="console" className="space-y-4">
                    <Card className="bg-muted/50 border border-gold/30 p-4">
                      <p className="text-sm text-gray-400 mb-2">Формат команды:</p>
                      <code className="text-xs text-gold">
                        /п [юзернейм] +100<br />
                        /п [юзернейм] -50
                      </code>
                    </Card>
                    
                    <div className="flex gap-2">
                      <Input
                        value={adminCommand}
                        onChange={(e) => setAdminCommand(e.target.value)}
                        className="bg-input border-gold/30 text-white font-mono"
                        placeholder="/п username +100"
                      />
                      <Button
                        className="bg-gold text-black hover:bg-amber font-semibold"
                        onClick={executeAdminCommand}
                      >
                        <Icon name="Send" size={20} />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </Card>
            
            {isAdminLoggedIn && (
              <Button
                variant="outline"
                className="w-full border-gold/30 text-gold hover:bg-gold/10"
                onClick={() => {
                  setScreen('role-select');
                  setAdminCode('');
                  setIsAdminLoggedIn(false);
                  setAdminUsers([]);
                }}
              >
                Выйти
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
