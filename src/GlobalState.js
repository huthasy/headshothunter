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
  dailyCheckinConfig: { rewards: [10,20,30,50,80,120,200], reset_after_days: 7 },
  dailyMissions: [],
  onetimeMissions: [],
  referralConfig: { f1_percent:10, f2_percent:5, f3_percent:2, milestones:[], bot_link:'' },

  // === PLAYER MISSION STATE ===
  checkinStreak: 0,
  lastCheckinDate: '',
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
              equipped_weapon: 'pistol'
            })
            .select()
            .single();

        if (insertError) throw insertError;
        playerData = newPlayer;
      } else if (playerError) {
        throw playerError;
      }

      if (playerData) {
        this.gold = playerData.gold || 0;
        this.bestStage = playerData.best_stage || 1;
        this.bestFloor = playerData.best_floor || 1;
        this.dailyBestFloor = playerData.daily_best_floor || 1;
        this.dailyBestStage = playerData.daily_best_stage || 1;
        this.totalTonDeposited = Number(playerData.total_ton_deposited) || 0;
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
    // Auto save moi khi nhan gold
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
        // Lay thong tin nhiem vu tu config de biet Group ID can check
        const mission = [...this.dailyMissions, ...this.onetimeMissions].find(m => m.id === missionId);
        if (!mission || !mission.telegram_chat_id) {
            console.warn("Mission config missing telegram_chat_id");
            return true; // Cho qua neu ko cau hinh chat id
        }

        // Goi Supabase Edge Function de check (an toan hon vi Bot Token nằm ở Server)
        const { data, error } = await supabase.functions.invoke('verify-telegram-join', {
            body: { 
                userId: this.playerId, 
                chatId: mission.telegram_chat_id 
            }
        });

        if (error) throw error;
        return data.isMember; // Tra ve true/false tu bot
    } catch (err) {
        console.error("Verification failed:", err);
        return false;
    }
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
