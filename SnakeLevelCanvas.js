var SnakeLevelCanvas = (function() {
  function SnakeLevelCanvas(snakeLevel) {
    this._level = snakeLevel;
    var canvas = this._canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var canvasSize = canvas.width = canvas.height = this._canvasSize = SnakeLevelCanvas.BLOCK_SIZE * snakeLevel.getSideLength();

    canvas.style.cursor = 'crosshair';

    setupToolImages(this);

    this.refreshImage();

    this._blockChar = ' ';

    setupHover(this);
  }

  var BLOCK_SIZE = SnakeLevelCanvas.BLOCK_SIZE = 20;

  var DRAW_FUNC_MAP = {
    ' ': drawGrassAt,
    F: drawFoodAt,
    W: drawWallAt,
    X: drawDeadlyWallAt,
    P: drawPillAt,
    S: drawSnakeAt
  }

  SnakeLevelCanvas.prototype = {
    getCanvas: function() {
      return this._canvas;
    },
    getSize: function() {
      return this._canvasSize;
    },
    getHeight: function() {
      return this._canvasSize;
    },
    getWidth: function() {
      return this._canvasSize;
    },
    getToolImage: function(charBlock) {
      if (DRAW_FUNC_MAP.hasOwnProperty(charBlock)) {
        return this._toolImages[charBlock];
      }
      throw new Error('"' + charBlock + '" is an unknown map block character');
    },
    getImage: function() {
      return this._image;
    },
    getLevel: function() {
      return this._level;
    },
    getBlockChar: function() {
      return this._blockChar;
    },
    setBlockChar: function(newBlockChar) {
      this._blockChar = newBlockChar;
    },
    refreshImage: function() {
      return this._image = getMapImage(this);
    }
  };

  function drawSnakeAt(x, y, ctx, opt_blockSize) {
    opt_blockSize = opt_blockSize || BLOCK_SIZE;
    ctx.beginPath();
    ctx.arc(opt_blockSize * (x + 1 / 2), opt_blockSize * (y + 1 / 2), opt_blockSize / 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#F70';
    ctx.fill();
  }

  function drawGrassAt(x, y, ctx, opt_blockSize) {
    opt_blockSize = opt_blockSize || BLOCK_SIZE;
    ctx.fillStyle = '#3F3';
    ctx.fillRect(x * opt_blockSize, y * opt_blockSize, opt_blockSize, opt_blockSize);
  }

  function drawFoodAt(x, y, ctx, opt_blockSize) {
    opt_blockSize = opt_blockSize || BLOCK_SIZE;
    ctx.beginPath();
    ctx.arc(opt_blockSize * (x + 1 / 2), opt_blockSize * (y + 1 / 2), opt_blockSize / 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#07F';
    ctx.fill();
  }

  function drawPillAt(x, y, ctx, opt_blockSize) {
    opt_blockSize = opt_blockSize || BLOCK_SIZE;
    ctx.beginPath();
    ctx.arc(opt_blockSize * (x + 1 / 2), opt_blockSize * (y + 1 / 2), opt_blockSize / 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFF';
    ctx.fill();
  }

  function drawWallAt(x, y, ctx, opt_blockSize) {
    opt_blockSize = opt_blockSize || BLOCK_SIZE;
    ctx.fillStyle = '#000';
    ctx.fillRect(x * opt_blockSize, y * opt_blockSize, opt_blockSize, opt_blockSize);
  }

  function drawDeadlyWallAt(x, y, ctx, opt_blockSize) {
    opt_blockSize = opt_blockSize || BLOCK_SIZE;
    drawWallAt(x, y, ctx, opt_blockSize);

    ctx.beginPath();
    ctx.moveTo(opt_blockSize * (x + 1 / 5), opt_blockSize * (y + 1 / 5));
    ctx.lineTo(opt_blockSize * (x + 4 / 5), opt_blockSize * (y + 4 / 5));
    ctx.lineWidth = opt_blockSize / 5;
    ctx.strokeStyle = '#F00';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(opt_blockSize * (x + 1 / 5), opt_blockSize * (y + 4 / 5));
    ctx.lineTo(opt_blockSize * (x + 4 / 5), opt_blockSize * (y + 1 / 5));
    ctx.lineWidth = opt_blockSize / 5;
    ctx.strokeStyle = '#F00';
    ctx.stroke();
  }

  function getMapImage(snakeLevelCanvas) {
    var sideLength = snakeLevelCanvas._level.getSideLength(),
        map = snakeLevelCanvas._level.getMap(),
        canvas = snakeLevelCanvas._canvas,
        ctx = canvas.getContext('2d');

    drawGrassAt(0, 0, ctx, snakeLevelCanvas._canvasSize);

    for (var x, draw, c, i = 0, y = 0; y < sideLength; y++) {
      for (x = 0; x < sideLength; x++) {
        if (!(draw = DRAW_FUNC_MAP[c = map.charAt(i++)])) {
          throw new Error('"' + c + '" is an unknown map block character');
        }
        draw(x, y, ctx);
      }
    }

    var img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  function setupToolImages(snakeLevelCanvas) {
    var img, k,
        canvas = snakeLevelCanvas._canvas,
        ctx = canvas.getContext('2d'),
        canvasSize = snakeLevelCanvas._canvasSize;

    snakeLevelCanvas._toolImages = {};
    for (k in DRAW_FUNC_MAP) {
      if (DRAW_FUNC_MAP.hasOwnProperty(k)) {
        drawGrassAt(0, 0, ctx, canvasSize);
        DRAW_FUNC_MAP[k](0, 0, ctx, canvasSize);
        img = new Image();
        img.src = canvas.toDataURL();
        snakeLevelCanvas._toolImages[k] = img;
      }
    }
  }

  function setupHover(snakeLevelCanvas) {
    var canvas = snakeLevelCanvas._canvas,
        ctx = canvas.getContext('2d'),
        canvasSize = snakeLevelCanvas._canvasSize,
        level = snakeLevelCanvas._level,
        hasMouseDown = false,
        blockX, blockY;

    function mousedown(event) {
      if (blockX != undefined && blockY != undefined) {
        hasMouseDown = true;
        blockX = blockY = undefined;
        mousemove(event);
      }
    }

    function mouseup(event) {
      hasMouseDown = false;
    }

    function mousemove(event) {
      var newBlockX = ~~(event.offsetX / BLOCK_SIZE),
          newBlockY = ~~(event.offsetY / BLOCK_SIZE);

      if (newBlockX != blockX || newBlockY != blockY) {
        blockX = newBlockX;
        blockY = newBlockY;

        if (hasMouseDown) {
          level.setBlock(blockX, blockY, snakeLevelCanvas._blockChar);
          snakeLevelCanvas.refreshImage();
        }

        ctx.drawImage(snakeLevelCanvas._image, 0, 0);

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, blockY * BLOCK_SIZE, canvasSize, BLOCK_SIZE);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(blockX * BLOCK_SIZE, 0, BLOCK_SIZE, canvasSize);
      }
    }

    function mouseout() {
      hasMouseDown = false;
      blockX = blockY = undefined;
      ctx.drawImage(snakeLevelCanvas._image, 0, 0);
    }

    canvas.addEventListener('mousedown', mousedown);

    canvas.addEventListener('mouseup', mouseup);

    canvas.addEventListener('mousemove', mousemove);

    canvas.addEventListener('mouseout', mouseout);
  }

  return SnakeLevelCanvas;
})();