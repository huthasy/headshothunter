import { supabase, getPlayerId } from './SupabaseClient.js';

export const GlobalState = {
  // === PLAYER DATA (luu tren Supabase) ===
  playerId: null,
  currentFloor: 1,
  currentStage: 1,
  gold: 0,
  bestFloor: 1,
  bestStage: 1,
  dailyBestFloor: 1,
  dailyBestStage: 1,
  totalTonDeposited: 0,
  hhtCoin: 0,
  helmetLevel: 0,
  armorLevel: 0,
  ownedWeapons: ['pistol'],
  equippedWeapon: 'pistol',

  // === GAME CONFIG (load tu Supabase) ===
  weapons: {},
  helmetPrice: 0,
  armorPrice: 0,
  upgradePrice: 0,
  baseGunSpeed: 3,
  sweepAngle: 60,
  goldPackages: [],
  tonReceiveAddress: '',
  laserBossMultiplier: 3,
  rankingRewards: [],
  bossConfig: { spawnInterval: 10, baseHhtReward: 50, hhtRewardStep: 10 },
  dailyCheckinConfig: { rewards: [10,20,30,50,80,120,200], reset_after_days: 7 },
  exchangeConfig: { hhtToTonRate: 1000, withdrawFeePercent: 5, depositOptions: [1, 5, 10] },
  dailyMissions: [],
  onetimeMissions: [],
  referralConfig: { f1_percent:10, f2_percent:5, f3_percent:2, milestones:[], bot_link:'' },

  // === PLAYER MISSION STATE ===
  checkinStreak: 0,
  lastCheckinDate: '',
  dailyTonWithdrawn: 0,
  lastWithdrawDate: '',
  completedDailyMissions: [],
  completedOnetimeMissions: [],
  referralCode: '',
  referredBy: '',
  referralCount: 0,
  claimedMilestones: [],
  referralList: [],

  // === LOADING STATE ===
  isLoaded: false,
  loadError: null,

  // HP dua tren trang bi
  getMaxHP() {
    return 1 + this.helmetLevel + this.armorLevel;
  },

  // =============================================
  // LOAD TU SUPABASE
  // =============================================
  async loadFromSupabase() {
    try {
      this.playerId = getPlayerId();
      console.log('[Supabase] Loading data for player:', this.playerId);

      const getStartParam = () => {
          if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) return window.Telegram.WebApp.initDataUnsafe.start_param;
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.has('tgWebAppStartParam')) return searchParams.get('tgWebAppStartParam');
          if (searchParams.has('start_param')) return searchParams.get('start_param');
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          if (hashParams.has('tgWebAppStartParam')) return hashParams.get('tgWebAppStartParam');
          if (hashParams.has('start_param')) return hashParams.get('start_param');
          return null;
      };

      let referredBy = '';
      const sp = getStartParam();
      if (sp && sp.startsWith('ref_')) {
          referredBy = sp.replace('ref_', '');
          if (referredBy === this.playerId) referredBy = ''; // Khong tu gioi thieu minh
      }

      // 1. Load game config
      const { data: configData, error: configError } = await supabase
          .from('game_config')
          .select('key, value');

      if (configError) throw configError;

      if (configData) {
        for (const row of configData) {
          switch (row.key) {
            case 'weapons':
              // Build weapons object voi owned state tu player data
              this.weapons = {};
              const weaponConfigs = row.value;
              for (const [id, wConfig] of Object.entries(weaponConfigs)) {
                this.weapons[id] = {
                  ...wConfig,
                  owned: this.ownedWeapons.includes(id)
                };
              }
              break;
            case 'helmet_price':
              this.helmetPrice = Number(row.value);
              break;
            case 'armor_price':
              this.armorPrice = Number(row.value);
              break;
            case 'upgrade_price':
              this.upgradePrice = Number(row.value);
              break;
            case 'base_gun_speed':
              this.baseGunSpeed = Number(row.value);
              break;
            case 'sweep_angle':
              this.sweepAngle = Number(row.value);
              break;
            case 'gold_packages':
              this.goldPackages = row.value || [];
              break;
            case 'ton_receive_address':
              this.tonReceiveAddress = row.value || '';
              break;
            case 'laser_boss_multiplier':
              this.laserBossMultiplier = Number(row.value) || 3;
              break;
            case 'ranking_rewards':
              this.rankingRewards = row.value || [];
              break;
            case 'boss_config':
              if (row.value) {
                  this.bossConfig = {
                      spawnInterval: Number(row.value.spawn_interval) || 10,
                      baseHhtReward: Number(row.value.base_hht_reward) || 50,
                      hhtRewardStep: Number(row.value.hht_reward_step) || 10
                  };
              }
              break;
            case 'daily_checkin':
              this.dailyCheckinConfig = row.value || this.dailyCheckinConfig;
              break;
            case 'daily_missions':
              this.dailyMissions = row.value || [];
              break;
            case 'onetime_missions':
              this.onetimeMissions = row.value || [];
              break;
            case 'referral_config':
              this.referralConfig = row.value || this.referralConfig;
              break;
            case 'exchange_config':
              if (row.value) {
                this.exchangeConfig = {
                  hhtToTonRate: Number(row.value.hht_to_ton_rate) || 1000,
                  withdrawFeePercent: Number(row.value.withdraw_fee_percent) || 5,
                  depositOptions: Array.isArray(row.value.deposit_options) ? row.value.deposit_options : [1, 5, 10]
                };
              }
              break;
          }
        }
      }

      // 2. Load player data (hoac tao moi)
      let { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', this.playerId)
          .single();

      if (playerError && playerError.code === 'PGRST116') {
        // Player chua ton tai -> tao moi
        console.log('[Supabase] New player, creating record...');

        const { data: newPlayer, error: insertError } = await supabase
            .from('players')
            .insert({
              id: this.playerId,
              gold: 0,
              best_stage: 1,
              best_floor: 1,
              helmet_level: 0,
              armor_level: 0,
              owned_weapons: ['pistol'],
              equipped_weapon: 'pistol',
              referred_by: referredBy
            })
            .select()
            .single();

        if (insertError) throw insertError;
        playerData = newPlayer;

        // Ghi nhan referral vao database
        if (referredBy) {
            try {
                // Them vao bang referrals
                await supabase.from('referrals').insert({
                    referrer_id: referredBy,
                    referred_id: this.playerId
                });
                
                // Tang bien dem referral_count cho nguoi gioi thieu
                const { data: refData } = await supabase.from('players').select('referral_count').eq('id', referredBy).single();
                if (refData) {
                    await supabase.from('players').update({
                        referral_count: (refData.referral_count || 0) + 1
                    }).eq('id', referredBy);
                }
            } catch (refErr) {
                console.error('[Supabase] Referral processing error:', refErr);
            }
        }
      } else if (playerError) {
        throw playerError;
      }

      if (playerData) {
        // Retroactive Referral: Neu player da ton tai nhung chua co nguoi gioi thieu, 
        // ma ho lai vao tu 1 link ref hop le -> cho phep nhan ref do luon
        if ((!playerData.referred_by || playerData.referred_by === '') && referredBy) {
            console.log('[Supabase] Retroactive referral detected:', referredBy);
            playerData.referred_by = referredBy;
            try {
                // Update nguoi choi hien tai
                await supabase.from('players').update({ referred_by: referredBy }).eq('id', this.playerId);
                
                // Them vao bang referrals
                const { error: refInsertErr } = await supabase.from('referrals').insert({
                    referrer_id: referredBy,
                    referred_id: this.playerId
                });
                
                if (!refInsertErr || refInsertErr.code === '23505') { // 23505 = unique_violation
                    // Tang bien dem referral_count cho nguoi gioi thieu
                    const { data: refData } = await supabase.from('players').select('referral_count').eq('id', referredBy).single();
                    if (refData) {
                        await supabase.from('players').update({
                            referral_count: (refData.referral_count || 0) + 1
                        }).eq('id', referredBy);
                    }
                }
            } catch (refErr) {
                console.error('[Supabase] Retroactive Referral processing error:', refErr);
            }
        }

        this.gold = playerData.gold || 0;
        this.bestStage = playerData.best_stage || 1;
        this.bestFloor = playerData.best_floor || 1;
        this.dailyBestFloor = playerData.daily_best_floor || 1;
        this.dailyBestStage = playerData.daily_best_stage || 1;
        this.totalTonDeposited = Number(playerData.total_ton_deposited) || 0;
        this.hhtCoin = playerData.hht_coin || 0;
        this.helmetLevel = playerData.helmet_level || 0;
        this.armorLevel = playerData.armor_level || 0;
        this.ownedWeapons = playerData.owned_weapons || ['pistol'];
        this.equippedWeapon = playerData.equipped_weapon || 'pistol';
        this.checkinStreak = playerData.checkin_streak || 0;
        this.lastCheckinDate = playerData.last_checkin_date || '';
        this.completedDailyMissions = playerData.completed_daily_missions || [];
        this.completedOnetimeMissions = playerData.completed_onetime_missions || [];
        this.referralCode = playerData.referral_code || this.playerId;
        this.referredBy = playerData.referred_by || '';
        this.referralCount = playerData.referral_count || 0;
        this.claimedMilestones = playerData.claimed_milestones || [];
        this.dailyTonWithdrawn = Number(playerData.daily_ton_withdrawn) || 0;
        this.lastWithdrawDate = playerData.last_withdraw_date || '';

        // Reset daily limit if it's a new day
        const todayStr = new Date().toISOString().split('T')[0];
        if (this.lastWithdrawDate !== todayStr) {
            this.dailyTonWithdrawn = 0;
            this.lastWithdrawDate = todayStr;
        }

        // Cap nhat owned state cho weapons
        for (const [id, w] of Object.entries(this.weapons)) {
          w.owned = this.ownedWeapons.includes(id);
        }
      }

      // Luon dam bao pistol la owned
      if (this.weapons.pistol) this.weapons.pistol.owned = true;

      this.isLoaded = true;
      this.loadError = null;
      console.log('[Supabase] Data loaded successfully!', { gold: this.gold, bestFloor: this.bestFloor, ownedWeapons: this.ownedWeapons });
      return true;
    } catch (err) {
      console.error('[Supabase] Load error:', err);
      this.loadError = err.message || 'Load failed';
      // FALLBACK: dung default values de van choi duoc
      this._setDefaultWeapons();
      this.isLoaded = true;
      return false;
    }
  },

  // =============================================
  // SAVE LEN SUPABASE
  // =============================================
  async saveToSupabase() {
    if (!this.playerId) return;
    try {
      // Reset diem theo ngay UTC
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // yyyy-mm-dd (UTC)

      const updateData = {
        gold: this.gold,
        best_stage: Math.max(this.bestStage, this.currentStage),
        best_floor: Math.max(this.bestFloor, this.currentFloor),
        hht_coin: this.hhtCoin,
        total_ton_deposited: this.totalTonDeposited,
        daily_ton_withdrawn: this.dailyTonWithdrawn,
        last_withdraw_date: this.lastWithdrawDate,
        helmet_level: this.helmetLevel,
        armor_level: this.armorLevel,
        owned_weapons: this.ownedWeapons,
        equipped_weapon: this.equippedWeapon
      };

      // Logic daily reset
      const { data: currentPlay } = await supabase.from('players').select('last_reset_date, daily_best_floor, daily_best_stage').eq('id', this.playerId).single();
      
      if (currentPlay && currentPlay.last_reset_date !== todayStr) {
          // Sang ngay moi -> reset diem daily
          updateData.daily_best_floor = this.currentFloor;
          updateData.daily_best_stage = this.currentStage;
          updateData.last_reset_date = todayStr;
      } else {
          // Trong cung ngay -> cap nhat neu diem cao hon
          updateData.daily_best_floor = Math.max(currentPlay?.daily_best_floor || 0, this.currentFloor);
          updateData.daily_best_stage = Math.max(currentPlay?.daily_best_stage || 0, this.currentStage);
      }

      const { error } = await supabase
          .from('players')
          .update(updateData)
          .eq('id', this.playerId);

      if (error) throw error;

      this.bestFloor = updateData.best_floor;
      this.bestStage = updateData.best_stage;
      this.dailyBestFloor = updateData.daily_best_floor || this.dailyBestFloor;
      this.dailyBestStage = updateData.daily_best_stage || this.dailyBestStage;
      console.log('[Supabase] Saved!');
    } catch (err) {
      console.error('[Supabase] Save error:', err);
    }
  },

  // =============================================
  // DEFAULT FALLBACK (khi Supabase ko kha dung)
  // =============================================
  _setDefaultWeapons() {
    this.weapons = {
      pistol: { name: 'Pistol', desc: 'Basic Gun', rangeMultiplier: 1, speedMultiplier: 1, bulletCount: 1, spread: 0, type: 'pistol', price: 0, owned: true },
      sweep2x: { name: 'Sweep x1.5', desc: 'Sweep Range x1.5', rangeMultiplier: 1.5, speedMultiplier: 0.5, bulletCount: 1, spread: 0, type: 'sweep', price: 300, owned: false },
      sweep3x: { name: 'Sweep x2', desc: 'Sweep Range x2', rangeMultiplier: 2, speedMultiplier: 0.5, bulletCount: 1, spread: 0, type: 'sweep', price: 600, owned: false },
      sweep4x: { name: 'Sweep x3', desc: 'Sweep Range x3', rangeMultiplier: 3, speedMultiplier: 0.5, bulletCount: 1, spread: 0, type: 'sweep', price: 900, owned: false },
      shotgun: { name: 'Shotgun', desc: 'Fire 2 bullets', rangeMultiplier: 1, speedMultiplier: 0.5, bulletCount: 2, spread: 3, type: 'shotgun', price: 2000, owned: false },
      laser: { name: 'Laser Gun', desc: 'Red dot laser', rangeMultiplier: 1, speedMultiplier: 0.25, bulletCount: 1, spread: 0, type: 'laser', price: 10000, owned: false },
    };
  },

  // =============================================
  // GAME LOGIC (giữ nguyên, thêm save)
  // =============================================
  reset() {
    this.currentFloor = 1;
    this.currentStage = 1;
    // KHONG reset gold, equipment, weapons - chung la persistent
  },

  nextFloor() {
    this.currentFloor++;
    if ((this.currentFloor - 1) % 5 === 0) {
      this.currentStage++;
    }
  },

  addGold(amount) {
    this.gold += amount;
    this.saveToSupabase();
  },

  addHhtCoin(amount) {
    this.hhtCoin += amount;
    this.saveToSupabase();
  },

  buyWeapon(id) {
    const w = this.weapons[id];
    if (w && !w.owned && this.gold >= (w.price || 0)) {
      this.gold -= (w.price || 0);
      w.owned = true;
      if (!this.ownedWeapons.includes(id)) {
        this.ownedWeapons.push(id);
      }
      this.saveToSupabase();
      return true;
    }
    return false;
  },

  get helmetOwned() {
    return this.helmetLevel > 0;
  },

  get armorOwned() {
    return this.armorLevel > 0;
  },

  buyHelmet() {
    if (this.helmetLevel === 0 && this.gold >= this.helmetPrice) {
      this.gold -= this.helmetPrice;
      this.helmetLevel = 1;
      this.saveToSupabase();
      return true;
    }
    return false;
  },

  buyArmor() {
    if (this.armorLevel === 0 && this.gold >= this.armorPrice) {
      this.gold -= this.armorPrice;
      this.armorLevel = 1;
      this.saveToSupabase();
      return true;
    }
    return false;
  },

  upgradeHelmet() {
    if (this.helmetLevel > 0 && this.helmetLevel < 3 && this.gold >= this.upgradePrice) {
      this.gold -= this.upgradePrice;
      this.helmetLevel++;
      this.saveToSupabase();
      return true;
    }
    return false;
  },

  upgradeArmor() {
    if (this.armorLevel > 0 && this.armorLevel < 3 && this.gold >= this.upgradePrice) {
      this.gold -= this.armorPrice;
      this.armorLevel++;
      this.saveToSupabase();
      return true;
    }
    return false;
  },

  // =============================================
  // TON TRANSACTIONS
  // =============================================
  async logTonTransaction(packageId, goldAmount, tonAmount, boc) {
    if (!this.playerId) return;
    try {
      const { error } = await supabase.from('ton_transactions').insert({
        player_id: this.playerId,
        package_id: packageId,
        gold_amount: goldAmount,
        ton_amount: tonAmount,
        boc: boc,
        status: 'success'
      });
      if (error) {
          console.error('[Supabase] Log TON tx error:', error);
      } else {
          // Cap nhat tong nap tích lũy
          this.totalTonDeposited += Number(tonAmount);
          await supabase.from('players')
              .update({ total_ton_deposited: this.totalTonDeposited })
              .eq('id', this.playerId);
      }
    } catch (err) {
      console.error('[Supabase] Log TON tx error:', err);
    }
  },

  // =============================================
  // TOP RANKING
  // =============================================
  async fetchTopPlayers(limit = 10) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
          .from('players')
          .select('id, daily_best_stage, daily_best_floor, total_ton_deposited')
          .eq('last_reset_date', todayStr)
          .order('daily_best_stage', { ascending: false })
          .order('daily_best_floor', { ascending: false })
          .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Supabase] Fetch top players error:', err);
      return [];
    }
  },

  async dailyCheckin() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.lastCheckinDate === todayStr) return { success: false, msg: 'Already checked in' };
    const cfg = this.dailyCheckinConfig;
    let streak = this.checkinStreak + 1;
    if (streak > cfg.reset_after_days) streak = 1;
    const reward = cfg.rewards[Math.min(streak - 1, cfg.rewards.length - 1)] || 10;
    this.gold += reward;
    this.checkinStreak = streak;
    this.lastCheckinDate = todayStr;
    await supabase.from('players').update({ gold: this.gold, checkin_streak: streak, last_checkin_date: todayStr }).eq('id', this.playerId);
    return { success: true, reward, streak };
  },

  async completeDailyMission(missionId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `${missionId}_${todayStr}`;
    if (this.completedDailyMissions.includes(key)) return { success: false };
    const mission = this.dailyMissions.find(m => m.id === missionId);
    if (!mission) return { success: false };
    this.gold += mission.reward;
    this.completedDailyMissions.push(key);
    await supabase.from('players').update({ gold: this.gold, completed_daily_missions: this.completedDailyMissions }).eq('id', this.playerId);
    return { success: true, reward: mission.reward };
  },

  async completeOnetimeMission(missionId) {
    if (this.completedOnetimeMissions.includes(missionId)) return { success: false };
    const mission = this.onetimeMissions.find(m => m.id === missionId);
    if (!mission) return { success: false };
    this.gold += mission.reward;
    this.completedOnetimeMissions.push(missionId);
    await supabase.from('players').update({ gold: this.gold, completed_onetime_missions: this.completedOnetimeMissions }).eq('id', this.playerId);
    return { success: true, reward: mission.reward };
  },

  async checkTelegramJoin(missionId) {
    try {
        const mission = [...this.dailyMissions, ...this.onetimeMissions].find(m => m.id === missionId);
        
        // Neu KHONG co chat_id (vi du link ref game khac), cho phep claim luon
        if (!mission || !mission.telegram_chat_id) {
            console.log(`[Verify] No chat_id for ${missionId}, skipping verification.`);
            return true;
        }

        console.log(`[Verify] Checking membership for: ${mission.telegram_chat_id}`);

        const { data, error } = await supabase.functions.invoke('verify-telegram-join', {
            body: JSON.stringify({ 
                userId: String(this.playerId), 
                chatId: String(mission.telegram_chat_id) 
            })
        });

        if (error) {
            console.error("[Verify] Edge Function error details:", error);
            // Neu loi CORS, co the do Function bi sap hoac sai URL
            return false;
        }
        
        console.log(`[Verify] Result for ${missionId}:`, data);
        return data && data.isMember;
    } catch (err) {
        console.error("[Verify] Failed to check membership:", err);
        return false;
    }
  },

  getBossHhtReward(floor) {
    const { spawnInterval, baseHhtReward, hhtRewardStep } = this.bossConfig;
    // Tinh xem day la con boss thu may (vi du boss tang 10 la con so 1, tang 20 la so 2)
    const bossNumber = Math.max(1, Math.floor(floor / spawnInterval));
    return baseHhtReward + (bossNumber - 1) * hhtRewardStep;
  },

  swapHhtToTon(hhtAmount) {
      if (this.hhtCoin < hhtAmount) return { success: false, msg: "Not enough HHT Coin!" };
      const rate = this.exchangeConfig.hhtToTonRate;
      const tonReceived = hhtAmount / rate;
      
      this.hhtCoin -= hhtAmount;
      this.totalTonDeposited += tonReceived; // Add to in-game TON balance
      this.saveToSupabase();
      return { success: true, msg: `Swapped ${hhtAmount} HHT for ${tonReceived.toFixed(2)} TON!`, tonReceived };
  },

  deductTon(tonAmount) {
      if (this.totalTonDeposited >= tonAmount) {
          this.totalTonDeposited -= tonAmount;
          this.saveToSupabase();
          return true;
      }
      return false;
  },

  depositTon(tonAmount) {
      // Called after successful TonConnect transaction
      this.totalTonDeposited += tonAmount;
      this.saveToSupabase();
      return { success: true, msg: `Deposited ${tonAmount} TON successfully!` };
  },

  withdrawTon(tonAmount) {
      if (this.totalTonDeposited < tonAmount) return { success: false, msg: "Not enough TON balance!" };

      // 1. Find highest unlocked milestone
      let highestMilestone = null;
      const milestones = this.referralConfig.milestones || [];
      for (const m of milestones) {
          if (this.referralCount >= m.count && this.totalTonDeposited >= (m.required_ton || 0)) {
              highestMilestone = m;
          }
      }

      if (!highestMilestone) {
          return { success: false, msg: "You haven't reached any withdrawal milestone (requires referrals + deposit)." };
      }

      // 2. Check daily limits
      const limit = highestMilestone.daily_withdraw_limit || 0;
      if (this.dailyTonWithdrawn + tonAmount > limit) {
          return { success: false, msg: `Daily withdraw limit exceeded! Your current limit is ${limit} TON/day. You have already withdrawn ${this.dailyTonWithdrawn.toFixed(2)} TON today.` };
      }

      // 3. Process withdrawal (Deduct fee)
      const feePercent = this.exchangeConfig.withdrawFeePercent;
      const feeAmount = (tonAmount * feePercent) / 100;
      const amountAfterFee = tonAmount - feeAmount;

      this.totalTonDeposited -= tonAmount;
      this.dailyTonWithdrawn += tonAmount;
      this.lastWithdrawDate = new Date().toISOString().split('T')[0];
      
      this.saveToSupabase();

      // TODO: Actual blockchain transfer goes here
      return { success: true, msg: `Withdrawal of ${amountAfterFee.toFixed(2)} TON initiated (Fee: ${feeAmount.toFixed(2)} TON).` };
  },

  async fetchReferrals() {
    try {
      const { data, error } = await supabase.from('referrals').select('referred_id, created_at').eq('referrer_id', this.playerId).order('created_at', { ascending: false });
      if (error) throw error;
      this.referralList = data || [];
      this.referralCount = this.referralList.length;
      return this.referralList;
    } catch (err) { return []; }
  },

  async claimMilestone(count) {
    if (this.claimedMilestones.includes(count)) return { success: false };
    if (this.referralCount < count) return { success: false };
    const milestone = this.referralConfig.milestones.find(m => m.count === count);
    if (!milestone) return { success: false };
    this.gold += milestone.reward;
    this.claimedMilestones.push(count);
    await supabase.from('players').update({ gold: this.gold, claimed_milestones: this.claimedMilestones }).eq('id', this.playerId);
    return { success: true, reward: milestone.reward };
  }
};
