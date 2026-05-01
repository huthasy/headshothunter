import { supabase, getPlayerId } from './SupabaseClient.js';

export const GlobalState = {
  // === PLAYER DATA (luu tren Supabase) ===
  playerId: null,
  currentFloor: 1,
  currentStage: 1,
  gold: 0,
  bestFloor: 1,
  bestStage: 1,
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
        this.helmetLevel = playerData.helmet_level || 0;
        this.armorLevel = playerData.armor_level || 0;
        this.ownedWeapons = playerData.owned_weapons || ['pistol'];
        this.equippedWeapon = playerData.equipped_weapon || 'pistol';

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
      // Cap nhat best score neu can
      const newBestFloor = Math.max(this.bestFloor, this.currentFloor);
      const newBestStage = Math.max(this.bestStage, this.currentStage);

      const { error } = await supabase
          .from('players')
          .update({
            gold: this.gold,
            best_stage: newBestStage,
            best_floor: newBestFloor,
            helmet_level: this.helmetLevel,
            armor_level: this.armorLevel,
            owned_weapons: this.ownedWeapons,
            equipped_weapon: this.equippedWeapon
          })
          .eq('id', this.playerId);

      if (error) throw error;

      this.bestFloor = newBestFloor;
      this.bestStage = newBestStage;
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
      pistol: { name: 'Pistol', desc: 'Súng cơ bản', rangeMultiplier: 1, speedMultiplier: 1, bulletCount: 1, spread: 0, type: 'pistol', price: 0, owned: true },
      sweep2x: { name: 'Sweep x2', desc: 'Tầm ngắm x2', rangeMultiplier: 2, speedMultiplier: 1, bulletCount: 1, spread: 0, type: 'sweep', price: 0, owned: false },
      sweep3x: { name: 'Sweep x3', desc: 'Tầm ngắm x3', rangeMultiplier: 3, speedMultiplier: 1, bulletCount: 1, spread: 0, type: 'sweep', price: 0, owned: false },
      sweep4x: { name: 'Sweep x4', desc: 'Tầm ngắm x4', rangeMultiplier: 4, speedMultiplier: 1, bulletCount: 1, spread: 0, type: 'sweep', price: 0, owned: false },
      shotgun: { name: 'Shotgun', desc: 'Bắn 2 viên rải', rangeMultiplier: 1, speedMultiplier: 1, bulletCount: 2, spread: 3, type: 'shotgun', price: 0, owned: false },
      laser: { name: 'Laser Gun', desc: 'Chấm đỏ laser', rangeMultiplier: 1, speedMultiplier: 0.25, bulletCount: 1, spread: 0, type: 'laser', price: 0, owned: false },
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
      if (error) console.error('[Supabase] Log TON tx error:', error);
    } catch (err) {
      console.error('[Supabase] Log TON tx error:', err);
    }
  },

  // =============================================
  // TOP RANKING
  // =============================================
  async fetchTopPlayers(limit = 10) {
    try {
      const { data, error } = await supabase
          .from('players')
          .select('id, best_stage, best_floor, gold')
          .order('best_stage', { ascending: false })
          .order('best_floor', { ascending: false })
          .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Supabase] Fetch top players error:', err);
      return [];
    }
  }
};
