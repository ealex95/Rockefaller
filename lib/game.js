/* ************************************************
** SERVER CODE
************************************************ */

var util = require('util')
var http = require('http')
var path = require('path')
var ecstatic = require('ecstatic')
var io = require('socket.io')

var Player = require('./Player')

var port = process.env.PORT || 12347

var socket	// Socket controller
var clients = new Map()
var games = new Map()
var playersInGame = new Map()
var queue = []
var numMulti = 2

// Create and start the http server
var server = http.createServer(
	ecstatic({ root: path.resolve(__dirname, '../public') })
	).listen(port, function (err) {
	if (err) {
	throw err
	}
	init()
	})
	
function init () {
	// Attach Socket.IO to server
	socket = io.listen(server)
	
	// Start listening for events
	setEventHandlers()
	
	// Change interval for games
	//setInterval()
}

// Creates game object
function Game (gameID, clientsMap) {
	this.id = gameID
	this.clients = clientsMap
	this.players = new Map()
	this.interval = 2000
	this.spawnObstacles = false
	this.counter = 0 // used for spawn control
	var timer
	this.pupID = 0
}

Game.prototype.getClientSize = function () {
	return this.clients.size
}

Game.prototype.getClient = function (id) {
	return this.clients.get(id)
}

Game.prototype.getOtherClients = function (id) {
	var tempArray = []
	
	this.clients.forEach(function(client, cID) {
		if(cID != id)
			tempArray.push(client)
	} , this.clients)
	
	return tempArray	
}

Game.prototype.addPlayer = function (player) {
	this.players.set(player.id, player)
}

Game.prototype.getPlayer = function (id) {
	return this.players.get(id)
}

Game.prototype.deleteCP = function (id) {
	this.players.delete(id)
	this.clients.delete(id)
}

Game.prototype.changeInterval = function (id) {

	var game = games.get(id)
	
	if(typeof game != 'undefined')
		addObstacle(game.id)
	else
		return
	
	game.timer = setTimeout(function () {game.changeInterval(game.id)}, game.interval);
	
	if (game.counter == 3)
	{
		if (game.interval > 450)
			game.interval -= 25
		
		game.counter = 0
	}
	
	game.counter++
}

Game.prototype.changeIntervalSP = function (id) {

	var game = games.get(id)
	
	if(typeof game != 'undefined')
		addObstacleSP(game.id)
	else
		return
	
	game.timer = setTimeout(function () {game.changeIntervalSP(game.id)}, game.interval);
	
	if (game.counter == 3)
	{
		if (game.interval > 450)
			game.interval -= 25
		
		game.counter = 0
	}
	
	game.counter++
}

function gameIDGenerator () {
	var id = Math.floor(Math.random() * 1000)
	
	if(games.get(id) != null){
		return gameIDGenerator()
	}
	
	return id
}

var setEventHandlers = function () {
	// Socket.IO
	socket.sockets.on('connection', onSocketConnection)
}

// New socket connection
function onSocketConnection (client) {
	util.log('New client has connected: ' + client.id)	
	clients.set(client.id, client)

	// Listen for client messages
	client.on('disconnect', onClientDisconnect)	
	client.on('connect game', onConnectGame)	
	client.on('player joined', onPlayerJoin)	
	client.on('move player', onMovePlayer)	
	client.on('start game', onStartGame)	
	client.on('leave game', onLeaveGame)	
	client.on('new equip', onNewEq)
	client.on('remove equip', onRemoveEq)
	client.on('flash equip', onFlashEq)
	client.on('unflash equip', onUnflashEq)
	client.on('immobile pup', immobilePUP)
	client.on('fire missiles', fireMissiles)
	client.on('remove pup', removePUP)
	client.on('got glue', onGotGlue)
	client.on('got missiles', onGotMissiles)
	client.on('use glue', onUseGlue)
	client.on('use missile', onUseMissile)
	client.on('hurt', playerHurt)
	client.on('better', playerBetter)
	client.on('dead', playerDead)

	client.on('connect single player', onConnectSinglePlayer)
	client.on('start single player', onStartSinglePlayer)
}

// Socket client has disconnected
function onClientDisconnect () {
	util.log('Client has disconnected: ' + this.id)
	
	var gameID = playersInGame.get(this.id)
	
	if(!gameID) {
		for(var i = 0; i < queue.length; i++) {
			if(queue[i].id == this.id)
				queue.splice(i, 1)				
		}		
		
		clients.delete(this.id)
	}
	
	else {
		var otherClients = games.get(gameID).getOtherClients(this.id)
		
		for (var i = 0; i < otherClients.length; i++) {
			otherClients[i].emit('remove player', {id: this.id})
		}
		
		games.get(gameID).deleteCP(this.id)
		
		if(games.get(gameID).getClientSize() == 0)
			games.delete(gameID)
		
		playersInGame.delete(this.id)
		
		clients.delete(this.id)
	}	
}

function onConnectGame () {
	queue.push(clients.get(this.id))
	
	if(queue.length >= numMulti){
		var gameID = gameIDGenerator()
		
		var clientArr = []

		var tempClient

		for(var i = 0; i < numMulti; i++)
		{
			tempClient = queue.shift()

			clientArr.push(tempClient)
		}

		//var client1 = queue.shift()
		//var client2 = queue.shift()
		//var client3 = queue.shift()
		
		var tempMap = new Map()

		for(var i = 0; i < numMulti; i++)
		{
			console.log(i)
			tempMap.set(clientArr[i].id, clientArr[i])
		}

		//tempMap.set(client1.id, client1)
		//tempMap.set(client2.id, client2)
		//tempMap.set(client3.id, client3)
		
		games.set(gameID, new Game(gameID, tempMap))

		for(var i = 0; i < numMulti; i++)
		{
			clientArr[i].emit('setup game', {cID: clientArr[i].id, gID: gameID, nm: numMulti, spawnX: 650 + 100*i})
		}
		
		//client1.emit('setup game', {cID: client1.id, gID: gameID, spawnX: 650})
		//client2.emit('setup game', {cID: client2.id, gID: gameID, spawnX: 750})
		//client3.emit('setup game', {cID: client3.id, gID: gameID, spawnX: 850})
	}
	
	// socket.emit waiting for more players
}

function onConnectSinglePlayer () {
	var gameID = gameIDGenerator()

	var clientSP = clients.get(this.id)

	var tempMap = new Map()
	tempMap.set(clientSP.id, clientSP)

	games.set(gameID, new Game(gameID, tempMap))

	clientSP.emit('setup game', {cID: clientSP.id, gID: gameID, nm: 1, spawnX: 725})
}

function onPlayerJoin (data) {
	var newPlayer = new Player(data.x, data.y)
	newPlayer.id = this.id
	
	var otherClients = games.get(data.gID).getOtherClients(data.cID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('player joined', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY()})
	}
	
	games.get(data.gID).addPlayer(newPlayer)
	
	playersInGame.set(data.cID, data.gID)
}

function onMovePlayer (data) {
	var movePlayer = games.get(data.gID).getPlayer(this.id)
	
	// Player not found
	if (!movePlayer) {
		util.log('Player not found in move: ' + this.id)
    		return
	}
	
	// Update player position
	movePlayer.setX(data.x)
	movePlayer.setY(data.y)
	
	var otherClients = games.get(data.gID).getOtherClients(this.id)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY()})
	}
}

function onStartGame (data) {
	var game = games.get(data.gID)

	console.log(game.spawnObstacles);
	
	if (game.spawnObstacles)
		return
	
	game.spawnObstacles = true
	
	setTimeout(function () {game.changeInterval(data.gID)}, 5000)
}

function onStartSinglePlayer (data) {
	var game = games.get(data.gID)

	game.spawnObstacles = true

	setTimeout(function () {game.changeIntervalSP(data.gID)}, 5000)
}

function onLeaveGame (data) {
	var otherClients = games.get(data.gID).getOtherClients(data.cID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('remove player', {id: data.cID})
	}
	
	games.get(data.gID).deleteCP(data.cID)
	
	playersInGame.delete(data.cID)
	
	if(games.get(data.gID).getClientSize() == 0)
		games.delete(data.gID)
}

function onNewEq (data) {
	console.log('newEq: ' + data.type + ' gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('new equip', {id: player.id, type: data.type})
	}
}

function onRemoveEq (data) {
	console.log('removeEq: ' + data.type + ' gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('remove equip', {id: player.id, type: data.type})
	}
}

function onFlashEq (data) {
	console.log('flashEq: ' + data.type + ' gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('flash equip', {id: player.id, type: data.type})
	}
}

function onUnflashEq (data) {
	console.log('unflashEq: ' + data.type + ' gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('unflash equip', {id: player.id, type: data.type})
	}
}

function immobilePUP (data) {
	console.log('immobilePUP: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('immobile pup', {id: player.id})
	}
}

function fireMissiles (data) {
	console.log('fireMissiles: (' + data.xcor + ',' + data.ycor + ') gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('fire missiles', {xcor: data.xcor, ycor: data.ycor})
	}
}

function removePUP (data) {
	console.log('removePUP: ' + data.id + ' gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('remove pup', {id: data.id})
	}
}

function onGotGlue (data) {
	console.log('gotGlue: gameID: ' + data.gID + ' clientID: ' + data.cID);
	
	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	player.addGlue()

	console.log('player ' + player.id + ' has ' + player.getGlue() + ' glue');
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('got glue', {id: player.id})
	}
}

function onGotMissiles (data) {
	console.log('gotMissiles: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	player.addMissiles()

	console.log('player ' + player.id + ' has ' + player.getMissiles() + ' missiles');
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('got missiles', {id: player.id})
	}
}

function onUseGlue (data) {
	console.log('useGlue: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	player.useGlue()

	console.log('player ' + player.id + ' has ' + player.getGlue() + ' glue');
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('use glue', {id: player.id})
	}
}

function onUseMissile (data) {
	console.log('useMissiles: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	player.useMissile()

	console.log('player ' + player.id + ' has ' + player.getMissiles() + ' missiles');
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('use missile', {id: player.id})
	}
}

function playerHurt (data) {
	console.log('playerHurt: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('hurt', {id: player.id})
	}
}

function playerBetter (data) {
	console.log('playerBetter: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('better', {id: player.id})
	}
}

function playerDead (data) {
	console.log('playerDead: gameID: ' + data.gID + ' clientID: ' + data.cID);

	var game = games.get(data.gID)
	var otherClients = game.getOtherClients(data.cID)
	var player = game.getPlayer(data.pID)
	
	for (var i = 0; i < otherClients.length; i++) {
		otherClients[i].emit('dead', {id: player.id})
	}
}

function addObstacle (id) {
	var type = Math.floor(Math.random() * 100)
	
	var again = Math.floor(Math.random() * 20)
	
	if (type >= 55)
		addRock(id)
	
	else if (type >= 50)
		addFlameRock(id)
	
	else if (type >= 25)
		addDiagonalRock(id)
	
	else if (type >= 12)
		addFireball(id)
	
	else if (type >= 10)
		addHotRock(id)
	
	else
		addPowerup(id)
	
	if (again == 0)
		addObstacle(id)
}

function addPowerup (id) {
	var type = Math.floor(Math.random() * 100)
	
	if (type >= 84)
		addHardhat(id)
	
	else if (type >= 68)
		addParalyze(id)
	
	else if (type >= 52)
		addBullet(id)
	
	else if (type >= 36)
		addWings(id)
	
	else if (type >= 20)
		addShoe(id)
	
	else if (type >= 4)
		addSnail(id)
	
	else
		addHeart(id)

}

function addObstacleSP (id) {
	var type = Math.floor(Math.random() * 100)
	
	var again = Math.floor(Math.random() * 20)
	
	if (type >= 55)
		addRock(id)
	
	else if (type >= 50)
		addFlameRock(id)
	
	else if (type >= 25)
		addDiagonalRock(id)
	
	else if (type >= 12)
		addFireball(id)
	
	else if (type >= 10)
		addHotRock(id)
	
	else
		addPowerupSP(id)
	
	if (again == 0)
		addObstacleSP(id)
}

function addPowerupSP (id) {
	var type = Math.floor(Math.random() * 100)
	
	if (type >= 76)
		addHardhat(id)
	
	else if (type >= 52)
		addWings(id)
	
	else if (type >= 28)
		addShoe(id)
	
	else if (type >= 4)
		addSnail(id)
	
	else
		addHeart(id)
}


function addRock (id) {	
	var position = Math.floor(Math.random() * 1451)
	var speed = Math.floor(Math.random() * 800)
	
	var game = games.get(id)
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn rock', {pos: position, sp: speed})
	} , game.clients)
}

function addDiagonalRock (id) {	
	var position = Math.floor(Math.random() * 1451)
	var speed = Math.floor(Math.random() * 800)
	var xSpeed = Math.floor(Math.random() * 600) + 100
	
	if(position > 750)
	{
		xSpeed *= -1;
	}
	
	var game = games.get(id)
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn diagonal rock', {pos: position, sp: speed, xSP: xSpeed})
	} , game.clients)
}

function addFireball (id) {	
	var leftRight = Math.floor(Math.random() * 2)	
	var position = 0
	var speed = Math.floor(Math.random() * 600) + 200

	if(leftRight == 1)
	{
		position = 1520
		speed *= -1
	}
  
	else
		position = -50

	var height = Math.floor(Math.random() * 60) + 660
	
	var game = games.get(id)
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn fireball', {pos: position, sp: speed, ht: height})
	} , game.clients)
}

function addFlameRock (id) {	
	var position = Math.floor(Math.random() * 1451)
	var speed = Math.floor(Math.random() * 800)
	
	var game = games.get(id)
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn flame rock', {pos: position, sp: speed})
	} , game.clients)
}

function addHotRock (id) {	
	var position = Math.floor(Math.random() * 1451)
	var speed = Math.floor(Math.random() * 800)
	
	var game = games.get(id)
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn hot rock', {pos: position, sp: speed})
	} , game.clients)
}

function addParalyze (id) {

	
	var position = Math.floor(Math.random() * 1451)
	
	var game = games.get(id)

	console.log('addParalyze: ' + (game.pupID + 1) + ' gameID: ' + id);

	game.pupID++
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn paralyze', {pos: position, id: game.pupID})
	} , game.clients)
}

function addWings (id) {

	
	var position = Math.floor(Math.random() * 1451)
	
	var game = games.get(id)

	console.log('addWings: ' + (game.pupID + 1) + ' gameID: ' + id);
	
	game.pupID++

	game.clients.forEach(function(client, cID) {
		client.emit('spawn wings', {pos: position, id: game.pupID})
	} , game.clients)
}

function addShoe (id) {

	
	var position = Math.floor(Math.random() * 1451)
	
	var game = games.get(id)

	console.log('addShoe: ' + (game.pupID + 1) + ' gameID: ' + id);
	
	game.pupID++

	game.clients.forEach(function(client, cID) {
		client.emit('spawn shoe', {pos: position, id: game.pupID})
	} , game.clients)
}

function addHardhat (id) {

	
	var position = Math.floor(Math.random() * 1451)
	
	var game = games.get(id)

	console.log('addHardhat: ' + (game.pupID + 1) + ' gameID: ' + id);
	
	game.pupID++

	game.clients.forEach(function(client, cID) {
		client.emit('spawn hardhat', {pos: position, id: game.pupID})
	} , game.clients)
}

function addSnail (id) {
	
	
	var leftRight = Math.floor(Math.random() * 2)
	
	var position = 0
	var speed = 100
	
	if (leftRight == 1) {
		position = 1520
		speed *= -1
	}
	
	else
		position = -50
	
	var game = games.get(id)

	console.log('addSnail: ' + (game.pupID + 1) + ' gameID: ' + id);

	game.pupID++
	
	game.clients.forEach(function(client, cID) {
		client.emit('spawn snail', {pos: position, sp: speed, id: game.pupID})
	} , game.clients)
}

function addBullet (id) {

	
	var position = Math.floor(Math.random() * 1451)
	
	var game = games.get(id)

	console.log('addBullet: ' + (game.pupID + 1) + ' gameID: ' + id);
	
	game.pupID++

	game.clients.forEach(function(client, cID) {
		client.emit('spawn bullet', {pos: position, id: game.pupID})
	} , game.clients)
}

function addHeart (id) {

	
	var position = Math.floor(Math.random() * 1451)
	
	var game = games.get(id)

	console.log('addHeart: ' + (game.pupID + 1) + ' gameID: ' + id);
	
	game.pupID++

	game.clients.forEach(function(client, cID) {
		client.emit('spawn heart', {pos: position, id: game.pupID})
	} , game.clients)
}
