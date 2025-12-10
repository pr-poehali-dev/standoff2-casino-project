import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

type Screen = 'welcome' | 'role-select' | 'auth' | 'player-menu' | 'admin-panel';
type PlayerScreen = 'shop' | 'roulette' | 'pvp';
type RouletteResult = 'loss' | 'x1' | 'x2' | 'mystery';

interface User {
  username: string;
  password: string;
  balance: number;
}

interface PvPBet {
  id: string;
  creator: string;
  amount: number;
  opponent?: string;
  opponentAmount?: number;
  winner?: string;
}

const Index = () => {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [playerScreen, setPlayerScreen] = useState<PlayerScreen>('shop');
  const [isLogin, setIsLogin] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<string>('');
  
  const [users, setUsers] = useState<User[]>([]);
  const [secretCode, setSecretCode] = useState('');
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<RouletteResult | null>(null);
  const [mysteryChoice, setMysteryChoice] = useState<number | null>(null);
  
  const [pvpBets, setPvpBets] = useState<PvPBet[]>([]);
  const [newBetAmount, setNewBetAmount] = useState(10);
  const [respondBetAmount, setRespondBetAmount] = useState(10);
  
  const [adminCode, setAdminCode] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCommand, setAdminCommand] = useState('');

  const getCurrentBalance = () => {
    const user = users.find(u => u.username === currentUser);
    return user?.balance || 0;
  };

  const updateBalance = (amount: number) => {
    setUsers(prev => prev.map(u => 
      u.username === currentUser ? { ...u, balance: u.balance + amount } : u
    ));
  };

  const handleRegister = () => {
    if (!username || !password || !confirmPassword) {
      toast.error('Заполните все поля');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    if (users.find(u => u.username === username)) {
      toast.error('Юзернейм занят');
      return;
    }
    
    setUsers([...users, { username, password, balance: 0 }]);
    setCurrentUser(username);
    toast.success('Регистрация успешна!');
    setScreen('player-menu');
  };

  const handleLogin = () => {
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      toast.error('Неверный логин или пароль');
      return;
    }
    
    setCurrentUser(username);
    toast.success(`Добро пожаловать, ${username}!`);
    setScreen('player-menu');
  };

  const spinRoulette = () => {
    if (betAmount < 10) {
      toast.error('Минимальная ставка 10 голды');
      return;
    }
    
    if (getCurrentBalance() < betAmount) {
      toast.error('Недостаточно голды');
      return;
    }
    
    setIsSpinning(true);
    setRouletteResult(null);
    
    let result: RouletteResult;
    
    const codeMatch = secretCode.match(/HDJDUS\s+(X2|X\?)\s*(\d*)/i);
    
    if (codeMatch) {
      const [, prize, position] = codeMatch;
      if (prize === 'X2') {
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
        updateBalance(-betAmount);
        toast.error(`Проигрыш! -${betAmount} голды`);
      } else if (result === 'x1') {
        toast.info('X1 - ваша ставка возвращена');
      } else if (result === 'x2') {
        updateBalance(betAmount);
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
    
    updateBalance(betAmount * multiplier - betAmount);
    toast.success(`X${multiplier}! +${betAmount * (multiplier - 1)} голды`);
    setRouletteResult(null);
    setMysteryChoice(null);
  };

  const createPvPBet = () => {
    if (newBetAmount < 10) {
      toast.error('Минимальная ставка 10 голды');
      return;
    }
    
    if (getCurrentBalance() < newBetAmount) {
      toast.error('Недостаточно голды');
      return;
    }
    
    const newBet: PvPBet = {
      id: Date.now().toString(),
      creator: currentUser,
      amount: newBetAmount
    };
    
    setPvpBets([...pvpBets, newBet]);
    toast.success('Ставка создана!');
    setNewBetAmount(10);
  };

  const respondToBet = (bet: PvPBet) => {
    if (bet.creator === currentUser) {
      toast.error('Нельзя ответить на свою ставку');
      return;
    }
    
    if (respondBetAmount < 10) {
      toast.error('Минимальная ставка 10 голды');
      return;
    }
    
    if (getCurrentBalance() < respondBetAmount) {
      toast.error('Недостаточно голды');
      return;
    }
    
    const totalPool = bet.amount + respondBetAmount;
    const opponentChance = (respondBetAmount / totalPool) * 100;
    const rand = Math.random() * 100;
    const winner = rand < opponentChance ? currentUser : bet.creator;
    
    if (winner === currentUser) {
      updateBalance(bet.amount);
      toast.success(`Победа! +${bet.amount} голды`);
    } else {
      updateBalance(-respondBetAmount);
      const creatorUser = users.find(u => u.username === bet.creator);
      if (creatorUser) {
        setUsers(prev => prev.map(u => 
          u.username === bet.creator ? { ...u, balance: u.balance + respondBetAmount } : u
        ));
      }
      toast.error(`Проигрыш! -${respondBetAmount} голды`);
    }
    
    setPvpBets(pvpBets.filter(b => b.id !== bet.id));
  };

  const handleAdminLogin = () => {
    if (adminCode === 'DJJDIDHDHXIEU') {
      setScreen('admin-panel');
      toast.success('Вход в админ-панель');
    } else {
      toast.error('Неверный код');
    }
  };

  const executeAdminCommand = () => {
    const match = adminCommand.match(/^\/п\s+(\S+)\s+([\+\-])(\d+)$/);
    
    if (!match) {
      toast.error('Формат: /п [юзер] +100 или -100');
      return;
    }
    
    const [, targetUser, operation, amountStr] = match;
    const amount = parseInt(amountStr);
    
    const user = users.find(u => u.username === targetUser);
    if (!user) {
      toast.error('Пользователь не найден');
      return;
    }
    
    const delta = operation === '+' ? amount : -amount;
    setUsers(prev => prev.map(u => 
      u.username === targetUser ? { ...u, balance: Math.max(0, u.balance + delta) } : u
    ));
    
    toast.success(`${operation}${amount} голды для ${targetUser}`);
    setAdminCommand('');
  };

  const filteredUsers = adminSearch 
    ? users.filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase()))
    : users;

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
                <p className="text-lg text-foreground">Для использования подпишитесь на Telegram канал</p>
                <Button 
                  className="w-full bg-gold text-dark hover:bg-amber font-semibold text-lg py-6"
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
                  className="h-48 bg-gradient-to-br from-gold to-amber text-dark hover:from-amber hover:to-gold font-bold text-2xl transition-all transform hover:scale-105"
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
                  <label className="text-sm text-foreground mb-2 block">Юзернейм</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input border-gold/30 text-foreground"
                    placeholder="Введите юзернейм"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-foreground mb-2 block">Пароль</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-gold/30 text-foreground"
                    placeholder="Введите пароль"
                  />
                </div>
                
                {!isLogin && (
                  <div>
                    <label className="text-sm text-foreground mb-2 block">Повтор пароля</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-input border-gold/30 text-foreground"
                      placeholder="Повторите пароль"
                    />
                  </div>
                )}
                
                <Button
                  className="w-full bg-gold text-dark hover:bg-amber font-semibold py-6"
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
                  <p className="text-sm text-muted-foreground">Игрок: {currentUser}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Баланс</p>
                  <p className="text-3xl font-bold text-gold">{getCurrentBalance()} 💰</p>
                </div>
              </div>
            </Card>

            <Tabs value={playerScreen} onValueChange={(v) => setPlayerScreen(v as PlayerScreen)}>
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="shop" className="data-[state=active]:bg-gold data-[state=active]:text-dark">
                  <Icon name="Store" className="mr-2" size={20} />
                  Магазин
                </TabsTrigger>
                <TabsTrigger value="roulette" className="data-[state=active]:bg-gold data-[state=active]:text-dark">
                  <Icon name="CircleDot" className="mr-2" size={20} />
                  Рулетка
                </TabsTrigger>
                <TabsTrigger value="pvp" className="data-[state=active]:bg-gold data-[state=active]:text-dark">
                  <Icon name="Swords" className="mr-2" size={20} />
                  PvP Ставки
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shop" className="space-y-4 mt-4">
                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">💳 Пополнение баланса</h3>
                  <div className="bg-muted/50 border border-gold/20 rounded-lg p-4 mb-4">
                    <p className="text-foreground mb-2">Для пополнения баланса:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Купите скин у админа за нужное количество голды</li>
                      <li>Отправьте скриншот покупки</li>
                      <li>Голда будет зачислена на ваш баланс</li>
                    </ol>
                  </div>
                  <Button
                    className="w-full bg-gold text-dark hover:bg-amber font-semibold"
                    onClick={() => window.open('https://t.me/Aks1kx_bot', '_blank')}
                  >
                    <Icon name="MessageCircle" className="mr-2" />
                    Перейти в чат к админу
                  </Button>
                </Card>

                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">🎁 Секретный код</h3>
                  <Input
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="bg-input border-gold/30 text-foreground mb-2"
                    placeholder="HDJDUS X2 или HDJDUS X? 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Пример: HDJDUS X2 - всегда X2 на рулетке
                  </p>
                </Card>

                <Card className="bg-card border border-gold/30 p-6">
                  <h3 className="text-2xl font-bold text-gold mb-4">💸 Вывод средств</h3>
                  <p className="text-sm text-muted-foreground mb-4">Минимальная сумма вывода: 200 голды</p>
                  <Button
                    className="w-full bg-gold text-dark hover:bg-amber font-semibold"
                    disabled={getCurrentBalance() < 200}
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
                        {rouletteResult === 'loss' && <span className="text-destructive">ПРОИГРЫШ</span>}
                        {rouletteResult === 'x1' && <span className="text-foreground">X1 - ВОЗВРАТ</span>}
                        {rouletteResult === 'x2' && <span className="text-gold">X2 - ПОБЕДА!</span>}
                        {rouletteResult === 'mystery' && <span className="text-amber">ВЫБЕРИ ДВЕРЬ!</span>}
                      </div>
                    )}
                    
                    {rouletteResult === 'mystery' && (
                      <div className="grid grid-cols-3 gap-4 animate-slide-up">
                        {[1, 2, 3].map(door => (
                          <Button
                            key={door}
                            className="h-32 bg-gradient-to-br from-gold to-amber text-dark hover:from-amber hover:to-gold font-bold text-xl"
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
                          <label className="text-sm text-foreground">Ставка (минимум 10)</label>
                          <Input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                            className="bg-input border-gold/30 text-foreground text-center text-xl"
                            min={10}
                          />
                        </div>
                        
                        <Button
                          className="w-full bg-gold text-dark hover:bg-amber font-semibold py-6 text-xl"
                          onClick={spinRoulette}
                          disabled={isSpinning || getCurrentBalance() < betAmount}
                        >
                          <Icon name="Play" className="mr-2" />
                          КРУТИТЬ ({betAmount} 💰)
                        </Button>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>💀 Проигрыш - 80%</p>
                          <p>😐 X1 (возврат) - 18%</p>
                          <p>💰 X2 - 1%</p>
                          <p>❓ X? (X2/X5/X20) - 1%</p>
                        </div>
                      </>
                    )}
                    
                    {rouletteResult && !isSpinning && rouletteResult !== 'mystery' && (
                      <Button
                        className="w-full bg-gold text-dark hover:bg-amber font-semibold"
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
                      className="bg-input border-gold/30 text-foreground"
                      placeholder="Сумма ставки"
                      min={10}
                    />
                    <Button
                      className="bg-gold text-dark hover:bg-amber font-semibold"
                      onClick={createPvPBet}
                    >
                      Создать
                    </Button>
                  </div>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gold">Активные ставки</h3>
                  {pvpBets.length === 0 ? (
                    <Card className="bg-card border border-gold/30 p-6 text-center text-muted-foreground">
                      Нет активных ставок
                    </Card>
                  ) : (
                    pvpBets.map(bet => (
                      <Card key={bet.id} className="bg-card border border-gold/30 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground font-semibold">{bet.creator}</p>
                            <p className="text-gold text-lg font-bold">{bet.amount} 💰</p>
                          </div>
                          {bet.creator !== currentUser && (
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                value={respondBetAmount}
                                onChange={(e) => setRespondBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                                className="w-24 bg-input border-gold/30 text-foreground"
                                min={10}
                              />
                              <Button
                                className="bg-gold text-dark hover:bg-amber font-semibold"
                                onClick={() => respondToBet(bet)}
                              >
                                Ответить
                              </Button>
                            </div>
                          )}
                          {bet.creator === currentUser && (
                            <span className="text-sm text-muted-foreground">Ваша ставка</span>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Button
              variant="outline"
              className="w-full border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => {
                setScreen('role-select');
                setCurrentUser('');
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
              
              {currentUser !== 'admin-verified' && (
                <div className="max-w-md mx-auto space-y-4">
                  <Input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="bg-input border-gold/30 text-foreground"
                    placeholder="Введите код админа"
                  />
                  <Button
                    className="w-full bg-gold text-dark hover:bg-amber font-semibold"
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
              
              {adminCode === 'DJJDIDHDHXIEU' && (
                <Tabs defaultValue="users" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 bg-muted">
                    <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-dark">
                      <Icon name="Users" className="mr-2" size={20} />
                      Пользователи
                    </TabsTrigger>
                    <TabsTrigger value="console" className="data-[state=active]:bg-gold data-[state=active]:text-dark">
                      <Icon name="Terminal" className="mr-2" size={20} />
                      Консоль
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="users" className="space-y-4">
                    <Input
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="bg-input border-gold/30 text-foreground"
                      placeholder="Поиск по юзернейму..."
                    />
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Нет пользователей</p>
                      ) : (
                        filteredUsers.map(user => (
                          <Card key={user.username} className="bg-muted border border-gold/30 p-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Юзернейм</p>
                                <p className="text-foreground font-semibold">{user.username}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Пароль</p>
                                <p className="text-foreground font-mono text-sm">{user.password}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Баланс</p>
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
                      <p className="text-sm text-muted-foreground mb-2">Формат команды:</p>
                      <code className="text-xs text-gold">
                        /п [юзернейм] +100<br />
                        /п [юзернейм] -50
                      </code>
                    </Card>
                    
                    <div className="flex gap-2">
                      <Input
                        value={adminCommand}
                        onChange={(e) => setAdminCommand(e.target.value)}
                        className="bg-input border-gold/30 text-foreground font-mono"
                        placeholder="/п username +100"
                      />
                      <Button
                        className="bg-gold text-dark hover:bg-amber font-semibold"
                        onClick={executeAdminCommand}
                      >
                        <Icon name="Send" size={20} />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </Card>
            
            {adminCode === 'DJJDIDHDHXIEU' && (
              <Button
                variant="outline"
                className="w-full border-gold/30 text-gold hover:bg-gold/10"
                onClick={() => {
                  setScreen('role-select');
                  setAdminCode('');
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
