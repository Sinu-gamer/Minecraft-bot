const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const minecraftData = require('minecraft-data')

function startBot() {
  const bot = mineflayer.createBot({
    host: 'LastStandMC.aternos.me',
    port: 41963,
    username: 'WoodBot',
    version: '1.21'
  })

  bot.loadPlugin(pathfinder)

  let mcData
  let move
  let basePos = null
  let hasPickaxe = false
  let craftingDone = false

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
      console.log('Base set:', basePos)
    }, 7000)

    setInterval(mainAI, 6000)
  })

  // 🌲 FIND LOG
  function findLog() {
    return bot.findBlock({
      matching: b => b.name.includes('log'),
      maxDistance: 32
    })
  }

  // ⚔️ SIMPLE COMBAT
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

  // 🧠 PRIORITY 1: TOOL CHECK
  async function ensureTools() {
    const pickaxe = bot.inventory.items().find(i =>
      i.name.includes('pickaxe')
    )

    if (pickaxe) {
      hasPickaxe = true
      return
    }

    console.log('No pickaxe → crafting system starting')
    await craftTools()
  }

  // ⚒️ FULL CRAFT SYSTEM (FIXED)
  async function craftTools() {
    try {
      const mc = mcData

      // STEP 1: LOG → PLANKS
      const log = bot.inventory.items().find(i => i.name.includes('log'))
      if (log) {
        const recipe = bot.recipesFor(mc.itemsByName.oak_planks.id, null, 1, null)[0]
        if (recipe) await bot.craft(recipe, 1, null)
      }

      // STEP 2: PLANKS → STICKS
      const plank = bot.inventory.items().find(i => i.name.includes('planks'))
      if (plank) {
        const recipe = bot.recipesFor(mc.itemsByName.stick.id, null, 1, null)[0]
        if (recipe) await bot.craft(recipe, 1, null)
      }

      // STEP 3: CRAFT TABLE
      const tableRecipe =
        bot.recipesFor(mc.itemsByName.crafting_table.id, null, 1, null)[0]

      const planks = bot.inventory.items().find(i => i.name.includes('planks'))

      if (tableRecipe && planks) {
        await bot.craft(tableRecipe, 1, null)
        console.log('Crafted crafting table')
      }

      // STEP 4: PICKAXE
      const pickaxeRecipe =
        bot.recipesFor(mc.itemsByName.wooden_pickaxe.id, null, 1, null)[0]

      const sticks = bot.inventory.items().find(i => i.name.includes('stick'))
      const planks2 = bot.inventory.items().find(i => i.name.includes('planks'))

      if (pickaxeRecipe && sticks && planks2) {
        await bot.craft(pickaxeRecipe, 1, null)
        console.log('✔ Pickaxe crafted')
        craftingDone = true
      }

    } catch (e) {
      console.log('Craft error:', e.message)
    }
  }

  // 🌲 TREE CUTTING (ONLY AFTER TOOLS)
  async function chopTree() {
    if (!craftingDone) return false

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

  // 🏠 BASE CONTROL
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

  // 🧠 MAIN PRIORITY SYSTEM
  async function mainAI() {
    try {
      stayNearBase()

      // 🔥 PRIORITY ORDER
      await ensureTools()   // 1st priority
      if (await chopTree()) return
      if (fightMobs()) return

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