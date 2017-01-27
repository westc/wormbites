document.addEventListener('DOMContentLoaded', function(event) {
  var BLOCK_TYPE_MAP = {
    ' ': 'Grass',
    F: 'Food',
    S: 'Snake',
    P: 'Pill',
    X: 'DeadlyWall',
    W: 'Wall'
  };

  var level;

  function submit(event) {
    event.preventDefault();

    var name = document.getElementById('txtName').value,
        sideLength = +document.getElementById('selSideLength').value,
        growthRate = document.getElementById('selGrowthRate').value.split(',').map(function(a){return +a;}),
        length = +document.getElementById('selLength').value;

    if (level) {
      level.setName(name);
      level.resize(sideLength);
      level.setGrowthRate(growthRate);
      level.setLength(length);
    }
    else {
      level = new SnakeLevel({
        name: name,
        sideLength: sideLength,
        growthRate: growthRate,
        length: length
      });
    }
    
    var levelCanvas = new SnakeLevelCanvas(level);

    setupTools(levelCanvas);

    var canvasPlaceholder = document.getElementById('canvasPlaceholder');
    canvasPlaceholder.innerHTML = '';
    canvasPlaceholder.appendChild(levelCanvas.getCanvas());
  }

  function setupTools(levelCanvas) {
    for (var k in BLOCK_TYPE_MAP) {
      if (BLOCK_TYPE_MAP.hasOwnProperty(k)) {
        (function(k, v) {
          document.getElementById('divTool' + v).onclick = function() {
            levelCanvas.setBlockChar(k);
          };
          document.getElementById('img' + v).src = levelCanvas.getToolImage(k).src;
        })(k, BLOCK_TYPE_MAP[k]);
      }
    }
  }

  document.getElementById('formInit').addEventListener('submit', submit);

  submit(event);
});