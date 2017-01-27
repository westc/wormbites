var SnakeGame = (function() {
  function SnakeGame(snakeLevel) {
    if (!snakeLevel.getName().trim()) {
      throw new Error('level must have a name');
    }
    if (!snakeLevel.isPlayable()) {
      throw new Error('level must be playable');
    }
    this._level = snakeLevel.clone();
    this._handlers = { eat: [], loop: [], done: [] };
    this.start();
  }

  SnakeGame.validateDirection = function(dir, opt_throwErrorOnFailure) {
    var isGood = 0 <= dir && dir < 4 && ~~dir == dir;
    if (!isGood && opt_throwErrorOnFailure) {
      throw new Error('direction must be an integer in the range of 0 to 3');
    }
    return isGood;
  };

  SnakeGame.parseStepsCode = function(stepsCode) {
    var len = 0,
        arr = [];
    stepsCode.replace(/(.)(.)/g, function(t, dir, count, i) {
      dir = +dir;
      count = parseInt(count, 36) + 1;
      t = arr[arr.length - 1];
      if (i && t.direction == dir) {
        t.length += count;
      }
      else {
        arr.push({ direction: dir, length: count });
      }
      len += count;
    });

    return {
      length: len,
      code: stepsCode,
      array: arr
    };
  };

  SnakeGame.validateEventName = function(eventName, opt_throwErrorOnFailure) {
    var valid = /^(eat|loop|done)$/.test(eventName);
    if (!valid && opt_throwErrorOnFailure) {
      throw new Error('"' + eventName + '" is not a valid SnakeGame event name');
    }
    return valid;
  }

  SnakeGame.prototype = {
    start: function() {
      var level = this._level,
          headIndex = (this._map = level.getMap()).indexOf('S'),
          sideLength = this._sideLength = level.getSideLength(),
          growthRate = level.getGrowthRate(),
          isEndless = this._isEndless = !(this._foodCount = level.getFoodCount());
      this._isAlive = true;
      this._steps = '';
      this._foodEaten = 0;
      this._timesGrown = 0;
      this._growthRatio = growthRate[0] / growthRate[1];
      this._dir = undefined;
      this._prevDir = undefined;
      this._snake = Array(level.getLength()).join(' ').split(' ').map(function() {
        return {
          x: headIndex % sideLength,
          y: ~~(headIndex / sideLength)
        };
      });
      this._isWon = isEndless ? !addRandomFood(this) : false;
    },

    step: function(opt_dir) {
      // If direction is passed it is set but if the direction doesn't take `false` is returned.
      if (opt_dir != undefined && !this.setDirection(opt_dir)) {
        return false;
      }

      // As long as you are still going in a direction and the game isn't over you can try to move.
      var dir = this._dir;
      if (dir == undefined || this.isDone()) {
        return false;
      }
      else {
        // Set the previous direction.
        this._prevDir = dir;

        var events = [],
            block = this.getBlockInDirection(dir),
            snake = this._snake,
            x = block.x,
            y = block.y,
            map = this._map,
            charBlock = block.ch,
            position = block.position,
            sideLength = this._sideLength;

        // WALL:
        if (charBlock == 'W') {
          this._dir = undefined;
          return false;
        }
        else {
          var lastCoords = snake.slice(-1)[0],
              penUltCoords = snake.slice(-2)[0];

          // FOOD:  Increment foodEaten and increment timesGrown and add a segment to the snake if timesGrown / foodEaten < growthRatio
          if (charBlock == 'F') {
            this._isWon = !(--this._foodCount);
            this._foodEaten++;
            events.push(['eat', { x: x, y: y }]);
            if (this._timesGrown / this._foodEaten < this._growthRatio) {
              penUltCoords = lastCoords;
              snake.push(lastCoords = {
                x: penUltCoords.x,
                y: penUltCoords.y
              });
              this._timesGrown++;
            }
          }
          // PILL:  Remove at most 5 segments from the snake and update the map accordingly
          else if (charBlock == 'P') {
            var cutIndex = Math.max(1, snake.length - 5);
            for (var i = snake.length; i-- > cutIndex; ) {
              var coords = snake[i],
                  charCutIndex = coords.x + sideLength * coords.y;
              map = map.slice(0, charCutIndex) + ' ' + map.slice(charCutIndex + 1);
            }
            snake.splice(cutIndex);
            lastCoords = snake.slice(-1)[0];
            penUltCoords = snake.slice(-2)[0];
          }
          // DEADLY-WALL or SNAKE (not last segment):  You die
          else if (charBlock == 'X' || (charBlock == 'S' && position != lastCoords.x + sideLength * lastCoords.y)) {
            this._isAlive = false;
          }
          
          var lastPosition = lastCoords.x + sideLength * lastCoords.y;

          // Update the map showing all of the segments moved.
          map = map.slice(0, position) + 'S' + map.slice(position + 1);
          if ((lastPosition != penUltCoords.x + sideLength * penUltCoords.y || snake.length == 1) && position != lastPosition) {
            map = map.slice(0, lastPosition) + ' ' + map.slice(lastPosition + 1);
          }

          // Update the snake segments by progressing them all.
          for (var nextX, nextY, prevX, prevY, i = snake.length; i--; ) {
            nextX = i ? snake[i - 1].x : x;
            nextY = i ? snake[i - 1].y : y;
            prevX = snake[i].x;
            prevY = snake[i].y;
            if (Math.abs(prevX - nextX + prevY - nextY) > 1) {
              events.push(['loop', {
                x: nextX,
                y: nextY,
                prevX: prevX,
                prevY: prevY,
                direction: nextX == prevX ? (nextY < prevY ? 2 : 0) : (nextX < prevX ? 1 : 3)
              }]);
            }
            snake[i].x = nextX;
            snake[i].y = nextY;
          }

          // Update the official map
          this._map = map;

          // If food was eaten and the level is endless
          if (charBlock == 'F' && this._isEndless) {
            this._isWon = !addRandomFood(this);
          }

          // Update the steps
          var steps = this._steps,
              chLastDirCountCode = steps.slice(-1);
          this._steps
            = (!steps || steps.slice(-2, -1) != dir || chLastDirCountCode == 'z')
              ? (steps + dir + '0')
              : (steps.slice(0, -1) + (parseInt(chLastDirCountCode, 36) + 1).toString(16));

          // Trigger any events that occurred
          if (this.isDone()) {
            events.push(['done', { x: x, y: y }]);
          }
          for (var triggerArgs; triggerArgs = events.pop(); ) {
            this._trigger.apply(this, triggerArgs);
          }

          return true;
        }
      }
    },

    getFoodCount: function() {
      return this._foodCount;
    },

    getMap: function(opt_drawWithNewLines) {
      return opt_drawWithNewLines
        ? this._map.split(new RegExp('(?=(?:[\\s\\S]{' + this._sideLength + '})*$)')).join('\n')
        : this._map;
    },

    getBlockInDirection: function(dir) {
      SnakeGame.validateDirection(dir, true);

      // Get next x and y coords
      var snake = this._snake,
          x = snake[0].x,
          y = snake[0].y,
          sideLength = this._sideLength;
      if (dir % 2) {
        x = (x + 2 - dir + sideLength) % sideLength;
      }
      else {
        y = (y + dir - 1 + sideLength) % sideLength;
      }

      // Get next position
      var position = y * sideLength + x;

      return {
        ch: this._map.charAt(position),
        position: position,
        x: x,
        y: y
      }
    },

    getSteps: function() {
      var ret = SnakeGame.parseStepsCode(this._steps);
      if (!this._isEndless) {
        ret.isSolution = this._isWon;
      }
      return ret;
    },

    checkSolution: function(stepsCode) {
      if (this._isEndless) {
        return false;
      }

      var step, stepsLeft,
          arrSteps = SnakeGame.parseStepsCode(stepsCode).array,
          arrLen = arrSteps.length,
          game = new SnakeGame(this._level);

      for ( ; arrLen-- > 0; ) {
        for (
          step = arrSteps.shift(), stepsLeft = step.length;
          stepsLeft-- && game.step(step.direction) && !game.isDone();
        );
        if (stepsLeft + (arrLen ? 1 : 0) || (game.isDone() && arrLen)) {
          arrLen = -1;
        }
      }

      return arrLen == -1 && game.isWon();
    },

    setDirection: function(newDir) {
      SnakeGame.validateDirection(newDir, true);
      var canBeSet = (this._prevDir == undefined || newDir % 2 != this._prevDir % 2 || this._snake.length == 1 || newDir == this._prevDir) && this.getBlockInDirection(newDir).ch != 'W';
      if (canBeSet) {
        this._dir = newDir;
      }
      return canBeSet;
    },

    getDirection: function() {
      return this._dir;
    },

    isAlive: function() {
      return this._isAlive;
    },

    isDone: function() {
      return !this._isAlive || this._isWon;
    },

    isWon: function() {
      return this._isWon;
    },

    getSnakeCoords: function() {
      return this._snake.map(function(coords) {
        return {
          x: coords.x,
          y: coords.y
        };
      })
    },

    bind: function(eventName, handler) {
      SnakeGame.validateEventName(eventName, true);
      this._handlers[eventName].push(handler);
    },

    _trigger: function(eventName, objEvent) {
      var game = this;
      objEvent.type = eventName;
      objEvent.timeStamp = +new Date;
      game._handlers[eventName].forEach(function(handler) {
        handler.call(game, objEvent);
      });
    },

    unbind: function(eventName, handler) {
      SnakeGame.validateEventName(eventName, true);
      for (var handlers = this._handlers[eventName], i = handlers.length; i--; ) {
        if (handlers[i] == handler) {
          handlers.splice(i, 1);
          return true;
        }
      }
      return false;
    },

    getHandlers: function(eventName) {
      SnakeGame.validateEventName(eventName, true);
      return this._handlers[eventName].slice(0);
    }
  };

  function addRandomFood(game) {
    var map = game._map, isNotYetWon = /[ P]/.test(map);
    if (isNotYetWon) {
      var freeChar = map.indexOf(' ') < 0 ? 'P' : ' ',
          index = ~~(Math.random() * (map.split(freeChar).length - 1)),
          rgx = new RegExp('((' + freeChar + '[^' + freeChar + ']*){' + index + '})' + freeChar);
      game._map = map.replace(rgx, '$1F');
    }
    return isNotYetWon;
  }

  return SnakeGame;
})();