const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const minecraftData = require('minecraft-data')

function startBot() {
  const bot = mineflayer.createBot({
    host: 'LastStandMC.aternos.me',
    port: 41963,
    username: 'WoodBot2',
    version: '1.21'
  })

  bot.loadPlugin(pathfinder)

  let mcData
  let move
  let basePos = null

  // ✅ GLOBAL STATE (NO MORE ERRORS)
  let craftingInProgress = false
  let hasPickaxe = false

  bot.on('spawn', () => {
    console.log('Spawned')

    mcData = minecraftData(bot.version)
    move = new Movements(bot, mcData)

    move.allowDigging = true
    move.allowSprinting = true
    move.allowParkour = false

    bot.pathfinder.setMovements(move)

    setTimeout(() => {
      bot.chat('/login chalol78')
    }, 3000)

    setTimeout(() => {
      basePos = bot.entity.position.clone()
      console.log('Base set')
    }, 7000)

    setInterval(mainAI, 5000)
  })

  // 🌲 FIND LOG
  function findLog() {
    return bot.findBlock({
      matching: b => b.name.includes('log'),
      maxDistance: 32
    })
  }

  // ⚔️ COMBAT
  function fightMobs() {
    const mob = Object.values(bot.entities)
      .filter(e =>
        e.type === 'mob' &&
        e.position.distanceTo(bot.entity.position) < 6
      )[0]

    if (!mob) return false

    console.log('Fighting:', mob.name)
    bot.lookAt(mob.position.offset(0, 1, 0))
    bot.attack(mob)
    return true
  }

  // 🧠 SAFE TOOL CHECK
  async function ensureTools() {
    if (craftingInProgress) return
    if (hasPickaxe) return

    const pickaxe = bot.inventory.items().find(i =>
      i.name.includes('pickaxe')
    )

    if (pickaxe) {
      hasPickaxe = true
      return
    }

    craftingInProgress = true
    console.log('⚒ No pickaxe → crafting started')

    await craftTools()

    setTimeout(() => {
      craftingInProgress = false
    }, 12000)
  }

  // ⚒️ STABLE CRAFT SYSTEM
  async function craftTools() {
    try {
      const mc = mcData

      // LOG → PLANKS
      const log = bot.inventory.items().find(i => i.name.includes('log'))
      if (log) {
        const recipe = bot.recipesFor(mc.itemsByName.oak_planks.id, null, 1, null)[0]
        if (recipe) await bot.craft(recipe, 1, null)
      }

      // PLANKS → STICKS
      const plank = bot.inventory.items().find(i => i.name.includes('planks'))
      if (plank) {
        const recipe = bot.recipesFor(mc.itemsByName.stick.id, null, 1, null)[0]
        if (recipe) await bot.craft(recipe, 1, null)
      }

      // PICKAXE
      const pickaxeRecipe =
        bot.recipesFor(mc.itemsByName.wooden_pickaxe.id, null, 1, null)[0]

      const sticks = bot.inventory.items().find(i => i.name.includes('stick'))
      const planks = bot.inventory.items().find(i => i.name.includes('planks'))

      if (pickaxeRecipe && sticks && planks) {
        await bot.craft(pickaxeRecipe, 1, null)
        hasPickaxe = true
        console.log('✔ Pickaxe crafted successfully')
      }

    } catch (e) {
      console.log('Craft error:', e.message)
    }
  }

  // 🌲 TREE CUTTING
  async function chopTree() {
    if (!hasPickaxe) return false

    const log = findLog()
    if (!log) return false

    try {
      await bot.pathfinder.goto(
        new goals.GoalBlock(log.position.x, log.position.y, log.position.z)
      )

      await bot.dig(log)
      console.log('Chopped tree')
      return true
    } catch (e) {
      return false
    }
  }

  // 🏠 BASE STAY
  function stayNearBase() {
    if (!basePos) return

    const p = bot.entity.position
    const dist =
      Math.abs(p.x - basePos.x) +
      Math.abs(p.z - basePos.z)

    if (dist > 15) {
      bot.pathfinder.setGoal(
        new goals.GoalBlock(basePos.x, basePos.y, basePos.z)
      )
    }
  }

  // 🚶 WANDER
  function wander() {
    const p = bot.entity.position

    const x = Math.floor(p.x + (Math.random() * 6 - 3))
    const z = Math.floor(p.z + (Math.random() * 6 - 3))

    bot.pathfinder.setGoal(
      new goals.GoalBlock(x, p.y, z)
    )
  }

  // 🧠 MAIN AI (CLEAN + CONTROLLED)
  async function mainAI() {
    try {
      stayNearBase()

      await ensureTools()

      if (fightMobs()) return
      if (await chopTree()) return

      wander()

    } catch (e) {
      console.log('AI error:', e.message)
    }
  }

  // 💀 DEATH
  bot.on('death', () => {
    console.log('Died → respawning')
    setTimeout(() => bot.emit('respawn'), 3000)
  })

  // 🔁 RESTART
  bot.on('end', () => {
    console.log('Restarting bot')
    setTimeout(startBot, 5000)
  })

  bot.on('kicked', console.log)
  bot.on('error', console.log)
}

startBot()
