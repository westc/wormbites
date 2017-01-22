function SnakeLevel(obj) {
  this.fromObject(obj);
}

SnakeLevel.validateBlockChars = function(str, opt_throwErrorOnFailure) {
  var hasAllValidChars = /^[FP SWX]+$/.test(str),
      hasOneOrLessS = str.split('S').length < 3;
  if (opt_throwErrorOnFailure) {
    if (!hasAllValidChars) {
      throw new Error('map code may only contain "F", "P", "S", "W", "X" and the normal space character');
    }
    if (!hasOneOrLessS) {
      throw new Error('map code can only contain at most one "S" character');
    }
  }
  return hasAllValidChars && hasOneOrLessS;
}

SnakeLevel.validateEventName = function(eventName, opt_throwErrorOnFailure) {
  var valid = /^(snakeMove|playabilityChange)$/.test(eventName);
  if (!valid && opt_throwErrorOnFailure) {
    throw new Error('"' + eventName + '" is not a valid SnakeLevel event name');
  }
  return valid;
}

SnakeLevel.VALID_GROWTH_RATIOS = '[1,1],[1,2],[1,3],[2,3],[3,4],[2,5],[3,5],[4,5],[5,6],[3,7],[4,7],[5,7],[6,7]';

SnakeLevel.prototype = {
  fromObject: function(o) {
    o = Object(o);
    this.setName(o.name);
    this.setMap(o.map);
    this.setLength(o.length);
    this.setGrowthRate(o.growthRate);
    if (o.solution) {
      this.setSolution(o.solution);
    }
  },

  toObject: function() {
    return {
      name: this._name,
      map: this._map,
      length: this._length,
      growthRate: this._growthRate,
      solution: this.solution
    };
  },

  setName: function(newName) {
    if (('string' != typeof newName) || (newName = newName.trim()) == '') {
      throw new Error('name must be a non-empty string');
    }
    this._name = newName;
  },

  getName: function() {
    return this._name;
  },

  setMap: function(newMap) {
    if ('string' != typeof newMap) {
      throw new Error('map must be a string')
    }

    var sideLength = Math.sqrt(newMap.length);
    if (sideLength != ~~sideLength || 15 > sideLength || sideLength > 21) {
      throw new Error('map can only be 15\xD715, 16\xD716, 17\xD717, 18\xD718, 19\xD719, 20\xD720, or 21\xD721');
    }
    SnakeLevel.validateBlockChars(newMap, true);

    if (this._map && this._map != newMap) {
      delete this._solution;
    }
    this._map = newMap;
    this._sideLength = sideLength;
  },

  getMap: function(opt_drawWithNewLines) {
    return opt_drawWithNewLines
      ? this._map.split(new RegExp('(?=(?:[\\s\\S]{' + this._sideLength + '})*$)')).join('\n')
      : this._map;
  },

  setLength: function(newLength) {
    if (('number' != typeof newLength) || 1 > newLength || newLength > 10) {
      throw new Error('length must be an integer between 1 and 10');
    }
    this._length = newLength;
  },

  getLength: function() {
    return this._length;
  },

  getSideLength: function() {
    return this._sideLength;
  },

  setGrowthRate: function(newGrowthRate) {
    if ({}.toString.call(newGrowthRate) != '[object Array]' ||
        'number' != typeof newGrowthRate[0] ||
        'number' != typeof newGrowthRate[1] ||
        SnakeLevel.VALID_GROWTH_RATIOS.indexOf('[' + newGrowthRate.join(',') + ']') < 0
    ) {
      throw new Error('growth rate must be one of these arrays: ' + SnakeLevel.VALID_GROWTH_RATIOS);
    }

    if (this._growthRate && this._growthRate.join('/') != newGrowthRate.join('/')) {
      delete this._solution;
    }
    this._growthRate = newGrowthRate.slice();
  },

  getGrowthRate: function() {
    return this._growthRate.slice();
  },

  setSolution: function(newSolution) {
    if (new SnakeGame(this).checkSolution(newSolution)) {
      this._solution = newSolution;
    }
  },

  getSolution: function() {
    return this._solution;
  },

  setBlock: function(x, y, blockChar) {
    if (blockChar.length != 1) {
      throw new Error('setBlock() can only set 1 not ' + blockChar.length + ' block characters');
    }
    SnakeLevel.validateBlockChars(blockChar, true);

    var events = [], isPlayable = this.isPlayable(), headPosition, position = y * this._sideLength + x;
    if (this._map.charAt(position) != blockChar) {
      delete this._solution;
      if (blockChar == 'S' && (headPosition = this._map.indexOf('S')) >= 0) {
        events.push(['snakeMove', {
          prevX: headPosition % this._sideLength,
          prevY: ~~(headPosition / this._sideLength),
          prevPosition: headPosition,
          x: x,
          y: y,
          position: position
        }]);

        this._map = this._map.slice(0, headPosition) + ' ' + this._map.slice(headPosition + 1);
      }
      this._map = this._map.slice(0, position) + blockChar + this._map.slice(position + 1);

      if (isPlayable != this.isPlayable()) {
        events.push(['playabilityChange']);
      }

      // Trigger any events that happened
      for (var triggerArgs; triggerArgs = events.pop(); ) {
        this._trigger.apply(this, triggerArgs);
      }
    }
  },

  getBlock: function(x, y) {
    return this._map[y * this._sideLength + x];
  },

  hasSnake: function() {
    return this._map.indexOf('S') >= 0;
  },

  getFoodCount: function() {
    return this._map.split('F').length - 1;
  },

  isPlayable: function() {
    return this.hasSnake() && this.getFoodCount() > 0;
  },
  clone: function() {
    return new SnakeLevel(this.toObject());
  },

  bind: function(eventName, handler) {
    SnakeLevel.validateEventName(eventName, true);
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
    SnakeLevel.validateEventName(eventName, true);
    for (var handlers = this._handlers[eventName], i = handlers.length; i--; ) {
      if (handlers[i] == handler) {
        handlers.splice(i, 1);
        return true;
      }
    }
    return false;
  },

  getHandlers: function(eventName) {
    SnakeLevel.validateEventName(eventName, true);
    return this._handlers[eventName].slice(0);
  }
};
