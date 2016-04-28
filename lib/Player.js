/* ************************************************
** GAME PLAYER CLASS
************************************************ */
var Player = function (startX, startY) {
  var x = startX
  var y = startY
  var id
  var glue = 0
  var missiles = 0

  // Getters and setters
  var getX = function () {
    return x
  }

  var getY = function () {
    return y
  }

  var setX = function (newX) {
    x = newX
  }

  var setY = function (newY) {
    y = newY
  }
  
  var getGlue = function () {
    return glue
  }

  var getMissiles = function () {
    return missiles
  }

  var addGlue = function () {
    ++glue
  }

  var useGlue = function () {
    --glue
  }

  var addMissiles = function () {
    missiles += 3
  }

  var useMissile = function () {
    --missiles
  }

  // Define which variables and methods can be accessed
  return {
    getX: getX,
    getY: getY,
    setX: setX,
    setY: setY,
    id: id,
    getGlue: getGlue,
    getMissiles: getMissiles,
    addGlue: addGlue,
    useGlue: useGlue,
    addMissiles: addMissiles,
    useMissile: useMissile
  }
}

// Export the Player class so you can use it in
// other files by using require("Player")
module.exports = Player
