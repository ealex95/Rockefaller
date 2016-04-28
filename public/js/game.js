/* ************************************************
** CLIENT CODE
************************************************ */

// Global Socket Variables
var socket = io.connect()
var clientID

// Global Game Variables
var game = new Phaser.Game(1500, 800)
var gameRunning = false
var gameID = -1
var spawnCoordX
var player
var equipment = []
var pups = []
var hearties = []
var players = []
var dataArray = []
var cursors
var glueKey
var mslKey
var eggKey
var singlePlayer = false
var timeScore
var timerText
var numMulti = 1

//misc menu variables
var createText = true
var discText
var lavaPos1 = 0
var lavaPos2 = 0
var fullLock = false

//player attributes
//reset in the mainState
var dead = false
var mobile = false
var glue = 0
var missiles = 0
var lives = 3
var shield = 0
var canUsePUP = true
var canUseMsl = true
var canUseEgg = true
var recursiveEgg = false
var flightMeter = 0
var speedMeter = 0
var hatMeter = 0
var slowMeter = 0
var finalScore = 0.0
var won = false
var wonSwitch = false

//sprite groups
var normals
var diagonals
var powersups
var flames
var hots
var sideways
var glues
var wings
var shoes
var hardhats
var snails
var hearts
var bullets

//sound effects
var enemyDeath
var missileFire
var oneUp
var applyGlue
var die
var emberHiss
var enemyHurt1
var enemyHurt2
var enemyHurt3
var fallingFire
var fireFireball
var getFast
var getGlue
var getHardhat
var getMissiles
var getSlow
var getWings
var hurt1
var hurt2
var hurt3
var PUP
var rockFall
var shockwave
var smallRockFall
var snailDerpLeft
var snailDerpRight

//music
var bop
var hell
var lol

// Global State and Misc. Variables

// var qLength - needed for updating "waiting on players..." - needs implementation


//**************************************************

// Find player by ID
function playerById (id) {
  
	for (var i = 0; i < players.length; i++) {
		if (players[i].player.name === id)
			return players[i]
	}

	return false
}

var setEventHandlers = function () {

	//game setup messages
	socket.on('connect', onSocketConnected)					//check
	socket.on('disconnect', onSocketDisconnect)				//check
	socket.on('setup game', onSetupGame)					//check
	socket.on('player joined', onPlayerJoined)				//check
	
	//player handler messages
	socket.on('move player', onMovePlayer)					//check
	socket.on('remove player', onRemovePlayer)				//check
	socket.on('hurt', playerHurt)							//check
	socket.on('better', playerBetter)						//check
	socket.on('dead', playerDead)							//check
	
	//obstacle spawn messages
	socket.on('spawn diagonal rock', onSpawnDiagonalRock)	//check
	socket.on('spawn flame rock', onSpawnFlameRock)			//check
	socket.on('spawn hot rock', onSpawnHotRock)				//check
	socket.on('spawn fireball', onSpawnFireball)			//check
	socket.on('spawn rock', onSpawnRock)					//check
	
	//powerup spawn messages
	socket.on('spawn wings', onSpawnWings)					//check
	socket.on('spawn shoe', onSpawnShoe)					//check
	socket.on('spawn hardhat', onSpawnHardhat)				//check
	socket.on('spawn snail', onSpawnSnail)					//check
	socket.on('spawn heart', onSpawnHeart)					//check
	socket.on('spawn bullet', onSpawnBullet)				//check
	socket.on('spawn paralyze', onSpawnGlue)				//check
	
	//powerup pickup messages for enemies
	socket.on('got glue', onGotGlue)						//check
	socket.on('got missiles', onGotMissiles)				//check
	socket.on('new equip', onNewEq)							//check

	//weapon usage messages from enemies
	socket.on('use glue', onUseGlue)						//check
	socket.on('immobile pup', immobilePUP)					//check
	socket.on('use missile', onUseMissile)					//check
	socket.on('fire missiles', fireMissiles)				//check

	//misc related to despawning
	socket.on('remove equip', onRemoveEq)					//check
	socket.on('flash equip', onFlashEq)						//check
	socket.on('unflash equip', onUnflashEq)					//check
	socket.on('remove pup', removePUP)						//check

}

function gofull() {

	if(fullLock)
		return

	console.log('goFull')

	if (game.scale.isFullScreen)
	{
		game.scale.stopFullScreen();
	}
	else
	{
		game.scale.startFullScreen(false);
	}

}

// Socket connected
function onSocketConnected () {
	console.log('Connected to socket server')
}

// Socket disconnected
function onSocketDisconnect () {
	console.log('Disconnected from socket server')
	
	gameID = -1
}

// Start Game
function onSetupGame (data) {
	clientID = data.cID
	gameID = data.gID
	spawnCoordX = data.spawnX
	numMulti = data.nm
	
	console.log('You are connected to game: ' + clientID)

	game.state.start('game')
}

// Get other player data
function onPlayerJoined (data) {
	dataArray.push(data)
}

function joinPlayer () {
	var data = dataArray.shift()
	
	console.log('New player connected:', data.id)
	
	// Add new player to the remote players array
	players.push(new RemotePlayer(data.id, game, player, data.x, data.y, 0, 0))
}

// Move player
function onMovePlayer (data) {
	if (gameRunning == false)
		return
	
	var movePlayer = playerById(data.id)

	// Player not found
	if (!movePlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	// Update player position
	movePlayer.player.x = data.x
	movePlayer.player.y = data.y
	
	// Update equipment position
	movePlayer.moveEquip();
}

// Remove player
function onRemovePlayer (data) {
	// if (gameRunning == false)
		// return
	
	var removePlayer = playerById(data.id)
	
	

	// Player not found
	if (!removePlayer) {
		console.log('Player not found: ', data.id)
		return
	}
	
	console.log('Player disconnected:', data.id)

	for(var i = 0; i < removePlayer.equip.length; i++)
	{
		removePlayer.equip[i].kill();
	}	
	
	removePlayer.player.kill()

	// Remove player from array
	players.splice(players.indexOf(removePlayer), 1)
	
	discText = game.add.text(game.world.centerX, 200, "A player has disconnected");
			
	discText.anchor.set(0.5);
	discText.align = 'center';
	discText.font = 'Arial';
	discText.fontWeight = 'bold';
	discText.fontSize = 58;
	
	var grd = discText.context.createLinearGradient(0, 0, 0, discText.height);
	grd.addColorStop(0, '#ffffff');
	grd.addColorStop(1, '#ffffff');
	discText.fill = grd;
	
	setTimeout(function() {discText.destroy();}, 3000);
}

//Add glue to RemotePlayer
function onGotGlue (data) {
	var gluePlayer = playerById(data.id)

	// Player not found
	if (!gluePlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	gluePlayer.addGlue();

	console.log('gotGlue: player ' + data.id + ' has ' + gluePlayer.glue + ' glue');
}

//Add missiles to RemotePlayer
function onGotMissiles (data) {
	var missilePlayer = playerById(data.id)

	// Player not found
	if (!missilePlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	missilePlayer.addMissiles();

	console.log('gotMissiles: player ' + data.id + ' has ' + missilePlayer.missiles + ' missiles');
}

//Use RemotePlayer glue
function onUseGlue (data) {
	var gluePlayer = playerById(data.id)

	// Player not found
	if (!gluePlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	gluePlayer.useGlue();

	console.log('useGlue: player ' + data.id + ' has ' + gluePlayer.glue + ' glue');
}

//Use RemotePlayer missile
function onUseMissile (data) {
	var missilePlayer = playerById(data.id)

	// Player not found
	if (!missilePlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	missilePlayer.useMissile();

	console.log('useMissile: player ' + data.id + ' has ' + missilePlayer.missiles + ' missiles');
}

function immobilePUP (data) {

	console.log('immobilePUP activated by player ' + data.id);
	  
	mobile = false;
	
	if(!dead) player.loadTexture('guyStunned');
  
	for(var i = 0; i < players.length; i++)
	{
		if(players[i] != playerById(data.id))
		{
			if(!players[i].dead)  players[i].player.loadTexture('guyStunned');
		}
	}
	
	applyGlue.play();
  
	setTimeout(makeMobile, 1000);
}

function makeMobile () {

	console.log('makeMobile: player ' + player.id + ' has ' + glue + ' glue, ' + missiles + ' missiles');

	mobile = true

	if(dead)
		player.loadTexture('guyDead');
	
	else
	{
		if(glue > 0 && missiles > 0)
			player.loadTexture('player_both');

		else if(glue > 0)
			player.loadTexture('player_glue');

		else if(missiles > 0)
			player.loadTexture('player_missile');

		else
			player.loadTexture('player');
	}
  
	for(var i = 0; i < players.length; i++)
	{
		console.log('makeMobile: player ' + players[i].player.name + ' has ' + players[i].glue + ' glue, ' + players[i].missiles + ' missiles');

		if(players[i].dead)
			players[i].player.loadTexture('guyDead');

		else if(players[i].glue > 0 && players[i].missiles > 0)
			players[i].player.loadTexture('enemy_both');

		else if(players[i].glue > 0)
			players[i].player.loadTexture('enemy_glue');

		else if(players[i].missiles > 0)
			players[i].player.loadTexture('enemy_missile');

		else
			players[i].player.loadTexture('enemy');
	}
  
	canUsePUP = true;
}

function fireMissiles (data) {
	console.log('someone fired missiles at (' + data.xcor + ',' + data.ycor + ')');

	var missileLeft = game.add.sprite(data.xcor - 51, data.ycor + 10, 'missileLeft');
	var missileRight = game.add.sprite(data.xcor + 51, data.ycor + 10, 'missileRight');

	sideways.add(missileLeft);
	sideways.add(missileRight);

	game.physics.arcade.enable(missileLeft);
	game.physics.arcade.enable(missileRight);

	missileLeft.body.velocity.x = -1000;
	missileRight.body.velocity.x = 1000;
	
	missileFire.play();
}

function reloadMsl () {
	canUseMsl = true
}

function removePUP (data) {

	console.log('removePUP: ' + data.id);

	for(var i = 0; i < pups.length; i++)
	{
		if(pups[i].id == data.id)
		{
			pups[i].kill();
			pups.splice(i, 1);
		}
	}
}

//Add enemy equipment
function onNewEq (data) {
	var eqPlayer = playerById(data.id)

	// Player not found
	if (!eqPlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	console.log('newEq: ' + data.type + ' playerID: ' + data.id);

	var equip

	switch(data.type)
	{
		case 1:
			equip = game.add.sprite(eqPlayer.player.x - 29, eqPlayer.player.y, 'equipWings');
			break;
		case 2:
			equip = game.add.sprite(eqPlayer.player.x + 50, eqPlayer.player.y - 10, 'equipFast');
			break;
		case 3:
			equip = game.add.sprite(eqPlayer.player.x + 2, eqPlayer.player.y - 30, 'equipHardhat');
			break;
		case 4:
			equip = game.add.sprite(eqPlayer.player.x - 14, eqPlayer.player.y - 10, 'equipSlow');
			break;
		default:
	}

	equip.id = data.type;
	eqPlayer.giveEquip(equip);
}

//Remove enemy equipment
function onRemoveEq (data) {
	var eqPlayer = playerById(data.id)

	// Player not found
	if (!eqPlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	console.log('removeEq: ' + data.type + ' playerID: ' + data.id);

	eqPlayer.removeEquip(data.type);
}

function onFlashEq (data) {
	var eqPlayer = playerById(data.id)

	// Player not found
	if (!eqPlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	console.log('flashEq: ' + data.type + ' playerID: ' + data.id);

	var eqFlash

	for(var i = 0; i < eqPlayer.equip.length; i++)
	{
		if(eqPlayer.equip[i].id == data.type)
		{
			eqFlash = eqPlayer.equip[i];
		}
	}

	switch(data.type)
	{
		case 1:
			eqFlash.loadTexture('flashWings');
			break;
		case 2:
		case 4:
			eqFlash.loadTexture('flashSpeed');
			break;
		case 3:
			eqFlash.loadTexture('flashHardhat');
			break;
		default:
	}
}

function onUnflashEq (data) {
	var eqPlayer = playerById(data.id)

	// Player not found
	if (!eqPlayer) {
		console.log('Player not found: ', data.id)
		return
	}

	console.log('unflashEq: ' + data.type + ' playerID: ' + data.id);

	var eqFlash

	for(var i = 0; i < eqPlayer.equip.length; i++)
	{
		if(eqPlayer.equip[i].id == data.type)
		{
			eqFlash = eqPlayer.equip[i];
		}
	}

	switch(data.type)
	{
		case 1:
			eqFlash.loadTexture('equipWings');
			break;
		case 2:
			eqFlash.loadTexture('equipFast');
			break;
		case 4:
			eqFlash.loadTexture('equipSlow');
			break;
		case 3:
			eqFlash.loadTexture('equipHardhat');
			break;
		default:
	}
}

function onSpawnRock (data) {
	var rock = game.add.sprite(data.pos, -100, 'rock')

	rock.noise = true
	
	normals.add(rock)
	
	game.physics.arcade.enable(rock)
	rock.body.velocity.y = data.sp
	rock.body.gravity.y = 1000
}

function onSpawnFlameRock (data) {
	var flameRock = game.add.sprite(data.pos, -250, 'flameRock')
	
	flameRock.burn = true;
	flames.add(flameRock)
	
	game.physics.arcade.enable(flameRock)
	flameRock.body.velocity.y = data.sp
	flameRock.body.gravity.y = 1000
	
	fallingFire.play();
}

function onSpawnHotRock (data) {
	var hotRock = game.add.sprite(data.pos, -250, 'hotRock')
	
	hotRock.burn = true
	hots.add(hotRock)
	
	game.physics.arcade.enable(hotRock)
	hotRock.body.velocity.y = data.sp
	hotRock.body.gravity.y = 1000
	
	fallingFire.play();
}

function onSpawnDiagonalRock (data) {
	var diagonalRock = game.add.sprite(data.pos, -100, 'diagonalRock')

	diagonalRock.noise = true
	
	diagonals.add(diagonalRock)
	
	game.physics.arcade.enable(diagonalRock)
	diagonalRock.body.velocity.y = data.sp
	diagonalRock.body.velocity.x = data.xSP
	diagonalRock.body.gravity.y = 1000
}

function onSpawnFireball (data) {
	var fireball
	
	if(data.pos > 0) fireball = game.add.sprite(data.pos, data.ht, 'fireballLeft')
	else			 fireball = game.add.sprite(data.pos, data.ht, 'fireballRight')

	sideways.add(fireball)
	
	game.physics.arcade.enable(fireball)
	fireball.body.velocity.x = data.sp
	
	fireFireball.play();
}

function spawnEmber (ground, flame) {
	if(flame.burn)
	{
		flame.burn = false
		
		var ember = game.add.sprite(flame.x, 600, 'ember')
		
		sideways.add(ember)
		game.physics.arcade.enable(ember)		
		ember.body.velocity.y = 40
		
		emberHiss.play();
	}
}

function spawnWave (ground, hot) {
	if(hot.burn)
	{
		hot.burn = false
		
		var waveLeft = game.add.sprite(hot.x, 720, 'waveLeft')
		var waveRight = game.add.sprite(hot.x, 720, 'waveRight')
		
		sideways.add(waveLeft)
		sideways.add(waveRight)
		
		game.physics.arcade.enable(waveLeft)
		game.physics.arcade.enable(waveRight)
		
		waveLeft.body.velocity.x = -1500
		waveRight.body.velocity.x = 1500
		
		shockwave.play();
	}
}

function playNoise (ground, rock) {

  if(rock.noise)
  {
	rock.noise = false;
	rockFall.play();
  }
}

function playSmallNoise (ground, rock) {

  if(rock.noise)
  {
	rock.noise = false;
	smallRockFall.play();
  }
}

function onSpawnWings (data) {

	console.log('spawnWings: ' + data.id);

	var wing = game.add.sprite(data.pos, -100, 'wings');

	wing.id = data.id;  
	pups.push(wing);
	
	wings.add(wing);

	game.physics.arcade.enable(wing);
	wing.body.velocity.y = 100;
	wing.body.gravity.y = 200;

	PUP.play();
}

function onSpawnShoe (data) {

	console.log('spawnShoe: ' + data.id);

	var shoe = game.add.sprite(data.pos, -100, 'shoe');

	shoe.id = data.id;
	pups.push(shoe);

	shoes.add(shoe);

	game.physics.arcade.enable(shoe);
	shoe.body.velocity.y = 100;
	shoe.body.gravity.y = 200;
	
	PUP.play();
}

function onSpawnHardhat (data) {

	console.log('spawnHardhat: ' + data.id);

	var hat = game.add.sprite(data.pos, -100, 'hardhat');

	hat.id = data.id;

	pups.push(hat);
	hardhats.add(hat);

	game.physics.arcade.enable(hat);
	hat.body.velocity.y = 100;
	hat.body.gravity.y = 200;
	
	PUP.play();
}

function onSpawnSnail (data) {

	console.log('spawnSnail: ' + data.id);

	var snail

	if(data.pos > 0) 
	{
		snail = game.add.sprite(data.pos, 720, 'snailLeft');
		
		snailDerpLeft.play();
	}
	else
	{	
		snail = game.add.sprite(data.pos, 720, 'snailRight');
		
		snailDerpRight.play();
	}

	snail.id = data.id;

	pups.push(snail);
	snails.add(snail);

	game.physics.arcade.enable(snail);
	snail.body.velocity.x = data.sp;
}

function onSpawnHeart (data) {

	console.log('spawnHeart: ' + data.id);

	var heart = game.add.sprite(data.pos, -100, 'heart');

	heart.id = data.id;
	pups.push(heart);

	hearts.add(heart);

	game.physics.arcade.enable(heart);
	heart.body.velocity.y = 100;
	heart.body.gravity.y = 200;
	
	PUP.play();
}

function onSpawnBullet (data) {

	console.log('spawnBullet: ' + data.id);

	var bullet = game.add.sprite(data.pos, -100, 'bullet');

	bullet.id = data.id;
	pups.push(bullet);

	bullets.add(bullet);

	game.physics.arcade.enable(bullet);
	bullet.body.velocity.y = 100;
	bullet.body.gravity.y = 200;
	
	PUP.play();
}

function onSpawnGlue (data) {

	console.log('spawnGlue: ' + data.id);

	var par = game.add.sprite(data.pos, -100, 'glue');

	par.id = data.id;
	pups.push(par);

	glues.add(par);

	game.physics.arcade.enable(par);
	par.body.velocity.y = 100;
	par.body.gravity.y = 200; 
	
	PUP.play();
}

function playerHurt (data) {

	console.log('playerHurtID: ' + data.id); 

	for(var i = 0; i < players.length; i++)
	{
		if(players[i] == playerById(data.id))
		{
			players[i].player.loadTexture('guyHurt');

			var rand = Math.floor(Math.random() * 3);

			switch(rand)
			{
				case 1:
					enemyHurt1.play();
					break;
				case 2:
					enemyHurt2.play();
					break;
				default:
					enemyHurt3.play();
					break;
			}
		}
	}
}

function playerBetter (data) {

	for(var i = 0; i < players.length; i++)
	{
		if(players[i] == playerById(data.id))
		{
			console.log('playerBetterID: ' + players[i].player.name + ' has ' + players[i].glue + ' glue, ' + players[i].missiles + ' missiles');

			if(players[i].glue > 0 && players[i].missiles > 0)
				players[i].player.loadTexture('enemy_both');

			else if(players[i].glue > 0)
				players[i].player.loadTexture('enemy_glue');

			else if(players[i].missiles > 0)
				players[i].player.loadTexture('enemy_missile');

			else
				players[i].player.loadTexture('enemy');
		}
	}
}

function playerDead (data) {

	console.log('playerDeadID: ' + data.id);

	var didIWin = true

	for(var i = 0; i < players.length; i++)
	{
		if(players[i] == playerById(data.id))
		{
			players[i].player.loadTexture('guyDead');
			players[i].dead = true;
			
			enemyDeath.play();
		}

		didIWin &= players[i].dead;
	}


	if(didIWin)
		won = true;
	
}

function addGlue (player, powerup) {

	if(won)
		return;

	console.log('addGlueID: ' + powerup.id + ' glue: ' + glue + ' to ' + (glue + 1));
	
	if(glue == 0)
	{
		if(missiles > 0)
		{
			player.loadTexture('player_both');
		}
		else
		{
			player.loadTexture('player_glue');
		}
	}

	glue += 1;

	socket.emit('got glue', {pID: player.id, gID: gameID, cID: clientID})
	
	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}
	
	powerup.kill();
	
	getGlue.play();
}

function addFlight (player, powerup) {

	if(won)
		return;

	console.log('addFlightID: ' + powerup.id);

	if(flightMeter == 0)
	{
		var equipWings = game.add.sprite(player.x - 29, player.y, 'equipWings');

		equipWings.id = 1;

		equipment.push(equipWings);

		socket.emit('new equip', {pID: player.id, gID: gameID, cID: clientID, type: 1})
	}
	else
	{
		for(var i = 0; i < equipment.length; i++)
		{
			if(equipment[i].id == 1)
				equipment[i].loadTexture('equipWings');
		}
	}

	flightMeter += 1000;

	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}

	powerup.kill();

	getWings.play();
}

function addSpeed (player, powerup) {

	if(won)
		return;

	console.log('addSpeedID: ' + powerup.id);

	if(speedMeter == 0)
	{
		var equipFast = game.add.sprite(player.x + 50, player.y - 10, 'equipFast');

		equipFast.id = 2;

		equipment.push(equipFast);

		socket.emit('new equip', {pID: player.id, gID: gameID, cID: clientID, type: 2})
	}
	else
	{
		for(var i = 0; i < equipment.length; i++)
		{
			if(equipment[i].id == 2)
				equipment[i].loadTexture('equipFast');
		}
	}

	speedMeter += 1000;

	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}

	powerup.kill();
	
	getFast.play();
}

function addHat (player, powerup) {

	if(won)
		return;

	console.log('addHatID: ' + powerup.id);

	if(hatMeter == 0)
	{
		var equipHat = game.add.sprite(player.x + 2, player.y - 50, 'equipHardhat');

		equipHat.id = 3;

		equipment.push(equipHat);

		socket.emit('new equip', {pID: player.id, gID: gameID, cID: clientID, type: 3})
	}
	else
	{
		for(var i = 0; i < equipment.length; i++)
		{
			if(equipment[i].id == 3)
				equipment[i].loadTexture('equipHardhat');
		}
	}

	hatMeter += 1000;

	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}

	powerup.kill();
	
	getHardhat.play();
}

function addSlow (player, powerup) {

	if(won)
		return;

	console.log('addSlowID: ' + powerup.id);

	if(slowMeter == 0)
	{
		var equipSlow = game.add.sprite(player.x - 14, player.y - 10, 'equipSlow');

		equipSlow.id = 4;

		equipment.push(equipSlow);

		socket.emit('new equip', {pID: player.id, gID: gameID, cID: clientID, type: 4})
	}
	else
	{
		for(var i = 0; i < equipment.length; i++)
		{
			if(equipment[i].id == 4)
				equipment[i].loadTexture('equipSlow');
		}
	}

	slowMeter += 1000;

	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}

	powerup.kill();
	
	getSlow.play();
}

function addLife (player, powerup) {

	if(won)
		return;

	console.log('addLifeID: ' + powerup.id);

	if(lives < 25)
	{
		lives += 1;

		hearties.push(game.add.sprite(50*lives - 30, 60, 'lifeHeart'));
	}

	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}

	powerup.kill();
	
	oneUp.play();
}

function addMissile (player, powerup) {

	if(won)
		return;

	console.log('addMissileID: ' + powerup.id + ' missiles: ' + missiles + ' to ' + (missiles + 1));

	if(missiles == 0)
	{
		if(glue > 0)
		{
			player.loadTexture('player_both');
		}
		else
		{
			player.loadTexture('player_missile');
		}
	}

	missiles += 3;

	socket.emit('got missiles', {pID: player.id, gID: gameID, cID: clientID})

	for(var i = 0; i < pups.length; i++)
	{
		if(powerup.id == pups[i].id){
			socket.emit('remove pup', {id: powerup.id, gID: gameID, cID: clientID})
		}
	}

	powerup.kill();
	
	getMissiles.play();
}

function endGame () {
	
	if(won)
		return;

	--lives;

	hearties[lives].kill();

	hearties.splice(lives, 1);

	if (lives == 0)
	{
		console.log('player ' + player.id + ' dead');

		finalScore = timeScore;

		dead = true;

		player.loadTexture('guyDead');
		
		die.play();

		socket.emit('dead', {pID: player.id, gID: gameID, cID: clientID})

		setTimeout(loadDeathScreen, 2000)
	}
	else
	{
		console.log('player ' + player.id + ' hurt');

		shield = 50;

		player.loadTexture('guyHurt');
		
		var rand = Math.floor(Math.random() * 3);

		switch(rand)
		{
			case 1:
				hurt1.play();
				break;
			case 2:
				hurt2.play();
				break;
			default:
				hurt3.play();
				break;
		}

		socket.emit('hurt', {pID: player.id, gID: gameID, cID: clientID})
	}
}

function loadDeathScreen() {
	var bar = game.add.graphics();
	bar.beginFill(0xFFFFFF, 0.8);
	bar.drawRect(0, 0, 1500, 800);
	bar.alpha = 0.1;
	game.add.tween(bar).to( { alpha: 1 }, 1000, "Linear", true);

	text = game.add.text(game.world.centerX, game.world.centerY - 100, "You died");
	
	//  Centers the text and changes font/size
	text.anchor.set(0.5);
	text.align = 'center';
	text.font = 'Arial';
	text.fontWeight = 'bold';
	text.fontSize = 128;
	
	// Linear color gradient for text content
	var grd = text.context.createLinearGradient(0, 0, 0, text.height);
	grd.addColorStop(0, '#800000');
	grd.addColorStop(1, '#800000');
	text.fill = grd;


	var min = Math.floor(finalScore / 60.0);
	var sec = Math.floor(finalScore - min*60);
	var cent = Math.floor((finalScore - min*60 - sec)*100);

	if(sec < 10)
		sec = '0' + sec;

	if(cent < 10)
		cent = '0' + cent;

	textTime = game.add.text(game.world.centerX, game.world.centerY + 100, "Survival time: " + min + ":" + sec + "." + cent);

	//  Centers the text and changes font/size
	textTime.anchor.set(0.5);
	textTime.align = 'center';
	textTime.font = 'Arial';
	textTime.fontWeight = 'bold';
	textTime.fontSize = 128;

	// Linear color gradient for text content
	var grd = textTime.context.createLinearGradient(0, 0, 0, textTime.height);
	grd.addColorStop(0, '#800000');
	grd.addColorStop(1, '#800000');
	textTime.fill = grd;

	//hell.stop()

	//lol = game.add.audio('deathTrack');
	//lol.loop = true;
	//lol.play();
	
}

function loadVictoryScreen() {
	var bar = game.add.graphics();
	bar.beginFill(0xFFFFFF, 0.8);
	bar.drawRect(0, 0, 1500, 800);
	bar.alpha = 0.1;
	game.add.tween(bar).to( { alpha: 1 }, 1000, "Linear", true);

	text = game.add.text(game.world.centerX, game.world.centerY - 100, "You won!");
	
	//  Centers the text and changes font/size
	text.anchor.set(0.5);
	text.align = 'center';
	text.font = 'Arial';
	text.fontWeight = 'bold';
	text.fontSize = 128;

	// Linear color gradient for text content
	var grd = text.context.createLinearGradient(0, 0, 0, text.height);
	grd.addColorStop(0, '#800000');
	grd.addColorStop(1, '#800000');
	text.fill = grd;

	var min = Math.floor(finalScore / 60.0);
	var sec = Math.floor(finalScore - min*60);
	var cent = Math.floor((finalScore - min*60 - sec)*100);

	if(sec < 10)
		sec = '0' + sec;

	if(cent < 10)
		cent = '0' + cent;

	textTime = game.add.text(game.world.centerX, game.world.centerY + 100, "Game duration: " + min + ":" + sec + "." + cent);

	//  Centers the text and changes font/size
	textTime.anchor.set(0.5);
	textTime.align = 'center';
	textTime.font = 'Arial';
	textTime.fontWeight = 'bold';
	textTime.fontSize = 128;

	// Linear color gradient for text content
	var grd = textTime.context.createLinearGradient(0, 0, 0, textTime.height);
	grd.addColorStop(0, '#800000');
	grd.addColorStop(1, '#800000');
	textTime.fill = grd;

}

function spawnKernes (numKernes) {

	for(var i = 0; i < numKernes; i++)
	{
		var big = Math.floor(Math.random() * 2);
		var xpos = Math.floor(Math.random() * 1300 + 100);
		var yvel = Math.floor(Math.random() * 600);

		var kerne

		if(big == 1)
		{
			kerne = game.add.sprite(xpos, -150, 'kerneBig');
		}
		else
		{
			kerne = game.add.sprite(xpos, -50, 'kerne');
		}

		game.physics.arcade.enable(kerne);
		kerne.body.velocity.y = yvel;
		kerne.body.gravity.y = 1000;
	}

	snailDerpRight.play()

	setTimeout(reloadEgg, numKernes*1000);
}

function reloadEgg () {
	canUseEgg = true;
}

function recursiveKerne (num, wait) {

	var big = Math.floor(Math.random() * 2);
	var xpos = Math.floor(Math.random() * 1300 + 100);
	var yvel = Math.floor(Math.random() * 1000);

	if(big == 1)
	{
		kerne = game.add.sprite(xpos, -150, 'kerneBig');
	}
	else
	{
		kerne = game.add.sprite(xpos, -50, 'kerne');
	}

	game.physics.arcade.enable(kerne);
	kerne.body.velocity.y = yvel;
	kerne.body.gravity.y = 1000;

	snailDerpRight.play();


	if(num > 1)
		setTimeout(function () {recursiveKerne(num - 1, wait + 1)}, 100);
	else
		setTimeout(reloadEgg, wait*1000); 
}


var mainState = {
	preload: function () {
		//load menu images
		game.load.image('mainBackground', 'assets/mainBackground.png')
		game.load.image('movingLava', 'assets/movingLava.png')
		game.load.image('mpButton', 'assets/mpButton.png')
		game.load.image('HLmpButton', 'assets/HLmpButton.png')
		game.load.image('exitButton', 'assets/exitButton.png');
		game.load.image('HLexitButton', 'assets/HLexitButton.png');
		game.load.image('spButton', 'assets/spButton.png');
		game.load.image('HLspButton', 'assets/HLspButton.png');
		game.load.image('htpButton', 'assets/htpButton.png');
		game.load.image('HLhtpButton', 'assets/HLhtpButton.png');
		
		//load background images
		game.load.image('volcano', 'assets/volcano.png')
		game.load.image('ground', 'assets/ground.png')
		game.load.image('lifeHeart', 'assets/lifeHeart.png')
		
		//load player images
		game.load.image('player', 'assets/player.png');
		game.load.image('player_glue', 'assets/player_glue.png');
		game.load.image('player_missile', 'assets/player_missile.png');
		game.load.image('player_both', 'assets/player_both.png');
		game.load.image('enemy', 'assets/enemy.png');
		game.load.image('enemy_glue', 'assets/enemy_glue.png');
		game.load.image('enemy_missile', 'assets/enemy_missile.png');
		game.load.image('enemy_both', 'assets/enemy_both.png');
		game.load.image('guyHurt', 'assets/guyHurt.png');
		game.load.image('guyDead', 'assets/guyDead.png');
		game.load.image('guyStunned', 'assets/guyStunned.png');
		
		//load obstacle images
		game.load.image('rock', 'assets/rock.png');
		game.load.image('diagonalRock', 'assets/diagonalRock.png');
		game.load.image('flameRock', 'assets/flameRock.png');
		game.load.image('ember', 'assets/ember.png');
		game.load.image('hotRock', 'assets/hotRock.png');
		game.load.image('waveLeft', 'assets/waveLeft.png');
		game.load.image('waveRight', 'assets/waveRight.png');
		game.load.image('fireballLeft', 'assets/fireballLeft.png');
		game.load.image('fireballRight', 'assets/fireballRight.png');
		
		//load powerup images
		game.load.image('glue', 'assets/glue.png');
		game.load.image('wings', 'assets/wings.png');
		game.load.image('shoe', 'assets/shoe.png');
		game.load.image('hardhat', 'assets/hardhat.png');
		game.load.image('snailLeft', 'assets/snailLeft.png');
		game.load.image('snailRight', 'assets/snailRight.png');
		game.load.image('bullet', 'assets/bullet.png');
		game.load.image('missileLeft', 'assets/missileLeft.png');
		game.load.image('missileRight', 'assets/missileRight.png');
		game.load.image('heart', 'assets/heart.png');
		
		//load equipment images
		game.load.image('equipWings', 'assets/equipWings.png');
		game.load.image('equipHardhat', 'assets/equipHardhat.png');
		game.load.image('equipSlow', 'assets/equipSlow.png');
		game.load.image('equipFast', 'assets/equipFast.png');
		game.load.image('flashHardhat', 'assets/flashHardhat.png');
		game.load.image('flashWings', 'assets/flashWings.png');
		game.load.image('flashSpeed', 'assets/flashSpeed.png');

		//load sound effects
		game.load.audio('enemyDeath', 'assets/sfx/enemyDeath.ogg');
		game.load.audio('missileFire', 'assets/sfx/missileFire.wav');
		game.load.audio('oneUp', 'assets/sfx/1up.wav');
		game.load.audio('applyGlue', 'assets/sfx/applyGlue.mp3');
		game.load.audio('die', 'assets/sfx/die.wav');
		game.load.audio('emberHiss', 'assets/sfx/emberHiss.wav');
		game.load.audio('enemyHurt1', 'assets/sfx/enemyHurt1.wav');
		game.load.audio('enemyHurt2', 'assets/sfx/enemyHurt2.wav');
		game.load.audio('enemyHurt3', 'assets/sfx/enemyHurt3.wav');
		game.load.audio('fallingFire', 'assets/sfx/fallingFire.wav');
		game.load.audio('fireFireball', 'assets/sfx/fireFireball.wav');
		game.load.audio('getFast', 'assets/sfx/getFast.wav');
		game.load.audio('getGlue', 'assets/sfx/getGlue.wav');
		game.load.audio('getHardhat', 'assets/sfx/getHardhat.wav');
		game.load.audio('getMissiles', 'assets/sfx/getMissiles.wav');
		game.load.audio('getSlow', 'assets/sfx/getSlow.wav');
		game.load.audio('getWings', 'assets/sfx/getWings.wav');
		game.load.audio('hurt1', 'assets/sfx/hurt1.wav');
		game.load.audio('hurt2', 'assets/sfx/hurt2.wav');
		game.load.audio('hurt3', 'assets/sfx/hurt3.wav');
		game.load.audio('PUP', 'assets/sfx/PUP.wav');
		game.load.audio('rockFall', 'assets/sfx/rockFall.wav');
		game.load.audio('shockwave', 'assets/sfx/shockwave.mp3');
		game.load.audio('smallRockFall', 'assets/sfx/smallRockFall.wav');
		game.load.audio('snailDerpLeft', 'assets/sfx/snailLeft.wav');
		game.load.audio('snailDerpRight', 'assets/sfx/snailRight.wav');
		
		//load music
		game.load.audio('menuTrack', 'assets/music/bop.mp3');
		game.load.audio('mainTrack', 'assets/music/hell.mp3');
		game.load.audio('deathTrack', 'assets/music/lol.mp3');

		//load Easter Egg
		game.load.image('kerne', 'assets/kerne.png');
		game.load.image('kerneBig', 'assets/kerneBig.png');
	},
	
	create: function () {
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
		game.input.onDown.add(gofull, this);

		singlePlayer = false;

		//lol = game.add.audio('deathTrack');

		this.game.stage.disableVisibilityChange = true;		
		this.background = game.add.sprite(0, 0, 'mainBackground')


		//moving lava background
		this.lava1 = game.add.sprite(0, 50, 'movingLava')
		this.lava2 = game.add.sprite(1500, 50, 'movingLava')

		game.physics.startSystem(Phaser.Physics.ARCADE)

		game.physics.arcade.enable(this.lava1)
		game.physics.arcade.enable(this.lava2)

		this.lava1.body.velocity.x = -25;
		this.lava2.body.velocity.x = -25;
		
		//	Background rectangle for title
		var bar = game.add.graphics();
		bar.beginFill(0x999999, 0.9);
		bar.drawRect(350, 140, 800, 160);
		
		text = game.add.text(game.world.centerX, 225, "Rockefaller");
		
		//  Centers the text and changes font/size
		text.anchor.set(0.5);
		text.align = 'center';
		text.font = 'Arial';
		text.fontWeight = 'bold';
		text.fontSize = 128;
		
		//	Linear color gradient for text content
		var grd = text.context.createLinearGradient(0, 0, 0, text.height);
		grd.addColorStop(0, '#ffffff');   
		grd.addColorStop(1, '#ffffff');
		text.fill = grd;
		

		//Action on click
		function actionOnClickSP () {
			singlePlayer = true;

			socket.emit('connect single player')

			fullLock = false;
		}

		function actionOnClickMP () {
			game.state.start('load');

			fullLock = false;
		}

		function actionOnClickHTP () {
			game.state.start('instruct1');

			fullLock = false;
		}
		
		spButton = game.add.button(game.world.centerX - 200, game.world.centerY - 50, 'spButton', actionOnClickSP, this);		
		mpButton = game.add.button(game.world.centerX - 200, game.world.centerY + 75, 'mpButton', actionOnClickMP, this);
		htpButton = game.add.button(game.world.centerX - 200, game.world.centerY + 200, 'htpButton', actionOnClickHTP, this);

		function overSP () {
			fullLock = true;

			spButton.loadTexture('HLspButton');
		}
	  
		function outSP () {
			fullLock = false;

			spButton.loadTexture('spButton');
		}
	  
		spButton.onInputOver.add(overSP, this);
		spButton.onInputOut.add(outSP, this);

		function overMP () {
			fullLock = true;

			mpButton.loadTexture('HLmpButton');
		}
	  
		function outMP () {
			fullLock = false;

			mpButton.loadTexture('mpButton');
		}
	  
		mpButton.onInputOver.add(overMP, this);
		mpButton.onInputOut.add(outMP, this);

		function overHTP () {
			fullLock = true;

			htpButton.loadTexture('HLhtpButton');
		}
	  
		function outHTP () {
			fullLock = false;

			htpButton.loadTexture('htpButton');
		}
	  
		htpButton.onInputOver.add(overHTP, this);
		htpButton.onInputOut.add(outHTP, this);
		

		bar.alpha = 0.1;
		text.alpha = 0.1;
		spButton.alpha = 0.1;
		mpButton.alpha = 0.1;
		htpButton.alpha = 0.1;
		

		game.add.tween(bar).to( { alpha: 1 }, 1000, "Linear", true);
		game.add.tween(text).to( { alpha: 1 }, 1000, "Linear", true);
		game.add.tween(spButton).to( { alpha: 1 }, 1000, "Linear", true);
		game.add.tween(mpButton).to( { alpha: 1 }, 1000, "Linear", true);
		game.add.tween(htpButton).to( { alpha: 1 }, 1000, "Linear", true);






		//background music
		bop = game.add.audio('menuTrack');
		bop.loop = true;
		bop.play();

		
		//reset all attributes and data structures!
		//move this to the death state
		dead = false;
		mobile = false;
		glue = 0;
		missiles = 0;
		lives = 3;
		shield = 0;
		canUsePUP = true;
		canUseMsl = true;
		canUseEgg = true;
		recursiveEgg = false;
		flightMeter = 0;
		speedMeter = 0;
		hatMeter = 0;
		slowMeter = 0;
		finalScore = 0.0;
		won = false;
		wonSwitch = false;
		timerText = undefined;

		equipment.length = 0;
		pups.length = 0;
		hearties.length = 0;
		players.length = 0;
		dataArray.length = 0;

	},

	update: function () {

		if(this.lava1.x <= -1500)
		{
			this.lava1.x = 1500;
		}
		else if(this.lava2.x <= -1500)
		{
			this.lava2.x = 1500;
		}
		
		lavaPos1 = this.lava1.x;
		lavaPos2 = this.lava2.x;
	}
};

var loadState = {
	create: function () {
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
		game.input.onDown.add(gofull, this);

		this.game.stage.disableVisibilityChange = true;		
		this.background = game.add.sprite(0, 0, 'mainBackground')

		//moving lava background
		this.lava1 = game.add.sprite(lavaPos1, 50, 'movingLava')
		this.lava2 = game.add.sprite(lavaPos2, 50, 'movingLava')

		game.physics.startSystem(Phaser.Physics.ARCADE)

		game.physics.arcade.enable(this.lava1)
		game.physics.arcade.enable(this.lava2)

		this.lava1.body.velocity.x = -25;
		this.lava2.body.velocity.x = -25;
		
		//	Background rectangle for title
		var bar = game.add.graphics();
		bar.beginFill(0x999999, 0.9);
		bar.drawRect(390, 305, 720, 200);
		
		text = game.add.text(game.world.centerX, game.world.centerY, "Loading...");
		
		//  Centers the text and changes font/size
		text.anchor.set(0.5);
		text.align = 'center';
		text.font = 'Arial';
		text.fontWeight = 'bold';
		text.fontSize = 128;
		
		//	Linear color gradient for text content
		var grd = text.context.createLinearGradient(0, 0, 0, text.height);
		grd.addColorStop(0, '#ffffff');   
		grd.addColorStop(1, '#ffffff');
		text.fill = grd;
		
		text.alpha = 0.1;
		game.add.tween(text).to( { alpha: 1 }, 1000, "Linear", true);
		
		socket.emit('connect game')
	},

	update: function () {

		if(this.lava1.x <= -1500)
		{
			this.lava1.x = 1500;
		}
		else if(this.lava2.x <= -1500)
		{
			this.lava2.x = 1500;
		}
		
	}
};

var gameState = {
	create: function () {
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
		game.input.onDown.add(gofull, this);

		this.game.stage.disableVisibilityChange = true		  
		this.volcano = game.add.sprite(0,0, 'volcano')
		game.world.setBounds(0, 0, 1500, 800)
		
		  
		game.physics.startSystem(Phaser.Physics.ARCADE)
		
		bop.stop();

		hell = game.add.audio('mainTrack');
		hell.loop = true;
		hell.play();
		
		this.ground = game.add.sprite(0, 750, 'ground')
		game.physics.arcade.enable(this.ground)
		this.ground.body.immovable = true

		livesText = game.add.text(20, 12, 'Lives:');

		//  changes font/size
		livesText.font = 'Arial';
		livesText.fontWeight = 'bold';
		livesText.fontSize = 36;

		//	Linear color gradient for text content
		var grdx = livesText.context.createLinearGradient(0, 0, 0, livesText.height);
		grdx.addColorStop(0, '#ffffff');   
		grdx.addColorStop(1, '#ffffff');
		livesText.fill = grdx;

		for(var i = 0; i < lives; i++)
		{
			hearties.push(game.add.sprite(50*i + 20, 60, 'lifeHeart'));
		}
		
		normals = game.add.group()
		diagonals = game.add.group()
		flames = game.add.group()
		hots = game.add.group()
		sideways = game.add.group()
		glues = game.add.group()
		wings = game.add.group()
		shoes = game.add.group()
		hardhats = game.add.group()
		snails = game.add.group()
		hearts = game.add.group()
		bullets = game.add.group()
		
		player = game.add.sprite(spawnCoordX, 700, 'player')	  
		game.physics.arcade.enable(player)
		player.body.gravity.y = 1000
		player.body.collideWorldBounds = true

		player.id = clientID
		
		cursors = game.input.keyboard.createCursorKeys()
		glueKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
		mslKey = game.input.keyboard.addKey(Phaser.Keyboard.ALT)
		eggKey = game.input.keyboard.addKey(Phaser.Keyboard.K)
		
		enemyDeath = game.add.audio('enemyDeath');
		missileFire = game.add.audio('missileFire');
		oneUp = game.add.audio('oneUp');
		applyGlue = game.add.audio('applyGlue');
		die = game.add.audio('die');
		emberHiss = game.add.audio('emberHiss');
		enemyHurt1 = game.add.audio('enemyHurt1');
		enemyHurt2 = game.add.audio('enemyHurt2');
		enemyHurt3 = game.add.audio('enemyHurt3');
		fallingFire = game.add.audio('fallingFire');
		fireFireball = game.add.audio('fireFireball');
		getFast = game.add.audio('getFast');
		getGlue = game.add.audio('getGlue');
		getHardhat = game.add.audio('getHardhat');
		getMissiles = game.add.audio('getMissiles');
		getSlow = game.add.audio('getSlow');
		getWings = game.add.audio('getWings');
		hurt1 = game.add.audio('hurt1');
		hurt2 = game.add.audio('hurt2');
		hurt3 = game.add.audio('hurt3');
		PUP = game.add.audio('PUP');
		rockFall = game.add.audio('rockFall');
		shockwave = game.add.audio('shockwave');
		smallRockFall = game.add.audio('smallRockFall');
		snailDerpLeft = game.add.audio('snailDerpLeft');
		snailDerpRight = game.add.audio('snailDerpRight');
		
		function actionOnClick () {	
			socket.emit('leave game', {cID: clientID, gID: gameID})
			
			gameID = -1
			
			gameRunning = false

			hell.stop()
			//lol.stop()

			fullLock = false;
			
			game.state.start('main')
		}
		
		button = game.add.button(1385, 10, 'exitButton', actionOnClick, this);
		
		function over () {
			fullLock = true;

			button.loadTexture('HLexitButton');
		}
	  
		function out () {
			fullLock = false;

			button.loadTexture('exitButton');
		}
	  
		button.onInputOver.add(over, this);
		button.onInputOut.add(out, this);
		
		socket.emit('player joined', {cID: clientID, gID: gameID, x: player.x, y: player.y})
	},
	
	update: function () {
		
		if(dataArray.length != 0 && (!singlePlayer))
			joinPlayer()
		
		if((players.length == numMulti - 1) && (gameRunning == false) && !singlePlayer)
		{
			gameRunning = true
			mobile = true
			game.add.tween(text).to( { alpha: 0 }, 1000, "Linear", true);

			socket.emit('start game', {gID: gameID})

			this.game.time.reset()
		}
		else if(singlePlayer && (gameRunning == false))
		{
			gameRunning = true
			mobile = true
			game.add.tween(text).to( { alpha: 0 }, 1000, "Linear", true);

			socket.emit('start single player', {gID: gameID})

			this.game.time.reset()
		}
		
		if(createText && !singlePlayer)
		{
			text = game.add.text(game.world.centerX, game.world.centerY, "Waiting on players...");
			
			text.anchor.set(0.5);
			text.align = 'center';
			text.font = 'Arial';
			text.fontWeight = 'bold';
			text.fontSize = 102;
			
			var grd = text.context.createLinearGradient(0, 0, 0, text.height);
			grd.addColorStop(0, '#ffffff');   
			grd.addColorStop(1, '#ffffff');
			text.fill = grd;
			
			text.alpha = 0.1;
			game.add.tween(text).to( { alpha: 1 }, 1000, "Linear", true);
			
			createText = false
		}


		if((won && !wonSwitch) || (players.length == 0 && !singlePlayer && gameRunning && !wonSwitch && !dead))
		{
			won = true;

			finalScore = timeScore;

			setTimeout(loadVictoryScreen, 3000)

			wonSwitch = true;
		}


		
		
		//spawn embers and waves when appropriate
		game.physics.arcade.overlap(this.ground, flames, spawnEmber, null, this);
		game.physics.arcade.overlap(this.ground, hots, spawnWave, null, this);
		game.physics.arcade.overlap(this.ground, normals, playNoise, null, this);
		game.physics.arcade.overlap(this.ground, diagonals, playSmallNoise, null, this);
		
		
		
		//player movement, collisions, and actions
		
		if(!dead && mobile)
		{
		
			for (var i = 0; i < players.length; i++) {
				if (players[i].alive) {
				players[i].update()
				game.physics.collide(player, players[i].player)
				}
			}
	  
			game.physics.arcade.collide(player, this.ground);
	  
			if(glueKey.isDown && glue > 0 && canUsePUP && !won)
			{		  
				canUsePUP = false;
		  
				socket.emit('immobile pup', {pID: player.id, gID: gameID, cID: clientID})
		  
				for(var i = 0; i < players.length; i++)
				{
					if(!players[i].dead)  players[i].player.loadTexture('guyStunned');
				}
		  
				--glue;

				socket.emit('use glue', {pID: player.id, gID: gameID, cID: clientID})
				
				applyGlue.play();

				if(glue == 0)
				{
					if(missiles > 0)
					{
						player.loadTexture('player_missile');
					}
					else
					{
						player.loadTexture('player');
					}
				}
		  
				setTimeout(makeMobile, 1000);
			}

			if(mslKey.isDown && missiles > 0 && canUseMsl && !won)
			{
				canUseMsl = false;

				socket.emit('fire missiles', {xcor: player.x, ycor: player.y, gID: gameID, cID: clientID})

				--missiles;

				socket.emit('use missile', {pID: player.id, gID: gameID, cID: clientID})

				var missileLeft = game.add.sprite(player.x - 51, player.y + 10, 'missileLeft');
				var missileRight = game.add.sprite(player.x + 51, player.y + 10, 'missileRight');
				
				missileFire.play();

				game.physics.arcade.enable(missileLeft);
				game.physics.arcade.enable(missileRight);

				missileLeft.body.velocity.x = -1000;
				missileRight.body.velocity.x = 1000;

				if(missiles == 0)
				{
					if(glue > 0)
					{
						player.loadTexture('player_glue');
					}
					else
					{
						player.loadTexture('player');
					}
				}

				setTimeout(reloadMsl, 1000);
			}

			if(eggKey.isDown && canUseEgg && !won)
			{
				canUseEgg = false;

				numKernes = Math.floor(Math.random() * 42 + 1)

				if(recursiveEgg)
				{
					recursiveKerne(numKernes, 1);
					recursiveEgg = false;
				}
				else
				{
					spawnKernes(numKernes);
					recursiveEgg = true;
				}
				
			}

			if(flightMeter > 0)
			{
				player.body.gravity.y = 0;

				if(cursors.up.isDown)
				{
					if(player.body.velocity.y > -600)
						player.body.velocity.y += -67;
				}
				else if(cursors.down.isDown)
				{
					if(player.body.velocity.y < 600)
						player.body.velocity.y += 67;
				}

				//y-friction
				if(player.body.velocity.y < 15 && player.body.velocity.y > -15)
				{
					player.body.velocity.y = 0;
				}
				else if(player.body.velocity.y < 0)
				{
					player.body.velocity.y += 15;
				}
				else if(player.body.velocity.y > 0)
				{
					player.body.velocity.y -= 15;
				}

				--flightMeter;

				if(flightMeter <= 100)
				{
					var equipWings
					var ind

					for(var i = 0; i < equipment.length; i++)
					{
						if(equipment[i].id == 1)
						{
							equipWings = equipment[i];
							ind = i;
						}
					}

					if(flightMeter == 0)
					{
						equipWings.kill();
						equipment.splice(ind, 1);

						socket.emit('remove equip', {pID: player.id, gID: gameID, cID: clientID, type: 1})
					}
					else if(flightMeter % 20 == 0)
					{
						equipWings.loadTexture('flashWings');

						socket.emit('flash equip', {pID: player.id, gID: gameID, cID: clientID, type: 1})
					}
					else if(flightMeter % 20 == 10)
					{
						equipWings.loadTexture('equipWings');

						socket.emit('unflash equip', {pID: player.id, gID: gameID, cID: clientID, type: 1})
					}
				}
			}
			else
			{
				player.body.gravity.y = 1000;

				if(cursors.up.isDown && player.y == 700)
				{
					player.body.velocity.y = -520;
				}
				else if(cursors.down.isDown && player.y < 700)
				{
					player.body.velocity.y += 100;
				}

			}

			if(speedMeter > 0 && slowMeter == 0)
			{
				if(cursors.left.isDown)
				{
					if(player.body.velocity.x > -1200)
						player.body.velocity.x += -100;
				}
				else if(cursors.right.isDown)
				{
					if(player.body.velocity.x < 1200)
						player.body.velocity.x += 100;
				}
			}
			else if(slowMeter > 0 && speedMeter == 0)
			{
				if(cursors.left.isDown)
				{
					if(player.body.velocity.x > -300)
						player.body.velocity.x += -33;
				}
				else if(cursors.right.isDown)
				{
					if(player.body.velocity.x < 300)
						player.body.velocity.x += 33;
				}
			}
			else
			{
				if(cursors.left.isDown)
				{
					if(player.body.velocity.x > -600)
						player.body.velocity.x += -67;
				}
				else if(cursors.right.isDown)
				{
					if(player.body.velocity.x < 600)
						player.body.velocity.x += 67;
				}
			}

			if(speedMeter > 0)
			{
				--speedMeter;

				if(speedMeter <= 100)
				{
					var equipFast
					var ind

					for(var i = 0; i < equipment.length; i++)
					{
						if(equipment[i].id == 2)
						{
							equipFast = equipment[i];
							ind = i;
						}
					}

					if(speedMeter == 0)
					{
						equipFast.kill();
						equipment.splice(ind, 1);

						socket.emit('remove equip', {pID: player.id, gID: gameID, cID: clientID, type: 2})
					}
					else if(speedMeter % 20 == 0)
					{
						equipFast.loadTexture('flashSpeed');

						socket.emit('flash equip', {pID: player.id, gID: gameID, cID: clientID, type: 2})
					}
					else if(speedMeter % 20 == 10)
					{
						equipFast.loadTexture('equipFast');

						socket.emit('unflash equip', {pID: player.id, gID: gameID, cID: clientID, type: 2})
					}
				}
			}

			if(slowMeter > 0)
			{
				--slowMeter;

				if(slowMeter <= 100)
				{
					var equipSlow
					var ind

					for(var i = 0; i < equipment.length; i++)
					{
						if(equipment[i].id == 4)
						{
							equipSlow = equipment[i];
							ind = i;
						}
					}

					if(slowMeter == 0)
					{
						equipSlow.kill();
						equipment.splice(ind, 1);

						socket.emit('remove equip', {pID: player.id, gID: gameID, cID: clientID, type: 4})
					}
					else if(slowMeter % 20 == 0)
					{
						equipSlow.loadTexture('flashSpeed');

						socket.emit('flash equip', {pID: player.id, gID: gameID, cID: clientID, type: 4})
					}
					else if(slowMeter % 20 == 10)
					{
						equipSlow.loadTexture('equipSlow');

						socket.emit('unflash equip', {pID: player.id, gID: gameID, cID: clientID, type: 4})
					}
				}
			}
	   
			if(player.y == 700 || flightMeter > 0)	//friction
			{

				if(player.body.velocity.x < 15 && player.body.velocity.x > -15)
				{
					player.body.velocity.x = 0;
				}
				else if(player.body.velocity.x < 0)
				{
					player.body.velocity.x += 15;
				}
				else if(player.body.velocity.x > 0)
				{
					player.body.velocity.x -= 15;
				}
			}

			if(shield > 0)
			{
				--shield;

				if(shield == 0)
				{
					if(glue > 0 && missiles > 0)
					{
						player.loadTexture('player_both');
					}
					else if(glue > 0)
					{
						player.loadTexture('player_glue');
					}
					else if(missiles > 0)
					{
						player.loadTexture('player_missile');
					}
					else
					{
						player.loadTexture('player');
					}
			
					socket.emit('better', {pID: player.id, gID: gameID, cID: clientID})
				}
			}
			else
			{
				if(hatMeter > 0)
				{
					--hatMeter;

					if(hatMeter <= 100)
					{
						var equipHat
						var ind

						for(var i = 0; i < equipment.length; i++)
						{
							if(equipment[i].id == 3)
							{
								equipHat = equipment[i];
								ind = i;
							}
						}

						if(hatMeter == 0)
						{
							equipHat.kill();
							equipment.splice(ind, 1);

							socket.emit('remove equip', {pID: player.id, gID: gameID, cID: clientID, type: 3})
						}
						else if(hatMeter % 20 == 0)
						{
							equipHat.loadTexture('flashHardhat');

							socket.emit('flash equip', {pID: player.id, gID: gameID, cID: clientID, type: 3})
						}
						else if(hatMeter % 20 == 10)
						{
							equipHat.loadTexture('equipHardhat');

							socket.emit('unflash equip', {pID: player.id, gID: gameID, cID: clientID, type: 3})
						}
					}
				}
				else
				{
					game.physics.arcade.overlap(player, normals, endGame, null, this);
					game.physics.arcade.overlap(player, diagonals, endGame, null, this);
					game.physics.arcade.overlap(player, flames, endGame, null, this);
					game.physics.arcade.overlap(player, hots, endGame, null, this);
				}

				game.physics.arcade.overlap(player, sideways, endGame, null, this);
			}

	  
	  
			game.physics.arcade.overlap(player, glues, addGlue, null, this);
			game.physics.arcade.overlap(player, wings, addFlight, null, this);
			game.physics.arcade.overlap(player, shoes, addSpeed, null, this);
			game.physics.arcade.overlap(player, hardhats, addHat, null, this);
			game.physics.arcade.overlap(player, snails, addSlow, null, this);
			game.physics.arcade.overlap(player, hearts, addLife, null, this);
			game.physics.arcade.overlap(player, bullets, addMissile, null, this);		  
		}
	
		else	//stunned or dead
		{
			player.body.gravity.y = 1000;

			if(!dead)
			{
				game.physics.arcade.collide(player, this.ground);

				if(shield > 0)
				{
					--shield;
				}
				else
				{
					if(hatMeter == 0)
					{
						game.physics.arcade.overlap(player, normals, endGame, null, this);
						game.physics.arcade.overlap(player, diagonals, endGame, null, this);
						game.physics.arcade.overlap(player, flames, endGame, null, this);
						game.physics.arcade.overlap(player, hots, endGame, null, this);
					}
	
					game.physics.arcade.overlap(player, sideways, endGame, null, this);
				}
		  

				game.physics.arcade.overlap(player, glues, addGlue, null, this);
				game.physics.arcade.overlap(player, wings, addFlight, null, this);
				game.physics.arcade.overlap(player, shoes, addSpeed, null, this);
				game.physics.arcade.overlap(player, hardhats, addHat, null, this);
				game.physics.arcade.overlap(player, snails, addSlow, null, this);
				game.physics.arcade.overlap(player, hearts, addLife, null, this);
				game.physics.arcade.overlap(player, bullets, addMissile, null, this);
			}
		
			if(player.body.velocity.x < 10 && player.body.velocity.x > -10)
			{
				player.body.velocity.x = 0;
			}
			else if(player.body.velocity.x < 0)
			{
				player.body.velocity.x += 10;
			}
			else if(player.body.velocity.x > 0)
			{
				player.body.velocity.x -= 10;
			}
		}



		//update player equipment position

		for(var i = 0; i < equipment.length; i++)
		{
			switch(equipment[i].id)
			{
				case 1: //wings
				  equipment[i].x = player.x - 29;
				  equipment[i].y = player.y;
				  break;
				case 2: //speed
				  equipment[i].x = player.x + 50;
				  equipment[i].y = player.y - 10;
				  break;
				case 3: //hat
				  equipment[i].x = player.x + 2;
				  equipment[i].y = player.y - 30;
				break;
				case 4: //slow
				  equipment[i].x = player.x - 14;
				  equipment[i].y = player.y - 10;
				break;
				default:
			}
		}
		
		
		if(gameRunning)
			socket.emit('move player', {gID: gameID, x: player.x, y: player.y})
	},
	
	render: function () {
	
		if(!dead && !won)
		{			
			timeScore = this.game.time.totalElapsedSeconds().toFixed(2)

			var min = Math.floor(timeScore / 60.0);
			var sec = Math.floor(timeScore - min*60);
			var cent = Math.floor((timeScore - min*60 - sec)*100);

			if(sec < 10)
				sec = '0' + sec;

			if(cent < 10)
				cent = '0' + cent;
			
			if(typeof timerText == 'undefined')
			{
				timerText = game.add.text(game.world.centerX, 38, min + ":" + sec + "." + cent);
				timerText.anchor.set(0.5);
				timerText.align = 'center';
				timerText.font = 'Arial';
				timerText.fontWeight = 'bold';
				timerText.fontSize = 36;
				timerText.addColor('#ffffff', 0);
			}
			
			timerText.setText(min + ":" + sec + "." + cent)
		}
	}


};



// Instructions
var instructionState3 = {
	preload: function () {
		game.load.image('rightArrow', 'assets/rightArrow.png');
		game.load.image('leftArrow', 'assets/leftArrow.png');
		game.load.image('HLrightArrow', 'assets/HLrightArrow.png');
		game.load.image('HLleftArrow', 'assets/HLleftArrow.png');
		game.load.image('instructions', 'assets/instr3.png');
	},

	create: function () {
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
		game.input.onDown.add(gofull, this);
	  
		game.add.sprite(0, 0, 'instructions');
	  
		function toHomePage () {
			game.state.start('main');

			fullLock = false;
		}

		function toPrevPage () {
			game.state.start('instruct2');

			fullLock = false;
		}
	  
		leftArrow = game.add.button(50, 700, 'leftArrow', toPrevPage, this);
		leftArrow.alpha = 0.1;  
		game.add.tween(leftArrow).to( { alpha : 1 }, 1000, "Linear", true);
		rightArrow = game.add.button(1400, 700, 'rightArrow', toHomePage, this);
		rightArrow.alpha = 0.1;  
		game.add.tween(rightArrow).to( { alpha : 1 }, 1000, "Linear", true);

		function overLeft () {
			fullLock = true;

			leftArrow.loadTexture('HLleftArrow');
		}
	  
		function outLeft () {
			fullLock = false;

			leftArrow.loadTexture('leftArrow');
		}
	  
		leftArrow.onInputOver.add(overLeft, this);
		leftArrow.onInputOut.add(outLeft, this);

		function overRight () {
			fullLock = true;

			rightArrow.loadTexture('HLrightArrow');
		}
	  
		function outRight () {
			fullLock = false;

			rightArrow.loadTexture('rightArrow');
		}
	  
		rightArrow.onInputOver.add(overRight, this);
		rightArrow.onInputOut.add(outRight, this);
	}
};

// Instructions
var instructionState2 = {
	preload: function () {
		game.load.image('rightArrow', 'assets/rightArrow.png');
		game.load.image('leftArrow', 'assets/leftArrow.png');
		game.load.image('HLrightArrow', 'assets/HLrightArrow.png');
		game.load.image('HLleftArrow', 'assets/HLleftArrow.png');
		game.load.image('instructions', 'assets/instr2.png');
	},

	create: function () {  
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
		game.input.onDown.add(gofull, this);

		game.add.sprite(0, 0, 'instructions');
	  
		function toNextPage () {
			game.state.start('instruct3');

			fullLock = false;
		}

		function toPrevPage () {
			game.state.start('instruct1');

			fullLock = false;
		}
	  
		leftArrow = game.add.button(50, 700, 'leftArrow', toPrevPage, this);
		leftArrow.alpha = 0.1;  
		game.add.tween(leftArrow).to( { alpha : 1 }, 1000, "Linear", true);
	  	rightArrow = game.add.button(1400, 700, 'rightArrow', toNextPage, this);
		rightArrow.alpha = 0.1;  
		game.add.tween(rightArrow).to( { alpha : 1 }, 1000, "Linear", true);

		function overLeft () {
			fullLock = true;

			leftArrow.loadTexture('HLleftArrow');
		}
	  
		function outLeft () {
			fullLock = false;

			leftArrow.loadTexture('leftArrow');
		}
	  
		leftArrow.onInputOver.add(overLeft, this);
		leftArrow.onInputOut.add(outLeft, this);

		function overRight () {
			fullLock = true;

			rightArrow.loadTexture('HLrightArrow');
		}
	  
		function outRight () {
			fullLock = false;

			rightArrow.loadTexture('rightArrow');
		}
	  
		rightArrow.onInputOver.add(overRight, this);
		rightArrow.onInputOut.add(outRight, this);
	}
};

// Instructions
var instructionState1 = {
	preload: function () {
		game.load.image('rightArrow', 'assets/rightArrow.png');
		game.load.image('leftArrow', 'assets/leftArrow.png');
		game.load.image('HLrightArrow', 'assets/HLrightArrow.png');
		game.load.image('HLleftArrow', 'assets/HLleftArrow.png');
		game.load.image('instructions', 'assets/instr1.png');
	},

	create: function () {
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
		game.input.onDown.add(gofull, this);

		game.add.sprite(0, 0, 'instructions');
	  
		function toHomePage () {
			game.state.start('main');

			fullLock = false;
		}
	  
		function toNextPage () {
			game.state.start('instruct2');

			fullLock = false;
		}

		leftArrow = game.add.button(50, 700, 'leftArrow', toHomePage, this);
		leftArrow.alpha = 0.1;  
		game.add.tween(leftArrow).to( { alpha : 1 }, 1000, "Linear", true);
		rightArrow = game.add.button(1400, 700, 'rightArrow', toNextPage, this);	  
		rightArrow.alpha = 0.1;  
		game.add.tween(rightArrow).to( { alpha : 1 }, 1000, "Linear", true);

		function overLeft () {
			fullLock = true;

			leftArrow.loadTexture('HLleftArrow');
		}
	  
		function outLeft () {
			fullLock = false;

			leftArrow.loadTexture('leftArrow');
		}
	  
		leftArrow.onInputOver.add(overLeft, this);
		leftArrow.onInputOut.add(outLeft, this);

		function overRight () {
			fullLock = true;

			rightArrow.loadTexture('HLrightArrow');
		}
	  
		function outRight () {
			fullLock = false;

			rightArrow.loadTexture('rightArrow');
		}
	  
		rightArrow.onInputOver.add(overRight, this);
		rightArrow.onInputOut.add(outRight, this);
	}
};



game.state.add('main', mainState)
game.state.add('load', loadState)
game.state.add('game', gameState)
game.state.add('instruct3', instructionState3)
game.state.add('instruct2', instructionState2)
game.state.add('instruct1', instructionState1)
game.state.start('main')
setEventHandlers()