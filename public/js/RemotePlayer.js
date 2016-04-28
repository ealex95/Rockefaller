/* global game */

var RemotePlayer = function (index, game, player, startX, startY, startG, startM) {
  
  //set starting position
  var x = startX
  var y = startY

  //initialize important members
  this.game = game
  this.player = player
  
  
  
  //load appropriate sprite if entering midgame
  //first three should not be necessary if we assume players cannot join midgame
  if(startG > 0 && startM > 0)
  {
	this.player = game.add.sprite(x, y, 'enemy_both')
  }
  else if(startG > 0)
  {
	this.player = game.add.sprite(x, y, 'enemy_glue')
  }
  else if(startM > 0)
  {
	this.player = game.add.sprite(x, y, 'enemy_missile')
  }
  else
  {
	this.player = game.add.sprite(x, y, 'enemy')
  }
  
  

  this.player.name = index.toString()

  this.lastPosition = { x: x, y: y }

  this.equip = []

  this.dead = false

  this.glue = startG

  this.missiles = startM
}

//The following methods are used to keep track of how many of each weapon
//the opponent has so that the appropriate sprite is used

RemotePlayer.prototype.addGlue = function () {

	if(this.glue == 0)
	{
		if(this.missiles > 0)
		{
			this.player.loadTexture('enemy_both');
		}
		else
		{
			this.player.loadTexture('enemy_glue');
		}
	}

	this.glue += 1;

}

RemotePlayer.prototype.addMissiles = function () {

	if(this.missiles == 0)
	{
		if(this.glue > 0)
		{
			this.player.loadTexture('enemy_both');
		}
		else
		{
			this.player.loadTexture('enemy_missile');
		}
	}

	this.missiles += 3;

}

RemotePlayer.prototype.useGlue = function () {

	--this.glue;

	if(this.glue == 0)
	{
		if(this.missiles > 0)
		{
			this.player.loadTexture('enemy_missile');
		}
		else
		{
			this.player.loadTexture('enemy');
		}
	}
}

RemotePlayer.prototype.useMissile = function () {

	--this.missiles;

	if(this.missiles == 0)
	{
		if(this.glue > 0)
		{
			this.player.loadTexture('enemy_glue');
		}
		else
		{
			this.player.loadTexture('enemy');
		}
	}
}

//The following methods are used to keep track of the opponent's equipment

RemotePlayer.prototype.giveEquip = function (argEquip) {

  this.equip.push(argEquip);

}

RemotePlayer.prototype.removeEquip = function (type) {

  for(var i = 0; i < this.equip.length; i++)
  {
	if(this.equip[i].id == type)
	{
		this.equip[i].kill();

		this.equip.splice(i, 1);
	}
  }

}

RemotePlayer.prototype.moveEquip = function() {

  for(var i = 0; i < this.equip.length; i++)
  {

	switch(this.equip[i].id)
	{
		case 1:	//wings
		  this.equip[i].x = this.player.x - 29;
		  this.equip[i].y = this.player.y;
		  break;
		case 2:	//speed
		  this.equip[i].x = this.player.x + 50;
		  this.equip[i].y = this.player.y - 10;
		  break;
		case 3:	//hardhat
		  this.equip[i].x = this.player.x + 2;
		  this.equip[i].y = this.player.y - 30;
		  break;
		case 4:	//slow
		  this.equip[i].x = this.player.x - 14;
		  this.equip[i].y = this.player.y - 10;
		  break;
		default:
	}
  }

}




//probably unnecessary
RemotePlayer.prototype.update = function () {
  if (this.player.x !== this.lastPosition.x || this.player.y !== this.lastPosition.y) {
    this.player.play('move')
  } else {
    this.player.play('stop')
  }

  this.lastPosition.x = this.player.x
  this.lastPosition.y = this.player.y
}

window.RemotePlayer = RemotePlayer
